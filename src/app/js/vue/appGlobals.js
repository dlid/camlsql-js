var appGlobals = {

  examples : [

        {
          id : 1,
          name : 'Basic field selection',
          description : 'Provide a comma separated list of field name between SELECT and FROM to create the ViewFields element',
          sql : 'SELECT [Title], [Preamble], [Created] FROM [Pages]',
          xml : '<View><ViewFields><FieldRef Name="Title" /><FieldRef Name="Preamble" /><FieldRef Name="Created" /></ViewFields></View>',
          keywords : 'ViewFields',
          parameters : [],
          status : 1,
          version : "0.0.1",
          body : '<p>It is always good to specify which fields you need, or the query may take longer that you\d like.</p><div class="notice"><strong>Note!</strong> It\'s a good idea to always wrap field and list names within brackets: [ and ]</div>'
        },

        {
          id : 2,
          name : 'Basic Text comparison - Equal to',
          description : 'Use = operator with a string parameter to create the Eq element',
          sql : 'SELECT * FROM [Pages] WHERE [Title] = ?',
          xml : '',
          keywords : 'Text, Equal',
          parameters : [
            "My Page"
          ],
          xml : '<View><Query><Where><Eq><FieldRef Name="Title" /><Value Type="Text">My Page</Value></Eq></Where></Query></View>',
          parametersAsString : ['"My Page"'],
          status : 1,
          version : "0.0.1",
          body : '<p></p>'
        },

        {
          id : 3,
          name : 'Basic Number comparison - Equal to',
          description : 'Use = operator with a numeric parameter to create the Eq element',
          sql : 'SELECT * FROM [Pages] WHERE [Happiness] = ?',
          xml : '<View><Query><Where><Eq><FieldRef Name="Happiness" /><Value Type="Number">5</Value></Eq></Where></Query></View>',
          keywords : 'Number, Equal',
          parameters : [
            5
          ],
          parametersAsString : ['5'],
          status : 1,
          version : "0.0.1"
        },

        {
           id : 4,
          name : 'Basic Number comparison - Less than',
          description : 'Use < operator with a numeric parameter to create the Eq element',
          sql : 'SELECT * FROM [Pages] WHERE [Happiness] < ?',
          keywords : 'Number, Less than',
          parameters : [
            10
          ],
          parametersAsString : ['10'],
          status : 1,
          version : "0.0.1",
          xml : '<View><Query><Where><Lt><FieldRef Name="Happiness" /><Value Type="Number">10</Value></Lt></Where></Query></View>'
        },

        {
           id : 5,

          name : 'Basic Null check',
          description : 'Use the [Field] IS NULL pattern to check for null values',
          sql : 'SELECT * FROM [Presentations] WHERE [Preparation] IS NULL',
          keywords : 'Is Null',
          parameters : [],
          status : 1,
          version : "0.0.1",
          'xml' : '<View><Query><Where><IsNull><FieldRef Name="Preparation" /></IsNull></Where></Query></View>'
        },

        {
           id : 6,

          name : 'Basic NOT Null check',
          description : 'Use the [Field] IS NULL pattern to check for values that are not null',
          sql : 'SELECT * FROM [Presentations] WHERE [Preparation] IS NOT NULL',
          keywords : 'Is Not Null',
          parameters : [],
          status : 1,
          version : "0.0.1",
          xml : '<View><Query><Where><IsNotNull><FieldRef Name="Preparation" /></IsNotNull></Where></Query></View>'
        },

        {
           id : 7,

          name : 'Sorting the result',
          description : 'Use the ORDER BY statement to return your data in an orderly fashion',
          sql : 'SELECT * FROM [Presentations] ORDER BY [Created] DESC',
          keywords : 'Sorting, Desc',
          parameters : [],
          status : 1,
          version : "0.0.1",
          xml : '<View><Query><OrderBy><FieldRef Name="Created" Ascending="False" /></OrderBy></Query></View>'
        },

        {
           id : 8,

          name : 'Sorting the result, multiple fields',
          description : 'Use the ORDER BY statement to return sorted data',
          sql : 'SELECT * FROM [Books] ORDER BY [Published] DESC, [Author]',
          keywords : 'Sorting, Asc, Desc',
          parameters : [],
          status : 1,
          version : "0.0.1",
          xml : '<View><Query><OrderBy><FieldRef Name="Published" Ascending="False" /><FieldRef Name="Author" /></OrderBy></Query></View>'
        },
        {
           id : 9,

          name : 'Using <Today> element',
          description : 'Use camsql.today with an offset parameter to get the babies born the last 60 days',
          sql : 'SELECT * FROM [Newborns] WHERE [BirthDate] > ?',
          keywords : 'Today, Date, camlsql.today',
          parametersAsString : ['camlsql.today(-60)'],
          parameters : [ camlsql.today(-60)],
          status : 1,
          version : "0.0.1",
          xml : '<View><Query><Where><Gt><FieldRef Name="BirthDate" /><Value Type="DateTime"><Today OffsetDays="-60" /></Value></Gt></Where></Query></View>',
          body : 'Note, this will not check time, only date'
        },
        {
          id : 10,
          name : 'Using <In> element',
          description : 'Use camsql.today to get babies born the last 60 days',
          sql : 'SELECT * FROM [Newborns] WHERE [Names] In ?',
          keywords : 'In',
          parameters : [ ["Anna", "Johan", "David", "Indigo"] ],
          status : 1,
          version : "0.0.1"
        },
        {
          id : 11,
          name : 'Using <Contains> element',
          description : 'Use a LIKE statement to create Contains queries. Surround your text parameter with % characters to create the Contains statement',
          sql : 'SELECT * FROM [Popular Songs] WHERE [Title] LIKE ?',
          keywords : 'LIKE, Contains',
          parameters : [ "%love%"],
          parametersAsString : ['"%love%"'],
          status : 1,
          version : "0.0.1"
        },
        {
          id : 12,
          name : 'Using <BeginsWith> element',
          description : 'Use a LIKE statement to create Contains queries. But a % characters in the end of your parameter value.',
          sql : 'SELECT * FROM [Popular Songs] WHERE [Title] LIKE ?',
          keywords : 'LIKE, BeginsWith',
          parameters : [ "love%"],
          status : 1,
          version : "0.0.1"
        },
        {
          id : 13,
          name : 'More complex #1 - ? and (? or?)',
          description : 'Combine multiple AND and OR statements to generate the more complex View Xml statements',
          sql : 'SELECT * FROM [Decisions] WHERE [Title] LIKE ? AND ([Motivation] IS NULL OR [IsBoss] = ?)',
          keywords : 'LIKE, BeginsWith',
          parameters : [ "%maybe%", 'Yes'],
          parametersAsString : [ "'%maybe%'", '"Yes"'],
          status : 1,
          version : "0.0.1",
          xml : '<View><Query><Where><And><Contains><FieldRef Name="Title" /><Value Type="Text">maybe</Value></Contains><Or><IsNull><FieldRef Name="Motivation" /></IsNull><Eq><FieldRef Name="IsBoss" /><Value Type="Text">Yes</Value></Eq></Or></And></Where></Query></View>'
        },
        {
          id : 14,
          name : 'More complex #2 - ? and ((? and ?) or ?)',
          description : 'Combine multiple AND and OR statements to generate the more complex View Xml statements',
          sql : 'SELECT * FROM [Decisions] WHERE [Title] LIKE ? AND ((Field1 = ? AND Field2 = ?) OR Field3 = ?)',
          keywords : 'LIKE, BeginsWith',
          parameters : [ "maybe%", 13, 441.12, "Depracated"],
          status : 1,
          version : "0.0.1",
          xml : '<View><Query><Where><And><BeginsWith><FieldRef Name="Title" /><Value Type="Text">maybe</Value></BeginsWith><Or><IsNull><FieldRef Name="Motivation" /></IsNull><Eq><FieldRef Name="IsBoss" /><Value Type="Number">13</Value></Eq></Or></And></Where></Query></View>'
        },
        {
          id : 15,
          name : 'More complex #3 - ? and (? and ?) or (? and ?)',
          description : 'x',
          sql : 'SELECT * FROM [Decisions] WHERE [Title] LIKE ? AND (Field1 = ? AND Field2 = ?) OR (Field3 = ? and Field4 < ?)',
          keywords : 'LIKE, BeginsWith',
          parameters : [ "%maybe%", 'Value1', 'Value2', 'Value3', 1970],
          status : 1,
          version : "0.0.1",
          xml1 : '<View><Query><Where><And><BeginsWith><FieldRef Name="Title" /><Value Type="Text">maybe</Value></BeginsWith><And><Eq><FieldRef Name="Field1" /><Value Type="Number">13</Value></Eq><Or><Eq><FieldRef Name="Field2" /><Value Type="Number">441.12</Value></Eq><And><Eq><FieldRef Name="Field3" /><Value Type="Text">Depracated</Value></Eq><Lt><FieldRef Name="Field4" /><Value Type="Number">44</Value></Lt></And></Or></And></And></Where></Query></View>',
          xml : '<View><Query><Where><And><BeginsWith><FieldRef Name="Title" /><Value Type="Text">maybe</Value></BeginsWith><Or><And><Eq><FieldRef Name="Field1" /><Value Type="Number">13</Value></Eq><Eq><FieldRef Name="Field2" /><Value Type="Number">441.12</Value></Eq></And><And><Eq><FieldRef Name="Field3" /><Value Type="Text">Depracated</Value></Eq><Lt><FieldRef Name="Field4" /><Value Type="Number">44</Value></Lt></And></Or></And></Where></Query></View>'
        },
        {
          id : 16,
          name : '(FAILS!) More complex #3 - ? and ((? and ?) or (? and ?))',
          description : 'Compare to example 15',
          sql : 'SELECT * FROM [Decisions] WHERE [Title] LIKE ? AND ((Field1 = ? AND Field2 = ?) OR (Field3 = ? and Field4 < ?))',
          keywords : 'LIKE, BeginsWith',
          parameters : [ "%maybe%", 'Value1', 'Value2', 'Value3', 1970],
          status : 0,
          version : "0.0.1",
          xml : '<View><Query><Where><And><BeginsWith><FieldRef Name="Title" /><Value Type="Text">maybe</Value></BeginsWith><And><Eq><FieldRef Name="Field1" /><Value Type="Number">13</Value></Eq><Or><Eq><FieldRef Name="Field2" /><Value Type="Number">441.12</Value></Eq><And><Eq><FieldRef Name="Field3" /><Value Type="Text">Depracated</Value></Eq><Lt><FieldRef Name="Field4" /><Value Type="Number">44</Value></Lt></And></Or></And></And></Where></Query></View>',
        },
        {
          id : 17,
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