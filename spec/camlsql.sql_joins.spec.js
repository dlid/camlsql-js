/**
 * Tests to encode to internal field names
 */
var camlsql = require("../dist/public_html/js/camlsql.js");

describe("JOIN SQL Query #001", function() {

  it("Query 1 -> Basic join", function() {
    var result = camlsql.prepare("SELECT * FROM Comments LEFT JOIN IssueList ON Comments.Issue").getXml();
    expect(result).toEqual('<View><Joins><Join ListAlias="IssueList"><Eq><FieldRef Name="Issue" RefType="Id" /><FieldRef List="IssueList" Name="Id" /></Eq></Join></Joins></View>');
  });

  it("Query 2 -> WHERE on joined field with *", function() {
    expect(function() {
      var result = camlsql.prepare("SELECT * FROM Comments LEFT JOIN IssueList ON Comments.Issue WHERE IssueList.Created = ?", [camlsql.today()]).getXml();
    }).toThrow("[camlsql] The projected field 'IssueList.Created' must be explicitly included in the query");
  });

  it("Query 3 -> WHERE on joined field with specified column alias", function() {
      var result = camlsql.prepare("SELECT Title, IssueList.Created AS IssueCreated FROM Comments LEFT JOIN IssueList ON Comments.Issue WHERE IssueCreated = ?",[camlsql.today()]).getXml();
      expect(result).toEqual('<View><Query><Where><Eq><FieldRef Name="IssueCreated" /><Value Type="DateTime"><Today /></Value></Eq></Where></Query><Joins><Join ListAlias="IssueList"><Eq><FieldRef Name="Issue" RefType="Id" /><FieldRef List="IssueList" Name="Id" /></Eq></Join></Joins><ProjectedFields><Field Name="IssueCreated" List="IssueList" Type="Lookup" ShowField="Created" /></ProjectedFields><ViewFields><FieldRef Name="Title" /><FieldRef Name="IssueCreated" /></ViewFields></View>');
  });

  it("Query 4 -> Join with bad list alias", function() {
    expect(function() {
      var result = camlsql.prepare("SELECT Title, IssueList.Created AS IssueCreated FROM Comments LEFT JOIN IssueList.Hej ON Comments.Issue WHERE IssueCreated = ?", [camlsql.today()]).getXml();
    }).toThrow("[camlsql] Wrap list alias in brackets if it contains special characters: IssueList.Hej");
  });

 it("Query 5 -> Join two levels", function() {
      var result = camlsql.prepare("SELECT Title, IssueList.Created AS IssueCreated FROM Comments LEFT JOIN IssueList ON Comments.Issue JOIN IssuePriorityList ON IssueList.Prio WHERE IssueCreated = ?", [camlsql.today()]).getXml();
      expect(result).toEqual('<View><Query><Where><Eq><FieldRef Name="IssueCreated" /><Value Type="DateTime"><Today /></Value></Eq></Where></Query><Joins><Join ListAlias="IssueList"><Eq><FieldRef Name="Issue" RefType="Id" /><FieldRef List="IssueList" Name="Id" /></Eq></Join><Join ListAlias="IssuePriorityList"><Eq><FieldRef List="IssueList" Name="Prio" RefType="Id" /><FieldRef List="IssuePriorityList" Name="Id" /></Eq></Join></Joins><ProjectedFields><Field Name="IssueCreated" List="IssueList" Type="Lookup" ShowField="Created" /></ProjectedFields><ViewFields><FieldRef Name="Title" /><FieldRef Name="IssueCreated" /></ViewFields></View>');
  });

}); 
