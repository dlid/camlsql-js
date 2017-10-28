function extractLimitPart(workingObject) {
  var match, limitString;
  if ((match = workingObject.query.match(/\sLIMIT\s(\d+).*$/i))) {
    workingObject.query = workingObject.query.substr(0, workingObject.query.length - match[0].length );
    workingObject.rowLimit = parseInt(match[1], 10);
  }
}