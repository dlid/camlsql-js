# Bind parameters

You bind your parameters using the [prepare](camlsql-object.md#prepare) function. The function takes your SQL string as first argument, followed by the parameters as the second argument.

## Parameter types

- All parameter values must be Camlsql Parameter Objects.
- These are created using the [parameter functions](camlsql-object.md#parameter-functions)
- For basic types like string, numbers and booleans you can use the native javascript types
  - Internally they are converted to Parameter objects

## Types of binding

Parameter bindings can be done in two ways. 

- Use `@name` macros nad an `object` parameter argument for **name based binding**
- Use `?` macros and an `array` parameter argument for **index based biding**

### Name based binding

The second way to bind parameters is by name. Named parameters must follow an [a-z] pattern and it must always start with `@`.

When using name based binding the parameters must be an object containing the very same parameter names and their values.


```
<script>
camlsql.prepare("SELECT * FROM [Pages] WHERE [Title] = @title AND [Created] >= @created", {
 "@created" : camlsql.datetime().startOfWeek(),
 "@title" : "My title"
})
</script>

<View>
 <Query>
  <Where>
   <And>
    <Eq>
     <FieldRef Name="Title" />
     <Value Type="Text">My title</Value>
    </Eq>
    <Geq>
     <FieldRef Name="Created" />
     <Value Type="DateTime" IncludeTimeValue="True">2017-11-13T00:00:00</Value>
    </Geq>
   </And>
  </Where>
 </Query>
</View>
```

### Index based binding

- Use `?` macros in your query to bind the parameters by index.
- The parameter argument must be an array
- The first macro will represent the first parameter, the second one will represent the second parameter and so on.

```
<script>
camlsql.prepare("SELECT * FROM [Pages] WHERE [Title] = ? AND [Created] >= ?", [
 "My title", // Index 0 - the Title ?
 camlsql.datetime().startOfWeek() // Index 1 - The Created ?
])
</script>

<View>
 <Query>
  <Where>
   <And>
    <Eq>
     <FieldRef Name="Title" />
     <Value Type="Text">My title</Value>
    </Eq>
    <Geq>
     <FieldRef Name="Created" />
     <Value Type="DateTime" IncludeTimeValue="True">2017-11-13T00:00:00</Value>
    </Geq>
   </And>
  </Where>
 </Query>
</View>
```

?> Internally the index based bindings are convert to names. The first ? will become `@param0`, the second `@param1` and so on 