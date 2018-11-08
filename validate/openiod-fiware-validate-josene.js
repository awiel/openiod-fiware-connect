/*
** Module: openiod-fiware-validate-josene.js
**  Module to validate and convert source data
**
**
**
*/

/*

Id: openiod-fiware-validate-josene
Module as part of the generic connector to enable pull services and to connect external services with Fiware Context broker.
This module validates and transforms attribute from the external system Josene https://josene.intemo.com/docs/index.html 

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

var milliKelvinToCelsius = function(n){
	return Math.round((n/1e3-273.15)*100)/100
};
var convertGPS2LatLng = function(gpsValue){
	var b31_28 	= gpsValue>>28;
	var b27_0		= gpsValue-(b31_28<<28);
	var northSouth = b31_28>>3;
	var N_U = b31_28 - (northSouth<<3);
	var degrees = b27_0 >> 20;
	var minutes = (b27_0 - (degrees<<20))/1000000;
	var result = northSouth==1?(degrees+minutes)*-1:degrees+minutes;
	return result;
};
var _location = {"type": "geo:json","value": {"type": "Point","coordinates": [0, 0]}};
var _latitude;
var _longitude;
var getLocation = function(location,lat,lon) {
	var _tmpLocation = location;
	_tmpLocation.value.coordinates[0]	= _latitude;
	_tmpLocation.value.coordinates[1]	= _longitude;
	return _tmpLocation;
};

var _co2 = {"value":undefined,"metadata":{"unitCode":{"value":"59"}}}; // 59=ppm
var getCo2 = function(value) {
	_co2.value = value;
	return _co2;
};
var _pm25 = {"value":undefined,"metadata":{"unitCode":{"value":"GQ"}}}; // GQ=micrograms per cubic meter
var getPm25 = function(value) {
	_pm25.value = value;
	return _pm25;
};
var _pm10 = {"value":undefined,"metadata":{"unitCode":{"value":"GQ"}}}; // GQ=micrograms per cubic meter
var getPm10 = function(value) {
	_pm10.value = value;
	return _pm10;
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
var _audio = {"value":undefined,"metadata":{"unitCode":{"value":"35"}}}; // 35=dB
var getAudio = function(value) {
	_audio.value = value;
	return _audio;
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
		_defaults.source = "https://josene.intemo.com/docs/index.html";
	},
	getDefaults(){
		return _defaults;
	},
	setData:function(sourceData){
		_sourceData = sourceData;
	},
	id:function(inValue){
		return inValue;
	},
	time:function(inValue){
		return inValue;
	},
	v_audio_total:function(inValue){
		return getAudio(inValue);
	},
	s_barometer:function(inValue){
		return getAirPressure(inValue/100);
	},
	s_humidity:function(n){
		return getRelativeHumidity(n/1000);
	},
	s_temperatureambient:function(n){
		return getTemperature(milliKelvinToCelsius(n));
	},
	s_temperatureunit:function(n){
		return getTemperature(milliKelvinToCelsius(n));
	},
	s_co2:function(n){
		return getCo2(n);
	},
	s_no2:function(n){
		return n;
	},
	s_pm10:function(n){
		return getPm10(n/1000);
	},
	s_pm2_5:function(n){
		return getPm25(n/1000);
	},
	s_latitude:function(n){
		_latitude = convertGPS2LatLng(n);
		if (_latitude != undefined && _longitude!= undefined) return getLocation(_location,_latitude,_longitude);
		else return undefined;
	},
	s_longitude:function(n){
		_longitude = convertGPS2LatLng(n);
		if (_latitude != undefined && _longitude!= undefined) return getLocation(_location,_latitude,_longitude);
		else return undefined;
	}
}

//"use strict";
// **********************************************************************************
