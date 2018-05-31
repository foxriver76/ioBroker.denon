/**
 * denon adapter
 */

/* jshint -W097 */// jshint strict:false
/*jslint node: true */
'use strict';

// you have to require the utils module and call adapter function
var utils =    require(__dirname + '/lib/utils'); // Get common adapter utils
var net = require('net'); // import net

// you have to call the adapter function and pass a options object
// name has to be set and has to be equal to adapters folder name and main file name excluding extension
// adapter will be restarted automatically every time as the configuration changed, e.g system.adapter.denon.0
var adapter = new utils.Adapter('denon');

// is called when adapter shuts down - callback has to be called under any circumstances!
adapter.on('unload', function (callback) {
    try {
        adapter.log.info('Stopping Denon AVR adapter...');
	client.destroy(); // kill connection
        client.unref();	// kill connection
        callback();
    } catch (e) {
        callback();
    }
});

// is called if a subscribed object changes
adapter.on('objectChange', function (id, obj) {
    // Warning, obj can be null if it was deleted
    adapter.log.info('objectChange ' + id + ' ' + JSON.stringify(obj));
});

// is called if a subscribed state changes
adapter.on('stateChange', function (id, state) {
    // Warning, state can be null if it was deleted
    adapter.log.info('stateChange ' + id + ' ' + JSON.stringify(state));

    // you can use the ack flag to detect if it is status (true) or command (false)
    if (state && !state.ack) {
        adapter.log.info('ack is not set!');
    }
});

// Some message was sent to adapter instance over message box. Used by email, pushover, text2speech, ...
adapter.on('message', function (obj) {
    if (typeof obj === 'object' && obj.message) {
        if (obj.command === 'send') {
            // e.g. send email or pushover or whatever
            console.log('send command');

            // Send response in callback if required
            if (obj.callback) adapter.sendTo(obj.from, obj.command, 'Message received', obj.callback);
        }
    }
});

// is called when databases are connected and adapter received configuration.
// start here!
adapter.on('ready', function () {
	main();
});

function main() {
    // Creating states
    adapter.setObject('powerState', {
	type: 'state',
	common: {
		name: 'powerState',
		role: 'Power State',
		type: 'boolean',
		write: true,
		read: true
	},
	native: {}
    });
    adapter.setObject('mainVolume', {
	type: 'state',
	common: {
		name: 'mainVolume',
		role: 'Main Volume',
		type: 'number',
		read: true,
		write: true
	},
	native: {}
    });

    // Constants & Variables
    var client = new net.Socket();
    const host = adapter.config.ip;

    // The adapters config (in the instance object everything under the attribute "native") is accessible via
    // adapter.config:
    adapter.log.info('Connecting to AVR with following attributes:');
    adapter.log.info('IP-Address: '    + adapter.config.ip);
    adapter.log.info('AVR-Name: '    + adapter.config.avrName);

    // Connect
    client.connect({port: 23, host: host}, function() {
		adapter.log.info("adapter connecting to DENON-AVR: " + host + ":" + "23");
    });

    // Connection handling
    client.on('error',function(error) {
        adapter.log.error(error);
        client.destroy();
        client.unref();
        adapter.log.info('Connection closed!');
    });

    client.on('end', function () { // Denon has closed the connection
        adapter.log.warn('Denon AVR has cancelled the connection');
        client.destroy();
        client.unref();
        adapter.log.info('Connection closed!');
    });

    client.on('connect', function () { // Successfull connected
        adapter.log.info('Connected to Denon AVR!');
    });

    client.on('data', function (data) {
        adapter.log.info('Incoming data: ' + data.toString()); // Logging incoming data
	handleResponse(data);
     });

     // Handle state changes
     adapter.on('stateChange', function (id, state) {
    	if (!id || !state || state.ack) { // Ignore acknowledged state changes or error states
        return;
	}
	// TODO: Handle state changes
     } // endOnStateChange

    /**
     * Internals
    */
    function handleResponse(data) {
	// get command out of String
	var command = data.toString().replace(/\s+|\d+/g,'');
	adapter.log.info('Command to handle is ' + command);
	switch(command) {
		case 'PWON':
			adapter.setState('powerState', true, true);
			break;
		case 'PWSTANDBY':
			adapter.setState('powerState', false, true);
			break;
		case 'MV':
			data = data.slice(2, 4) + '.' + data.slice(4, 5); // Slice volume from string
			adapter.setState('mainVolume', parseFloat(data), true);
			break;
		case 'MVMAX':
			break;
	} // endSwitch
    } // endHandleResponse

    // all states changes inside the adapters namespace are subscribed
    adapter.subscribeStates('*');

    // examples for the checkPassword/checkGroup functions
    adapter.checkPassword('admin', 'iobroker', function (res) {
        console.log('check user admin pw ioboker: ' + res);
    });

    adapter.checkGroup('admin', 'admin', function (res) {
        console.log('check group user admin group admin: ' + res);
    });



}
