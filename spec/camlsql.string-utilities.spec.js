/**
 * Tests of the padString method
 */
var camlsql = require("../dist/public_html/js/camlsql.js");

describe("String utilities", function() {

  it("Trim ' hello '", function() {
    
    var result = camlsql.__testonly__.trim(' hello ');
    expect(result).toEqual('hello');

  });

  it("Trim 'hello '", function() {
    var result = camlsql.__testonly__.trim('hello ');
    expect(result).toEqual('hello');

  });

  it("Trim '    hello     '", function() {
    var result = camlsql.__testonly__.trim('    hello     ');
    expect(result).toEqual('hello');

  });


  it("Trim parenthesis '(hey there)'", function() {
    var result = camlsql.__testonly__.trimParanthesis('(hey there)');
    expect(result).toEqual('hey there');

  });

  it("Trim parenthesis '((hey there))'", function() {
    var result = camlsql.__testonly__.trimParanthesis('((hey there))');
    expect(result).toEqual('hey there');

  });

  it("Trim parenthesis '((hey there) ho there)'", function() {
    var result = camlsql.__testonly__.trimParanthesis('((hey there) ho there)');
    expect(result).toEqual('(hey there) ho there');

  });

  it("Trim parenthesis 'Hey (nuff said)", function() {
    var result = camlsql.__testonly__.trimParanthesis('Hey (nuff said)');
    expect(result).toEqual('Hey (nuff said)');

  });

  it("Trim parenthesis 'Hey (nuff said)", function() {
    var result = camlsql.__testonly__.trimParanthesis('Hey (nuff said)');
    expect(result).toEqual('Hey (nuff said)');

  });

   it("Trim parenthesis '(((Hey (nuff said))))", function() {
    var result = camlsql.__testonly__.trimParanthesis('(((Hey (nuff said))))');
    expect(result).toEqual('Hey (nuff said)');

  });

  it("Trim parenthesis '   (((Hey (nuff said))))    '", function() {
    var result = camlsql.__testonly__.trimParanthesis('   (((Hey (nuff said))))    ');
    expect(result).toEqual('Hey (nuff said)');

  });



  // var d = camlsql.__testonly__.getDateFromTextualRepresentation("week start", new Date(1980, 03, 04)); d
  // supposed to be 31st 00:00:00 but returns
  // Sun Mar 30 1980 00:00:00 GMT+0100 (Central Europe Standard Time)
  // same with week end
  // var d = camlsql.__testonly__.getDateFromTextualRepresentation("week end", new Date(1980, 03, 04)); d

  


}); 