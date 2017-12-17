/**
 * Tests to encode to internal field names
 */
var camlsql = require("../dist/public_html/js/camlsql.js");

describe("User Parameter Query #001", function() {


  it("Query 1 - no parameter", function() {
      var result = camlsql.prepare('SELECT * FROM List1 WHERE Field1 = ?', [camlsql.user()]).getXml();
      expect(result).toEqual('<View><Query><Where><Eq><FieldRef Name="Field1" /><Value Type="Number"><UserID /></Value></Eq></Where></Query></View>');
  });


  it("Query 2 - numeric parameter", function() {
      var result = camlsql.prepare('SELECT * FROM List1 WHERE Field1 = ?', [camlsql.user(41)]).getXml();
      expect(result).toEqual('<View><Query><Where><Eq><FieldRef Name="Field1" LookupId="True" /><Value Type="User">41</Value></Eq></Where></Query></View>');
  });


}); 
