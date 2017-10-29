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

  it("getIntervalStringAsMs (1 month)", function() {
    var result = camlsql.__testonly__.getIntervalStringAsMs("1 month");
    expect(result).toEqual(2592000000);
  });

  it("getIntervalStringAsMs (3 months)", function() {
    var result = camlsql.__testonly__.getIntervalStringAsMs("3 months");
    expect(result).toEqual(2592000000 * 3);
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




}); 