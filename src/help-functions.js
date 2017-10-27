/**
 * Helper functions for parameters
 */


camlsql.__proto__.text = function(value) {
	var multiline = value.indexOf("\n") != -1 || value.indexOf("\r") !== -1,
		ret;

	ret = {
		type : 'Text',
		value : value
	};
	if (multiline === true) ret.multiline = true;
	return ret;
}

camlsql.__proto__.number = function(value) {
	if (typeof value != "number") {
		console.error("[camlsql] value was not a number", value);
		return null;
	}
	return {
		type : 'Number',
		value : value
	};
}

camlsql.__proto__.lookup = function(value) {
	return {
		type : 'Lookup',
		value : value,
		byId : typeof value == "number"
	};
}
 
camlsql.__proto__.datetime = function(value) {

	if (typeof value !== "string") {
		console.error("[camlsql] Bad type for datetime value");
		return null;
	}

	if (typeof value === "string" && 
		(!value.match(/^\d{4}-\d\d-\d\d$/) && !value.match(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/) )) {
		console.error("[camlsql] Bad format for datetime value");
		return null;
	}

	return {
		type : 'DateTime',
		value : value
	};
}

camlsql.__proto__.today = function(offset) {
	if (typeof offset === "undefined") offset = 0;
	if (typeof offset !== "number") {
		console.error("[camlsql] Bad offset value for 'today'", offset);
		return null;
	}

	return {
		type : 'DateTime',
		today : true,
		value : offset
	};
}

camlsql.__proto__.month = function(offset) {
	if (typeof offset === "undefined") offset = 0;
	if (typeof offset !== "number") {
		console.error("[camlsql] Bad offset value for 'today'", offset);
		return null;
	}

	return {
		type : 'DateTime',
		month : true,
		value : offset
	};
}


camlsql.__proto__.guid = function(value) {
	return {
		type : 'Guid',
		value : value
	};
}

camlsql.__proto__.multichoice = function(value) {
	return {
		type : 'MultiChoice',
		value : value
	};
}

camlsql.__proto__.choice = function(value) {
	return {
		type : 'Choice',
		value : value
	};
}

camlsql.__proto__.url = function(value) {
	return {
		type : 'URL',
		value : value
	};
}

camlsql.__proto__.user = function(value) {
	return {
		type : 'User',
		value : value
	};
}

camlsql.__proto__.prepare = function() {
	var args = Array.prototype.slice.call(arguments);
	args.unshift(null);
	return new (Function.prototype.bind.apply(camlsql, args));
}
   