/**
 * Tests to encode to internal field names
 */
var camlsql = require("../dist/public_html/js/camlsql.js");

describe("Lookup Parameter Query #001", function() {


  it("Query 1 - no parameter", function() {
      var result = camlsql.prepare("SELECT * FROM Notebook WHERE Author = ?", [camlsql.lookup("Hej")]).getXml()
      expect(result).toEqual('<View><Query><Where><Eq><FieldRef Name="Author" /><Value Type="Lookup">Hej</Value></Eq></Where></Query></View>');
  });


  it("Query 2 - numeric parameter", function() {
      var result = camlsql.prepare("SELECT * FROM Notebook WHERE Author = ?", [camlsql.lookup(44)]).getXml()
      expect(result).toEqual('<View><Query><Where><Eq><FieldRef Name="Author" LookupId="True" /><Value Type="Lookup" LookupId="True">44</Value></Eq></Where></Query></View>');
  });


}); 
