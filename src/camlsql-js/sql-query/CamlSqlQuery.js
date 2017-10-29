function CamlSqlQuery(query, param) {
    
    var currentQuery = this;

 
    var parameters = parseParameters(param);
    console.log("parameters", parameters);


    this.exec = function() {
      var args = Array.prototype.slice.call(arguments),
          spWeb,
          execCallback;

      if (args.length > 1) {
          if (typeof args[0] === "object") {
              spWeb = args[0];
              if (typeof args[1] == "function") {
                  execCallback = args[1];
              }
          }
      } else if (args.length == 1) {
          if (typeof args[0] === "object") {
              spWeb = args[0];
          } else if (typeof args[0] == "function") {
              execCallback = args[0];
          }
      }

      return executeSPQuery({
        query : this,
        callback : execCallback,
        spWeb : spWeb
      });
    };
    
    function getXml() {
      var builder = new CamlXmlBuilder(currentQuery);
      return builder.xml;
    }


    this.getXml = getXml;
    this.$options = {
      parsedQuery : parseSqlQuery(query),
      parameters : parameters
    };

  }
