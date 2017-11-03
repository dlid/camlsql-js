/**
 * Parse the WHERE statements
 * @param {[type]} whereString [description]
 * @param {[type]} quiet       [description]
 * @returns array [description]
 */

var WhereParser = function(whereString, quiet) {
    var blockOpen = '(',
        blockClose = ')',
        conjunction = ['and', 'or', '&&', '||'],
        operators = ['=', '<', '>', '!'],
        prevMacro = null,
        result = {
            statements : [], 
            macroType : null,
            macroCount : 0,
            macros : []
        };

        if (typeof whereString === "undefined") return result;

        whereString = whereString.replace(/^.*?(WHERE\s)/i, '');
        whereString = whereString.replace(/(.*?)\s?ORDER\sBY.*$/i, '$1');

        function trim(str) {
            return str.replace(/^\s+|\s+$/g, '');
        }

        // vkbeautify.xml(camlsql.prepare("SELECT * FROM Movies WHERE (Title = ? AND Title LIKE ?) AND (Fun = ? OR Scary < ?)",["summer", 'did', 10, 6,0,6]).getXml());

        function parse_blocks(str, level) {
            var i,
                blockStartIndex = null,
                blockStopIndex = null,
                blocks = [],
                startCount = 0,
                op,
                sp,
                childBlocks,
                statements,
                j,s,p,newBlocks,si,
                prevBlockEnd = null;
                
            str = trimParanthesis(str);
                
            level = level ? level : 0;
            for (i=0; i < str.length; i++) {

                if (str[i] == blockOpen) {
                    if (startCount == 0) {
                        //console.warn("Block start@", i, str.substr(i));
                        if (i > 0 && blocks.length == 0) {
                           //console.warn("addx start@", 0, i);
                           blocks.push(str.substring(0, i));
                        } else if (prevBlockEnd != null) {
                            blocks.push(str.substring(prevBlockEnd, i));
                        }
                        blockStartIndex = i;
                        blockStopIndex = null;
                    } 
                    startCount++;
                } else if (str[i] == blockClose && blockStartIndex !== null) {
                    startCount--;
                    if(startCount == 0) {
                        si = blockStartIndex;
                        if (prevBlockEnd !== null) {
                            //si = prevBlockEnd;
                            if (prevBlockEnd < i - 1) {
                                //console.warn("yo", str.substring(prevBlockEnd, i))
                                //blocks.push(str.substring(prevBlockEnd, i));
                            }

                        }

                       /// console.warn("end_add@", i, str.substring(blockStartIndex, i+1 ));
                        blocks.push(trim(str.substring(blockStartIndex, i+1 )).replace(/^\(|\)$/g,''));
                        blockStopIndex = i+1;
                        prevBlockEnd = i+1;
                        blockStartIndex = null;

                    }
                }
            }
            //console.log("parse_blocks"+level+"==", blocks);
            if (blockStopIndex != null && blockStartIndex == null) {
                if (trim(str.substring(blockStopIndex))) {
                    blocks.push(trim(str.substring(blockStopIndex)));
                }
            } else if (blockStartIndex != null) {
                //console.log("ADDx", blockStartIndex);
               // blocks.push(trim(str.substring(blockStopIndex)));
            } else if (blocks.length == 0 && blockStartIndex == null && blockStopIndex == null) {
                blocks.push(trim(str));
            }

           // console.log("parse_blocks"+level+" ==", blocks);
           // return;


            for (i=0; i < blocks.length; i++) {

                op = 'and';
                // Determine operator for "i"

                if (blocks[i].match(/^\s*(\|\||(or))\s*/i)) {
                   // console.warn("FOUND AN OR ", blocks[i]);
                    op = 'or';

                }

                if (blocks[i].match(/\s*(?:\|\||(or))\s*$/gi)) {
                    if (i < blocks.length -1) {
                        if (!blocks[i+1].match(/^\s*(\|\||or|and|\&\&)/gi)) {
                            blocks[i+1] = "or " + blocks[i+1];

                        }
                    }
                }
                blocks[i] = blocks[i].replace(/\s*(\&\&|and)\s*$/i, '');
                blocks[i] = blocks[i].replace(/\s*(\|\||or)\s*$/i, '');
                blocks[i] = blocks[i].replace(/^\s*(\&\&|and)\s*/i, '');
                blocks[i] = blocks[i].replace(/^\s*(\|\||or)\s*/i, '');


                if (i > 0) {
                    blocks[i] = {
                        type : 'statement',
                        value : blocks[i],
                        operator : op
                    };
                } else {

                    blocks[i] = {
                        type : 'statement',
                        value : blocks[i],
                        operator : op
                    };
                }

                var n = blocks[i].value.indexOf(blockOpen) > 0;

 
                if (n) {
                    
                    childBlocks = parse_blocks(blocks[i].value, level+1);
                    //console.log("childBlocks", childBlocks.length);
                    if (childBlocks.length > 1) {
                        blocks[i].type = 'group';
                        blocks[i].items = childBlocks;
                        
                    }
                } else {
                    sp = blocks[i].value.split(/ (\|\||or|and|\&\&) /i);
                    blocks[i].type = 'statement';
                    statements = [];
                    for (j = 0; j < sp.length; j++) {
                        s = {type : 'statement', operator : 'and'};
 
                        if (trim(sp[j]) == "") continue;

                        if (sp[j].toLowerCase() == "and" || sp[j].toLowerCase() == "or" || sp[j] == "||" || sp[j] == "&&" )
                            continue;

                        if (j > 0) {
                            if ( sp[j-1].toLowerCase() == "or" || sp[j-1] == "||")
                                s.operator = "or";
                        }
                        p = parseStatement(sp[j]);
                        if (p) {
                            s.field = formatFieldName(p.field);
                            s.macro = p.macro;
                            s.comparison = p.comparison;
                            statements.push(s);
                        } else {
                            if(!quiet) throw "[casql] Could not parse statement: " +sp[j];
                        }
                    }
                    if (statements.length > 1) {
                        blocks[i].type = 'group';
                        blocks[i].items = statements;
                    } else if (statements.length == 1) {
                        blocks[i].field = formatFieldName(statements[0].field);
                        blocks[i].macro = statements[0].macro;
                        blocks[i].comparison = statements[0].comparison;

                    }   
                }
            }

            newBlocks = [];
            for(i=0; i < blocks.length; i++) {
                if (blocks[i].value) newBlocks.push(blocks[i]);
            }



            return newBlocks;
        }

      

        var _parameters = 0,
            _numMacros = 0,
            _macros = [];
        function parseStatement(str) {

            if (typeof str === "undefined") return null;

            str = str.replace(/ is not null/i, ' isnotnull ?');
            str = str.replace(/ is null/i, ' isnull ?');

            var m = str.match(/(.*)\s*(<>|>=|[^<]>|<=|<[^>]|[^<>]=|like|isnull|isnotnull|in)\s*(\?|@[a-z0-9_]+)/i);
            if (m) {

                //console.warn("MATCH!", m);
                var comparison = "eq",
                    macro  = "@param" + _parameters,
                    cmpMatch = trim(m[2]);

                if (cmpMatch == '>') comparison = "gt";
                if (cmpMatch == '>=') comparison = "gte";
                if (cmpMatch == '<') comparison = "lt";
                if (cmpMatch == '<=') comparison = "lte";
                if (cmpMatch == '==') comparison = "eq";
                
                if (cmpMatch == '<>' || cmpMatch == "!=") comparison = "ne";
                if (cmpMatch.toLowerCase() == 'like') comparison = "like";
                if (cmpMatch.toLowerCase() == 'isnull') comparison = "null";
                if (cmpMatch.toLowerCase() == 'isnotnull') comparison = "notnull";
                if (cmpMatch.toLowerCase() == 'in') comparison = "in";

                if (comparison != "null" && comparison != "notnull") {
                    _parameters++; 
                    _numMacros++;
                    if (prevMacro == null) 
                        prevMacro = m[3][0];
                    else if (prevMacro != m[3][0]) {
                        throw "[camlsql] You can not mix named macros and ?";
                        return null;
                    }
                    if (m[3][0] == "@") {
                        macro = m[3];
                    } 
                    _macros.push(macro);
                } else {
                    macro = null;
                }

                return {
                    field : formatFieldName(m[1]),
                    comparison : comparison,
                    macro : macro
                };
            }
            return null;
        }

        var parsed = parse_blocks(whereString);
        if (typeof parsed !== "undefined") {
            result.statements = parsed;
        }
        //console.log("PARSED", whereString, parsed);

        result.macroType = prevMacro;
        result.macroCount = _numMacros;
        result.macros = _macros;

    return result;



}; 

