/**
 * Tests to encode to internal field names
 */
 var camlsql = require("../dist/public_html/js/camlsql.js");

 describe("IN SQL Query #001", function() {


  it("Query 1", function() {
    var result = camlsql.prepare('SELECT * FROM List1 LIMIT 100').getXml()
    expect(result).toEqual('<View><RowLimit>100</RowLimit></View>');
  });

 
}); 

 describe("IN SQL Query #002", function() {


  it("Query 1", function() {
   expect(function() {
    var result = camlsql.prepare('SELECT * FROM List1 LIMIT 10A0').getXml()
  }).toThrow("[camlsql] LIMIT value must be a number");

  });

 
}); 
