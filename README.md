# camlsql

Create CAML XML using SQL-like syntax. 

[![Build Status](https://travis-ci.org/dlid/camlsql-js.svg?branch=master)](https://travis-ci.org/dlid/camlsql-js)

-------

***NOTE*** For now, camlsql is limited to querying lists.

------

## Parametermethods
### camlsql.text()
### camlsql.number()
### camlsql.guid()
### camlsql.datetime()
### camlsql.lookup()
### camlsql.today()
### camlsql.month()
### camlsql.url()
### camlsql.multichoice()
### camlsql.membership()
### camlsql.userid()

## Introduction

`camlsql` is my attempt to create SharePoint [CAML](https://msdn.microsoft.com/en-us/library/office/ms426449.aspx) queries using a syntax I am more familiar with: SQL.

Of course the features are nowhere close to an actual SQL language, but I believe it will simplify most common queries.

```
var query = new camlsql("SELECT * FROM ListName WHERE [Title] = ?",  ["Hello"] );
console.log(query.getXml());

// Result:
<View>
    <Query>
        <Where>
            <Eq>
                <FieldRef Name="Title" />
                <Value Type="Text">hello</Value>
            </Eq>
        </Where>
    </Query>
</View> 
```

LIKE statements supporting CONTAINS and BeginsWith (EndsWith is not supported in SharePoint).

```
var query = new camlsql("SELECT Title, ImageUrl FROM ListName WHERE [Title] LIKE ?",  ["%Hello%"] );
console.log(query.getXml());

// Result:
<View>
    <ViewFields>
        <FieldRef Name="Title" />
        <FieldRef Name="ImageUrl" />
    </ViewFields>
    <Query>
        <Where>
            <Contains>
                <FieldRef Name="Title" />
                <Value Type="Text">hello%</Value>
            </Contains>
        </Where>
    </Query>
</View> 
```

More complex queries with groups and OR statements

```
var query = new camlsql("SELECT Title, ImageUrl FROM List WHERE Title LIKE ? AND ([StartDate] is null or [StartDate] >= ?)", 
  [
   'test%', 
   camlsql.today()
  ]);

console.log(query.getXml());
// Result
<View>
    <ViewFields>
        <FieldRef Name="Title" />
        <FieldRef Name="ImageUrl" />
    </ViewFields>
    <Query>
        <Where>
            <And>
                <BeginsWith>
                    <FieldRef Name="Title" />
                    <Value Type="Text">test</Value>
                </BeginsWith>
                <Or>
                    <IsNull>
                        <FieldRef Name="StartDate" />
                    </IsNull>
                    <Geq>
                        <FieldRef Name="StartDate" />
                        <Value Type="DateTime">
                            <Today />
                        </Value>
                    </Geq>
                </Or>
            </And>
        </Where>
    </Query>
</View> 
```
