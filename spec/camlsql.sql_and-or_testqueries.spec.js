/**
 * Tests to encode to internal field names
 */
var camlsql = require("../dist/public_html/js/camlsql.js");

describe("SQL Query #001", function() {

  var sql_query_001_xml = '<View><Query><Where><And><Eq><FieldRef Name="Field1" /><Value Type="Text">Value 1</Value></Eq><Eq><FieldRef Name="Field2" /><Value Type="Text">Value 2</Value></Eq></And></Where></Query></View>';

  it("Query 1", function() {
    var result = camlsql.prepare('SELECT * FROM List WHERE Field1 = ? AND Field2 = ?', ['Value 1', 'Value 2']).getXml();
    expect(result).toEqual(sql_query_001_xml);
  });

  it("Query 2", function() {
    var result = camlsql.prepare('SELECT * FROM List WHERE (Field1 = ? AND Field2 = ?)', ['Value 1', 'Value 2']).getXml();
    expect(result).toEqual(sql_query_001_xml);
  });

  it("Query 3", function() {
    var result = camlsql.prepare('SELECT * FROM List WHERE ( Field1 = ? AND Field2 = ? )', ['Value 1', 'Value 2']).getXml();
    expect(result).toEqual(sql_query_001_xml);
  });

  

}); 

describe("SQL Query #002", function() {

  var expected_xml = '<View><Query><Where><Or><And><Eq><FieldRef Name="Field1" /><Value Type="Text">Value 1</Value></Eq><Eq><FieldRef Name="Field2" /><Value Type="Text">Value 2</Value></Eq></And><Eq><FieldRef Name="Field2" /><Value Type="Text">Value 3</Value></Eq></Or></Where></Query></View>';

  it("Query 1", function() {
    var result = camlsql.prepare("SELECT * FROM List WHERE (Field1 = ? AND Field2 = ?) OR Field2 = ?", ['Value 1', 'Value 2', 'Value 3']).getXml();
    expect(result).toEqual(expected_xml);
  });

  it("Query 2", function() {
    var result = camlsql.prepare('SELECT * FROM List WHERE (Field1 = ? AND Field2 = ?) OR (Field2 = ?)', ['Value 1', 'Value 2', 'Value 3']).getXml();
    expect(result).toEqual(expected_xml);
  });

  it("Query 3", function() {
    var result = camlsql.prepare('SELECT * FROM List WHERE ((Field1 = ? AND Field2 = ?)) OR (Field2 = ?)', ['Value 1', 'Value 2', 'Value 3']).getXml();
    expect(result).toEqual(expected_xml);
  });

   it("Query 4", function() {
    var result = camlsql.prepare('SELECT * FROM List WHERE ((Field1 = ? AND Field2 = ?)) OR ((Field2 = ?) )', ['Value 1', 'Value 2', 'Value 3']).getXml();
    expect(result).toEqual(expected_xml);
  });


}); 

describe("SQL Query #003", function() {

  var expected_xml = '<View><Query><Where><Or><And><Eq><FieldRef Name="Field1" /><Value Type="Text">Value 1</Value></Eq><Eq><FieldRef Name="Field2" /><Value Type="Text">Value 2</Value></Eq></And><Eq><FieldRef Name="Field2" /><Value Type="Text">Value 3</Value></Eq></Or></Where></Query></View>';

  it("Query 1", function() {
    var result = camlsql.prepare("SELECT * FROM List WHERE Field1 = ? AND Field2 = ? OR (Field2 = ?)", ['Value 1', 'Value 2', 'Value 3']).getXml();
    expect(result).toEqual(expected_xml);
  });

  it("Query 2", function() {
    var result = camlsql.prepare("SELECT * FROM List WHERE (Field1 = ? AND Field2 = ?) OR (Field2 = ?)", ['Value 1', 'Value 2', 'Value 3']).getXml();
    expect(result).toEqual(expected_xml);
  });



}); 

describe("SQL Query #004", function() {

  var expected_xml = '<View><Query><Where><And><Eq><FieldRef Name="Field1" /><Value Type="Text">Value 1</Value></Eq><Or><Eq><FieldRef Name="Field2" /><Value Type="Text">Value 2</Value></Eq><Eq><FieldRef Name="Field2" /><Value Type="Text">Value 3</Value></Eq></Or></And></Where></Query></View>';

  it("Query 1", function() {
    var result = camlsql.prepare("SELECT * FROM List WHERE Field1 = ? AND Field2 = ? OR Field2 = ?", ['Value 1', 'Value 2', 'Value 3']).getXml();
    expect(result).toEqual(expected_xml);
  });

  it("Query 2", function() {
    var result = camlsql.prepare("SELECT * FROM List WHERE Field1 = ? AND (Field2 = ? OR Field2 = ?)", ['Value 1', 'Value 2', 'Value 3']).getXml();
    expect(result).toEqual(expected_xml);
  });



}); 


describe("SQL Query #005", function() {

  var expected_xml = '<View><Query><Where><And><And><Eq><FieldRef Name="Field1" /><Value Type="Number">1</Value></Eq><Eq><FieldRef Name="Field2" /><Value Type="Number">2</Value></Eq></And><And><Eq><FieldRef Name="Field3" /><Value Type="Number">3</Value></Eq><Or><Eq><FieldRef Name="Field4" /><Value Type="Number">4</Value></Eq><Eq><FieldRef Name="Field5" /><Value Type="Number">5</Value></Eq></Or></And></And></Where></Query></View>';

  it("Query 1", function() {
    var result = camlsql.prepare("SELECT * FROM List WHERE (Field1 = ? AND Field2 = ?) AND Field3 = ? AND (Field4 = ? OR Field5 = ?)", [1, 2, 3, 4, 5]).getXml();
    expect(result).toEqual(expected_xml);
  });


  it("Query 2", function() {
    var result = camlsql.prepare("SELECT * FROM List WHERE (Field1 = ? AND Field2 = ?) AND (Field3 = ?) AND (Field4 = ? OR Field5 = ?)", [1, 2, 3, 4, 5]).getXml();
    expect(result).toEqual(expected_xml);
  });

}); 



describe("SQL Query #006", function() {

  var expected_xml = '<View><Query><Where><Or><And><Contains><FieldRef Name="BodyText" /><Value Type="Text">hi</Value></Contains><Contains><FieldRef Name="BodyText" /><Value Type="Text">world</Value></Contains></And><And><Contains><FieldRef Name="BodyText" /><Value Type="Text">hi</Value></Contains><Contains><FieldRef Name="BodyText" /><Value Type="Text">world</Value></Contains></And></Or></Where></Query></View>';

  it("Query 1", function() {
    var result = camlsql.prepare("SELECT * FROM List WHERE (BodyText LIKE @term1 AND BodyText LIKE @term2) OR (BodyText LIKE @term1 AND BodyText LIKE @term2)", {"@term1" : "hi", "@term2" : "world"}).getXml();
    expect(result).toEqual(expected_xml);
  });


  it("Query 2", function() {
    var result = camlsql.prepare("SELECT * FROM List WHERE ((BodyText LIKE @term1 AND BodyText LIKE @term2) OR (BodyText LIKE @term1 AND BodyText LIKE @term2))", {"@term1" : "hi", "@term2" : "world"}).getXml();
    expect(result).toEqual(expected_xml);
  });

}); 

// var xml = camlsql.prepare("SELECT * FROM List WHERE (Field1 = ? AND Field2 = ?) AND Field2 = ? AND (Field3 = ? OR Field2 = ?)", [1, 2, 3, 4, 5]).getXml(); console.log(vkbeautify.xml(xml));console.log(xml);1
// 

