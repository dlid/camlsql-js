
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
   n += "_x" + ("0000" + str.charCodeAt(i).toString(16)).slice(-4) + "_";
  } else if( c== '.') {
   n += "_x002e_";
  } else if( c== '(') {
   n += "_x0028_";
  } else if( c== ')') {
   n += "_x0029_";
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
 return trim(name).replace(/^[\[\(]|[\]\)]$/g, '');
}

/**
 * Trim away extra parenthesis around a string
 *
 *  '(hello world)' => hello world
 *  'hi (and everything)' => hi (and everything)
 *  '((field1 = 2) and field2 = 3)' => (field1 = 2) and field2 = 3
 * @param  {[type]} str [description]
 * @return {[type]}     [description]
 */
 function trimParanthesis(str) {
    var i=0, pIndex = -1, op = 0;
    str = trim(str);
    if (str.length > 1) {
        if (str[0] == "(" && str[str.length-1] == ")") {
            for (i=0; i < str.length; i++) {
                if (str[i] == "(") {
                    op ++;
                } else if (str[i] == ")") {
                    op --;
                    if (op == 0 && i == str.length-1) {
                        return trimParanthesis(str.substring(1, str.length-1));
                    } else if (op==0) {
                        break;
                    }
                }
            }
        } 
    }
    return str;
 }