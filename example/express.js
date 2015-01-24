var express      = require("express"          );
var path         = require("path"             );
var bodyParser   = require("body-parser"      );
var cookieParser = require("cookie-parser"    );

var app = express();
app.set('json spaces', 4);
app.set('elfinder', {
    static: path.join(__dirname, "..", "static"),
    roots : {
        files: {
            driver: "LocalFileSystem",
            path  : path.join(__dirname, "..", "files")
        }
    }
});

app.use(express.static(app.get('elfinder').static)                          );
app.use(bodyParser.urlencoded({extended: true})                             );
app.use(bodyParser.json()                                                   );

require("..").Connector(app);

app.listen(8000);
