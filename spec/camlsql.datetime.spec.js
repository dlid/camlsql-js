/**
 * Tests of the padString method
 */
var camlsql = require("../dist/public_html/js/camlsql.js");

describe("camlsql.datetime", function() {

  it("No parameter => today", function() {
    
    var result = camlsql.datetime();
    expect(result.type).toEqual("DateTime");
    expect(result.today).toEqual(true);
    expect(result.includeTime).toEqual(true);

  });


}); 