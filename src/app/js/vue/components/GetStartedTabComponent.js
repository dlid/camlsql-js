
var GetStartedTabComponent = { 
	template: '#GetStartedTab-template',
	mounted : function() {
	 	setTimeout(PR.prettyPrint, 10);
	},
	watch: {
	    '$route' : function(to, from) {
	      // react to route changes...
	    }
	  }
}