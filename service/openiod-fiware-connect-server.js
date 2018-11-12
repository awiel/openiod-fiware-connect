/*
** Module: openiod-fiware-connect-server.js
**  Connector as service to receive data from a source and persist in FIWARE context broker
**
*/

/*

Id: openiod-fiware-connect-server
Generic service as part of the generic connector to enable services which receive push messages from external services.

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
//var request 			= require('request');
const express = require('express');
const path = require('path');
const app = express();
//const PORT = process.env.PORT || 5000;

app.use(express.json())
app.use (express.urlencoded({extended: false}))

app.use(function(req, res, next) {
   res.header("Access-Control-Allow-Origin", "*");
   res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
   next();
});

//var https 			= require('https');
//const querystring = require('querystring');

//var cookieParser 		= require('cookie-parser');
//var session 			= require('express-session');
//var uid 				= require('uid-safe');
////var bodyParser 		= require('connect-busboy');
//var bodyParser 			= require('body-parser');
//var fs 					= require('fs');
//var xml2js 				= require('xml2js');

/*
var _systemCode 		= openIoDConfig.getSystemCode();
var _systemFolderParent	= openIoDConfig.getSystemFolderParent();
var _systemFolder		= openIoDConfig.getSystemFolder();
var _systemListenPort	= openIoDConfig.getSystemListenPort();
var _systemParameter	= openIoDConfig.getConfigParameter();

// **********************************************************************************

// todo: see messages in OGC 06-121r3 Table 8
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
*/



var _openIoDConfig;
var _service;
var _source;
var _sourceIdMap;
var _sourceAttributeMap;
var _sourceValidate;
var _sourceCopyTarget;
var _target;
var self;

var log = function(message){
	console.log(new Date().toISOString()+' | '+message);
}
/*
var formatDate = function(date) {
	var obj 							= {}
	obj.date 							= date;
	obj.year 							= date.getUTCFullYear();
	obj.month 						= date.getUTCMonth()+1;
	obj.day 							= date.getUTCDate();
	obj.hour 							= date.getUTCHours();
	obj.minutes 					= date.getUTCMinutes();
	obj.seconds 					= date.getUTCSeconds();
	obj.milliseconds			= date.getUTCMilliseconds();
	obj.yearStr						= ''+obj.year;
	obj.monthStr					= ''+obj.month;
  if (obj.monthStr.length==1) obj.monthStr = '0'+obj.monthStr;
	obj.dayStr						= ''+obj.day;
	if (obj.dayStr.length==1) obj.dayStr = '0'+obj.dayStr;
	obj.hourStr						= ''+obj.hour;
	if (obj.hourStr.length==1) obj.hourStr = '0'+obj.hourStr;
	obj.minutesStr				= ''+obj.minutes;
	if (obj.minutesStr.length==1) obj.minutesStr = '0'+obj.minutesStr;
	obj.secondsStr				= ''+obj.seconds;
	if (obj.secondsStr.length==1) obj.secondsStr = '0'+obj.secondsStr;
	obj.millisecondsStr		= ''+obj.millieseconds;
	if (obj.millisecondsStr.length<3) obj.millisecondsStr = '0'+obj.millisecondsStr;
	if (obj.millisecondsStr.length<3) obj.millisecondsStr = '0'+obj.millisecondsStr;
	obj.iso 							= obj.yearStr+'-'+obj.monthStr+'-'+obj.dayStr+'T'+obj.hourStr+':'+obj.minutesStr+':'+obj.secondsStr
	obj.isoMinute					= new Date(obj.year,obj.month-1,obj.day,obj.hour,obj.minutes).toISOString();
	obj.isoMilli 					= obj.iso+':'+obj.milliseconds;
	obj.isoTZ 						= obj.date.toISOString();
	return obj;
}
*/

var processResult = function(result){
	var _result = result; //JSON.parse(result);
	console.log(_result);
	for (var i=0;i<_result.length;i++){
		var sourceData 				= _result[i];
		var _attributeId 			= _sourceIdMap["id"];
		var _attributeDateTime= _sourceIdMap["entityTime"];
		var _id 							= sourceData[_attributeId];
		var _dateTime 				= sourceData[_attributeDateTime];
		var _key 							= _id+'_'+_dateTime;
		if (_sourceCopyTarget && _sourceCopyTarget.active){
			self.sendToSourceCopyTarget({"id":_id,"dateTime":_dateTime,"key":_key},sourceData, _sourceCopyTarget);
		}

		if (_sourceValidate) {
			_sourceValidate.init(_service,_openIoDConfig,sourceData);
		}
		for (var m=0;m<_sourceAttributeMap.length;m++){
			var _map 						= _sourceAttributeMap[m];
			var fiwareObject 		= {};
			if (_sourceValidate.getDefaults) {
				_sourceValidate.setDefaults();
				fiwareObject = _sourceValidate.getDefaults();
			}
			for (var attribute in _map.attributes){
				var targetAttribute		=_map.attributes[attribute];
				if(sourceData[attribute]){
					var _attr = sourceData[attribute];
					if(_sourceValidate[attribute]) {
//							console.log(' Validation for attribute '+ attribute);
						var targetValue = _sourceValidate[attribute](sourceData[attribute]);
						if (targetValue != undefined) fiwareObject[targetAttribute]=targetValue;
//							console.log('   Old / New value: '+ _attr + ' / ' + fiwareObject[targetAttribute]);
//							console.dir(fiwareObject[targetAttribute]);
					} else {
						log(' No validation for attribute '+ attribute);
						fiwareObject[targetAttribute]=sourceData[attribute];
					}
				}
			}

			if (_target && _target.active){
				if (_target.entityTimeConfig){
					var _tmpDateTime = new Date(_dateTime);
					if (_target.entityTimeConfig.round=='UP' && _target.entityTimeConfig.trunc=='minute') {
						_tmpDateTime = new Date(_tmpDateTime.getTime()+59999);
						fiwareObject.entityTime = new Date(_tmpDateTime.getFullYear(),_tmpDateTime.getMonth(),_tmpDateTime.getDate()
												,_tmpDateTime.getHours(),_tmpDateTime.getMinutes()).toISOString();
						fiwareObject.id			=_map.targetIdPrefix+_id+'_'+fiwareObject.entityTime;
						fiwareObject.type		=_map.targetType;
					}	else {
						fiwareObject.entityTime = _dateTime;
						fiwareObject.id			=_map.targetIdPrefix+_key;
						fiwareObject.type		=_map.targetType;
					}
				}
				self.sendToTarget(fiwareObject, _target);
			}

		}
	}
};

var sendToSourceCopyTarget = function(id,data,target) {
	console.log('Todo: sendToSourceCopyTarget');
	console.log(id);
}

var sendToTarget = function(fiwareObject,_target) {
	console.log(fiwareObject);
	console.log(_target);
}



module.exports = {
	init: function(service,openIoDConfig) {
		self = this;
		log('Init service '+service.name);
		_openIoDConfig 			= openIoDConfig;
		_service 						= service;
		_source 						= service.source;
		_sourceIdMap 				= _source.idMap;
		_sourceAttributeMap = _source.attributeMap;
		if (_source.validate) {
			_sourceValidate 	= require(__dirname+'/../validate/'+_source.validate);
		}
		_sourceCopyTarget		= service.sourceCopyTarget;
		_target							= service.target;

		this.initRoutes();

		log('listening to port: ' + _source.port);
		app.listen(_source.port);

	},

initRoutes: function(){
  //console.log(_openIoDConfig);
	//console.log(_openIoDConfig.getSystemCode())
	app.all('/*', function(req, res, next) {
		console.log("app.all/: " + req.url + " ; systemCode: " + _openIoDConfig.getSystemCode() );
		//  res.header("Access-Control-Allow-Origin", "*");
		//  res.header("Access-Control-Allow-Headers", "X-Requested-With");
		next();
	});

	// test url for systemcode
	app.get('/'+_openIoDConfig.getSystemCode()+'/', function(req, res) {
		console.log("Reqparam: " + req.url);
		res.send("ok");
	});


	// test url for systemcode
	app.post('/'+_openIoDConfig.getSystemCode()+'/openiod-fiware-connect/knmi', function(req, res) {
		console.log("openiod-fiware-connect/knmi: " + req.url);
		console.dir(req.body);
		res.send("Message received");
	});

	app.post('/openiod-fiware-connect/knmi', function(req, res) {
		console.log("openiod-fiware-connect/knmi: " + req.url);
		console.dir(req.body);
		var results = req.body;
		var structuredResults = [];
		for (var i=0;i<results.station.length;i++) {
			var result = {};
			result.station = results.station[i];
			result.stationName = results.stationName[i];
			result.lat = results.lat[i];
			result.lon = results.lon[i];
			result.height = results.height[i];
			result.dd = results.dd[i];
			result.ff = results.ff[i];
			result.pp = results.pp[i];
			result.D1H = results.D1H[i];
			result.R1H = results.R1H[i];
			result.ta = results.ta[i];
			result.rh = results.rh[i];
			result.time = results.time;
			structuredResults.push(result);
		}
		processResult(structuredResults);
		res.send("Message received");
	});

}


}

// **********************************************************************************
