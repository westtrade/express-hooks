'use strict';

/**
 * Function check if object is object type
 * 
 * @param  {[type]}  verifiedObject [description]
 * @return {Boolean}                [description]
 */
let isObject = module.exports.isObject = function isObject (verifiedObject) {
	return (typeof verifiedObject === 'object') && (verifiedObject !== null);
}


let isFunction = module.exports.isFunction = function isFunction(functionToCheck) {
	let getType = {};
	return functionToCheck && getType.toString.call(functionToCheck) === '[object Function]';
}

/**
 * Function merge arrays to one
 * 
 * @param  {[type]} target [description]
 * @param  {[type]} source [description]
 * @return {[type]}        [description]
 */
let extendArrays = module.exports.extendArrays = function extendArrays (target, source) {
	
	let args = Array.prototype.slice.call(arguments).filter(Array.isArray);
	if (!args.length) return [];	
	if (args.length > 2) {			
		args.unshift(extendArrays(args.shift(), args.shift()));
		return extendSettings.apply(this, args);
	}

	let wrongSource = !Array.isArray(source) || !source.length, wrongTarget = !Array.isArray(target)|| !target.length;
	if (wrongSource || wrongTarget)  
		return wrongSource && wrongTarget ? [] :
			wrongSource ? target : source;


	let result = target;

	source.forEach((element, index, currentArray) => {

		if (index <= target.length) {

			if (element === target[index]) {
				return;
			}	

			if (isObject(element) && isObject(target[index])) {
				return result[index] = extendSettings(target[index], element);
			}
		}

		result.push(element);
	});

	return result;
}

/**
 * Function merge objects
 * 
 * @param  {[type]} target [description]
 * @param  {[type]} source [description]
 * @return {[type]}        [description]
 */
let extendSettings = module.exports.extendSettings = function  (target, source) {

	let args = Array.prototype.slice.call(arguments).filter(isObject);

	if (!args.length) return {};	
	if (args.length > 2) {			
		args.unshift(extendSettings(args.shift(), args.shift()));
		return extendSettings.apply(this, args);
	}

	let wrongSource = !isObject(source), wrongTarget = !isObject(target);
	if (wrongSource || wrongTarget)  
		return wrongSource && wrongTarget ? {} :
			wrongSource ? target : source;

	for (let key in source) {
		target[key] = key in target ?
			Array.isArray(target[key]) && Array.isArray(source[key]) ? extendArrays(target[key], source[key]) :
			(isObject(target[key]) ? extendSettings(target[key], source[key]) : source[key]) :
			source[key];
	}

	return target;
}
