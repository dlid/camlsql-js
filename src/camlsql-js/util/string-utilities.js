
/**
 * Add zero padding to a string
 * @param  {string} str The string to pad
 * @param  {number} size The number of zeros yo want
 * @return {string} The padded string
 */
function padString(str, size) {
  var s = String(str);
  while (s.length < (size || 2)) {s = "0" + s;}
  return s;
}

/**
 * Encode a string to it's SharePoint Internal field representation
 */
function encodeToInternalField(str) {
 var i,c,n = "";
 for (i=0; i < str.length; i++) {
  c = encodeURIComponent(str[i]);
  if (c.indexOf('%') == 0) {
   n += "_x" + ("0000" + str.charCodeAt(i).toString(16)).slice(-4) + "_"
  } else if (c == ' ') {
   n += "_x0020_";
  } else if( c== '.') {
   n += "_x002e_";
  } else {
   n += c;
  }
 }
 return n.length > 32 ? n.substr(0,32) : n;
}

/**
 * HTML Encode a string for use in the XML
 * @param  {string} stringToEncode The string to encode
 * @return {string}                The encoded string
 */
function encodeHTML(stringToEncode) {
  if (typeof stringToEncode !== "string") return stringToEncode;
  return stringToEncode.replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
 

/**
 * Strip spaces from around a string
 * @param  {string} str String to trim
 * @return {string}     The trimmed string
 */
function trim(str) {
 return str.replace(/^\s+|\s+$/g, '');
}

/**
 * Trim and remove any surrounding [] from the string
 * @param  {string} name The field name
 * @return {string}      The fixed field name
 */
function formatFieldName(name) {
 return trim(name).replace(/^\[|\]$/g, '');
}
