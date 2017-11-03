/**
 * Tests of the extractScopePart method
 */
var testonly = require("../dist/public_html/js/camlsql.js").__testonly__;

describe("extractScopePart", function() {

  function createWorkerObject(query) {
    return {
      query : query
    }
  }

  it("Fail for unknown scopes", function() {
    var workerObject = createWorkerObject("SELECT SCOPE whatever man * FROM [ListName]");
    expect(function(){
      testonly.extractScopePart(workerObject);
    }).toThrow("[camlsql] Unknown scope 'whatever'");
    expect(workerObject.query).toEqual("SELECT SCOPE whatever man * FROM [ListName]");
  });

  it("Set Recursive scope (Correct casing)", function() {
    var workerObject = createWorkerObject("SELECT SCOPE Recursive * FROM [ListName]");
    testonly.extractScopePart(workerObject);
    expect(workerObject.query).toEqual("SELECT * FROM [ListName]");
    expect(workerObject.viewScope).toEqual("Recursive");
  });

  it("Set Recursive scope (Mixed casing)", function() {
    var workerObject = createWorkerObject("SELECT SCOPE reCurSiVe * FROM [ListName]");
    testonly.extractScopePart(workerObject);
    expect(workerObject.query).toEqual("SELECT * FROM [ListName]");
    expect(workerObject.viewScope).toEqual("Recursive");
  });

  it("Set RecursiveAll scope (Correct casing)", function() {
    var workerObject = createWorkerObject("SELECT SCOPE RecursiveAll * FROM [ListName]");
    testonly.extractScopePart(workerObject);
    expect(workerObject.query).toEqual("SELECT * FROM [ListName]");
    expect(workerObject.viewScope).toEqual("RecursiveAll");
  });

  it("Set RecursiveAll scope (Mixed casing)", function() {
    var workerObject = createWorkerObject("SELECT SCOPE reCurSiVeaLL * FROM [ListName]");
    testonly.extractScopePart(workerObject);
    expect(workerObject.viewScope).toEqual("RecursiveAll");
    expect(workerObject.query).toEqual("SELECT * FROM [ListName]"); 
  });

  it("Set FilesOnly scope (Correct casing)", function() {
    var workerObject = createWorkerObject("SELECT SCOPE FilesOnly * FROM [ListName]");
    testonly.extractScopePart(workerObject);
    expect(workerObject.viewScope).toEqual("FilesOnly");
    expect(workerObject.query).toEqual("SELECT * FROM [ListName]");
  });

  it("Set FilesOnly scope (Mixed casing)", function() {
    var workerObject = createWorkerObject("SELECT SCOPE FIlesONLY * FROM [ListName]");
    testonly.extractScopePart(workerObject);
    expect(workerObject.viewScope).toEqual("FilesOnly");
    expect(workerObject.query).toEqual("SELECT * FROM [ListName]");
  });

  it("Expect null on incomplete SQL", function() { 
    var workerObject = createWorkerObject("SELECT SCOPE reCurSiVeaLL");
    testonly.extractScopePart(workerObject);
    expect(workerObject.viewScope).toEqual(null);
    expect(workerObject.query).toEqual("SELECT SCOPE reCurSiVeaLL");
  });

   it("Set DefaultValue scope", function() {
    var workerObject = createWorkerObject("SELECT SCOPE DefaultValue * FROM [ListName]");
    testonly.extractScopePart(workerObject);
    expect(workerObject.query).toEqual("SELECT * FROM [ListName]");
    expect(workerObject.viewScope).toEqual("DefaultValue");
  });
 

}); 