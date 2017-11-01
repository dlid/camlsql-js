/*! camlsqj-js v1.0.1 | (c) dlid.se | https://camlsqljs.dlid.se/license */
(function (global, factory) {
  'use strict';
  typeof exports === 'object' && typeof module !== 'undefined' ? (module.exports = factory()) :
 // typeof define === 'function' && define.amd ? define(factory) :
  (global.camlsql = factory()); // jshint ignore:line
}(this, function() {
  'use strict';
  var publicData; 



function createDateWithIntervalString(val) {
  var msToAdd = getIntervalStringAsMs(val);
  return new Date((new Date()).getTime() + msToAdd);
}


function getIntervalStringAsMs(val) {
  var msToAdd = 0,
      m,
      seconds = 0;

  if (typeof val  !== "string") throw "[camlsql] Interval value must be a string";
  val = val.toLowerCase();

  if ((m = val.match(/^(\d+) (day|hour|minute|second|ms|millisecond)s?$/i))) {
    val = parseInt(val, 10);
    switch (m[2]) {
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


function getDateFromTextualRepresentation(text, date) {
  var date2, value;
  text = trim(text.toLowerCase());
  date = date? new Date(+date) : new Date();
  if (text == "month start") {
    value = new Date(date.getFullYear(), date.getMonth(), 1, 0,0,0,0);
  } else if (text == "month end") {
    value = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23,59,59,999);
  } else if (text == "week start") {
    value = getStartOfWeek(date);
  } else if (text == "week start monday") {
    value = getStartOfWeek(date, true);
  } else if (text == "week end monday") {
    value = getEndOfWeek(date, true);
  } else if (text == "week end") {
    value = getEndOfWeek(date);
  } else if (text == "day start") {
    value = new Date(date.setHours(0,0,0,0));
  } else if (text == "day end") {
    value = new Date(date.setHours(23,59,59,999));
  }
  return value;

}

function getStartOfWeek(date, startWeekWithMonday) {
  date = date? new Date(+date) : new Date();
  date.setHours(0,0,0,0);
  startWeekWithMonday = startWeekWithMonday ? true : false;
  var d = date.getDay();
  if (startWeekWithMonday === true) {
    if (d == 0) {
      d = 6;
    } else {
      d = d - 1;
    }
  }
  date.setDate(date.getDate() - d);
  return date;
}

function getEndOfWeek(date, startWeekWithMonday) {
  var d;
  date = getStartOfWeek(date, startWeekWithMonday);
  d = date.getDay();

  date.setDate(date.getDate() + 6);
  return new Date(date.setHours(23,59,59,999)); 
}
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


 function createBooleanParameter(value) {
  if (typeof value != "boolean" && typeof value !== "undefined")  {
    throw "[camlsql] Value was not boolean";
  }
  return {
    type : 'Boolean',
    value : value
  };
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
    lookupid : typeof value == "number",
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
    o._includeTime = false;
  }
  return o;
 }

 function createDateTimeParameter(date) {
  var date2, isToday = false, stringValue;
  if (typeof date !== "undefined" && CamlSqlDateParameter.isPrototypeOf(date)) {
    date = date.value;
  } 

  // If the user pass in a string, use it - no questions asked
  if (typeof date === "string") {
    stringValue = date + "";
    date = null;
  } else {
    if (!date) isToday = true;
    date = date ? new Date(+date) : new Date();
  }

  return Object.create(CamlSqlDateParameter, {
    type : {value : 'DateTime'},
    value : {value : date, writable : true}, 
    _includeTime : {value : true, writable : true},
    today : {value : isToday, writable : true},
    _storageTZ : {value : true, writable : true},
    stringValue : {value : stringValue, writable : false}
  });

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
    _includeTime : includeTime === true ? true : false
  };
}  



var CamlSqlDateParameter = {
  type : 'DateTime',
  today : false,
  _includeTime : false,
  value : null,
  _storageTZ : true,
  stringValue : '',
  add : function(intervalString){
    this.errstr();
    var diff = getIntervalStringAsMs(intervalString)
    this.value = new Date( this.value.getTime() + diff );
    this.today = false;
    return this;
  },
  sub : function(intervalString){
    this.errstr();
    var diff = getIntervalStringAsMs(intervalString)
    this.value = new Date( this.value.getTime() - diff );
    this.today = false;
    return this;
  },
  startOfWeek : function(startOnSunday) {
    this.errstr();
    this.value = getDateFromTextualRepresentation('week start' + (!startOnSunday ? ' monday' : ''), this.value);
    this.today = false;
    return this; 
  },
  endOfWeek : function(startOnSunday) {
    this.errstr();
    this.value = getDateFromTextualRepresentation('week end' + (!startOnSunday ? ' monday' : ''), this.value);
    this.today = false;
    return this;
  },
  startOfMonth : function() {
    this.errstr();
    this.value = getDateFromTextualRepresentation('month start', this.value);
    this.today = false;
    return this;
  },
  endOfMonth : function() {
    this.errstr();
    this.value = getDateFromTextualRepresentation('month end', this.value);
    this.today = false;
    return this;
  },
  endOfDay : function(){
    this.errstr();
    this.value = getDateFromTextualRepresentation('day end', this.value);
    this.today = false;
    return this;
  },
  startOfDay : function() {
    this.errstr();
    this.value = getDateFromTextualRepresentation('day start', this.value);
    this.today = false;
    return this;
  },
  storageTZ : function(enabled) {
    this._storageTZ = enabled ? true : false;
    this.today = false;
    return this;
  },
  includeTime : function(enabled) {
    this._includeTime = enabled ? true : false;
    return this;
  },
  errstr : function() {
    if (this.stringValue) throw "[camlsql] You can't do that when DateTime was set as a string";
  }
};



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

// function createUrlParameter(value) {
//   return {
//     type : 'Url',
//     value : value
//   };
// }


function createUserParameter(value) {
  if (typeof value === "number") {
     return {
      type : 'User',
      value : value,
      lookupid : true
    };
  }

  return {
    type : 'User'
  };
}


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
            viewXml = options.rawXml ? options.rawXml : options.query.getXml(),
            nextPage,
            prevPage;

        if (typeof execCallback !== "function") execCallback = null;

        if (typeof SP !== "undefined") {

            SP.SOD.executeFunc('sp.js', 'SP.ClientContext', function () {});
            SP.SOD.executeOrDelayUntilScriptLoaded(function() {
                clientContext = SP.ClientContext.get_current();
                if (!spWeb) {
                    spWeb = clientContext.get_web();
                    spList = spWeb.get_lists().getByTitle(listName);

                    clientContext.load(spList);
                    clientContext.executeQueryAsync(onListLoaded, function () {
                        if (execCallback == null) {
                            throw "[camlsql] Failed to load list";
                        }
                        execCallback({
                            status: "error",
                            message: "Failed to load list",
                            data: {
                                sql: options.query.$options.parsedQuery.query,
                                viewXml: viewXml,
                                listName: listName,
                                error: Array.prototype.slice.call(arguments)
                            }
                        }, null);
                    });

                }
            },"sp.js");

        } else {
            if (execCallback == null) {
                throw "[camlsql] SP is not defined";
            }
            execCallback({
                status: "error",
                message: "SP is not defined",
                data: null
            }, null);
        }

        function onListLoaded() {
            var camlQuery = new SP.CamlQuery();
            var camlQueryString = options.query.getXml();
            camlQuery.set_viewXml(camlQueryString);
            spListItems = spList.getItems(camlQuery);
            clientContext.load(spListItems);
            clientContext.executeQueryAsync(camlQuerySuccess, function (clientRequest, failedEventArgs) {
                var extraMessage = "";
                if (failedEventArgs) {
                    if (failedEventArgs.get_errorCode() == -2130575340) {
                        extraMessage+= " (Error -2130575340: Check field names)";
                    }
                }

                execCallback({
                    status: "error",
                    message: "Error executing the SP.CamlQuery" + extraMessage,
                    data: {
                        sql: options.query.$options.parsedQuery.query,
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
    }

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
 * Encode a string to it's SharePoint Internal field representation
 */
function encodeToInternalField(str) {
 var i,c,n = "";
 for (i=0; i < str.length; i++) {
  c = encodeURIComponent(str[i]);
  if (c.indexOf('%') == 0) {
   n += "_x" + ("0000" + str.charCodeAt(i).toString(16)).slice(-4) + "_"
  } else if (c == ' ') {
   n += "_x0020_";
  } else if( c== '.') {
   n += "_x002e_";
  } else {
   n += c;
  }
 }
 return n.length > 32 ? n.substr(0,32) : n;
}

/**
 * HTML Encode a string for use in the XML
 * @param  {string} stringToEncode The string to encode
 * @return {string}                The encoded string
 */
function encodeHTML(stringToEncode) {
  if (typeof stringToEncode !== "string") return stringToEncode;
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

function CamlSqlQuery(query, param) {
    
    var currentQuery = this;

 
    var parameters = parseParameters(param);

    this.exec = function(options) {
      var args = Array.prototype.slice.call(arguments),
          spWeb,
          execCallback,
          result,
          rawXml = options.rawXml;



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

      executeSPQuery({
        query : this,
        callback : execCallback,
        spWeb : spWeb,
        rawXml : rawXml
      });

      return this;
    };
    
    function getXml() {
      var builder = new CamlXmlBuilder(currentQuery);
      return builder.xml;
    }

    function getListName() {
      return currentQuery.$options.parsedQuery.listName;
    }

    this.getListName = getListName;
    this.getXml = getXml;
    this.$options = {
      parsedQuery : parseSqlQuery(query),
      parameters : parameters
    };

  }


// var ParameterBase = {

// };

function parseParameters(param) {
  var i, newParam = {}, p, keys;
  if (param && param.length > 0) {
   for (i=0; i < param.length; i++) {
     p = parseParameter(param[i]);
     if (p) {
      newParam["@param" + i] = p;
     }
   }
 } else if (typeof param === "object") {
  keys = Object.keys(param);
  for (var i=0; i < keys.length; i++) {
    if (keys[i].indexOf('@') === 0) {
      p = parseParameter(param[keys[i]]);
      if (p) {
        newParam[keys[i]] = p;
      }
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
 } else if (typeof parameter === "boolean") {
   ret = createBooleanParameter(parameter);
 } else if (typeof parameter == "number") {
   ret = createNumberParameter(parameter);
 } else if (typeof parameter == "object" && parameter.type !== "undefined") {
   return parameter;
 }
 return ret;
}

function extractJoinPart(workingObject) {
  var query = workingObject.query,
      joins = [],
      listName,
      t, 
      i,
      m; 
 
      do {
        m = query.match(/\s+(left\s+|)join\s+(\[?[a-zA-Z_\d]+\]?)\son\s(.+?)\.([a-zA-Z_\d]+)(\s|$)/i);
        if (m) {
            var alias = formatFieldName(m[2]),
                onTable1 = m[3],
                onField1 = m[4],
                onTable2 = m[5],
                onField2 = m[6];
      

            joins.push({
              inner : trim(m[1]) == "",
              alias : alias,
              childTable : onTable1,
              childField : onField1
            });
            query = query.substr(0, m.index) + " " + query.substr(m.index + m[0].length) + m[5];
        }
      } while (m);

      workingObject.joins = joins;
      workingObject.query = query;

    //multipel
    //camlsql.prepare("SELECT * FROM [Books] left join AuthorList as book_author ON book_author.Id = Books.Author join Cities as author_cities on book_author.City = author_cities.id ", [camlsql.user(14)]).getXml()

/*

 SELECT *, FavCheese.Title AS CheeseFullName FROM TestList
           LEFT JOIN Cheese AS FavCheese ON TestList.Lookup_x0020_Single

<View>
  <Joins>
   <Join Type="LEFT" ListAlias="FavCheese">
     <Eq>
      <FieldRef Name="Lookup_x0020_Single" RefType="Id" />
      <FieldRef List="APA" Name="ID" />
     </Eq>
   </Join>
 </Joins>
 <ProjectedFields>
  <Field Name="CheeseFullName" Type="Lookup" List="APA" ShowField="Title" />
 </ProjectedFields>
</View>

-----------------


working nicely

<View>

 <Joins>
  <Join Type="INNER" ListAlias="FavCheeseList">
   <Eq>
    <FieldRef Name="FavCheese" RefType="Id" />
    <FieldRef List="FavCheeseList" Name="ID" />
   </Eq>
  </Join>
  <Join Type="INNER" ListAlias="WorstCheeseList">
   <Eq>
    <FieldRef Name="WorstCheese" RefType="Id" />
    <FieldRef List="WorstCheeseList" Name="ID" />
   </Eq>
  </Join>
 </Joins>

 <ProjectedFields>
  <Field Name="FavCheeseName" Type="Lookup" List="FavCheeseList" ShowField="Title" />
  <Field Name="WorstCheeseName" Type="Lookup" List="WorstCheeseList" ShowField="Title" />
  <Field Name="WorstCheeseBabyName" Type="Lookup" List="WorstCheeseList" ShowField="BabyName" />
 </ProjectedFields>
 <ViewFields>
  <FieldRef Name="Title" />
  <FieldRef Name="FavCheeseName" />
  <FieldRef Name="WorstCheeseName" />
  <FieldRef Name="WorstCheeseBabyName" />
</ViewFields>
 <Query><Where>
  <Eq>
   <FieldRef Name="WorstCheeseBabyName" />
   <Value Type="Text">maeh</Value>
  </Eq>
 </Where></Query>

</View>


*/



  // if (m) {
  //   if (m.length == 4) {
  //     fields = parseFieldNames(m[1]);
  //     for (i=0; i < fields.length; i++) {
  //       if (!fields[i].match(/^[a-z:A-Z_\\d]+$/)) {
  //         if (console.warn) console.warn("[camlsql] Doubtful field name: " + fields[i]);
  //       }
  //     }
  //     workingObject.fields = fields;
  //     workingObject.listName = formatFieldName(m[2]);
  //     workingObject.query = m[3];
  //   } else {
  //     workingObject.query = "";
  //   }
  // }
}
function extractLimitPart(workingObject) {
  var match, limitString;
  //console.log("WOBJ", workingObject);
  if ((match = workingObject.query.match(/\sLIMIT\s(\d+).*$/i))) {
    workingObject.query = workingObject.query.substr(0, workingObject.query.length - match[0].length );
    workingObject.rowLimit = parseInt(match[1], 10);
  }
} 
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
      m = query.match(/^SELECT\s(.*?)(?:\sFROM\s(.*?)|)(?:\s+((?:order|where).*)$|$)/i);

  if (m) {
    if (m.length == 4) {
      fields = parseFieldNames(m[1]);
      for (i=0; i < fields.length; i++) {

        if ((t = fields[i].match(/^(.*?)\.(.*?)\sas\s(.*?)$/i))) {
          workingObject.projectedFields.push({
            list : t[1],
            field : t[2],
            name : t[3]
          });
          fields[i] = formatFieldName(t[3]);
        } else if (fields[i].indexOf('.') !== -1) {
          throw "[camlsql] Projected fields in the format <list>.<field_name> must be followed with an AS <alias> ("+fields[i]+")";
        }

        if (!fields[i].match(/^[a-z:A-Z_\\d]+$/)) {
          if (console.warn) console.warn("[camlsql] Doubtful field name: " + fields[i]);
        }
      }
      workingObject.fields = fields;
      workingObject.listName = formatFieldName(m[2]);
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
    joins : [],
    viewScope : null,
    macros : [],
    statements : [],
    parameters : [],
    listName : null,
    projectedFields : []
  },
  where;

  // The extract-parts functions will update the working object accordingly
  extractScopePart(workingObject);
  extractLimitPart(workingObject);
  extractOrderByPart(workingObject);
  extractJoinPart(workingObject);
  extractListAndFieldNameParts(workingObject);

  // Parse the remaining part of the query - the WHERE statement
  where = WhereParser(workingObject.query);
  workingObject.statements = where.statements;
  workingObject.macros = where.macros;

  // Reset to the original query
  workingObject.query = query;

  return workingObject;
}
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

        // vkbeautify.xml(camlsql.prepare("SELECT * FROM Movies WHERE (Title = ? AND Title LIKE ?) AND (Fun = ? OR Scary < ?)",["summer", 'did', 10, 6,0,6]).getXml());

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
//console.log("parse_blocks", str);
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

       //     console.log("parse_blocks", "blocks=", blocks);

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

                var n = blocks[i].value.indexOf(blockOpen) > 0;


                if (n) {
                    
                    childBlocks = parse_blocks(blocks[i].value);
//                    console.log("childBlocks", childBlocks.length);
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

var XML_FIELD_VIEW = 'View',
XML_FIELD_VIEWFIELDS = 'ViewFields',
XML_FIELD_FIELDREF = 'FieldRef',
XML_ELEMENT_QUERY = "Query",
XML_ELEMENT_ORDERBY = 'OrderBy',
XML_ELEMENT_WHERE = 'Where',
XML_ELEMENT_ISNULL = "IsNull",
XML_ELEMENT_ISNOTNULL = "IsNotNull";

function CamlXmlBuilder(query) {
  var viewXml ="",
  parsedQuery = query.$options.parsedQuery,
  parameters = query.$options.parameters,
  i,
  log = {
    errors : []
  },
  n = 0;

  parsedQuery.uuid = function(prefix) {
    n++;
    return prefix + n;
  }
  // remember https://yieldreturnpost.wordpress.com/2012/10/26/caml-query-utc-date-comparisons-in-sharepoint/
  // <Value Type='DateTime' IncludeTimeValue='TRUE' StorageTZ='TRUE'>
  //    2012-10-24T21:30:46Z
  //  </Value>

  viewXml += createQueryElement(parsedQuery, parsedQuery.statements, parsedQuery.sort, parameters, log);
  viewXml += createJoinElement(parsedQuery.listName, parsedQuery.joins);
  viewXml += createProjectedFieldsElement(parsedQuery.projectedFields, parsedQuery.joins);
  viewXml += createViewFieldsElement(parsedQuery.fields);
  viewXml += createRowLimitFieldsElement(parsedQuery.rowLimit);
  

  if (viewXml) {
    viewXml = xmlBeginElement(XML_FIELD_VIEW, {Scope : parsedQuery.viewScope}) + viewXml + xmlEndElement('View');
  }

 // console.log("query", query);
 
 return {
  xml : viewXml,
  errors : null
};

}
 
function createRowLimitFieldsElement(rowLimit) {
  var xml = "";
  if (rowLimit > 0) {
    xml+=xmlBeginElement('RowLimit');
    xml+=rowLimit;
    xml+=xmlEndElement('RowLimit');
  }
  return xml;
}

function createProjectedFieldsElement(projectedFields, joins) {
  var xml = "",i,tableAliases = [];
  if (projectedFields.length > 0 && joins.length > 0) {
    xml += xmlBeginElement("ProjectedFields");
    for (i=0; i < joins.length; i++)
      tableAliases.push(joins[i].alias);

    for (i=0; i < projectedFields.length; i++) {

      if ( tableAliases.indexOf(projectedFields[i].list) == -1 )
        throw "[camlsql] Uknown list alias: " + projectedFields[i].list;

      xml += xmlBeginElement("Field", {
        Name : projectedFields[i].name,
        List : projectedFields[i].list,
        Type : 'Lookup',
        ShowField : projectedFields[i].field
      }, true);
    }

    xml += xmlEndElement("ProjectedFields");
  }

  return xml;
}

function createJoinElement(listName, joins) {
  var xml = "",i;
  if (joins.length > 0) {
    xml += xmlBeginElement("Joins");

    for (i = 0; i < joins.length; i++) {
      xml += xmlBeginElement("Join", {ListAlias : joins[i].alias});

      xml += xmlBeginElement("Eq");
      xml += xmlBeginElement("FieldRef", { 
        List : joins[i].childTable != listName ? joins[i].childTable : null,
        Name : joins[i].childField, RefType : 'Id' 
      }, true);
      xml += xmlBeginElement("FieldRef", { List : joins[i].alias, Name : 'Id' }, true);
      xml += xmlEndElement("Eq");

      xml += xmlEndElement("Join");
    }
   //  <FieldRef Name="Lookup_x0020_Single" RefType="Id" />
  //    <FieldRef List="APA" Name="ID" />

  xml += xmlEndElement("Joins");
}
return xml;
}

function createOrderByElement(sort) {
  var xml = "";
  if (sort.length > 0) {
    xml+=xmlBeginElement(XML_ELEMENT_ORDERBY);
    for (var i=0; i < sort.length; i++) {
      xml += xmlBeginElement(XML_FIELD_FIELDREF, {
        Name : sort[i][0],
        Type : sort[i][2] ? sort[i][2] : null,
        Ascending : !sort[i][1] ? 'False' : null
      },true);
    }
    xml+=xmlEndElement(XML_ELEMENT_ORDERBY);
  }

  return xml;
}

/**
 * 
 * https://msdn.microsoft.com/en-us/library/office/ms471093.aspx
 * @param  {[type]} statements [description]
 * @param  {[type]} sort       [description]
 * @param  {[type]} parameters [description]
 * @param  {[type]} log        [description]
 * @return {[type]}            [description]
 */
 function createQueryElement(parsedQuery, statements, sort, parameters, log) {
  var xml = "";
//console.log("PARSED", parsedQuery, parameters);
  if (statements.length > 0 || sort.length > 0) {
    xml += xmlBeginElement(XML_ELEMENT_QUERY);
    if (statements.length > 0) {
      xml += xmlBeginElement(XML_ELEMENT_WHERE);
      xml += createAndOrFromStatements(parsedQuery, statements, parameters, log);
      xml += xmlEndElement(XML_ELEMENT_WHERE);
    }
    xml += createOrderByElement(sort, parameters, log);
    // Groupby should go here?
    xml += xmlEndElement(XML_ELEMENT_QUERY);
  }
  return xml;
}

function createAndOrFromStatements(parsedQuery, items, parameters, log) {

 var xml = "";
 if (!items) return "";
 if (items.length > 1) {
   var operatorElement = items[1].operator == "and" ? "And" : "Or";
     // item 0 + 1 goes here
     xml += createStatementXml(parsedQuery, items[0], parameters, log);
     xml += createAndOrFromStatements(parsedQuery, items.slice(1), parameters, log);
     return "<"+operatorElement+">" + xml + "</"+operatorElement+">";
   } else if (items.length == 1) {
    xml += createStatementXml(parsedQuery, items[0], parameters, log);
    
  }
  return xml;
}


function createStatementXml(parsedQuery, statement, parameters, log) {
  var xml = "", param, comparison = statement.comparison, elementName;
  if (statement.type == "statement") {
    param = parameters[statement.macro];

    var simpleMappings = {'eq' : 'Eq', 'gt' : 'Gt', 'gte' : 'Geq', 'lte' : 'Leq', 'lt' : 'Lt', 'ne' : 'Neq'};

    if (typeof simpleMappings[comparison] !== "undefined") {
      if (typeof param === "undefined")
        throw "[camlsql] Parameter is not defined " +  statement.macro;
      xml+=xmlBeginElement(simpleMappings[comparison]);
      xml+=createFieldRefValue(parsedQuery, statement, param);
      xml+=xmlEndElement(simpleMappings[comparison]);
    } else if (comparison == "null") {
      xml+=xmlBeginElement(XML_ELEMENT_ISNULL);
      xml+=createFieldRefValue(parsedQuery, statement);
      xml+=xmlEndElement(XML_ELEMENT_ISNULL);
    } else if (comparison == "notnull") {
      xml+=xmlBeginElement(XML_ELEMENT_ISNOTNULL);
      xml+=createFieldRefValue(parsedQuery, statement);
      xml+=xmlEndElement(XML_ELEMENT_ISNOTNULL);
    } else if (comparison == "like") {
      if (typeof param === "undefined")
        throw "[camlsql] Parameter is not defined " +  statement.macro;
      elementName = getXmlElementForLikeStatement(param.value);
      xml+=xmlBeginElement(elementName);
      xml+=createFieldRefValue(parsedQuery, statement, param);
      xml+=xmlEndElement(elementName);
    }

  } else {
    xml += createAndOrFromStatements(parsedQuery, statement.items, parameters, log);
  }
  return xml;
}

function getXmlElementForLikeStatement(text) {
  var elementName = "Contains",
  paramValue = null;
  if (text.indexOf('%') === 0 && text[text.length-1] === "%") {
    paramValue = text.replace(/^%?|%?$/g, '');
  } else if (text.indexOf('%') === 0) {
    throw "[casql] SharePoint does not support an 'EndsWith' statement: " + text;
  } else if (text.indexOf('%') === text.length -1) {
    paramValue = text.replace(/%?$/, '');
    elementName = "BeginsWith";
  }
  return elementName;
}

function createFieldRefValue(parsedQuery, statement, parameter, isWhereClause) {
  var xml = "", LookupId = null, i, fieldName = statement.field;

  if (parameter) {
    if (parameter.lookupid) {
      LookupId = "True";
    }
  }

  if (statement.field.indexOf('.') !== -1) {
    var x = statement.field.split('.'),
    notProjected = true,
    notJoined = true;

    for (i=0; i < parsedQuery.projectedFields.length; i++) {
      if (parsedQuery.projectedFields[i].list == formatFieldName(x[0]) && parsedQuery.projectedFields[i].field == formatFieldName(x[1])) {
        fieldName = parsedQuery.projectedFields[i].name;
        notProjected = false;
      }
    }

    if (notProjected) {

      for (i=0; i < parsedQuery.joins.length; i++) {
        if (parsedQuery.joins[i].alias == x[0]) {
          notJoined = false;
          break;
        }
      }

      if (notJoined) throw "[camlsql] Unknown list alias in where clause: " + x[0];

      if (parsedQuery.fields.length == 0) {
        throw "[camlsql] The projected field '" + statement.field + "' must be explicitly included in the query";
      } else {
        fieldName = parsedQuery.uuid('camlsqlfld_');
          // Add a projected field for this one... 
          parsedQuery.projectedFields.push({
            list : x[0],
            field : x[1],
            name : fieldName
          });
          parsedQuery.fields.push(fieldName);
        }
      }


    }
    
    xml += xmlBeginElement(XML_FIELD_FIELDREF, { Name : fieldName, LookupId : LookupId }, true);

    if (parameter) {
      if (statement.comparison == "in") {
        xml = "<In>x</In>";
      } else {
        xml += creatValueElement(statement, parameter);
      }
    }
    return xml;;
  }

  function creatValueElement(statement, parameter) {
    var xml = "",
    innerXml = "",
    valueAttributes = {
      Type : parameter.type
    };

    if (parameter.type == "DateTime") {
      valueAttributes.IncludeTimeValue = parameter._includeTime ? 'True' : null;
      
      if (parameter.today === true) {
        innerXml = "<Today />";
      } else if (parameter.isNow === true) {
        innerXml = "<Now />";
      } else {
        valueAttributes.StorageTZ = parameter._storageTZ ? 'True' : null;
        if (parameter.stringValue) {
          innerXml = encodeHTML(parameter.stringValue);
        } else {
          innerXml = parameter.value.toISOString();
        }
      }
    // } else if (parameter.type == "Url") {
    //     innerXml = encodeHTML(parameter.value);
  } else if (parameter.type == "Text") {
    if (parameter.multiline == true) {
      innerXml = "<![CDATA[" + encodeHTML(parameter.value) + "]]>";
    } else {
      innerXml = encodeHTML(parameter.value);
    }
  } else if (parameter.type == "Number") {
    innerXml = parameter.value;
  } else if (parameter.type == "User") {
    if (typeof parameter.value === "number") {
      valueAttributes.Type = "Number";
      valueAttributes.LookupId = 'True';
      innerXml = encodeHTML(parameter.value + "");
    } else {
      valueAttributes.Type = "Number";
      innerXml = "<UserID />";
    } 
  } else if (parameter.type == "Lookup") {
    if (parameter.byId == true) valueAttributes.LookupId = 'True';
    innerXml = encodeHTML(parameter.value + "");
  } else if (parameter.type == "Boolean") {
    innerXml = parameter.value ? 1 : 0;
  } else {
    innerXml = xmlBeginElement('NotImplemented',{}, true);
  }

  xml += xmlBeginElement('Value', valueAttributes);
  xml += innerXml;
  xml += xmlEndElement('Value');
  return xml;
}

function createViewFieldsElement(fields) {
  var xml = "", i;
  if (fields.length > 0) {
    xml += xmlBeginElement(XML_FIELD_VIEWFIELDS);
    for (i = 0; i < fields.length; i++) {

      if (!fields[i].match(/^[a-zA-Z_\d]+$/i))
        throw "[camlsql] Invalid syntax: " + fields[i];

      xml += xmlBeginElement(XML_FIELD_FIELDREF, {Name : fields[i]}, true);
    }
    xml += xmlEndElement(XML_FIELD_VIEWFIELDS);
  }
  return xml;
}



function xmlBeginElement(name, attributes, close) {
  var xml = "<" + name,
  keys = attributes ? Object.keys(attributes) : [],
  i;

  for (i = 0; i < keys.length; i++) {
    if (typeof attributes[keys[i]] !== "undefined" && attributes[keys[i]] !== null) {
      xml += ' ' + keys[i] + '="' + encodeHTML(attributes[keys[i]]) + '"';
    }
  }

  return xml + (close?' /':'') + ">";
}

function xmlEndElement(name) {
  return "</" + name + ">";
}
  
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
    user : createUserParameter,
    boolean : createBooleanParameter,
    encode : encodeToInternalField
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
  return publicData;
}));