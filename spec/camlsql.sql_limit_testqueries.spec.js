/**
 * Tests to encode to internal field names
 */
var camlsql = require("../dist/public_html/js/camlsql.js");

describe("´LIMIT SQL Query #001", function() {

  it("Query 1 -> LIMIT 10a (error)", function() {
    expect(function() {
    var result = camlsql.prepare("SELECT * FROM List LIMIT 10a").getXml();
    }).toThrow("[camlsql] LIMIT value must be a number");

  });

  it("Query 2 -> LIMIT 30", function() {
    var result = camlsql.prepare("SELECT * FROM List LIMIT 30").getXml();
    expect(result).toEqual("<View><RowLimit>30</RowLimit></View>");
  });

  it("Query 3 -> LIMIT 0", function() {
    expect(function() {
    var result = camlsql.prepare("SELECT * FROM List LIMIT 0").getXml();
    }).toThrow("[camlsql] LIMIT value can not be 0");

  });

}); 
