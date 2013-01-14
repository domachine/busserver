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

var request = require('request');
var libxml = require('libxmljs');

exports.update = function (doc, callback, nano, i) {
    if(i === undefined)
        i = 0;

    var url = "http://www.ding.eu/ding2/";
    if(i % 2 === 1)
        url = "http://efa-bw.de/nvbw/";
    var id = doc._id.substring(4);
    request({url: url + 'XML_DM_REQUEST?' +
             'laguage=de&typeInfo_dm=stopID&' +
             'nameInfo_dm=' + id +
             '&deleteAssignedStops_dm=1&useRealtime=1&mode=direct',
             timeout: 1500,
             encoding: 'binary'},
            function (err, res, xml) {
                if (!err)
                    var parseErr = parseXML(doc, callback, nano, err, res, xml);
                if((err || parseErr) && i < 5)
                    exports.update(doc, callback, nano, ++i);
                else if(err)
                    callback(err);
                else if(parseErr)
                    callback(parseErr);
            });
};

function parseXML (doc, callback, nano, err, res, xml) {
    try{
        var $ = libxml.parseXmlString(xml);
    }catch(error){
        console.log('Error while parsing xml file:');
        console.log(error);
        return error;
    }
    var deps = [];
    $.find('//itdDepartureList/itdDeparture').forEach(function (child) {
        var departure = {
            platform: child.attr('platform').value(),
            stopID: child.attr('stopID').value(),
            countdown: Number(child.attr('countdown').value()),
            isRealTime: true
        };

        var servLine = child.find('itdServingLine')[0];

        var itdNoTrain = servLine.find('itdNoTrain');
        if(itdNoTrain.length > 0 && itdNoTrain[0].attr('delay') !== null)
            departure.strike = itdNoTrain[0].attr('delay').value() === '-9999';
        departure.direction = servLine.attr('direction').value();
        departure.realtime = servLine.attr('realtime').value();
        departure.line = servLine.attr('number').value();
        var dateTime = child.find('itdRTDateTime');
        if (dateTime.length === 0) {
            departure.isRealTime = false;
            dateTime = child.find('itdDateTime')[0];
        }
        else
            dateTime = dateTime[0];
        var date = dateTime.find('itdDate')[0];
        var time = dateTime.find('itdTime')[0];
        departure.dateTime = new Date(Number(date.attr('year').value()),
                                      Number(date.attr('month').value()),
                                      Number(date.attr('day').value()),
                                      Number(time.attr('hour').value()),
                                      Number(time.attr('minute').value()),
                                      0, 0);
        departure.dateTime = Number(departure.dateTime);
        deps.push(departure);
    });
    doc.departures = deps.sort(function (a, b) {
        return (a.countdown - b.countdown);
    });
    doc.lastUpdate = Number(new Date());
    callback(null, doc);
    nano.bulk({docs: [doc]}, function (err) {
        if (err) {
            console.log('Error occured:');
            console.log(err);
        }
        else
            console.log('Wrote record to database');
    });
}