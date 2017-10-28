/**
 * Parse the ORDER BY string
 * @param {[type]} orderByString [description]
 * @param {[type]} quiet         [description]
 * @returns array [description]
 */
function extractOrderByPart(workingObject, quiet) {
    var orderValues = [],
        match,
        fieldName,
        dataType,
        orderByString,
        query = workingObject.query,
        asc,
        m,
        order,
        re = new RegExp("(\\[?[a-z:A-Z_\\d]+?\\]?)(\\,\\s+|\\s+asc|\\s+desc|$)", "ig");

      if ((m = query.match(/\sORDER\sBY\s(.*?)$/i))) {
        orderByString = m[1];
        query = query.substr(0, query.length - m[0].length );
      } else {
        return;
      }

    if (typeof orderByString !== "undefined" && orderByString !== null) {
        while ((match = re.exec(orderByString))) {
            asc = true;
            dataType = null;
            if (match[1].indexOf(':') > 0) {
                m = match[1].split(':');
                if (m.length == 2 && m[0].length > 0) {
                    m[0] = m[0].toLowerCase();
                    switch(m[0]) {
                        case "datetime": m[0] = "DateTime"; break;
                        case "text": m[0] = "Text"; break;
                        case "number": m[0] = "Number"; break;
                        case "datetime": m[0] = "DateTime"; break;
                    }
                    dataType = m[0];
                    match[1] = m[1];
                } else
                    return [];
            } else {
              if (console.error) console.error("[camlsql] Error in ORDER BY statement: " + match[1]);
            }
            fieldName = formatFieldName(match[1]);
            if (match.length == 3) {
                order = typeof match[2] !== "undefined" ? trim(match[2].toLowerCase()) : null;
                asc = order == "desc" ? false : true;
            }
            orderValues.push([fieldName, asc, dataType]);
        }
    }
    workingObject.sort = orderValues;
}