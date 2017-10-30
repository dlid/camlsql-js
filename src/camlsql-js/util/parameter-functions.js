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
    return this;
  },
  sub : function(intervalString){
    this.errstr();
    var diff = getIntervalStringAsMs(intervalString)
    this.value = new Date( this.value.getTime() - diff );
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
