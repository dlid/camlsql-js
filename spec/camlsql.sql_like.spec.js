/**
 * Tests to encode to internal field names
 */
 var camlsql = require("../dist/public_html/js/camlsql.js");

 describe("LIKE SQL Query #001", function() {


  it("Query 1", function() {
    var result = camlsql.prepare('SELECT * FROM List1 WHERE Field1 LIKE ?', ['hello']).getXml()
    expect(result).toEqual('<View><Query><Where><Contains><FieldRef Name="Field1" /><Value Type="Text">hello</Value></Contains></Where></Query></View>');
  });

   it("Query 2", function() {
    var result = camlsql.prepare('SELECT * FROM List1 WHERE Field1 LIKE ?', ['hello%']).getXml()
    expect(result).toEqual('<View><Query><Where><BeginsWith><FieldRef Name="Field1" /><Value Type="Text">hello%</Value></BeginsWith></Where></Query></View>');
  });

   it("Query 3", function() {
    var result = camlsql.prepare('SELECT * FROM List1 WHERE Field1 LIKE ?', ['%hello%']).getXml()
    expect(result).toEqual('<View><Query><Where><Contains><FieldRef Name="Field1" /><Value Type="Text">%hello%</Value></Contains></Where></Query></View>');
  });

  it("Query 4 => error if param ends with", function() {
   expect(function() {
    var result = camlsql.prepare('SELECT * FROM List1 WHERE Field1 LIKE ?', ['%hello']).getXml()
  }).toThrow("[camlsql] SharePoint does not support an 'EndsWith' statement: %hello");
 });

}); 
