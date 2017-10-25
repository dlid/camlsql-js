/**
 * Helper functions for parameters
 *  https://joshmccarty.com/a-caml-query-quick-reference/
 */


caSql.__proto__.text = function(value) {
	var multiline = value.indexOf("\n") != -1 || value.indexOf("\r") !== -1,
		ret;

	ret = {
		type : 'Text',
		value : value
	};
	if (multiline === true) ret.multiline = true;
	return ret;
}

caSql.__proto__.number = function(value) {
	if (typeof value != "number") {
		console.error("[casql] value was not a number", value);
		return null;
	}
	return {
		type : 'Number',
		value : value
	};
}

caSql.__proto__.lookup = function(value) {
	return {
		type : 'Lookup',
		value : value,
		byId : typeof value == "number"
	};
}
 
caSql.__proto__.datetime = function(value) {

	if (typeof value !== "string") {
		console.error("[casql] Bad type for datetime value");
		return null;
	}

	if (typeof value === "string" && 
		(!value.match(/^\d{4}-\d\d-\d\d$/) && !value.match(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/) )) {
		console.error("[casql] Bad format for datetime value");
		return null;
	}

	return {
		type : 'DateTime',
		value : value
	};
}

caSql.__proto__.today = function(offset) {
	if (typeof offset === "undefined") offset = 0;
	if (typeof offset !== "number") {
		console.error("[casql] Bad offset value for 'today'", offset);
		return null;
	}

	return {
		type : 'DateTime',
		today : true,
		value : offset
	};
}

caSql.__proto__.month = function(offset) {
	if (typeof offset === "undefined") offset = 0;
	if (typeof offset !== "number") {
		console.error("[casql] Bad offset value for 'today'", offset);
		return null;
	}

	return {
		type : 'DateTime',
		month : true,
		value : offset
	};
}


caSql.__proto__.guid = function(value) {
	return {
		type : 'Guid',
		value : value
	};
}

caSql.__proto__.multichoice = function(value) {
	return {
		type : 'MultiChoice',
		value : value
	};
}

caSql.__proto__.url = function(value) {
	return {
		type : 'URL',
		value : value
	};
}
