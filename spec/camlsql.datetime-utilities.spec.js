/**
 * Tests of the padString method
 */
var camlsql = require("../dist/public_html/js/camlsql.js");

describe("camlsql.datetime", function() {

  it("No parameter => today", function() {
    
    var result = camlsql.datetime();
    expect(result.type).toEqual("DateTime");
    expect(result.today).toEqual(true);
    expect(result._includeTime).toEqual(true);

  });

  it("getIntervalStringAsMs (1 minute)", function() {
    var result = camlsql.__testonly__.getIntervalStringAsMs("1 minute");
    expect(result).toEqual(60000);
  });

  it("getIntervalStringAsMs (13 minutes)", function() {
    var result = camlsql.__testonly__.getIntervalStringAsMs("13 minutes");
    expect(result).toEqual(780000);
  });

    it("getIntervalStringAsMs (1 hour)", function() {
    var result = camlsql.__testonly__.getIntervalStringAsMs("1 hour");
    expect(result).toEqual(3600000);
  });

  it("getIntervalStringAsMs (6 hours)", function() {
    var result = camlsql.__testonly__.getIntervalStringAsMs("6 hours");
    expect(result).toEqual(21600000);
  });

  it("getIntervalStringAsMs (1 second)", function() {
    var result = camlsql.__testonly__.getIntervalStringAsMs("1 second");
    expect(result).toEqual(1000);
  });

  it("getIntervalStringAsMs (131 seconds)", function() {
    var result = camlsql.__testonly__.getIntervalStringAsMs("131 seconds");
    expect(result).toEqual(131000);
  });

  it("getIntervalStringAsMs (1 day)", function() {
    var result = camlsql.__testonly__.getIntervalStringAsMs("1 day");
    expect(result).toEqual(86400000);
  });

  it("getIntervalStringAsMs (3 days)", function() {
    var result = camlsql.__testonly__.getIntervalStringAsMs("3 days");
    expect(result).toEqual(259200000);
  });

  it("getIntervalStringAsMs (3 days)", function() {
    var result = camlsql.__testonly__.getIntervalStringAsMs("3 days");
    expect(result).toEqual(259200000);
  });

  it("getIntervalStringAsMs (500 ms)", function() {
    var result = camlsql.__testonly__.getIntervalStringAsMs("500 ms");
    expect(result).toEqual(500);
  });

  it("getIntervalStringAsMs (1500 milliseconds)", function() {
    var result = camlsql.__testonly__.getIntervalStringAsMs("1500 milliseconds");
    expect(result).toEqual(1500);
  });

  it("getIntervalStringAsMs unknown string", function() {
      expect(function() {
      camlsql.__testonly__.getIntervalStringAsMs("infinity");
    }).toThrow("[camlsql] Interval string was not recognized: infinity");
  });

  it("getIntervalStringAsMs not a string", function() {
      expect(function() {
      camlsql.__testonly__.getIntervalStringAsMs(5);
    }).toThrow("[camlsql] Interval value must be a string");
  });


  it("getDateFromTextualRepresentation month start", function() {
    var date = camlsql.__testonly__.getDateFromTextualRepresentation("month start", new Date(1980, 03, 04))
    expect(date.toDateString()).toEqual("Tue Apr 01 1980");
    expect(date.toTimeString().substr(0,8)).toEqual("00:00:00");
  });

   it("getDateFromTextualRepresentation day start", function() {
    var date = camlsql.__testonly__.getDateFromTextualRepresentation("day start", new Date(1980, 03, 04, 13, 13))
    expect(date.toDateString()).toEqual("Fri Apr 04 1980");
    expect(date.toTimeString().substr(0,8)).toEqual("00:00:00");
  });

   it("getDateFromTextualRepresentation day end", function() {
    var date = camlsql.__testonly__.getDateFromTextualRepresentation("day end", new Date(1980, 03, 02, 13, 13))
    expect(date.toDateString()).toEqual("Wed Apr 02 1980");
    expect(date.toTimeString().substr(0,8)).toEqual("23:59:59");
  });


  it("getDateFromTextualRepresentation month end", function() {
    var date = camlsql.__testonly__.getDateFromTextualRepresentation("month end", new Date(1980, 03, 04))
    expect(date.toDateString()).toEqual("Wed Apr 30 1980");
    expect(date.toTimeString().substr(0,8)).toEqual("23:59:59");
  });


  it("getDateFromTextualRepresentation month end leap year", function() {
    var date = camlsql.__testonly__.getDateFromTextualRepresentation("month end", new Date(1980, 01, 04))
    expect(date.toDateString()).toEqual("Fri Feb 29 1980");
    expect(date.toTimeString().substr(0,8)).toEqual("23:59:59");
  });

  it("getDateFromTextualRepresentation week start (monday)", function() {
    var date = camlsql.__testonly__.getDateFromTextualRepresentation("week start monday", new Date(1980, 3, 4))
    expect(date.toDateString()).toEqual("Mon Mar 31 1980");
    expect(date.toTimeString().substr(0,8)).toEqual("00:00:00");
  });

   it("getDateFromTextualRepresentation week start (sunday)", function() {
    var date = camlsql.__testonly__.getDateFromTextualRepresentation("week start", new Date(1980, 3, 4))
    expect(date.toDateString()).toEqual("Sun Mar 30 1980");
    expect(date.toTimeString().substr(0,8)).toEqual("00:00:00");
  });



  // var d = camlsql.__testonly__.getDateFromTextualRepresentation("week start", new Date(1980, 03, 04)); d
  // supposed to be 31st 00:00:00 but returns
  // Sun Mar 30 1980 00:00:00 GMT+0100 (Central Europe Standard Time)
  // same with week end
  // var d = camlsql.__testonly__.getDateFromTextualRepresentation("week end", new Date(1980, 03, 04)); d

  


}); 