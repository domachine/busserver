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
        if(now - doc.lastUpdate <= 30 * 1000)
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
