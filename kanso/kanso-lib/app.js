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

exports.views = {
    allByName: {
        map: function(doc) {
            if(doc.geometry.features && doc.geometry.features[0]){
                var oldid = Math.floor(doc.geometry.features[0].properties.olifid/100);
                emit(doc.ort + " / " + doc.bezeichnung, oldid );
            }
        }
    },
    allByCoords: {
        map: function(doc) {
            if(doc.geometry.features && doc.geometry.features[0]){
                var oldid =
                        Math.floor(doc.geometry.features[0].properties.olifid
                                   /100);
                emit(doc.geometry.features[0].geometry.coordinates,
                     {oldid: oldid,
                      location: doc.ort + " / " + doc.bezeichnung});
            }
        }
    }
};

/*
 [{['', '']}]
 */

exports.lists = {
    search: function (head, req) {
        if (! req.query.search) {
            return;
        }
        var row;
        var searches = req.query.search.toLowerCase().split(" ");
        var first = true;
        send('{"rows":[');
        var i = Number(req.query._limit);
        while (i > 0 && (row = getRow())) {
            var hasMatch = true;
            for(var index in searches){
                var search = searches[index];
                if (row.key.toLowerCase().indexOf(search) === -1){
                    hasMatch = false;
                    break;
                }
            }
            if(hasMatch){
                if (! first) {
                    send(',');
                } else {
                    first = false;
                }
                send(JSON.stringify(row));
                i--;
            }
        }
        send(']}');
    },
    next: function (head, req) {
        var row;
        var coords = JSON.parse(req.query.coords);
        var range = 0.005;
        var choices = [];
        while ((row = getRow())) {
            var distance = Math.sqrt(Math.pow(row.key[0] - coords[0], 2) +
                                     Math.pow(row.key[1] - coords[1], 2));
            if (distance <= range)
                choices.push({id: row.id,
                              oldid: row.value.oldid,
                              location: row.value.location,
                              distance: distance});
        }
        choices.sort(function(b, a) {
            if (a.distance < b.distance)
                return -1;
            else if (a.distance === b.distance)
                return 0;
            else
                return 1;
        });
        send(JSON.stringify({total_rows: choices.length,
                             rows: choices}));
    }
};
