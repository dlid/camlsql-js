	
	var _properties = {
		query : query
	},
	quiet = false;

	if (arguments.length == 3) {
		if (arguments[2] == true) {
			quiet = true;
		}
	}
	if (!String.prototype.encodeHTML) {
	  String.prototype.encodeHTML = function () {
	    return this.replace(/&/g, '&amp;')
	               .replace(/</g, '&lt;')
	               .replace(/>/g, '&gt;')
	               .replace(/"/g, '&quot;')
	               .replace(/'/g, '&apos;');
	  };
	}

	function formatFieldName(name) {
		return trim(name).replace(/^\[|\]$/g, '');
	}

	function trim(str) {
		return str.replace(/^\s+|\s+$/g, '');
	}


	function parseQuery(query) {
		var m = query.match(/^SELECT (.*?) FROM (.*?)(?:\s(.*)$|$)/i),
			fields = [],
			listName,
			t, 
			i;

		if (m) {
			if (m.length == 4) {
				t = m[1].split(',');
				for (i=0; i < t.length; i++) {
					t[i] = t[i].replace(/^[\s\[]*|[\s\]]*$/g, '');
					fields.push(t[i]);

				}
				listName = formatFieldName(m[2]);
			}
		}

		if (fields.length == 1 && fields[0] == '*') fields = [];

		var w = WhereParser(m[3], quiet);

 		return { 
 			listName : listName,
			viewFields : fields,
			where : w.statements,
			macroType : w.macroType,
			macroCount : w.macroCount,
			macros : w.macros
		}; 

	}

	function parseParameter(parameter) {
		var ret = null;
		if (parameter!==null && parameter.constructor === Array) {
			ret = [];
			for (var i=0; i < parameter.length;i++) {
				ret.push(parseParameter(parameter[i]));
			}
		} else if (typeof parameter === "string") {
			ret = camlsql.text(parameter);
		} else if (typeof parameter == "number") {
			ret = camlsql.number(parameter);
		} else if (typeof parameter == "object" && parameter.type !== "undefined") {
			return parameter;
		}
		return ret;
	}


	var newParam = {};
	if (param && param.length > 0) {
		_properties.originalParam = param;
		for (var i=0; i < param.length; i++) {
			newParam["@param" + i] = parseParameter(param[i]);
		}
		_properties.param = newParam;
	}

	var parsedQuery = parseQuery(query),
		viewXml = "<View>";
	if (parsedQuery.viewFields.length > 0) {
		viewXml += "<ViewFields>";
		for (var i=0; i < parsedQuery.viewFields.length; i++) {
			viewXml += '<FieldRef Name="' + parsedQuery.viewFields[i].encodeHTML() + '" />';
		}
		viewXml += "</ViewFields>";
	}

	_properties.macroType = parsedQuery.macroType;
	_properties.macroCount = parsedQuery.macroCount;
	_properties.macros = parsedQuery.macros;

	var queryXml = andOrWhatnot(parsedQuery.where);
	if (queryXml) {
		viewXml += "<Query><Where>" + queryXml + "</Where></Query>";
	}

	function andOrWhatnot(items) {
		var xml = "";
		if (!items) return "";
		if (items.length > 1) {
			var operatorElement = items[1].operator == "and" ? "And" : "Or";
			
			// item 0 + 1 goes here
			xml += whereItemToXml(items[0]);
			xml += andOrWhatnot(items.slice(1));

			return "<"+operatorElement+">" + xml + "</"+operatorElement+">";
		} else if (items.length == 1) {
			xml += whereItemToXml(items[0]);
		}
		return xml;
	}

	function whereItemToXml(item) {
		var xml = "";
		if (item.type == "statement") {
			var param = newParam[item.macro];

			if (item.comparison !== "null" && item.comparison !== "notnull") {
				if (typeof param === "undefined") {
					xml += "<casql:Error>" + ("Parameter not found ("+item.macro+")").encodeHTML() + "</casql:Error>";
					if(!quiet) console.error("[casql] Parameter not found", item.macro);
					return xml;
				}
			}

			var simpleMappings = {'eq' : 'Eq', 'gt' : 'Gt', 'gte' : 'Geq', 'lte' : 'Leq', 'lt' : 'lt', 'ne' : 'Neq'};

			if (typeof simpleMappings[item.comparison] !== "undefined") {
				elementName = simpleMappings[item.comparison];
				xml += "<" + elementName + ">";
				xml += fieldRefValue(item, param);
				xml += "</" + elementName + ">";
			} else if (item.comparison == "in") {
				xml += "<IsNull>";
				xml += fieldRefValue(item, param);
				xml += "</IsNull>";
			} else if (item.comparison == "null") {
				xml += "<IsNull>";
				xml += '<FieldRef Name="' + item.field.encodeHTML() + '" />'
				xml += "</IsNull>";
			} else if (item.comparison == "notnull") {
				xml += "<IsNotNull>";
				xml += '<FieldRef Name="' + item.field.encodeHTML() + '" />'
				xml += "</IsNotNull>";
			} else if (item.comparison == "like") {
				var elementName = "Contains",
					paramValue = null;
				if (param.value.indexOf('%') === 0 && param.value[param.value.length-1] === "%") {
					paramValue = param.value.replace(/^%?|%?$/g, '');
				} else if (param.value.indexOf('%') === 0) {
					console.warn("[casql] SharePoint does not support an 'EndsWith' statement. Contains will be used instead. (Field '" + item.field + "')");
					paramValue = param.value.replace(/^%?/, '');
				} else if (param.value.indexOf('%') === param.value.length -1) {
					paramValue = param.value.replace(/%?$/, '');
					elementName = "BeginsWith"
				}
				xml += "<"+elementName+">";
				xml += fieldRefValue(item, param, paramValue);
				xml += "</"+elementName+">";
			} else {
				xml += "<NOT_IMPLEMENTED>" + item.comparison + "</NOT_IMPLEMENTED>";
			}
		} else {
			xml += andOrWhatnot(item.items);
		}
		return xml;
	}

	function createValueElement(item, param, paramValue) {
		var xml = "";
		if (param.type == "DateTime") {
			if (param.today === true) {
				xml = "<Today";
				if (paramValue) {
					xml += ' OffsetDays="' + paramValue + '"';
				}
				xml += " />";
			}
		} else if (param.type == "Text") {
			if (param.multiline === true) {
				xml = "<<![CDATA[";
				xml += paramValue;
				xml += "]]>";
			} else {
				xml += paramValue.encodeHTML();
			}
		} else if (param.type == "Number") {
			xml += paramValue;
		}
		xml = '<Value Type="' + param.type + '">' + xml +'</Value>';
		return xml;
	}

	function fieldRefValue(item, param, editedParamValue) {
		var xml = "",
			value = "",
			paramValue = typeof editedParamValue !== "undefined" && editedParamValue !== null ? editedParamValue : (param ? param.value : null);
	
		if (item.comparison == "in") {
			xml += '<FieldRef Name="' + item.field.encodeHTML() + '" />'
			xml += '<Values>';
			for (var i=0; i < param.length; i++) {
				xml += createValueElement(item, param[i], param[i].value);			
			}
			xml += '</Values>';
			return xml;
		} else {
			value = createValueElement(item, param, paramValue);
		}
		
		xml += '<FieldRef Name="' + item.field.encodeHTML() + '" />'
		xml += '<Value Type="' + param.type + '">' + value +'</Value>';
		return xml;
	}



	viewXml += "</View>";

	//console.log(query, param, parsedQuery);

	function getListName() {
		return parsedQuery.listName;
	}

	function getXml() {
		return viewXml;
	}

	function getSql() {
		return query;
	}

	var returnValue = {
		getXml : getXml,
		getListName : getListName,
		_properties : _properties
	};

	if (typeof executeQuery !== "undefined")
		returnValue.exec = executeQuery;

	return returnValue;