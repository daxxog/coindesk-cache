/* CoindeskCache / test / basic.js
 * basic test
 * (c) 2019 David (daXXog) Volm ><> + + + <><
 * Released under Apache License, Version 2.0:
 * http://www.apache.org/licenses/LICENSE-2.0.html  
 */

var vows = require('vows'),
    assert = require('assert'),
    CoindeskCache = require('../coindesk-cache.min.js');

vows.describe('basic').addBatch({
    'CoindeskCache': {
        topic: function() {
        	return typeof CoindeskCache;
        },
        'is a function': function(topic) {
            assert.equal(topic, 'function');
        }
    }
}).export(module);