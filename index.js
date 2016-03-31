'use strict';

const utils = require('./src/utils');
const path = require('path');
const fs = require('fs');
const AppEvents = new (require('events'))();

//console.log(process.mainModule);

let mainModulePath = path.join(path.dirname(module.parent.filename), 'package.json');
let currentPackage = require(mainModulePath);

const HOOK_PREFIX = 'express-hook';
let hooks = {};

if ('dependencies' in currentPackage) {

	for (let depName in currentPackage.dependencies) {	

		if (depName.indexOf(HOOK_PREFIX) === 0) {

			let hookName = depName.replace(HOOK_PREFIX, '').replace(/^[-]+/, '');
			let hookInfo = module.parent.require(depName);


			if (utils.isFunction(hookInfo)) {				
				hookInfo = {
					run : hookInfo
				}
			} 


			if (utils.isObject(hookInfo)) hooks[hookName] = hookInfo;			
		}
	}
}



/**
 * Hooks
 *
 * .apprc
 *
 * Build
 *
 * Install
 * Update
 * Run
 * Stop
 *
 * Preinit
 *
 *
 * 
 */
module.exports = function (app, globalSettings) {

	if (app) app.hooks = hooks;	

	let promiseStack = [];
	for (let hookName in hooks) {
		if('run' in hooks[hookName] && utils.isFunction(hooks[hookName].run)) {
			let localHookSettings = {};
			promiseStack.push(hooks[hookName].run(app, localHookSettings, globalSettings));
		}
	}

	Promise.all(promiseStack).then(result => AppEvents.trigger('ready'), error => AppEvents.trigger('error'));
}




for (let utilName in utils) module.exports[utilName] = utils[utilName];
//console.log(module.exports);

let isReady = false;

AppEvents.on('ready', event => { isReady = true; });

module.exports.ready = function () {

	return new Promise(resolve => {
		if (isReady) return resolve();
		else AppEvents.on('ready', event => { isReady = true; resovle() }).on('error', e => reject(e));
	});
}