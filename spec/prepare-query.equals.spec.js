/**
 * Tests of the padString method
 */
var camlsql = require("../dist/public_html/js/camlsql.js");

describe("Query preparation (Equal)", function() {

  it("Equal to Text", function() {
    var result = camlsql.prepare("SELECT * FROM [MyList] WHERE [Field] = ?", ["some string"]),
        xml = result.getXml();

    expect(xml).toEqual('<View><Query><Where><Eq><FieldRef Name="Field" /><Value Type="Text">some string</Value></Eq></Where></Query></View>');
  });

  it("Equal to Text (using camlsql.text)", function() {
    var result = camlsql.prepare("SELECT * FROM [MyList] WHERE [Field] = ?", [camlsql.text("some string")]),
        xml = result.getXml();

    expect(xml).toEqual('<View><Query><Where><Eq><FieldRef Name="Field" /><Value Type="Text">some string</Value></Eq></Where></Query></View>');
  });

  it("Equal to Text (Multiline)", function() {
    var result = camlsql.prepare("SELECT * FROM [MyList] WHERE [Field] = ?", ["some\nstring"]),
        xml = result.getXml();

    expect(xml).toEqual('<View><Query><Where><Eq><FieldRef Name="Field" /><Value Type="Text"><![CDATA[some\nstring]]></Value></Eq></Where></Query></View>');
  });

  it("Equal to Text with HTML Characters ", function() {
    var result = camlsql.prepare("SELECT * FROM [MyList] WHERE [Field] = ?", ["<script>"]),
        xml = result.getXml();

    expect(xml).toEqual('<View><Query><Where><Eq><FieldRef Name="Field" /><Value Type="Text">&lt;script&gt;</Value></Eq></Where></Query></View>');
  });

  it("Equal to Number", function() {
    var result = camlsql.prepare("SELECT * FROM [MyList] WHERE [Field] = ?", [5]),
        xml = result.getXml();
 
    expect(xml).toEqual('<View><Query><Where><Eq><FieldRef Name="Field" /><Value Type="Number">5</Value></Eq></Where></Query></View>');
  });

  it("Equal to Number (camlsql.number)", function() {
    var result = camlsql.prepare("SELECT * FROM [MyList] WHERE [Field] = ?", [camlsql.number(5)]),
        xml = result.getXml();

    expect(xml).toEqual('<View><Query><Where><Eq><FieldRef Name="Field" /><Value Type="Number">5</Value></Eq></Where></Query></View>');
  });

  it("Equal to decimal number", function() {
    var result = camlsql.prepare("SELECT * FROM [MyList] WHERE [Field] = ?", [camlsql.number(5.42)]),
        xml = result.getXml();

    expect(xml).toEqual('<View><Query><Where><Eq><FieldRef Name="Field" /><Value Type="Number">5.42</Value></Eq></Where></Query></View>');
  });

  it("Equal to date", function() {

    var batmanPremierDate = new Date(1966, 0, 12, 18, 30, 0),
        result = camlsql.prepare("SELECT * FROM [MyList] WHERE [Field] = ?", [camlsql.datetime(batmanPremierDate)]),
        xml = result.getXml(),
        expectedDateString = batmanPremierDate.toISOString()

    expect(xml).toEqual('<View><Query><Where><Eq><FieldRef Name="Field" /><Value Type="DateTime" IncludeTimeValue="True">1966-01-12T18:30:00</Value></Eq></Where></Query></View>');
  });

  it("Equal to date (StorageTZ false)", function() {

    var batmanPremierDate = new Date(1966, 0, 12, 18, 30, 0),
        result = camlsql.prepare("SELECT * FROM [MyList] WHERE [Field] = ?", [camlsql.datetime(batmanPremierDate).storageTZ(false)]),
        xml = result.getXml(),
        expectedDateString = batmanPremierDate.toISOString()

    expect(xml).toEqual('<View><Query><Where><Eq><FieldRef Name="Field" /><Value Type="DateTime" IncludeTimeValue="True">1966-01-12T18:30:00</Value></Eq></Where></Query></View>');
  });

  it("Equal to date (includeTime false)", function() {

    var batmanPremierDate = new Date(1966, 0, 12, 18, 30, 0),
        result = camlsql.prepare("SELECT * FROM [MyList] WHERE [Field] = ?", [camlsql.datetime(batmanPremierDate).includeTime(false)]),
        xml = result.getXml(),
        expectedDateString = batmanPremierDate.toISOString()

    expect(xml).toEqual('<View><Query><Where><Eq><FieldRef Name="Field" /><Value Type="DateTime">1966-01-12T18:30:00</Value></Eq></Where></Query></View>');
  });

  it("Equal to date (includeTime false, storageTZ false)", function() {

    var batmanPremierDate = new Date(1966, 0, 12, 18, 30, 0),
        result = camlsql.prepare("SELECT * FROM [MyList] WHERE [Field] = ?", [camlsql.datetime(batmanPremierDate).includeTime(false).storageTZ(false)]),
        xml = result.getXml(),
        expectedDateString = batmanPremierDate.toISOString()

    expect(xml).toEqual('<View><Query><Where><Eq><FieldRef Name="Field" /><Value Type="DateTime">1966-01-12T18:30:00</Value></Eq></Where></Query></View>');
  });

}); 