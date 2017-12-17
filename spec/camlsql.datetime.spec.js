/**
 * Tests of the padString method
 */
var camlsql = require("../dist/public_html/js/camlsql.js");

describe("camlsql.datetime", function() {

  it("camlsql.datetime(new Date()).startOfMonth()", function() {
    var bbPremierDate = new Date(2008, 0, 20, 18, 30, 0),
        expectedDate = new Date(2008, 0, 1, 0,0,0,0),
        dateValue = camlsql.datetime(bbPremierDate).startOfMonth().value;
    expect(dateValue.toISOString()).toEqual(expectedDate.toISOString());
  });

  it("camlsql.datetime(new Date()).endOfMonth()", function() {
    var bbPremierDate = new Date(2008, 0, 20, 18, 30, 0),
        expectedDate = new Date(2008, 0, 31, 23, 59, 59, 999),
        dateValue = camlsql.datetime(bbPremierDate).endOfMonth().value;
    expect(dateValue.toISOString()).toEqual(expectedDate.toISOString());
  });

  it("camlsql.datetime(new Date()).startOfDay()", function() {
    var bbPremierDate = new Date(2008, 0, 20, 18, 30, 0),
        expectedDate = new Date(2008, 0, 20, 0, 0, 0),
        dateValue = camlsql.datetime(bbPremierDate).startOfDay().value;
    expect(dateValue.toISOString()).toEqual(expectedDate.toISOString());
  });

  it("camlsql.datetime(new Date()).endOfday()", function() {
    var bbPremierDate = new Date(2008, 0, 20, 18, 30, 0),
        expectedDate = new Date(2008, 0, 20, 23, 59, 59, 999);
    var dateValue = camlsql.datetime(bbPremierDate).endOfDay().value;
    expect(dateValue.toISOString()).toEqual(expectedDate.toISOString());
  });

  it("camlsql.datetime(new Date()).startOfweek()", function() {
    var bbPremierDate = new Date(2008, 0, 20, 18, 30, 0),
        expectedDate = new Date(2008, 0, 14, 0, 0, 0);
    var dateValue = camlsql.datetime(bbPremierDate).startOfWeek().value;
    expect(dateValue.toISOString()).toEqual(expectedDate.toISOString());
  });

  it("camlsql.datetime(new Date()).endOfweek()", function() {
    var bbPremierDate = new Date(2008, 0, 20, 18, 30, 0),
        expectedDate = new Date(2008, 0, 20, 23, 59, 59,999);
    var dateValue = camlsql.datetime(bbPremierDate).endOfWeek().value;
    expect(dateValue.toISOString()).toEqual(expectedDate.toISOString());
  });

  it("camlsql.datetime(new Date()).startOfweek(sunday)", function() {
    var bbPremierDate = new Date(2008, 0, 20, 18, 30, 0),
        expectedDate = new Date(2008, 0, 20, 0, 0, 0);
    var dateValue = camlsql.datetime(bbPremierDate).startOfWeek(true).value;
    expect(dateValue.toISOString()).toEqual(expectedDate.toISOString());
  });

  it("camlsql.datetime(new Date()).endOfweek(sunday)", function() {
    var bbPremierDate = new Date(2008, 0, 20, 18, 30, 0),
        expectedDate = new Date(2008, 0, 26, 23, 59, 59,999);
    var dateValue = camlsql.datetime(bbPremierDate).endOfWeek(true).value;
    expect(dateValue.toISOString()).toEqual(expectedDate.toISOString());
  });

  it("camlsql.datetime(new Date()).add('1 day')", function() {
    var bbPremierDate = new Date(2008, 0, 20, 18, 30, 0),
        expectedDate = new Date(2008, 0, 21, 18, 30, 0);
    var dateValue = camlsql.datetime(bbPremierDate).add('1 day').value;
    expect(dateValue.toISOString()).toEqual(expectedDate.toISOString());
  });

  it("camlsql.datetime(new Date()).add('1 day').add('30 minutes')", function() {
    var bbPremierDate = new Date(2008, 0, 20, 18, 30, 0),
        expectedDate = new Date(2008, 0, 21, 19, 0, 0);
    var dateValue = camlsql.datetime(bbPremierDate).add('1 day').add('30 minutes').value;
    expect(dateValue.toISOString()).toEqual(expectedDate.toISOString());
  });

  it("camlsql.datetime(new Date()).add('1 day').sub('30 minutes')", function() {
    var bbPremierDate = new Date(2008, 0, 20, 18, 30, 0),
        expectedDate = new Date(2008, 0, 21, 18, 0, 0);
    var dateValue = camlsql.datetime(bbPremierDate).add('1 day').sub('30 minutes').value;
    expect(dateValue.toISOString()).toEqual(expectedDate.toISOString());
  });

  it("camlsql.datetime(new Date()).add('1 hour')", function() {
    var bbPremierDate = new Date(2008, 0, 20, 18, 30, 0),
        expectedDate = new Date(2008, 0, 20, 19, 30, 0);
    var dateValue = camlsql.datetime(bbPremierDate).add('1 hour').value;
    expect(dateValue.toISOString()).toEqual(expectedDate.toISOString());
  });

  it("camlsql.datetime(new Date()).add('30 ms')", function() {
    var bbPremierDate = new Date(2008, 0, 20, 18, 30, 0),
        expectedDate = new Date(2008, 0, 20, 18, 30, 0, 30);
    var dateValue = camlsql.datetime(bbPremierDate).add('30 ms').value;
    expect(dateValue.toISOString()).toEqual(expectedDate.toISOString());
  });

  it("camlsql.datetime(new Date()).sub('30 ms')", function() {
    var bbPremierDate = new Date(2008, 0, 20, 18, 30, 0),
        expectedDate = new Date(2008, 0, 20, 18, 29, 59, 970);
    var dateValue = camlsql.datetime(bbPremierDate).sub('30 ms').value;
    expect(dateValue.toISOString()).toEqual(expectedDate.toISOString());
  });

  it("camlsql.datetime(new Date()).sub('2 hours')", function() {
    var bbPremierDate = new Date(2008, 0, 20, 18, 30, 0),
        expectedDate = new Date(2008, 0, 20, 16, 30,0,0);
    var dateValue = camlsql.datetime(bbPremierDate).sub('2 hours').value;
    expect(dateValue.toISOString()).toEqual(expectedDate.toISOString());
  });

  it("camlsql.datetime(new Date()).sub('3 days')", function() {
    var bbPremierDate = new Date(2008, 0, 20, 18, 30, 0),
        expectedDate = new Date(2008, 0, 17, 18, 30,0,0);
    var dateValue = camlsql.datetime(bbPremierDate).sub('3 days').value;
    expect(dateValue.toISOString()).toEqual(expectedDate.toISOString());
  });

  it("camlsql.datetime(new Date()).sub('10 days').startOfWeek()", function() {
    var bbPremierDate = new Date(2008, 0, 20, 18, 30, 0),
        expectedDate = new Date(2008, 0, 7, 0,0,0,0);
    var dateValue = camlsql.datetime(bbPremierDate).sub('10 days').startOfWeek().value;
    expect(dateValue.toISOString()).toEqual(expectedDate.toISOString());
  });

  it("camlsql.datetime(new Date()).startOfWeek().sub('1 day')", function() {
    var bbPremierDate = new Date(2008, 0, 20, 18, 30, 0),
        expectedDate = new Date(2008, 0, 13, 0,0,0,0);
    var dateValue = camlsql.datetime(bbPremierDate).startOfWeek().sub('1 day').value;
    expect(dateValue.toISOString()).toEqual(expectedDate.toISOString());
  });

 it("camlsql.datetime(new Date()).startOfWeek().sub('1 day').startOfWeek()", function() {
    var bbPremierDate = new Date(2008, 0, 20, 18, 30, 0),
        expectedDate = new Date(2008, 0, 7, 0,0,0,0);
    var dateValue = camlsql.datetime(bbPremierDate).startOfWeek().sub('1 day').startOfWeek().value;
    expect(dateValue.toISOString()).toEqual(expectedDate.toISOString());
  });

 it("Native date parameter", function() {
     var stm = camlsql.prepare('SELECT * FROM List1 WHERE Field1 = ?', [new Date()]);
     var param = stm.$options.parameters["@param0"];
    expect(param).toBeDefined();
    expect(param.type).toEqual("DateTime");
  });

}); 


describe("Internal date/time functions", function() {

  it("createDateWithIntervalString('10 minutes')", function() {
    // Hope we can trust this one to not take too long..
    var dateValue = camlsql.__testonly__.createDateWithIntervalString("10 minutes"),
        expectedDate = new Date((new Date().getTime()) + 600000);
    expect(dateValue.toISOString()).toEqual(expectedDate.toISOString());
  });

  it("createDateTimeParameter(camlsql.datetime())", function() {
    // Hope we can trust this one to not take too long..
    var bbPremierDate = new Date(2008, 0, 20, 18, 30, 0)
    var dateValue = camlsql.__testonly__.createDateTimeParameter(camlsql.datetime(bbPremierDate));
    expect(dateValue.value.toISOString()).toEqual("2008-01-20T17:30:00.000Z");
  });

});


describe("Override date with string", function() {
  it("Totally custom date string", function() {
    var xml = camlsql.prepare("SELECT * FROM [Notes] WHERE [x] = ?", [ camlsql.datetime("test") ]).getXml();
    expect(xml).toEqual('<View><Query><Where><Eq><FieldRef Name="x" /><Value Type="DateTime" IncludeTimeValue="True">test</Value></Eq></Where></Query></View>');
  });
});

describe("camlsql.datetime().storageTZ(true)", function() {
  it("Totally custom date string", function() {
    var xml = camlsql.prepare('SELECT * FROM List1 WHERE Field1 = ?', [camlsql.datetime("2018-01-17T14:58:00.000Z").storageTZ(true)]).getXml()
    expect(xml).toEqual('<View><Query><Where><Eq><FieldRef Name="Field1" /><Value Type="DateTime" IncludeTimeValue="True" StorageTZ="True">2018-01-17T14:58:00.000Z</Value></Eq></Where></Query></View>');
  });
});



