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

var getFile = function (pathFile, callback, children){
    fs.stat(pathFile, function (err, stats){
        var file = {};
        if (err){
            callback(err);
        }
        else if (stats.isDirectory()){
            file.dirs  = 1;
            file.name  = path.basename(pathFile);
            file.mime  = "directory";
            file.size  = stats.size;
            file.read  = (stats.mode & 0400) && 1;
            file.write = (stats.mode & 0200) && 1;
            //file.mode  =  stats.mode,
            file.ts    = moment(stats.mtime).unix();
            if (children){
                getFilesFromFolder(pathFile, function (err, files){
                    if (err){
                        callback(null, {file: file});
                    }
                    else{
                        callback(null, {file: file, children: files});
                    }
                });
            }
            else{
                callback(null, {file:file});
            }
        }
        else if (stats.isFile()){
            file.name  = path.basename(pathFile);
            file.mime  = mime.lookup(pathFile);
            file.size  = stats.size;
            file.read  = (stats.mode & 0400) && 1;
            file.write = (stats.mode & 0200) && 1;
            //file.mode  =  stats.mode,
            file.ts    = moment(stats.mtime).unix();
            callback(null, {file: file});
        }
    });
};

var getFilesFromFolder = function (pathFolder, callback){
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
                    getFile(pathFile,function(err, file){
                        readCnt ++;
                        files.push(file.file);
                        if (!err){
                            if (readCnt == filenames.length){
                                callback(null, files);
                            }
                        }
                    });
                });
            }
            else{
                callback(null, []);
            }
        }
    });
};

module.exports.open = function (req, res, next){
    var pathFolder = path.join(req.elfinder.root.path, req.elfinder.pathParts.join(path.sep));
    var prefix = [req.elfinder.rootName].concat(req.elfinder.pathParts).join("/");
    console.log("LocalFileSystem open " + pathFolder);
    getFile(pathFolder, function (err, folder){
        //console.log(JSON.stringify(folder, null, 2));
        if (err){
            console.err("Error reading folder ", pathFolder, err);
            res.status(500).end("Fail to read folder " + req.elfinder.target);
        }
        else{
            folder.file.hash  = req.elfinder.target;
            if (req.elfinder.pathParts.length){
                folder.file.phash = req.elfinder.targetParts.slice(0, req.elfinder.targetParts.length - 1).join('/');
            }
            folder.file.volumeid  = req.elfinder.rootName;
            res.elfinder.cwd = folder.file;

            res.elfinder.files = res.elfinder.files || [];
            res.elfinder.files.push(folder.file);

            if (folder.children){
                for (var i = 0; i < folder.children.length; i++){
                    var file   = folder.children[i];
                    file.hash  = folder.file.hash + "/" + file.name;
                    file.phash = folder.file.hash;
                    res.elfinder.files.push(file);
                }
            }

            res.json(res.elfinder);
        }
    }, true);
};

module.exports.tree = function (req, res, next){
    var pathFolder = path.join(req.elfinder.root.path, req.elfinder.pathParts.join(path.sep));
    var prefix = [req.elfinder.rootName].concat(req.elfinder.pathParts).join("/");
    console.log("LocalFileSystem tree " + pathFolder);
    getFile(pathFolder, function (err, folder){
        if (err)
        {
            console.err("Error reading folder ", pathFolder, err);
            res.status(500).end("Fail to read folder " + req.elfinder.target);
        }
        else
        {
            folder.file.hash  = req.elfinder.target;
            if (req.elfinder.pathParts.length){
                folder.file.phash = req.elfinder.targetParts.slice(0, req.elfinder.targetParts.length - 1).join('/');
            }
            folder.file.volumeid  = req.elfinder.rootName;
            res.elfinder.tree = [folder.file];

            if (folder.children){
                for (var i = 0; i < folder.children.length; i++){
                    var file   = folder.children[i];
                    file.hash  = folder.file.hash + "/" + file.name;
                    file.phash = folder.file.hash;
                    if (file.mime == "directory")
                    {
                        res.elfinder.tree.push(file);
                    }
                }
            }

            res.json(res.elfinder);
        }
    }, true);
};

module.exports.mkdir = function (req, res, next){
    var pathFolder = path.join(req.elfinder.root.path, req.elfinder.pathParts.join(path.sep), req.elfinder.name);
    var hashFolder = req.elfinder.target + "/" + req.elfinder.name;
    console.log("LocalFileSystem mkdir " + pathFolder);
    fs.mkdir(pathFolder, function (err){
        if (err){
            console.log("Fail to mkdir", pathFolder);
        }
        else{
            getFile(pathFolder, function (err, folder){
                if (err){
                    console.err("Error reading folder ", pathFolder, err);
                    res.status(500).end("Fail to read folder " + hashFolder);
                }
                else{
                    folder.file.hash  = hashFolder;
                    folder.file.phash = req.elfinder.target;
                    res.elfinder.added = res.elfinder.added || [];
                    res.elfinder.added.push(folder.file);
                    res.json(res.elfinder);
                }
            });
        }
    });
};

module.exports.size = function (req, res, next){
    var targetsCnt = 0;
    var sizeSum = 0;
    if (req.elfinder.pathsParts){
        console.log("LocalFileSystem Size " + req.elfinder.targets.join(","));
        _.each(req.elfinder.pathsParts, function (pathParts){
            var pathFile = path.join(req.elfinder.root.path, pathParts.join(path.sep));
            getFile(pathFile, function(err, file){
                targetsCnt ++;
                if(file && file.file && file.file.size){
                    sizeSum += file.file.size;
                }
                if (targetsCnt == req.elfinder.pathsParts.length){
                    res.json({size: sizeSum});
                }
            });
        });
    }
    else{
        res.json({size: sizeSum});
    }
};

module.exports.handleFileUpload = function (req, file, pathParts, encoding, mimetype, callback){
    var pathFile = path.join(req.elfinder.root.path, pathParts.join(path.sep));
    file.pipe(fs.createWriteStream(pathFile));
    file.on('end', function (){
        getFile(pathFile, function (err, file){
            if (err){
                console.err("Error reading uploaded file ", pathFile, err);
                callback(err);
            }
            else{
                file.file.phash = req.elfinder.targetParts.join('/');
                file.file.hash  = file.file.phash + '/' + pathParts[pathParts.length - 1];
                callback(null, file.file);
            }
        });
    });
};