/**
 * Tests to encode to internal field names
 */
var camlsql = require("../dist/public_html/js/camlsql.js");

describe("Custom, unknown parameter Query #001", function() {

 it("Custom parameter object 'Ost'", function() {
     expect(function() {
      camlsql.prepare("SELECT * FROM Notebook WHERE Author = ?", [{type : "Ost"}]).getXml();
    }).toThrow("[camlsql] Parameter type is not not implemented Ost");
  });

}); 
