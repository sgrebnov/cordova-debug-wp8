var path = require('path');
var fs = require('fs');
var shell   = require('shelljs');
var jsrewriter = require('../Aardwolf/rewriter/jsrewriter.js');
var config = require('../config.js');

module.exports = function(ctx) {
    if(ctx.cmdLine.indexOf('--debug') <= 0) {
        // debugger should run in debug mode only
        return;
    }
    console.log('WP8Debugger: launching debug server...');
    console.log('WP8Debugger: debug server host:' + config.serverHost);
    var serverRoot = path.join(ctx.opts.plugin.dir, 'Aardwolf');

    shell.exec("explorer " + '"http://' +  config.serverHost + ':' + config.serverPort + '"');
    
    var cmdLine = 'node ' + path.join(serverRoot, 'app.js') + ' -h ' + config.serverHost;
    console.log(cmdLine);

    shell.exec(cmdLine);
}
