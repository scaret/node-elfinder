module.exports.handle = function (req, res, next){
    var app = this;
    res.json(app.get('elfinder'));
};