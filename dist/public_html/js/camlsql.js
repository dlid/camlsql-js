/*! camlsqj-js v1.0.1 | (c) dlid.se | https://camlsqljs.dlid.se/license */

// BEGIN c:\git\camlsql-js\src\camlsql-js\core\header.js*/
(function (global, factory) {
  'use strict';
  typeof exports === 'object' && typeof module !== 'undefined' ? (module.exports = factory()) :
  typeof define === 'function' && define.amd ? define(factory) :
  (global.camlsql = factory()); // jshint ignore:line
}(this, function() {
  'use strict';
  var publicData; 
// END c:\git\camlsql-js\src\camlsql-js\core\header.js

// BEGIN c:\git\camlsql-js\src\camlsql-js\util\datetime-utilities.js*/



function createDateWithIntervalString(val) {
  var msToAdd = getIntervalStringAsMs(val);
  console.log("add", msToAdd);
  msToAdd += (new Date()).getTime();
  return Date(msToAdd);
}


function getIntervalStringAsMs(val) {
  var msToAdd = 0,
      m,
      seconds = 0;

  if (typeof val  !== "string") throw "[camlsql] Interval value must be a string";

  if ((m = val.match(/^(\d+) (month|day|hour|minute|second|ms|millisecond)s?$/))) {
    val = parseInt(val, 10);
    switch (m[2]) {
      case "month": seconds = (((24 * 60) * 60) * 30) * val; break;
      case "day": seconds = (((val * 24) * 60) * 60); break;
      case "hour": seconds = ((val * 60) * 60); break;
      case "minute": seconds = (val * 60); break;
      case "second": seconds = val; break;
      case "ms": case "millisecond": seconds = val / 1000; break;
    }
    msToAdd = seconds * 1000; 
    return msToAdd;
  } else {
    throw "[camlsql] Interval string was not recognized: " + val;
  }
}
// END c:\git\camlsql-js\src\camlsql-js\util\datetime-utilities.js

// BEGIN c:\git\camlsql-js\src\camlsql-js\util\parameter-functions.js*/
/**
 * Helper functions for parameters
 */

 function createTextParameter(value) {
  if (typeof value !== "string" && typeof value !== "undefined") {
    throw "[camlsql] Value was not a string";
  }
  value = typeof value !== "undefined" ? value : "";
  var multiline = value.indexOf("\n") != -1 || value.indexOf("\r") !== -1,
      ret;

  ret = {
    type : 'Text',
    value : value
  };
  if (multiline === true) ret.multiline = true;
  return ret;
 }


 function createNumberParameter(value) {
  if (typeof value != "number" && typeof value !== "undefined")  {
    throw "[camlsql] Value was not a number";
  }
  value = value ? value : 0;
  return {
    type : 'Number',
    value : value
  };
 }

 function createLookupParameter(value) {
  return {
    type : 'Lookup',
    value : value,
    byId : typeof value == "number"
  };
 }

 // function createNowParameter(includeTime) {
 //  return {
 //    type : 'DateTime',
 //    isNow : true,
 //    includeTime : includeTime == true ? true : false
 //  };
 // }

 function createDateParameter(value) {
  var o = createDateTimeParameter(value);
  if (o) {
    o.includeTime = false;
  }
  return o;
 }

 function createDateTimeParameter(value) {
  var date, date2;

  if (arguments.length == 0) return createTodayParameter(0, true);

  if (typeof value == "string") {
    if (value == "month start") {
      date= new Date();
      value = d.getFullYear() + "-" + padString(d.getMonth()+ 1) + "-01T00:00:00Z";
    } else if (value == "month end") {
      date= new Date();
      date2 = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      value = date2.getFullYear() + "-" + padString(date2.getMonth()+1) + "-" + padString(date2.getDate()) + "T23:59:59Z";
    } else if (value == "this morning") {
      date= new Date();
      value = d.getFullYear() + "-" + padString(d.getMonth()+1) + "-" + padString(d.getDate()) + "T00:00:00Z";
    } else if (value == "tonight") {
      date= new Date();
      value = d.getFullYear() + "-" + padString(d.getMonth()+1) + "-" + padString(d.getDate()) + "T23:59:59Z";
    }
  }

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
  value : value,
  includeTime : true
 };
}

function createTodayParameter(offset, includeTime) {
  if (typeof offset === "undefined") offset = 0;
  if (typeof offset !== "number") {
    throw "[camlsql] Bad offset value for 'today'";
  }

  return {
    type : 'DateTime',
    today : true,
    value : offset,
    includeTime : includeTime === true ? true : false
  };
}




// camlsql.__proto__.month = function(offset) {
//  if (typeof offset === "undefined") offset = 0;
//  if (typeof offset !== "number") {
//   console.error("[camlsql] Bad offset value for 'today'", offset);
//   return null;
//  }

//  return {
//   type : 'DateTime',
//   month : true,
//   value : offset
//  };
// }


function createGuidParameter(value) {
  return {
    type : 'Guid',
    value : value
  };
}

function createMultiChoiceParameter(value) {
  return {
    type : 'MultiChoice',
    value : value
  };
}

function createChoiceParameter(value) {
  return {
    type : 'Choice',
    value : value
  };
}

function createUrlParameter(value) {
  return {
    type : 'URL',
    value : value
  };
}


function createUserParameter(value) {
  return {
    type : 'User',
    value : value
  };
}

// END c:\git\camlsql-js\src\camlsql-js\util\parameter-functions.js

// BEGIN c:\git\camlsql-js\src\camlsql-js\util\sharepoint-exec-function.js*/

 /**
 * The parsed query
 * @typedef {Object} CamlSql~execOptions
 * @property {CamlSql~ParsedQuery} query - The parsed query to execute
 * @property {function} callback - The callback function
 * @where {Array.<CamlSql~Condition>}
 */

function executeSPQuery(options) {
        var spWeb = options.spWeb,
            execCallback = options.callback,
            clientContext,
            spList = null,
            listName = options.query.getListName(),
            spListItems = null,
            viewXml = options.query.getXml(),
            nextPage,
            prevPage;

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
            console.log("camlQuery", camlQuery);
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
                nextPage = listItemCollectionPosition.get_pagingInfo();
            }

            while (listItemEnumerator.moveNext()) {
                spListItem = listItemEnumerator.get_current();
                if (!prevPage) {
                    prevPage = "PagedPrev=TRUE&Paged=TRUE&p_ID=" + encodeURIComponent(spListItem.get_id());
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
// END c:\git\camlsql-js\src\camlsql-js\util\sharepoint-exec-function.js

// BEGIN c:\git\camlsql-js\src\camlsql-js\util\string-utilities.js*/

/**
 * Add zero padding to a string
 * @param  {string} str The string to pad
 * @param  {number} size The number of zeros yo want
 * @return {string} The padded string
 */
function padString(str, size) {
  var s = String(str);
  while (s.length < (size || 2)) {s = "0" + s;}
  return s;
}

/**
 * HTML Encode a string for use in the XML
 * @param  {string} stringToEncode The string to encode
 * @return {string}                The encoded string
 */
function encodeHTML(stringToEncode) {
  return stringToEncode.replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}


/**
 * Strip spaces from around a string
 * @param  {string} str String to trim
 * @return {string}     The trimmed string
 */
function trim(str) {
 return str.replace(/^\s+|\s+$/g, '');
}

/**
 * Trim and remove any surrounding [] from the string
 * @param  {string} name The field name
 * @return {string}      The fixed field name
 */
function formatFieldName(name) {
 return trim(name).replace(/^\[|\]$/g, '');
}

// END c:\git\camlsql-js\src\camlsql-js\util\string-utilities.js

// BEGIN c:\git\camlsql-js\src\camlsql-js\sql-query\CamlSqlQuery.js*/
function CamlSqlQuery(query, param) {
    
    var currentQuery = this;

 
    var parameters = parseParameters(param);
    console.log("parameters", parameters);


    this.exec = function() {
      var args = Array.prototype.slice.call(arguments),
          spWeb,
          execCallback;

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

      return executeSPQuery({
        query : this,
        callback : execCallback,
        spWeb : spWeb
      });
    };
    
    function getXml() {
      var builder = new CamlXmlBuilder(currentQuery);
      return builder;
    }


    this.getXml = getXml;
    this.$options = {
      parsedQuery : parseSqlQuery(query)
    };

  }

// END c:\git\camlsql-js\src\camlsql-js\sql-query\CamlSqlQuery.js

// BEGIN c:\git\camlsql-js\src\camlsql-js\sql-query\parameter-parser.js*/

// var ParameterBase = {

// };

function parseParameters(param) {
  var i, newParam = {}, p;
  if (param && param.length > 0) {
   for (i=0; i < param.length; i++) {
     p = parseParameter(param[i]);
     if (p) {
      newParam["@param" + i] = p;
     }
   }
 }
 return newParam;
}

function parseParameter(parameter) {
  var ret = null, i;
  if (parameter == null) return null;
  if (parameter!==null && parameter.constructor === Array) {
   ret = [];
   for (i=0; i < parameter.length;i++) {
     ret.push(parseParameter(parameter[i]));
   }
 } else if (typeof parameter === "string") {
   ret = createTextParameter(parameter);
 } else if (typeof parameter == "number") {
   ret = camlsql.number(parameter);
 } else if (typeof parameter == "object" && parameter.type !== "undefined") {
   return parameter;
 }
 return ret;
}
// END c:\git\camlsql-js\src\camlsql-js\sql-query\parameter-parser.js

// BEGIN c:\git\camlsql-js\src\camlsql-js\sql-query\query-parser--limit.js*/
function extractLimitPart(workingObject) {
  var match, limitString;
  if ((match = workingObject.query.match(/\sLIMIT\s(\d+).*$/i))) {
    workingObject.query = workingObject.query.substr(0, workingObject.query.length - match[0].length );
    workingObject.rowLimit = parseInt(match[1], 10);
  }
}
// END c:\git\camlsql-js\src\camlsql-js\sql-query\query-parser--limit.js

// BEGIN c:\git\camlsql-js\src\camlsql-js\sql-query\query-parser--list-and-fieldnames.js*/
/**
 * Extract the chosen Field and the list name from the query.
 * The query part of the workingObject will remain only with the SELECT statement (if found)
 * @param  {CamlSql~ParsedQuery} workingObject The working object to process
 */
function extractListAndFieldNameParts(workingObject) {
  var query = workingObject.query,
      fields = [],
      listName,
      t,
      i,
      m = query.match(/^SELECT\s(.*?)\sFROM\s(.*?)(?:\s+(where.*)$|$)/i);

  if (m) {
    if (m.length == 4) {
      fields = parseFieldNames(m[1]);
      for (i=0; i < fields.length; i++) {
        if (!fields[i].match(/^[a-z:A-Z_\\d]+$/)) {
          if (console.warn) console.warn("[camlsql] Doubtful field name: " + fields[i]);
        }
      }
      workingObject.fields = fields;
      listName = formatFieldName(m[2]);
      workingObject.query = m[3];
    } else {
      workingObject.query = "";
    }
  }
}

/**
 * Attempt to parse the list of field names into an array of strings
 * @param  {string}           The string from which to parse the field names
 * @return {Array.<string>}   An array of field names
 */
function parseFieldNames(fieldNameString) {
  var fields = [],
      t = fieldNameString.split(','),
      i;
  for (i=0; i < t.length; i++) {
    t[i] = formatFieldName(t[i]);
    fields.push(t[i]);
  }
  if (fields.length == 1 && fields[0] == '*') fields = [];
  return fields;
}
// END c:\git\camlsql-js\src\camlsql-js\sql-query\query-parser--list-and-fieldnames.js

// BEGIN c:\git\camlsql-js\src\camlsql-js\sql-query\query-parser--orderby.js*/
/**
 * Parse the ORDER BY string
 * @param {[type]} orderByString [description]
 * @param {[type]} quiet         [description]
 * @returns array [description]
 */
function extractOrderByPart(workingObject, quiet) {
    var orderValues = [],
        match,
        fieldName,
        dataType,
        orderByString,
        query = workingObject.query,
        asc,
        m,
        order,
        re = new RegExp("(\\[?[a-z:A-Z_\\d]+?\\]?)(\\,\\s+|\\s+asc|\\s+desc|$)", "ig");

      if ((m = query.match(/\sORDER\sBY\s(.*?)$/i))) {
        orderByString = m[1];
        query = query.substr(0, query.length - m[0].length );
      } else {
        return;
      }

    if (typeof orderByString !== "undefined" && orderByString !== null) {
        while ((match = re.exec(orderByString))) {
            asc = true;
            dataType = null;
            if (match[1].indexOf(':') > 0) {
                m = match[1].split(':');
                if (m.length == 2 && m[0].length > 0) {
                    m[0] = m[0].toLowerCase();
                    switch(m[0]) {
                        case "datetime": m[0] = "DateTime"; break;
                        case "text": m[0] = "Text"; break;
                        case "number": m[0] = "Number"; break;
                        case "datetime": m[0] = "DateTime"; break;
                    }
                    dataType = m[0];
                    match[1] = m[1];
                } else
                    return [];
            } else {
              if (console.error) console.error("[camlsql] Error in ORDER BY statement: " + match[1]);
            }
            fieldName = formatFieldName(match[1]);
            if (match.length == 3) {
                order = typeof match[2] !== "undefined" ? trim(match[2].toLowerCase()) : null;
                asc = order == "desc" ? false : true;
            }
            orderValues.push([fieldName, asc, dataType]);
        }
    }
    workingObject.sort = orderValues;
}
// END c:\git\camlsql-js\src\camlsql-js\sql-query\query-parser--orderby.js

// BEGIN c:\git\camlsql-js\src\camlsql-js\sql-query\query-parser--viewscope.js*/
function extractScopePart(workingObject) {
  var m, query = workingObject.query, scope;
    if ((m = query.match(/^(select\s+)(scope\s+([a-z]+)\s+)/i))) {
      m[3] = m[3].toLowerCase();
      switch(m[3]) {
        case "defaultvalue": scope = "DefaultValue"; break;
        case "recursive": scope = "Recursive"; break;
        case "recursiveall": scope = "RecursiveAll"; break;
        case "filesonly": scope = "FilesOnly"; break;
      }
      if (!scope && console.error) throw "[camlsql] Unknown scope '" + m[3] + "'";
      if (typeof scope !== "undefined") {
        workingObject.viewScope = scope;
      }
      workingObject.query = m[1] + query.substr(m[1].length + m[2].length);
    } else {
      workingObject.viewScope = null;
    }
}
// END c:\git\camlsql-js\src\camlsql-js\sql-query\query-parser--viewscope.js

// BEGIN c:\git\camlsql-js\src\camlsql-js\sql-query\query-parser.js*/
 /**
 * The parsed query
 * @typedef {Object} CamlSql~ParsedQuery
 * @property {string} query - The query to parse
 * @property {string} listName - The name of the list
 * @property {Array.<CamlSql~Condition>} statements - A list of where conditions
 * @property {number} rowLimit - The max returned number of rows
 * @property {string} viewScope - The selected ViewScope
 * @property {Array.<Array<string>>} sort - An ordered list of sorting options (field, ascending, datatype)
 * @property {Array.<string>} macros - The list of macros in the where statement
 */

/**
 * Will attempt to parse a SQL string into objects
 * @param {[type]} query The "SQL" string to parse
 * @return {CamlSql~ParsedQuery} The parsed result
 */
 function parseSqlQuery(query, quiet) {

  var workingObject = {
    query : query,
    rowLimit : 0,
    fields : [],
    sort : [],
    viewScope : null,
    macros : [],
    statements : []
  },
  where;

  // The extract-parts functions will update the working object accordingly
  extractScopePart(workingObject);
  extractLimitPart(workingObject);
  extractOrderByPart(workingObject);
  extractListAndFieldNameParts(workingObject);

  // Parse the remaining part of the query - the WHERE statement
  where = WhereParser(workingObject.query);
  workingObject.statements = where.statements;
  workingObject.macros = where.macros;

  // Reset to the original query
  workingObject.query = query;

  return workingObject;
}
// END c:\git\camlsql-js\src\camlsql-js\sql-query\query-parser.js

// BEGIN c:\git\camlsql-js\src\camlsql-js\sql-query\where-parser.js*/
/**
 * Parse the WHERE statements
 * @param {[type]} whereString [description]
 * @param {[type]} quiet       [description]
 * @returns array [description]
 */

var WhereParser = function(whereString, quiet) {
    var blockOpen = '(',
        blockClose = ')',
        conjunction = ['and', 'or', '&&', '||'],
        operators = ['=', '<', '>', '!'],
        prevMacro = null,
        result = {
            statements : [], 
            macroType : null,
            macroCount : 0,
            macros : []
        };

        if (typeof whereString === "undefined") return result;

        whereString = whereString.replace(/^.*?(WHERE\s)/i, '');
        whereString = whereString.replace(/(.*?)\s?ORDER\sBY.*$/i, '$1');

        function trim(str) {
            return str.replace(/^\s+|\s+$/g, '');
        }

        function parse_blocks(str) {
            var i,
                blockStartIndex = null,
                blockStopIndex = null,
                blocks = [],
                startCount = 0,
                op,
                sp,
                childBlocks,
                statements,
                j,s,p,newBlocks;

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

            for (i=0; i < blocks.length; i++) {

                op = 'and';
                // Determine operator for "i"

                if (blocks[i].match(/^\s*(\|\||(or))\s*/i)) {
                    op = 'or';
                }

                if (blocks[i].match(/\s*(?:\|\||(or))\s*$/gi)) {
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
                    };
                } else {

                    blocks[i] = {
                        type : 'statement',
                        value : blocks[i],
                        operator : op
                    };
                }

                if (blocks[i].value.indexOf(blockOpen) !== -1) {
                    childBlocks = parse_blocks(blocks[i].value);
                    if (childBlocks.length > 1) {
                        blocks[i].type = 'group';
                        blocks[i].items = childBlocks;
                    }
                } else {
                    sp = blocks[i].value.split(/ (\|\||or|and|\&\&) /i);
                    blocks[i].type = 'statement';
                    statements = [];
                    for (j = 0; j < sp.length; j++) {
                        s = {type : 'statement', operator : 'and'};

                        if (trim(sp[j]) == "") continue;

                        if (sp[j].toLowerCase() == "and" || sp[j].toLowerCase() == "or" || sp[j] == "||" || sp[j] == "&&" )
                            continue;

                        if (j > 0) {
                            if ( sp[j-1].toLowerCase() == "or" || sp[j-1] == "||")
                                s.operator = "or";
                        }
                        p = parseStatement(sp[j]);
                        if (p) {
                            s.field = p.field;
                            s.macro = p.macro;
                            s.comparison = p.comparison;
                            statements.push(s);
                        } else {
                            if(!quiet) throw "[casql] Could not parse statement: " +sp[j];
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

            newBlocks = [];
            for(i=0; i < blocks.length; i++) {
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
        if (typeof parsed !== "undefined") {
            result.statements = parsed;
        }
        //console.log("PARSED", whereString, parsed);

        result.macroType = prevMacro;
        result.macroCount = _numMacros;
        result.macros = _macros;

    return result;



}; 
// END c:\git\camlsql-js\src\camlsql-js\sql-query\where-parser.js

// BEGIN c:\git\camlsql-js\src\camlsql-js\xml-builder\CamlXmlBuilder.js*/
function CamlXmlBuilder() {
  



  return {
    xml : null,
    errors : null
  };

}
// END c:\git\camlsql-js\src\camlsql-js\xml-builder\CamlXmlBuilder.js

// BEGIN c:\git\camlsql-js\src\camlsql-js\index.js*/
  
  /**
   * These are the methods that should be public in the camlsql object
   * @type {Object}
   */
  publicData = {
    prepare : function(query, param) {
      return new CamlSqlQuery(query, param);
    },
    text : createTextParameter,
    guid : createGuidParameter,
    number : createNumberParameter,
    lookup : createLookupParameter,
   // now : createNowParameter,
    date : createDateParameter,
    datetime : createDateTimeParameter,
    today : createTodayParameter,
    multichoice : createMultiChoiceParameter,
    choice : createChoiceParameter,
    url : createUrlParameter,
    user : createUserParameter
  }; 
  // var _properties = {
  //  query : query,
  //  limit : [0, -1],
  //  viewScope : null
  // },
  // quiet = false;

  // function parseQuery(query) {

  //  var orderByString,
  //    limitString,
  //    limitOffset = 0,
  //    limitRows = -1;

  //  if (m = query.match(/^(select\s+)(scope (defaultvalue|recursive|recursiveall|filesonly)\s+)/i)) {
  //    m[3] = m[3].toLowerCase();
  //    if (m[3] == "defaultvalue") _properties.viewScope = "DefaultValue";
  //    if (m[3] == "recursive") _properties.viewScope = "Recursive";
  //    if (m[3] == "recursiveall") _properties.viewScope = "RecursiveAll";
  //    if (m[3] == "filesonly") _properties.viewScope = "FilesOnly";
  //    query = m[1] + query.substr(m[1].length + m[2].length);
  //    console.warn("scope", m[3]);
  //  }

  //  if (m = query.match(/ LIMIT (\d+,|)(\d+).*$/i)) {
  //    limitString = m[0];
  //    query = query.substr(0, query.length - m[0].length );
  //    if (m[1] == "") {
  //      limitRows = parseInt(m[2], 10);
  //    } else {
  //      limitOffset = parseInt(m[1], 10);
  //      limitRows = parseInt(m[2], 10);
  //    }
  //  }

  //  // Extract ORDER BY statement
  //  if (m = query.match(/ ORDER BY (.*?)$/i)) {

  //    orderByString = m[1];
  //    query = query.substr(0, query.length - m[0].length );
  //  }

  //  var m = query.match(/^SELECT (.*?) FROM (.*?)(?:\s+(where.*)$|$)/i),
  //    fields = [],
  //    listName,
  //    t, 
  //    i,
  //    w = {
  //      statements : [],
  //      macroType : null,
  //      macroCount : 0,
  //      macros : []
  //    };

  //  if (m) {
  //    if (m.length == 4) {
  //      t = m[1].split(',');
  //      for (i=0; i < t.length; i++) {
  //        t[i] = t[i].replace(/^[\s\[]*|[\s\]]*$/g, '');
  //        fields.push(t[i]);

  //      }
  //      listName = formatFieldName(m[2]);
  //      w = WhereParser(m[3], quiet);
  //    }
  //  }

  //  if (fields.length == 1 && fields[0] == '*') fields = [];

 //     return { 
 //       listName : listName,
  //    viewFields : fields,
  //    where : w.statements,
  //    macroType : w.macroType,
  //    macroCount : w.macroCount,
  //    macros : w.macros,
  //    sort : OrderByParser(orderByString, quiet),
  //    limit : {
  //      offset : limitOffset,
  //      rowLimit : limitRows
  //    }
  //  }; 

  // }

  // function parseParameter(parameter) {
  //  var ret = null;
  //  if (parameter == null) return null;
  //  if (parameter!==null && parameter.constructor === Array) {
  //    ret = [];
  //    for (var i=0; i < parameter.length;i++) {
  //      ret.push(parseParameter(parameter[i]));
  //    }
  //  } else if (typeof parameter === "string") {
  //    ret = createTextParameter(parameter);
  //  } else if (typeof parameter == "number") {
  //    ret = camlsql.number(parameter);
  //  } else if (typeof parameter == "object" && parameter.type !== "undefined") {
  //    return parameter;
  //  }
  //  return ret;
  // }


  // var newParam = {};
  // if (param && param.length > 0) {
  //  _properties.originalParam = param;
  //  for (var i=0; i < param.length; i++) {
  //    newParam["@param" + i] = parseParameter(param[i]);
  //  }
  //  _properties.param = newParam;
  // }

  // var parsedQuery,
  //  viewXml = "";

  // function generateViewXml() {
  //  parsedQuery = parseQuery(query),
  //  viewXml = "<View";

  //  if (_properties.viewScope) viewXml += ' Scope="' + _properties.viewScope.encodeHTML() + '"';

  //  viewXml += ">"; 

  //  if (parsedQuery.viewFields.length > 0) {
  //    viewXml += "<ViewFields>";
  //    for (var i=0; i < parsedQuery.viewFields.length; i++) {
  //      viewXml += '<FieldRef Name="' + parsedQuery.viewFields[i].encodeHTML() + '" />';
  //    }
  //    viewXml += "</ViewFields>";
  //  }

  //  _properties.macroType = parsedQuery.macroType;
  //  _properties.macroCount = parsedQuery.macroCount;
  //  _properties.macros = parsedQuery.macros;

  //  var queryXml = andOrWhatnot(parsedQuery.where),
  //    orderXml = createOrderXml(parsedQuery.sort)

  //  if (queryXml || orderXml) {

  //    if (queryXml) queryXml = '<Where>' + queryXml + '</Where>';

  //    viewXml += "<Query>" + queryXml + orderXml + "</Query>";
  //  }

  //  if (parsedQuery.limit.rowLimit != -1)
  //    viewXml += "<RowLimit>" + parsedQuery.limit.rowLimit + "</RowLimit>";

  //  viewXml += "</View>";
  // }

  

  // function createOrderXml(items) {
  //  var str = "", i, dataType = "";
  //  if (typeof items !== "undefined") {
  //    for (i=0; i < items.length; i++) { 
  //      if (items[i][2]) dataType = ' Type="' + items[i][2].encodeHTML() +'"';
  //      str += '<FieldRef Name="' + items[i][0].encodeHTML() + '"' + dataType + ( !items[i][1] ? ' Ascending="FALSE"' : '' ) + ' />';
  //    }
  //    if (str) str = "<OrderBy>" + str + "</OrderBy>";
  //  } 
  //  return str;
  // }


  // function andOrWhatnot(items) {
  //  var xml = "";
  //  if (!items) return "";
  //  if (items.length > 1) {
  //    var operatorElement = items[1].operator == "and" ? "And" : "Or";
      
  //    // item 0 + 1 goes here
  //    xml += whereItemToXml(items[0]);
  //    xml += andOrWhatnot(items.slice(1));

  //    return "<"+operatorElement+">" + xml + "</"+operatorElement+">";
  //  } else if (items.length == 1) {
  //    xml += whereItemToXml(items[0]);
  //  }
  //  return xml;
  // }

  // function whereItemToXml(item) {
  //  var xml = "";
  //  if (item.type == "statement") {
  //    var param = newParam[item.macro];
  //    console.warn("", item.macro, item);
  //    if (item.comparison !== "null" && item.comparison !== "notnull") {
  //      if (typeof param === "undefined") {
  //        xml += "<casql:Error>" + ("Parameter not found ("+item.macro+")").encodeHTML() + "</casql:Error>";
  //        if(!quiet) console.error("[casql] Parameter not found", item.macro);
  //        return xml;
  //      }
  //    }

  //    var simpleMappings = {'eq' : 'Eq', 'gt' : 'Gt', 'gte' : 'Geq', 'lte' : 'Leq', 'lt' : 'Lt', 'ne' : 'Neq'};

  //    if (typeof simpleMappings[item.comparison] !== "undefined") {
  //      elementName = simpleMappings[item.comparison];
  //      xml += "<" + elementName + ">";
  //      xml += fieldRefValue(item, param);
  //      xml += "</" + elementName + ">";
  //    } else if (item.comparison == "in") {
  //      xml += "<IsNull>";
  //      xml += fieldRefValue(item, param);
  //      xml += "</IsNull>";
  //    } else if (item.comparison == "null") {
  //      xml += "<IsNull>";
  //      xml += '<FieldRef Name="' + item.field.encodeHTML() + '" />'
  //      xml += "</IsNull>";
  //    } else if (item.comparison == "notnull") {
  //      xml += "<IsNotNull>";
  //      xml += '<FieldRef Name="' + item.field.encodeHTML() + '" />'
  //      xml += "</IsNotNull>";
  //    } else if (item.comparison == "like") {

  //      if (param.type == "Text") {
  //        var elementName = "Contains",
  //          paramValue = null;
  //        if (param.value.indexOf('%') === 0 && param.value[param.value.length-1] === "%") {
  //          paramValue = param.value.replace(/^%?|%?$/g, '');
  //        } else if (param.value.indexOf('%') === 0) {
  //          console.warn("[casql] SharePoint does not support an 'EndsWith' statement. Contains will be used instead. (Field '" + item.field + "')");
  //          paramValue = param.value.replace(/^%?/, '');
  //        } else if (param.value.indexOf('%') === param.value.length -1) {
  //          paramValue = param.value.replace(/%?$/, '');
  //          elementName = "BeginsWith"
  //        }
  //        xml += "<"+elementName+">";
  //        xml += fieldRefValue(item, param, paramValue);
  //        xml += "</"+elementName+">";
  //      } else {
  //        xml += "<casql:Error>LIKE statements must use a text parameter. " + param.type + " was used.</casql:Error>";
  //      }
  //    } else {
  //      xml += "<NOT_IMPLEMENTED>" + item.comparison + "</NOT_IMPLEMENTED>";
  //    }
  //  } else {
  //    xml += andOrWhatnot(item.items);
  //  }
  //  return xml;
  // }

  // function createValueElement(item, param, paramValue) {
  //  var xml = "",
  //    valueAttributes = "";
  //  if (param.type == "DateTime") {
  //    if (param.includeTime == true) 
  //      valueAttributes+= ' IncludeTimeValue="TRUE"';
  //    if (param.today === true) {
  //      xml = "<Today";
  //      if (paramValue) {
  //        xml += ' OffsetDays="' + paramValue + '"';
  //      }
  //      xml += " />";
  //    } else if (param.isNow === true) {
  //      xml += "<Now />";
  //    } else {
  //      xml += paramValue.encodeHTML();
  //    }
  //  } else if (param.type == "Text" || param.type == "Guid") {
  //    if (param.multiline === true) {
  //      xml = "<<![CDATA[";
  //      xml += paramValue;
  //      xml += "]]>";
  //    } else {
  //      xml += paramValue.encodeHTML();
  //    }
  //  } else if (param.type == "Number") {
  //    xml += paramValue;
  //  }
  //  xml = '<Value Type="' + param.type + '"'+valueAttributes+'>' + xml +'</Value>';
  //  return xml;
  // }

  // function fieldRefValue(item, param, editedParamValue) {
  //  var xml = "",
  //    value = "",
  //    paramValue = typeof editedParamValue !== "undefined" && editedParamValue !== null ? editedParamValue : (param ? param.value : null);
  
  //  if (item.comparison == "in") {
  //    xml += '<FieldRef Name="' + item.field.encodeHTML() + '" />'
  //    xml += '<Values>';
  //    for (var i=0; i < param.length; i++) {
  //      xml += createValueElement(item, param[i], param[i].value);      
  //    }
  //    xml += '</Values>';
  //    return xml;
  //  } else {
  //    value = createValueElement(item, param, paramValue);
  //  }
    
  //  xml += '<FieldRef Name="' + item.field.encodeHTML() + '" />'
  //  xml += value; //'<Value Type="' + param.type + '">' + value +'</Value>';
  //  return xml;
  // }




  // //console.log(query, param, parsedQuery);

  // function getListName() {
  //  return parsedQuery.listName;
  // }

  // function getXml() {
  //  generateViewXml();
  //  return viewXml;
  // }

  // function getSql() {
  //  return query;
  // }

  // var publicItems = {
  //  getXml : getXml,
  //  getListName : getListName,
  //  _properties : _properties
  // };

  // if (typeof executeQuery !== "undefined")
  //  publicItems.exec = executeQuery;

  // generateViewXml();

  // return publicItems;
// END c:\git\camlsql-js\src\camlsql-js\index.js

// BEGIN c:\git\camlsql-js\src\camlsql-js\__testonly__.js*/
/*!
 *
 * This will expose private methods publicly so tests can be run
 * 
 */


publicData.__testonly__ = publicData.__testonly__ || {};

publicData.__testonly__.padString = padString;
publicData.__testonly__.extractOrderByPart = extractOrderByPart;
publicData.__testonly__.extractListAndFieldNameParts = extractListAndFieldNameParts;
publicData.__testonly__.extractScopePart = extractScopePart;
publicData.__testonly__.extractLimitPart = extractLimitPart;
publicData.__testonly__.parseSqlQuery = parseSqlQuery;
publicData.__testonly__.whereParser = WhereParser;
//publicData.__testonly__.createNowParameter = createNowParameter;
publicData.__testonly__.createDateParameter = createDateParameter;
publicData.__testonly__.createDateTimeParameter = createDateTimeParameter;
publicData.__testonly__.createTodayParameter = createTodayParameter;
publicData.__testonly__.createGuidParameter = createGuidParameter;
publicData.__testonly__.createMultiChoiceParameter = createMultiChoiceParameter;
publicData.__testonly__.createChoiceParameter = createChoiceParameter;
publicData.__testonly__.createUrlParameter = createUrlParameter;
publicData.__testonly__.createUserParameter = createUserParameter;
publicData.__testonly__.encodeHTML = encodeHTML;
publicData.__testonly__.trim = trim;
publicData.__testonly__.formatFieldName = formatFieldName;
publicData.__testonly__.getIntervalStringAsMs = getIntervalStringAsMs;
publicData.__testonly__.createDateWithIntervalString = createDateWithIntervalString;


// END c:\git\camlsql-js\src\camlsql-js\__testonly__.js

// BEGIN c:\git\camlsql-js\src\camlsql-js\core\footer.js*/
  return publicData;
}));
// END c:\git\camlsql-js\src\camlsql-js\core\footer.js