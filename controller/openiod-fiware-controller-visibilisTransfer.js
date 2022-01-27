/*
** Module: openiod-fiware-controller-visibilisTransfer.js
**  Module to validate and convert source data
**
**
**
*/

/*

Id: openiod-fiware-controller-visibilisTransfer
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
var https 					= require('https');
var http	 					= require('http');

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
var _service;
var _source;
var _sourceIdMap;
var _sourceAttributeMap;
var _sourceController;
var _sourceCopyTarget;
var _target;

var argv;
var _sourceAttributeMap;

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


var postDataContextBroker =function(fiwareObject,target){
	log('POST data '+target.name+' '+target.host+':'+target.FiwareService+target.FiwareServicePath+' id:'+fiwareObject.id+' type:'+fiwareObject.type);
//		var postData = {};
//		postData.id = fiwareObject.id;
//		postData.type = fiwareObject.type;
//		postData.content = fiwareObject.sourceAttributes;
	var _data = JSON.stringify(fiwareObject);

	var options = {
		hostname: target.host,
		port: 		target.port,
		path: 		target.prefixPath+target.path,
		method: 	target.method,
		headers: {
				 'Content-Type': 				'application/json',
				 'Content-Length': 			_data.length,
				 'Fiware-Service': 			target.FiwareService,
				 'Fiware-ServicePath': 	target.FiwareServicePath
			 }
	};

	//console.log(options);
	//console.log(_data);
//	var req = https.request(options, (res) => {
	var req = http.request(options, (res) => {
		log('statusCode:' + res.statusCode);
		//console.log('headers:', res.headers);

		res.on('data', (d) => {
			process.stdout.write(d);
			log(d);
		});
	});

	req.on('error', (e) => {
		console.error(e);
	});

	req.write(_data);
	req.end();
}

var sendToTarget = function(fiwareObject,target) {
	log('Send to target with id: '+fiwareObject.id);
	//console.dir(fiwareObject);
	//console.log(fiwareObject);
	//console.log(target);
	if (target.name=='contextBroker') {
		postDataContextBroker(fiwareObject,target)
	}
}


module.exports = {

	init: function (service,openIoDConfig) {
		log('Init validation module for service '+service.name+" controller "+service.source.controller );
		this.setDefaults();
//		this.setData(sourceData);
		_service 						= service;
		_source 						= service.source;
		_sourceIdMap 				= _source.idMap;
		_sourceAttributeMap = _source.attributeMap;
		_sourceCopyTarget		= service.sourceCopyTarget;
		_target							= service.target;
		_latitude 					= undefined;
		_longitude 					= undefined;
	},
	setDefaults(){
		_defaults = new Object();
		//_defaults.source = "";
	},
	getDefaults(){
		return _defaults;
	},
	setData:function(sourceData){
		_sourceData = sourceData;
	},
	setArgv:function(inArgv) {
		argv = inArgv;
	},
//	setSourceAttributeMap:function(inSourceAttributeMap){
//		_sourceAttributeMap = inSourceAttributeMap;
//	},
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
	},
	readData:function(source){
		log('POST data '+source.name+' '+source.host+':'+source.prefixPath+source.path);

		console.log(source.processCycle);

		var fois = argv;
		var foi= fois[0];
		log('params: '+foi.id + ' ' + foi.sensorSystem +' '+ foi.startDate+' '+ foi.endDate);
		log('cycle : '+ source.processCycle.startCycleDate.toISOString()+' '+ source.processCycle.endCycleDate.toISOString());
		var path="&sensorsystem="+foi.sensorSystem+"&foi="+foi.id+"&date_start="+source.processCycle.startCycleDate.toISOString()+"&date_end="+source.processCycle.endCycleDate.toISOString();
		var offering = 'offering_0439_initial';
		if (foi.sensorSystem=='apri-sensor-knmi10m') {
			offering = 'offering_knmi10m_initial';
		}

		var url = source.protocol+"://"+source.host+":"+source.port+source.prefixPath+'&offering='+offering+source.path+path;
		log(url);

		//&sensorsystem=apri-sensor-pmsa003&foi=apri-sensor-pmsa003_SCWM68C63A809492&date_start=2019-01-01T00:00:00+01:00&date_end=2019-01-01T05:00:00+01:00
//		var postData = {};
//		postData.id = fiwareObject.id;
//		postData.type = fiwareObject.type;
//		postData.content = fiwareObject.sourceAttributes;
		var options = {
			hostname: source.host,
			port: 		source.port,
			path: 		source.prefixPath+'&offering='+offering+source.path+path,
			method: 	source.method,
			headers: {
					 //'Content-Type': 				'application/json',
					 //'Content-Length': 			_data.length,
					 //'Fiware-Service': 			source.FiwareService,
					 //'Fiware-ServicePath': 	source.FiwareServicePath
				 }
		};
		if (source.protocol=='http'){
			this.getHttp(options, this.processResult);
		} else {
			this.getHttps(options, this.processResult);
		}
	},
	processResult:function(result){
		var _result = JSON.parse(result);
		//dir(_result);
		console.log("aantal records: "+_result.length);

		// check input serie
		//console.dir(_result[0]);
		if (_result.length>0 && _result[0].featureOfInterest != 'LUCHTMEETNETNL01496') {
			for (var i=1;i<_result.length;i++){
				//console.dir(_result[i]);
				var name = _result[i].resultFields[1].name;
				//log(name + " -> " + _sourceAttributeMap[0].attributes[name]);
				for (var j=0;j<_result[i].resultValues.length;j++) {
					if (_result[i].resultValues[j][0]!=_result[0].resultValues[j][0]) {
						log("ERROR: phenomenonTime unequal to serie: "+_result[i].resultValues[j][0] +" <> "+_result[0].resultValues[j][0]+ _result[0].featureOfInterest);
					}
				}
			}
		}


		var resultArray = [];

		for (var i=0;i<_result.length;i++){
			var sourceData 				= _result[i];
			// sourceData.procedure
			// sourceData.offering  nvt
			// sourceData.observableProperty
			// sourceData.featureOfInterest
			// sourceData.resultFields
			// sourceData.resultValues

			//console.log("aantal records: "+_result.length);
			log(sourceData.featureOfInterest);
			var name = sourceData.resultFields[1].name;
			var _tmpObservableProperty =_sourceAttributeMap[0].attributes[name];
			log(name + " -> " + _tmpObservableProperty);
//			for (var j=0;j<sourceData.resultFields.length;j++) {
//				log(sourceData.resultFields[j].name);
//			};
			for (var k=0;k<sourceData.resultValues.length;k++) {
				//log(sourceData.resultValues[k][0] + " " + sourceData.resultValues[k][1]);
				var _tmpDateTimeStr = sourceData.resultValues[k][0];
				if (resultArray[_tmpDateTimeStr]== undefined) {
					resultArray[_tmpDateTimeStr]={};
				}
				resultArray[_tmpDateTimeStr][_tmpObservableProperty] = sourceData.resultValues[k][1];
			};
		}

		var calType = 'N';  // No calibration
		for (var timeKey in resultArray){
			var _attributeId 			= _sourceIdMap["id"];
//			var _attributeDateTime= _sourceIdMap["entityTime"];
//			var _id 							= sourceData[_attributeId];
//			var _dateTime 				= sourceData[_attributeDateTime];
//			var _key 							= _id+'_'+_dateTime;
			var _id 							= sourceData[_attributeId];

			var _dateTime 				= timeKey;
			var _key 							= _id + '_' + calType + '_' + timeKey;

			var fiwareObject = {};
			fiwareObject.id=_key;
			fiwareObject.sensorId=_id;
			fiwareObject.type="AirQualityObserved";
			fiwareObject.calType=calType;
			//fiwareObject.sensorSystem=query.sensorsystem;
			fiwareObject.dateReceived=timeKey;
			fiwareObject.dateObserved=timeKey;

			var opsResults = resultArray[timeKey]
			for (var observablePropertyKey in opsResults){
				fiwareObject[observablePropertyKey] = opsResults[observablePropertyKey]
				//console.log(observablePropertyKey + " " +opsResults[observablePropertyKey] );
			}

			if (_sourceCopyTarget && _sourceCopyTarget.active){
				self.sendToSourceCopyTarget({"id":_id,"dateTime":_dateTime,"key":_key},sourceData, _sourceCopyTarget);
			}
			//console.log(_key);
			sendToTarget(fiwareObject, _target);
		}

	}


}

//"use strict";
// **********************************************************************************
