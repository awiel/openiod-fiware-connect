
/**
 * The openiod-fiware-config module for init and configuration
 * @module openiod-fiware-config
 */

 /*

 Id: openiod-fiware-config
 Module for configuration parameters for the generic connector to enable push and pull services to connect external services with Fiware Context broker.

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


"use strict"; // This is for your code to comply with the ECMAScript 5 standard.

	var fs 		= require('fs'),
			path 	= require('path'),
			os 		= require('os');

	var mainSystemCode,
		parameter,
		request,
		argv,
		systemBaseCode,
		systemCode,
		systemConfigLocalPath,
		systemConfigStr,
		systemConfig,
		systemContext,
		systemFolder,
		systemFolderParent,
		systemHostName,
		systemMainModuleName,
		systemName,
		systemListenPort,
		systemServiceType,
		systemStart,
		systemVersion,
		systemVersionL1,
		systemVersionL2,
		systemVersionL3,
		localService,
		localServiceContent;

		var log = function(message){
			console.log(new Date().toISOString()+' | '+message);
		}
		var logDir = function(object){
			console.dir(object);
		}

		module.exports = {

			init: function (name,runtime_argv) {
				var _module;

				systemStart 							= new Date();

				systemHostName						= os.hostname();
				systemFolder 							= __dirname;
				systemFolderParent				= path.resolve(__dirname, '../node_modules/' + name + '/../..');
				//console.log(systemFolderParent);
				//console.log(__filename);
				//console.log(__dirname);
				//console.log(path.resolve(__dirname, '../node_modules/' + name + '/../..') );

				systemMainModuleName 			= name;
				systemBaseCode 						= path.basename(systemFolderParent);
				argv											= runtime_argv;

				systemConfigLocalPath 		= systemFolderParent +'/config/';
				systemConfigStr 					= fs.readFileSync(systemConfigLocalPath + "openiod-fiware-config-"+argv.command+"-"+argv.serviceName+".json");
				systemConfig 							= JSON.parse(systemConfigStr);

				// IMPORTANT: SYSTEM CONFIGURATION VALUES !!!
				systemName 								= systemConfig.system.systemName;
				systemCode 								= systemConfig.system.systemCode;
				mainSystemCode 						= systemConfig.system.systemCode;
				systemListenPort 					= systemConfig.system.systemListenPort;
				systemVersionL1 					= systemConfig.system.version.l1;
				systemVersionL2 					= systemConfig.system.version.l2;
				systemVersionL3 					= systemConfig.system.version.l3;
				systemVersion 						= systemVersionL1 + '.' + systemVersionL2 + '.' + systemVersionL3;
				systemServiceType 				= systemConfig.system.serviceType;

				// context(s)
				systemContext							= systemConfig.context;

				// service(s)
				localService							= systemConfig.service;
				localServiceContent				= systemConfig.service[argv.serviceName];
//				if (localServiceContent.listener!=undefined && localServiceContent.listener.port!=undefined) {
//					systemListenPort = localServiceContent.listener.port;
//				}
				//console.dir(localService);

				// Parameters
				parameter									= systemConfig.parameter;

				// module overrules default config
				if (systemConfig.modules) {
					for (var i=0;i<systemConfig.modules.length;i++) {
						_module = systemConfig.modules[i];
						if (_module.moduleName == systemMainModuleName)  {
							if (_module.systemCode) {
								systemCode = _module.systemCode;
							}
							if (_module.systemListenPort) {
								systemListenPort = _module.systemListenPort;
							}
							break;
						}
					}
				}

				log('=================================================================');
				log('');
				log('Start systemname         : ' + systemName);
				log(' Systemmaincode / subcode: ' + mainSystemCode + ' '+ systemCode );
				log(' Systemversion           : ' + systemVersion);
				log(' Systemhost              : ' + systemHostName);
				log(' System folder           : ' + systemFolder);
				log(' System folder parent    : ' + systemFolderParent);
				log(' System config folder    : ' + systemConfigLocalPath);
				log(' System Main modulename  : ' + systemMainModuleName);
				log(' Runtime command         : ' + argv.command);
				log(' Service                 : ' + argv.serviceName);
				log(' Servicetype             : ' + systemServiceType);
				log(' Listening port          : ' + systemListenPort);
				log(' System start            : ' + systemStart.toISOString());
				log('=================================================================\n');
				log('=================================================================');
				log('LICENSE');
				log('	');
				log('Id: openiod-fiware-connect-server');
				log('Generic service as part of the generic connector to enable services which receive push messages from external services.');
				log('	');
				log('Copyright (C) 2018  André van der Wiel / Scapeler http://www.scapeler.com');
				log('')
				log('This program is free software: you can redistribute it and/or modify');
				log('it under the terms of the GNU Affero General Public License as published');
				log('by the Free Software Foundation, either version 3 of the License, or');
				log('(at your option) any later version.');
				log('')
				log('This program is distributed in the hope that it will be useful,');
				log('but WITHOUT ANY WARRANTY; without even the implied warranty of');
				log('MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the');
				log('GNU Affero General Public License for more details.');
				log('')
				log('You should have received a copy of the GNU Affero General Public License');
				log('along with this program.  If not, see <https://www.gnu.org/licenses/>.');
				log('')
				log('=================================================================\n');

				if (mainSystemCode != systemBaseCode) {
					log('ERROR: SYSTEMCODE OF CONFIG FILE NOT EQUAL TO SYSTEM BASECODE (' + systemCode + ' vs ' + systemBaseCode + ')');
					return false;
				}
				return true;

			},  // end of init

			getSystemCode: function () {
				return systemCode;
			},

			getSystemFolderParent: function () {
				return systemFolderParent;
			},

			getSystemFolder: function () {
				return systemFolder;
			},

			getSystemListenPort: function () {
				return systemListenPort;
			},

			getContext: function (context) {
				var _context = null;
				if (systemConfig.context && systemConfig.context[context]) {
					_context 	= systemConfig.context[context];
				}
				return _context;
			},
			getConfigParameter: function () {
				return parameter;
			},

			getConfigLocalPath: function () {
				return systemConfigLocalPath;
			},

			getConfigService: function (serviceName) {
				return localService[serviceName];
			},

			getArgv: function() {
				return argv;
			},

			setProcessCycle: function(processCycle) {
				//console.log(localServiceContent);
				localServiceContent.source.processCycle = processCycle;
			},
			getProcessCycle: function() {
				return localServiceContent.source.processCycle;
			}

		} // end of module.exports
