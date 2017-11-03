/**
 * Tests to encode to internal field names
 */
 var camlsql = require("../dist/public_html/js/camlsql.js");

 describe("IN SQL Query #001", function() {


  it("Query 1", function() {
    var result = camlsql.prepare('SELECT * FROM List1 WHERE Field1 IN ?', [[1,2,3]]).getXml()
    expect(result).toEqual('<View><Query><Where><In><FieldRef Name="Field1" /><Values><Value Type="Number">1</Value><Value Type="Number">2</Value><Value Type="Number">3</Value></Values></In></Where></Query></View>');
  });

  it("Query 2 => error if param is not array", function() {
   expect(function() {
    var result = camlsql.prepare('SELECT * FROM List1 WHERE Field1 IN ?', [1,2,3]).getXml()
  }).toThrow("[camlsql] IN parameter must be an array");
 });

}); 
