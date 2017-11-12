# Build your SQL

    SELECT
        [SCOPE {DEFAULTVALUE | RECURSIVE | RECURSIVEALL | FILESONLY}]
        field_name [, field_name ...]
        FROM list_name
        [ [LEFT] JOIN list_alias ON list_name.field_name [...]]
        [WHERE where_condition]
        [GROUP BY field_name]
        [ORDER BY [data_type:]field_name [ASC | DESC], ...]
        [LIMIT row_count]