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
- When using native boolean values, they are converted to a camlsql.boolean object

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

?> ***object*** camlsql.**guid**(***string*** guid)

- Create a value of type `Guid`
- Note that no GUID validation will be done by camlsql.

```
<script>
camlsql.prepare("SELECT * FROM [Pages] WHERE UniqueId = ?", 
 [camlsql.guid('2f8fea81-a034-4ecc-8d56-261289df1f6f')]);
</script>
<View>
 <Query>
  <Where>
   <Eq>
    <FieldRef Name="UniqueId" />
    <Value Type="Guid">2f8fea81-a034-4ecc-8d56-261289df1f6f</Value>
   </Eq>
  </Where>
 </Query>
</View>s
```


### membership method

?> ***object*** camlsql.**membership**(***string*** type, [**int** groupId])

!> Please correct me if I'm writing these types all wrong. I've not been able to test these ones thoroughly.

- Where `type` can be SPWeb.Allusers, SPGroup, SPWeb.Groups, CurrentUserGroups or SPWeb.Users
  - `SPWeb.AllUsers` field contains only users, no groups
  - `SPGroup` Field contains a specific group - you must also include the `groupId` parameter
  - `SPWeb.Groups` field contains a group for the site 
  - `SPWeb.Users` field contains users who received rights to the site (not through a group)
  - `CurrentUserGroups` field contains a group that the current user is in
- See [membership](https://msdn.microsoft.com/en-us/library/office/aa544234.aspx) element for details

#### Member of a specific group

- Use the type `SPGroup` and provide the group id

```
<script>
camlsql.prepare("SELECT Title FROM [Pages] WHERE [AssignedTo] = ?", [
 camlsql.membership("SPGroup", 5)
])
</script>

<View>
 <Query>
  <Where>
   <Membership Type="SPGroup" ID="5">
    <FieldRef Name="AssignedTo" />
   </Membership>
  </Where>
 </Query>
 <ViewFields>
 <FieldRef Name="Title" />
 </ViewFields>
</View>
```

#### Group of the current user

Check if the field contains a group that the current user is a member of.

```
<script>
camlsql.prepare("SELECT * FROM [Pages] WHERE [AssignedTo] = ?", [
 camlsql.membership("CurrentUserGroups")
])
</script>

<View>
 <Query>
  <Where>
   <Membership Type="CurrentUserGroups">
    <FieldRef Name="AssignedTo" />
   </Membership>
  </Where>
 </Query>
</View>

```

### number method

?> ***object*** camlsql.**number**(***number*** numericValue = 0)

- Used to create a parameter of type number
- When using native numeric values, they are converted to a camlsql.number object

```
<script>
camlsql.prepare("SELECT * FROM [The List] WHERE [Rate] = ?", [camlsql.number(5)])
camlsql.prepare("SELECT * FROM [The List] WHERE [Rate] = ?", [5])
</script>

<View>
 <Query>
  <Where>
   <Eq>
    <FieldRef Name="Rate" />
    <Value Type="Number">5</Value>
   </Eq>
  </Where>
 </Query>
</View>
```

### text method

?> ***object*** camlsql.**text**(***string*** stringValue)

- Used to create a parameter of type Text
- When using native strings, they are converted to a camlsql.text object

```
<script>
camlsql.prepare("SELECT * FROM [The List] WHERE [Title] = ?", ["hi"])
camlsql.prepare("SELECT * FROM [The List] WHERE [Title] = ?", [camlsql.text("hi")])
</script>

<View>
 <Query>
  <Where>
   <Eq>
    <FieldRef Name="Title" />
    <Value Type="Text">hi</Value>
   </Eq>
  </Where>
 </Query>
</View>
```

Using newline characters will automatically wrap the string in CDATA.

```
<script>
camlsql.prepare("SELECT * FROM [The List] WHERE [Title] = ?", ["hi\nman"])
</script>

<View>
 <Query>
  <Where>
   <Eq>
    <FieldRef Name="Title" />
     <Value Type="Text"><![CDATA[hi
man]]></Value>
   </Eq>
  </Where>
 </Query>
</View>
```

### today

?> ***CamlSqlDate*** camlsql.**today**(***int*** offset)

- Used to create a parameter of type DateTime with the [Today](https://msdn.microsoft.com/en-us/library/office/ms460496.aspx) element
- Use a positive or negative number as `offset` to add or subtract that number of days

```
<script>
camlsql.prepare("SELECT * FROM [The List] WHERE [Created] = ?", [camlsql.today()])
</script>

<View>
 <Query>
  <Where>
   <Eq>
    <FieldRef Name="Created" />
    <Value Type="DateTime">
     <Today />
    </Value>
   </Eq>
  </Where>
 </Query>
</View>
```

And another example with offset.

```
<script>
camlsql.prepare("SELECT * FROM [The List] WHERE [Created] = ?", [camlsql.today(-14)])
</script>

<View>
 <Query>
  <Where>
   <Eq>
    <FieldRef Name="Created" />
    <Value Type="DateTime">
     <Today OffsetDays="-14" />
    </Value>
   </Eq>
  </Where>
 </Query>
</View>
```

### user method

?> ***object*** camlsql.**user**([***int*** userId)

- If no parameter, created the [UserID](https://msdn.microsoft.com/en-us/library/office/ff625789.aspx) element
- With parameter, creates a Lookup

#### Current user

```
<script>
camlsql.prepare("SELECT * FROM [Pages] WHERE [AssignedTo] = ?", [
 camlsql.user() // Current user
])
</script>

<View>
 <Query>
  <Where>
   <Eq>
    <FieldRef Name="AssignedTo" />
    <Value Type="Number">
    <UserID />
    </Value>
   </Eq>
  </Where>
 </Query>
</View>
```

#### By user ID

```
<script>
camlsql.prepare("SELECT * FROM [Pages] WHERE [AssignedTo] = ?", [
 camlsql.user(41) // 41 is the user Id
])
</script>

<View>
 <Query>
  <Where>
   <Eq>
    <FieldRef Name="AssignedTo" LookupId="True" />
    <Value Type="User">41</Value>
   </Eq>
  </Where>
 </Query>
</View>
```


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
