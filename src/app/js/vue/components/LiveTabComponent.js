
var LiveTabComponent = { 
	template: '#LiveTab-template',
	mounted : function() {
	 	// setTimeout(PR.prettyPrint, 10);
	 	this.triggerRefresh();
	},
	data : function() {
		return {
			liveQuery : 'SELECT Title, Preamble, Image FROM [Pages] WHERE [Preamble] LIKE ? OR [Preamble] IS NULL',
			liveTimeout : null,
			parameters : [{type : "Text", value : "%Press release%", "name" : "@param0"}],
			calculatedScript : "",
			camlXml : '',
			camlRawXml : '',
			viewScope : "DefaultValue"
		}
	},
	computed : {
		 compressedQuery : function() {
		 	if (this.liveQuery)
		 		return LZString.compressToEncodedURIComponent(JSON.stringify({
		 			query : this.liveQuery,
		 			param : this.parameters,
		 			viewScope : this.viewScope
		 		}));
		 	return "";
		 }
	}, 
	watch: {	
	    '$route' : function(to, from) {
	      // react to route changes...
	       this.triggerRefresh();
	    },
	    'liveQuery' : function(newValue) {
	    	this.triggerRefresh();
	    },
	    'calculatedScript' : function() {
				var f = document.querySelectorAll('pre.prettyprinted');
	    		for (var i=0; i < f.length;i++) {
	    			f[i].classList.remove('prettyprinted');	    			
	    		}
	    		setTimeout(PR.prettyPrint, 50);
	    		this.highlightErrors();

	    }
	  },
	  methods : {
	  	highlightErrors : function() { 
	  		setTimeout(function() {
	    		var items = document.querySelectorAll(".hljs-name");
				for (var i=0; i < items.length; i++) {
				 if (items[i].innerText == "casql:Error") {
				  items[i].style.color = "red"
				 }
				}
			}, 100);
	  	},
	  	paramError : function(param) {
	  		if (param.type == "Number" && isNaN(Number(param.value))) {
	  			return "That's not a number";
	  		} else if (param.type == "Today" && isNaN(Number(param.value))) {
	  			return "Set a positive number for adding days, or a negative to subtract.";
	  		}
	  	},
	  	showParamTextInput : function(param) {
	  		if (param.type == "Now") 
	  			return false;
	  		return true;
	  	},
	  	triggerRefresh : function() {
	  		var self = this;
	    	if(this.liveTimeout) clearTimeout(this.liveTimeout);

	    	this.liveTimeout = setTimeout(function() {
	    

				var theQuery = self.liveQuery.replace(/[\n\r]/g, " ");
	    		theQuery = theQuery.replace(/\s{2,}/g, ' ');
	    		theQuery = theQuery.replace(/^\s+|\s+$/, '');

	    		var query = camlsql.prepare(theQuery, [], true),
	    			macros  = query._properties.macros;

	    		function findParameterIndexByMacroName(parameters, macro) {
	    			for (var i=0; i <  parameters.length; i++) {
	    				if (parameters[i].name == macro) {
	    					return i;
	    				}
	    			}
	    			return -1;
	    		}
	    		var newparams = [];
	    		if (macros) {
		    		for (var i=0; i < macros.length; i++) {
		    			var ix = findParameterIndexByMacroName(self.parameters, macros[i]);
		    			if (ix === -1) {
		    				console.log("add", macros[i]);
		    				self.parameters.push({name : macros[i], value : "", type : "Text"});
		    			}
		    		}

		    		for (var i=0; i < self.parameters.length; i++) {
		    			if (macros.indexOf(self.parameters[i].name) !== -1) {
		    				newparams.push(self.parameters[i]);
		    			}
		    		}

		    		
		    	}

		    	console.warn("oldparam", self.parameters);
self.parameters = newparams;
	    		
	    		self.$router.push({ name: 'live-hash', params: { hash: self.compressedQuery }})

	    		var parameterCode = "",
	    			ps = self.parameters,
	    			actualParams = [];

	    		for (var i=0; i<  ps.length; i++) {
	    			console.log("ps", ps[i]);
	    			if (parameterCode) parameterCode += ",\n";
	    			if (ps[i].type == "Text") {
	    				parameterCode += "  " + JSON.stringify(ps[i].value);
	    				actualParams.push(ps[i].value);
	    			} else if (ps[i].type == "Number") {
	    				parameterCode += "  " + Number(ps[i].value);
	    				actualParams.push(Number(ps[i].value));
	    			} else if (ps[i].type == "Today") {
	    				var n = Number(ps[i].value);
	    				parameterCode += "  camlsql.today(" + (!isNaN(n) && n != 0 ? n : '') +")";
	    				actualParams.push(ps[i].value && !isNaN(n) ? camlsql.today(n) : camlsql.today());
	    			}  else if (ps[i].type == "Now") {
	    				parameterCode += "  camlsql.now()";
	    				actualParams.push(camlsql.now());
	    			}  else if (ps[i].type == "Now (With time)") {
	    				parameterCode += "  camlsql.now(true)";
	    				actualParams.push(camlsql.now(true)); 
	    			}  else if (ps[i].type == "DateTime") {
	    				parameterCode += "  camlsql.datetime(" + (ps[i].value ? JSON.stringify(ps[i].value) : '') + ")";
	    				actualParams.push(camlsql.datetime(ps[i].value));
	    			} else if (ps[i].type == "Date") {
	    				parameterCode += "  camlsql.date(" + (ps[i].value ? JSON.stringify(ps[i].value) : '') + ")";
	    				actualParams.push(camlsql.date(ps[i].value));
	    			}

	    			
	    		}

	    		console.warn("actualParams", actualParams, ps);

	    		if(parameterCode) parameterCode = ",\n [\n" + parameterCode + "\n ]";
	    		var q = camlsql.prepare(theQuery, actualParams, true);

	    		self.camlRawXml = q.getXml();
	    		self.camlXml = vkbeautify.xml(self.camlRawXml);
	    		self.calculatedScript = "camlsql.prepare(" + JSON.stringify(theQuery) + parameterCode + ")\n .exec(function(err, rows, pagingInfo) {\n\n });";
	    		self.liveTimeout = null;
	    		var f = document.querySelectorAll('pre.prettyprinted');
	    		for (var i=0; i < f.length;i++) {
	    			f[i].classList.remove('prettyprinted');	    			
	    		}
	    		PR.prettyPrint();

				self.highlightErrors();

	    	}, 500);
	  	}
	  }
}


