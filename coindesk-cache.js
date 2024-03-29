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

        .alias('h', 'host')
            .describe('h', 'The host to use for API calls on the help page.')
            .default('h', '127.0.0.1')

        .alias('P', 'proto')
            .describe('P', 'The protocol to use for API calls on the help page.')
            .default('P', 'http')

        argv = opt.argv;

    var express = require('express'),
        app = express(),
        port = opt.argv.port;

    var request = require('request'),
        path = require('path'),
        MongoClient = require('mongodb').MongoClient,
        sf = require('switch-factory'),
        moment = require('moment'),
        S = require('string');

    var apiHeader = "/v1/bpi/",
        apiPreHeader = opt.argv.proto + "://" + opt.argv.host + ":" + opt.argv.port,
        apiNewEndpoint = apiPreHeader + apiHeader,
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
                                endpointSpecial = !(_endpoint === __endpoint);

                            app.get(apiHeader + _endpoint, (new CoindeskCache.Middleware({
                                endpointSpecial: endpointSpecial,
                                collection: collection
                            })).factory());
                        }); //end of dynamic express app logic
                        
                        /* paste this code into dev console on
                         * https://www.coindesk.com/api
                         * to obtain / update this string
                         * -----------------------------------
                           (function($){console.log(JSON.stringify($('.single-content')[0].innerHTML));}(jQuery));
                         */ var __help = "\n\t\t\t\t<div class=\"noskimwords\">\n<h1>CoinDesk Bitcoin Price Index API</h1>\nCoinDesk provides a simple API to make its <a href=\"/price/bitcoin\">Bitcoin Price Index</a> (BPI) data programmatically available to others.\n\nYou are free to use this API to include our data in any application or website as you see fit, as long as each&nbsp;page or app that uses it includes the text “Powered by <a href=\"/price/bitcoin\">CoinDesk</a>”, linking to our <a href=\"/price/bitcoin\">price</a> page.\n\nCoinDesk data is made available through a number of HTTP resources, and data is returned in JSON format.\n\nPlease do not abuse our service.\n<h2>BPI real-time data</h2>\nOn the CoinDesk website, we publish the BPI in USD, EUR, and GBP, calculated every minute, based on criteria as discussed on the <a href=\"/price/bitcoin\">CoinDesk BPI page</a>.\n\nThis same data can be retrieved using the endpoint:\n<ul class=\"endpoint\">\n\t<li>https://api.coindesk.com/v1/bpi/currentprice.json</li>\n</ul>\n<blockquote>Sample JSON Response:\n<pre>{\"time\":{\"updated\":\"Sep 18, 2013 17:27:00 UTC\",\"updatedISO\":\"2013-09-18T17:27:00+00:00\"},\"disclaimer\":\"This data was produced from the CoinDesk Bitcoin Price Index. Non-USD currency data converted using hourly conversion rate from openexchangerates.org\",\"bpi\":{\"USD\":{\"code\":\"USD\",\"symbol\":\"$\",\"rate\":\"126.5235\",\"description\":\"United States Dollar\",\"rate_float\":126.5235},\"GBP\":{\"code\":\"GBP\",\"symbol\":\"£\",\"rate\":\"79.2495\",\"description\":\"British Pound Sterling\",\"rate_float\":79.2495},\"EUR\":{\"code\":\"EUR\",\"symbol\":\"€\",\"rate\":\"94.7398\",\"description\":\"Euro\",\"rate_float\":94.7398}}}</pre>\n</blockquote>\nWe also offer the BPI converted into in any of our <a href=\"https://api.coindesk.com/v1/bpi/supported-currencies.json\" target=\"_blank\">supported currencies</a>. This data can be accessed using the endpoint:\n<ul class=\"endpoint\">\n\t<li>https://api.coindesk.com/v1/bpi/currentprice/&lt;CODE&gt;.json</li>\n</ul>\nWhere &lt;CODE&gt; should be replaced by a valid ISO 4217 currency code as per our <a href=\"https://api.coindesk.com/v1/bpi/supported-currencies.json\" target=\"_blank\">supported currency list</a>.\n<blockquote><em>Sample Request</em>\n\n<code>https://api.coindesk.com/v1/bpi/currentprice/CNY.json</code>\n\n<em>Sample JSON Response</em>\n<pre>{\"time\":{\"updated\":\"Sep 18, 2013 17:27:00 UTC\",\"updatedISO\":\"2013-09-18T17:27:00+00:00\"},\"disclaimer\":\"This data was produced from the CoinDesk Bitcoin Price Index. Non-USD currency data converted using hourly conversion rate from openexchangerates.org\",\"bpi\":{\"USD\":{\"code\":\"USD\",\"rate\":\"126.5235\",\"description\":\"United States Dollar\",\"rate_float\":126.5235},\"CNY\":{\"code\":\"CNY\",\"rate\":\"775.0665\",\"description\":\"Chinese Yuan\",\"rate_float\":\"775.0665\"}}}</pre>\n</blockquote>\n<h2>Historical BPI data</h2>\nWe offer historical data from our Bitcoin Price Index through the following endpoint:\n<ul class=\"endpoint\">\n\t<li>https://api.coindesk.com/v1/bpi/historical/close.json</li>\n</ul>\nBy default, this will return the previous 31 days' worth of data.\n\nThis endpoint accepts the following optional parameters:\n<ul>\n\t<li><strong>?index=[USD/CNY]</strong>The index to return data for. Defaults to USD.</li>\n\t<li><strong>?currency=&lt;VALUE&gt;</strong>The currency to return the data in, specified in ISO 4217 format. Defaults to USD.</li>\n\t<li><strong>?start=&lt;VALUE&gt;&amp;end=&lt;VALUE&gt;</strong>\nAllows data to be returned for a specific date range. Must be listed as a pair of start and end parameters, with dates supplied in the YYYY-MM-DD format, e.g. 2013-09-01 for September 1st, 2013.</li>\n\t<li><strong>?for=yesterday</strong>Specifying this will return a single value for the previous day. Overrides the start/end parameter.</li>\n</ul>\n<blockquote><em>Sample Request:</em>\n\n<code>https://api.coindesk.com/v1/bpi/historical/close.json?start=2013-09-01&amp;end=2013-09-05</code>\n\n<em>Sample JSON Response:</em>\n<pre>{\"bpi\":{\"2013-09-01\":128.2597,\"2013-09-02\":127.3648,\"2013-09-03\":127.5915,\"2013-09-04\":120.5738,\"2013-09-05\":120.5333},\"disclaimer\":\"This data was produced from the CoinDesk Bitcoin Price Index. BPI value data returned as USD.\",\"time\":{\"updated\":\"Sep 6, 2013 00:03:00 UTC\",\"updatedISO\":\"2013-09-06T00:03:00+00:00\"}}</pre>\n</blockquote>\n\n<h2>Feedback</h2>\nIf you have any feedback or suggestions with regards to this API, please send them to <a href=\"mailto:index@coindesk.com\">index@coindesk.com</a>.\n</div>\t\t\t";

                        //make some simple modifications to the API help page to reflect our own hosted endpoint
                        __help = S(__help).replaceAll(argv.endpoint, apiNewEndpoint).s;

                        app.get('/', function(req, res) {
                            res.send(__help);
                        });

                        console.log("Starting the coindesk cache server..");
                        console.log(apiPreHeader);

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

    //created a Middleware class to hold most of the logic
    //helped me discover a nasty scope based bug

    CoindeskCache.Middleware = function(obj) {
        for(var key in obj) {
            this[key] = obj[key];
        }
    };

    CoindeskCache.Middleware.prototype.factory = function() {
        var that = this;

        return function(req, res) {
            that.run(req, res, that);
        };
    };

    CoindeskCache.Middleware.prototype.run = function(req, res, that) {
        var query = {
            endpoint: req.path,
            date: (new Date()).toDateString()
        };

        var remoteEndpoint = argv.endpoint.replace(apiHeader, req.path),
            canRun = true,
            failReason = false,
            endpointGetLocal = {};

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

        if(that.endpointSpecial) {
            var currency = path.posix.basename(req.path).replace(".json", "");
            canRun = isSupported(currency);

            if(!canRun) {
                failReason = "unsupported-currency";
            }
        }

        if(req.path === (apiHeader + "historical/close.json")) {
            if(typeof req.query.index !== "undefined") {
                if(isValidIndex(req.query.index)) {
                    endpointGetLocal.index = req.query.index;
                } else {
                    canRun = false;
                    failReason = "unsupported-index";
                }
            }

            if(typeof req.query.currency !== "undefined") {
                if(isSupported(req.query.currency)) {
                    endpointGetLocal.index = req.query.currency;
                } else {
                    canRun = false;
                    failReason = "unsupported-currency";
                }
            }

            if(typeof req.query.for !== "undefined") {
                if(req.query.for === "yesterday") {
                    endpointGetLocal.for = req.query.for;
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
                                endpointGetLocal.start = req.query.start;
                                endpointGetLocal.end = req.query.end;
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

            for(var key in endpointGetLocal) { //safe to copy over to the mongodb query
                query[key] = endpointGetLocal[key];
            }
        }

        if(canRun) {
           that.collection.findOne(query, {}, function(err, doc) {
                if(!err) {
                    if(doc === null) {
                        /* DEBUG 
                        console.log("Connecting to endpoint: " + remoteEndpoint);
                        console.log("for query: ");
                        console.log(query);
                        */

                        request({
                            uri: remoteEndpoint,
                            qs: endpointGetLocal
                        }, function(err, response, body) {
                            if(!err) {
                                var parsed = JSON.parse(body),
                                    insert = {
                                        endpoint: req.path,
                                        date: (new Date()).toDateString(),
                                        body: parsed
                                    };

                                for(var key in endpointGetLocal) { //safe to copy over to the mongodb insert
                                    insert[key] = endpointGetLocal[key];
                                }

                                var upsert = {
                                    "$set": insert
                                };

                                /* DEBUG 
                                console.log("upsert data");
                                console.log(upsert);
                                console.log(query);
                                */

                                //collection.insertOne(insert, {}, ErrorHandler);
                                that.collection.updateOne(query, upsert, {
                                    upsert: true
                                }, ErrorHandler);


                                resJson(parsed);
                            } else {
                                ErrorHandler(err);
                            }
                        });
                    } else {
                        resJson(doc.body);
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
    };

    return CoindeskCache;
}));
