/* CoindeskCache
 * Cache server for the coindesk api.
 * (c) 2019 David (daXXog) Volm ><> + + + <><
 * Released under Apache License, Version 2.0:
 * http://www.apache.org/licenses/LICENSE-2.0.html  
 */

/* UMD LOADER: https://github.com/umdjs/umd/blob/master/returnExports.js */
(function (root, factory) {
    if (typeof exports === 'object') {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like enviroments that support module.exports,
        // like Node.
        module.exports = factory();
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(factory);
    } else {
        // Browser globals (root is window)
        root.CoindeskCache = factory();
  }
}(this, function() {
    var CoindeskCache;

    var ErrorHandler = function(err) {
        if(err) {
            throw(err);
        }
    };

    var opt = require('optimist')
        .alias('e', 'endpoint')
            .describe('e', 'The CoinDesk API endpoint.')
            .default('e', 'https://api.coindesk.com/v1/bpi/')

        .alias('db', 'database')
            .describe('db', 'The MongoDB connection url.')
            .default('db', 'mongodb://coindesk:password@127.0.0.1:27017/coindesk')

        .alias('c', 'collection')
            .describe('c', 'The MongoDB collection name.')
            .default('c', 'coindesk')

        .alias('p', 'port')
            .describe('p', 'The port to listen on.')
            .default('p', 7777)

        argv = opt.argv;

    var express = require('express'),
        app = express(),
        port = opt.argv.port;

    var request = require('request');

    var path = require('path');

    var MongoClient = require('mongodb').MongoClient;

    var sf = require('switch-factory');

    var moment = require('moment');

    var apiHeader = "/v1/bpi/",
        apiEndpoints = ["supported-currencies.json", "currentprice.json", "currentprice/[!supported].json", "historical/close.json"],
        isSupported = function(x) {/*console.log("isSupported placeholder function", x);*/ return false;},
        supportedIndex = ['USD', 'CNY'],
        isValidIndex = sf.is(supportedIndex),
        onlyNumbers = sf.is((function() {
            var a = [];

            for (var i = 0; i <= 9; i++) { 
                a.push(i.toString());
            }

            return a;
        })());

    CoindeskCache = function() {
        console.log("Connecting to database via connection string: " + argv.database);

        MongoClient.connect(argv.database, { useNewUrlParser: true }, function(err, client) {
            if(!err) {
                var db = client.db();
                console.log("Connected to database: " + db.s.databaseName);

                db.collection(argv.collection, function(err, collection) {
                    if(!err) {

                        apiEndpoints.forEach(function(__endpoint) {
                            var _endpoint = __endpoint.replace("[!supported]", "*"),
                                endpointSpecial = !(_endpoint === __endpoint),
                                endpointGet = {};

                            app.get(apiHeader + _endpoint, function(req, res) {
                                var query = {
                                    endpoint: req.path,
                                    date: (new Date()).toDateString()
                                };

                                var remoteEndpoint = argv.endpoint.replace(apiHeader, req.path),
                                    canRun = true,
                                    failReason = false;

                                var resJson = function(obj) {
                                    if(req.path === (apiHeader + "supported-currencies.json")) {
                                        if(!isSupported("EUR")) { //if we are using a dummy function
                                            isSupported = sf.is(obj.map(function(v) { //create a real function
                                                return v.currency;
                                            }));
                                        }
                                    }

                                    res.json(obj);
                                };

                                if(endpointSpecial) {
                                    var currency = path.posix.basename(req.path).replace(".json", "");
                                    canRun = isSupported(currency);

                                    if(!canRun) {
                                        failReason = "unsupported-currency";
                                    }
                                }

                                if(req.path === (apiHeader + "historical/close.json")) {
                                    if(typeof req.query.index !== "undefined") {
                                        if(isValidIndex(req.query.index)) {
                                            endpointGet.index = req.query.index;
                                        } else {
                                            canRun = false;
                                            failReason = "unsupported-index";
                                        }
                                    }

                                    if(typeof req.query.currency !== "undefined") {
                                        if(isSupported(req.query.currency)) {
                                            endpointGet.index = req.query.currency;
                                        } else {
                                            canRun = false;
                                            failReason = "unsupported-currency";
                                        }
                                    }

                                    if(typeof req.query.for !== "undefined") {
                                        if(req.query.for === "yesterday") {
                                            endpointGet.for = req.query.for;
                                        } else {
                                            canRun = false;
                                            failReason = "for-yesterday";
                                        }
                                    }

                                    if((typeof req.query.start !== "undefined") || (typeof req.query.end !== "undefined")) { //has atleast a start or an end
                                        if((typeof req.query.start !== "undefined") && (typeof req.query.end !== "undefined")) { //has both a start and an end
                                            if(CoindeskCache.validDateString(req.query.start)) {
                                                if(CoindeskCache.validDateString(req.query.end)) {
                                                    if(moment(req.query.start).format('X') <= moment(req.query.end).format('X')) {
                                                        endpointGet.start = req.query.start;
                                                        endpointGet.end = req.query.end;
                                                    } else {
                                                        canRun = false;
                                                        failReason = "start-gt-end";
                                                    }
                                                } else {
                                                    canRun = false;
                                                    failReason = "invalid-date-end";
                                                }
                                            } else {
                                                canRun = false;
                                                failReason = "invalid-date-start";
                                            }
                                        } else {
                                            canRun = false;
                                            failReason = "need-both";
                                        }
                                    }

                                    for(var key in endpointGet) { //safe to copy over to the mongodb query
                                        query[key] = endpointGet[key];
                                    }
                                }

                                if(canRun) {
                                    collection.countDocuments(query, {}, function(err, count) {
                                        if(!err) {
                                            if(count === 0) {
                                                console.log("Connecting to endpoint: " + remoteEndpoint);
                                                request({
                                                    uri: remoteEndpoint,
                                                    qs: endpointGet
                                                }, function(err, response, body) {
                                                    if(!err) {
                                                        var parsed = JSON.parse(body),
                                                            insert = {
                                                                endpoint: req.path,
                                                                date: (new Date()).toDateString(),
                                                                body: parsed
                                                            };

                                                        for(var key in endpointGet) { //safe to copy over to the mongodb insert
                                                            insert[key] = endpointGet[key];
                                                        }

                                                        collection.insertOne(insert, {}, ErrorHandler);
                                                        
                                                        resJson(parsed);
                                                    } else {
                                                        ErrorHandler(err);
                                                    }
                                                });
                                            } else {
                                                collection.findOne(query, {}, function(err, doc) {
                                                    if(!err) {
                                                        resJson(doc.body);
                                                    } else {
                                                        ErrorHandler(err);
                                                    }
                                                });
                                            }
                                        } else {
                                            ErrorHandler(err);
                                        }
                                    });
                                } else {
                                    switch(failReason) {
                                        case "unsupported-currency":
                                            resJson("Sorry, your requested currency is not supported or is invalid. Please check supported-currencies.json for a list of supported currencies.");
                                            
                                            break;
                                        case "unsupported-index":
                                            resJson("Invalid index value. Support index values are " + JSON.stringify(supportedIndex));
                                            
                                            break;
                                        case "for-yesterday":
                                            resJson('for must be "yesterday"');
                                            
                                            break;
                                        case "need-both":
                                            resJson('"start" and "end" queries need both a start and an end');
                                            
                                            break;
                                        case "invalid-date-start":
                                            resJson('invalid date. "start" query needs to be in the format YYYY-MM-DD. the CoinDesk BPI only covers data from 2010-07-17 onwards.');
                                            
                                            break;
                                        case "invalid-date-end":
                                            resJson('invalid date. "end" query needs to be in the format YYYY-MM-DD. the CoinDesk BPI only covers data from 2010-07-17 onwards.');
                                            
                                            break;
                                        case "start-gt-end":
                                            resJson('invalid date. "start" date must be before (less than or equal to) the "end" date');
                                            
                                            break;
                                        default: //should never happen..
                                            resJson("an unexpected error occurred!");
                                    }
                                }
                            });
                        }); //end of express app logic
                        
                        
                        console.log("Starting the coindesk cache server..");

                        app.listen(port, function() {
                            console.log("listening on port: " + port);

                            request("http://127.0.0.1:" + port + apiHeader + "supported-currencies.json", function(err, response, body) {
                                if(!err) {
                                    console.log("fetched supported-currencies.json");
                                } else {
                                    ErrorHandler(err);
                                }
                            });
                        });
                    } else {
                        ErrorHandler(err);
                    }
                });
            } else {
                ErrorHandler(err);
            }
        });
    };

    /* as described in:
     * https://www.coindesk.com/api
     * ?start=<VALUE>&end=<VALUE> Allows data to be returned for a specific date range. Must be listed as a pair of start and end parameters, with dates supplied in the YYYY-MM-DD format, e.g. 2013-09-01 for September 1st, 2013.
     */
    CoindeskCache.validDateString = function(str) {
        if(typeof str === "string") {
            var a = str.split("");

            if(a.length === 10) {
                return onlyNumbers(a[0]) && onlyNumbers(a[1]) && onlyNumbers(a[2]) && onlyNumbers(a[3]) && (a[4] === '-') //YYYY-
                       && onlyNumbers(a[5]) && onlyNumbers(a[6]) && (a[7] === '-') //MM-
                       && onlyNumbers(a[8]) && onlyNumbers(a[9]) //DD
                       && moment(str).isValid() //AND passes moment date validation
                       && (+moment(str).format('x') < (+new Date())) //AND is not in the future
                       && (+moment(str).format('x') >= +moment("2010-07-17").format('x')); //Sorry, the CoinDesk BPI only covers data from 2010-07-17 onwards.  Please alter your start date and try again.
            } else {
                return false;
            }
        } else {
            return false;
        }
    };

    return CoindeskCache;
}));
