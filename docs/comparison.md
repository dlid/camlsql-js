# Comparison

The comparison operators in the WHERE clause works like **if conditions** in any programming language.

Each condition in the WHERE clause must evaluate to true, or the List Item will not be returned.

## Equal (=)

> Check if the values are equal or not. 

```
<script>
camlsql.prepare("SELECT * FROM Pages WHERE Title = ? AND Weight = ?", ["My page", 42])
</script>
```

 
```
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
## Greater than (>)
## Greater than or equal (>=)
## IN
## Less than (<)
## Less than or equal (<=)
## LIKE 
## IS NULL
## IS NOT NULL

