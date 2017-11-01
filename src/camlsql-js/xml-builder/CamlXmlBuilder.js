
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
  },
  n = 0;

  parsedQuery.uuid = function(prefix) {
    n++;
    return prefix + n;
  }
  // remember https://yieldreturnpost.wordpress.com/2012/10/26/caml-query-utc-date-comparisons-in-sharepoint/
  // <Value Type='DateTime' IncludeTimeValue='TRUE' StorageTZ='TRUE'>
  //    2012-10-24T21:30:46Z
  //  </Value>

  viewXml += createQueryElement(parsedQuery, parsedQuery.statements, parsedQuery.sort, parameters, log);
  viewXml += createJoinElement(parsedQuery.listName, parsedQuery.joins);
  viewXml += createProjectedFieldsElement(parsedQuery.projectedFields, parsedQuery.joins);
  viewXml += createViewFieldsElement(parsedQuery.fields);
  viewXml += createRowLimitFieldsElement(parsedQuery.rowLimit);
  

  if (viewXml) {
    viewXml = xmlBeginElement(XML_FIELD_VIEW, {Scope : parsedQuery.viewScope}) + viewXml + xmlEndElement('View');
  }

 // console.log("query", query);
 
 return {
  xml : viewXml,
  errors : null
};

}
 
function createRowLimitFieldsElement(rowLimit) {
  var xml = "";
  if (rowLimit > 0) {
    xml+=xmlBeginElement('RowLimit');
    xml+=rowLimit;
    xml+=xmlEndElement('RowLimit');
  }
  return xml;
}

function createProjectedFieldsElement(projectedFields, joins) {
  var xml = "",i,tableAliases = [];
  if (projectedFields.length > 0 && joins.length > 0) {
    xml += xmlBeginElement("ProjectedFields");
    for (i=0; i < joins.length; i++)
      tableAliases.push(joins[i].alias);

    for (i=0; i < projectedFields.length; i++) {

      if ( tableAliases.indexOf(projectedFields[i].list) == -1 )
        throw "[camlsql] Uknown list alias: " + projectedFields[i].list;

      xml += xmlBeginElement("Field", {
        Name : projectedFields[i].name,
        List : projectedFields[i].list,
        Type : 'Lookup',
        ShowField : projectedFields[i].field
      }, true);
    }

    xml += xmlEndElement("ProjectedFields");
  }

  return xml;
}

function createJoinElement(listName, joins) {
  var xml = "",i;
  if (joins.length > 0) {
    xml += xmlBeginElement("Joins");

    for (i = 0; i < joins.length; i++) {
      xml += xmlBeginElement("Join", {ListAlias : joins[i].alias});

      xml += xmlBeginElement("Eq");
      xml += xmlBeginElement("FieldRef", { 
        List : joins[i].childTable != listName ? joins[i].childTable : null,
        Name : joins[i].childField, RefType : 'Id' 
      }, true);
      xml += xmlBeginElement("FieldRef", { List : joins[i].alias, Name : 'Id' }, true);
      xml += xmlEndElement("Eq");

      xml += xmlEndElement("Join");
    }
   //  <FieldRef Name="Lookup_x0020_Single" RefType="Id" />
  //    <FieldRef List="APA" Name="ID" />

  xml += xmlEndElement("Joins");
}
return xml;
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
 function createQueryElement(parsedQuery, statements, sort, parameters, log) {
  var xml = "";
console.log("PARSED", parsedQuery, parameters);
  if (statements.length > 0 || sort.length > 0) {
    xml += xmlBeginElement(XML_ELEMENT_QUERY);
    if (statements.length > 0) {
      xml += xmlBeginElement(XML_ELEMENT_WHERE);
      xml += createAndOrFromStatements(parsedQuery, statements, parameters, log);
      xml += xmlEndElement(XML_ELEMENT_WHERE);
    }
    xml += createOrderByElement(sort, parameters, log);
    // Groupby should go here?
    xml += xmlEndElement(XML_ELEMENT_QUERY);
  }
  return xml;
}

function createAndOrFromStatements(parsedQuery, items, parameters, log) {

 var xml = "";
 if (!items) return "";
 if (items.length > 1) {
   var operatorElement = items[1].operator == "and" ? "And" : "Or";
     // item 0 + 1 goes here
     xml += createStatementXml(parsedQuery, items[0], parameters, log);
     xml += createAndOrFromStatements(parsedQuery, items.slice(1), parameters, log);
     return "<"+operatorElement+">" + xml + "</"+operatorElement+">";
   } else if (items.length == 1) {
    xml += createStatementXml(parsedQuery, items[0], parameters, log);
    
  }
  return xml;
}


function createStatementXml(parsedQuery, statement, parameters, log) {
  var xml = "", param, comparison = statement.comparison, elementName;
  if (statement.type == "statement") {
    param = parameters[statement.macro];

    var simpleMappings = {'eq' : 'Eq', 'gt' : 'Gt', 'gte' : 'Geq', 'lte' : 'Leq', 'lt' : 'Lt', 'ne' : 'Neq'};

    if (typeof simpleMappings[comparison] !== "undefined") {
      if (typeof param === "undefined")
        throw "[camlsql] Parameter is not defined " +  statement.macro;
      xml+=xmlBeginElement(simpleMappings[comparison]);
      xml+=createFieldRefValue(parsedQuery, statement, param);
      xml+=xmlEndElement(simpleMappings[comparison]);
    } else if (comparison == "null") {
      xml+=xmlBeginElement(XML_ELEMENT_ISNULL);
      xml+=createFieldRefValue(parsedQuery, statement);
      xml+=xmlEndElement(XML_ELEMENT_ISNULL);
    } else if (comparison == "notnull") {
      xml+=xmlBeginElement(XML_ELEMENT_ISNOTNULL);
      xml+=createFieldRefValue(parsedQuery, statement);
      xml+=xmlEndElement(XML_ELEMENT_ISNOTNULL);
    } else if (comparison == "like") {
      if (typeof param === "undefined")
        throw "[camlsql] Parameter is not defined " +  statement.macro;
      elementName = getXmlElementForLikeStatement(param.value);
      xml+=xmlBeginElement(elementName);
      xml+=createFieldRefValue(parsedQuery, statement, param);
      xml+=xmlEndElement(elementName);
    }

  } else {
    xml += createAndOrFromStatements(parsedQuery, statement.items, parameters, log);
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

function createFieldRefValue(parsedQuery, statement, parameter, isWhereClause) {
  var xml = "", LookupId = null, i, fieldName = statement.field;

  if (parameter) {
    if (parameter.lookupid) {
      LookupId = "True";
    }
  }

  if (statement.field.indexOf('.') !== -1) {
    var x = statement.field.split('.'),
    notProjected = true,
    notJoined = true;

    for (i=0; i < parsedQuery.projectedFields.length; i++) {
      if (parsedQuery.projectedFields[i].list == formatFieldName(x[0]) && parsedQuery.projectedFields[i].field == formatFieldName(x[1])) {
        fieldName = parsedQuery.projectedFields[i].name;
        notProjected = false;
      }
    }

    if (notProjected) {

      for (i=0; i < parsedQuery.joins.length; i++) {
        if (parsedQuery.joins[i].alias == x[0]) {
          notJoined = false;
          break;
        }
      }

      if (notJoined) throw "[camlsql] Unknown list alias in where clause: " + x[0];

      if (parsedQuery.fields.length == 0) {
        throw "[camlsql] The projected field '" + statement.field + "' must be explicitly included in the query";
      } else {
        fieldName = parsedQuery.uuid('camlsqlfld_');
          // Add a projected field for this one... 
          parsedQuery.projectedFields.push({
            list : x[0],
            field : x[1],
            name : fieldName
          });
          parsedQuery.fields.push(fieldName);
        }
      }


    }
    
    xml += xmlBeginElement(XML_FIELD_FIELDREF, { Name : fieldName, LookupId : LookupId }, true);

    if (parameter) {
      if (statement.comparison == "in") {
        xml = "<In>x</In>";
      } else {
        xml += creatValueElement(statement, parameter);
      }
    }
    return xml;;
  }

  function creatValueElement(statement, parameter) {
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
    // } else if (parameter.type == "Url") {
    //     innerXml = encodeHTML(parameter.value);
  } else if (parameter.type == "Text") {
    if (parameter.multiline == true) {
      innerXml = "<![CDATA[" + encodeHTML(parameter.value) + "]]>";
    } else {
      innerXml = encodeHTML(parameter.value);
    }
  } else if (parameter.type == "Number") {
    innerXml = parameter.value;
  } else if (parameter.type == "User") {
    if (typeof parameter.value === "number") {
      valueAttributes.Type = "Number";
      valueAttributes.LookupId = 'True';
      innerXml = encodeHTML(parameter.value + "");
    } else {
      valueAttributes.Type = "Number";
      innerXml = "<UserID />";
    } 
  } else if (parameter.type == "Lookup") {
    if (parameter.byId == true) valueAttributes.LookupId = 'True';
    innerXml = encodeHTML(parameter.value + "");
  } else if (parameter.type == "Boolean") {
    innerXml = parameter.value ? 1 : 0;
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

      if (!fields[i].match(/^[a-zA-Z_\d]+$/i))
        throw "[camlsql] Invalid syntax: " + fields[i];

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