/**
* Tests to encode to internal field names
*/
var camlsql = require("../dist/public_html/js/camlsql.js");

 var meh = 0;

SP = {
    SOD : {
      executeFunc : function(a,b,callback) {
        callback();
      },
       executeOrDelayUntilScriptLoaded : function(callback) {
        callback();
      }
    },
    CamlQuery : function() {

      return {
        set_viewXml : function() {}  
      }
    },
    ClientContext : {
     
      get_current : function() {
       
        return {
           executeQueryAsync : function(callback, errCallback) {
          console.log("N>"+meh)
          // if (breakAt == "executeOrDelayUntilScriptLoaded") {
          //  // errCallback();
          //   return;
          // }
          meh++;

          callback();
        },
          load : function() {},
          get_web : function() {
            return {
              get_lists : function() {
                return {
                  getByTitle : function(listTitle) {
                    return {
                      getItems : function() {
                        var i = 0;
                        return {
                          getEnumerator : function() {
                            return {
                              moveNext : function() {
                                i++;
                                if (i==1) return true;
                                return false;
                              },
                              get_current : function() {
                                return {
                                  get_fieldValues : function() {
                                    return {
                                      Title : 'dummy',
                                      Field2 : '2'
                                    }
                                  },
                                      get_id : function() {
                                        return 1;
                                      }
                                }
                              }
                            }
                          },
                          get_listItemCollectionPosition : function() {
                            return {
                                  get_pagingInfo : function() {
                                    return "dummy";
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }

      }
    }
  }; 

describe("Exec SQL Query #001", function() {

  it("Query 1", function() {
     camlsql.prepare('SELECT * FROM List1').exec(function() {

    });
  });

  it("Query 2", function() {
     camlsql.prepare('SELECT * FROM List1').exec();
  });

  it("Query 3", function() {
    
    camlsql.prepare('SELECT * FROM List1').exec(function() {
      console.log(arguments);
    });

  });

}); 
