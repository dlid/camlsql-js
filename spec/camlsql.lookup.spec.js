/**
 * Tests of the padString method
 */
var camlsql = require("../dist/public_html/js/camlsql.js");

describe("camlsql.lookup", function() {


  it("Object parameter => error", function() {
    expect(function() {
      camlsql.lookup({});
    }).toThrow("[camlsql] Value must be number or string");
  });

}); 