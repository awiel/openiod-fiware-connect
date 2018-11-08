/*
** Module: openiod-fiware-connect-pull.js
**  Connector to pull data from a source and persist in FIWARE context broker
**
**
**
*/

"use strict";
// **********************************************************************************
// add module specific requires
//var request 			= require('request');
//var express 			= require('express');
var https 			= require('https');
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

module.exports = {

	init: function (service,openIoDConfig) {
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

		this.getData();
	},
	getData:function(){
		var fois = _openIoDConfig.getArgv().fois;
		var params = '';
		for (var i=0;i<fois.length;i++) {
			var foi = fois[i];
			if (i==0) {
				params = foi.id;
			} else {
				params = params + ',' + foi.id;
			}
		}
		var path = _source.prefixPath+_source.path+params+_source.suffixPath;

		var options = {
  		hostname: _source.host,
  		port: _source.port,
  		path: path,
  		method: _source.method,
			headers: { 'Authorization': 'Bearer '+_source.token
					, 'content-type': 'application/json; charset=utf-8' } //'Accept-Encoding': 'gzip,deflate',
		};
		this.getHttps(options, this.processResult);
	},
	getHttps:function(options, callback){
		log('Service: '+_service.name+' retrieve source data.')
		https.get(options, (res) => {
		  log('statusCode:'+ res.statusCode);
		  //log('headers:', res.headers);
		  res.on('data', (d) => {
		    //process.stdout.write(d);
				log('Service: '+_service.name+' data retrieved.')
				callback(d.toString());
		  });
		}).on('error', (e) => {
			log('Service: '+_service.name+' data retrieve error.')
		  console.error(e);
		});
	},
	processResult:function(result){
		var _result = JSON.parse(result);
//		console.log(_result);
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
	},
	sendToSourceCopyTarget: function(id,data,target) {
		var _key ='source_'+id.key;
		log('Send to source copy target with id: '+_key);
		var fiwareObject = {};
		fiwareObject.id = _key;
		fiwareObject.type = 'sourceAttributes';
		fiwareObject.content = data;
//		console.log(fiwareObject);
		self.sendToTarget(fiwareObject,target);
	},
	sendToTarget: function(fiwareObject,target) {
		//console.log(fiwareObject);
		//console.log(target);
		if (target.name=='contextBroker') {
			self.postDataContextBroker(fiwareObject,target)
		}
	},
	postDataContextBroker:function(fiwareObject,target){
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

}

//"use strict";
// **********************************************************************************
