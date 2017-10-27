	

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
            asc,
            re = new RegExp("(\\[?[a-zA-Z_\\d]+?\\]?)(\\,\\s+|\\s+asc|\\s+desc|$)", "ig");
        if (typeof orderByString !== "undefined" && orderByString !== null) {
            while (match = re.exec(orderByString)) {
                asc = true;
                fieldName = formatFieldName(match[1]);
                if (match.length == 3) {
                    order = typeof match[2] !== "undefined" ? trim(match[2].toLowerCase()) : null;
                    order = order == "desc" ? false : true 
                }
                orderValues.push([fieldName, order]);
            }
        }
    	return orderValues; 
	}

    window.orderByParser = OrderByParser;  