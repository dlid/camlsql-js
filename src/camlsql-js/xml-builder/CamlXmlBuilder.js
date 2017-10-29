
var XML_FIELD_VIEW = 'View',
    XML_FIELD_VIEWFIELDS = 'ViewFields',
    XML_FIELD_FIELDREF = 'FieldRef';

function CamlXmlBuilder(query) {
  var viewXml ="",
      parsedQuery = query.$options.parsedQuery,
      parameters = parsedQuery.$options, parameters,
      i;
  // remember https://yieldreturnpost.wordpress.com/2012/10/26/caml-query-utc-date-comparisons-in-sharepoint/
  // <Value Type='DateTime' IncludeTimeValue='TRUE' StorageTZ='TRUE'>
  //    2012-10-24T21:30:46Z
  //  </Value>



  viewXml += xmlBeginElement(XML_FIELD_VIEW, {Scope : parsedQuery.viewScope});
  viewXml += createViewFieldsElement(parsedQuery.fields);
  viewXml += createQueryElement(parsedQuery.statements, parameters)
  viewXml += xmlEndElement('View');


  console.log("query", query);

  return {
    xml : viewXml,
    errors : null
  };

}

function createQueryElement(statements, parameters) {
  console.warn("CREATE QUERY ELEMENT", statements, parameters);

  return "<Query />";
}

function createViewFieldsElement(fields) {
  var xml = "", i;
  if (fields.length > 0) {
    for (i = 0; i < fields.length; i++) {
      xml += xmlBeginElement(XML_FIELD_VIEWFIELDS);
      xml += xmlBeginElement(XML_FIELD_FIELDREF, {Name : fields[i]}, true);
      xml += xmlEndElement(XML_FIELD_VIEWFIELDS);
    }
  }
  return xml;
}



function xmlBeginElement(name, attributes, close) {
  var xml = "<" + name,
      keys = attributes ? Object.keys(attributes) : [],
      i;

  for (i = 0; i < keys.length; i++) {
    if (typeof attributes[keys[i]] !== "undefined" && attributes[keys[i]] !== null) {
      xml += ' ' + keys[i] + '="' + encodeHTML(attributes[keys[i]]) + '"';
    }
  }

  return xml + (close?' /':'') + ">";
}

function xmlEndElement(name) {
  return "</" + name + ">";
}