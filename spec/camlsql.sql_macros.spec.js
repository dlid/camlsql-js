/**
 * Tests to encode to internal field names
 */
var camlsql = require("../dist/public_html/js/camlsql.js");

describe("Macros SQL Query #001", function() {


  it("Query 1", function() {
    expect(function() {
      var result = camlsql.prepare('SELECT * FROM List1 WHERE Field1 = ? AND FIeld2 = @teset').getXml();
    }).toThrow("[camlsql] You can not mix named macros and ?");
  });

   it("Query 2", function() {
    expect(function() {
      var result = camlsql.prepare('SELECT * FROM List1 WHERE Field1 = ?').getXml();
    }).toThrow("[camlsql] Parameter is not defined @param0");
  });


   it("Query 3", function() {
    expect(function() {
      var result = camlsql.prepare('SELECT * FROM List1 WHERE Field1 = @val').getXml();
    }).toThrow("[camlsql] Parameter is not defined @val");
  });


}); 
