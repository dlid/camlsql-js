/**
* Tests to encode to internal field names
*/
var camlsql = require("../dist/public_html/js/camlsql.js");


describe("ViewFields SQL Query #001", function() {
  it("Query 1", function() {
    var result = camlsql.prepare('SELECT * FROM List1').getXml()
    expect(result).toEqual('');
  });
}); 


describe("ViewFields SQL Query #002", function() {
  it("Query 1", function() {
    expect(function() {
      var result = camlsql.prepare('SELECT Field1, Field 2 FROM List1').getXml()
    }).toThrow("[camlsql] Invalid syntax: Field 2");
  });
}); 
describe("ViewFields SQL Query #003", function() {


 it("Query 1", function() {
    var result = camlsql.prepare('SELECT Field1, [Field 2] FROM List1').getXml()
    expect(result).toEqual('<View><ViewFields><FieldRef Name="Field1" /><FieldRef Name="Field_x0020_2" /></ViewFields></View>');
  });

}); 

describe("ViewFields SQL Query #004", function() {


 it("Query 1", function() {
    var result = camlsql.prepare('SELECT Field1, [Field 2], [Åldersbenämning] FROM List1').getXml()
    expect(result).toEqual('<View><ViewFields><FieldRef Name="Field1" /><FieldRef Name="Field_x0020_2" /><FieldRef Name="_x00c5_ldersben_x00e4_mning" /></ViewFields></View>');
  });
  
}); 


