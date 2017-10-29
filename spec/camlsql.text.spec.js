/**
 * Tests of the padString method
 */
var camlsql = require("../dist/public_html/js/camlsql.js");

describe("camlsql.text", function() {

  it("No parameter => Empty string", function() {
    
    var result = camlsql.text();
    expect(result.type).toEqual("Text");
    expect(result.value).toEqual("");
    expect(result.multiline).toEqual(undefined);

  });

  it("String parameter", function() {
    
    var result = camlsql.text("Hello");
    expect(result.type).toEqual("Text");
    expect(result.value).toEqual("Hello");
    expect(result.multiline).toEqual(undefined);

  });

  it("String Multiline parameter", function() {
    
    var result = camlsql.text("Hello\nworld");
    expect(result.type).toEqual("Text");
    expect(result.value).toEqual("Hello\nworld");
    expect(result.multiline).toEqual(true);

  });

  it("Unknown parameter => error", function() {
    expect(function() {
      camlsql.text({test : 5});
    }).toThrow("[camlsql] Value was not a string");

  });

  it("Numeric parameter => error", function() {
    expect(function() {
      camlsql.text(5);
    }).toThrow("[camlsql] Value was not a string");

  });


}); 