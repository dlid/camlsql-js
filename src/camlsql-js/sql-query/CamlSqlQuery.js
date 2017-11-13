function CamlSqlQuery(query, param) {
    
    var currentQuery = this,
        parameters = parseParameters(param),
        _spWeb = null;

    this.spWeb = function(spWeb) {
      _spWeb = spWeb;
      return this;
    };

    this.exec = function(execCallback) {
      var args = Array.prototype.slice.call(arguments),
          result;

      executeSPQuery({
        query : this,
        callback : execCallback,
        spWeb : _spWeb,
        rawXml : null
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
