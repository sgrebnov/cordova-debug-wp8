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
    console.log('WP8Debugger: preparing js files for debugging...');

    var serverRoot = path.join(ctx.opts.plugin.dir, 'Aardwolf');
    var serverWwwCopyDir = path.join(serverRoot, 'files/www');
    var platformRoot = path.join(ctx.opts.projectRoot, 'platforms/wp8');

    console.log('serverRoot: ' + serverRoot)
    console.log('platformRoot: ' + platformRoot)

    console.log('Copy original www content');
    if (fs.existsSync(serverWwwCopyDir)) {
        shell.rm('-rf', serverWwwCopyDir)
    }

    shell.cp('-rf', path.join(platformRoot, 'www/*'), serverWwwCopyDir);

    console.log('Rewriting js files');
    rewriteFilesInDir(platformRoot, path.join(platformRoot, 'www'));
    console.log('config: ' + JSON.stringify(config));
    console.log('inject Aardwolf to cordova.js');
    var content = 'window.AardwolfServerUrl = "http://' + config.serverHost + ':' + config.serverPort + '";';
    content += fs.readFileSync(path.join(serverRoot, 'js/aardwolf.js')).toString();
    content += fs.readFileSync(path.join(platformRoot, 'www/cordova.js')).toString();
    fs.writeFileSync(path.join(platformRoot, 'www/cordova.js'), content);

    console.log('WP8Debugger: done!');

    // var Q = context.requireCordovaModule('q');
    // var deferral = new Q.defer();

    // setTimeout(function(){
    //     console.log('hook.js>> end');
    //     deferral.resolve();
    // }, 1000);

    // return deferral.promise;
}
function rewriteFile(fullPath, relativePath) {
    var content = fs.readFileSync(fullPath).toString();
    content = jsrewriter.addDebugStatements(relativePath.split('\\').join('/'), content);
    fs.writeFileSync(fullPath, content);
}

function rewriteFilesInDir(baseDir, dir) {
    var fileList = fs.readdirSync(dir);
    fileList.forEach(function(f) {
        var fullPath = path.join(dir, f);
        var stat = fs.statSync(fullPath);
        if (stat.isFile()) {
            var relativePath = fullPath.substr(baseDir.length);
            // serve only files from www folder. TODO - expose as configurable filter to config file
            if (relativePath.substr(0, 4) != '\\www') {
                return;
            }
            if (relativePath.substr(-3) != '.js' && relativePath.substr(-7) != '.coffee') {
                return;
            }

            if(relativePath.indexOf('aardwolf.js') >=0 || relativePath.indexOf('jsrewriter.js') >=0) {
                return;
            }
            console.log('\t' + relativePath);
            rewriteFile(fullPath, relativePath);
        }
        else {
            rewriteFilesInDir(baseDir, fullPath);
        }
    });
}