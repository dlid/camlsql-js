# CamlSqlDate Object

The CamlSqlDate object is created to make life a little easier when creating queries based on date.

Create it by calling camlsql.date or camlsql.datetime.


Using the CamlSqlDate object you can quickly jump between dates and times.

``` 
<script>
 camlsql.datetime() // Now (Let's say March 3, 2017)
   .startOfMonth()  // GO to March 1, 2017
   .sub("1 day")    // February 28, 2017
   .startOfMonth()  // Febrary 1st, 2017
   .endOfWeek();     // End of the first week of last month

// Result: Sun Feb 05, 2017
</script>
```

?> The methods `camlsql.datetime` and `camlsql.date` are basically the same. They both create new CamlSqlDate objects and differ only in the default value for [includeTime](#includetime).


## constructor


```
camlsql.datetime()
camlsql.datetime(string stringValue)
camlsql.datetime(Date dateObject)
```

### No parameter

This is the same as passing in `new Date()` as parameter. 

### String parameter

By passing in a string, camlsql-js will use that very same string as parameter value. 

While giving you the total freedom to set the parameter value, you can also cause trouble this way.

To be very clear, the following camlsql statement:

```
<script>
 camlsql.prepare("SELECT * FROM [The List] WHERE [Created] > ?", [
   camlsql.datetime('cheese is tasty')
  ]);
```

Would give you the following xml:

```
<View>
    <Query>
        <Where>
            <Gt>
                <FieldRef Name="Created" />
                <Value Type="DateTime" IncludeTimeValue="True">cheese is tasty</Value>
            </Gt>
        </Where>
    </Query>
</View>
```


### Javascript Date parameter

By passing in a Javascript Date object, then the CamlSqlDate will be set to that very date. And any methods called on the CamlSqlDate object will of course use that date as starting point.

```
<script>
camlsql.datetime(new Date("May 25, 1977"))
  .add("1092 days") // May 21, 1980
</script>
```

## add

?> add(***interval_string***)

- `interval_string`: ***number*** {days|hours|minutes|seconds|milliseconds}

Add the interval_string duration to the date

```
<script>
 camsqldate.datetime()
  .add("5 days")
  .startOfDay()
  .add("15 minutes");

// Result at 00:15:00 O'clock five days from now
</script>
```


## endOfDay

?> endOfDay()

Go to the end of the day - this is at `23:59:59.999` of the current day

```
<script>
 camsqldate.datetime() // Now
  .endOfDay();         // Go to 23:59:59.999 of today
</script>
```

## endOfMonth


?> endOfMonth()

Go to the end of the day (`23:59:59.999`) in the last day of the month 

```
<script>
 camsqldate.datetime( new Date("August 22, 1997") )
  .endOfMonth();       // Go to August 31 1997, 23:59:59.999
</script>
```

## includeTime

?> includeTime(bool includeTime)

- Set `includeTime` to true to set the IncludeTimeValue attribute to True in the Caml XML

When IncludeTimeValue is true then the time will be concidered when comparing with the List Field value. Otherwise, only the date will be compared.

!> `camlsql.datetime()` will set includeTime to ***true*** by default, while `camlsql.date()` will set it to false. That's the only difference between those functions.


```
camlsql.prepare("SELECT * FROM LIST WHERE D = ?", [camlsql.datetime()])

<Eq>
 <FieldRef Name="D" />
 <Value Type="DateTime" IncludeTimeValue="True">2017-11-12T17:46:46</Value>
</Eq>



camlsql.prepare("SELECT * FROM LIST WHERE D = ?", [camlsql.datetime().includeTime(false)])
<Eq>
 <FieldRef Name="D" />
 <Value Type="DateTime">2017-11-12T17:48:40</Value>
</Eq>

```


## startOfWeek

?> Given the current date, go to the start of the week.

`CamlSqlDate startOfWeek(bool sundayIsFirstDay = false)`

- Set `sundayIsFirstDay` to true if you want sunday to be the start of the week


---------------

```
<script>
camlsql.datetime()   // Now
  .startOfWeek();     // Go to monday @ 00:00:00

// Result: The monday on the current week at 00:00:00

</script>
```


## endOfWeek

?> Given the current date, go to the start of the week.

`CamlSqlDate endOfWeek(bool sundayIsFirstDay = false)`

- Set `sundayIsFirstDay` to true if you want sunday to be the start of the week

---------------

```
<script>
camlsql.datetime()   // Now
  .startOfWeek();     // Go to monday @ 00:00:00

// Result: The monday on the current week at 00:00:00

</script>
```

## startOfDay


Go to the start of the day - this is at `00:00:00.000` of the current day

```
<script>
 camsqldate.datetime() // Now
  .startOfDay();         // Go to 00:00:00.000 of today
</script>
```

## sub


?> sub(***interval_string***)

- `interval_string`: ***number*** {days|hours|minutes|seconds|milliseconds}

Subtract the interval_string duration from the date

```
<script>
 camsqldate.datetime()
  .sub("5 days")
  .startOfDay();

// Result at 00:00:00 O'clock five days ago
</script>
```


## storageTZ

When a user selects a date in a List Column that date is saved with the TimeZone settings of that current site. SharePoint will however always save the UTC date internally as well. 

Set the `StorageTZ` to **true** to compare the date to SharePoints internally stored UTC date.

If this is set to true camlsql will also use the toISOString method of the current datetime object for the parameter value. This means that the UTC value of the date will be used.

With storageTZ set to **TRUE** (GMT+0200)

```
camlsql.prepare("SELECT * FROM LIST WHERE Created > ?", [
 camlsql.datetime(new Date("April 5, 1980")).startOfMonth().storageTZ(true)
]);

<Gt>
 <FieldRef Name="Created" />
 <Value Type="DateTime" IncludeTimeValue="True" 
        StorageTZ="True">1980-03-31T22:00:00.000Z</Value>
</Gt>

```
With storageTZ set to **FALSE** (default):

```
camlsql.prepare("SELECT * FROM LIST WHERE Created > ?", [
 camlsql.datetime(new Date("April 5, 1980")).startOfMonth().storageTZ(false)
]);

<Gt>
 <FieldRef Name="Created" />
 <Value Type="DateTime" IncludeTimeValue="True">1980-04-01T00:00:00</Value>
</Gt>

```



## startOfMonth



