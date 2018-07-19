 /**
 * DENON AVR adapter
 */

/* jshint -W097 */// jshint strict:false
/*jslint node: true */
'use strict';

// you have to require the utils module and call adapter function
const utils = require(__dirname + '/lib/utils'); // Get common adapter utils
const net = require('net'); // import net

// adapter will be restarted automatically every time as the configuration changed, e.g system.adapter.denon.0
const adapter = new utils.Adapter('denon');

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
    const volumeInDB = adapter.config.volumeInDB
    var zoneTwo = false;
    var zoneThree = false;
    var pollingVar = null;
    
    checkVolumeDB(volumeInDB);
    
    // Connect
    connect(); // Connect on start
    
    client.on('timeout', function() {
    	pollingVar = false;
    	adapter.log.warn('AVR timed out due to no response');
    	adapter.setState('info.connection', false, true);
        client.destroy();
        client.unref();
        setTimeout(function() {
                connect(); // Connect again in 30 seconds
        }, 30000);
    });

    // Connection handling
    client.on('error', function(error) {
	if(error.code == 'ECONNREFUSED') adapter.log.warn('Connection refused, make sure that there is no other Telnet connection');
	else if (error.code == 'EHOSTUNREACH') adapter.log.warn('AVR unreachable, check the Network Config of your AVR');
	else if(error.code == 'EALREADY' || error.code == 'EISCONN') return adapter.log.warn('Adapter is already connecting/connected');
	else adapter.log.warn('Connection closed: ' + error);
    	pollingVar = false;
    	adapter.setState('info.connection', false, true);
        client.destroy();
        client.unref();
        setTimeout(function() {
                connect(); // Connect again in 30 seconds
        }, 30000);
    });

    client.on('end', function () { // Denon has closed the connection
        adapter.log.warn('Denon AVR has cancelled the connection');
        pollingVar = false;
        adapter.setState('info.connection', false, true);
        client.destroy();
        client.unref();
        setTimeout(function() {
        	connect(); // Connect again in 30 seconds
        }, 30000);
    });

    client.on('connect', function () { // Successfull connected
        adapter.setState('info.connection', true, true);
        adapter.log.info("Adapter connected to DENON-AVR: " + host + ":23");
        adapter.log.debug("Connected --> updating states on start");
        updateStates(); // Update states when connected
    });

    client.on('data', function (data) {
    	// split data by <cr>
    	var dataArr = data.toString().split(/[\r\n]+/); // Split by Carriage Return
    	for(var i=0; i < dataArr.length; i++) {
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
	var fullId = id;
	for(var j = 2; j < fullId.split('.').length; j++) { // remove instance name and id
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
	} else if (id.startsWith('zone3.quickSelect')) {
		var quickNr = id.slice(id.length-1, id.length);
	        id = "zone3.quickSelect";
	} // endElseIf
	
	switch(id) {
		case 'mainVolume':
			var leadingZero;
			if (state < 0) state = 0;
			if((state % 0.5) != 0) state = Math.round(state * 2) / 2;
			if (state < 10) {
				leadingZero = "0";
			} else leadingZero = "";
			state = state.toString().replace('.', '') // remove points
			sendRequest('MV' + leadingZero + state);
			adapter.log.debug('Changed mainVolume to ' + state);
			break;
		case 'mainVolumeDB':
		    	state += 80; // convert to Vol
			var leadingZero;
			if (state < 0) state = 0;
			if((state % 0.5) != 0) state = Math.round(state * 2) / 2;
			if (state < 10) {
				leadingZero = "0";
			} else leadingZero = "";
			state = state.toString().replace('.', '') // remove points
			sendRequest('MV' + leadingZero + state);
			adapter.log.debug('Changed mainVolume to ' + state);
			break;
		case 'powerSystem':
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
				sendRequest('SI' + decodeState(obj.common.states, state).toUpperCase());
			});
			break;
		case 'surroundMode':
			adapter.getObject('surroundMode', function(err, obj) {
				sendRequest('MS' + decodeState(obj.common.states, state).toUpperCase());
			});
			break;
		case 'zone2.powerZone':
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
                        if((state % 0.5) != 0) state = Math.round(state * 2) / 2;
                        if (state < 10) {
                                leadingZero = "0";
                        } else leadingZero = "";
                        state = state.toString().replace('.', '') // remove points
			sendRequest('Z2' + leadingZero + state);
			break;
		case 'zone2.volumeDB':
		    	state += 80; // Convert to Vol
			var leadingZero;
                        if (state < 0) state = 0;
                        if((state % 0.5) != 0) state = Math.round(state * 2) / 2;
                        if (state < 10) {
                                leadingZero = "0";
                        } else leadingZero = "";
                        state = state.toString().replace('.', '') // remove points
    			sendRequest('Z2' + leadingZero + state);
    			break;
                case 'zone2.selectInput':
                        adapter.getObject('zone2.selectInput', function(err, obj) {
                                sendRequest('Z2' + decodeState(obj.common.states, state).toUpperCase());
                        });
                        break;
		case 'quickSelect':
			sendRequest('MSQUICK' + quickNr);
			break;
		case 'zone2.quickSelect':
			sendRequest('Z2QUICK' + quickNr);
			break;
		case 'zone3.powerZone':
			if(state === true) {
				sendRequest('Z3ON');
			} else {
				sendRequest('Z3OFF');
			} // endElseIf
			break;
		case 'zone3.muteIndicator':
			if(state === true) {
				sendRequest('Z3MUON')
			} else {
				sendRequest('Z3MUOFF');
			} // endElseIf
			break;
		case 'zone3.volumeUp':
			sendRequest('Z3UP');
			break;
		case 'zone3.volumeDown':
			sendRequest('Z3DOWN');
			break;
		case 'zone3.volume':
		    var leadingZero;
                    if (state < 0) state = 0;
                    if((state % 0.5) != 0) state = Math.round(state * 2) / 2;
                    if (state < 10) {
                            leadingZero = "0";
                    } else leadingZero = "";
                    state = state.toString().replace('.', '') // remove points
			sendRequest('Z3' + leadingZero + state);
			break;
		case 'zone3.volumeDB':
		    state += 80; // Convert to Vol
		    var leadingZero;
                    if (state < 0) state = 0;
                    if((state % 0.5) != 0) state = Math.round(state * 2) / 2;
                    if (state < 10) {
                            leadingZero = "0";
                    } else leadingZero = "";
                    state = state.toString().replace('.', '') // remove points
			sendRequest('Z3' + leadingZero + state);
			break;
		case 'zone3.selectInput':
                    adapter.getObject('zone3.selectInput', function(err, obj) {
                            sendRequest('Z3' + decodeState(obj.common.states, state).toUpperCase());
                    });
                    break;
		case 'zone3.quickSelect':
		    sendRequest('Z3QUICK' + quickNr);
		    break;
		case 'display.brightness':
		    adapter.getObject('display.brightness', function(err, obj) {
			sendRequest('DIM ' + decodeState(obj.common.states, state).toUpperCase().slice(0, 3));
		    });
		    break;
		case 'powerMainZone':
		    if(state === true) {
			sendRequest('ZMON');
		    } else sendRequest('ZMOFF');
		    break;
		case 'expertCommand': // Sending custom commands
		    var expertState = state;
		    sendRequest(state);
		    adapter.getState('info.connection', function(err, state) {
			if(state.val === true) adapter.setState('expertCommand', expertState, true);
		    });
		    break;
		case 'sleepTimer':
		    if(state == 0) {
			sendRequest('SLPOFF');
		    } else if(state < 10) {
			sendRequest('SLP' + '00' + state);
		    } else if(state < 100) {
			sendRequest('SLP' + '0' + state);
		    } else if(state <= 120) {
			sendRequest('SLP' + state);
		    } // endElseIf
		    break;
		case 'zone2.sleepTimer':
		    if(state == 0) {
			sendRequest('Z2SLPOFF');
		    } else if(state < 10) {
			sendRequest('Z2SLP' + '00' + state);
		    } else if(state < 100) {
			sendRequest('Z2SLP' + '0' + state);
		    } else if(state <= 120) {
			sendRequest('Z2SLP' + state);
		    } // endElseIf
		    break;
		case 'zone3.sleepTimer':
		    if(state == 0) {
			sendRequest('Z3SLPOFF');
		    } else if(state < 10) {
			sendRequest('Z3SLP' + '00' + state);
		    } else if(state < 100) {
			sendRequest('Z3SLP' + '0' + state);
		    } else if(state <= 120) {
			sendRequest('Z3SLP' + state);
		    } // endElseIf
		    break;
		case 'parameterSettings.dynamicEq':
		    if(state) {
			sendRequest('PSDYNEQ ON');
		    } else sendRequest('PSDYNEQ OFF');
		    break;
		case 'parameterSettings.subwooferLevel':
		    state = dbToAscii(state);
		    sendRequest('PSSWL ' + state);
		    break;
		case 'parameterSettings.subwooferLevelDown':
		    sendRequest('PSSWL DOWN');
		    break;
		case 'parameterSettings.subwooferLevelUp':
		    sendRequest('PSSWL UP');
		    break;
		case 'parameterSettings.subwooferLevelState':
		    if(state) {
			sendRequest('PSSWL ON');
		    } else sendRequest('PSSWL OFF');
		    break;
		case 'parameterSettings.subwooferTwoLevel':
		    state = dbToAscii(state);
		    sendRequest('PSSWL2 ' + state);
		    break;
		case 'parameterSettings.subwooferTwoLevelDown':
		    sendRequest('PSSWL2 DOWN');
		    break;
		case 'parameterSettings.subwooferTwoLevelUp':
		    sendRequest('PSSWL2 UP');
		    break;
		case 'parameterSettings.audysseyLfc':
		    if(state) {
			sendRequest('PSLFC ON');
		    } else sendRequest('PSLFC OFF');
		    break;
		case 'parameterSettings.containmentAmountDown':
		    sendRequest('PSCNTAMT DOWN');
		    break;
		case 'parameterSettings.containmentAmountUp':
		    sendRequest('PSCNTAMT UP');
		    break;
		case 'parameterSettings.containmentAmount':
		    sendRequest('PSCNTAMT 0' + state);
		    break;
		case 'parameterSettings.multEq':
		    adapter.getObject('parameterSettings.multEq', function(err, obj) {
			sendRequest('PSMULTEQ:' + decodeState(obj.common.states, state).toUpperCase());
		    });
		    break;
		case 'parameterSettings.dynamicVolume':
		    adapter.getObject('parameterSettings.dynamicVolume', function(err, obj) {
			sendRequest('PSDYNVOL ' + decodeState(obj.common.states, state).toUpperCase());
		    });
		    break;
		case 'parameterSettings.referenceLevelOffset':
		    sendRequest('PSREFLEV ' + state);
		    break;
		case 'parameterSettings.bassUp':
		    sendRequest('PSBAS UP');
		    break;
		case 'parameterSettings.bassDown':
		    sendRequest('PSBAS DOWN');
		    break;
		case 'parameterSettings.trebleUp':
		    sendRequest('PSTRE UP');
		    break;
		case 'parameterSettings.trebleDown':
		    sendRequest('PSTRE DOWN');
		    break;
		case 'parameterSettings.bass':
		    state = dbToAscii(state);
		    sendRequest('PSBAS ' + state);
		    break;
		case 'parameterSettings.treble':
		    state = dbToAscii(state);
		    sendRequest('PSTRE ' + state);
		    break;
		case 'zone2.parameterSettings.bass':
		    state = dbToAscii(state);
		    sendRequest('Z2PSBAS ' + state);
		    break;
		case 'zone2.parameterSettings.treble':
		    state = dbToAscii(state);
		    sendRequest('Z2PSTRE ' + state);
		    break;
		case 'zone3.parameterSettings.bass':
		    state = dbToAscii(state);
		    sendRequest('Z3PSBAS ' + state);
		    break;
		case 'zone3.parameterSettings.treble':
		    state = dbToAscii(state);
		    sendRequest('Z3PSTRE ' + state);
		    break;
		case 'zone2.parameterSettings.bassUp':
		    sendRequest('Z2PSBAS UP');
		    break;
		case 'zone2.parameterSettings.bassDown':
		    sendRequest('Z2PSBAS DOWN');
		    break;
		case 'zone2.parameterSettings.trebleUp':
		    sendRequest('Z2PSTRE UP');
		    break;
		case 'zone2.parameterSettings.trebleDown':
		    sendRequest('Z2PSTRE DOWN');
		    break;
		case 'zone3.parameterSettings.bassUp':
		    sendRequest('Z3PSBAS UP');
		    break;
		case 'zone3.parameterSettings.bassDown':
		    sendRequest('Z3PSBAS DOWN');
		    break;
		case 'zone3.parameterSettings.trebleUp':
		    sendRequest('Z3PSTRE UP');
		    break;
		case 'zone3.parameterSettings.trebleDown':
		    sendRequest('Z3PSTRE DOWN');
		    break;
		case 'parameterSettings.toneControl':
		    if(state) {
			sendRequest('PSTONE CTRL ON');
		    } else sendRequest('PSTONE CTRL OFF');
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
        client.connect({port: 23, host: host});
    } // endConnect

    function updateStates() {
    	var updateCommands = ['NSET1 ?','NSFRN ?','ZM?',
    	    			'MU?','PW?','SI?','SV?',
    	    			'MS?','MV?','Z2?','Z2MU?',
    	    			'Z3?','Z3MU?','NSE',
    	    			'VSSC ?','VSASP ?',
    	    			'VSMONI ?','TR?','DIM ?', 
    	    			'Z3SLP?', 'Z2SLP?', 'SLP?', 
    	    			'PSDYNEQ ?', 'PSMULTEQ: ?',
    	    			'PSREFLEV ?', 'PSDYNVOL ?',
    	    			'PSLFC ?', 'PSCNTAMT ?',
    	    			'PSSWL ?', 'PSBAS ?',
    	    			'PSTRE ?', 'Z2PSTRE ?',
    	    			'Z3PSTRE ?', 'Z2PSBAS ?',
    	    			'Z3PSBAS ?', 'PSTONE CTRL ?'
    	    			];
    	var i = 0;
    	var intervalVar = setInterval(function() {
			sendRequest(updateCommands[i]);
			i++;
			if(i == updateCommands.length) clearInterval(intervalVar);
		}, 100);
    } // endUpdateStates
    
    function pollStates() { // Polls states
    	var updateCommands = ['NSE', 'SV?', 'SLP?', 'Z2SLP?', 'Z3SLP?']; // Request Display State & Keep HEOS alive
    	var i = 0;
	pollingVar = false;
    	var intervalVar = setInterval(function() {
    	    sendRequest(updateCommands[i]);
    	    i++;
    	    if(i == updateCommands.length) clearInterval(intervalVar);
    	}, 100);
    } // endPollingStates

    function sendRequest(req) {
	client.write(req + '\r');
	adapter.log.debug('Message sent: ' + req);
    } // endSendRequest

    function handleResponse(data) {
	if(!pollingVar) { // Keep connection alive & poll states
		pollingVar = true;
		setTimeout(function() {
			pollStates(); // Poll states every 8 seconds seconds
		}, 8000);
	} // endIf
	// get command out of String
	var command;
	if(data.startsWith("Z2")) { // Transformation for Zone2 commands
		if(!zoneTwo) createZoneTwo(); // Create Zone2 states if not done yet
		command = data.replace(/\s+|\d+/g,'');
		
		if(command == 'Z') { // If everything is removed except Z --> Volume
			var vol = data.slice(2, data.toString().length).replace(/\s|[A-Z]/g, '');
			vol = vol.slice(0, 2) + '.' + vol.slice(2, 4); // Slice volume from string
			adapter.setState('zone2.volume', parseFloat(vol), true);
		    	if(volumeInDB) adapter.setState('zone2.volumeDB', parseFloat(vol)-80, true);
			return;
		} else {
			command = "Z2" + command.slice(1, command.length);
		} // endElseIf
		if(command.startsWith("Z2")) { // Encode Input Source
			adapter.getObject('selectInput', function(err, obj) {
				var zTwoSi = data.slice(2, data.length);
				zTwoSi = zTwoSi.replace(' ', ''); // Remove blanks
				for(var j = 0; j < 21; j++) { // Check if command contains one of the possible Select Inputs
                      			if(decodeState(obj.common.states, j) == zTwoSi) {
                      			    adapter.setState('zone2.selectInput', zTwoSi, true);
                      			    return;
                      			} // endIf
				} // endFor
			});
		} // endIf
	} else if(data.startsWith("Z3")) { // Transformation for Zone3 commands
		if(!zoneThree) createZoneThree(); // Create Zone 3 states if not done yet
		command = data.replace(/\s+|\d+/g,'');
		if(command == 'Z') { // if everything is removed except Z --> Volume
			var vol = data.slice(2, data.toString().length).replace(/\s|[A-Z]/g, '');
			vol = vol.slice(0, 2) + '.' + vol.slice(2, 4); // Slice volume from string
			adapter.setState('zone3.volume', parseFloat(vol), true);
		    	if(volumeInDB) adapter.setState('zone3.volumeDB', parseFloat(vol)-80, true);
			return;
		} else {
			command = "Z3" + command.slice(1, command.length);
		} // endElseIf
		if(command.startsWith("Z3")) { // Encode Input Source
			adapter.getObject('selectInput', function(err, obj) {
				var zThreeSi = data.slice(2, data.length);
				zThreeSi = zThreeSi.replace(' ', ''); // Remove blanks
				for(var j = 0; j < 21; j++) { // Check if command contains one of the possible Select Inputs
                  			if(decodeState(obj.common.states, j) == zThreeSi) {
                  			    adapter.setState('zone3.selectInput', zThreeSi, true);
                  			    return;
                  			} // endIf
				} // endFor
			});
		} // endIf 
	} else { // Transformations for normal commands
		command = data.replace(/\s+|\d+/g,'');
	} // endElse
	
	if(command.startsWith("DIM")) { // Handle display brightness
	    adapter.getObject('display.brightness', function(err, obj) {
		var bright = data.slice(4, data.length);
		bright = bright.replace(' ', ''); // Remove blanks
		for(var j = 0; j < 4; j++) { // Check if command contains one of the possible brightness states
  			if(decodeState(obj.common.states, j).toLowerCase().includes(bright.toLowerCase())) {
  			    adapter.setState('display.brightness', obj.common.states[j], true);
  			    return;
  			} // endIf
		} // endFor
	    });
	} else if(command.startsWith("SI")) { // Handle select input
		var siCommand = data.slice(2, data.length); // Get only source name
		siCommand = siCommand.replace(' ', ''); // Remove blanks
		adapter.log.debug("SI-Command: " + siCommand);
		adapter.setState('selectInput', siCommand, true);
		return;
	} else if(command.startsWith("MS")) { // Handle Surround mode
		var msCommand = command.slice(2, command.length);
		adapter.setState('surroundMode', msCommand, true);
		return;
	} else if(command.startsWith("NSE")) { // Handle display content
		var displayCont = data.slice(4, data.length).replace(/[\0\1\2]/, ''); // Remove STX, SOH, NULL 
		var dispContNr = data.slice(3, 4);
		adapter.setState('display.displayContent' + dispContNr, displayCont, true);
		return;
	} else if(command.startsWith("NSFRN")) { // Handle friendly name
		adapter.setState('info.friendlyName', data.slice(6, data.length), true);
		return;
	} else if(command.startsWith("PSMULTEQ")){
	    var state = data.split(':')[1];
	    adapter.setState('parameterSettings.multEq', state, true);
	} else if(command.startsWith("PSDYNVOL")) {
	    var state = data.split(' ')[1];
	    adapter.setState('parameterSettings.dynamicVolume', state, true);
	}// endElseIf
	
	adapter.log.debug('Command to handle is ' + command);
	switch(command) {
		case 'PWON':
			adapter.setState('powerSystem', true, true);
			break;
		case 'PWSTANDBY':
			adapter.setState('powerSystem', false, true);
			break;
		case 'MV':
			data = data.slice(2, 4) + '.' + data.slice(4, 5); // Slice volume from string
			adapter.setState('mainVolume', parseFloat(data), true);
		    	if(volumeInDB) adapter.setState('mainVolumeDB', parseFloat(data)-80, true);
			break;
		case 'MVMAX':
			data = data.slice(6, 8) + '.' + data.slice(8, 9);
			adapter.setState('maximumVolume', parseFloat(data), true);
		    	if(volumeInDB) adapter.setState('maximumVolumeDB', parseFloat(data)-80, true);
			break;
		case 'MUON':
			adapter.setState('muteIndicator', true, true);
			break;
		case 'MUOFF':
			adapter.setState('muteIndicator', false, true);
			break;
		case 'Z2ON':
			adapter.setState('zone2.powerZone', true, true);
			break;
		case 'Z2OFF':
			adapter.setState('zone2.powerZone', false, true);
			break;
		case 'Z2MUON':
			adapter.setState('zone2.muteIndicator', true, true);
			break;
		case 'Z2MUOFF':
			adapter.setState('zone2.muteIndicator', false, true);
			break;
		case 'Z3ON':
			adapter.setState('zone3.powerZone', true, true);
			break;
		case 'Z3OFF':
			adapter.setState('zone3.powerZone', false, true);
			break;
		case 'Z3MUON':
			adapter.setState('zone3.muteIndicator', true, true);
			break;
		case 'Z3MUOFF':
			adapter.setState('zone3.muteIndicator', false, true);
			break;
		case 'ZMON':
		    	adapter.setState('powerMainZone', true, true);
		    	break;
		case 'ZMOFF':
			adapter.setState('powerMainZone', false, true);
	    		break;
		case 'SLP':
		    	data = data.slice(3, data.length);
		    	adapter.setState('sleepTimer', parseFloat(data), true);
		    	break;
		case 'SLPOFF':
		    	adapter.setState('sleepTimer', 0, true);
		    	break;
		case 'Z2SLP':
		    	data = data.slice(5, data.length);
		    	adapter.setState('zone2.sleepTimer', parseFloat(data), true);
		    	break;
		case 'Z2SLPOFF':
		    	adapter.setState('zone2.sleepTimer', 0, true);
		    	break;
		case 'Z3SLP':
		    	data = data.slice(5, data.length);
		    	adapter.setState('zone3.sleepTimer', parseFloat(data), true);
			break;
		case 'Z3SLPOFF':
		    	adapter.setState('zone3.sleepTimer', 0, true);
		    	break;
		case 'PSDYNEQON':
		    	adapter.setState('parameterSettings.dynamicEq', true, true)
		    	break;
		case 'PSDYNEQOFF':
		    	adapter.setState('parameterSettings.dynamicEq', false, true)
		    	break;
		case 'PSSWLON':
		    	adapter.setState('parameterSettings.subwooferLevelState', true, true)
		    	break;
		case 'PSSWLOFF':
		    	adapter.setState('parameterSettings.subwooferLevelState', false, true)
		    	break;
		case 'PSSWL': // Handle Subwoofer Level for first and second SW
		    	command = data.split(' ')[0];
		    	var state = data.split(' ')[1];
		    	state = asciiToDb(state);
		    	if(command == 'PSSWL') { // Check if PSSWL or PSSWL2
		    	    adapter.setState('parameterSettings.subwooferLevel', parseFloat(state), true);
		    	} else adapter.setState('parameterSettings.subwooferTwoLevel', parseFloat(state), true);
		    	break;
		case 'PSLFCON':
		    	adapter.setState('parameterSettings.audysseyLfc', true, true);
		    	break;
		case 'PSLFCOFF':
		    	adapter.setState('parameterSettings.audysseyLfc', false, true);
		    	break;
		case 'PSCNTAMT':
		    	var state = data.split(' ')[1];
		    	adapter.setState('parameterSettings.containmentAmount', parseFloat(state), true);
		    	break;
		case 'PSREFLEV':
		    	var state = data.split(' ')[1];
		    	adapter.setState('parameterSettings.referenceLevelOffset', state, true);
		    	break;
		case 'PSBAS':
		    	var state = data.split(' ')[1];
		    	state = asciiToDb(state);
		    	adapter.setState('parameterSettings.bass', state, true);
		    	break;
		case 'PSTRE':
		    	var state = data.split(' ')[1];
		    	state = asciiToDb(state);
		    	adapter.setState('parameterSettings.treble', state, true);
		    	break;
		case 'ZPSTRE':
		    	command = data.split(' ')[0];
		    	var state = data.split(' ')[1];
		    	if(command == 'Z2PSTRE') {
		    	    adapter.setState('zone2.parameterSettings.treble', state, true);
		    	} else adapter.setState('zone3.parameterSettings.treble', state, true);
		    	break;
		case 'ZPSBAS':
		    	command = data.split(' ')[0];
		    	var state = data.split(' ')[1];
		    	if(command == 'Z2PSBAS') {
		    	    adapter.setState('zone2.parameterSettings.bass', state, true);
		    	} else adapter.setState('zone3.parameterSettings.bass', state, true);
		    	break;
		case 'PSTONECTRLON':
		    	adapter.setState('parameterSettings.toneControl', true, true);
		    	break;
		case 'PSTONECTRLOFF':
		    	adapter.setState('parameterSettings.toneControl', false, true);
		    	break;
		    	
	} // endSwitch
    } // endHandleResponse

    function decodeState(stateNames, state) { // decoding for e. g. selectInput
   	var stateArray = Object.keys(stateNames).map(function(key) {
   	    return stateNames[key];
   	});
   	for(var i = 0; i < stateArray.length; i++) {
   	    if(state.toString().toUpperCase() == stateArray[i].toUpperCase() || i.toString() == state) return stateArray[i];
   	} // endFor
   	    return "";
   	} // endDecodeState
    
    function asciiToDb(vol) {
    	if(vol.length === 3) vol = vol / 10;
    	vol -= 50; // Vol to dB
    	return vol;
    } // endVolToDb
    
    function dbToAscii(vol) {
	vol += 50; // dB to vol
	vol = vol.toString().replace('.', '');
	return vol;
    } // endDbToAscii
    
    function checkVolumeDB(db) {
   	    if(db) { // create dB States
   		adapter.setObjectNotExists('mainVolumeDB', {
   		    type: 'state',
   		    common: {
   			name: 'mainVolumeDB',
                	role: 'Main Volume DB',
                	type: 'number',
                	read: true,
                	write: true,
                	min: -80,
                	max: 18		
   		    }
   		});
   		adapter.setObjectNotExists('maximumVolumeDB', {
   			type: 'state',
   			common: {
   			    name: 'maximumVolumeDB',
   			    role: 'Maximum Volume DB',
   			    type: 'number',
   			    write: false,
   			    read: true
   			}
   	    	});
   	    } else { // delete dB States
   		adapter.delObject('mainVolumeDB');
   		adapter.delObject('maximumVolumeDB');
   	    } // endElseIf
   	    
    } // endCreateVolumeDB

    function createZoneTwo() {
	adapter.setObjectNotExists('zone2', {
            type: "channel",
            common: {
                name: "Zone2"
            },
            native: {}
        });

	adapter.setObjectNotExists('zone2.powerZone', {
        	type: 'state',
        	common: {
                	name: 'zone2.powerZone',
                	role: 'Zone2 Power State',
                	type: 'boolean',
                	write: true,
                	read: true
        	},
        	native: {}
    	});

	if(!volumeInDB) {
        	adapter.setObjectNotExists('zone2.volume', {
            		type: 'state',
            		common: {
                        	name: 'zone2.volume',
                        	role: 'Volume',
                        	type: 'number',
                        	read: true,
                        	write: true,
                        	min: 0,
                        	max: 98
            		},
            		native: {}
        	});
        	adapter.delObject('zone2.volumeDB');
	} else {
	    adapter.setObjectNotExists('zone2.volumeDB', {
    		type: 'state',
    		common: {
                	name: 'zone2.volumeDB',
                	role: 'Volume',
                	type: 'number',
                	read: true,
                	write: true,
                	min: -80,
                	max: 18
    		},
    		native: {}
	});
	}

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
                	type: 'string',
                	write: true,
                	read: true,
                	states: {
                    		"0": "PHONO",
                    		"1": "CD",
                    		"2": "TUNER",
                    		"3": "DVD",
                    		"4": "BD",
                    		"5": "TV",
                    		"6": "SAT/CBL",
                    		"7": "MPLAY",
                    		"8": "GAME",
                    		"9": "NET",
                    		"10": "SPOTIFY",
                    		"11": "LASTFM",
                    		"12": "IRADIO",
                    		"13": "SERVER",
                    		"14": "FAVORITES",
                    		"15": "AUX1",
                    		"16": "AUX2",
                    		"17": "AUX3",
                    		"18": "AUX4",
                    		"19": "AUX5",
                    		"20": "AUX6",
                    		"21": "AUX7"
            		}
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
    
    adapter.setObjectNotExists('zone2.sleepTimer', {
        type: 'state',
        common: {
                name: 'zone2.sleepTimer',
                role: 'Sleep Timer',
                type: 'number',
                write: true,
                read: true,
                min: 0,
                max: 120
        },
        native: {}
    });
    
    adapter.setObjectNotExists('zone2.parameterSettings', {
	type: "channel",
	common: {
	    name: "Zone2 Parameter Settings"
	}
    });
    
    adapter.setObjectNotExists('zone2.parameterSettings.bass', {
	type: "state",
	common: {
		name: "zone2.parameterSettings.bass",
		role: "Zone2 Bass Level",
		type: "number",
		write: true,
		read: true,
		unit: "dB",
		min: -6,
		max: 6
	},
	native: {}
    });
    
    adapter.setObjectNotExists('zone2.parameterSettings.bassUp', {
	type: "state",
	common: {
		"name": "zone2.parameterSettings.bassUp",
		"role": "button",
		"type": "number",
		"write": true,
		"read": true
	},
	native: {}
    });
    
    adapter.setObjectNotExists('zone2.parameterSettings.bassDown', {
	type: "state",
	common: {
		"name": "zone2.parameterSettings.bassDown",
		"role": "button",
		"type": "number",
		"write": true,
		"read": true
	},
	native: {}
    });
    
    adapter.setObjectNotExists('zone2.parameterSettings.treble', {
	type: "state",
	common: {
		name: "zone2.parameterSettings.treble",
		role: "Zone2 Treble Level",
		type: "number",
		write: true,
		read: true,
		unit: "dB",
		min: -6,
		max: 6
	},
	native: {}
    });
    
    adapter.setObjectNotExists('zone2.parameterSettings.trebleUp', {
	type: "state",
	common: {
		"name": "zone2.parameterSettings.trebleUp",
		"role": "button",
		"type": "number",
		"write": true,
		"read": true
	},
	native: {}
    });
    
    adapter.setObjectNotExists('zone2.parameterSettings.trebleDown', {
	type: "state",
	common: {
		"name": "zone2.parameterSettings.trebleDown",
		"role": "button",
		"type": "number",
		"write": true,
		"read": true
	},
	native: {}
    });
    
	zoneTwo = true;
	adapter.log.debug('Zone 2 detected');
   } // endCreateZoneTwo
   
   function createZoneThree() {
		adapter.setObjectNotExists('zone3', {
	            type: "channel",
	            common: {
	                name: "Zone3"
	            },
	            native: {}
	        });

		adapter.setObjectNotExists('zone3.powerZone', {
	        	type: 'state',
	        	common: {
	                	name: 'zone3.powerZone',
	                	role: 'Zone3 Power State',
	                	type: 'boolean',
	                	write: true,
	                	read: true
	        	},
	        	native: {}
	    	});

		if(!volumeInDB) {
	    	adapter.setObjectNotExists('zone3.volume', {
	        	type: 'state',
	        	common: {
	                	name: 'zone3.volume',
	                	role: 'Volume',
	                	type: 'number',
	                	read: true,
	                	write: true,
	                	min: 0,
	                	max: 98
	        	},
	        	native: {}
	    	});
	    	adapter.delObject('zone3.volumeDB');
		} else {
		    	adapter.setObjectNotExists('zone3.volumeDB', {
		        	type: 'state',
		        	common: {
		                	name: 'zone3.volumeDB',
		                	role: 'Volume',
		                	type: 'number',
		                	read: true,
		                	write: true,
		                	min: -18,
		                	max: 80
		        	},
		        	native: {}
		    	});    
		}

	    	adapter.setObjectNotExists('zone3.volumeUp', {
	        	type: 'state',
	        	common: {
	                	name: 'zone3.volumeUp',
	                	role: 'button',
	                	type: 'number',
	                	write: true,
	                	read: true
	        	},
	        	native: {}
	    	});

	    	adapter.setObjectNotExists('zone3.volumeDown', {
	        	type: 'state',
	        	common: {
	                	name: 'zone3.volumeDown',
	                	role: 'button',
	                	type: 'number',
	                	write: true,
	                	read: true
	        	},
	        	native: {}
	    	});

		adapter.setObjectNotExists('zone3.selectInput', {
	        	type: 'state',
	        	common: {
	                	name: 'zone3.selectInput',
	                	role: 'Select Input',
	                	type: 'string',
	                	write: true,
	                	read: true,
	                	states: {
	                    		"0": "PHONO",
	                    		"1": "CD",
	                    		"2": "TUNER",
	                    		"3": "DVD",
	                    		"4": "BD",
	                    		"5": "TV",
	                    		"6": "SAT/CBL",
	                    		"7": "MPLAY",
	                    		"8": "GAME",
	                    		"9": "NET",
	                    		"10": "SPOTIFY",
	                    		"11": "LASTFM",
	                    		"12": "IRADIO",
	                    		"13": "SERVER",
	                    		"14": "FAVORITES",
	                    		"15": "AUX1",
	                    		"16": "AUX2",
	                    		"17": "AUX3",
	                    		"18": "AUX4",
	                    		"19": "AUX5",
	                    		"20": "AUX6",
	                    		"21": "AUX7"
	            		}
		},
	        	native: {}
	    	});

		adapter.setObjectNotExists('zone3.muteIndicator', {
	        	type: 'state',
	        	common: {
	                	name: 'zone3.muteIndicator',
	                	role: 'Mute Indicator',
	                	type: 'boolean',
	                	write: true,
	                	read: true
	        	},
	        	native: {}
	    	});

	        adapter.setObjectNotExists('zone3.quickSelect1', {
	                type: 'state',
	                common: {
	                        name: 'zone3.quickSelect1',
	                        role: 'button',
	                        type: 'number',
	                        write: true,
	                        read: true
	                },
	                native: {}
	        });

		adapter.setObjectNotExists('zone3.quickSelect2', {
	        	type: 'state',
	        	common: {
	                	name: 'zone3.quickSelect2',
	                	role: 'button',
	                	type: 'number',
	                	write: true,
	                	read: true
	        	},
	        	native: {}
	    	});

	    	adapter.setObjectNotExists('zone3.quickSelect3', {
	        	type: 'state',
	        	common: {
	                	name: 'zone3.quickSelect3',
	                	role: 'button',
	                	type: 'number',
	                	write: true,
	                	read: true
	        	},
	        	native: {}
	    	});

	    adapter.setObjectNotExists('zone3.quickSelect4', {
	        type: 'state',
	        common: {
	                name: 'zone3.quickSelect4',
	                role: 'button',
	                type: 'number',
	                write: true,
	                read: true
	        },
	        native: {}
	    });

	    adapter.setObjectNotExists('zone3.quickSelect5', {
	        type: 'state',
	        common: {
	                name: 'zone3.quickSelect5',
	                role: 'button',
	                type: 'number',
	                write: true,
	                read: true
	        },
	        native: {}
	    });
	    
	    adapter.setObjectNotExists('zone3.sleepTimer', {
	        type: 'state',
	        common: {
	                name: 'zone3.sleepTimer',
	                role: 'Sleep Timer',
	                type: 'number',
	                write: true,
	                read: true,
	                min: 0,
	                max: 120
	        },
	        native: {}
	    });
	    
	    adapter.setObjectNotExists('zone3.parameterSettings', {
		type: "channel",
		common: {
		    name: "Zone3 Parameter Settings"
		}
	    });
	   
	    adapter.setObjectNotExists('zone3.parameterSettings.bass', {
		type: "state",
		common: {
			name: "zone3.parameterSettings.bass",
			role: "Zone3 Bass Level",
			type: "number",
			write: true,
			read: true,
			unit: "dB",
			min: -6,
			max: 6
		},
		native: {}
	    });
	    
	    adapter.setObjectNotExists('zone3.parameterSettings.bassUp', {
		type: "state",
		common: {
			"name": "zone3.parameterSettings.bassUp",
			"role": "button",
			"type": "number",
			"write": true,
			"read": true
		},
		native: {}
	    });
	    
	    adapter.setObjectNotExists('zone3.parameterSettings.bassDown', {
		type: "state",
		common: {
			"name": "zone3.parameterSettings.bassDown",
			"role": "button",
			"type": "number",
			"write": true,
			"read": true
		},
		native: {}
	    });
	    
	    adapter.setObjectNotExists('zone3.parameterSettings.treble', {
		type: "state",
		common: {
			name: "zone3.parameterSettings.treble",
			role: "Zone3 Treble Level",
			type: "number",
			write: true,
			read: true,
			unit: "dB",
			min: -6,
			max: 6
		},
		native: {}
	    });
	    
	    adapter.setObjectNotExists('zone3.parameterSettings.trebleUp', {
		type: "state",
		common: {
			"name": "zone3.parameterSettings.trebleUp",
			"role": "button",
			"type": "number",
			"write": true,
			"read": true
		},
		native: {}
	    });
	    
	    adapter.setObjectNotExists('zone3.parameterSettings.trebleDown', {
		type: "state",
		common: {
			"name": "zone3.parameterSettings.trebleDown",
			"role": "button",
			"type": "number",
			"write": true,
			"read": true
		},
		native: {}
	    });
	    
		zoneThree = true;
		adapter.log.debug('Zone 3 detected');
	   } // endCreateZoneThree

} // endMain
