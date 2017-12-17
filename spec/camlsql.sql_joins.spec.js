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

 describe("SQL Test Query - JOIN #007", function() {
  it('Query 1 -> Expected error because of excluded list in the ON statement', function() {
    expect(function() {
      camlsql.prepare('SELECT * FROM Books JOIN AuthorsList ON AuthorField');
    }).toThrow("[camlsql] You must specify the List Name when joining: JOIN [ListAlias] ON [List].[Field]");
  });
}); 

 describe("SQL Test Query - JOIN #008", function() {
  it('Query 1 -> Expected error because of unexpected characters for the list alias', function() {
    expect(function() {
     camlsql.prepare('SELECT * FROM Books JOIN Authors#List ON Books.AuthorField')
   }).toThrow("[camlsql] Wrap list alias in brackets if it contains special characters: Authors#List");
  });
}); 


  describe("SQL Test Query - JOIN #009", function() {
    it('Query 1 -> Expected error because missing alias for projected field', function() {
      expect(function() {
       camlsql.prepare('SELECT OtherList.Cheese FROM Books JOIN OtherList ON Books.AuthorField')
     }).toThrow("[camlsql] Projected fields in the format <list>.<field_name> must be followed with an AS <alias>");
    });
  }); 

  describe("SQL Test Query - JOIN #010", function() {
    it('Query 1 -> Expected error when using projected fields without a JOIN', function() {
      expect(function() {
       camlsql.prepare('SELECT Hej.Apa as Meh FROM List1').getXml()
     }).toThrow("[camlsql] You must JOIN another list to use projected fields");
    });
  }); 

   describe("SQL Test Query - JOIN #011", function() {
    it('Query 1 -> Expected error when including a projected fields on an unknown list alias', function() {
      expect(function() {
       camlsql.prepare('SELECT Hej.Apa as Meh JOIN OtherList ON List1.Field1 FROM List1').getXml()
     }).toThrow("[camlsql] Uknown list alias: Hej");
    });
  }); 

