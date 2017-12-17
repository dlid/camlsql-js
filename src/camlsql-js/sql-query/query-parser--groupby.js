/**
 * Parse the GROUP BY string
 */
function extractGroupByPart(workingObject, quiet) {
    var groupByString,
        m,
        query = workingObject.query,
        re = new RegExp("([a-zA-Z_\\d]+?)(\\s|$)", "ig");
      if ((m = query.match(/\sGROUP\sBY\s+([a-zA-Z_\d]+?)(\s+|$)/i))) {
        workingObject.query =  query.substr(0, m.index) + " " + query.substr(m.index + m[0].length) + m[2] ;
        workingObject.group = {
            field : formatFieldName(m[1]),
            collapse : false
        };
      }
} 