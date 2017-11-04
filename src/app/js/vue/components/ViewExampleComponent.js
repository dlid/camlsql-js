
var ViewExampleTabComponent = { 
	template: '#ViewExample-template',
	mounted : function() {
	 	setTimeout(PR.prettyPrint, 10); 
	 	this.loadExample(this.$route.params.id);


	},
	methods : {

		loadExample : function(id) {

			id = parseInt(id.substring(0, id.indexOf('-')));
		
			for (var i=0; i < this.globals.examples.length; i++) {
				if (this.globals.examples[i].id == id ) {
					this.example = this.globals.examples[i];
					break;  
				}
			}
		},

		formatXml : function() {
			if (!this.example.xml) return "";
			return vkbeautify.xml(this.example.xml);
		},

		formatParametersAsString : function(p) {
			var s = "";
			if (!p) return "";
			for (var i=0; i< p.length; i++) {
				s+=  "\n " + p[i] + (i < p.length - 1 ? ',' : '');
			}
			if (!s) return "";
			return ", [" + s + "\n]";
		},

		cutDownSql : function(s) {
			if (s.length > 70) {
				return s.substring(0, 67) + "...";
			}
			return s;
		},
		urifyString : function(str) {
			str = str.toLowerCase();
			var newString = "";
			for (var i=0; i <  str.length; i++) {
				if (str[i].match(/[a-z0-9-_]/)) {
					newString += str[i];
				} else if (str[i] == " ") {
					newString += "-";
				}
			}
			newString = newString.replace(/-{2,}/, '-');
			return newString;
		}
	},
	computed : {
		examples : function() {
		return this.globals.examples
	}
	},
	data : function() {
		return {
			globals : appGlobals,
			example_id : null,
			example : null
		} 
	},
	watch: {
	    '$route' : function(to, from) {
	      // react to route changes...
	    } 
	  }
}