/*
 * This file is part of busserver.

 * busserver is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.

 * busserver is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.

 * You should have received a copy of the GNU General Public License
 * along with busserver.  If not, see <http://www.gnu.org/licenses/>.
 */


/**
 * Module dependencies.
 */

var express = require('express'),
    routes = require('./routes'),
    http = require('http'),
    path = require('path'),
    startStopDaemon = require('start-stop-daemon'),
    nano = require('nano')('http://localhost:5984');

var app = express();

var db = nano.use('haltestellen');

var server;

/*
 * extend nano with function list
 */
db.list = function (designname, listname, viewname, params) {
    var docpath = '_design/' + designname + '/_list/' +
            listname + '/' + viewname;
    return nano.request({db: 'haltestellen',
                         doc: docpath,
                         method: 'GET',
                         params: params});
};

/*
 * configure express middleware
 */
app.configure(function(){
    app.set('port', process.env.PORT || 3030);//ist PORT 3030 frei?
    app.use(express.compress());
    app.set('views', __dirname + '/views');
    app.set('view engine', 'jade');
    app.use(express.favicon());
    app.use(express.logger('dev'));
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(function (req, res, next) {
        req.nano = db;
        next();
    });
    app.use(function(req, res, next) {
        res.header('Access-Control-Allow-Origin', '*');
        res.header("Access-Control-Allow-Headers", "X-Requested-With");
        next();
    });
    app.options("*", function(req, res, next) {
        res.header('Access-Control-Allow-Origin', '*');
        res.header("Access-Control-Allow-Headers", "X-Requested-With");
        next();
    });
    app.use(app.router);
    app.use(express.static(path.join(__dirname, 'public')));
});

/*
 * set url handler
 */
app.get('/departure-times/:id', routes.departureTimes);
app.get('/allByName', routes.allByName);
app.get('/allByCoords', routes.allByCoords);
app.get('/get/:id', routes.get);

var options = {
    daemonFile: "busserver.dmn",
    outFile: "busserver.out",
    errFile: "busserver.err",
    onCrash: function(e){
        console.info("server crashed! Closing httpserver and restarting expressjs now ...", e);
        server.close();
        this.crashRestart();
    }
};

startStopDaemon(options, function() {
    server = http.createServer(app);
    server.listen(app.get('port'), function(){
        console.log("Express server listening on port " + app.get('port'));
    });
});