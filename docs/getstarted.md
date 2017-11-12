# camlsql-js

## Include the script

## Prepare your query

## Execute or getXml




## Comparing Created / Modified dates



## Comparing user selected date fields


If you are comparing the Created or Modified fields, make sure to set storageTZ to true. Then the comparison will be done on the SharePoint internal UTC Timestamp.

```
camlsql.prepare("SELECT * FROM Pages WHERE [Created] >= ?", [ camlsql.datetime().sub("30 days").storageTZ(true)  ])
```

If you compare