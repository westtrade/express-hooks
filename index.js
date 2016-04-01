'use strict';

const utils = require('./src/utils');
const path = require('path');
const fs = require('fs');
const AppEvents = new (require('events'))();

//console.log(process.mainModule);

const HOOK_PREFIX = 'express-hook';
const MAIN_MODULE_FOLDER = path.dirname(module.parent.filename);


let mainModulePath = path.join(MAIN_MODULE_FOLDER, 'package.json');
let currentPackage = require(mainModulePath);


let HOOKS = {};

let customHooks = [];


function addHook(hookName, hookInfo) {
	
	if (utils.isFunction(hookInfo)) {				
		hookInfo = {
			run : hookInfo
		}
	} 


	if (utils.isObject(hookInfo)) HOOKS[hookName] = hookInfo;	

}


if ('dependencies' in currentPackage) {

	for (let depName in currentPackage.dependencies) {	

		if (depName.indexOf(HOOK_PREFIX) === 0) {

			let hookName = depName.replace(HOOK_PREFIX, '').replace(/^[-]+/, '');
			let hookInfo = module.parent.require(depName);
			addHook(hookName, hookInfo);
		}
	}
}


customHooks.forEach(hookPath => {
	let hookInfo = module.parent.require(hookPath);
	let hoookName = path.basename(hookPath);
	

	addHook(hoookName, hookInfo);
});



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

	if (app) app.hooks = HOOKS;	

	let promiseStack = [];
	for (let hookName in HOOKS) {
		if('run' in HOOKS[hookName] && utils.isFunction(HOOKS[hookName].run)) {
			let localHookSettings = {};
			promiseStack.push(HOOKS[hookName].run(app, localHookSettings, globalSettings));
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



module.exports.addCustomHook = function (path) {
	customHooks.push(path);
}