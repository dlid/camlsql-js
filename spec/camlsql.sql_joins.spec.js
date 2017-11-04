/**
 * Tests to encode to internal field names
 */
var camlsql = require("../dist/public_html/js/camlsql.js");

describe("SQL Test Query - JOIN #001", function() {

  it('Query 1 -> Join the linked list with the alias IssueList via the Lookup column "Issues"', function() {
    var result = camlsql.prepare("SELECT * FROM Comments LEFT JOIN IssueList ON Comments.Issue").getXml();
    expect(result).toEqual('<View><Joins><Join ListAlias="IssueList"><Eq><FieldRef Name="Issue" RefType="Id" /><FieldRef List="IssueList" Name="Id" /></Eq></Join></Joins></View>');
  });

}); 

describe("SQL Test Query - JOIN #002", function() {

  it('Query 1 -> Expected error since the IssueList.Created column was not explicitly included in the field list', function() {
    expect(function() {
      var result = camlsql.prepare("SELECT * FROM Comments LEFT JOIN IssueList ON Comments.Issue WHERE IssueList.Created = ?", [camlsql.today()]).getXml();
    }).toThrow("[camlsql] The projected field 'IssueList.Created' must be explicitly included in the query");
  });

}); 

describe("SQL Test Query - JOIN #003", function() {

  it("Query 1 -> Join list on linked field and define a WHERE condition on a field in the joined list", function() {
      var result = camlsql.prepare("SELECT Title, IssueList.Created AS IssueCreated FROM Comments LEFT JOIN IssueList ON Comments.Issue WHERE IssueCreated = ?",[camlsql.today()]).getXml();
      expect(result).toEqual('<View><Query><Where><Eq><FieldRef Name="IssueCreated" /><Value Type="DateTime"><Today /></Value></Eq></Where></Query><Joins><Join ListAlias="IssueList"><Eq><FieldRef Name="Issue" RefType="Id" /><FieldRef List="IssueList" Name="Id" /></Eq></Join></Joins><ProjectedFields><Field Name="IssueCreated" List="IssueList" Type="Lookup" ShowField="Created" /></ProjectedFields><ViewFields><FieldRef Name="Title" /><FieldRef Name="IssueCreated" /></ViewFields></View>');
  });

}); 

describe("SQL Test Query - JOIN #004", function() {

  it("Query 1 -> With specified fields you can query on Projected fields without including it in the fields list. Then one will be created automatically.", function() {
      var result = camlsql.prepare("SELECT Title FROM Comments LEFT JOIN IssueList ON Comments.Issue WHERE IssueList.Created = ?",[camlsql.today()]).getXml();
      expect(result).toEqual('<View><Query><Where><Eq><FieldRef Name="camlsqlfld_1" /><Value Type="DateTime"><Today /></Value></Eq></Where></Query><Joins><Join ListAlias="IssueList"><Eq><FieldRef Name="Issue" RefType="Id" /><FieldRef List="IssueList" Name="Id" /></Eq></Join></Joins><ProjectedFields><Field Name="camlsqlfld_1" List="IssueList" Type="Lookup" ShowField="Created" /></ProjectedFields><ViewFields><FieldRef Name="Title" /><FieldRef Name="camlsqlfld_1" /></ViewFields></View>');
  });

})

describe("SQL Test Query - JOIN #005", function() {

  it("Query 1 -> Fail if you have a special character (dot in this case) in the list alias and have no surrounding brackets", function() {
    expect(function() {
      var result = camlsql.prepare("SELECT Title, IssueList.Created AS IssueCreated FROM Comments LEFT JOIN IssueList.Hej ON Comments.Issue WHERE IssueCreated = ?", [camlsql.today()]).getXml();
    }).toThrow("[camlsql] Wrap list alias in brackets if it contains special characters: IssueList.Hej");
  });

}); 


describe("SQL Test Query - JOIN #006", function() {
  
 it("Query 1 -> For comments, join connected issue from separate list. Then join the Priority of that issue from yet another list.", function() {
      var result = camlsql.prepare("SELECT Title, IssueList.Created AS IssueCreated FROM Comments LEFT JOIN IssueList ON Comments.Issue JOIN IssuePriorityList ON IssueList.Prio WHERE IssueCreated = ?", [camlsql.today()]).getXml();
      expect(result).toEqual('<View><Query><Where><Eq><FieldRef Name="IssueCreated" /><Value Type="DateTime"><Today /></Value></Eq></Where></Query><Joins><Join ListAlias="IssueList"><Eq><FieldRef Name="Issue" RefType="Id" /><FieldRef List="IssueList" Name="Id" /></Eq></Join><Join ListAlias="IssuePriorityList"><Eq><FieldRef List="IssueList" Name="Prio" RefType="Id" /><FieldRef List="IssuePriorityList" Name="Id" /></Eq></Join></Joins><ProjectedFields><Field Name="IssueCreated" List="IssueList" Type="Lookup" ShowField="Created" /></ProjectedFields><ViewFields><FieldRef Name="Title" /><FieldRef Name="IssueCreated" /></ViewFields></View>');
  });


}); 
