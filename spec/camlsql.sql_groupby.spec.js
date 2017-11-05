/**
 * Tests to encode to internal field names
 */
var camlsql = require("../dist/public_html/js/camlsql.js");

describe("SQL Query #001", function() {

  it("Query 1", function() {
    var result = camlsql.prepare("SELECT * FROM List1 GROUP BY Title", []).getXml();
    expect(result).toEqual('<View><Query><GroupBy><FieldRef Name="Title" /></GroupBy></Query></View>');
  });

}); 
 
describe("SQL Query #002", function() {

  it("Query 1", function() {
    var result = camlsql.prepare("SELECT * FROM List1 GROUP BY Title", []).getXml(true);
    expect(result).toEqual('');
  });

}); 