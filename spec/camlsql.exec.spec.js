/**
 * Tests of the padString method
 */
var camlsql = require("../dist/public_html/js/camlsql.js");


 describe("camlsql.exec", function() {

  it("SP is not defined (without callback)", function() {
    expect(function() {
      delete global.SP;
      camlsql.prepare("SELECT * FROM Test").exec();
    }).toThrow("[camlsql] SP is not defined");
  });

  it("SP is not defined (with callback)", function() {
      delete global.SP;
      camlsql.prepare("SELECT * FROM Test").exec(function(err, result) {
        expect(err.message).toEqual("[camlsql] SP is not defined");
      });
  });

 });

global.SP = null;

 describe("camlsql.exec", function() {
   
   it("Get field value by encoded field and unencoded field", function() {
      global.SP = require("./exec_fakes.js")({
        result : [
          {"ID" : 55, "L_x00e5_da" : "Very big"}
        ]
      });
      camlsql.prepare("SELECT Title, [Låda] FROM Something").exec(function(err, ar) {
        expect(err).toBeNull();
        expect(ar.length).toBeDefined();
        expect(ar[0].L_x00e5_da).toEqual("Very big");
        expect(ar[0]['Låda']).toEqual("Very big");
      });
   });

   it("Error when list could not be loaded", function() {
      global.SP = require("./exec_fakes.js")({
        loadListError : {}
      });
      camlsql.prepare("SELECT Title, [Låda] FROM Something").exec(function(err, ar) {
        expect(ar).toBeNull();
        expect(err).toBeDefined();
        expect(err.message).toEqual("[camlsql] Failed to load list");
      });
   });

   it("Throw Error when list could not be loaded and no callback", function() {
      global.SP = require("./exec_fakes.js")({
        loadListError : {}
      });
      expect(function() {
        camlsql.prepare("SELECT Title FROM Something").exec();  
      }).toThrow("[camlsql] Failed to load list");
      
   });

   it("Error when caml query could not be executed", function() {
      global.SP = require("./exec_fakes.js")({
        camlQueryError : {
          get_errorCode : function() {return 5;}
        }
      });
      camlsql.prepare("SELECT Title, [Låda] FROM Something").exec(function(err, ar) {
        expect(ar).toBeNull();
        expect(err).toBeDefined();
        expect(err.message).toEqual("Error executing the SP.CamlQuery");
      });
   });

   it("Error when caml query could not be executed (error -2130575340)", function() {
      global.SP = require("./exec_fakes.js")({
        camlQueryError : {
          get_errorCode : function() {return -2130575340;}
        }
      });
      camlsql.prepare("SELECT Title, [Låda] FROM Something").exec(function(err, ar) {
        expect(ar).toBeNull();
        expect(err).toBeDefined();
        expect(err.message).toEqual("Error executing the SP.CamlQuery (Error -2130575340: Check field names)");
      });
   });

   it("Group by field must be in ViewFields", function() {
      global.SP = require("./exec_fakes.js")({});
      camlsql.prepare("SELECT Title FROM Something GROUP BY [Category]").exec(function(err, ar) {
        expect(err.message).toEqual("[camlsql] The Grouping Field must be included in the field list");
      });      
   });

  it("Throw error when Group by field must be in ViewFields and no callback", function() {
      global.SP = require("./exec_fakes.js")({});
      expect(function() {
        camlsql.prepare("SELECT Title FROM Something GROUP BY [Category]").exec();
      }).toThrow("[camlsql] The Grouping Field must be included in the field list");
   });


   it("Group by", function() {
      global.SP = require("./exec_fakes.js")({
        result : [
          {"ID" : 55, "Title" : "Row one", "Category" : "Fun"},
          {"ID" : 45, "Title" : "Row two", "Category" : "Fun"},
          {"ID" : 25, "Title" : "Row three", "Category" : "Boring"},
        ]
      });
      camlsql.prepare("SELECT Title,Category FROM Something GROUP BY [Category]").exec(function(err, ar) {
        expect(ar.length).toEqual(2);
        expect(ar[0].groupName).toEqual("Fun");
        expect(ar[0].items.length).toEqual(2);
        expect(ar[1].groupName).toEqual("Boring");
        expect(ar[1].items.length).toEqual(1);
      });
   });

    it("Group by lookup value", function() {
      global.SP = require("./exec_fakes.js")({
        result : [
          {"ID" : 55, "Title" : "Row one", "Category" : { get_lookupValue : function(){ return "Fun";}} },
          {"ID" : 45, "Title" : "Row two", "Category" : { get_lookupValue : function(){ return "Fun";}}},
          {"ID" : 25, "Title" : "Row three", "Category" : { get_lookupValue : function(){ return "Boring";}}},
        ]
      });
      camlsql.prepare("SELECT Title,Category FROM Something GROUP BY [Category]").exec(function(err, ar) {
        expect(ar.length).toEqual(2);
        expect(ar[0].groupName).toEqual("Fun");
        expect(ar[0].items.length).toEqual(2);
        expect(ar[1].groupName).toEqual("Boring");
        expect(ar[1].items.length).toEqual(1);
      });
   });

 });
