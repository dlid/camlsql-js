
// var ParameterBase = {

// };

function parseParameters(param) {
  var i, newParam = {}, p;
  if (param && param.length > 0) {
   for (i=0; i < param.length; i++) {
     p = parseParameter(param[i]);
     if (p) {
      newParam["@param" + i] = p;
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
 } else if (typeof parameter == "number") {
   ret = createNumberParameter(parameter);
 } else if (typeof parameter == "object" && parameter.type !== "undefined") {
   return parameter;
 }
 return ret;
}