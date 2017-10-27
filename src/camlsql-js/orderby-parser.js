	

    /**
     * Parse the ORDER BY string
     * @param {[type]} orderByString [description]
     * @param {[type]} quiet         [description]
     * @returns array [description]
     */
    var OrderByParser = function(orderByString, quiet) {
		var orderValues = [],
            match,
            fieldName,
            dataType,
            asc,
            re = new RegExp("(\\[?[a-z:A-Z_\\d]+?\\]?)(\\,\\s+|\\s+asc|\\s+desc|$)", "ig");
        if (typeof orderByString !== "undefined" && orderByString !== null) {
            while (match = re.exec(orderByString)) {
                asc = true;
                dataType = null;
                if (match[1].indexOf(':') > 0) {
                    t = match[1].split(':');
                    if (t.length == 2) {
                        t[0] = t[0].toLowerCase();
                        switch(t[0]) {
                            case "datetime": t[0] = "DateTime"; break;
                            case "text": t[0] = "Text"; break;
                            case "number": t[0] = "Number"; break;
                            case "datetime": t[0] = "DateTime"; break;
                        }
                        dataType = t[0];
                        match[1] = t[1];
                    } else 
                        return [];
                }
                fieldName = formatFieldName(match[1]);
                if (match.length == 3) {
                    order = typeof match[2] !== "undefined" ? trim(match[2].toLowerCase()) : null;
                    asc = order == "desc" ? false : true 
                }
                orderValues.push([fieldName, asc, dataType]);
            }
        }
    	return orderValues; 
	}

    window.orderByParser = OrderByParser;  