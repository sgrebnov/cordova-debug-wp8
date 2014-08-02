'use strict';

var fs = require('fs');
var path = require('path');
var config = require('../config/config.defaults.js');

function serveStaticFile(res, filename) {
    var ext = filename.split('.').reverse()[0];
    var ct = ext == 'js'   ? 'application/javascript' :
             ext == 'css'  ? 'text/css' :
             ext == 'html' ? 'text/html' :
             ext == 'png'  ? 'image/png' :
             ext == 'jpg'  ? 'image/jpeg' :
             ext == 'jpeg' ? 'image/jpeg' :
             'text/plain';
             
    var fdata = fs.readFileSync(filename);
    
    if (['png', 'jpg', 'jpeg'].indexOf(ext) == -1) {
        fdata = fdata
            .toString()
            .replace(/__SERVER_HOST__/g, config.serverHost)
            .replace(/__SERVER_PORT__/g, config.serverPort)
            .replace(/__FILE_SERVER_PORT__/g, config.fileServerPort);
    }
    
    res.writeHead(200, { 'Content-Type': ct });
    res.end(fdata);
}


function getFilesList() {
    var files = [];
    var baseDir = path.normalize(config.fileServerBaseDir);
    
    function walk(dir) {
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

                files.push(relativePath);
            }
            else {
                walk(fullPath);
            }
        });
    }
    
    walk(baseDir);
    
    /* Unixify paths */
    files = files.map(function(f) { return f.replace(/\\/g, '/'); });
    
    return files;
}


module.exports.serveStaticFile = serveStaticFile;
module.exports.getFilesList = getFilesList;

