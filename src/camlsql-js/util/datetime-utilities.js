


function createDateWithIntervalString(val) {
  var msToAdd = getIntervalStringAsMs(val);
  return new Date((new Date()).getTime() + msToAdd);
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

function getDateFromTextualRepresentation(text) {
  var date, date2, value;
  text = trim(text.toLowerCase());
  date= new Date();
  if (text == "month start") {
    value = date.getFullYear() + "-" + padString(date.getMonth()+ 1) + "-01T00:00:00Z";
  } else if (text == "month end") {
    date2 = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    value = date2.getFullYear() + "-" + padString(date2.getMonth()+1) + "-" + padString(date2.getDate()) + "T23:59:59Z";
  } else if (text == "week start") {
    date2 = getStartOfWeek(new Date());
    value = date2.getFullYear() + "-" + padString(date2.getMonth()+1) + "-" + padString(date2.getDate()) + "T00:00:00Z";
  } else if (text == "week start monday") {
    date2 = getStartOfWeek(new Date(), true);
    value = date2.getFullYear() + "-" + padString(date2.getMonth()+1) + "-" + padString(date2.getDate()) + "T00:00:00Z";
  }
  return value;

}

function getStartOfWeek(date, startWeekWithMonday) {
  startWeekWithMonday = startWeekWithMonday ? true : false;

  // Copy date if provided, or use current date if not
  date = date? new Date(+date) : new Date();
  date.setHours(0,0,0,0);
  
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