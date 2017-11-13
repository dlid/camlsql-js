# Comparison

The comparison operators in the WHERE clause works like **if conditions** in any programming language.

Each condition in the WHERE clause must evaluate to true, or the List Item will not be returned.

## Equal (=)

- Check if a field value **is equal** to a given value
- The [Eq](https://msdn.microsoft.com/en-us/library/office/ms479601.aspx) element

```
<script>
camlsql.prepare("SELECT * FROM Pages WHERE Title = ? AND Weight = ?", ["My page", 42])
</script>

<Where>
    <And>
        <Eq>
            <FieldRef Name="Title" />
            <Value Type="Text">My page</Value>
        </Eq>
        <Eq>
            <FieldRef Name="Weight" />
            <Value Type="Number">42</Value>
        </Eq>
    </And>
</Where>
```


## Not Equal (<>)

- Check if a field value is **not equal** to a given value
- The [Neq](https://msdn.microsoft.com/en-us/library/office/ms452901.aspx) element

```
<script>
camlsql.prepare("SELECT * FROM [All Answers] WHERE [TheAnswer] <> ?", [
 42
]);
</script>

<View>
 <Query>
  <Where>
   <Neq>
    <FieldRef Name="TheAnswer" />
    <Value Type="Number">42</Value>
   </Neq>
  </Where>
</Query>
</View>
```

## Greater than (>)

- Check if a field value is **greater than** a given value
- The [Gt](https://msdn.microsoft.com/en-us/library/office/ms458990.aspx) element

```
<script>
camlsql.prepare("SELECT * FROM [Leprechauns] WHERE [Height] > @veryTall", {
 "@veryTall" : 3
});
</script>

<View>
 <Query>
  <Where>
   <Gt>
    <FieldRef Name="Height" />
    <Value Type="Number">3</Value>
   </Gt>
  </Where>
 </Query>
</View>
```

## Greater than or equal (>=)


- Check if a field value is **greater than or equal to** a given value
- The [Geq](https://msdn.microsoft.com/en-us/library/office/ms416296.aspx) element

```
<script>
camlsql.prepare("SELECT * FROM [ImportantDates] WHERE [The Date] >= @monday", {
 "@monday" : camlsql.date().startOfWeek()
})
</script>

<View>
 <Query>
  <Where>
   <Geq>
    <FieldRef Name="The_x0020_Date" />
    <Value Type="DateTime">2017-11-13T00:00:00</Value>
   </Geq>
  </Where>
 </Query>
</View>
```

## IN

- Check if a field value match **any of the given values**
- The [In](https://msdn.microsoft.com/en-us/library/office/ff625761.aspx) element

```
<script>
camlsql.prepare("SELECT * FROM [Books] WHERE [Category] IN @forKids", {
 "@forKids" : ["Bedtime stories", "How to wake up dad", "Eating without cutlery"]
})
</script>

<View>
 <Query>
  <Where>
   <In>
    <FieldRef Name="Category" />
    <Values>
     <Value Type="Text">Bedtime stories</Value>
     <Value Type="Text">How to wake up dad</Value>
     <Value Type="Text">Eating without cutlery</Value>
    </Values>
   </In>
  </Where>
</Query>
</View>
```

## Less than (<)

- Check if a field value is **less than** a given value
- The [Lt](https://msdn.microsoft.com/en-us/library/office/ms479398.aspx) element

```
<script>
camlsql.prepare("SELECT * FROM [ExampleIdeas] WHERE [Awesomeness] < @max", {
 "@max" : 336
})
</script>

<View>
 <Query>
  <Where>
   <Lt>
    <FieldRef Name="Awesomeness" />
    <Value Type="Number">336</Value>
   </Lt>
  </Where>
 </Query>
</View>
```

## Less than or equal (<=)

- Check if a field value is **less than or equal to** a given value
- The [Leq](https://msdn.microsoft.com/en-us/library/office/ms431787.aspx) element

```
<script>
camlsql.prepare("SELECT * FROM [ExampleIdeas] WHERE [Awesomeness] <= @max", {
 "@max" : 336
})
</script>

<View>
 <Query>
  <Where>
   <Leq>
    <FieldRef Name="Awesomeness" />
    <Value Type="Number">336</Value>
   </Leq>
  </Where>
 </Query>
</View>
```

## LIKE 

- Check if a text value `contains` or `starts with` a given value
- Use the `%` character as a wildcard in your text parameter:
- Wildcard in the end "`hello%`" - creates the [BeginsWith](https://msdn.microsoft.com/en-us/library/office/ms476051.aspx) element
- Surrounding wildcards "`%hello%`" or no wildcards creates the [Contains](https://msdn.microsoft.com/en-us/library/office/ms196501.aspx) element

```
<script>
camlsql.prepare("SELECT * FROM [Stuff] WHERE [Title] LIKE ?", [
 'davids%' // BeginsWith
]);
</script>

<View>
 <Query>
  <Where>
   <BeginsWith>
    <FieldRef Name="Title" />
    <Value Type="Text">davids</Value>
   </BeginsWith>
  </Where>
 </Query>
</View>
```

```
<script>
camlsql.prepare("SELECT * FROM [Stuff] WHERE [Title] LIKE ?", [
 '%davids%' // Contains
]);

camlsql.prepare("SELECT * FROM [Stuff] WHERE [Title] LIKE ?", [
 'davids' // Also Contains
]);

</script>

<View>
 <Query>
  <Where>
   <Contains>
    <FieldRef Name="Title" />
    <Value Type="Text">davids</Value>
   </Contains>
  </Where>
 </Query>
</View>
```



## IS NULL

- Check if a field value **is null**
- The [IsNull](https://msdn.microsoft.com/en-us/library/office/ms462425.aspx) element

```
<script>
camlsql.prepare("SELECT * FROM [Brains] WHERE [Activity] IS NULL")
</script>

<View>
 <Query>
  <Where>
   <IsNull>
    <FieldRef Name="Activity" />
   </IsNull>
  </Where>
 </Query>
</View>
```

## IS NOT NULL

- Check if a field value **is NOT null**
- The [IsNotNull](https://msdn.microsoft.com/en-us/library/office/ms465807.aspx) element

```
<script>
camlsql.prepare("SELECT * FROM [Brains] WHERE [Activity] IS NOT NULL")
</script>

<View>
 <Query>
  <Where>
   <IsNotNull>
    <FieldRef Name="Activity" />
   </IsNotNull>
  </Where>
 </Query>
</View>
```