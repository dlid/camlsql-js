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


}); 
