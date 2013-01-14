var fs = require('fs');

var nano = require('nano')('http://localhost:5984');
var libxmljs = require('libxmljs');


var config = {
    file: 'Haltepunkte SWU.kml',
    prefix: 'swu-900',
    defaultDistrict: 'Ulm'
}

function parseStations(xml, db) {
    try {
        var doc = libxmljs.parseXmlString(xml);
    } catch (err) {
        console.error(process.argv[1] + ': error while parsing the station '
                      + 'file: ' + err.message);
        process.exit(1);
    }

    /* Each station is a subfolder of the main layer. */
    doc.find('//Folder[@id="layer fmain"]/Folder').forEach(function (folder) {
        var station = {};

        var stationName = folder.get('name').text();
        if (stationName.search(/,/) !== -1) {
            stationName = stationName.split(/,/);
            station.district = stationName[0];
            station.name = stationName[1].trim();
        } else {
            station.district = config.defaultDistrict;
            station.name = stationName;
        }

        station.places = [];
        folder.find('Placemark').forEach(function (placemark) {
            var place = {};

            place.name = placemark.get('name').text();

            /* Remove prefix from OLIFID. */
            place.olifid = placemark.get('description').text().match(/\d+/)[0];

            place.coordinates = {};
            place.coordinates.longitude = Number(
                placemark.get('.//longitude').text());
            place.coordinates.latitude = Number(
                placemark.get('.//latitude').text());

            station.places.push(place);
        });

        storeStation(station, db);
    });
}

function storeStation(station, db) {
    var id = config.prefix + station.places[0].olifid.slice(0, -2);

    db.insert(station, id, function (err) {
        if (err) {
            console.error(process.argv[1] + ': error while inserting station '
                + 'into database: ' + err.message);
            console.error(station);
            process.exit(2);
        }
    });
}

fs.readFile(config.file, 'utf8', function(err, data) {
    if (err) {
        console.error(process.argv[1] + ': error while loading the station '
                      + 'file: ' + err.message);
        process.exit(1);
    }

    nano.db.destroy('stations', function () {
        nano.db.create('stations', function () {
            var db = nano.use('stations');
            parseStations(data, db);
        });
    });
});
