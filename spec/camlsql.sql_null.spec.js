/**
 * Tests to encode to internal field names
 */
var camlsql = require("../dist/public_html/js/camlsql.js");

describe("NULL SQL Query #001", function() {


  it("Query 1", function() {
      var result = camlsql.prepare('SELECT * FROM List1 WHERE Field1 IS NULL').getXml();
      expect(result).toEqual('<View><Query><Where><IsNull><FieldRef Name="Field1" /></IsNull></Where></Query></View>');
  });

  it("Query 2", function() {
      var result = camlsql.prepare('SELECT * FROM List1 WHERE Field1 IS not NULL').getXml();
      expect(result).toEqual('<View><Query><Where><IsNotNull><FieldRef Name="Field1" /></IsNotNull></Where></Query></View>');
  });

   it("Query 3", function() {
      var result = camlsql.prepare('SELECT * FROM List1 WHERE [Some cool Field] IS NOT NULL').getXml();
      expect(result).toEqual('<View><Query><Where><IsNotNull><FieldRef Name="Some_x0020_cool_x0020_Field" /></IsNotNull></Where></Query></View>');
  });

   it("Query 4", function() {
     expect(function() {
      var result = camlsql.prepare('SELECT * FROM List1 WHERE [Some cool Field] IS NOTNULL').getXml();
    }).toThrow("[camlsql] Could not parse statement: Some_x0020_cool_x0020_Field IS NOTNULL");
  });

}); 
