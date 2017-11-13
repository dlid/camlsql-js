/*! camlsqj-js v0.5.0 | (c) dlid.se | https://camlsqljs.dlid.se/license */
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
  if (typeof value === "number") {
    if (value > 0) 
      value = true;
    else if (value <= 0)
      value = false;
  }
  if (typeof value != "boolean" && typeof value !== "undefined")  {
    throw "[camlsql] Value was not boolean";
  }
  if (typeof value === "undefined") value = false;
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
  if (typeof value !== "string" && typeof value !== "number") throw "[camlsql] Value must be number or string";
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
      date = date ? new Date(+date) : new Date();
  } 

  return Object.create(CamlSqlDateParameter, {
    type : {value : 'DateTime'},
    value : {value : date, writable : true}, 
    _includeTime : {value : true, writable : true},
    today : {value : isToday, writable : true},
    _storageTZ : {value : false, writable : true},
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
  _storageTZ : false,
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

function createMembershipParameter(type, id) {

//  https://waelmohamed.wordpress.com/2013/06/10/get-tasks-assigned-to-user-or-to-current-user-groups-in-sharepoint-using-caml-query/

  var types = ['SPWeb.AllUsers', 'SPGroup', 'SPWeb.Groups', 'CurrentUserGroups', 'SPWeb.Users'],i,foundAt = null;
  if (!type) throw "Membership type should be one of " + types.join(', ');
  for (i=0; i < types.length; i++) {
    if (types[i].toLowerCase() == type.toLowerCase()){ 
      type = types[i];
      foundAt = i;
      if (type === "SPGroup" && typeof id !== "number")
        throw "[camlsql] When using SPGroup you must specify a numeric GroupID";
    }
  }
  if(foundAt === null) 
    throw "Membership type should be one of " + types.join(', ');

  return {
    type : 'Membership',
    value : type,
    id : id
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
            timeZone = null,
            listName = options.query.getListName(),
            spListItems = null,
            regionalSettings = null,
            viewXml = options && options.rawXml ? options.rawXml : options.query.getXml(true),
            nextPage,
            prevPage,
            noCallback = false,
            groupBy = options.query.$options.parsedQuery.group;


        if (typeof execCallback !== "function") execCallback = null;

        if (groupBy && options.query.$options.parsedQuery.fields.length > 0) {
            if ( options.query.$options.parsedQuery.fields.indexOf(groupBy.field)=== -1 )
                throw "[camlsql] The Grouping Field must be included in the field list";   
        }


        if (!execCallback) {
            noCallback = true;
            execCallback = function(err, rows) {
                if (typeof console !== "undefined") {
                    if (err) console.error(err);
                    if (typeof console.table !== "undefined") {
                        console.table(rows);
                    } else {
                        console.log("[camlsql] Result", rows);
                    }
                }
            }
        }

        if (typeof SP !== "undefined") {

            SP.SOD.executeFunc('sp.js', 'SP.ClientContext', function () {});
            SP.SOD.executeOrDelayUntilScriptLoaded(function() {


                console.warn("GET SERVER TIMEZOE", _spPageContextInfo.webServerRelativeUrl + "/_api/web/RegionalSettings/TimeZone");


                ajaxGet(_spPageContextInfo.webServerRelativeUrl + "/_api/web/RegionalSettings/TimeZone", function(e,r) {
                    console.warn("TZ INFO", e, r);
                });

                clientContext = SP.ClientContext.get_current();
                if (spWeb !== null) {
                    if (typeof spWeb === "string") {
                        spWeb = site.openWeb(spWeb);
                    }
                } 

                if (!spWeb) spWeb = clientContext.get_web();;
                    
                // regionalSettings = spWeb.get_regionalSettings();
                spList = spWeb.get_lists().getByTitle(listName);
                // timeZone = regionalSettings.get_timeZone();
                if (noCallback && console) console.log("[camlsql] Loading list '" + listName + "'"); 
                clientContext.load(spList);
                // clientContext.load(regionalSettings);
                // clientContext.load(timeZone);
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

            },"sp.js");

        } else {
            if (noCallback) {
                if (typeof console !== "undefined") {
                    console.log("[camlsql] ViewXML:", options.query.getXml(true));
                }
            }
            if (execCallback == null) {
                // Output xml and info?
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
            camlQuery.set_datesInUtc(false);
            var camlQueryString = options.query.getXml(true);
            camlQuery.set_viewXml(camlQueryString);
            spListItems = spList.getItems(camlQuery);
            if (noCallback && console) console.log("[camlsql] Executing SP.CamlQuery", camlQueryString); 
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

            var listItemCollectionPosition = spListItems.get_listItemCollectionPosition(),
                values, field, groupByValue,
                groupIndexes = {};

            if (listItemCollectionPosition) {
                nextPage = listItemCollectionPosition.get_pagingInfo();
            }

            // var info = timeZone.get_information();
            // var offset = (info.get_bias() /*+ (info.get_daylightBias() )*/) / 60.0;
            // console.log("TIMEZONE offset", info.get_bias(), info.get_daylightBias(), offset);

            while (listItemEnumerator.moveNext()) {
                spListItem = listItemEnumerator.get_current();
                values = spListItem.get_fieldValues();
                if (!prevPage) {
                    prevPage = "PagedPrev=TRUE&Paged=TRUE&p_ID=" + encodeURIComponent(spListItem.get_id());
                }

                for(var k in values) {
                    if (values[k] && typeof values[k].getTimezoneOffset == "function") {
                        if (k == "DateTime_x0020_field") {
                           // var o = (values[k].getTimezoneOffset() / 60) * -1 ;
                            // var d = new Date(values[k].getTime() - ((offset ) * 3600 * 1000));
                            // console.log(k, "is a date", values[k], values[k].getUTCFullYear(), values[k].getUTCMonth(), values[k].getUTCDate(), values[k].getUTCHours(), values[k].getUTCMinutes(), values[k].getUTCSeconds() );
                            // console.log(d, "is a date2", d, d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds() );
                        }
                    }
                }

                if (groupBy) {
                    field = groupBy.field;
                    if (values[field] === null) {
                        groupByValue = null;
                    } else if (typeof values[field] === "object" && typeof values[field].toString !== "undefined") {
                        if (typeof values[field].get_lookupValue === "function") {
                            groupByValue = values[field].get_lookupValue();
                        } else {
                            groupByValue = values[field].toString();
                        }
                    } else {
                        groupByValue = values[field];
                    }

                    if (typeof groupIndexes[groupByValue] === "undefined") {
                        items.push({
                            groupName : groupByValue,
                            items : [values]
                        });
                        groupIndexes[groupByValue] = items.length -1;
                    } else {
                        items[groupIndexes[groupByValue]].items.push(values);
                    }
                } else {

                    items.push(values);
                }
            }
            execCallback(null, items, {
                nextPage : nextPage,
                prevPage : prevPage
            });
        }
    }


    function ajaxGet(url, callback) {

    var xhr = new XMLHttpRequest();
        xhr.open('GET', url);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.setRequestHeader('Accept', 'application/json; odata=verbose');
        xhr.onload = function() {
            if (xhr.status === 200) {
                callback(null, xhr.responseText)
            } else {
                callback(xhr, null);
            }
        };
        xhr.send();

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
  } else if( c== '(') {
   n += "_x0028_";
  } else if( c== ')') {
   n += "_x0029_";
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
 return trim(name).replace(/^[\[\(]|[\]\)]$/g, '');
}

/**
 * Trim away extra parenthesis around a string
 *
 *  '(hello world)' => hello world
 *  'hi (and everything)' => hi (and everything)
 *  '((field1 = 2) and field2 = 3)' => (field1 = 2) and field2 = 3
 * @param  {[type]} str [description]
 * @return {[type]}     [description]
 */
 function trimParanthesis(str) {
    var i=0, pIndex = -1, op = 0;
    str = trim(str);
    if (str.length > 1) {
        if (str[0] == "(" && str[str.length-1] == ")") {
            for (i=0; i < str.length; i++) {
                if (str[i] == "(") {
                    op ++;
                } else if (str[i] == ")") {
                    op --;
                    if (op == 0 && i == str.length-1) {
                        return trimParanthesis(str.substring(1, str.length-1));
                    } else if (op==0) {
                        break;
                    }
                }
            }
        } 
    }
    return str;
 }
function CamlSqlQuery(query, param) {
    
    var currentQuery = this,
        parameters = parseParameters(param),
        _spWeb = null;

    this.spWeb = function(spWeb) {
      _spWeb = spWeb;
      return this;
    };

    this.exec = function(execCallback) {
      var args = Array.prototype.slice.call(arguments),
          result;

      executeSPQuery({
        query : this,
        callback : execCallback,
        spWeb : _spWeb,
        rawXml : null
      });

      return this;
    };
    
    function getXml(isExec) {
      var builder = new CamlXmlBuilder(currentQuery, isExec);
      return builder.xml;
    }

    function getListName() {
      var parsed = currentQuery.$options.parsedQuery;
      if (parsed.listName && parsed.encoded[parsed.listName])
        return parsed.encoded[parsed.listName];
      return parsed.listName;
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
 } else if (typeof parameter.getMonth === 'function') {
    ret = createDateTimeParameter(parameter);
 } else if (typeof parameter == "object" && parameter.type !== "undefined") {
   return parameter;
 }
 return ret;
}
/**
 * Parse the GROUP BY string
 */
function extractGroupByPart(workingObject, quiet) {
    var groupByString,
        m,
        query = workingObject.query,
        re = new RegExp("([a-zA-Z_\\d]+?)(\\s|$)", "ig");
      if ((m = query.match(/\sGROUP\sBY\s+([a-zA-Z_\d]+?)(\s+|$)/i))) {
        workingObject.query =  query.substr(0, m.index) + " " + query.substr(m.index + m[0].length) + m[2] ;
        workingObject.group = {
            field : formatFieldName(m[1]),
            collapse : false
        }
      }
} 

function extractJoinPart(workingObject) {
  var query = workingObject.query,
      joins = [],
      listName,
      t, 
      i,
      m; 
 
      do {
        m = query.match(/\s+(left\s+|)join\s+(.+?)\s+on\s+(.+?)(\s|$)/i);
        if (m) {
            if (m[3].indexOf('.') === -1)
              throw "[camlsql] You must specify the List Name when joining: JOIN [ListAlias] ON [List].[Field]";

            t = m[3].split('.');
            if (!t[0].match(/^[a-z\d_]+$/i)) {
              throw "[camlsql] Wrap list alias in brackets if it contains special characters: " + t[0] ;
            }

            if (!m[2].match(/^[a-z\d_]+$/i)) {
              throw "[camlsql] Wrap list alias in brackets if it contains special characters: " + m[2] ;
            }

            //console.warn("join list", m[2]);

            joins.push({
              inner : trim(m[1]) == "",
              alias : formatFieldName(m[2]),
              childTable : t[0],
              childField : t[1]
            });
            query = query.substr(0, m.index) + " " + query.substr(m.index + m[0].length) + m[4];
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
  if ((match = workingObject.query.match(/\sLIMIT\s+(.*?)(\s.*$|$)/i))) {
    if (!match[1].match(/^\d+$/))
      throw "[camlsql] LIMIT value must be a number";
    if (match[1] == "0")
      throw "[camlsql] LIMIT value can not be 0";
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
      m = query.match(/^SELECT\s(.*?)(?:\sFROM\s(.*?)|)(?:\s+((?:order|group|where).*)$|$)/i);

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
          throw "[camlsql] Projected fields in the format <list>.<field_name> must be followed with an AS <alias>";
        } 
      }
      workingObject.fields = fields;
      workingObject.listName = formatFieldName(m[2]);

      if (!workingObject.listName.match(/^[a-z\d_]+$/i)) {
        throw "[camlsql] Wrap list name in brackets if it contains special characters: [" + workingObject.listName + "]";
      }

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

      if ((m = query.match(/\sORDER\sBY\s+(.*?)$/i))) {
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
    projectedFields : [],
    group : null,
    encoded : {} // Contains a list of encoded values so they can be decoded later
  },
  where;

  // The extract-parts functions will update the working object accordingly
  extractNamesToEncode(workingObject);
  extractScopePart(workingObject);
  extractLimitPart(workingObject);
  extractOrderByPart(workingObject);
  extractGroupByPart(workingObject);
  extractJoinPart(workingObject);
  extractListAndFieldNameParts(workingObject);


  // Parse the remaining part of the query - the WHERE statement
  where = WhereParser(workingObject.query);
  workingObject.statements = where.statements;
  workingObject.macros = where.macros;

  // Reset to the original query
  workingObject.query = query;

  // console.log("query", workingObject);

  return workingObject;
}

/**
 * This will look for text within [ and ] and encode it using the camlsql.encode method
 * @param  {[type]} workingObject [description]
 * @return {[type]}               [description]
 */
function extractNamesToEncode(workingObject) {
  var query = workingObject.query,i,counter = 0,startIndex = null,
      match, encoded, normalized,
      newQuery = query;

  for (i=0; i < query.length; i++) {
    if (query[i] == "[") {
      counter++;
      if (startIndex === null) startIndex = i;
    } else if (query[i] == "]") {
      counter--;
      if (counter == 0) {
        match = query.substring( startIndex, i+1 );
        normalized = match.substring(1, match.length-1),
        encoded = encodeToInternalField(normalized);
        newQuery = newQuery.replace(match, encoded);
        startIndex = null;
        workingObject.encoded[encoded] = match.substring(1, match.length-1);
      }
    }
  }
  workingObject.query = newQuery;
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

        function parse_blocks(str, level) {
            var i,
                blockStartIndex = null,
                blockStopIndex = null,
                blocks = [],
                startCount = 0,
                op,
                sp,
                childBlocks,
                statements,
                j,s,p,newBlocks,si,
                prevBlockEnd = null;
                
            str = trimParanthesis(str);
                
            level = level ? level : 0;
            for (i=0; i < str.length; i++) {

                if (str[i] == blockOpen) {
                    if (startCount == 0) {
                        //console.warn("Block start@", i, str.substr(i));
                        if (i > 0 && blocks.length == 0) {
                           //console.warn("addx start@", 0, i);
                           blocks.push(str.substring(0, i));
                        } else if (prevBlockEnd != null) {
                            blocks.push(str.substring(prevBlockEnd, i));
                        }
                        blockStartIndex = i;
                        blockStopIndex = null;
                    } 
                    startCount++;
                } else if (str[i] == blockClose && blockStartIndex !== null) {
                    startCount--;
                    if(startCount == 0) {
                        si = blockStartIndex;
                        if (prevBlockEnd !== null) {
                            //si = prevBlockEnd;
                            if (prevBlockEnd < i - 1) {
                                //console.warn("yo", str.substring(prevBlockEnd, i))
                                //blocks.push(str.substring(prevBlockEnd, i));
                            }

                        }

                       /// console.warn("end_add@", i, str.substring(blockStartIndex, i+1 ));
                        blocks.push(trim(str.substring(blockStartIndex, i+1 )).replace(/^\(|\)$/g,''));
                        blockStopIndex = i+1;
                        prevBlockEnd = i+1;
                        blockStartIndex = null;

                    }
                }
            }
            //console.log("parse_blocks"+level+"==", blocks);
            if (blockStopIndex != null && blockStartIndex == null) {
                if (trim(str.substring(blockStopIndex))) {
                    blocks.push(trim(str.substring(blockStopIndex)));
                }
            } else if (blockStartIndex != null) {
                //console.log("ADDx", blockStartIndex);
               // blocks.push(trim(str.substring(blockStopIndex)));
            } else if (blocks.length == 0 && blockStartIndex == null && blockStopIndex == null) {
                blocks.push(trim(str));
            }

           // console.log("parse_blocks"+level+" ==", blocks);
           // return;


            for (i=0; i < blocks.length; i++) {

                op = 'and';
                // Determine operator for "i"

                if (blocks[i].match(/^\s*(\|\||(or))\s*/i)) {
                   // console.warn("FOUND AN OR ", blocks[i]);
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
                    
                    childBlocks = parse_blocks(blocks[i].value, level+1);
                    //console.log("childBlocks", childBlocks.length);
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
                            s.field = formatFieldName(p.field);
                            s.macro = p.macro;
                            s.comparison = p.comparison;
                            statements.push(s);
                        } else {
                            if(!quiet) throw "[camlsql] Could not parse statement: " +sp[j];
                        }
                    }
                    if (statements.length > 1) {
                        blocks[i].type = 'group';
                        blocks[i].items = statements;
                    } else if (statements.length == 1) {
                        blocks[i].field = formatFieldName(statements[0].field);
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

            str = str.replace(/ is\s+not\s+null/i, ' cxqlisnotnull ?');
            str = str.replace(/ is\s+null/i, ' cxqlisnull ?');

            var m = str.match(/([a-zA-Z_\d\.]+)\s*(<>|>=|[^<]>|<=|<[^>]|=|\slike|\scxqlisnull|\scxqlisnotnull|in)\s*(\?|@[a-z0-9_]+)/i);
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
                if (cmpMatch.toLowerCase() == 'cxqlisnull') comparison = "null";
                if (cmpMatch.toLowerCase() == 'cxqlisnotnull') comparison = "notnull";
                if (cmpMatch.toLowerCase() == 'in') comparison = "in";

                if (comparison != "cxqlisnull" && comparison != "cxqlisnotnull") {
                    _parameters++; 
                    _numMacros++;
                    if (prevMacro == null) 
                        prevMacro = m[3][0];
                    else if (prevMacro != m[3][0]) {
                        throw "[camlsql] You can not mix named macros and ?";
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

function CamlXmlBuilder(query, isExec) {
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

  viewXml += createQueryElement(parsedQuery, parsedQuery.statements, parsedQuery.sort, parameters, isExec, log);
  viewXml += createJoinElement(parsedQuery, parsedQuery.listName, parsedQuery.joins);
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

function createGroupByElement(parsedQuery) {
  var xml  ="";
  if (parsedQuery.group) {
    xml += xmlBeginElement("GroupBy", {
      Collapse : parsedQuery.group.collapse ? 'True' : null
    });
    xml += xmlBeginElement('FieldRef', { 
      Name : parsedQuery.group.field
     },true);
    xml += xmlEndElement("GroupBy");
  }
  return xml;

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

function createJoinElement(parsedQuery, listName, joins) {
  var xml = "",i,childTableName;
  if (joins.length > 0) {
    xml += xmlBeginElement("Joins");

    for (i = 0; i < joins.length; i++) {
      xml += xmlBeginElement("Join", {ListAlias : joins[i].alias});

      childTableName = joins[i].childTable;
      // if (childTableName) {
      //   if (parsedQuery.encoded[childTableName]) {
      //     childTableName = "x" + parsedQuery.encoded[childTableName];
      //   }
      // }

      xml += xmlBeginElement("Eq");
      xml += xmlBeginElement("FieldRef", { 
        List : joins[i].childTable != listName ? childTableName : null,
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
 function createQueryElement(parsedQuery, statements, sort, parameters, isExec, log) {
  var xml = "";
//console.log("PARSED", parsedQuery, parameters);
  if (statements.length > 0 || sort.length > 0 || (parsedQuery.group && !isExec)) {
    xml += xmlBeginElement(XML_ELEMENT_QUERY);
    if (statements.length > 0) {
      xml += xmlBeginElement(XML_ELEMENT_WHERE);
      xml += createAndOrFromStatements(parsedQuery, statements, parameters, log);
      xml += xmlEndElement(XML_ELEMENT_WHERE);
    }
    xml += createOrderByElement(sort, parameters, log);
    if (!isExec) {
      xml += createGroupByElement(parsedQuery);
    }
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

      if (param && param.type == "Membership") {
        if (statement.comparison != "eq") throw "[camlsql] Membership comparison must be =";
        if (param.value.toLowerCase() == "spgroup" && !param.id)
          throw "[camlsql] Membership of type SPGroup requires a group id";
        xml += xmlBeginElement("Membership", {Type : param.value, ID : param.id ? param.id : null});
        xml += xmlBeginElement(XML_FIELD_FIELDREF, {Name : statement.field}, true);
        xml += xmlEndElement("Membership");
      } else {
        xml+=xmlBeginElement(simpleMappings[comparison]);
        xml+=createFieldRefValue(parsedQuery, statement, param);
        xml+=xmlEndElement(simpleMappings[comparison]);
      }
    } else if (comparison == "null") {
      xml+=xmlBeginElement(XML_ELEMENT_ISNULL);
      xml+=createFieldRefValue(parsedQuery, statement);
      xml+=xmlEndElement(XML_ELEMENT_ISNULL);
    } else if (comparison == "in") {
      xml+=xmlBeginElement("In");
      xml+=createFieldRefValue(parsedQuery, statement,param);
      xml+=xmlEndElement("In");
    } else if (comparison == "notnull") {
      xml+=xmlBeginElement(XML_ELEMENT_ISNOTNULL);
      xml+=createFieldRefValue(parsedQuery, statement);
      xml+=xmlEndElement(XML_ELEMENT_ISNOTNULL);
    } else if (comparison == "like") {
      if (typeof param === "undefined")
        throw "[camlsql] Parameter is not defined " +  statement.macro;
      var x = getXmlElementForLikeStatement(param.value);
      //console.log("statement", statement);
      //console.log("parameters", parameters);
      //console.warn("X", param);
      elementName = x[1];
      param.overrideValue =  x[0];

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
  paramValue = text;
  if(!text) return [text, elementName];
  if (text.indexOf('%') === 0 && text[text.length-1] === "%") {
    paramValue = text.replace(/^%?|%?$/g, '');
  } else if (text.indexOf('%') === 0) {
    throw "[camlsql] SharePoint does not support an 'EndsWith' statement: " + text;
  } else if (text.indexOf('%') === text.length -1) {
    paramValue = text.replace(/%?$/, '');
    elementName = "BeginsWith";
  }
  return [paramValue, elementName];
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

    if (formatFieldName(x[0]) == parsedQuery.listName) {
      fieldName = x[1];
    } else { 

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
    }
    
    xml += xmlBeginElement(XML_FIELD_FIELDREF, { Name : fieldName, LookupId : LookupId }, true);
    if (parameter) {
      if (statement.comparison == "in") {
        if (!parameter || parameter.constructor !== Array)
          throw "[camlsql] IN parameter must be an array";
       xml += '<Values>';
       for (var i=0; i < parameter.length; i++) {
         xml += creatValueElement(statement, parameter[i], parameter[i].value);      
       }
       xml += '</Values>';
      } else {
        xml += creatValueElement(statement, parameter);
      }
    }
    return xml;;
  }

  function creatValueElement(statement, parameter) {
    var xml = "",
    innerXml = "",
    vAttr = {},
    valueAttributes = {
      Type : parameter.type
    },
    parameterValue = parameter.overrideValue ? parameter.overrideValue : parameter.value;

    if (parameter.type == "DateTime") {
      valueAttributes.IncludeTimeValue = parameter._includeTime ? 'True' : null;
      
      if (parameter.value) {
        vAttr.Offset = parameterValue;
  //        xml += ' OffsetDays="' + paramValue + '"';
  //      }
}
      if (parameter.today === true) {
        innerXml = xmlBeginElement('Today', vAttr, true);
      } else if (parameter.isNow === true) {
        innerXml = "<Now />";
      } else {
        valueAttributes.StorageTZ = parameter._storageTZ ? 'True' : null;
        if (parameter.stringValue) {
          innerXml = encodeHTML(parameter.stringValue);
        } else {
          if (parameter._storageTZ) {
            innerXml = parameterValue.toISOString();
          } else {
            // IF we do not compare to the internal TZ value, then use the non UTC time
            innerXml = parameterValue.getFullYear() + "-" + padString(parameterValue.getMonth()+1) + "-" + padString(parameterValue.getDate()) + "T" + padString(parameterValue.getHours()) + ":" + padString(parameterValue.getMinutes()) + ":" + padString(parameterValue.getSeconds());
          }
        }
      }
    // } else if (parameter.type == "Url") {
    //     innerXml = encodeHTML(parameterValue);
  } else if (parameter.type == "Text") {
    if (parameter.multiline == true) {
      innerXml = "<![CDATA[" + encodeHTML(parameterValue) + "]]>";
    } else {
      innerXml = encodeHTML(parameterValue);
    }
  } else if (parameter.type == "Number" || parameter.type == "Guid") {
    innerXml = parameterValue;
  } else if (parameter.type == "User") {
    if (typeof parameterValue === "number") {
      valueAttributes.Type = "User";
      innerXml = encodeHTML(parameterValue + "");
    } else {
      valueAttributes.Type = "Number";
      innerXml = "<UserID />";
    } 
  } else if (parameter.type == "Lookup") {
    if (parameter.byId == true) valueAttributes.LookupId = 'True';
    innerXml = encodeHTML(parameterValue + "");
  } else if (parameter.type == "Boolean") {
    innerXml = parameterValue ? 1 : 0;

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
    boolean : createBooleanParameter,
    date : createDateParameter,
    datetime : createDateTimeParameter,
    encode : encodeToInternalField,
    membership : createMembershipParameter,
    number : createNumberParameter,
    guid : createGuidParameter,
    text : createTextParameter,
    today : createTodayParameter,
    user : createUserParameter
  }; 
  
  return publicData;
}));