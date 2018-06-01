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
    adapter.log.info('Starting DENON AVR adapter');
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

    adapter.setObject('currentSource', {
        type: 'state',
        common: {
                name: 'currentSource',
                role: 'Current Source',
                type: 'number',
                write: true,
                read: true,
		states: '0:DVD;1:BD;2:TV;3:SAT/CBL;4:MPLAY;5:GAME;6:AUX1;7:AUX2;8:CD;9:PHONO;10:TUNER;11:SPOTIFY'
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
		states: '0:STEREO;1:VIRTUAL;2:VIDEO GAME;3:MCH STEREO;4:DTS SURROUND;5:DOLBY SURROUND;6:MOVIE;7:MUSIC;8:DIRECT;9:PURE DIRECT;10:AUTO;11:GAME;12:AURO3D;13:AURO2DSURR;14:WIDE SCREEN;15:SUPER STADIUM;16:ROCK ARENA;17:JAZZ CLUB;18:CLASSIC CONCERT;19:MONO MOVIE;20:MATRIX'
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
        client.destroy();
        client.unref();
        adapter.log.info('Connection closed!');
	setTimeout(function() {
		connect(); // Connect again
	}, 10000);
    });

    client.on('connect', function () { // Successfull connected
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
		case 'surroundMode':
			switch(state) {
				case 0:
					sendRequest('MSSTEREO');
					break;
				case 1:
					sendRequest('MSVIRTUAL');
					break;
				case 2:
					sendRequest('MSVIDEO GAME');
					break;
				case 3:
					sendRequest('MSMCH STEREO');
					break;
				case 4:
					sendRequest('MSDTS SURROUND');
					break;
				case 5:
					sendRequest('MSDOLBY DIGITAL');
					break;
				case 6:
					sendRequest('MSMOVIE');
					break;
				case 7:
					sendRequest('MSMUSIC');
					break;
				case 8:
					sendRequest('MSDIRECT');
					break;
				case 9:
					sendRequest('MSPURE DIRECT');
					break;
				case 10:
					sendRequest('MSAUTO')
					break;
				case 11:
					sendRequest('MSGAME')
					break;
				case 12:
					sendRequest('MSAURO3D')
					break;
				case 13:
					sendRequest('MSAURO2DSURR')
					break;
				case 14:
					sendRequest('MSWIDE SCREEN');
					break;
				case 15:
					sendRequest('MSSUPER STADIUM');
					break;
				case 16:
					sendRequest('MSROCK ARENA');
					break;
				case 17:
					sendRequest('MSJAZZ CLUB');
					break;
				case 18:
					sendRequest('MSCLASSIC CONCERT');
					break;
				case 19:
					sendRequest('MSMONO MOVIE');
					break;
				case 20:
					sendRequest('MSMATRIX')
					break;
			} // endSwitch
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
		case 'currentSource':
			switch(state) {
				case 0:
					sendRequest('SIDVD');
					break;
				case 1:
					sendRequest('SIBD');
					break;
			} // endSwitch
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
			data = data.slice(6, 8) + '.' + data.slice(8, 9);
			adapter.log.debug(data);
			adapter.setState('maximumVolume', parseFloat(data), true);
			break;
		case 'MUON':
			adapter.setState('muteIndicator', true, true);
			break;
		case 'MUOFF':
			adapter.setState('muteIndicator', false, true);
			break;
		// Surround modes
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
		case 'MSMOVIE':
			adapter.setState('surroundMode', 6, true);
			break;
		case 'MSMUSIC':
			adapter.SetState('surroundMode', 7, true);
			break;
		case 'MSDIRECT':
			adapter.setState('surroundMode', 8, true);
			break;
		case 'MSPURE DIRECT':
			adapter.setState('surroundMode', 9, true);
			break;
		case 'MSAUTO':
			adapter.setState('surroundMode', 10, true);
			break;
		case 'MSGAME':
			adapter.setState('surroundMode', 11, true);
			break;
		case 'MSAUROD':
                        adapter.setState('surroundMode', 12, true);
                        break;
		case 'MSAURODSURR':
                        adapter.setState('surroundMode', 13, true);
                        break;
		case 'MSWIDESCREEN':
                        adapter.setState('surroundMode', 14, true);
                        break;
		case 'MSSUPERSTADIUM':
                        adapter.setState('surroundMode', 15, true);
                        break;
		case 'MSROCKARENA':
                        adapter.setState('surroundMode', 16, true);
                        break;
		case 'MSJAZZCLUB':
                        adapter.setState('surroundMode', 17, true);
                        break;
		case 'MSCLASSICCONCERT':
                        adapter.setState('surroundMode', 18, true);
                        break;
		case 'MSMONOMOVIE':
                        adapter.setState('surroundMode', 19, true);
                        break;
		case 'MSMATRIX':
                        adapter.setState('surroundMode', 20, true);
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
