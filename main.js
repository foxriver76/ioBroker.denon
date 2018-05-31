/**
 * DENON AVR adapter
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
    adapter.log.debug('stateChange ' + id + ' ' + JSON.stringify(state));

    // you can use the ack flag to detect if it is status (true) or command (false)
    if (state && !state.ack) {
        adapter.log.debug('ack is not set!');
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

    adapter.setObject('volumeUp', {
	type: 'state',
	common: {
		name: 'volumeUp',
		role: 'button',
		type: 'number',
		write: true,
		read: true
	},
	native: {}
    });

    adapter.setObject('volumeDown', {
    	type: 'state',
        common: {
                name: 'volumeDown',
                role: 'button',
                type: 'number',
                write: true,
                read: true
        },
        native: {}
    });

    adapter.setObject('muteIndicator', {
        type: 'state',
        common: {
                name: 'muteIndicator',
                role: 'Mute Indicator',
                type: 'boolean',
                write: true,
                read: true
        },
        native: {}
    });

    adapter.setObject('surroundMode', {
        type: 'state',
        common: {
                name: 'surroundMode',
                role: 'Surround Mode',
                type: 'number',
                write: true,
                read: true,
		states: '0:STEREO;1:VIRTUAL;2:VIDEO GAME;3:MCH STEREO;4:NEURAL:X;5:DOLBY SURROUND'
        },
        native: {}
    });




    // Constants & Variables
    var client = new net.Socket();
    const host = adapter.config.ip;

    // Connect
    connect();

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
	updateStates(); // Update states when connected
    });

    client.on('data', function (data) {
        adapter.log.debug('Incoming data: ' + data.toString()); // Logging incoming data
	handleResponse(data);
     });

     // Handle state changes
     adapter.on('stateChange', function (id, state) {
    	if (!id || !state || state.ack) { // Ignore acknowledged state changes or error states
        	return;
	} // endIf
	id = id.split('.')[2]; // remove instance name and id
	state = state.val;	// only get state value
	adapter.log.info('State Change - ID: ' + id + '; State: ' + state);
	// TODO: Handle state changes
	switch(id) {
		case 'mainVolume':
			sendRequest('MV' + state);
			adapter.log.info('Changed mainVolume to ' + state);
			break;
		case 'powerState':
			if(state === true) {
				sendRequest('PWON')
			} else {
				sendRequest('PWSTANDBY')
			} // endElseIf
			break;
		case 'volumeUp':
			sendRequest('MVUP');
			break;
		case 'volumeDown':
			sendRequest('MVDOWN');
			break;
		case 'muteIndicator':
			if(state === true) {
				sendRequest('MUON')
			} else {
				sendRequest('MUOFF')
			} // endElseIf
			break;
	} // endSwitch
     }); // endOnStateChange

    // all states changes inside the adapters namespace are subscribed
    adapter.subscribeStates('*');

    /**
     * Internals
    */
    function connect() {
        client.connect({port: 23, host: host}, function() {
                adapter.log.info("Adapter connecting to DENON-AVR: " + host + ":" + "23");
        });
    } // endConnect

    function updateStates() {
    	var updateCommands = ['NSET1 ?','NSFRN ?','ZM?','MU?','PW?','SI?','SV?','MS?','MV?','Z2?','Z2MU?','Z3?','Z3MU?','NSE','VSSC ?','VSASP ?','VSMONI ?','TR?','DIM ?'];
   	var i;
	for(i = 0; i < updateCommands.length; i++) {
		sendRequest(updateCommands[i]);
		adapter.log.debug('Update State for ' + updateCommands[i]);
	} // endFor
    } // endUpdateStates

    function sendRequest(req) {
	client.write(req + '\r');
	adapter.log.debug('Message sent: ' + req);
    } // endSendRequest

    function handleResponse(data) {
	// get command out of String
	var command = data.toString().replace(/\s+|\d+/g,'');
	adapter.log.debug('Command to handle is ' + command);
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
		case 'MUON':
			adapter.setState('muteIndicator', true, true);
			break;
		case 'MUOFF':
			adapter.setState('muteIndicator', false, true);
			break;
		case 'MSSTEREO':
			adapter.setState('surroundMode', 0, true);
			break;
		case 'MSVIRTUAL':
			adapter.setState('surroundMode', 1, true);
			break;
		case 'MSVIDEOGAME':
			adapter.setState('surroundMode', 2, true);
			break;
		case 'MSMCHSTEREO':
			adapter.setState('surroundMode', 3, true);
			break;
		case 'MSNEURAL:X':
			adapter.setState('surroundMode', 4, true);
			break;
		case 'MSDOLBYSURROUND':
			adapter.setState('surroundMode', 5, true);
			break;
	} // endSwitch
    } // endHandleResponse

    // examples for the checkPassword/checkGroup functions
    adapter.checkPassword('admin', 'iobroker', function (res) {
        console.log('check user admin pw ioboker: ' + res);
    });

    adapter.checkGroup('admin', 'admin', function (res) {
        console.log('check group user admin group admin: ' + res);
    });

} // endMain
