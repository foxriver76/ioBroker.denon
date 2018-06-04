 /**
 * DENON AVR adapter
 */

/* jshint -W097 */// jshint strict:false
/*jslint node: true */
'use strict';

// you have to require the utils module and call adapter function
var utils = require(__dirname + '/lib/utils'); // Get common adapter utils
var net = require('net'); // import net

// adapter will be restarted automatically every time as the configuration changed, e.g system.adapter.denon.0
var adapter = new utils.Adapter('denon');

// is called when adapter shuts down - callback has to be called under any circumstances!
adapter.on('unload', function (callback) {
    try {
        adapter.log.info('Stopping Denon AVR adapter...');
	adapter.setState('info.connection', false, true);
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
    adapter.log.debug('objectChange ' + id + ' ' + JSON.stringify(obj));
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

    // Constants & Variables
    var client = new net.Socket();
    const host = adapter.config.ip;
    var zoneTwo = false;
    var zoneThree = false;
    var pollingVar = null;

    // Connect
    connect(); // Connect on start
    
    client.on('timeout', function() {
    	pollingVar = false;
    	adapter.log.error('AVR timed out');
    	adapter.setState('info.connection', false, true);
        client.destroy();
        client.unref();
        adapter.log.info('Connection closed!');
        setTimeout(function() {
                connect(); // Connect again in 20 seconds
        }, 20000);
    });

    // Connection handling
    client.on('error', function(error) {
    	pollingVar = false;
    	adapter.setState('info.connection', false, true);
        adapter.log.error(error);
        client.destroy();
        client.unref();
        adapter.log.info('Connection closed!');
        setTimeout(function() {
                connect(); // Connect again in 20 seconds
        }, 20000);
    });

    client.on('end', function () { // Denon has closed the connection
        adapter.log.warn('Denon AVR has cancelled the connection');
        pollingVar = false;
        adapter.setState('info.connection', false, true);
        client.destroy();
        client.unref();
        adapter.log.info('Connection closed!');
        setTimeout(function() {
        	connect(); // Connect again in 20 seconds
        }, 20000);
    });

    client.on('connect', function () { // Successfull connected
        adapter.setState('info.connection', true, true);
        adapter.log.debug("Connected --> updating states on start");
        updateStates(); // Update states when connected
    });

    client.on('data', function (data) {
    	// split data by <cr>
    	var dataArr = data.toString().split(/[\r\n]+/); // Split by Carriage Return
    	var i;
    	for(i=0; i < dataArr.length; i++) {
    		if(dataArr[i] != "") {
    			handleResponse(dataArr[i]);
        		adapter.log.debug('Incoming data: ' + dataArr[i]);
    		} // endIf
    	} // endFor
    });

     // Handle state changes
     adapter.on('stateChange', function (id, state) {
    	if (!id || !state || state.ack) { // Ignore acknowledged state changes or error states
        	return;
    	} // endIf
	var j;
	var fullId = id;
	for(j = 2; j < fullId.split('.').length; j++) { // remove instance name and id
		if(j == 2) id = fullId.split('.')[j];
		if(j > 2) id = id + '.' + fullId.split('.')[j];
	} // endFor
	state = state.val; // only get state value
	adapter.log.debug('State Change - ID: ' + id + '; State: ' + state);
	if(id.startsWith("quickSelect")) {
		var quickNr = id.slice(id.length-1, id.length);
		id = "quickSelect";
	} else if (id.startsWith('zone2.quickSelect')) {
		var quickNr = id.slice(id.length-1, id.length);
        id = "zone2.quickSelect";
	} // endElseIf
	switch(id) {
		case 'mainVolume':
			var leadingZero;
			if (state < 0) state = 0;
			if (state < 10) {
				leadingZero = "0";
			} else leadingZero = "";
			state = state.toString().replace('.', '') // remove points
			sendRequest('MV' + leadingZero + state);
			adapter.log.debug('Changed mainVolume to ' + state);
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
		case 'zone2.powerState':
			if(state === true) {
				sendRequest('Z2ON');
			} else {
				sendRequest('Z2OFF');
			} // endElseIf
			break;
		case 'zone2.muteIndicator':
			if(state === true) {
				sendRequest('Z2MUON')
			} else {
				sendRequest('Z2MUOFF');
			} // endElseIf
			break;
		case 'zone2.volumeUp':
			sendRequest('Z2UP');
			break;
		case 'zone2.volumeDown':
			sendRequest('Z2DOWN');
			break;
		case 'zone2.volume':
			var leadingZero;
                        if (state < 0) state = 0;
                        if (state < 10) {
                                leadingZero = "0";
                        } else leadingZero = "";
                        state = state.toString().replace('.', '') // remove points
			sendRequest('Z2' + leadingZero + state);
			break;
                case 'zone2.selectInput':
                        adapter.getObject('zone2.selectInput', function(err, obj) {
                                sendRequest('Z2' + stateTextToArray(obj.common.states)[state].toUpperCase());
                        });
                        break;
		case 'quickSelect':
			sendRequest('MSQUICK' + quickNr);
			break;
		case 'zone2.quickSelect':
			sendRequest('Z2QUICK' + quickNr);
			break;
	} // endSwitch
     }); // endOnStateChange

    // all states changes inside the adapters namespace are subscribed
    adapter.subscribeStates('*');

    /**
     * Internals
    */
    function connect() {
        client.setEncoding('utf8');
        client.setTimeout(35000);
        adapter.log.info("Trying to connect to " + host + ":23");
        client.connect({port: 23, host: host}, function() {
                adapter.log.info("Adapter connected to DENON-AVR: " + host + ":23");
        });
    } // endConnect

    function updateStates() {
    	var updateCommands = ['NSET1 ?','NSFRN ?','ZM?','MU?','PW?','SI?','SV?','MS?','MV?','Z2?','Z2MU?','Z3?','Z3MU?','NSE','VSSC ?','VSASP ?','VSMONI ?','TR?','DIM ?'];
    	var i = 0;
    	var intervalVar = setInterval(function() {
			sendRequest(updateCommands[i]);
			i++;
			if(i == updateCommands.length) clearInterval(intervalVar);
		}, 100);
    } // endUpdateStates
    
    function pollStates() { // Polls states
    	var updateCommands = ['NSE']; // Request Display State
    	var i = 0;
    	var intervalVar = setInterval(function() {
    		if(pollingVar) {
    			sendRequest(updateCommands[i]);
    			i++;
    			if(i == updateCommands.length) {
    				clearInterval(intervalVar);
    				pollingVar = false;
    			} // endIf
    		} // endIf
    	}, 100);
    } // endPollingStates

    function sendRequest(req) {
	client.write(req + '\r');
	adapter.log.debug('Message sent: ' + req);
    } // endSendRequest

    function handleResponse(data) {
	// get command out of String
	var command;
	if(data.startsWith("Z2")) { // Transformation for Zone2 commands
		// Handle Zone2 states
		command = data.replace(/\s+|\d+/g,'');
		if(command == 'Z') { // if everything is removed except Z --> Volume
			command = "Z2VOL";
			var vol = data.slice(2, data.toString().length).replace(/\s|[A-Z]/g, '');
			vol = vol.slice(0, 2) + '.' + vol.slice(2, 4); // Slice volume from string
		} else {
			command = "Z2" + command.slice(1, command.length);
		} // endElseIf
		if(command.startsWith("Z2")) { // Encode Input Source
			adapter.getObject('selectInput', function(err, obj) {
				var j;
				var zTwoSi = data.slice(2, data.length);
				zTwoSi = zTwoSi.replace(' ', ''); // Remove blanks
				for(j = 0; j < 21; j++) { // Check if command contains one of the possible Select Inputs
                      			if(stateTextToArray(obj.common.states)[j] == zTwoSi) adapter.setState('zone2.selectInput', zTwoSi, true);
				} // endFor
			});
		} // endIf
	} else if(data.startsWith("Z3")) { // Transformation for Zone3 commands
                command = data.replace(/\s+|\d+/g,'');
                command = "Z3" + command.slice(1, command.length);
 	} else { // Transformations for normal commands
		command = data.replace(/\s+|\d+/g,'');
	} // endElseIf
	if(command.startsWith("SI")) {
		var siCommand = data.slice(2, data.length); // Get only source name
		siCommand = siCommand.replace(' ', ''); // Remove blanks
		adapter.log.debug("SI-Command: " + siCommand);
		command = "SI";
	} // endIf
	if(command.startsWith("MS")) {
		var msCommand = command.slice(2, command.length);
		command = "MS";
	} // endIf
	if(command.startsWith("NSE")) { // Handle display content
		var displayCont = data.slice(4, data.length).replace(/[\0\1\2]/, ''); // Remove STX, SOH, NULL 
		var dispContNr = data.slice(3, 4); 
		adapter.setState('display.displayContent' + dispContNr, displayCont, true);
		if(!pollingVar) {
			pollingVar = true;
			setTimeout(function() {
				pollStates(); // Poll states about every 10 seconds
			}, 10500);
		} // endIf
	} // endIf
	if(command.startsWith("NSFRN")) { // Handle friendly name
		adapter.setState('info.friendlyName', data.slice(6, data.length), true);
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
		case 'Z2ON':
			if(!zoneTwo) createZoneTwo();
			adapter.setState('zone2.powerState', true, true);
			break;
		case 'Z2OFF':
			if(!zoneTwo) createZoneTwo();
			adapter.setState('zone2.powerState', false, true);
			break;
		case 'Z2MUON':
			if(!zoneTwo) createZoneTwo();
			adapter.setState('zone2.muteIndicator', true, true);
			break;
		case 'Z2MUOFF':
			if(!zoneTwo) createZoneTwo();
			adapter.setState('zone2.muteIndicator', false, true);
			break;
		case 'Z2VOL':
			if(!zoneTwo) createZoneTwo();
			adapter.setState('zone2.volume', parseFloat(vol), true);
			break;
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

   function createZoneTwo() {
	adapter.setObjectNotExists('zone2', {
            type: "channel",
            common: {
                name: "Zone2"
            },
            native: {}
        });

	adapter.setObjectNotExists('zone2.powerState', {
        	type: 'state',
        	common: {
                	name: 'zon2.powerState',
                	role: 'Zone2 Power State',
                	type: 'boolean',
                	write: true,
                	read: true
        	},
        	native: {}
    	});

    	adapter.setObjectNotExists('zone2.volume', {
        	type: 'state',
        	common: {
                	name: 'zone2.volume',
                	role: 'Volume',
                	type: 'number',
                	read: true,
                	write: true,
                	min: 0,
                	max: 100
        	},
        	native: {}
    	});

    	adapter.setObjectNotExists('zone2.volumeUp', {
        	type: 'state',
        	common: {
                	name: 'zone2.volumeUp',
                	role: 'button',
                	type: 'number',
                	write: true,
                	read: true
        	},
        	native: {}
    	});

    	adapter.setObjectNotExists('zone2.volumeDown', {
        	type: 'state',
        	common: {
                	name: 'zone2.volumeDown',
                	role: 'button',
                	type: 'number',
                	write: true,
                	read: true
        	},
        	native: {}
    	});

	adapter.setObjectNotExists('zone2.selectInput', {
        	type: 'state',
        	common: {
                	name: 'zone2.selectInput',
                	role: 'Select Input',
                	type: 'number',
                	write: true,
                	read: true,
                	states: '0:PHONO;1:CD;2:TUNER;3:DVD;4:BD;5:TV;6:SAT/CBL;7:MPLAY;8:GAME;9:NET;10:SPOTIFY;11:LASTFM;12:IRADIO;13:SERVER;14:FAVORITES;15:AUX1;16:AUX2;17:AUX3;18:AUX4;19:AUX5;20:AUX6;21:AUX7'
        	},
        	native: {}
    	});

	adapter.setObjectNotExists('zone2.muteIndicator', {
        	type: 'state',
        	common: {
                	name: 'zone2.muteIndicator',
                	role: 'Mute Indicator',
                	type: 'boolean',
                	write: true,
                	read: true
        	},
        	native: {}
    	});

        adapter.setObjectNotExists('zone2.quickSelect1', {
                type: 'state',
                common: {
                        name: 'zone2.quickSelect1',
                        role: 'button',
                        type: 'number',
                        write: true,
                        read: true
                },
                native: {}
        });

	adapter.setObjectNotExists('zone2.quickSelect2', {
        	type: 'state',
        	common: {
                	name: 'zone2.quickSelect2',
                	role: 'button',
                	type: 'number',
                	write: true,
                	read: true
        	},
        	native: {}
    	});

    	adapter.setObjectNotExists('zone2.quickSelect3', {
        	type: 'state',
        	common: {
                	name: 'zone2.quickSelect3',
                	role: 'button',
                	type: 'number',
                	write: true,
                	read: true
        	},
        	native: {}
    	});

    adapter.setObjectNotExists('zone2.quickSelect4', {
        type: 'state',
        common: {
                name: 'zone2.quickSelect4',
                role: 'button',
                type: 'number',
                write: true,
                read: true
        },
        native: {}
    });

    adapter.setObjectNotExists('zone2.quickSelect5', {
        type: 'state',
        common: {
                name: 'zone2.quickSelect5',
                role: 'button',
                type: 'number',
                write: true,
                read: true
        },
        native: {}
    });

	zoneTwo = true;
	adapter.log.debug('Zone 2 detected');
   } // endCreateZoneTwo

} // endMain
