 /**
 * The parsed query
 * @typedef {Object} CamlSql~ParsedQuery
 * @property {string} query - The query to parse
 * @property {string} listName - The name of the list
 * @property {Array.<CamlSql~Condition>} statements - A list of where conditions
 * @property {number} rowLimit - The max returned number of rows
 * @property {string} viewScope - The selected ViewScope
 * @property {Array.<Array<string>>} sort - An ordered list of sorting options (field, ascending, datatype)
 * @property {Array.<string>} macros - The list of macros in the where statement
 */

/**
 * Will attempt to parse a SQL string into objects
 * @param {[type]} query The "SQL" string to parse
 * @return {CamlSql~ParsedQuery} The parsed result
 */
 function parseSqlQuery(query, quiet) {

  var workingObject = {
    query : query,
    rowLimit : 0,
    fields : [],
    sort : [],
    joins : [],
    viewScope : null,
    macros : [],
    statements : [],
    parameters : [],
    listName : null,
    projectedFields : [],
    group : null,
    encoded : {} // Contains a list of encoded values so they can be decoded later
  },
  where;

  // The extract-parts functions will update the working object accordingly
  extractNamesToEncode(workingObject);
  extractScopePart(workingObject);
  extractLimitPart(workingObject);
  extractOrderByPart(workingObject);
  extractGroupByPart(workingObject);
  extractJoinPart(workingObject);
  extractListAndFieldNameParts(workingObject);


  // Parse the remaining part of the query - the WHERE statement
  where = WhereParser(workingObject.query);
  workingObject.statements = where.statements;
  workingObject.macros = where.macros;

  // Reset to the original query
  workingObject.query = query;

  // console.log("query", workingObject);

  return workingObject;
}

/**
 * This will look for text within [ and ] and encode it using the camlsql.encode method
 * @param  {[type]} workingObject [description]
 * @return {[type]}               [description]
 */
function extractNamesToEncode(workingObject) {
  var query = workingObject.query,i,counter = 0,startIndex = null,
      match, encoded, normalized,
      newQuery = query;

  for (i=0; i < query.length; i++) {
    if (query[i] == "[") {
      counter++;
      if (startIndex === null) startIndex = i;
    } else if (query[i] == "]") {
      counter--;
      if (counter == 0) {
        match = query.substring( startIndex, i+1 );
        normalized = match.substring(1, match.length-1);
        encoded = encodeToInternalField(normalized);
        newQuery = newQuery.replace(match, encoded);
        startIndex = null;
        workingObject.encoded[encoded] = match.substring(1, match.length-1);
      }
    }
  }
  workingObject.query = newQuery;
}