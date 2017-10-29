


function createDateWithIntervalString(val) {
  var msToAdd = getIntervalStringAsMs(val);
  console.log("add", msToAdd);
  console.log(msToAdd, (new Date().getTime()));
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