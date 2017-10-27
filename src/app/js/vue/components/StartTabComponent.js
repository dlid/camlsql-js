/**
 * The SearchTab. The startpage where you can search for Avtal 
 * 
 */
 var StartTabComponent = { 
 	template: '#StartTab-template',

	/**
	 * Executes when the component is first initialized
	 */
	 mounted : function() {
	 	if (this.$route.params.query) {
	 	}
	 	
	 	this.changeTabByRoute(this.$route.name);

	 	setTimeout(PR.prettyPrint, 10);
	 }, 

	/**
	 * Data used in this component
	 */
	 data : function() {
	 	return {
	 		activeTab : 'start'
	 	}
	 }, 

	 methods : {
		changeTabByRoute : function(route) {
			if (route == "start") {
				this.activeTab = "start"; 
			} else if (route == "start-other") {
				this.activeTab = "other"; 
			} else if (route == "start-about") {
				this.activeTab = "about"; 
			}
		}
	},

	watch: {
		'$route' : function(to, from) {
			this.changeTabByRoute(to.name);
		}
	}
}