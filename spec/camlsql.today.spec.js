/**
 * Tests of the padString method
 */
var camlsql = require("../dist/public_html/js/camlsql.js");

describe("camlsql.today", function() {

  it("No parameter => no offset", function() {
    var result = camlsql.today();
    expect(result.type).toEqual("DateTime");
    expect(result.value).toEqual(0);
  });

  it("String parameter => error", function() {
    expect(function() {
      camlsql.today("5");
    }).toThrow("[camlsql] Bad offset value for 'today'");
  });


}); 