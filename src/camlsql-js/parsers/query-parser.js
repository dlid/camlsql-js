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

  var orderByString,
  limitString,
  limitOffset = 0,
  limitRows = -1,
  workingObject = {
    query : query,
    rowLimit : 0,
    fields : [],
    sort : [],
    viewScope : null,
    macros : [],
    statements : []
  },
  where;

  // The extract-parts functions will update the working object accordingly
  extractScopePart(workingObject);
  extractLimitPart(workingObject);
  extractOrderByPart(workingObject);
  extractListAndFieldNameParts(workingObject);

  // Parse the remaining part of the query - the WHERE statement
  where = WhereParser(workingObject.query);
  workingObject.statements = where.statements;
  workingObject.macros = where.macros;

  // Reset to the original query
  workingObject.query = query;

  return workingObject;

      // return {
      //   listName : listName,
      //   viewFields : fields,
      //   where : w.statements,
      //   macroType : w.macroType,
      //   macroCount : w.macroCount,
      //   macros : w.macros,
      //   sort : OrderByParser(orderByString, quiet),
      //   limit : {
      //     offset : limitOffset,
      //     rowLimit : limitRows
      //   }
      // };
    }
