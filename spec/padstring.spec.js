/**
 * Tests of the padString method
 */
var camlsql = require("../dist/public_html/js/camlsql.js");

describe("padString", function() {

  it("'2' should return '02'", function() {
    var result = camlsql.__testonly__.padString("2");
    expect(result).toEqual("02");
  });

  it("number 8 should return '08'", function() {
    var result = camlsql.__testonly__.padString(8);
    expect(result).toEqual("08");
  });

  it("number 83 should return '83'", function() {
    var result = camlsql.__testonly__.padString(83);
    expect(result).toEqual("83");
  });

  it("'84' should return 84", function() {
    var result = camlsql.__testonly__.padString("84");
    expect(result).toEqual("84");
  });

  it("'843' should return 843", function() {
    var result = camlsql.__testonly__.padString("843");
    expect(result).toEqual("843");
  });
}); 