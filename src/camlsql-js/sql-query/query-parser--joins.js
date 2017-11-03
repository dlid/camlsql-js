
function extractJoinPart(workingObject) {
  var query = workingObject.query,
      joins = [],
      listName,
      t, 
      i,
      m; 
 
      do {
        m = query.match(/\s+(left\s+|)join\s+(.+?)\s+on\s(.+?)\.([a-zA-Z_\d]+)(\s|$)/i);
        if (m) {
            var alias = formatFieldName(m[2]),
                onTable1 = m[3],
                onField1 = m[4],
                onTable2 = m[5],
                onField2 = m[6];
      
            joins.push({
              inner : trim(m[1]) == "",
              alias : alias,
              childTable : onTable1,
              childField : onField1
            });
            query = query.substr(0, m.index) + " " + query.substr(m.index + m[0].length) + m[5];
        }
      } while (m);

      workingObject.joins = joins;
      workingObject.query = query;

    //multipel
    //camlsql.prepare("SELECT * FROM [Books] left join AuthorList as book_author ON book_author.Id = Books.Author join Cities as author_cities on book_author.City = author_cities.id ", [camlsql.user(14)]).getXml()

/*

 SELECT *, FavCheese.Title AS CheeseFullName FROM TestList
           LEFT JOIN Cheese AS FavCheese ON TestList.Lookup_x0020_Single

<View>
  <Joins>
   <Join Type="LEFT" ListAlias="FavCheese">
     <Eq>
      <FieldRef Name="Lookup_x0020_Single" RefType="Id" />
      <FieldRef List="APA" Name="ID" />
     </Eq>
   </Join>
 </Joins>
 <ProjectedFields>
  <Field Name="CheeseFullName" Type="Lookup" List="APA" ShowField="Title" />
 </ProjectedFields>
</View>

-----------------


working nicely

<View>

 <Joins>
  <Join Type="INNER" ListAlias="FavCheeseList">
   <Eq>
    <FieldRef Name="FavCheese" RefType="Id" />
    <FieldRef List="FavCheeseList" Name="ID" />
   </Eq>
  </Join>
  <Join Type="INNER" ListAlias="WorstCheeseList">
   <Eq>
    <FieldRef Name="WorstCheese" RefType="Id" />
    <FieldRef List="WorstCheeseList" Name="ID" />
   </Eq>
  </Join>
 </Joins>

 <ProjectedFields>
  <Field Name="FavCheeseName" Type="Lookup" List="FavCheeseList" ShowField="Title" />
  <Field Name="WorstCheeseName" Type="Lookup" List="WorstCheeseList" ShowField="Title" />
  <Field Name="WorstCheeseBabyName" Type="Lookup" List="WorstCheeseList" ShowField="BabyName" />
 </ProjectedFields>
 <ViewFields>
  <FieldRef Name="Title" />
  <FieldRef Name="FavCheeseName" />
  <FieldRef Name="WorstCheeseName" />
  <FieldRef Name="WorstCheeseBabyName" />
</ViewFields>
 <Query><Where>
  <Eq>
   <FieldRef Name="WorstCheeseBabyName" />
   <Value Type="Text">maeh</Value>
  </Eq>
 </Where></Query>

</View>


*/



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