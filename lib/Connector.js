var getParams = function (req, res, next){
    var app                  = this;
    req.elfinder             = {};
    req.elfinder.cmd         = req.body.cmd    || req.query.cmd;
    req.elfinder.target      = req.body.target || req.query.target || "files";
    req.elfinder.targetParts = req.elfinder.target.split("/");
    req.elfinder.pathParts   = req.elfinder.targetParts.slice(1);

    req.elfinder.rootName    = req.elfinder.targetParts[0];
    req.elfinder.root        = app.get('elfinder').roots[req.elfinder.rootName];

    if (req.elfinder.root){
        req.elfinder.driver     = req.elfinder.root.driver;
        console.log(req.elfinder.driver);
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
        driver[driver[req.elfinder.cmd]](req, res, next);
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