/**
 * Tests to encode to internal field names
 */
 var camlsql = require("../dist/public_html/js/camlsql.js");

 describe("SQL Test Queries - Membership #001", function() {

  it("Query 1", function() {
    var result = camlsql.prepare('SELECT * FROM List1 WHERE AssignedTo = ?', [camlsql.membership('CurrentUserGroups')]).getXml()
    expect(result).toEqual('<View><Query><Where><Membership Type="CurrentUserGroups"><FieldRef Name="AssignedTo" /></Membership></Where></Query></View>');
  });


}); 


 describe("SQL Test Queries - Membership #002", function() {
  it("Query 1", function() {
    var result = camlsql.prepare('SELECT * FROM List1 WHERE AssignedTo = ?', [camlsql.membership('SPWeb.ALlUsers')]).getXml()
    expect(result).toEqual('<View><Query><Where><Membership Type="SPWeb.AllUsers"><FieldRef Name="AssignedTo" /></Membership></Where></Query></View>');
  });
}); 


 describe("SQL Test Queries - Membership #003", function() {
  it("Query 1", function() {

    expect(function() {
      var result = camlsql.prepare('SELECT * FROM List1 WHERE AssignedTo = ?', [camlsql.membership('SPGroup')]).getXml()
    }).toThrow("[camlsql] When using SPGroup you must specify a numeric GroupID");
  });

}); 

 describe("SQL Test Queries - Membership #004", function() {
  it("Query 1", function() {

    expect(function() {
      var result = camlsql.prepare('SELECT * FROM List1 WHERE AssignedTo = ?', [camlsql.membership('SPGroup', 'test')]).getXml()
    }).toThrow("[camlsql] When using SPGroup you must specify a numeric GroupID");
  });

}); 


 describe("SQL Test Queries - Membership #005", function() {
  it("Query 1", function() {

    var result = camlsql.prepare('SELECT * FROM List1 WHERE AssignedTo = ?', [camlsql.membership('SPGroup', 5)]).getXml();
    expect(result).toEqual('<View><Query><Where><Membership Type="SPGroup" ID="5"><FieldRef Name="AssignedTo" /></Membership></Where></Query></View>');

  });

}); 

 describe("SQL Test Queries - Membership #006", function() {
  it("Query 1", function() {
    var result = camlsql.prepare('SELECT * FROM List1 WHERE AssignedTo = ?', [camlsql.membership('SPWeb.Allusers')]).getXml();
    expect(result).toEqual('<View><Query><Where><Membership Type="SPWeb.AllUsers"><FieldRef Name="AssignedTo" /></Membership></Where></Query></View>');
  });
}); 

 describe("SQL Test Queries - Membership #007", function() {
  it("Query 1", function() {
    var result = camlsql.prepare('SELECT * FROM List1 WHERE AssignedTo = ?', [camlsql.membership('SPWeb.Groups')]).getXml();
    expect(result).toEqual('<View><Query><Where><Membership Type="SPWeb.Groups"><FieldRef Name="AssignedTo" /></Membership></Where></Query></View>');
  });

}); 



 describe("SQL Test Queries - Membership #008", function() {
  it("Query 1", function() {
    var result = camlsql.prepare('SELECT * FROM List1 WHERE AssignedTo = ?', [camlsql.membership('SPWeb.Users')]).getXml();
    expect(result).toEqual('<View><Query><Where><Membership Type="SPWeb.Users"><FieldRef Name="AssignedTo" /></Membership></Where></Query></View>');
  });
}); 

 describe("SQL Test Queries - Membership #009", function() {
  it("Query 1", function() {
  expect(function() {
   var result = camlsql.prepare('SELECT * FROM List1 WHERE AssignedTo = ?', [camlsql.membership('Swedish curd cake')]).getXml()
  }).toThrow("Membership type should be one of SPWeb.AllUsers, SPGroup, SPWeb.Groups, CurrentUserGroups, SPWeb.Users");
 }); 
}); 


 //   it("Query 2", function() {
 //    var result = camlsql.prepare('SELECT * FROM List1 WHERE Field1 LIKE ?', ['hello%']).getXml()
 //    expect(result).toEqual('<View><Query><Where><BeginsWith><FieldRef Name="Field1" /><Value Type="Text">hello</Value></BeginsWith></Where></Query></View>');
 //  });

 //   it("Query 3", function() {
 //    var result = camlsql.prepare('SELECT * FROM List1 WHERE Field1 LIKE ?', ['%hello%']).getXml()
 //    expect(result).toEqual('<View><Query><Where><Contains><FieldRef Name="Field1" /><Value Type="Text">hello</Value></Contains></Where></Query></View>');
 //  });

 //  it("Query 4 => error if param ends with", function() {
 //   expect(function() {
 //    var result = camlsql.prepare('SELECT * FROM List1 WHERE Field1 LIKE ?', ['%hello']).getXml()
 //  }).toThrow("[camlsql] SharePoint does not support an 'EndsWith' statement: %hello");
 // });
