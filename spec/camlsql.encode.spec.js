/**
 * Tests to encode to internal field names
 */
var camlsql = require("../dist/public_html/js/camlsql.js");

describe("camlsql.encode", function() {

  it("Produktområde", function() {
    var result = camlsql.encode('Produktområde');
    expect(result).toEqual("Produktomr_x00e5_de");
  });

  it("Uppsägning", function() {
    var result = camlsql.encode('Uppsägning');
    expect(result).toEqual("Upps_x00e4_gning");
  });

  it("The field", function() {
    var result = camlsql.encode('The field');
    expect(result).toEqual("The_x0020_field");
  });

  it("The field", function() {
    var result = camlsql.encode('The field');
    expect(result).toEqual("The_x0020_field");
  });

  it("Från & med", function() {
    var result = camlsql.encode('Från & med');
    expect(result).toEqual("Fr_x00e5_n_x0020__x0026__x0020_m");
  });

  it(".Testing a dot", function() {
    var result = camlsql.encode('.Testing a dot');
    expect(result).toEqual("_x002e_Testing_x0020_a_x0020_dot");
  });

  it("Testing parenthesis", function() {
    var result = camlsql.encode('Cool (not)');
    expect(result).toEqual("Cool_x0020__x0028_not_x0029_");
  });


}); 