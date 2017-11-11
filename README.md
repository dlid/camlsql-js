# camlsql-js

[![Build Status](https://travis-ci.org/dlid/camlsql-js.svg?branch=master)](https://travis-ci.org/dlid/camlsql-js) [![codecov](https://codecov.io/gh/dlid/camlsql-js/branch/master/graph/badge.svg)](https://codecov.io/gh/dlid/camlsql-js)


## JavaScript Library for fetching SharePoint List items SQL syntax

Camlsql will let you fetch SharePoint List Items using SQL syntax. It relies on an already existing SP ClientContext and is therefore very lightweight.

### Features
- 

------------------------------

**NOTE!** 
- This is a work in progress.
- Things can change alot between commits
- Feel free to test and provide feedback - it helps me a lot!
- A dedicated website is being built where it will be easy see how your query maps to XML 
- "Beware" of the non-minified version. Today it contains a lot of extra data so it's a bit huge.
---------------------------

## What is this?

`camlsql` is my attempt to create SharePoint [CAML](https://msdn.microsoft.com/en-us/library/office/ms426449.aspx) queries using a syntax I am more familiar with: SQL.

- Use SQL-like syntax to create the ViewXML used by CamlQueries
- Easily execute the CamlQuery toward the current ClientContext web

```
camlsql.prepare("SELECT * FROM Pages WHERE Title LIKE ? ORDER BY Modified DESC LIMIT 10", ["%hello%"])
 .exec(function(err, rows) {
  console.err(err);
  console.table(rows);
 });
```

See more examples in the [SQL Test Queries](https://github.com/dlid/camlsql-js/wiki/SQL-Test-Queries) wiki page.


## This is not REST

This is a library only for fetching list data using CSOM and CAML queries using the already available SharePoint Client Context.

This is not a SharePoint REST API Client but indended to be a lightweight way of fetching list items.

