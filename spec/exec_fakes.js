var extend = require('extend');


module.exports = function(options) {
  
  var settings = extend({
    loadListError : null,
    camlQueryError : null,
    result : null
  }, options);

  var executedQueries = 0;

  function createSP() {
    return {
      SOD : createSOD(),
      ClientContext : { get_current : createClientContext },
      CamlQuery : createCamlQuery
    }
  }

  function createClientContext() {
    return {
      get_web : createSPWeb,
      executeQueryAsync : exceuteQueryAsync,
      load : function() {}
    };
  }

  
  function exceuteQueryAsync(success, error) {
    var isLoadingList = executedQueries == 0;
    
    executedQueries++;
    
    if (isLoadingList) {
      if (settings.loadListError) {
        error(null, settings.loadListError);
      } else {
        success();
      }
    } else {
      if (settings.camlQueryError) {
        error(null, settings.camlQueryError);
      } else {
        success();
      }
    }

    
  }

  function createSPWeb() {
    return {
      get_lists : createSPWebListCollection
    }
  }

  function createSPWebListCollection() {
    return {
      getByTitle : createSPList
    }
  }

  function createSPList() {
    return {
      getItems : createListItems
    }
  }

  function createListItems() {
    
    

    function createEnumerator() {
       var ix = -1;

       return {

        get_listItemCollectionPosition : function() {
          return {
            get_pagingInfo : function() {
              return null;
            }
          }
        },

        get_current : function() {

          var o = settings.result[ix];

          o.get_fieldValues = function() {
            var k = Object.keys(settings.result[ix]);
            var no = {};
            for (var i=0; i < k.length; i++) {
              if (typeof settings.result[ix][k[i]] != "function") {
                no[k[i]] = settings.result[ix][k[i]];
              }
            }
            return no;
          }

          o.get_id = function() {
            return settings.result[ix].ID;
          }


          return settings.result[ix];
        },

        moveNext : function() {
          if (settings.result === null)
            return false;

          ix++;
          if (ix < settings.result.length) {
            return true;
          } else {
            return false;
          }
        }

       }
    }

    return {
      get_listItemCollectionPosition : createlistItemCollectionPosition,
      getEnumerator : createEnumerator
    }
  }

  function createlistItemCollectionPosition() {
    return {
      get_pagingInfo : function() {
        return null;
      }
    }
  }

  function createCamlQuery() {
    return {
      set_datesInUtc : function() {},
      set_viewXml : function() {},
    }
  }

  function createSOD() {
    return {
      executeFunc : function() {},
      executeOrDelayUntilScriptLoaded : function(callback) {
        callback();
      }
    };
  }

  return createSP();

}