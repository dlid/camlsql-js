
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
            timeZone = null,
            listName = options.query.getListName(),
            spListItems = null,
            regionalSettings = null,
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


                console.warn("GET SERVER TIMEZOE", _spPageContextInfo.webServerRelativeUrl + "/_api/web/RegionalSettings/TimeZone");


                ajaxGet(_spPageContextInfo.webServerRelativeUrl + "/_api/web/RegionalSettings/TimeZone", function(e,r) {
                    console.warn("TZ INFO", e, r);
                });

                clientContext = SP.ClientContext.get_current();
                if (spWeb !== null) {
                    if (typeof spWeb === "string") {
                        spWeb = site.openWeb(spWeb);
                    }
                } 

                if (!spWeb) spWeb = clientContext.get_web();;
                    
                // regionalSettings = spWeb.get_regionalSettings();
                spList = spWeb.get_lists().getByTitle(listName);
                // timeZone = regionalSettings.get_timeZone();
                if (noCallback && console) console.log("[camlsql] Loading list '" + listName + "'"); 
                clientContext.load(spList);
                // clientContext.load(regionalSettings);
                // clientContext.load(timeZone);
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
            camlQuery.set_datesInUtc(false);
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

            // var info = timeZone.get_information();
            // var offset = (info.get_bias() /*+ (info.get_daylightBias() )*/) / 60.0;
            // console.log("TIMEZONE offset", info.get_bias(), info.get_daylightBias(), offset);

            while (listItemEnumerator.moveNext()) {
                spListItem = listItemEnumerator.get_current();
                values = spListItem.get_fieldValues();
                if (!prevPage) {
                    prevPage = "PagedPrev=TRUE&Paged=TRUE&p_ID=" + encodeURIComponent(spListItem.get_id());
                }

                for(var k in values) {
                    if (values[k] && typeof values[k].getTimezoneOffset == "function") {
                        if (k == "DateTime_x0020_field") {
                           // var o = (values[k].getTimezoneOffset() / 60) * -1 ;
                            // var d = new Date(values[k].getTime() - ((offset ) * 3600 * 1000));
                            // console.log(k, "is a date", values[k], values[k].getUTCFullYear(), values[k].getUTCMonth(), values[k].getUTCDate(), values[k].getUTCHours(), values[k].getUTCMinutes(), values[k].getUTCSeconds() );
                            // console.log(d, "is a date2", d, d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds() );
                        }
                    }
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


    function ajaxGet(url, callback) {

    var xhr = new XMLHttpRequest();
        xhr.open('GET', url);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.setRequestHeader('Accept', 'application/json; odata=verbose');
        xhr.onload = function() {
            if (xhr.status === 200) {
                callback(null, xhr.responseText)
            } else {
                callback(xhr, null);
            }
        };
        xhr.send();

    }