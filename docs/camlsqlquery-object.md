# CamlSqlQuery object

This is the object created when you use [prepare](camlsql-object.md#prepare-method) method.

## exec function

?> ***CamlSqlQuery*** exec(callback);


- `callback`(error, rows) is a callback function
  - error will contain any error
  - rows is the array of returned rows


## getListName function

?> ***string*** getListName()

This will return the list name that you specify in your query

## getXml function

?> ***string*** getXml(**bool** isExec = false)

- Returns the generated CAML Query View XML
- If you set `isExec` to true you will get the actual query used by camlsql in the `exec` method.
  - This will currently only remove the GroupBy element (See [Group By](sql.md#group-by))

## spWeb function

?> ***CamlSqlQuery*** spWeb(**SP.Web** spWeb)<br>
 ***CamlSqlQuery*** spWeb(**string** webPath)<br>

- You can pass in a `SP.Web` if you have one available
- You can also pass in a `string` that camlsql will use in the openWeb function

If you already have a web loaded and you can pass the web in directly.

```
<script>
var context = SP.ClientContext.get_current(),
	site = context.get_site(),
	spWeb = site.openWeb("/sites/MyTestSite/Blog");

context.load(spWeb);

context.executeQueryAsync(function () {

 camlsql.prepare("SELECT * FROM [Posts]")
  .spWeb(spWeb).exec(function(err, rows) {
 });

}, function () {console.log("Error")});
</script>
```

But camlsql can help with this as well. If you know the URL you can just pass it in as a string and camlsq will load it using the `openWeb` function for you.

```
<script>
camlsql.prepare("SELECT * FROM [Posts]")
 .spWeb('/sites/MyTestSite/Blog')
 .exec(function(err, rows) {
  // ...
 });
</script>
```