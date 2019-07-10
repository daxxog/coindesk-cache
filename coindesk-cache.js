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

    var MongoClient = require('mongodb').MongoClient;

    var apiHeader = "/v1/bpi/";

    var apiEndpoints = ["supported-currencies.json"];

    CoindeskCache = function() {
        //console.log("Connecting to endpoint: " + argv.endpoint);

        console.log("Connecting to database via connection string: " + argv.database);

        MongoClient.connect(argv.database, { useNewUrlParser: true }, function(err, client) {
            if(!err) {
                var db = client.db();
                console.log("Connected to database: " + db.s.databaseName);

                db.collection(argv.collection, function(err, collection) {
                    if(!err) {
                        
                        apiEndpoints.forEach(function(_endpoint) {
                            app.get(apiHeader + _endpoint, function(req, res) {
                                var query = {endpoint: _endpoint};

                                collection.countDocuments(query, {}, function(err, count) {
                                    if(!err) {
                                        if(count === 0) {
                                            request(argv.endpoint + _endpoint, function(err, response, body) {
                                                if(!err) {
                                                    var parsed = JSON.parse(body);

                                                    collection.insertOne({
                                                        endpoint: _endpoint,
                                                        body: parsed
                                                    }, {}, ErrorHandler);
                                                    
                                                    res.json(parsed);
                                                } else {
                                                    ErrorHandler(err);
                                                }
                                            });
                                        } else {
                                            collection.findOne(query, {}, function(err, doc) {
                                                if(!err) {
                                                    res.json(doc.body);
                                                } else {
                                                    ErrorHandler(err);
                                                }
                                            });
                                        }
                                    } else {
                                        ErrorHandler(err);
                                    }
                                });
                            });
                        });
                        
                        
                        console.log("Starting the coindesk cache server..");

                        app.listen(port, function() {
                            console.log("listening on port: " + port);
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

    return CoindeskCache;
}));
