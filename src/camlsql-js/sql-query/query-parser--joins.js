
function extractJoinPart(workingObject) {
  var query = workingObject.query,
      joins = [],
      listName,
      t, 
      i,
      m = query.match(/\s+(left\s+|)join\s+(.+?)\s+as\s+([a-zA-Z_\d]+)\son\s(.+?)\.([a-zA-Z_\d]+)\s+=\s+(.+?)\.([a-zA-Z_\d]+?)(\s|$)/i);
 
  
      if (m) {
          var joinTable = m[2],
              alias = m[3],
              onTable1 = m[4],
              onField1 = m[5],
              onTable2 = m[6],
              onField2 = m[7];

          joins.push({
            inner : trim(m[1]) == "",
            listName : joinTable,
            alias : alias,
            table1 : onTable1,
            field1 : onField1,
            table2 : onTable2,
            field2 : onField2
          });
      }

      console.warn("JOIN", joins);

    //multipel
    //camlsql.prepare("SELECT * FROM [Books] left join AuthorList as book_author ON book_author.Id = Books.Author join Cities as author_cities on book_author.City = author_cities.id ", [camlsql.user(14)]).getXml()
      

  // if (m) {
  //   if (m.length == 4) {
  //     fields = parseFieldNames(m[1]);
  //     for (i=0; i < fields.length; i++) {
  //       if (!fields[i].match(/^[a-z:A-Z_\\d]+$/)) {
  //         if (console.warn) console.warn("[camlsql] Doubtful field name: " + fields[i]);
  //       }
  //     }
  //     workingObject.fields = fields;
  //     workingObject.listName = formatFieldName(m[2]);
  //     workingObject.query = m[3];
  //   } else {
  //     workingObject.query = "";
  //   }
  // }
}