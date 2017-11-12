# camlsql object

`camlsql` is a global object and is what you use as starting point for all your camlsql actions.

Most functions here will create different types of parameters, but there are also [helper functions](#helper-functions) that you may find useful.

## prepare method

> **prepare** is the core function of camlsql. This is where you prepare your statement and bind parameters.

?> ***CamlSqlQuery*** camlsql.**prepare**(***string*** sql_string)<br>
***CamlSqlQuery*** camlsql.**prepare**(***string*** sql_string, ***object*** namedParameters)<br>
***CamlSqlQuery*** camlsql.**prepare**(***string*** sql_string, ***string[]*** parameterArray)<br>

- Returns a new [CamlSqlQuery](camlsqlquery-object.md#camlsqlquery-object) object
- See [SQL Syntax](sql.md) to see how to build your SQL
- See [Bind Parameters](bind-parameters.md#bind-parameters) to see how to bind your parameters

## Parameter functions

### boolean method

?> ***object*** camlsql.**boolean**(***bool*** booleanValue = false)

- Used to create a parameter of type boolean

```
<script>
camlsql.prepare("SELECT * FROM [The List] WHERE [Accepted] = ?", [camlsql.boolean(true)])
camlsql.prepare("SELECT * FROM [The List] WHERE [Accepted] = ?", [true])
</script>

<Where>
 <Eq>
  <FieldRef Name="Accepted" />
  <Value Type="Boolean">1</Value>
 </Eq>
</Where>

```

### date method

?> ***CamlSqlDate*** camlsql.**date**(***string*** stringDateValue)<br>
***CamlSqlDate*** camlsql.**date**(***Date*** dateValue)<br>
***CamlSqlDate*** camlsql.**date**()

- Used to create a parameter of type DateTime
- Returns a [CamlSqlDate](camlsqldate-object.md#camlsqldate-object)
- `IncludeTimeValue` is set to **false** by default (compare to [date](#datetime-method))
- Read more about the [constructor](camlsqldate-object.md#constructor) parameters

```
<script>
 // Get items where Date is from monday at noon to friday at noon
 // Here we set storageTZ to true so we compare with SharePoints internal UTC date
 camlsql.prepare("SELECT * FROM List WHERE [Created] > ?", [
  camlsql.date().sub("30 days").storageTZ(true)
 ])
</script>

<!-- 
Given the day of this example (2017-11-12) it will give the following CAML 
Notice that IncludeTimeValue attribute is not set.
Only dates will be compared.
-->
<Where>
 <Gt>
  <FieldRef Name="Created" />
  <Value Type="DateTime" StorageTZ="True">2017-10-13T17:59:49.239Z</Value>
 </Gt>
</Where>

```

### datetime method

?> ***CamlSqlDate*** camlsql.**datetime**(***string*** stringDateValue)<br>
***CamlSqlDate*** camlsql.**datetime**(***Date*** dateValue)<br>
***CamlSqlDate*** camlsql.**datetime**()

- Used to create a parameter of type DateTime
- Returns a [CamlSqlDate](camlsqldate-object.md#camlsqldate-object)
- `IncludeTimeValue` is set to **true** by default (compare to [date](#date-method))
- Read more about the [constructor](camlsqldate-object.md#constructor) parameters


```
<script>
 // Get items where Date is from monday at noon to friday at noon
 camlsql.prepare("SELECT * FROM List WHERE [Date] >= ? AND [Date] <= ?", [
  camlsql.datetime().startOfWeek().add("12 hours"),
  camlsql.datetime().startOfWeek().add("4 days").startOfDay().add("12 hours")
 ])
</script>

<!-- 
Given the day of this example (2017-11-12) it will give the following CAML -->
<Where>
 <And>
  <Geq>
   <FieldRef Name="Date" />
   <Value Type="DateTime" IncludeTimeValue="True">2017-11-06T12:00:00</Value>
  </Geq>
  <Leq>
  <FieldRef Name="Date" />
   <Value Type="DateTime" IncludeTimeValue="True">2017-11-10T12:00:00</Value>
  </Leq>
 </And>
</Where>

```


### guid method
### number method
### text method
### today
### user method

## Helper functions

### encode method

?> ***string*** camlsql.**encode**(***string*** stringToEncode)

Encode is used internally to encode field names that you put in [brackets] in your query. It will encode the field name in the same way that SharePoint does.

```
<script>
camlsql.encode("My \"cool\" field"); // My_x0020__x0022_cool_x0022__x002
camlsql.encode("Överlåtelsedatum");  // _x00d6_verl_x00e5_telsedatum
</script>
```
