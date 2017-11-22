  /**
   * These are the methods that should be public in the camlsql object
   * @type {Object}
   */
  publicData = {
    prepare : function(query, param) {
      return new CamlSqlQuery(query, param);
    },
    boolean : createBooleanParameter,
    date : createDateParameter,
    datetime : createDateTimeParameter,
    encode : encodeToInternalField,
    membership : createMembershipParameter,
    lookup : createLookupParameter,
    number : createNumberParameter,
    guid : createGuidParameter,
    text : createTextParameter,
    today : createTodayParameter,
    user : createUserParameter
  }; 
  