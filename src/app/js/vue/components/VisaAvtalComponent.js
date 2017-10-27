
var VisaAvtalComponent = { 
	template: '#VisaAvtal-template',
	mounted : function() {
		console.warn("route", this.$route);
		this.createBreadcrumb();

	},

	data : function() {
		return {
			breadcrumbs : []
		};
	},

	methods : {
		createBreadcrumb : function() {

			this.breadcrumbs = [];
			if (this.$route.name == "search/avtal") 
			{
				this.breadcrumbs.push({title : "Sök", route : { name : 'sok' }}); 
				this.breadcrumbs.push({title : "Sökresultat ("+this.$route.params.query+")", route : { name : 'search-for-paged', params : { page : this.$route.params.page, query : this.$route.params.query } }}); 
				this.breadcrumbs.push({title : "Avtal " + this.$route.params.id, route : { name : 'sok' }}); 
			} else if (this.$route.name == "visa-avtal") 
			{
				this.breadcrumbs.push({title : "Avtal " + this.$route.params.id, route : {name : 'avtal'}}); 
				this.breadcrumbs.push({title : "Avtal " + this.$route.params.id, route : { name : 'sok' }}); 
			}
		}
	},

	watch: {
	    '$route' : function(to, from) {
		this.createBreadcrumb();
	    }
	  }
}