function extractScopePart(workingObject) {
  var m, query = workingObject.query, scope;
    if ((m = query.match(/^(select\s+)(scope\s+([a-z]+)\s+)/i))) {
      m[3] = m[3].toLowerCase();
      switch(m[3]) {
        case "defaultvalue": scope = "DefaultValue"; break;
        case "recursive": scope = "Recursive"; break;
        case "recursiveall": scope = "RecursiveAll"; break;
        case "filesonly": scope = "FilesOnly"; break;
      }
      if (!scope && console.error) throw "[camlsql] Unknown scope '" + m[3] + "'";
      if (typeof scope !== "undefined") {
        workingObject.viewScope = scope;
      }
      workingObject.query = m[1] + query.substr(m[1].length + m[2].length);
    } else {
      workingObject.viewScope = null;
    }
}