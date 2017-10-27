	
	var _properties = {
		query : query,
		limit : [0, -1],
		viewScope : null
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

		var orderByString,
			limitString,
			limitOffset = 0,
			limitRows = -1;

		if (m = query.match(/^(select\s+)(scope (defaultvalue|recursive|recursiveall|filesonly)\s+)/i)) {
			m[3] = m[3].toLowerCase();
			if (m[3] == "defaultvalue") _properties.viewScope = "DefaultValue";
			if (m[3] == "recursive") _properties.viewScope = "Recursive";
			if (m[3] == "recursiveall") _properties.viewScope = "RecursiveAll";
			if (m[3] == "filesonly") _properties.viewScope = "FilesOnly";
			query = m[1] + query.substr(m[1].length + m[2].length);
			console.warn("scope", m[3]);
		}

		if (m = query.match(/ LIMIT (\d+,|)(\d+).*$/i)) {
			limitString = m[0];
			query = query.substr(0, query.length - m[0].length );
			if (m[1] == "") {
				limitRows = parseInt(m[2], 10);
			} else {
				limitOffset = parseInt(m[1], 10);
				limitRows = parseInt(m[2], 10);
			}
		}

		// Extract ORDER BY statement
		if (m = query.match(/ ORDER BY (.*?)$/i)) {

			orderByString = m[1];
			query = query.substr(0, query.length - m[0].length );
		}

		var m = query.match(/^SELECT (.*?) FROM (.*?)(?:\s+(where.*)$|$)/i),
			fields = [],
			listName,
			t, 
			i,
			w = {
				statements : [],
				macroType : null,
				macroCount : 0,
				macros : []
			};

		if (m) {
			if (m.length == 4) {
				t = m[1].split(',');
				for (i=0; i < t.length; i++) {
					t[i] = t[i].replace(/^[\s\[]*|[\s\]]*$/g, '');
					fields.push(t[i]);

				}
				listName = formatFieldName(m[2]);
				w = WhereParser(m[3], quiet);
			}
		}

		if (fields.length == 1 && fields[0] == '*') fields = [];

 		return { 
 			listName : listName,
			viewFields : fields,
			where : w.statements,
			macroType : w.macroType,
			macroCount : w.macroCount,
			macros : w.macros,
			sort : OrderByParser(orderByString, quiet),
			limit : {
				offset : limitOffset,
				rowLimit : limitRows
			}
		}; 

	}

	function parseParameter(parameter) {
		var ret = null;
		if (parameter == null) return null;
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

	var parsedQuery,
		viewXml = "";

	function generateViewXml() {
		parsedQuery = parseQuery(query),
		viewXml = "<View";

		if (_properties.viewScope) viewXml += ' Scope="' + _properties.viewScope.encodeHTML() + '"';

		viewXml += ">"; 

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

		var queryXml = andOrWhatnot(parsedQuery.where),
			orderXml = createOrderXml(parsedQuery.sort)

		if (queryXml || orderXml) {

			if (queryXml) queryXml = '<Where>' + queryXml + '</Where>';

			viewXml += "<Query>" + queryXml + orderXml + "</Query>";
		}

		if (parsedQuery.limit.rowLimit != -1)
			viewXml += "<RowLimit>" + parsedQuery.limit.rowLimit + "</RowLimit>";

		viewXml += "</View>";
	}

	

	function createOrderXml(items) {
		var str = "", i, dataType = "";
		if (typeof items !== "undefined") {
			for (i=0; i < items.length; i++) { 
				if (items[i][2]) dataType = ' Type="' + items[i][2].encodeHTML() +'"';
				str += '<FieldRef Name="' + items[i][0].encodeHTML() + '"' + dataType + ( !items[i][1] ? ' Ascending="FALSE"' : '' ) + ' />';
			}
			if (str) str = "<OrderBy>" + str + "</OrderBy>";
		} 
		return str;
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
			console.warn("", item.macro, item);
			if (item.comparison !== "null" && item.comparison !== "notnull") {
				if (typeof param === "undefined") {
					xml += "<casql:Error>" + ("Parameter not found ("+item.macro+")").encodeHTML() + "</casql:Error>";
					if(!quiet) console.error("[casql] Parameter not found", item.macro);
					return xml;
				}
			}

			var simpleMappings = {'eq' : 'Eq', 'gt' : 'Gt', 'gte' : 'Geq', 'lte' : 'Leq', 'lt' : 'Lt', 'ne' : 'Neq'};

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

				if (param.type == "Text") {
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
					xml += "<casql:Error>LIKE statements must use a text parameter. " + param.type + " was used.</casql:Error>";
				}
			} else {
				xml += "<NOT_IMPLEMENTED>" + item.comparison + "</NOT_IMPLEMENTED>";
			}
		} else {
			xml += andOrWhatnot(item.items);
		}
		return xml;
	}

	function createValueElement(item, param, paramValue) {
		var xml = "",
			valueAttributes = "";
		if (param.type == "DateTime") {
			if (param.includeTime == true) 
				valueAttributes+= ' IncludeTimeValue="TRUE"';
			if (param.today === true) {
				xml = "<Today";
				if (paramValue) {
					xml += ' OffsetDays="' + paramValue + '"';
				}
				xml += " />";
			} else if (param.isNow === true) {
				xml += "<Now />";
			} else {
				xml += paramValue.encodeHTML();
			}
		} else if (param.type == "Text" || param.type == "Guid") {
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
		xml = '<Value Type="' + param.type + '"'+valueAttributes+'>' + xml +'</Value>';
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
		xml += value; //'<Value Type="' + param.type + '">' + value +'</Value>';
		return xml;
	}




	//console.log(query, param, parsedQuery);

	function getListName() {
		return parsedQuery.listName;
	}

	function getXml() {
		generateViewXml();
		return viewXml;
	}

	function getSql() {
		return query;
	}

	var publicItems = {
		getXml : getXml,
		getListName : getListName,
		_properties : _properties
	};

	if (typeof executeQuery !== "undefined")
		publicItems.exec = executeQuery;

	// publicItems.defaultScope = function() {
	// 	_properties.viewScope = null
	// 	return this;
	// }

	// publicItems.recursive = function() {
	// 	_properties.viewScope = 'Recursive';
	// 	return this;
	// }

	// publicItems.recursiveAll = function() {
	// 	_properties.viewScope = 'RecursiveAll';
	// 	return this;
	// }

	// publicItems.filesOnly = function() {
	// 	_properties.viewScope = 'FilesOnly';
	// 	return this;
	// }

	generateViewXml();

	return publicItems;