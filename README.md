# camlsql-js

[![Build Status](https://travis-ci.org/dlid/camlsql-js.svg?branch=master)](https://travis-ci.org/dlid/camlsql-js) [![codecov](https://codecov.io/gh/dlid/camlsql-js/branch/master/graph/badge.svg)](https://codecov.io/gh/dlid/camlsql-js)

## CSOM library for getting SharePoint List items using SQL syntax

Camlsql will let you fetch SharePoint List Items using SQL syntax. It relies on an already existing SP ClientContext and is therefore very lightweight.

```
camlsql.prepare("SELECT * FROM Pages WHERE Title LIKE ? ORDER BY Modified DESC LIMIT 10", ["%hello%"])
 .exec(function(err, rows) {
  console.err(err);
  console.table(rows);
 });
```
 
### Features

- Lightweight - only 8.3 KB min+gz
- Generate CAML queries using SQL-like syntax
- No other dependencies than the SharePoint CSOM libraries

#### Documentation

- Read the [documentation](https://dlid.github.io/camlsql-js) for details
- See example queries that are tested with each build in the [SQL Test Queries](https://github.com/dlid/camlsql-js/wiki/SQL-Test-Queries) wiki page.

## This is not REST

This is a library only for fetching list data using CSOM and CAML queries using the already available SharePoint Client Context.

This is not a SharePoint REST API Client but indended to be a lightweight way of fetching list items.


## Install

```
npm i docsify-cli -g
npm install

# To run docs
docsify serve docs

# To build
gulp

```
