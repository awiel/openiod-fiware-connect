/*
** Module: openiod-fiware-validate-knmi.js
**  Module to validate and convert source data
**
**
**
*/

/*

Id: openiod-fiware-validate-knmi
Module as part of the generic connector to enable pull services and to connect external services with Fiware Context broker.
This module validates and transforms attribute from the external system knmi https://data.knmi.nl provided by (Scapeler) SCAPE604/knmi-data/knmi-import.sh

Copyright (C) 2018  André van der Wiel / Scapeler http://www.scapeler.com

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published
by the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.

*/


"use strict";
// **********************************************************************************
// add module specific requires

// **********************************************************************************

var errorMessages = {
	  NOQUERY 			: { "message": 'Query parameters missing'		, "returnCode": 501 }
	, NOSERVICE 		: { "message": 'SERVICE parameter missing'		, "returnCode": 501 }
	, NOREQUEST 		: { "message": 'REQUEST parameter missing'		, "returnCode": 501 }
	, UNKNOWNREQ 		: { "message": 'REQUEST parameter unknown'		, "returnCode": 501 }
	, UNKNOWNIDENTIFIER : { "message": 'IDENTIFIER parameter unknown'	, "returnCode": 501 }
	, URLERROR 			: { "message": 'URL incorrect'					, "returnCode": 501 }
	, NOFOI 			: { "message": 'Feature of Interest missing'	, "returnCode": 501 }
	, NOMODEL 			: { "message": 'MODEL parameter missing'		, "returnCode": 501 }
}
var self = this;
var _sourceData;
var _defaults;

var log = function(message){
	console.log(new Date().toISOString()+' | '+message);
}

var _location = {"type": "geo:json","value": {"type": "Point","coordinates": [0, 0]}};
var _latitude;
var _longitude;
var _height;
var getLocation = function(location,lat,lon,height) {
	var _tmpLocation = location;
	_tmpLocation.value.coordinates[0]	= lat;
	_tmpLocation.value.coordinates[1]	= lon;
	_tmpLocation.value.coordinates[2]	= height;
	return _tmpLocation;
};


var _relativeHumidity = {"value":undefined,"metadata":{"unitCode":{"value":"P1"}}}; // P1=%
var getRelativeHumidity = function(value) {
	_relativeHumidity.value = value;
	return _relativeHumidity;
};
var _temperature = {"value":undefined,"metadata":{"unitCode":{"value":"3"}}}; // 3=°C
var getTemperature = function(value) {
	_temperature.value = value;
	return _temperature;
};
var _airPressure = {"value":undefined,"metadata":{"unitCode":{"value":"A97"}}}; // A97=hPa
var getAirPressure = function(value) {
	_airPressure.value = value;
	return _airPressure;
};



module.exports = {

	init: function (service,openIoDConfig, sourceData) {
		log('Init validation module for service '+service.name);
		this.setDefaults();
		this.setData(sourceData);
		_latitude 					= undefined;
		_longitude 					= undefined;
	},
	setDefaults(){
		_defaults = new Object();
		_defaults.source = "https://data.knmi.nl";
	},
	getDefaults(){
		return _defaults;
	},
	setData:function(sourceData){
		_sourceData = sourceData;
	},
	station:function(inValue){
		return inValue;
	},
	stationName:function(inValue){
		return inValue;
	},
	time:function(inValue){
		return inValue;
	},
	entityTime:function(inValue){
		return inValue;
	},
	lat:function(inValue){
		_latitude = inValue;
		if (_latitude != undefined && _longitude!= undefined && _height!= undefined) return getLocation(_location,_latitude,_longitude,_height);
		else return undefined;
	},
	lon:function(inValue){
		_longitude = inValue;
		if (_latitude != undefined && _longitude!= undefined && _height!= undefined) return getLocation(_location,_latitude,_longitude,_height);
		else return undefined;
	},
	height:function(inValue){
		_height = inValue;
		if (_latitude != undefined && _longitude!= undefined && _height!= undefined) return getLocation(_location,_latitude,_longitude,_height);
		else return undefined;
	},
	dd:function(inValue){
		return inValue;
	},
	ff:function(inValue){
		return inValue;
	},
	pp:function(inValue){
		return getAirPressure(inValue);
	},
	D1H:function(inValue){
		return inValue;
	},
	R1H:function(inValue){
		return inValue;
	},
	ta:function(inValue){
		return getTemperature(inValue);
	},
	rh:function(inValue){
		return getRelativeHumidity(inValue);
	}
}

//"use strict";
// **********************************************************************************
