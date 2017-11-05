function CamlSqlQuery(query, param) {
    
    var currentQuery = this;

 
    var parameters = parseParameters(param);

    this.exec = function(options) {
      var args = Array.prototype.slice.call(arguments),
          spWeb,
          execCallback,
          result,
          rawXml = typeof options !== "undefined" ? options.rawXml : null;

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

      executeSPQuery({
        query : this,
        callback : execCallback,
        spWeb : spWeb,
        rawXml : rawXml
      });

      return this;
    };
    
    function getXml(isExec) {
      var builder = new CamlXmlBuilder(currentQuery, isExec);
      return builder.xml;
    }

    function getListName() {
      var parsed = currentQuery.$options.parsedQuery;
      if (parsed.listName && parsed.encoded[parsed.listName])
        return parsed.encoded[parsed.listName];
      return parsed.listName;
    }

    this.getListName = getListName;
    this.getXml = getXml;
    this.$options = {
      parsedQuery : parseSqlQuery(query),
      parameters : parameters
    };

  }
