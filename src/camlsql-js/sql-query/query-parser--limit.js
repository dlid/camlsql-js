function extractLimitPart(workingObject) {
  var match, limitString;
  //console.log("WOBJ", workingObject);
  if ((match = workingObject.query.match(/\sLIMIT\s+(.*?)(\s.*$|$)/i))) {
    if (!match[1].match(/^\d+$/))
      throw "[camlsql] LIMIT value must be a number";
    if (match[1] == "0")
      throw "[camlsql] LIMIT value can not be 0";
    workingObject.query = workingObject.query.substr(0, workingObject.query.length - match[0].length );
    workingObject.rowLimit = parseInt(match[1], 10);
  }
} 