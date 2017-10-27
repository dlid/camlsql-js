/*! camlsql v1.0.1@2017-10-27 18:22:43+0200 (https://github.com/dlid/camlsql-js) */


	/* File: C:\git\camlsql-js\src\camlsql-js\header.js  */
var camlsql = (function(query, param)  {
	var camlsqlInstance = this;





	/* File: C:\git\camlsql-js\src\camlsql-js\where-parser.js  */
	var WhereParser = function(whereString, quiet) {
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
	    						if(!quiet) console.error("[casql] Could not parse statement", "'" + sp[j] + "'");
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

    		var _parameters = 0,
                _numMacros = 0,
                _macros = [];
    		function parseStatement(str) {

    			if (typeof str === "undefined") return null;

    			str = str.replace(/ is not null/i, ' isnotnull ?');
    			str = str.replace(/ is null/i, ' isnull ?');

    			var m = str.match(/(.*)\s*(<>|>=|[^<]>|<=|<[^>]|[^<>]=|like|isnull|isnotnull|in)\s*(\?|@[a-z]+)/i);
    			if (m) {
    				var comparison = "eq",
    					macro  = "@param" + _parameters,
                        cmpMatch = trim(m[2]);
    					
    				if (cmpMatch == '>') comparison = "gt";
    				if (cmpMatch == '>=') comparison = "gte";
    				if (cmpMatch == '<') comparison = "lt";
    				if (cmpMatch == '<=') comparison = "lte";
    				if (cmpMatch == '==') comparison = "eq";
                    
    				if (cmpMatch == '<>' || cmpMatch == "!=") comparison = "ne";
    				if (cmpMatch.toLowerCase() == 'like') comparison = "like";
    				if (cmpMatch.toLowerCase() == 'isnull') comparison = "null";
    				if (cmpMatch.toLowerCase() == 'isnotnull') comparison = "notnull";
                    if (cmpMatch.toLowerCase() == 'in') comparison = "in";

    				if (comparison != "null" && comparison != "notnull") {
    					_parameters++; 
                        _numMacros++;
    					if (prevMacro == null) 
	    					prevMacro = m[3];
	    				else if (prevMacro != m[3]) {
	    					if(!quiet) console.error("[casql] You can not mix named macros and ?");
	    					return null;
	    				}
	    				if (m[3][0] == "@") {
    						macro = m[3];
	    				} 
                        _macros.push(macro);
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

    	return {
            statements : parsed, 
            macroType : prevMacro,
            macroCount : _numMacros,
            macros : _macros
        }



	}


	/* File: C:\git\camlsql-js\src\camlsql-js\orderby-parser.js  */
	

    /**
     * Parse the ORDER BY string
     * @param {[type]} orderByString [description]
     * @param {[type]} quiet         [description]
     * @returns array [description]
     */
    var OrderByParser = function(orderByString, quiet) {
		var orderValues = [],
            match,
            fieldName,
            asc,
            re = new RegExp("(\\[?[a-zA-Z_\\d]+?\\]?)(\\,\\s+|\\s+asc|\\s+desc|$)", "ig");
        if (typeof orderByString !== "undefined" && orderByString !== null) {
            while (match = re.exec(orderByString)) {
                asc = true;
                fieldName = formatFieldName(match[1]);
                if (match.length == 3) {
                    order = typeof match[2] !== "undefined" ? trim(match[2].toLowerCase()) : null;
                    order = order == "desc" ? false : true 
                }
                orderValues.push([fieldName, order]);
            }
        }
    	return orderValues; 
	}

    window.orderByParser = OrderByParser;  


	/* File: C:\git\camlsql-js\src\camlsql-js\sp-exec.js  */
var executeQuery = function () {
        var args = Array.prototype.slice.call(arguments),
            spWeb = null,
            execCallback = null,
            clientContext,
            spList = null,
            listName = this.getListName(),
            spListItems = null,
            viewXml = this.getXml(),
            nextPage,
            prevPage;

        if (args.length > 1) {
            if (typeof args[0] === "object") {
                spWeb = args[0];
                if (typeof args[1] == "function") {
                    execCallback = args[1];
                }
            }
        } else if (args.length == 1) {
            if (typeof args[0] === "object") {
                spWeb = args[0];
            } else if (typeof args[0] == "function") {
                execCallback = args[0];
            }
        }

        if (typeof SP !== "undefined") {

            SP.SOD.executeFunc('sp.js', 'SP.ClientContext', function () {
                clientContext = SP.ClientContext.get_current();
                if (spWeb === null) {
                    spWeb = clientContext.get_web();
                    spList = spWeb.get_lists().getByTitle(listName);

                    clientContext.load(spList);
                    clientContext.executeQueryAsync(onListLoaded, function () {
                        execCallback({
                            status: "error",
                            message: "Failed to load list",
                            data: {
                                sql: getSql,
                                viewXml: viewXml,
                                listName: listName,
                                error: Array.prototype.slice.call(arguments)
                            }
                        }, null);
                    });

                }
            });

        } else {
            execCallback({
                status: "error",
                message: "SP is not defined",
                data: null
            }, null);
        }

        function onListLoaded() {
            var camlQuery = new SP.CamlQuery();
            var camlQueryString = viewXml;


            camlQuery.set_viewXml(camlQueryString);
            spListItems = spList.getItems(camlQuery);
            clientContext.load(spListItems);
            clientContext.executeQueryAsync(camlQuerySuccess, function () {
                execCallback({
                    status: "error",
                    message: "Error executing the SP.CamlQuery",
                    data: {
                        sql: getSql,
                        viewXml: viewXml,
                        listName: listName,
                        error: Array.prototype.slice.call(arguments)
                    }
                }, null);
            });
        }

         function camlQuerySuccess() {
            var listItemEnumerator = spListItems.getEnumerator(),
                items = [],
                spListItem;

            var listItemCollectionPosition = spListItems.get_listItemCollectionPosition();

            if (listItemCollectionPosition) {
                nextPage = x.get_pagingInfo();
            }

            while (listItemEnumerator.moveNext()) {
                spListItem = listItemEnumerator.get_current();
                if (!prevPage) {
                    prevPage = "PagedPrev=TRUE&Paged=TRUE&p_ID=" + spListItem ;
                }
                items.push(spListItem.get_fieldValues());
            }
            execCallback(null, items, {
                nextPage : nextPage,
                prevPage : prevPage
            });
        }

        console.log({
            web: spWeb,
            callback: execCallback
        });

        return publicItems;
    }


	/* File: C:\git\camlsql-js\src\camlsql-js\index.js  */
	
	var _properties = {
		query : query,
		limit : [0, -1]
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

		// Extract ORDER BY statement
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

	var parsedQuery = parseQuery(query),
		viewXml = "<View>";
	if (parsedQuery.viewFields.length > 0) {
		viewXml += "<ViewFields>";
		for (var i=0; i < parsedQuery.viewFields.length; i++) {
			viewXml += '<FieldRef Name="' + parsedQuery.viewFields[i].encodeHTML() + '" />';
		}
		viewXml += "</ViewFields>";
	}

	function createOrderXml(items) {
		var str = "", i;
		if (typeof items !== "undefined") {
			for (i=0; i < items.length; i++) { 
				str += '<FieldRef Name="' + items[i][0].encodeHTML() + '"' + ( !items[i][1] ? ' Ascending="FALSE"' : '' ) + ' />';
			}
			if (str) str = "<OrderBy>" + str + "</OrderBy>";
		} 
		return str;
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
		xml += value; //'<Value Type="' + param.type + '">' + value +'</Value>';
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

	var publicItems = {
		getXml : getXml,
		getListName : getListName,
		_properties : _properties
	};

	if (typeof executeQuery !== "undefined")
		publicItems.exec = executeQuery;

	return publicItems;


	/* File: C:\git\camlsql-js\src\camlsql-js\footer.js  */
});


	/* File: C:\git\camlsql-js\src\camlsql-js\help-functions.js  */
/**
 * Helper functions for parameters
 */


camlsql.__proto__.text = function(value) {
	var multiline = value.indexOf("\n") != -1 || value.indexOf("\r") !== -1,
		ret;

	ret = {
		type : 'Text',
		value : value
	};
	if (multiline === true) ret.multiline = true;
	return ret;
}

camlsql.__proto__.number = function(value) {
	if (typeof value != "number") {
		console.error("[camlsql] value was not a number", value);
		return null;
	}
	return {
		type : 'Number',
		value : value
	};
}

camlsql.__proto__.lookup = function(value) {
	return {
		type : 'Lookup',
		value : value,
		byId : typeof value == "number"
	};
}
 
camlsql.__proto__.datetime = function(value) {

	if (typeof value !== "string") {
		console.error("[camlsql] Bad type for datetime value");
		return null;
	}

	if (typeof value === "string" && 
		(!value.match(/^\d{4}-\d\d-\d\d$/) && !value.match(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/) )) {
		console.error("[camlsql] Bad format for datetime value");
		return null;
	}

	return {
		type : 'DateTime',
		value : value
	};
}

camlsql.__proto__.today = function(offset) {
	if (typeof offset === "undefined") offset = 0;
	if (typeof offset !== "number") {
		console.error("[camlsql] Bad offset value for 'today'", offset);
		return null;
	}

	return {
		type : 'DateTime',
		today : true,
		value : offset
	};
}

camlsql.__proto__.month = function(offset) {
	if (typeof offset === "undefined") offset = 0;
	if (typeof offset !== "number") {
		console.error("[camlsql] Bad offset value for 'today'", offset);
		return null;
	}

	return {
		type : 'DateTime',
		month : true,
		value : offset
	};
}


camlsql.__proto__.guid = function(value) {
	return {
		type : 'Guid',
		value : value
	};
}

camlsql.__proto__.multichoice = function(value) {
	return {
		type : 'MultiChoice',
		value : value
	};
}

camlsql.__proto__.url = function(value) {
	return {
		type : 'URL',
		value : value
	};
}

camlsql.__proto__.prepare = function() {
	var args = Array.prototype.slice.call(arguments);
	args.unshift(null);
	return new (Function.prototype.bind.apply(camlsql, args));
}
