# Get Started

Just want to get started huh? Here's some copy-pastable material for you!

## Include the script

```
<script src="https://cdn.rawgit.com/dlid/camlsql-js/0.5.0/dist/camlsql.min.js"></script>
```
 
## Prepare your query

```
<script>
 camlsql.prepare("SELECT Title FROM [Pages] WHERE [Created] >= @monthStart", {
  "@monthStart" : camlsql.datetime().startOfMonth()
 }) 
</script>
```

## Get the XML

```
<script>
var xml = camlsql.prepare("SELECT Title FROM [Pages] WHERE [Created] >= @monthStart", {
  "@monthStart" : camlsql.datetime().startOfMonth()
 }).getXml();

/*
<View>
    <Query>
        <Where>
            <Geq>
                <FieldRef Name="Created" />
                <Value Type="DateTime" IncludeTimeValue="True">2017-11-01T00:00:00</Value>
            </Geq>
        </Where>
    </Query>
    <ViewFields>
        <FieldRef Name="Title" />
    </ViewFields>
</View>
*/
</script>

```

## Or execute the query

```
<script>
camlsql
 .prepare("SELECT Title FROM [Pages] WHERE [Created] >= @monthStart", {
  "@monthStart" : camlsql.datetime().startOfMonth()
 })
 .exec(function(err, rows) {
  if (rows) {
 	console.log("Got rows", rows)
  }
 });
</script>

```

## Read more...

- Check out the [SQL Syntax](sql.md#sql-syntax) for how to write your queries
- Read up on [parameter binding](parameters.md#bind-parameters)
- Continue with [comparison operators](comparison.md#comparison) and [field types](field-types.md#types)
- and take it from there!