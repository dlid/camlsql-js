# Introduction

## Background

When I need to make simple queries to fetch ListItems in a SharePoint environment I've always felt that writing CAML queries has been an obstacle.

It's easy enough to use the REST API these days, but then you have to handle the requests yourself, and that can easily cause a requirement for another javascript library.

I wanted an easy and quick way to just construct the CAML XML string and execute the query. In fact, the early stage of camlsql-js could not execute the query at all - it was just meant to create the CAML XML.

I've been working with databases since I learned what it was, and mostly relational ones. So being able to get List Items using an SQL query made sense to me.

- **No prerequisites** - camlsql-js can create the XML without any other libraries (to execute a query will of course require the SP scripts)
- **Lightweight** - I wanted camlsql-js to just focus on creating XML for getting List Items. Nothing more. To make sure it does not feel too big to include in your projects.

