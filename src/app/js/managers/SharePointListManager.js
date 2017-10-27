var SharePointListManager = (function() {


	/**
	 * [getListItems description]
	 * @param  {[object]} options [description]
	 * @example
	 * 		getListItems({
	 *   		viewXml : '<View><Query>...',
	 *    		listName : 'Announcements'
	 *     	}).then(sucess, fail);
     *
	 * @return {Q.promise}         Returns a promise
	 */
	function getListItems(options) {
		//
		// options.viewXml 
		// options.listName 
		//

		// var camlBuilder = new cSql(clientContext, 
		// 	"SELECT * FROM ListName WHERE [ID] = ? ORDER BY [Title] ASC", [ 
		// 	cSql.Number(5) 
		// ]).skip(3).take(5);

		var deferred = Q.defer();

		 var clientContext = SP.ClientContext.get_current();
	     var oList = clientContext.get_web().get_lists().getByTitle(options.listName);
	     var camlQuery = new SP.CamlQuery(); // https://msdn.microsoft.com/en-us/library/office/jj245851.aspx

	     camlQuery.set_viewXml(options.viewXml);
	     // <View><RowLimit>100</RowLimit></View>
	     /*camlQuery.set_viewXml('<View><Query><Where><Geq><FieldRef Name=\'ID\'/>' + 
	         '<Value Type=\'Number\'>1</Value></Geq></Where></Query><RowLimit>10</RowLimit></View>');*/

	     this.collListItem = oList.getItems(camlQuery);
	     clientContext.load(collListItem);
	     // clientContext.load(collListItem, 'Include(Id, DisplayName, HasUniqueRoleAssignments)');
	     clientContext.executeQueryAsync(Function.createDelegate(this, function() {
	     	deferred.resolve({status : "success", data : []});
	     }), Function.createDelegate(this, function() {
	     	deferred.reject({status : "error", message : "Query failed"});
	     }));
	    return deferred.promise;
	}

	
	return {
		getListItems : getListItems
	}


}());