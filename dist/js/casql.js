/*! */


	/* File: c:\git\caSql\src\header.js  */
var caSql = (function(query, param )  {





	/* File: c:\git\caSql\src\where-parser.js  */
	var WhereParser = function(whereString) {
		var blockOpen = '(',
			blockClose = ')',
    		conjunction = ['and', 'or', '&&', '||'],
    		operators = ['=', '<', '>', '!'],
    		prevMacro = null;

    		if (typeof whereString === "undefined") return [];

    		whereString = whereString.replace(/^.*?(WHERE )/i, '');
    		whereString = whereString.replace(/(.*?)\s?ORDER BY.*$/i, '$1');

    		function trim(str) {
    			return str.replace(/^\s+|\s+$/g, '');
    		}

    		function formatFieldName(name) {
    			return trim(name).replace(/^\[|\]$/g, '');
    		}

    		function parse_blocks(str) {
    			var i,
    				blockStartIndex = null,
    				blockStopIndex = null,
    				blocks = [],
    				startCount = 0;
    			for (i=0; i < str.length; i++) {

    				if (str[i] == blockOpen) {
 
 	   					if (startCount == 0) {

 	   						if (i > 0) {
 	   							blocks.push(str.substring(0, i));
 	   						}
 	   						blockStartIndex = i;
    						blockStopIndex = null;
    					}
    					startCount++;
    				} else if (str[i] == blockClose && blockStartIndex !== null) {
    					startCount--;
    					if(startCount == 0) {
    						blocks.push(trim(str.substring(blockStartIndex, i+1 )).replace(/^\(|\)$/g,''));
    						blockStopIndex = i+1;
    					}
    				}
    			}

    			if (blockStopIndex != null) {
    				blocks.push(trim(str.substring(blockStopIndex)));
    			} else if (blocks.length == 0 && blockStartIndex == null && blockStopIndex == null) {
    				blocks.push(trim(str));
    			}

    			for (var i=0; i < blocks.length; i++) {

    				var op = 'and';
    				// Determine operator for "i"
						
					if (blocks[i].match(/^\s*(\|\||(or))\s*/i)) {
						op = 'or';
					}
					if (blocks[i].match(/\s*[\|\||(or)]\s*$/gi)) {
						if (i < blocks.length -1) {
							if (!blocks[i+1].match(/^\s*(\|\||or|and|\&\&)/gi)) {
								blocks[i+1] = "or " + blocks[i+1];

							}
						}
					}
					blocks[i] = blocks[i].replace(/\s*(\&\&|and)\s*$/i, '');
					blocks[i] = blocks[i].replace(/\s*(\|\||or)\s*$/i, '');
					blocks[i] = blocks[i].replace(/^\s*(\&\&|and)\s*/i, '');
					blocks[i] = blocks[i].replace(/^\s*(\|\||or)\s*/i, '');


    				if (i > 0) {
    					blocks[i] = {
    						type : 'statement',
    						value : blocks[i],
    						operator : op
    					}
    				} else {

    					blocks[i] = {
    						type : 'statement',
    						value : blocks[i],
    						operator : op
    					}
    				}

    				if (blocks[i].value.indexOf(blockOpen) !== -1) {
    					var childBlocks = parse_blocks(blocks[i].value);
    					if (childBlocks.length > 1) {
    						blocks[i].type = 'group';
    						blocks[i].items = childBlocks;
    					}
    				} else {
    					var sp = blocks[i].value.split(/ (\|\||or|and|\&\&) /i);
    					blocks[i].type = 'statement';
    					var statements = [];
    					for (var j = 0; j < sp.length; j++) {
    						var s = {type : 'statement', operator : 'and'};

    						if (trim(sp[j]) == "") continue;

    						if (sp[j].toLowerCase() == "and" || sp[j].toLowerCase() == "or" || sp[j] == "||" || sp[j] == "&&" )
    							continue;

    						if (j > 0) {
    							if ( sp[j-1].toLowerCase() == "or" || sp[j-1] == "||")
    								s.operator = "or";
    						}
    						var p = parseStatement(sp[j]);
    						if (p) {
	    						s.field = p.field;
	    						s.macro = p.macro;
	    						s.comparison = p.comparison;
	    						statements.push(s);
	    					} else {
	    						console.error("[casql] Could not parse statement", "'" + sp[j] + "'");
	    					}
    					}
    					if (statements.length > 1) {
    						blocks[i].type = 'group';
    						blocks[i].items = statements;
    					} else if (statements.length == 1) {
    						blocks[i].field = statements[0].field;
    						blocks[i].macro = statements[0].macro;
    						blocks[i].comparison = statements[0].comparison;

    					}	
    				}
    			}

    			var newBlocks = [];
    			for(var i=0; i < blocks.length; i++) {
    				if (blocks[i].value) newBlocks.push(blocks[i]);
    			}



    			return newBlocks;
    		}

    		var _parameters = 0;
    		function parseStatement(str) {

    			if (typeof str === "undefined") return null;

    			str = str.replace(/ is not null/i, ' isnotnull ?');
    			str = str.replace(/ is null/i, ' isnull ?');

    			var m = str.match(/(.*)\s*(<>|>=|[^<]>|<=|<[^>]|[^<>]=|like|isnull|isnotnull)\s*(\?|@[a-z]+)/i);
    			if (m) {
    				var comparison = "eq",
    					macro  = "@param" + _parameters;
    					//console.warn("MATCH", str, m);
    				if (m[2] == '>') comparison = "gt";
    				if (m[2] == '>=') comparison = "gte";
    				if (m[2] == '<') comparison = "lt";
    				if (m[2] == '<=') comparison = "lte";
    				if (m[2] == '==') comparison = "eq";
    				if (m[2] == '<>' || m[2] == "!=") comparison = "ne";
    				if (m[2].toLowerCase() == 'like') comparison = "like";
    				if (m[2].toLowerCase() == 'isnull') comparison = "null";
    				if (m[2].toLowerCase() == 'isnotnull') comparison = "notnull";

    				if (comparison != "null" && comparison != "notnull") {
    					_parameters++; 
    					if (prevMacro == null) 
	    					prevMacro = m[3];
	    				else if (prevMacro != m[3]) {
	    					console.error("[casql] You can not mix named macros and ?");
	    					return null;
	    				}
	    				if (m[3][0] == "@") {
    						macro = m[3];
	    				}
    				} else {
    					macro = null;
    				}

    				return {
    					field : formatFieldName(m[1]),
    					comparison : comparison,
    					macro : macro
    				};
    			}
    			return null;
    		}

    		var parsed = parse_blocks(whereString);
    		//console.log("PARSED", whereString, parsed);

    	return parsed;




	}


	/* File: c:\git\caSql\src\index.js  */



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

	//console.log(query, param, parsedQuery);

	function getXml() {
		return viewXml;
	}

	return {
		getXml : getXml
	}



	/* File: c:\git\caSql\src\footer.js  */
});


	/* File: c:\git\caSql\src\help-functions.js  */
/**
 * Helper functions for parameters
 *  https://joshmccarty.com/a-caml-query-quick-reference/
 */


caSql.__proto__.text = function(value) {
	var multiline = value.indexOf("\n") != -1 || value.indexOf("\r") !== -1,
		ret;

	ret = {
		type : 'Text',
		value : value
	};
	if (multiline === true) ret.multiline = true;
	return ret;
}

caSql.__proto__.number = function(value) {
	if (typeof value != "number") {
		console.error("[casql] value was not a number", value);
		return null;
	}
	return {
		type : 'Number',
		value : value
	};
}

caSql.__proto__.lookup = function(value) {
	return {
		type : 'Lookup',
		value : value,
		byId : typeof value == "number"
	};
}
 
caSql.__proto__.datetime = function(value) {

	if (typeof value !== "string") {
		console.error("[casql] Bad type for datetime value");
		return null;
	}

	if (typeof value === "string" && 
		(!value.match(/^\d{4}-\d\d-\d\d$/) && !value.match(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/) )) {
		console.error("[casql] Bad format for datetime value");
		return null;
	}

	return {
		type : 'DateTime',
		value : value
	};
}

caSql.__proto__.today = function(offset) {
	if (typeof offset === "undefined") offset = 0;
	if (typeof offset !== "number") {
		console.error("[casql] Bad offset value for 'today'", offset);
		return null;
	}

	return {
		type : 'DateTime',
		today : true,
		value : offset
	};
}

caSql.__proto__.month = function(offset) {
	if (typeof offset === "undefined") offset = 0;
	if (typeof offset !== "number") {
		console.error("[casql] Bad offset value for 'today'", offset);
		return null;
	}

	return {
		type : 'DateTime',
		month : true,
		value : offset
	};
}


caSql.__proto__.guid = function(value) {
	return {
		type : 'Guid',
		value : value
	};
}

caSql.__proto__.multichoice = function(value) {
	return {
		type : 'MultiChoice',
		value : value
	};
}

caSql.__proto__.url = function(value) {
	return {
		type : 'URL',
		value : value
	};
}
