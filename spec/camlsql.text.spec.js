/**
 * Tests of the padString method
 */
var camlsql = require("../dist/public_html/js/camlsql.js");

describe("camlsql.text", function() {

  it("No parameter => today with time", function() {
    
    var result = camlsql.text("hello");
    expect(result.type).toEqual("Text");
    expect(result.multiline).toEqual(undefined);

  });


}); 