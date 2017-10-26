var executeQuery = function () {
        var args = Array.prototype.slice.call(arguments),
            spWeb = null,
            execCallback = null,
            clientContext,
            spList = null,
            listName = this.getListName(),
            spListItems = null,
            viewXml = this.getXml();

        if (args.length > 1) {
            if (typeof args[0] === "object") {
                spWeb = args[0];
                if (typeof args[1] == "function") {
                    execCallback = args[1];
                }
            }
        } else if (args.length == 1) {
            if (typeof args[0] === "object") {
                spWeb = args[0];
            } else if (typeof args[0] == "function") {
                execCallback = args[0];
            }
        }

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

            while (listItemEnumerator.moveNext()) {
                spListItem = listItemEnumerator.get_current();
                items.push(spListItem.get_fieldValues());
            }
            execCallback(null, items);
        }

        console.log({
            web: spWeb,
            callback: execCallback
        });

        return this;
    }