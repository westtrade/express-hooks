'use strict';

const utils = require('./src/utils');
const path = require('path');
const fs = require('fs');
const AppEvents = new (require('events'))();

const HOOK_PREFIX = 'express-hook-';
const MAIN_MODULE_FOLDER = path.dirname(module.parent.filename);

let mainModulePath = path.join(MAIN_MODULE_FOLDER, 'package.json');
let rcFilePath = path.join(MAIN_MODULE_FOLDER, '.expressrc');

let currentPackage = require(mainModulePath);

const injector = require("lightject");
const _ = require('lodash');
const ini = require('ini');

const stripJsonComments = require('strip-json-comments');

let HOOKS_MAP = new Map();

function getMetaInformation(realHookInfo) {
	
	let metaInformation = {};

	if (utils.isFunction(realHookInfo)) {

		let tempMeta = {};
		for (let keyName in realHookInfo) {
			if (keyName[0] !== '_' || utils.isFunction(metaInformation[keyName])) continue;			
			metaInformation[keyName] = realHookInfo[keyName];
		}

		for (let keyName in realHookInfo.prototype) {
			if (keyName[0] !== '_' || utils.isFunction(metaInformation[keyName])) continue;			
			metaInformation[keyName] = realHookInfo.prototype[keyName];
		}

		return metaInformation;				
	} 
	
	if (!utils.isObject(realHookInfo)) return metaInformation;	

	for (let keyName in metaInformation) {
		if (keyName[0] !== '_' || utils.isFunction(metaInformation[keyName])) continue;			
		metaInformation[keyName] = realHookInfo[keyName];
	}

	return metaInformation;
}


function getModuleHooks (realHookInfo) {
	
	let hooks = { 
		'preinit' : null,
		'run' : null,
	};

	if (utils.isFunction(realHookInfo)) {		
		hooks.run = realHookInfo;	
	} 


	if (utils.isObject(realHookInfo)) {
		
		for (let hookName in realHookInfo) {
			if (hookName[0] === '_' || !utils.isFunction(realHookInfo[hookName]) || !(hookName in hooks)) continue;			
 			hooks[hookName] = realHookInfo[hookName];
		}
	}

	return hooks;
}


function addHook(hookName, realHookInfo) {

	let metaInformation = getMetaInformation(realHookInfo);	
	let hooks = getModuleHooks(realHookInfo);

	let defaultHookInfo = {
		_name : hookName,
		hooks : hooks,
		'_weight' : 0,
		'_enable' : true
	};

	let hookInfo = _.assign({}, defaultHookInfo, metaInformation);
	HOOKS_MAP.set(hookName, hookInfo);	
}

if ('dependencies' in currentPackage && utils.isObject(currentPackage.dependencies) && Object.keys(currentPackage.dependencies).length) {

	for (let depName in currentPackage.dependencies) {	
		
		if (depName.indexOf(HOOK_PREFIX) === 0) {
			let hookName = depName.replace(HOOK_PREFIX, '').replace(/^[-]+/, '');
			let hookInfo = module.parent.require(depName);
			addHook(hookName, hookInfo);
		}
	}
}



let rcFileContent = '';
let rcHooksConfig = {};

try {
	rcFileContent = fs.readFileSync(rcFilePath, 'UTF-8');
} catch (e) { }


let testEmptyRc = rcFileContent.replace(/[\n ]+/gim, '');
if (testEmptyRc.length) {

	let isParsed = false;
	try {
		rcHooksConfig = JSON.parse(stripJsonComments(rcFileContent));
		isParsed = true;
	} catch (error) {}


	if (!isParsed) {

		try {
			rcHooksConfig = ini.parse(rcFileContent);
			isParsed = true;
		} catch (error) {}
	}
}


/*
	TODO 
		Продумать что должно быть в rc файле (скорее всего настройки и метанастройки хуков)
		Проверить чтобы у всех хуков была единые имена в инжекторе
 */

for (let hookName in rcHooksConfig) {
	let hookInfo = HOOKS_MAP.get(hookName);
	let metaHookInfo = getMetaInformation(rcHooksConfig[hookName]);
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
module.exports.initApp = module.exports = function executeRunHooks(app, globalSettings) {	

	injector.value("$hooks_implementations", HOOKS_MAP);
	injector.value("$app", app);
	injector.value("$settings", globalSettings);
	injector.value("$injector", injector);

	let hooksResultList = Array.from(HOOKS_MAP.values())
		.filter(hookInfo => hookInfo._enable === true)
		.sort((hookInfoPrev, hookInfoNext) => hookInfoPrev._weight === hookInfoNext._weight ? 0 : hookInfoPrev._weight > hookInfoNext._weight ? 1 : -1)
		.map(hookInfo => 'hooks' in hookInfo && 'preinit' in hookInfo.hooks && utils.isFunction(hookInfo.hooks.preinit) ? injector.run(hookInfo.hooks.preinit) : null);


	Promise.all(hooksResultList).then(result => {

		let PromisedList = Array.from(HOOKS_MAP.values())
			.filter(hookInfo => hookInfo._enable === true)
			.sort((hookInfoPrev, hookInfoNext) => hookInfoPrev._weight === hookInfoNext._weight ? 0 : hookInfoPrev._weight > hookInfoNext._weight ? 1 : -1)
			.map(hookInfo => 'run' in hookInfo.hooks && utils.isFunction(hookInfo.hooks.run) ?  injector.run(hookInfo.hooks.run) : null);

		return Promise.all(PromisedList);
	})
	
	.then(result => AppEvents.emit('ready', injector), error => { AppEvents.trigger('error', error)});
	return module.exports;
}

for (let utilName in utils) module.exports[utilName] = utils[utilName];


let isReady = false;
AppEvents.on('ready', result => { isReady = true; });

module.exports.ready = function () {
	return new Promise((resolve, reject) => isReady ? resolve() : AppEvents.on('ready', resolve).on('error', reject));
}



module.exports.addCustomHook = function (hookPath) {	
	let hookInfo = module.parent.require(hookPath);
	let hoookName = path.basename(hookPath);
	addHook(hoookName, hookInfo);	
	return module.exports;
}