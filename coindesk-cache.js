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

    var opt = require('optimist')
        .alias('e', 'endpoint')
            .describe('e', 'The CoinDesk API endpoint.')
            .default('e', 'https://api.coindesk.com/v1/bpi/')

        .alias('db', 'database')
            .describe('db', 'The MongoDB connection url.')
            .default('db', 'mongodb://coindesk:password@127.0.0.1:27017/coindesk')

        argv = opt.argv;
    
    CoindeskCache = function() {
        console.log("Connecting to endpoint: " + argv.endpoint);
        console.log("Connecting to database: " + argv.database);
        console.log("Starting the coindesk cache server!");
    };

    return CoindeskCache;
}));
