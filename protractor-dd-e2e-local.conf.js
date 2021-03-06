'use strict';

var protractorConfig = require( 'protractor-config' );
var request          = require( 'request' );
var SpecReporter     = require( 'jasmine-spec-reporter' );
var spec             = new SpecReporter( { 'displayStacktrace' : true } );
var _                = require( 'lodash' );
var io               = require( 'socket.io-client' );
var uuid             = require( 'uuid');
var Promise          = require( 'bluebird' );

let env      = process.env;
const config = require( './config' );

exports.config = {
	// Framework needed
	'framework'       : 'jasmine2',
	'seleniumAddress' : config.seleniumAddress,
	'baseUrl'         : config.baseUrl,
	'capabilities'    : {
		'browserName' : 'chrome'
	},
	'jasmineNodeOpts' : {
		'showColors'             : true, // Use colors in the command line report.
		'isVerbose'              : true,
		'defaultTimeoutInterval' : 1200000,
		'print'                  : function () {}
	},
	'allScriptsTimeout' : 120000,
	'specs'             : config.specs,
	'onPrepare'         : function () {
		jasmine.getEnv().addReporter( spec );
		return new Promise( function ( resolve, reject ) {
			request( config.apiServer + '/test-cases/' + browser.params.templateId, function ( error, response, body ) {
				if ( !error && response.statusCode == 200 ) {
					browser.params.template = body;
					var socket = io( config.socketServer );
					socket.on( 'connect', function () {
						browser.params.browserStackBody = {
							'automation_session' : {
								'browser'            : 'chrome',
								'os'                 : 'OS X',
								'os_version'         : 'Yosemite'
							}
						};
						socket.emit( 'register-browserstack', {
							'browserstack' : browser.params.browserStackBody,
							'session'      : uuid.v4()
						} );
						// Override console.log
						var old = console.log;
						console.log = function () {
							//Array.prototype.unshift.call(arguments, 'Report: ');
							// Keep this for debugging purposes
							old.apply( this, arguments );
							socket.emit( 'browserstack-stream', {
								'data' : arguments
							} );
						};
						resolve();
					} );

					socket.on( 'error', function ( error ) {
						console.log( error );
					} );

				}
			} )
		} );
	},
	'onComplete' : function () {
		spec.metrics.endTime = new Date();
		request( {
			'method' : 'POST',
			'url'    : config.apiServer + '/machines/1/test-cases/' + browser.params.templateId,
			'body'   : {
				'browserstack' : browser.params.browserStackBody,
				'spec'         : spec.metrics
			},
			'json' : true
		}, function () {
			//console.log( 'Good' );
		} );
	}

};
