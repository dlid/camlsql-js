


	if (!String.prototype.encodeHTML) {
	  String.prototype.encodeHTML = function () {
	    return this.replace(/&/g, '&amp;')
	               .replace(/</g, '&lt;')
	               .replace(/>/g, '&gt;')
	               .replace(/"/g, '&quot;')
	               .replace(/'/g, '&apos;');
	  };
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
				listName = m[2];
			}
		}

		if (fields.length == 1 && fields[0] == '*') fields = [];

 		return {
			viewFields : fields,
			where : WhereParser(m[3])
		};

	}



	var newParam = {};
	if (param && param.length > 0) {
		for (var i=0; i < param.length; i++) {
			if (typeof param[i] === "string") {
				param[i] = caSql.text(param[i]);
			} else if (typeof param[i] == "number") {
				param[i] = caSql.number(param[i]);
			}
			newParam["@param" + i] = param[i];
		}
	}

//	console.log("PARAMS", newParam);

	var parsedQuery = parseQuery(query),
		viewXml = "<View>";
	if (parsedQuery.viewFields.length > 0) {
		viewXml += "<ViewFields>";
		for (var i=0; i < parsedQuery.viewFields.length; i++) {
			viewXml += '<FieldRef Name="' + parsedQuery.viewFields[i].encodeHTML() + '" />';
		}
		viewXml += "</ViewFields>";
	}


	var queryXml = andOrWhatnot(parsedQuery.where);
	if (queryXml) {
		viewXml += "<Query><Where>" + queryXml + "</Where></Query>";
	}

	function andOrWhatnot(items) {
		var xml = "";
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
					console.error("[casql] Parameter not found", item.macro);
					return xml;
				}
			}
			if (item.comparison == "eq") {
				xml += "<Eq>";
				xml += fieldRefValue(item, param);
				xml += "</Eq>";
			} else if (item.comparison == "gte") {
				xml += "<Geq>";
				xml += fieldRefValue(item, param);
				xml += "</Geq>";
			} else if (item.comparison == "lte") {
				xml += "<Leq>";
				xml += fieldRefValue(item, param);
				xml += "</Leq>";
			} else if (item.comparison == "lt") {
				xml += "<Lt>";
				xml += fieldRefValue(item, param);
				xml += "</Lt>";
			} else if (item.comparison == "ne") {
				xml += "<Neq>";
				xml += fieldRefValue(item, param);
				xml += "</Neq>";
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

				if (param.value.indexOf('%') === 0 && param.value.indexOf('%') === param.value.length -1) {
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
				xml += "<NOT_IMPLEMENTED>" + item.field + "</NOT_IMPLEMENTED>";
			}
		} else {
			xml += andOrWhatnot(item.items);
		}
		return xml;
	}

	function fieldRefValue(item, param, editedParamValue) {
		var xml = "",
			value = "",
			paramValue = typeof editedParamValue !== "undefined" && editedParamValue !== null ? editedParamValue : param.value;
			


		if (param.type == "DateTime") {
			if (param.today === true) {
				value = "<Today";
				if (paramValue) {
					value += ' OffsetDays="' + paramValue + '"';
				}
				value += " />";
			}
		} else if (param.type == "Text") {
			if (param.multiline === true) {
				value = "<<![CDATA[";
				value += paramValue;
				value += "]]>";
			} else {
				value += paramValue.encodeHTML();
			}
		}
		xml += '<FieldRef Name="' + item.field.encodeHTML() + '" />'
		xml += '<Value Type="' + param.type + '">' + value +'</Value>';
		return xml;
	}



	viewXml += "</View>";

	console.log(query, param, parsedQuery);

	function getXml() {
		return viewXml;
	}

	return {
		getXml : getXml
	}
