
var ExamplesTabComponent = { 
	template: '#ExamplesTab-template',
	mounted : function() {
	 	setTimeout(PR.prettyPrint, 10);
	},
	methods : {
		cutDownSql : function(s) {
			if (s.length > 70) {
				return s.substring(0, 67) + "...";
			}
			return s;
		}
	},
	data : function() {
		return {
			examples : [

				{
					name : 'Basic field selection',
					description : 'Provide a comma separated list of field name between SELECT and FROM to create the ViewFields element',
					sql : 'SELECT [Title], [Preamble], [Created] FROM [Pages]',
					keywords : 'ViewFields',
					parameters : [],
					status : 1,
					version : "0.0.1"
				},

				{
					name : 'Basic Text comparison - Equal to',
					description : 'Bind a string parameter to = statement to create the Eq element',
					sql : 'SELECT * FROM [Pages] WHERE [Title] = ?',
					keywords : 'Text, Equal',
					parameters : [
						"My Page"
					],
					status : 1,
					version : "0.0.1"
				},

				{
					name : 'Basic Number comparison - Equal to',
					description : 'Bind a numeric parameter to = statement to create the Eq element',
					sql : 'SELECT * FROM [Pages] WHERE [Happiness] = ?',
					keywords : 'Number, Equal',
					parameters : [
						5
					],
					status : 1,
					version : "0.0.1"
				},

				{
					name : 'Basic Number comparison - Less than',
					description : 'Bind a numeric parameter to = statement to create the Lt element',
					sql : 'SELECT * FROM [Pages] WHERE [Happiness] < ?',
					keywords : 'Number, Less than',
					parameters : [
						10
					],
					status : 1,
					version : "0.0.1"
				},

				{
					name : 'Basic Null check',
					description : 'Use the [Field] IS NULL pattern to check for null values',
					sql : 'SELECT * FROM [Presentations] WHERE [Preparation] IS NULL',
					keywords : 'Is Null',
					parameters : [],
					status : 1,
					version : "0.0.1"
				},

				{
					name : 'Basic NOT Null check',
					description : 'Use the [Field] IS NULL pattern to check for values that are not null',
					sql : 'SELECT * FROM [Presentations] WHERE [Preparation] IS NOT NULL',
					keywords : 'Is Not Null',
					parameters : [],
					status : 1,
					version : "0.0.1"
				},

				{
					name : 'Sorting the result',
					description : 'Use the ORDER BY statement to return your data in an orderly fashion',
					sql : 'SELECT * FROM [Presentations] WHERE [Preparation] IS NOT NULL ORDER BY [Created] DESC',
					keywords : 'Sorting, Desc',
					parameters : [],
					status : 0,
					version : "0.0.1"
				},

				{
					name : 'Sorting the result, multiple fields',
					description : 'Use the ORDER BY statement to return your data in an orderly fashion',
					sql : 'SELECT * FROM [Books] ORDER BY [Published] DESC, [Author]',
					keywords : 'Sorting, Asc, Desc',
					parameters : [],
					status : 0,
					version : "0.0.1"
				},
				{
					name : 'Using <Today> element',
					description : 'Use camsql.today to get babies born the last 60 days',
					sql : 'SELECT * FROM [Newborns] WHERE [BirthDate] > ?',
					keywords : 'Today, Date, camlsql.today',
					parameters : [ camlsql.today(-60) ],
					status : 1,
					version : "0.0.1"
				},
				{
					name : 'Using <In> element',
					description : 'Use camsql.today to get babies born the last 60 days',
					sql : 'SELECT * FROM [Newborns] WHERE [Names] In ?',
					keywords : 'In',
					parameters : [ ["Anna", "Johan", "David", "Indigo"] ],
					status : 1,
					version : "0.0.1"
				},
				{
					name : 'Using <Contains> element',
					description : 'Use a LIKE statement to create Contains queries. Surround your text parameter with % characters to create the Contains statement',
					sql : 'SELECT * FROM [Popular Songs] WHERE [Title] LIKE ?',
					keywords : 'LIKE, Contains',
					parameters : [ "%love%"],
					status : 1,
					version : "0.0.1"
				},
				{
					name : 'Using <BeginsWith> element',
					description : 'Use a LIKE statement to create Contains queries. But a % characters in the end of your parameter value.',
					sql : 'SELECT * FROM [Popular Songs] WHERE [Title] LIKE ?',
					keywords : 'LIKE, BeginsWith',
					parameters : [ "love%"],
					status : 1,
					version : "0.0.1"
				},
				{
					name : 'More complex #1 - ? and (? or?)',
					description : 'Combine multiple AND and OR statements to generate the more complex View Xml statements',
					sql : 'SELECT * FROM [Decisions] WHERE [Title] LIKE ? AND ([Motivation] IS NULL OR [IsBoss] = ?)',
					keywords : 'LIKE, BeginsWith',
					parameters : [ "%maybe%", 'Yes'],
					status : 1,
					version : "0.0.1"
				},
				{
					name : 'More complex #2 - ? and ((? and ?) or ?)',
					description : 'Combine multiple AND and OR statements to generate the more complex View Xml statements',
					sql : 'SELECT * FROM [Decisions] WHERE [Title] LIKE ? AND ((Field1 = ? AND Field2 = ?) OR Field3 = ?)',
					keywords : 'LIKE, BeginsWith',
					parameters : [ "%maybe%", 'Yes'],
					status : 1,
					version : "0.0.1"
				},
				{
					name : 'More complex #3 - ? and ((? and ?) or (? and ?))',
					description : 'x',
					sql : 'SELECT * FROM [Decisions] WHERE [Title] LIKE ? AND ((Field1 = ? AND Field2 = ?) OR (Field3 = ? and Field4 < ?))',
					keywords : 'LIKE, BeginsWith',
					parameters : [ "%maybe%", 'Value1', 'Value2', 'Value3', 1970],
					status : 0,
					version : "0.0.1"
				},
				{
					name : 'Using Include to get ListItem properties',
					description : 'x',
					sql : 'SELECT * FROM [Decisions]',
					customSqlText : '.prepare(..).include("Id, DisplayName, HasUniqueRoleAssignments")',
					include : 'Id, DisplayName, HasUniqueRoleAssignments',
					keywords : 'LIKE, BeginsWith',
					parameters : [],
					status : 0,
					raw : 'camlsql.prepare("SELECT * FROM [Pages]").include("Id, DisplayName, HasUniqueRoleAssignments").exec(function(err, rows) {})',
					version : "0.0.1",
					urls : [
						{
							title : 'How to: Retrieve List Items Using JavaScript',
							url : 'https://msdn.microsoft.com/en-us/library/office/hh185007(v=office.14).aspx'
						}
					]
				}

				

			]
		} 
	},
	watch: {
	    '$route' : function(to, from) {
	      // react to route changes...
	    } 
	  }
}