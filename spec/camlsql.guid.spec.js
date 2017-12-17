/**
 * Tests of the padString method
 */
var camlsql = require("../dist/public_html/js/camlsql.js");

describe("camlsql.guid", function() {

  it("Base case", function() {
    var result = camlsql.guid('e9e0cde3-fa21-4a87-af74-797a2725e7e7');
    expect(result.type).toEqual("Guid");
    expect(result.value).toEqual('e9e0cde3-fa21-4a87-af74-797a2725e7e7');
  });

   it("Anything goes case", function() {
    var result = camlsql.guid('hello');
    expect(result.type).toEqual("Guid");
    expect(result.value).toEqual('hello');
  });

  it("No parameter => error", function() {
    expect(function() {
      camlsql.guid();
    }).toThrow("[camlsql] Missing parameter");
  });

});