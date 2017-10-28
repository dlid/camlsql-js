
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
            viewXml = options.query.getXml(),
            nextPage,
            prevPage;

        if (typeof SP !== "undefined") {

            SP.SOD.executeFunc('sp.js', 'SP.ClientContext', function () {
                clientContext = SP.ClientContext.get_current();
                if (spWeb === null) {
                    spWeb = clientContext.get_web();
                    spList = spWeb.get_lists().getByTitle(listName);

                    clientContext.load(spList);
                    clientContext.executeQueryAsync(onListLoaded, function () {
                        execCallback({
                            status: "error",
                            message: "Failed to load list",
                            data: {
                                sql: getSql,
                                viewXml: viewXml,
                                listName: listName,
                                error: Array.prototype.slice.call(arguments)
                            }
                        }, null);
                    });

                }
            });

        } else {
            execCallback({
                status: "error",
                message: "SP is not defined",
                data: null
            }, null);
        }

        function onListLoaded() {
            var camlQuery = new SP.CamlQuery();
            var camlQueryString = viewXml;


            camlQuery.set_viewXml(camlQueryString);
            console.log("camlQuery", camlQuery);
            spListItems = spList.getItems(camlQuery);
            clientContext.load(spListItems);
            clientContext.executeQueryAsync(camlQuerySuccess, function () {
                execCallback({
                    status: "error",
                    message: "Error executing the SP.CamlQuery",
                    data: {
                        sql: getSql,
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

            var listItemCollectionPosition = spListItems.get_listItemCollectionPosition();

            if (listItemCollectionPosition) {
                nextPage = listItemCollectionPosition.get_pagingInfo();
            }

            while (listItemEnumerator.moveNext()) {
                spListItem = listItemEnumerator.get_current();
                if (!prevPage) {
                    prevPage = "PagedPrev=TRUE&Paged=TRUE&p_ID=" + encodeURIComponent(spListItem.get_id());
                }
                items.push(spListItem.get_fieldValues());
            }
            execCallback(null, items, {
                nextPage : nextPage,
                prevPage : prevPage
            });
        }

        console.log({
            web: spWeb,
            callback: execCallback
        });

        return publicItems;
    }