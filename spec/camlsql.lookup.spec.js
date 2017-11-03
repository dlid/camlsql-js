/**
 * Tests of the padString method
 */
var camlsql = require("../dist/public_html/js/camlsql.js");

describe("camlsql.lookup", function() {

  it("No parameter => false", function() {
  expect(function() {
      var result = camlsql.lookup();
    }).toThrow("[camlsql] Value must be number or string");
  });

  it("camlsql.lookup(3) => byId, lookupid", function() {
    var result = camlsql.lookup(3);
    expect(result.lookupid).toEqual(true);
    expect(result.byId).toEqual(true);
    expect(result.value).toEqual(3);
  });

  it("camlsql.lookup('3') => !byId, !lookupid", function() {
    var result = camlsql.lookup("3");
    expect(result.lookupid).toEqual(false);
    expect(result.byId).toEqual(false);
    expect(result.value).toEqual("3");
  });


}); 