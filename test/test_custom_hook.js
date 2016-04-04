'use strict';

module.exports.run = function ($app, $settings) {

}

module.exports.preinit = function ($hooks_implementations) {
	$hooks_implementations.get('test_custom_hook')._enable = true;
}