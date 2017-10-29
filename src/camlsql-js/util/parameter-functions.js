/**
 * Helper functions for parameters
 */

 function createTextParameter(value) {
  if (typeof value !== "string" && typeof value !== "undefined") {
    throw "[camlsql] Value was not a string";
  }
  value = typeof value !== "undefined" && value != null && typeof value == "string" ? value : "";
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
