/**
 * Tests of the padString method
 */
var camlsql = require("../dist/public_html/js/camlsql.js");

describe("camlsql.number", function() {

  it("No parameter => 0", function() {
    var result = camlsql.number();
    expect(result.type).toEqual("Number");
    expect(result.value).toEqual(0);
  });

  it("Object parameter => error", function() {
    expect(function() {
      camlsql.number({test : 5});
    }).toThrow("[camlsql] Value was not a number");
  });

  it("text parameter => error", function() {
    expect(function() {
      camlsql.number("55");
    }).toThrow("[camlsql] Value was not a number");
  });

  it("negative number", function() {
     var result = camlsql.number(-1980);
    expect(result.type).toEqual("Number");
    expect(result.value).toEqual(-1980);
  });

  it("positive number", function() {
     var result = camlsql.number(1980);
    expect(result.type).toEqual("Number");
    expect(result.value).toEqual(1980);
  });

  it("positive decimal number", function() {
     var result = camlsql.number(42.9);
    expect(result.type).toEqual("Number");
    expect(result.value).toEqual(42.9);
  });

   it("negative decimal number", function() {
     var result = camlsql.number(-42.9);
    expect(result.type).toEqual("Number");
    expect(result.value).toEqual(-42.9);
  });

   


}); 