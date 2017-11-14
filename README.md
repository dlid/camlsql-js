# camlsql-js

[![Build Status](https://travis-ci.org/dlid/camlsql-js.svg?branch=master)](https://travis-ci.org/dlid/camlsql-js) [![codecov](https://codecov.io/gh/dlid/camlsql-js/branch/master/graph/badge.svg)](https://codecov.io/gh/dlid/camlsql-js)

## CSOM library for getting SharePoint List items using SQL syntax

Camlsql will let you fetch SharePoint List Items using SQL syntax. It relies on an already existing SP ClientContext and is therefore very lightweight.

    camlsql.prepare("SELECT * FROM Pages WHERE Title LIKE ? ORDER BY Modified DESC LIMIT 10", [ "%hello%" ])
    .exec(function(err, rows) {
     if (err) console.error(err);
     console.table(rows);
    });

------

### Why should I use this?

Maybe you shouldn't.

This is a very specific library to do one specific thing - get list items from a list - while the REST API can be used for creating, updating and deleting as well.

But let me try to sell camlsql to you anyway.

- camlsql is ***lightweight*** - only 8.3 KB min+gz
- Generate CAML queries using ***SQL-like syntax***! SQL! Too easy!
- ***No dependencies*** other than the existing SharePoint CSOM libraries
- ***SQL syntax*** (yes, I mention it again)  and no need to manually build XML strings 

Not convinced? I figured as much... Read on...

#### Why choose CSOM over REST?

Other than my above attempts to convice you there are few "actual" reasons when you may need to use CamlQueries over the SharePoint REST API.

 - ***Nested joins*** is not supported by the REST API
     - If you have list **A** with a lookup field to list **B**,<br>and list **B** has a lookup field to **C** - then you can not query list **A** and join list C via list B.
     - This is possible using CAML and by using [JOIN](https://dlid.github.io/camlsql-js/#/sql?id=joining-a-second-list) in the camlsql library
 - ***Calculated fields*** can not be queried using the REST API

Still not convinced? Well, then perhaps this is not the library you're looking for.

Thanks for reading this far! 

#### Documentation

- Read the [documentation](https://dlid.github.io/camlsql-js) for details
- See example queries that are tested with each build in the [SQL Test Queries](https://github.com/dlid/camlsql-js/wiki/SQL-Test-Queries) wiki page.


## Install

```
npm i docsify-cli -g
npm install

# To run docs
docsify serve docs

# To build
gulp

```
