
// var ParameterBase = {

// };

function parseParameters(param) {
  var i, newParam = {}, p, keys;
  if (param && param.length > 0) {
   for (i=0; i < param.length; i++) {
     p = parseParameter(param[i]);
     if (p) {
      newParam["@param" + i] = p;
     }
   }
 } else if (typeof param === "object") {
    keys = Object.keys(param);
    for (i=0; i < keys.length; i++) {
      if (keys[i].indexOf('@') === 0) {
        p = parseParameter(param[keys[i]]);
        if (p) {
          newParam[keys[i]] = p;
        }
      }
    }
 }
 return newParam;
}

function parseParameter(parameter) {
  var ret = null, i;
  if (parameter == null) return null;
  if (parameter!==null && parameter.constructor === Array) {
   ret = [];
   for (i=0; i < parameter.length;i++) {
     ret.push(parseParameter(parameter[i]));
   }
 } else if (typeof parameter === "string") {
   ret = createTextParameter(parameter);
 } else if (typeof parameter === "boolean") {
   ret = createBooleanParameter(parameter);
 } else if (typeof parameter == "number") {
   ret = createNumberParameter(parameter);
 } else if (typeof parameter.getMonth === 'function') {
    ret = createDateTimeParameter(parameter);
 } else if (typeof parameter == "object" && parameter.type !== "undefined") {
   return parameter;
 }
 return ret;
}