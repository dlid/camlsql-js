function normalizeExpiration(val) {
  var msToAdd = 0,
      m,
      val = val + "",
      seconds;

  if (val.match(/^\d+$/)) {
    // Number only. Default to days
    msToAdd = (((parseInt(val, 10) * 24) * 60) * 60) * 1000;  
  } else if (m = val.match(/^(\d+) (month|day|hour|minute|second|ms|millisecond)s?$/)) {
  val = parseInt(val, 10);
  switch (m[2]) {
    case "month": seconds = (((24 * 60) * 60) * 30) * val; break;
    case "day": seconds = (((val * 24) * 60) * 60); break;
    case "hour": seconds = ((val * 60) * 60); break;
    case "minute": seconds = (val * 60); break;
    case "second": seconds = val; break;
    case "ms": case "millisecond": seconds = val / 1000; break;
  }
  if (seconds) msToAdd = seconds * 1000;
}

if (msToAdd > 0) {
  return new Date((new Date()).getTime() + msToAdd);
}

return null;
}