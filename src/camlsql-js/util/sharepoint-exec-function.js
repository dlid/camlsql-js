
 /**
 * The parsed query
 * @typedef {Object} CamlSql~execOptions
 * @property {CamlSql~ParsedQuery} query - The parsed query to execute
 * @property {function} callback - The callback function
 * @where {Array.<CamlSql~Condition>}
 */ 

function executeSPQuery(options) {
        var spWeb = options.spWeb,
            execCallback = options.callback,
            clientContext,
            spList = null,
            listName = options.query.getListName(),
            spListItems = null,
            viewXml = options && options.rawXml ? options.rawXml : options.query.getXml(true),
            nextPage,
            prevPage,
            noCallback = false,
            groupBy = options.query.$options.parsedQuery.group;


        if (typeof execCallback !== "function") execCallback = null;

        if (groupBy && options.query.$options.parsedQuery.fields.length > 0) {
            if ( options.query.$options.parsedQuery.fields.indexOf(groupBy.field)=== -1 )
                throw "[camlsql] The Grouping Field must be included in the field list";   
        }


        if (!execCallback) {
            noCallback = true;
            execCallback = function(err, rows) {
                if (typeof console !== "undefined") {
                    if (err) console.error(err);
                    if (typeof console.table !== "undefined") {
                        console.table(rows);
                    } else {
                        console.log("[camlsql] Result", rows);
                    }
                }
            }
        }

        if (typeof SP !== "undefined") {

            SP.SOD.executeFunc('sp.js', 'SP.ClientContext', function () {});
            SP.SOD.executeOrDelayUntilScriptLoaded(function() {
                clientContext = SP.ClientContext.get_current();
                if (!spWeb) {
                    spWeb = clientContext.get_web();
                    spList = spWeb.get_lists().getByTitle(listName);
                    if (noCallback && console) console.log("[camlsql] Loading list '" + listName + "'"); 
                    clientContext.load(spList);
                    clientContext.executeQueryAsync(onListLoaded, function () {
                        if (execCallback == null) {
                            throw "[camlsql] Failed to load list";
                        }
                        execCallback({
                            status: "error",
                            message: "Failed to load list",
                            data: {
                                sql: options.query.$options.parsedQuery.query,
                                viewXml: viewXml,
                                listName: listName,
                                error: Array.prototype.slice.call(arguments)
                            }
                        }, null);
                    });

                }
            },"sp.js");

        } else {
            if (noCallback) {
                if (typeof console !== "undefined") {
                    console.log("[camlsql] ViewXML:", options.query.getXml(true));
                }
            }
            if (execCallback == null) {
                // Output xml and info?
                throw "[camlsql] SP is not defined";
            }
            execCallback({
                status: "error",
                message: "SP is not defined",
                data: null
            }, null);
        }

        function onListLoaded() {
            var camlQuery = new SP.CamlQuery();
            var camlQueryString = options.query.getXml(true);
            camlQuery.set_viewXml(camlQueryString);
            spListItems = spList.getItems(camlQuery);
            if (noCallback && console) console.log("[camlsql] Executing SP.CamlQuery", camlQueryString); 
            clientContext.load(spListItems);
            clientContext.executeQueryAsync(camlQuerySuccess, function (clientRequest, failedEventArgs) {
                var extraMessage = "";
                if (failedEventArgs) {
                    if (failedEventArgs.get_errorCode() == -2130575340) {
                        extraMessage+= " (Error -2130575340: Check field names)";
                    }
                }

                execCallback({
                    status: "error",
                    message: "Error executing the SP.CamlQuery" + extraMessage,
                    data: {
                        sql: options.query.$options.parsedQuery.query,
                        viewXml: viewXml,
                        listName: listName,
                        error: Array.prototype.slice.call(arguments)
                    }
                }, null);
            });
        }

         function camlQuerySuccess() {
            var listItemEnumerator = spListItems.getEnumerator(),
                items = [],
                spListItem;

            var listItemCollectionPosition = spListItems.get_listItemCollectionPosition(),
                values, field, groupByValue,
                groupIndexes = {};

            if (listItemCollectionPosition) {
                nextPage = listItemCollectionPosition.get_pagingInfo();
            }
            while (listItemEnumerator.moveNext()) {
                spListItem = listItemEnumerator.get_current();
                values = spListItem.get_fieldValues();
                if (!prevPage) {
                    prevPage = "PagedPrev=TRUE&Paged=TRUE&p_ID=" + encodeURIComponent(spListItem.get_id());
                }

                if (groupBy) {
                    field = groupBy.field;
                    if (values[field] === null) {
                        groupByValue = null;
                    } else if (typeof values[field] === "object" && typeof values[field].toString !== "undefined") {
                        if (typeof values[field].get_lookupValue === "function") {
                            groupByValue = values[field].get_lookupValue();
                        } else {
                            groupByValue = values[field].toString();
                        }
                    } else {
                        groupByValue = values[field];
                    }

                    if (typeof groupIndexes[groupByValue] === "undefined") {
                        items.push({
                            groupName : groupByValue,
                            items : [values]
                        });
                        groupIndexes[groupByValue] = items.length -1;
                    } else {
                        items[groupIndexes[groupByValue]].items.push(values);
                    }
                } else {

                    items.push(values);
                }
            }
            execCallback(null, items, {
                nextPage : nextPage,
                prevPage : prevPage
            });
        }
    }