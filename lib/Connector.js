var      _ = require("underscore");
var Busboy = require("busboy");

var getParams = function (req, res, next){
    var app                  = this;
    res.elfinder             = {};
    req.elfinder             = {};

    req.elfinder.cmd         = req.body.cmd    || req.query.cmd;
    req.elfinder.target      = req.body.target || req.query.target || "files";
    req.elfinder.targetParts = req.elfinder.target.split("/");
    req.elfinder.pathParts   = req.elfinder.targetParts.slice(1);

    req.elfinder.rootName    = req.elfinder.targetParts[0];
    req.elfinder.root        = app.get('elfinder').roots[req.elfinder.rootName];

    req.elfinder.name        = req.body.name   || req.query.name;

    //console.log(req.body);
    req.elfinder.targets     = req.body.targets || req.query.targets || [];
    req.elfinder.targetsParts= _.map(req.elfinder.targets, function (target){return target.split("/");});
    req.elfinder.pathsParts  = _.map(req.elfinder.targetsParts, function (targetParts){return targetParts.slice(1);});

    //console.log(req.elfinder);

    if (req.headers['content-type'] && req.headers['content-type'].indexOf('multipart/form-data') == 0){
        var busboy           = new Busboy({headers: req.headers});
        req.elfinder.added   = [];
        req.elfinder.fileToUploadCnt = 0;
        req.elfinder.fileUploadedCnt = 0;
        busboy.on('field', function(fieldname, val, fieldnameTruncated, valTruncated) {
            if (fieldname == "current" && val){
                req.elfinder.targetParts = val.split('/');
                req.elfinder.rootName    = req.elfinder.targetParts[0];
                req.elfinder.root        = app.get('elfinder').roots[req.elfinder.rootName];
                req.elfinder.pathParts   = req.elfinder.targetParts.slice(1);
            }
            else
            if (fieldname && val){
                req.elfinder[fieldname] = val;
            }
            else{
                console.error("What's this?");
            }
        });

        busboy.on('file', function(fieldname, file, filename, encoding, mimetype) {
            req.elfinder.fileToUploadCnt ++;
            if (req.elfinder.root && req.elfinder.pathParts){
                var pathParts = req.elfinder.pathParts.concat([filename]);
                var driver = app.drivers[req.elfinder.root.driver];
                if (driver.handleFileUpload){
                    console.log(req.elfinder.root.driver, "upload", pathParts.join('/'));
                    driver.handleFileUpload(req, file, pathParts, encoding, mimetype, function (err, file){
                        req.elfinder.fileUploadedCnt ++;
                        if (!err){
                            req.elfinder.added.push(file);
                        }
                        if (req.busboyFinished && req.elfinder.fileToUploadCnt == req.elfinder.fileUploadedCnt){
                            res.json({added: req.elfinder.added});
                        }
                    });
                }
            }
        });
        busboy.on('finish', function() {
            req.busboyFinished = true;
        });
        req.pipe(busboy);
    }
    else if (req.elfinder.root){
        req.elfinder.driver     = req.elfinder.root.driver;
        //console.log(req.elfinder.driver);
        next();
    }
    else{
        res.status(404).end();
    }
};

var routeDriver = function (req, res, next){
    var app    = this;
    var driver = app.drivers[req.elfinder.driver];
    if (driver[req.elfinder.cmd]){
        driver[req.elfinder.cmd](req, res, next);
    }
    else{
        res.status(404).end("No cmd " + req.elfinder.cmd + " for driver " + req.elfinder.driver);
    }
};

module.exports.Connector = function (app){
    app.drivers = {};
    var config  = app.get('elfinder');

    for (var rootName in config.roots){
        var rootConfig = config.roots[rootName];
        if (!app.drivers[rootConfig.driver]){
            app.drivers[rootConfig.driver] = require("./Connector." + rootConfig.driver);
            console.log("Loaded Driver", rootConfig.driver);
        }
    }

    app.all("/file-connector",  getParams        .bind(app));
    app.all("/file-connector",  routeDriver      .bind(app));

};