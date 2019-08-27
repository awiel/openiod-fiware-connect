/*
** Module: openiod-fiware-connect-pull.js
**  Connector to pull data from a source and persist in FIWARE context broker
**
**
**
*/

/*

Id: openiod-fiware-connect-pull
Generic pull service as part of the generic connector to enable pull services and to connect external services with Fiware Context broker.

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
//var express 			= require('express');
var https 			= require('https');
var   axios 							= require('axios');
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
var _sourceController;
var _sourceCopyTarget;
var _target;
var self;
var fiwareObjects = []
var fiwareObjectsIndex = 0;

var log = function(message){
	console.log(new Date().toISOString()+' | '+message);
}
var logDir = function(object){
	console.dir(object);
}
var clone = function(obj) {
    if (null == obj || "object" != typeof obj) return obj;
    var copy = obj.constructor();
    for (var attr in obj) {
        if (obj.hasOwnProperty(attr)) copy[attr] = obj[attr];
    }
    return copy;
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

module.exports = {

	init: function (service,openIoDConfig) {
		self = this;
		log('Init service '+service.name);
		_openIoDConfig 			= openIoDConfig;
		_service 						= service;
		_source 						= service.source;
		_sourceIdMap 				= _source.idMap;
		_sourceAttributeMap = _source.attributeMap;
		if (_source.controller) {
			_sourceController 	= require(__dirname+'/../controller/'+_source.controller);
		}
		_sourceCopyTarget		= service.sourceCopyTarget;
		_target							= service.target;

		this.getData();
	},
	getData:function(){
		log('getData')
		var fois = _openIoDConfig.getArgv().fois;
		var params = '';
		//logDir(_openIoDConfig)
		//log(fois)
		for (var i=0;i<fois.length;i++) {
			var foi = fois[i];
			if (i==0) {
				params = ""+foi.id;
			} else {
				params = params + ',' + foi.id;
			}
		}
		var path = _source.prefixPath+_source.path+params+_source.suffixPath;

		var options = {
  		hostname: _source.host,
			foiId : fois[0].id,
  		port: _source.port,
  		path: path,
  		method: _source.method,
			headers: { 'Authorization': 'Bearer '+_source.token
					, 'content-type': 'application/json; charset=utf-8' } //'Accept-Encoding': 'gzip,deflate',
		};

		if (_source.suffixPath == '/timeseries') {
			logDir(_service.source.processCycle)
			//for (_service.source.processCycle.startDate < _service.source.processCycle.endDate) {
				var m=''+(_service.source.processCycle.startCycleDate.getUTCMonth()+1)
				if (m.length==1) {
					m='0'+m
				}
				var d=''+(_service.source.processCycle.startCycleDate.getUTCDate())
				if (d.length==1) {
					d='0'+d
				}
				var _parmHour = _service.source.processCycle.startCycleDate.getUTCHours()+1;
				options.path = path + '/' +
					_service.source.processCycle.startCycleDate.getUTCFullYear() +
					m +
					d +
					'/' + _parmHour  // for Josene parameter UTC hour + 1 (1-24)
					this.getHttps(options, this.processResult);
			//}
		} else {
			this.getHttps(options, this.processResult);
		}

	},
	getHttps:function(options, callback){
		log('Service: '+_service.name+' retrieve source data.')
		logDir(options)
		var result='';
		https.get(options, (res) => {
		  log('statusCode:'+ res.statusCode);
		  //log('headers:', res.headers);
		  res.on('data', (d) => {
		    //process.stdout.write(d);
				//log('Service data: '+_service.name+' data retrieved.')
				result=result+d
				//callback(d.toString());
		  });
			res.on('end', (d) => {
		    //process.stdout.write(d);
				log('Service end: '+_service.name+' data retrieved.')
				callback(result.toString(),options);
		  });
		}).on('error', (e) => {
			log('Service: '+_service.name+' data retrieve error.')
		  console.error(e);
		});
	},
	processResult:function(result,options){
		log('processResult')
		log(result.substr(0,5000))
		var _resultJson = JSON.parse(result);
		var _result=''
		var fiwareObject 		= {};
		// josene timeseries?
		var joseneHist=false
		if (_resultJson.date!=undefined & _resultJson.hour!=undefined & _resultJson.timeseries!=undefined) {
			log(_resultJson.date +' '+ _resultJson.hour +' '+ _resultJson.timeseries.length)
			_result=_resultJson.timeseries
			joseneHist=true
		} else {
			_result=_resultJson
		}
		//logDir(_result)
		//logDir(_result[0])
		log('Number of timeseries in this hour: ' + _result.length);
		fiwareObjects = []
		for (var i=0;i<_result.length;i++){
			var sourceData 				= _result[i];
			var _attributeId 			= _sourceIdMap["id"];
			var _attributeDateTime= _sourceIdMap["entityTime"];
			var _id 							= sourceData[_attributeId];
			var _dateTime 				= sourceData[_attributeDateTime];
			if (joseneHist == true) {
				_id 			= 'J'+options.foiId
				sourceData.id = _id
			}
			var _key 							= _id+'_'+_dateTime;
			if (_sourceCopyTarget && _sourceCopyTarget.active){
				self.sendToSourceCopyTarget({"id":_id,"dateTime":_dateTime,"key":_key},sourceData, _sourceCopyTarget);
			}

			if (_sourceController) {
				_sourceController.init(_service,_openIoDConfig,sourceData);
			}
			for (var m=0;m<_sourceAttributeMap.length;m++){
				if (m==1) continue
				var _map 						= _sourceAttributeMap[m];
				fiwareObject 		= {};
				if (_sourceController.getDefaults) {
					_sourceController.setDefaults();
					fiwareObject = _sourceController.getDefaults();
				}
				for (var attribute in _map.attributes){
					var targetAttribute		=_map.attributes[attribute];
					if(sourceData[attribute]){
						var _attr = sourceData[attribute];
						if(_sourceController[attribute]) {
							var targetValue = _sourceController[attribute](sourceData[attribute]);
							//if (attribute=='s_pm2_5') {
								//log(' Validation for attribute '+ attribute+ ' value: ' );
								//logDir(targetAttribute)
								//logDir(targetValue)
							//}
							logDir(targetValue)
							if (targetValue != undefined) fiwareObject[targetAttribute]=clone(targetValue);
//							console.log('   Old / New value: '+ _attr + ' / ' + fiwareObject[targetAttribute]);
//							logDir(fiwareObject[targetAttribute]);
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
					//log('yyyyyyyyyyyyyyyyyyyy')
					//var fiwareObjectClone = clone(fiwareObject)
					//logDir(fiwareObject)
					fiwareObjects.push(fiwareObject)
					//setTimeout(self.sendToTarget,i*200,fiwareObjectClone, _target)
					//self.sendToTarget(fiwareObject, _target);
				}
			}
		}
//		logDir(fiwareObjects[0])
//		logDir(fiwareObjects[1])
//		return
		fiwareObjectsIndex=0
		self.processFiwareObjects()
	},
	processFiwareObjects: function(){
		log('Process record: '+fiwareObjectsIndex+'/'+fiwareObjects.length)
		var fiwareObject = fiwareObjects[fiwareObjectsIndex]
		logDir(fiwareObjectsIndex)
		logDir(fiwareObject)
		self.sendToTarget(fiwareObject, _target);
	},
	sendToSourceCopyTarget: function(id,data,target) {
		var _key ='source_'+id.key;
		log('Send to source copy target with id: '+_key);
		var fiwareObject = {};
		fiwareObject.id = _key;
		fiwareObject.type = 'sourceAttributes';
		fiwareObject.content = data;
		self.sendToTarget(fiwareObject,target);
	},
	sendToTarget: function(fiwareObject,target) {
		var _fiwareObject = fiwareObject
		log(fiwareObject);
		//log(target);
		if (target.name=='contextBroker') {
			self.postDataContextBroker(_fiwareObject,target)
		}
	},
	postDataContextBroker:function(fiwareObject,target){
		var _fiwareObject = fiwareObject
//		logDir(_fiwareObject)
		log('POST data '+target.name+' '+target.host+':'+target.FiwareService+target.FiwareServicePath+' id:'+_fiwareObject.id+' type:'+_fiwareObject.type);
//		var postData = {};
//		postData.id = fiwareObject.id;
//		postData.type = fiwareObject.type;
//		postData.content = fiwareObject.sourceAttributes;
		//log('xxxxxxxxxxxxxxxxxx')
    //logDir(_fiwareObject)
//    if (_fiwareObject.PM25 != undefined) {
//			log('2xxxxxxxxxxxxxxxxx')
//			log(_fiwareObject.PM25.value)
//		}
		var _data = JSON.stringify(_fiwareObject);
		var _url = target.protocol+"://"+target.host+":"+target.port+target.prefixPath+target.path
		log(_url)

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
		     },
			data: _data,
			url:_url
		};
		axios(options,
//			{
//    	method: 'post',
//    	url: '/addUser',
//    	data: _data
//		}
	)
		.then(function (response) {
    	//console.log(response);
			fiwareObjectsIndex++
			if (fiwareObjectsIndex<fiwareObjects.length) {
				self.processFiwareObjects()
			}
		})
		.catch(function (error) {
    	console.log(error);
			fiwareObjectsIndex++
			if (fiwareObjectsIndex<fiwareObjects.length) {
				self.processFiwareObjects()
			}
		});

},
postDataContextBrokerOld:function(fiwareObject,target){
	var _fiwareObject = fiwareObject
//		logDir(_fiwareObject)
	log('POST data '+target.name+' '+target.host+':'+target.FiwareService+target.FiwareServicePath+' id:'+_fiwareObject.id+' type:'+_fiwareObject.type);
//		var postData = {};
//		postData.id = fiwareObject.id;
//		postData.type = fiwareObject.type;
//		postData.content = fiwareObject.sourceAttributes;
	//log('xxxxxxxxxxxxxxxxxx')
	//logDir(_fiwareObject)
//    if (_fiwareObject.PM25 != undefined) {
//			log('2xxxxxxxxxxxxxxxxx')
//			log(_fiwareObject.PM25.value)
//		}
	var _data = JSON.stringify(_fiwareObject);

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
	var req = https.request(options, (res) => {
		log('statusCode:' + res.statusCode);
		//console.log('headers:', res.headers);

		res.on('data', (d) => {
			process.stdout.write(d);
			//log(d);
			log('data')

		});
		res.on('end', (d) => {
			//process.stdout.write(d);
			log('Service end: '+_service.name+' data sent.')
			fiwareObjectsIndex++
			if (fiwareObjectsIndex<fiwareObjects.length) {
				self.processFiwareObjects()
			}
		});
	});

	req.on('error', (e) => {
		log('error')
		console.error(e);
		fiwareObjectsIndex++
		if (fiwareObjectsIndex<fiwareObjects.length) {
			self.processFiwareObjects()
		}
	});

	req.write(_data);
	req.end();
}

}

//"use strict";
// **********************************************************************************
