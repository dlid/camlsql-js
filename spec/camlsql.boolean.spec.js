/**
 * Tests of the padString method
 */
var camlsql = require("../dist/public_html/js/camlsql.js");

describe("camlsql.boolean", function() {

  it("No parameter => false", function() {
    var result = camlsql.boolean();
    expect(result.type).toEqual("Boolean");
    expect(result.value).toEqual(false);
  });

  it("Object parameter => error", function() {
    expect(function() {
      camlsql.boolean({test : 5});
    }).toThrow("[camlsql] Value was not boolean");
  });

  it("text parameter => error", function() {
    expect(function() {
      camlsql.boolean("55");
    }).toThrow("[camlsql] Value was not boolean");
  });

  it("1 => true", function() {
     var result = camlsql.boolean(1);
    expect(result.type).toEqual("Boolean");
    expect(result.value).toEqual(true);
  });

  it("0 => false", function() {
     var result = camlsql.boolean(0);
    expect(result.type).toEqual("Boolean");
    expect(result.value).toEqual(false);
  });

  it("> 0 => true", function() {
     var result = camlsql.boolean(44);
    expect(result.type).toEqual("Boolean");
    expect(result.value).toEqual(true);
  });


 it("< 0 => false", function() {
     var result = camlsql.boolean(-44);
    expect(result.type).toEqual("Boolean");
    expect(result.value).toEqual(false);
  });



 it("Native type", function() {
    var stm = camlsql.prepare('SELECT * FROM List1 WHERE Field1 = ?', [camlsql.boolean(true)]);
    var param = stm.$options.parameters["@param0"];
    expect(param).toBeDefined()

    expect(param.type).toEqual("Boolean");
    expect(param.value).toEqual(true);
  });

}); 