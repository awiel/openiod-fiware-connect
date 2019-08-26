/*
** Module: openiod-fiware.js
**   OpenIod FIWARE service
**
** e.g. node openiod-fiware-connect pull josene foi=[{\"id\":14540},{\"id\":14539}]
** e.g. node openiod-fiware-connect server knmi
**
*/
/*

Id: openiod-fiware-connect
A generic connector to enable push and pull services to connect external services with Fiware Context broker.

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

var main_module 				= 'openiod-fiware-connect';
//console.log("Path: " + main_module);
//var modulePath 					= require('path').resolve(__dirname, 'node_modules/openiod-fiware/../..');
var modulePath 					= __dirname;
//console.log("Modulepath: " + modulePath);
var openIoDConfig 			= require(modulePath + '/openiod-fiware-config');

var self = this;

// **********************************************************************************

// add module specific requires
//var request 					= require('request');
var express 						= require('express');
//var https 						= require('https');
//var cookieParser 			= require('cookie-parser');
//var session 					= require('express-session');
//var uid 							= require('uid-safe');
////var bodyParser 			= require('connect-busboy');
var bodyParser 					= require('body-parser');
var fs 									= require('fs');
//var xml2js 						= require('xml2js');

var _systemCode 				= openIoDConfig.getSystemCode();
var _systemFolderParent	= openIoDConfig.getSystemFolderParent();
var _systemFolder				= openIoDConfig.getSystemFolder();
var _systemListenPort		= openIoDConfig.getSystemListenPort();
var _systemParameter		= openIoDConfig.getConfigParameter();

var _service;
var serviceCache	= {};

var log = function(message){
	console.log(new Date().toISOString()+' | '+message);
}
var logDir = function(object){
	console.dir(object);
}

var argv								= {}
argv.command						= process.argv[2]; // push or pull
argv.serviceName				= process.argv[3]; // service name e.g. josene or vtec
var argvFois            = process.argv[4]; // parameter for feature of interest(s)
var paramKey    = argvFois.split('=')[0]
if (paramKey=='foi') {
  try {
    var paramValue = argvFois.substr(4);
    argv.fois      = JSON.parse(paramValue);
  }
  catch(error){
    log('No json parameter for fois. '+argvFois.substr(4));
    return;
  }
}
openIoDConfig.init(main_module, argv);

function resolveAfterWaitTime(time) {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve('resolved service at '+ new Date());
      log('calling service');
      var processCycle = openIoDConfig.getProcessCycle();
      if (processCycle) {
        //console.dir(processCycle);
        if (processCycle.endCycleDate < processCycle.endDate) {
          processCycle.startCycleDate   = new Date(processCycle.endCycleDate.getTime()+1); // new cycle continues where previous cycle has ended
          processCycle.endCycleDate     = new Date(processCycle.endCycleDate.getTime()+ _service.procedure.repeat.cycleTime); // 60 minutes per cycle. normal 3 hours, luchtmeetnet per hour!
          if (processCycle.endCycleDate> processCycle.endDate){
            processCycle.endCycleDate   = new Date(processCycle.endDate.getTime());
          } else {
            asyncCall();  // activate next cycle in wait state
          }
          openIoDConfig.setProcessCycle(processCycle);
          serviceCache[_service.name].init(_service,openIoDConfig);
        } else {
          log("Cycles completed, process end.")
        }
      } else {
        asyncCall();  // activate next cycle in wait state
        serviceCache[_service.name].init(_service,openIoDConfig);
      }
    }, time);
  });
}

async function asyncCall() {
  var result = await resolveAfterWaitTime(_service.procedure.repeat.wait);
  log('Service end: '+result);
}

//asyncCall();


// **********************************************************************************

// todo: see messages in OGC 06-121r3 Table 8
var errorMessages = {
	  NOQUERY 					: { "message": 'Query parameters missing'		, "returnCode": 501 }
	, NOSERVICE 				: { "message": 'SERVICE parameter missing'		, "returnCode": 501 }
	, NOREQUEST 				: { "message": 'REQUEST parameter missing'		, "returnCode": 501 }
	, UNKNOWNREQ 				: { "message": 'REQUEST parameter unknown'		, "returnCode": 501 }
	, UNKNOWNIDENTIFIER : { "message": 'IDENTIFIER parameter unknown'	, "returnCode": 501 }
	, URLERROR 					: { "message": 'URL incorrect'					, "returnCode": 501 }
	, NOFOI 						: { "message": 'Feature of Interest missing'	, "returnCode": 501 }
	, NOMODEL 					: { "message": 'MODEL parameter missing'		, "returnCode": 501 }
	, NOARGVCOMMAND			: { "message": 'ERROR: Commandline argument command is missing or incorrect (push/pull/serve/ttn)'		, "returnCode": -1 }
	, NOARGVSERVICE			: { "message": 'ERROR: Commandline argument service is missing or unknown in this setting'		, "returnCode": -1 }
}

// standardQueryKeys, conversion table to convert 'semi'-standard keys into standard keys.
var standardQueryKeys = {
	  "SERVICE" : 'SERVICE'		// key=uppercase keyname; value=standard keyname
	, "REQUEST" : 'REQUEST'
}

var getModule = function(service,modulePath) {
	try {
    log('Load module: '+modulePath);
//		serviceCache[service.name] = require('./'+modulePath+'.js');
    serviceCache[service.name] = require(modulePath+'.js');
	}
	catch(e) {
	}
}
var executeService = function() {
	if (serviceCache[_service.name] == null ) {
		getModule(_service,__dirname+'/service/' +_service.procedure.module);
		if (serviceCache[_service.name] == null ) {
			getModule(_service,__dirname+'/service/' +_service.procedure.module+'/'+_service.procedure.module);
		}
		if (serviceCache[_service.name] == null ) {
			log('Error: module not found:' + _service.procedure.module);
      log(__dirname);
			return -1;
		}
	}

  log('calling service 1e time');
  //logDir(argv)
  if (argv.fois && argv.fois[0].startDate && argv.fois[0].endDate) {
    var _foi = argv.fois[0];
    log("Set processcycle");
    logDir(_foi)
    var processCycle = {};
    processCycle.startDate = new Date(_foi.startDate);
    processCycle.endDate = new Date(_foi.endDate);
    processCycle.startCycleDate = new Date(_foi.startDate);
    processCycle.endCycleDate = new Date(processCycle.startCycleDate.getTime() + _service.procedure.repeat.cycleTime - 1);
		processCycle.cycleTime = _service.procedure.repeat.cycleTime;
    //process (2x?) 60 minutes per cycle. normal 3 hours, luchtmeetnet per hour!
    _service.source.processCycle = processCycle;
    logDir(processCycle)
  }
  serviceCache[_service.name].init(_service,openIoDConfig);
  if (_service.procedure.repeat && _service.procedure.repeat.wait) {
		// repeat service every 'wait'-time.
    asyncCall();
  }

	return;
};


if (argv.command != 'push' && argv.command != 'pull' && argv.command != 'serve' && argv.command != 'transfer' && argv.command != 'ttn') {
	console.error(errorMessages.NOARGVCOMMAND.message);
	return errorMessages.NOARGVCOMMAND.returnCode;
}

if (argv.serviceName == undefined) {
	console.error(errorMessages.NOARGVSERVICE.message);
	return errorMessages.NOARGVSERVICE.returnCode;
}
//console.dir(argv);
_service = openIoDConfig.getConfigService(argv.serviceName);
//console.dir(_service);
_service.name= argv.serviceName;
if (_service == undefined) {
	console.error(errorMessages.NOARGVSERVICE.message);
	return errorMessages.NOARGVSERVICE.returnCode;
}

log("OpenIoD FIWARE execute: " + argv.command +' service '+ argv.serviceName +
	', source: ' + _service.source.name + ', procedure: ' + _service.procedure.name +
  ', target: ' + _service.target.name);

executeService();


return;
