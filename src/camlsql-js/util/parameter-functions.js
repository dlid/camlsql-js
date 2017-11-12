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
