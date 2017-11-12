# Build your SQL

    SELECT
        [SCOPE {DEFAULTVALUE | RECURSIVE | RECURSIVEALL | FILESONLY}]
        field_name [, field_name ...]
        FROM list_name
        [ [LEFT] JOIN list_alias ON list_name.field_name [...]]
        [WHERE where_condition]
        [GROUP BY field_name]
        [ORDER BY [data_type:]field_name [ASC | DESC], ...]
        [LIMIT row_count]


## SCOPE

- Let you set the [View Scope](https://msdn.microsoft.com/en-us/library/microsoft.sharepoint.client.viewscope.aspx) for the query

```
SELECT SCOPE FilesOnly * FROM Pages;

<View Scope="FilesOnly">
...
</View>
```

## Field names

?> field_name<br>
[field_name]<br>
***ListAlias***.field_name


- Lets you specify the [ViewFields](https://msdn.microsoft.com/en-us/library/office/ms442073.aspx) of the query
- Wrap field names in [ and ] to **encode** them

```
SELECT Title, Created, [Hello there] FROM Pages;

<View>
    <ViewFields>
        <FieldRef Name="Title" />
        <FieldRef Name="Created" />
        <FieldRef Name="Hello_x0020_there" />
    </ViewFields>
</View>
```

If you are including a field from a joined list you must 

!> It's recommended that you only get the fields you actually need to lower the response footprint

## List Name

- The Title of the list you want to query
- This List Name is used in the [exec](camlsqlquery-object.md#exec-function) function
- Can be retreived later using the [getListName](camlsqlquery-object.md#getlistname-function) function

## Joins

?> [LEFT] JOIN ***list_alias*** ON ***list_name***.***field_name***

- Creates the [Joins](https://msdn.microsoft.com/en-us/library/office/ee535493.aspx) Element
- Let you join a list that is linked to the lookup field `field_name`
- The `list_alias` is your own alias of the list and does not have to be the actual list name
  - The correct list will be joined automatically via the specified Lookup field

In this example the list Books have a Lookup field named Author linked to the list called `Authors`. 

```
SELECT [Title]
FROM   [Books] 
JOIN   [AuthorList] ON [Books].Author

<View>
    <Joins>
        <Join ListAlias="AuthorList">
            <Eq>
                <FieldRef Name="Author" RefType="Id" />
                <FieldRef List="AuthorList" Name="Id" />
            </Eq>
        </Join>
    </Joins>
    <ViewFields>
        <FieldRef Name="Title" />
    </ViewFields>
</View>
```

### Including a field from the  joined list  {docsify-ignore}

After joining another list you can get field from that list into your result. Then you must include those fields in your query.

- These fields are called [ProjectedFields](https://msdn.microsoft.com/en-us/library/office/ee535502.aspx).
- These fields must be given an **alias** using the `AS` statement

````
SELECT [Title], [AuthorList].[Pseudonym] AS [AuthorPsuedonym]
FROM   [Books]
JOIN   [AuthorList] ON [Books].[Author]

<View>
 <Joins>
  <Join ListAlias="AuthorList">
   <Eq>
    <FieldRef Name="Author" RefType="Id" />
    <FieldRef List="AuthorList" Name="Id" />
   </Eq>
  </Join>
 </Joins>
 <ProjectedFields>
  <Field Name="AuthorPsuedonym" List="AuthorList" Type="Lookup" ShowField="Pseudonym" />
 </ProjectedFields>
 <ViewFields>
  <FieldRef Name="Title" />
  <FieldRef Name="AuthorPsuedonym" />
 </ViewFields>
</View>

````


### Querying a field from the joined list  {docsify-ignore}

**ProjectedFields** can be used in your `WHERE` statement. But you must specifically include the field in your View Fields.

```
SELECT [Title], [AuthorList].[Pseudonym] AS [AuthorPsuedonym]
FROM   [Books]
JOIN   [AuthorList] ON [Books].[Author]
WHERE  [AuthorList].[Pseudonym] IS NOT NULL");

<View>
 <Query>
  <Where>
   <IsNotNull>
    <FieldRef Name="AuthorPsuedonym" />
   </IsNotNull>
  </Where>
 </Query>
 <Joins>
  <Join ListAlias="AuthorList">
   <Eq>
    <FieldRef Name="Author" RefType="Id" />
    <FieldRef List="AuthorList" Name="Id" />
   </Eq>
  </Join>
 </Joins>
 <ProjectedFields>
  <Field Name="AuthorPsuedonym" List="AuthorList" Type="Lookup" ShowField="Pseudonym" />
 </ProjectedFields>
 <ViewFields>
  <FieldRef Name="Title" />
  <FieldRef Name="AuthorPsuedonym" />
 </ViewFields>
</View>

```

### Joining a second list {docsify-ignore}

- CAML will let you join lists via joined lists
- To do this using camlsql, use the same syntax as before
- Use the `ListAlias` of an already joined list and the *Lookup Field* on that list to join another list

Here we join the Author via the `Author` field in the `Books` list. And we join the city via the lookup field `City` in the `Authors` list.


```
SELECT [Title], [AuthorCity].[EnglishName] AS [EnglishCityName]
FROM   [Books] 
JOIN   [AuthorList] ON [Books].[Author]
JOIN   [AuthorCity] ON [AuthorList].[City]
WHERE  [AuthorCity].[EnglishName] IS NOT NULL

<View>
 <Query>
  <Where>
   <IsNotNull>
    <FieldRef Name="EnglishCityName" />
   </IsNotNull>
  </Where>
 </Query>
 <Joins>
  <Join ListAlias="AuthorList">
   <Eq>
    <FieldRef Name="Author" RefType="Id" />
    <FieldRef List="AuthorList" Name="Id" />
   </Eq>
  </Join>
  <Join ListAlias="AuthorCity">
   <Eq>
    <FieldRef List="AuthorList" Name="City" RefType="Id" />
    <FieldRef List="AuthorCity" Name="Id" />
   </Eq>
  </Join>
 </Joins>
 <ProjectedFields>
  <Field Name="EnglishCityName" List="AuthorCity" Type="Lookup" ShowField="EnglishName" />
 </ProjectedFields>
 <ViewFields>
  <FieldRef Name="Title" />
  <FieldRef Name="EnglishCityName" />
 </ViewFields>
</View>
```

## WHERE statement

## GROUP BY

## ORDER BY 

## LIMIT
