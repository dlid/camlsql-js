
var XML_FIELD_VIEW = 'View',
    XML_FIELD_VIEWFIELDS = 'ViewFields',
    XML_FIELD_FIELDREF = 'FieldRef',
    XML_ELEMENT_QUERY = "Query",
    XML_ELEMENT_ORDERBY = 'OrderBy',
    XML_ELEMENT_WHERE = 'Where',
    XML_ELEMENT_ISNULL = "IsNull",
    XML_ELEMENT_ISNOTNULL = "IsNotNull";

function CamlXmlBuilder(query) {
  var viewXml ="",
      parsedQuery = query.$options.parsedQuery,
      parameters = query.$options.parameters,
      i,
      log = {
        errors : []
      };
  // remember https://yieldreturnpost.wordpress.com/2012/10/26/caml-query-utc-date-comparisons-in-sharepoint/
  // <Value Type='DateTime' IncludeTimeValue='TRUE' StorageTZ='TRUE'>
  //    2012-10-24T21:30:46Z
  //  </Value>



  viewXml += createViewFieldsElement(parsedQuery.fields);
  viewXml += createQueryElement(parsedQuery.statements, parsedQuery.sort, parameters, log);
  

  if (viewXml) {
    viewXml = xmlBeginElement(XML_FIELD_VIEW, {Scope : parsedQuery.viewScope}) + viewXml + xmlEndElement('View');
  }

  console.log("query", query);

  return {
    xml : viewXml,
    errors : null
  };

}

function createOrderByElement(sort) {
  var xml = "";
  if (sort.length > 0) {
    xml+=xmlBeginElement(XML_ELEMENT_ORDERBY);
    for (var i=0; i < sort.length; i++) {
      xml += xmlBeginElement(XML_FIELD_FIELDREF, {
        Name : sort[i][0],
        Type : sort[i][2] ? sort[i][2] : null,
        Ascending : !sort[i][1] ? 'False' : null
      },true);
    }
    xml+=xmlEndElement(XML_ELEMENT_ORDERBY);
  }

  return xml;
}

/**
 * 
 * https://msdn.microsoft.com/en-us/library/office/ms471093.aspx
 * @param  {[type]} statements [description]
 * @param  {[type]} sort       [description]
 * @param  {[type]} parameters [description]
 * @param  {[type]} log        [description]
 * @return {[type]}            [description]
 */
function createQueryElement(statements, sort, parameters, log) {
  console.warn("CREATE QUERY ELEMENT", statements, parameters);
  var xml = "";

  if (statements.length > 0 || sort.length > 0) {
    xml += xmlBeginElement(XML_ELEMENT_QUERY);
    if (statements.length > 0) {
      xml += xmlBeginElement(XML_ELEMENT_WHERE);
      xml += createAndOrFromStatements(statements, parameters, log);
      xml += xmlEndElement(XML_ELEMENT_WHERE);
    }
    xml += createOrderByElement(sort, parameters, log);
    // Groupby should go here?
    xml += xmlEndElement(XML_ELEMENT_QUERY);
  }
  return xml;
}

  function createAndOrFromStatements(items, parameters, log) {

   var xml = "";
   if (!items) return "";
   if (items.length > 1) {
     var operatorElement = items[1].operator == "and" ? "And" : "Or";
     // item 0 + 1 goes here
     xml += createStatementXml(items[0], parameters, log);
     xml += createAndOrFromStatements(items.slice(1), parameters, log);
     return "<"+operatorElement+">" + xml + "</"+operatorElement+">";
   } else if (items.length == 1) {
    xml += createStatementXml(items[0], parameters, log);
    
   }
   return xml;
  }


  function createStatementXml(statement, parameters, log) {
    var xml = "", param, comparison = statement.comparison, elementName;
    if (statement.type == "statement") {
      param = parameters[statement.macro];

      var simpleMappings = {'eq' : 'Eq', 'gt' : 'Gt', 'gte' : 'Geq', 'lte' : 'Leq', 'lt' : 'Lt', 'ne' : 'Neq'};

      if (typeof simpleMappings[comparison] !== "undefined") {
        if (typeof param === "undefined")
          throw "[camlsql] Parameter is not defined " +  statement.macro;
        xml+=xmlBeginElement(simpleMappings[comparison]);
        xml+=createFieldRefValue(statement, param);
        xml+=xmlEndElement(simpleMappings[comparison]);
      } else if (comparison == "null") {
        xml+=xmlBeginElement(XML_ELEMENT_ISNULL);
        xml+=createFieldRefValue(statement);
        xml+=xmlEndElement(XML_ELEMENT_ISNULL);
      } else if (comparison == "notnull") {
        xml+=xmlBeginElement(XML_ELEMENT_ISNOTNULL);
        xml+=createFieldRefValue(statement);
        xml+=xmlEndElement(XML_ELEMENT_ISNOTNULL);
      } else if (comparison == "like") {
        if (typeof param === "undefined")
          throw "[camlsql] Parameter is not defined " +  statement.macro;
        elementName = getXmlElementForLikeStatement(param.value);
        xml+=xmlBeginElement(elementName);
        xml+=createFieldRefValue(statement, param);
        xml+=xmlEndElement(elementName);
      }

    } else {
      xml += createAndOrFromStatements(statement.items, parameters, log);
    }
    return xml;
  }

  function getXmlElementForLikeStatement(text) {
    var elementName = "Contains",
      paramValue = null;
    if (text.indexOf('%') === 0 && text[text.length-1] === "%") {
      paramValue = text.replace(/^%?|%?$/g, '');
    } else if (text.indexOf('%') === 0) {
      throw "[casql] SharePoint does not support an 'EndsWith' statement: " + text;
    } else if (text.indexOf('%') === text.length -1) {
      paramValue = text.replace(/%?$/, '');
      elementName = "BeginsWith";
    }
    return elementName;
  }

  function createFieldRefValue(statement, parameter, isWhereClause) {
    var xml = "";

    xml += xmlBeginElement(XML_FIELD_FIELDREF, { Name : statement.field }, true);

    if (parameter) {
      if (statement.comparison == "in") {
        xml = "<In>x</In>";
      } else {
        xml += creatValueElement(statement, parameter);
      }
    }
    return xml;
  }


  function creatValueElement(statement, parameter) {
    console.warn("creatValueElement", statement, parameter);
    var xml = "",
        innerXml = "",
        valueAttributes = {
          Type : parameter.type
        };

    if (parameter.type == "DateTime") {
      valueAttributes.IncludeTimeValue = parameter._includeTime ? 'True' : null;
      
      if (parameter.today === true) {
        innerXml = "<Today />";
      } else if (parameter.isNow === true) {
        innerXml = "<Now />";
      } else {
        valueAttributes.StorageTZ = parameter._storageTZ ? 'True' : null;
        if (parameter.stringValue) {
          innerXml = encodeHTML(parameter.stringValue);
        } else {
          innerXml = parameter.value.toISOString();
        }
      }
    } else if (parameter.type == "Text") {
      if (parameter.multiline == true) {
        innerXml = "<![CDATA[" + encodeHTML(parameter.value) + "]]>";
      } else {
        innerXml = encodeHTML(parameter.value);
      }
    } else if (parameter.type == "Number") {
      innerXml = parameter.value;
    } else {
      innerXml = xmlBeginElement('NotImplemented',{}, true);
    }

    xml += xmlBeginElement('Value', valueAttributes);
    xml += innerXml;
    xml += xmlEndElement('Value');
    return xml;
  }

function createViewFieldsElement(fields) {
  var xml = "", i;
  if (fields.length > 0) {
    xml += xmlBeginElement(XML_FIELD_VIEWFIELDS);
    for (i = 0; i < fields.length; i++) {
      xml += xmlBeginElement(XML_FIELD_FIELDREF, {Name : fields[i]}, true);
    }
    xml += xmlEndElement(XML_FIELD_VIEWFIELDS);
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