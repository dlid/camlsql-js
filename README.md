# camlsql-js

[![Build Status](https://travis-ci.org/dlid/camlsql-js.svg?branch=master)](https://travis-ci.org/dlid/camlsql-js) [![codecov](https://codecov.io/gh/dlid/camlsql-js/branch/master/graph/badge.svg)](https://codecov.io/gh/dlid/camlsql-js)


## CSOM library for getting SharePoint List items SQL syntax

Camlsql will let you fetch SharePoint List Items using SQL syntax. It relies on an already existing SP ClientContext and is therefore very lightweight.

```
camlsql.prepare("SELECT * FROM Pages WHERE Title LIKE ? ORDER BY Modified DESC LIMIT 10", ["%hello%"])
 .exec(function(err, rows) {
  console.err(err);
  console.table(rows);
 });
```
 
### Features

- Lightweight - only 8 KB min+gz
- Generate CAML queries using SQL-like syntax
- No other dependencies than the SharePoint CSOM libraries

#### Supported queries

- [Field selection](https://github.com/dlid/camlsql-js/wiki/SQL-Test-Queries-----Field-Selection) as a comma separated list
- [AND/OR](https://github.com/dlid/camlsql-js/wiki/SQL-Test-Queries---AND---OR) syntax with groups
- [ORDER BY](https://github.com/dlid/camlsql-js/wiki/SQL-Test-Queries---ORDER-BY) to sort the result
- [LIMIT](https://github.com/dlid/camlsql-js/wiki/SQL-Test-Queries---LIMIT) to limit the number of rows returned
- [JOIN](https://github.com/dlid/camlsql-js/wiki/SQL-Test-Queries---JOIN) and query lookup lists

#### Supported types

 - [Text](https://github.com/dlid/camlsql-js/wiki/camlsql.text-method) using BeginsWith, Contains or Equals
 - NULL / IS NOT NULL
 - 


See more examples in the [SQL Test Queries](https://github.com/dlid/camlsql-js/wiki/SQL-Test-Queries) wiki page.


## This is not REST

This is a library only for fetching list data using CSOM and CAML queries using the already available SharePoint Client Context.

This is not a SharePoint REST API Client but indended to be a lightweight way of fetching list items.

