var ding = require('./ding');

/*
 * TODO
 * describe
 */
exports.departureTimes = function(req, res){
    var id = req.params.id;
    req.nano.get(id, function(err, doc){
        if (err){
            res.end(JSON.stringify(err));
            return;
        }
        if (doc === undefined){
            res.end(JSON.stringify("Keine Daten verfügbar."));
            return;
        }
        var now = Number(new Date());
        if(now - doc.lastUpdate <= 45 * 1000)
            res.end(JSON.stringify({rows: doc.departures, lastUpdate: doc.lastUpdate}));
        else
            ding.update(doc, function(err, doc){
                if (err)
                    res.end(JSON.stringify(err));
                else
                    res.end(JSON.stringify({rows: doc.departures, lastUpdate: now}));
            }, req.nano);
    });
};

exports.get = function(req, res){
    req.nano.get(req.params.id).pipe(res);
};

exports.allByName = function(req, res){
    if(req.query.search){
        req.query._limit = req.query.limit;
        delete req.query.limit;
        req.nano.list("view", "search", "allByName", req.query).pipe(res);
    }else{
        req.nano.view("view", "allByName", req.query).pipe(res);
    }
};

exports.allByCoords = function(req, res){
    req.nano.list("view", "next", "allByCoords", req.query).pipe(res);
};
