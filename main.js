/**
 * DENON AVR adapter
 */

/* jshint -W097 */// jshint strict:false
/*jslint node: true */
'use strict';

// you have to require the utils module and call adapter function
var utils =    require(__dirname + '/lib/utils'); // Get common adapter utils
var net = require('net'); // import net

// adapter will be restarted automatically every time as the configuration changed, e.g system.adapter.denon.0
var adapter = new utils.Adapter('denon');

// is called when adapter shuts down - callback has to be called under any circumstances!
adapter.on('unload', function (callback) {
    try {
        adapter.log.info('Stopping Denon AVR adapter...');
	adapter.setState('connected', false, true);
	client.destroy(); // kill connection
        client.unref();	// kill connection
        callback();
    } catch (e) {
        callback();
    } // endTryCatch
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
    } // endIf
});

// Some message was sent to adapter instance over message box. Used by email, pushover, text2speech, ...
adapter.on('message', function (obj) {
    if (typeof obj === 'object' && obj.message) {
        if (obj.command === 'send') {
            // e.g. send email or pushover or whatever
            console.log('send command');

            // Send response in callback if required
            if (obj.callback) adapter.sendTo(obj.from, obj.command, 'Message received', obj.callback);
        } // endIf
    } // endIf
});

// is called when databases are connected and adapter received configuration.
// start here!
adapter.on('ready', function () {
    if(adapter.config.ip) {
    	adapter.log.info('Starting DENON AVR adapter');
    	main();
    } else adapter.log.warn('No IP-address set');
});

function main() {
    // Creating states
    adapter.setObject('info.connection', {
        type: 'state',
        common: {
                name: 'connection',
                role: 'Conection',
                type: 'boolean',
                write: false,
                read: true
        },
        native: {}
    });

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

    adapter.setObject('playPauseButton', {
        type: 'state',
        common: {
                name: 'playPauseButton',
                role: 'button',
                type: 'number',
                write: true,
                read: true
        },
        native: {}
    });

    adapter.setObject('skipPlus', {
        type: 'state',
        common: {
                name: 'skipPlus',
                role: 'button',
                type: 'number',
                write: true,
                read: true
        },
        native: {}
    });

    adapter.setObject('skipMinus', {
        type: 'state',
        common: {
                name: 'skipMinus',
                role: 'button',
                type: 'number',
                write: true,
                read: true
        },
        native: {}
    });

    adapter.setObject('selectInput', {
        type: 'state',
        common: {
                name: 'selectInput',
                role: 'Select Input',
                type: 'number',
                write: true,
                read: true,
		states: '0:PHONO;1:CD;2:TUNER;3:DVD;4:BD;5:TV;6:SAT/CBL;7:MPLAY;8:GAME;9:NET;10:SPOTIFY;11:LASTFM;12:IRADIO;13:SERVER;14:FAVOTITES;15:AUX1;16:AUX2;17:AUX3;18:AUX4;19:AUX5;20:AUX6;21:AUX7'
        },
        native: {}
    });

    adapter.setObject('maximumVolume', {
        type: 'state',
        common: {
                name: 'maximumVolume',
                role: 'Maximum Volume',
                type: 'number',
                write: false,
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
		states: '0:STEREO;1:VIRTUAL;2:VIDEO GAME;3:MCH STEREO;4:DTS SURROUND;5:DOLBY DIGITAL;6:MOVIE;7:MUSIC;8:DIRECT;9:PURE DIRECT;10:AUTO;11:GAME;12:AURO3D;13:AURO2DSURR;14:WIDE SCREEN;15:SUPER STADIUM;16:ROCK ARENA;17:JAZZ CLUB;18:CLASSIC CONCERT;19:MONO MOVIE;20:MATRIX'
        },
        native: {}
    });

    // Constants & Variables
    var client = new net.Socket();
    const host = adapter.config.ip;

    // Connect
    connect(); // Connect on start

    // Connection handling
    client.on('error', function(error) {
	adapter.setState('info.connection', false, true);
        adapter.log.error(error);
        client.destroy();
        client.unref();
        adapter.log.info('Connection closed!');
        setTimeout(function() {
                connect(); // Connect again
        }, 10000);
    });

    client.on('end', function () { // Denon has closed the connection
        adapter.log.warn('Denon AVR has cancelled the connection');
	adapter.setState('info.connection', false, true);
        client.destroy();
        client.unref();
        adapter.log.info('Connection closed!');
	setTimeout(function() {
		connect(); // Connect again
	}, 10000);
    });

    client.on('connect', function () { // Successfull connected
        adapter.setState('info.connection', true, true);
	adapter.log.debug("Connected --> updating states on start");
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
			var leadingZero;
			if (state < 10) {
				leadingZero = "0";
			} else leadingZero = "";
			state = state.toString().replace('.', '') // remove points
			sendRequest('MV' + leadingZero + state);
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
		case 'playPauseButton':
			sendRequest('NS94');
			break;
		case 'skipMinus':
			sendRequest('NS9E');
			break;
		case 'skipPlus':
			sendRequest('NS9D');
			break;
		// Current Source
		case 'selectInput':
			adapter.getObject('selectInput', function(err, obj) {
				sendRequest('SI' + stateTextToArray(obj.common.states)[state].toUpperCase());
			});
			break;
		case 'surroundMode':
			adapter.getObject('surroundMode', function(err, obj) {
				adapter.log.debug('state: ' + state + ' & states: ' + obj.common.states);
				sendRequest('MS' + stateTextToArray(obj.common.states)[state].toUpperCase());
			});
			break;
	} // endSwitch
     }); // endOnStateChange

    // all states changes inside the adapters namespace are subscribed
    adapter.subscribeStates('*');

    /**
     * Internals
    */
    function connect() {
	adapter.log.info("Trying to connect to " + host + ":23");
        client.connect({port: 23, host: host}, function() {
                adapter.log.info("Adapter connected to DENON-AVR: " + host + ":23");
        });
    } // endConnect

    function updateStates() {
    	var updateCommands = ['NSET1 ?','NSFRN ?','ZM?','MU?','PW?','SI?','SV?','MS?','MV?','Z2?','Z2MU?','Z3?','Z3MU?','NSE','VSSC ?','VSASP ?','VSMONI ?','TR?','DIM ?'];
   	var i;
	for(i = 0; i < updateCommands.length; i++) {
		sendRequest(updateCommands[i]);
		adapter.log.debug('Update state for ' + updateCommands[i]);
	} // endFor
    } // endUpdateStates

    function sendRequest(req) {
	client.write(req + '\r');
	adapter.log.debug('Message sent: ' + req);
    } // endSendRequest

    function handleResponse(data) {
	// get command out of String
	var command = data.toString().replace(/\s+|\d+/g,'');
	if(command.startsWith("SI")) {
		var siCommand = command.slice(2, command.length);
		command = "SI";
	} // endIf
	if(command.startsWith("MS")) {
		var msCommand = command.slice(2, command.length);
		command = "MS";
	} // endIf
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
			data = data.slice(6, 8) + '.' + data.slice(8, 9);
			adapter.setState('maximumVolume', parseFloat(data), true);
			break;
		case 'MUON':
			adapter.setState('muteIndicator', true, true);
			break;
		case 'MUOFF':
			adapter.setState('muteIndicator', false, true);
			break;
		case 'SI':
			adapter.setState('selectInput', siCommand, true);
			break;
		case 'MS':
			adapter.setState('surroundMode', msCommand, true);
			break;
		// Surround modes


	} // endSwitch
    } // endHandleResponse

    function stateTextToArray(stateNames) { // encoding for e. g. selectInput 
  	var stateName = stateNames.split(';');
   	var stateArray=[];
    	for(var i = 0; i < stateName.length; i++) {
       		var element = stateName[i].split(':');
            	stateArray[element[0]] = element[1];
        } // endFor
	return stateArray;
    } // endStateTextToArray

    // examples for the checkPassword/checkGroup functions
    adapter.checkPassword('admin', 'iobroker', function (res) {
        console.log('check user admin pw ioboker: ' + res);
    });

    adapter.checkGroup('admin', 'admin', function (res) {
        console.log('check group user admin group admin: ' + res);
    });

} // endMain
