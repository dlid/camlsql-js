/**
 * Tests of the padString method
 */
var camlsql = require("../dist/public_html/js/camlsql.js");

describe("camlsql.text", function() {

  it("No parameter => empty string", function() {
    
    var result = camlsql.text();
    expect(result.type).toEqual("Text");
    expect(result.value).toEqual("");
    expect(result.multiline).toEqual(undefined);

  });

  it("Object parameter => error", function() {

    expect(function() {
      camlsql.text({test : 5});
    }).toThrow("[camlsql] Value was not a string");
  });

  it("Numeric parameter => error", function() {
    
    expect(function() {
      camlsql.text(13);
    }).toThrow("[camlsql] Value was not a string");
  });

  it("String parameter", function() {
    var result = camlsql.text("Moppepojkar");
    expect(result.type).toEqual("Text");
    expect(result.value).toEqual("Moppepojkar");
    expect(result.multiline).toEqual(undefined);
  });

  it("String parameter (Multiline)", function() {
    var result = camlsql.text("Hello\nWisconsin");
    expect(result.type).toEqual("Text");
    expect(result.value).toEqual("Hello\nWisconsin");
    expect(result.multiline).toEqual(true);
  });


}); 