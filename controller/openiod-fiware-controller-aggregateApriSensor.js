/*
** Module: openiod-fiware-controller-aggregateApriSensor.js
**  Module to validate and convert source data
**
**
**
*/

/*
example: http://localhost:5000/openiod-fiware-connect/aggregate?sensorId=SCNMDC4F22113934&dateFrom=2019-05-10&dateTo=2019-05-12&service=aprisensor_in&fiwareServicePath=/bme280


*/

/*

Id: openiod-fiware-controller-aggregateApriSensor
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
var moduleName 		= 'openiod-fiware-controller-aggregateApriSensor';
var modulePath = require('path').resolve(__dirname, '.');
//console.log(modulePath)
var self = this;

// **********************************************************************************
// add module specific requires

// **********************************************************************************
var https 					= require('https');
var http	 					= require('http');
var axios	 					= require('axios');
var MongoClient = require('mongodb').MongoClient;
const winston = require('winston')


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
var _openIoDConfig;
var _sourceData;
var _defaults;
var _service;
var _source;
var _sourceIdMap;
var _sourceAttributeMap;
var _sourceCopyTarget;
var _target;

var argv;
var _sourceAttributeMap;


var log = function(message){
	winston.log('info', new Date().toISOString()+' | '+message, {});
}
var logDir = function(object){
	winston.log('info',object,{});
}
//log(winston.level)

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

var testIsoDatetime = function (isoDate) {
	var re = /^([\+-]?\d{4}(?!\d{2}\b))((-?)((0[1-9]|1[0-2])(\3([12]\d|0[1-9]|3[01]))?|W([0-4]\d|5[0-2])(-?[1-7])?|(00[1-9]|0[1-9]\d|[12]\d{2}|3([0-5]\d|6[1-6])))([T\s]((([01]\d|2[0-3])((:?)[0-5]\d)?|24\:?00)([\.,]\d+(?!:))?)?(\17[0-5]\d([\.,]\d+)?)?([zZ]|([\+-])([01]\d|2[0-3]):?([0-5]\d)?)?)?)?$/
	if (re.test(isoDate)) return true;
	else return false;
}


var postDataContextBroker =function(fiwareObject,target){
	log('POST data '+target.name+' '+target.host+':'+target.FiwareService+fiwareObject.fiwareServicePath+' id:'+fiwareObject.id+' type:'+fiwareObject.type);
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
				 'Fiware-ServicePath': 	fiwareObject.fiwareServicePath
			 }
	};

	console.log(options);

	console.log(fiwareObject);

/*
//	log(url);
	var url = target.host+':'+target.port+target.prefixPath+target.path
	var headers = {
		 "Fiware-Service": _options.fiwareService
			, "Fiware-ServicePath": _options.fiwareServicePath
	};
	console.dir(headers);

	axios.get(url,{ headers: headers })
	.then(response => {
		log("Records: "+response.data.length);
//		var tmpRec=response.data[0];
//		console.dir(tmpRec);
//		console.log(response.data);
//		_res.write(response.data);
		_callback(_res, params, response.data);
	 })
	 .catch(error => {
	   log(error);
		 //_res.end();
		 _res.send();
		 _callback(_res, params, error);

	 });
//	return axios.get(url,{ headers: headers });

*/



//	var req = https.request(options, (res) => {
	var req = https.request(options, (res) => {
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
		_openIoDConfig = openIoDConfig
		//log('test')
		//logDir(_openIoDConfig)
		//winston.log('info', 'Hello log files!', {
		//  someKey: 'some-value'
		//})
		var winstonLogFileName = process.env.LOG_FILE
		if (winstonLogFileName==undefined) {
			winstonLogFileName = modulePath + '/../../log/'+moduleName+'_'+ _openIoDConfig.getSystemListenPort() + '.log'
		}
		winston.add(new winston.transports.File({ filename: winstonLogFileName }))
		winston.level = process.env.LOG_LEVEL

		if (winston.level==undefined) winston.level='info'

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
	setDefaults: function(){
		_defaults = new Object();
		//_defaults.source = "";
	},
	getDefaults: function(){
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
	processInputParameters: function(req) {
		console.log('processInputParameters');
		var result = {};
		result.err = undefined;
		result.param = {};
		if (req.query == undefined) {
			result.err = 'ERROR: No parameters defined';
			return result;
		}
		var query = req.query;
		if (query.sensorId == undefined) {
			result.err = 'ERROR: sensorId parameter not defined';
			return result;
		}
		if (query.op == undefined) {
			result.err = 'ERROR: op - observable property parameter not defined';
			return result;
		}
		if (query.fiwareServicePath == undefined) {
			result.err = 'ERROR: fiwareServicePath parameter not defined';
			return result;
		}
		if (query.dateFrom == undefined) {
			result.err = 'ERROR: dateFrom parameter not defined';
			return result;
		}
		if (testIsoDatetime(query.dateFrom)==false) {
			result.err = 'ERROR: dateFrom parameter invalid ISO value';
			return result;
		} ;
		if (query.dateTo == undefined) {
			result.err = 'ERROR: dateTo paramater not defined';
			return result;
		};
		if (testIsoDatetime(query.dateTo)==false) {
			result.err = 'ERROR: dateTo parameter invalid ISO value';
			return result;
		};
		var _dateFrom = new Date(query.dateFrom);
		var _dateTo 	= new Date(query.dateTo);
		if (_dateFrom.getTime() >= _dateTo.getTime()) {
			result.err = 'ERROR: dateTo must be later than dateFrom';
			return result;
		};

		result.param.databasePrefix = _source.databasePrefix;
		result.param.fiwareService = _source.FiwareService;
		result.param.fiwareServicePath = query.fiwareServicePath;
		result.param.key 			= 'sensorId';
		result.param.sensorId = query.sensorId;
		// observable properties seperated by comma
		result.param.ops = query.op.split(',')
		result.param.dateFrom = query.dateFrom;
		result.param.dateTo		= query.dateTo;
		result.param.periodType = 'H';
		result.param.aggregate	= 'true';

		return result;
	},
	selectSource:function(res, params, callback){
		console.log('selectSource from controller aggregateApriSensor');
		console.dir(params);
		var _params = params;
		var _callback = callback;
		var _res=res;

		var options = {};
		options.key							= params.key;
		options.foiId						= params.sensorId;
		options.sensorId				= params.sensorId;
//		options.foiIdAlias			= params.selection.foiIdAlias;
//		options.ops							= params.selection.ops;
//		options.urlParamsAttrs 	= urlParamsAttrs;
		options.ops = params.ops
		options.limit						= 1000;
		options.periodType			= params.periodType;
		options.dateFrom 				= params.dateFrom;
		options.dateFromDate		= new Date(options.dateFrom);
		options.dateTo 					= params.dateTo;
		options.dateToDate			= new Date(options.dateTo);
		options.aggregate				= params.aggregate;
		options.databasePrefix = params.databasePrefix
		options.fiwareService 	= params.fiwareService;
		options.fiwareServicePath = params.fiwareServicePath;
		options.protocol				= _source.protocol;
		options.host 						= _source.host;
		console.dir(_service)
		options.port						= _source.port;
		console.log(options.port)
		options.prefixPath			= _source.prefixPath;
/*
		options.protocol				= _serviceTarget.protocol;
		options.host 						= _serviceTarget.host;
		options.port						= _serviceTarget.port;
		options.prefixPath			= _serviceTarget.prefixPath;
		options.protocol2				= _serviceTarget2.protocol;
		options.host2 					= _serviceTarget2.host;
		options.port2						= _serviceTarget2.port;
		options.prefixPath2			= _serviceTarget2.prefixPath;
		options.opPerRow				= thisParams.opPerRow;
*/

		// axios to select service with aggregate parameter
//http://localhost:5050/apri-sensor-service/v1/getSelectionData/?fiwareService=aprisensor_in&fiwareServicePath=/ttn&key=sensorId&opPerRow=false&foiOps=SCNMDC4F22113934,pm25&aggregate=true
//https://aprisensor-in.openiod.org/apri-sensor-service/v1/getSelectionData/?fiwareService=aprisensor_in&fiwareServicePath=/ttn&key=sensorId&opPerRow=false&foiOps=2019arbaairaqsensor1_2,pm25

/*


db.observation.aggregate([ {$group: {
	_id: { foiId: "$_id.foiId"
		, year: { $year:"$_id.phenomenonDate" }
			, month: { $month:"$_id.phenomenonDate" }
		, dayOfMonth: { $dayOfMonth:"$_id.phenomenonDate" }
		, status: "$status"
			}
	, count: { $sum: 1}
	, avgUFP: { $avg: "$UFPFloat"}
	, avgPM1: { $avg: "$PM1Float"}
	, avgPM25: { $avg: "$PM25Float"}
	, avgPM10: { $avg: "$PM10Float"}
}},
{ $sort : { "_id.year" : -1, "_id.month" : -1, "_id.dayOfMonth" : -1, "_id.status": 1 } }
])

db.observation.aggregate([ {$group: {
	_id: { foiId: "$foiId", day: { $dayOfMonth:"$phenomenonDateTime" }, month: { $month:"$phenomenonDateTime" }, year: { $year:"$phenomenonDateTime" } },
	count: { $sum: 1}
}}
])

db.observation.aggregate([ {$group: {
	_id: { foiId: "$foiId", year: { $year:"$phenomenonDateTime" }, month: { $month:"$phenomenonDateTime" }, status: "$status" },
	count: { $sum: 1 }
}},
{ $sort : { "_id.status" : -1 } }
])

db.observation.remove({ });


*/

//{"attrs.sensorId.value":"SCRP00000000b05ea71d","_id.servicePath" : "/pmsa003"
	// aggregate

	var aggrId = {
		sensorId:"$attrs.sensorId.value"
		, year: {$substrBytes: [ "$attrs.dateObserved.value", 0, 4 ] }
		, month: {$substrBytes: [ "$attrs.dateObserved.value", 5, 2 ] }
		, day: {$substrBytes: [ "$attrs.dateObserved.value", 8, 2 ] }
		, hour: {$substrBytes: [ "$attrs.dateObserved.value", 11, 2 ] }
	}
	var aggrGroup = {}
	aggrGroup._id = aggrId
	var op =''
	for (var i=0;i<options.ops.length;i++){
		op = options.ops[i]
		aggrGroup[op] = {$avg:"$attrs."+op+".value"}
		aggrGroup[op+'_min'] = {$min:"$attrs."+op+".value"}
		aggrGroup[op+'_max'] = {$max:"$attrs."+op+".value"}
	}
//	aggrGroup.pm25 = {$avg:"$attrs.pm25.value"}
//	aggrGroup.pm10 = {$avg:"$attrs.pm10.value"}
	aggrGroup.total = { $sum: 1 }

//			_id: aggrId
//		, pm25: {$avg:"$attrs.pm25.value"}
//			, pm10: {$avg:"$attrs.pm10.value"}
//			, total: { $sum: 1 } }

	options.aggregate = [
	//	{ $match: { $or: [ { score: { $gt: 70, $lt: 90 } }, { views: { $gte: 1000 } } ] } },
		 { $match: {$and: [{"attrs.sensorId.value":options.sensorId}
		 		,{"_id.servicePath" : options.fiwareServicePath}
				,{"attrs.dateObserved.value": {$gte: options.dateFrom,$lt : options.dateTo}}
			]}
		}
		,{ $group: aggrGroup }
		,{ $sort: { _id:1 } }
	]

	console.log(' Aggregation: ' + options.aggregate );
	console.dir(options.aggregate)
	var url = options.protocol+'://'+ options.host +':'+options.port; //+ options.prefixPath;
	console.log(url)
//	MongoClient.connect(url, function(err, client) {
	MongoClient.connect(url,{ useNewUrlParser: true,useUnifiedTopology: true }, function(err, client) {
		if(err) {
			console.log('Unable to connect to the mongoDB server. Error:', err);
			_callback(_res, params, err);
		} else {
			var db = client.db(options.databasePrefix+options.fiwareService);
			console.dir(db)

			db.collection('entities')
			.aggregate(options.aggregate)
			.toArray(function(err, result) {
				if(err) {
					console.log('Unable to connect to the mongoDB server. Error:', err);
				} else {
					console.log('Mongdb aggregation result: ' + result.length)
				}
				client.close();
				_callback(_res, params, result);
				return
/*
				assert.equal(err, null);
				age = [];
				for(var i in result) {
					age.push(result[i]['_id'])
				};
				ageNodes = {};
				for(var i in age) {
					nodes = [];
					var cursor = db.collection('test').find({'age':age[i]});
					// query based on aggregated data
					cursor.each(function(err,doc){
						if(doc!=null){
							nodes.push(doc);
						} else {
							console.log(age[i]);
							ageNodes[age[i]] = nodes;
						}
					})
				}
				res.json(ageNodes);
*/
			});
		};
	});
	return


//var callAxios = function(options,res) {
	var _options 	= options;
	var _res			= res;
	var urlParams					= '?fiwareService='+_options.fiwareService+'&fiwareServicePath='+_options.fiwareServicePath;
	//var urlParams					= _options.urlParamsAttrs+","+options.key+",dateObserved";
	urlParams							= urlParams+"&limit="+_options.limit+"&q="+options.key+"=='"+_options.foiId+"'";
	urlParams							= urlParams + ";dateObserved=='"+_options.dateFrom+"'..'"+_options.dateTo+"'";
	urlParams							= urlParams + "&aggregate="+_options.aggregate;
	urlParams							= urlParams + "&periodType="+_options.periodType;
	urlParams							= urlParams + "&opPerRow=false";
	urlParams							= urlParams + "&foiOps="+_options.foiId+',pm25';

	var url = _options.protocol+'://'+ _options.host +':'+_options.port+ _options.prefixPath + urlParams;

	log(url);
	var headers = {
		 "Fiware-Service": _options.fiwareService
			, "Fiware-ServicePath": _options.fiwareServicePath
	};
	console.dir(headers);

	axios.get(url,{ headers: headers })
	.then(response => {
		log("Records: "+response.data.length);
//		var tmpRec=response.data[0];
//		console.dir(tmpRec);
//		console.log(response.data);
//		_res.write(response.data);
		_callback(_res, params, response.data);
	//	_res.send(response.data);
/*
		var rec = '';
		for (var i=0;i<response.data.length;i++) {
			rec = response.data[i];
			console.dir(rec);
			var _dateOrPeriod = rec.dateObserved?rec.dateObserved:rec._id.period; // period in case of aggregation;

			//_res.write(JSON.stringify(response.data[i]));
//			_res.write('"'+rec.pm25+'";'+'"'+rec.pm25+'";'+));
		}
		if ( response.data.length>0 & response.data.length>=_options.limit ) { // not all data retrieved
			//console.log(lastDateDate);
			//console.log(_options.dateToDate);
			var _lastRecord = response.data[response.data.length-1];
			var lastDate;
			// period in case of aggregation
			if (_lastRecord._id != undefined && _lastRecord._id.period != undefined) {
				lastDate = _lastRecord._id.period;
			} else lastDate = _lastRecord.dateObserved;
			var lastDateDate = new Date(lastDate);
			_options.dateFromDate = new Date(lastDateDate.getTime()+1);
			_options.dateFrom			= _options.dateFromDate.toISOString();
			callAxios(_options,_res);
		} else _res.end();
//		log('end of read');
//      type: "stream" //,
      //chunk: count++
    //})+'\n')
//	    logDir(response.data);
	    //console.log(response.data.explanation);
*/
		//_res.end();
	 })
	 .catch(error => {
	   log(error);
		 //_res.end();
		 //_res.send();
		 _callback(_res, params, error);

	 });
//	return axios.get(url,{ headers: headers });







	},
	processResult:function(res, params, result){

		console.log('processResult aggregate service');
		var _result = result;
//		var _result = JSON.parse(result);
		//dir(_result);
		var l= _result!=undefined?_result.length:0;
		console.log("aantal records: "+l);


/*
		// check input serie
		//console.dir(_result[0]);
//		if (_result.length>0 && _result[0].featureOfInterest != 'LUCHTMEETNETNL01496') {
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
//		}
*/
/*
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
			log(sourceData.sensorId);
//			var sensorId = sourceData.sensorId;
//			var _tmpObservableProperty =_sourceAttributeMap[0].attributes[name];
//			log(name + " -> " + _tmpObservableProperty);
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
*/

  	//
		var calType = 'N';  // No calibration
		for (var i=0;i<l;i++){
			var resultRec = _result[i];
			var _key 							= resultRec._id.id + '_' + calType + '_' +resultRec._id.periodType + '_' + resultRec._id.period;
			var _sensorId = resultRec._id.id + '_' +resultRec._id.periodType;
			var fiwareObject = {};
			fiwareObject.id=_key;
			fiwareObject.type="AirQualityObserved";
			fiwareObject.calType=calType;
			fiwareObject.dateReceived=new Date().toISOString();
//			if (i<4) {
//				console.dir(resultRec)
//				console.log(resultRec._id.period);
//			}
			//var _observedDate = new Date(Date.parse(resultRec._id.period+':00:00'));
			//console.log(_observedDate);
			//fiwareObject.dateObserved=_observedDate.toISOString();
			//fiwareObject.fiwareServicePath = params.fiwareServicePath;


			for (var key in resultRec){
//				var _attributeId 			= _sourceIdMap["id"];
	//			var _attributeDateTime= _sourceIdMap["entityTime"];
	//			var _id 							= sourceData[_attributeId];
	//			var _dateTime 				= sourceData[_attributeDateTime];
	//			var _key 							= _id+'_'+_dateTime;
//				var _id 							= sourceData[_attributeId];

//				var _dateTime 				= timeKey;

				if (key != '_id') {
					fiwareObject[key]=resultRec[key];
				}
			}
			fiwareObject.sensorId=_sensorId;
//				fiwareObject.sensorId=_id;
				//fiwareObject.sensorSystem=query.sensorsystem;

//				var opsResults = resultArray[timeKey]
//				for (var observablePropertyKey in opsResults){
//					fiwareObject[observablePropertyKey] = opsResults[observablePropertyKey]
					//console.log(observablePropertyKey + " " +opsResults[observablePropertyKey] );
//				}

	//			if (_sourceCopyTarget && _sourceCopyTarget.active){
	//				self.sendToSourceCopyTarget({"id":_id,"dateTime":_dateTime,"key":_key},sourceData, _sourceCopyTarget);
	//			}
//			console.log(fiwareObject);
//			console.log(_target);

/*
			if (fiwareObject.sensorType == null) {
				//console.log('sensorType is set to '+ params.fiwareServicePath.substr(1));
				//fiwareObject.sensorType = params.fiwareServicePath.substr(1);
				fiwareObject.sensorType = resultRec._id.servicePath.substr(1);
			}
*/
			//sendToTarget(fiwareObject, _target);
		}
		res.send('Mission completed')
	}
}

//"use strict";
// **********************************************************************************
