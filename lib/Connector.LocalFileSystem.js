var path   = require("path"           );
var fs     = require("fs"             );
var os     = require("os"             );
var _      = require("underscore"     );
var moment = require("moment"         );
var mime   = require("mime"           );



module.exports.handle = function (req, res, next){
    var app = this;

    res.json(app.get('elfinder'));
};

var getFilesFromFolder = function (pathFolder, hashPrefix , callback){
    fs.readdir(pathFolder, function (err, filenames){
        if (err){
            callback(err);
        }
        else{
            if (filenames.length){
                var files   = [];
                var readCnt = 0;
                _.each(filenames, function (filename){
                    var pathFile = path.join(pathFolder, filename);
                    fs.stat(pathFile, function (err, stats){
                        readCnt ++;
                        if (err){
                            console.log("Error stat file", pathFile, stats);
                        }
                        else if (stats.isDirectory()){
                            //console.log("stats", pathFile, stats);
                            files.push({
                                name : filename,
                                hash : hashPrefix + '/' + filename,
                                mime : "directory",
                                size : stats.size,
                                phash: hashPrefix,
                                read : (stats.mode & 0400) && 1,
                                write: (stats.mode & 0200) && 1,
                                //mode :  stats.mode,
                                ts   : moment(stats.mtime).unix()
                            });
                        }
                        else if (stats.isFile())
                        {
                            //console.log("stats", pathFile, stats);
                            files.push({
                                name : filename,
                                hash : hashPrefix + '/' + filename,
                                mime : mime.lookup(filename),
                                size : stats.size,
                                phash: hashPrefix,
                                read : (stats.mode & 0400) && 1,
                                write: (stats.mode & 0200) && 1,
                                //mode :  stats.mode,
                                ts   : moment(stats.mtime).unix()
                            });
                        }
                        if (readCnt == filenames.length)
                        {
                            callback(null, files);
                        }
                    });
                });
            }
            else
            {
                callback(null, []);
            }
        }
    });
};

module.exports.open = function (req, res, next){
    var pathFolder = path.join(req.elfinder.root.path, req.elfinder.pathParts.join(path.sep));
    var prefix = [req.elfinder.rootName].concat(req.elfinder.pathParts).join("/");
    console.log("LocalFileSystem open " + pathFolder);
    getFilesFromFolder(pathFolder, prefix, function (err, files){
        if (err)
        {
            console.err("Error reading folder ", pathFolder, err);
            res.status(500).end("Fail to read folder " + req.elfinder.target);
        }
        else
        {
            res.elfinder.files = res.elfinder.files || [];
            res.elfinder.files = res.elfinder.files.concat(files);

            res.elfinder.cwd   = {
                dirs: 1,
                hash: req.elfinder.target,
                locked: 1,
                mime: "directory",
                name: path.basename(req.elfinder.target),
                read: 1,
                write: 1,
                volumeid: req.elfinder.rootName,
                ts : moment().unix()
            };

            res.elfinder.files.push(res.elfinder.cwd);

            res.json(res.elfinder);
        }
    });
};