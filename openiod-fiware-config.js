
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
		localService;

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

				systemConfigLocalPath 		= systemFolder; //systemFolderParent +'/config/';
				systemConfigStr 					= fs.readFileSync(systemConfigLocalPath + "/openiod-fiware-config.json");
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

				console.log('\n=================================================================');
				console.log();
				console.log('Start systemname         :', systemName);
				console.log(' Systemmaincode / subcode:', mainSystemCode, systemCode );
				console.log(' Systemversion           :', systemVersion);
				console.log(' Systemhost              :', systemHostName);
				console.log(' System folder           :', systemFolder);
				console.log(' System folder parent    :', systemFolderParent);
				console.log(' System config folder    :', systemConfigLocalPath);
				console.log(' System Main modulename  :', systemMainModuleName);
				console.log(' Runtime command         :', argv.command);
				console.log(' Servicetype             :', systemServiceType);
				console.log(' Listening port          :', systemListenPort);
				console.log(' System start            :', systemStart.toISOString());
				console.log('=================================================================\n');

				if (mainSystemCode != systemBaseCode) {
					console.log('ERROR: SYSTEMCODE OF CONFIG FILE NOT EQUAL TO SYSTEM BASECODE (', systemCode, 'vs', systemBaseCode, ')');
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
			}


		} // end of module.exports
