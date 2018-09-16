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
const ssdpScan = require('./lib/upnp').ssdpScan;

// is called when adapter shuts down - callback has to be called under any circumstances!
adapter.on('unload', callback => {
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

// Some message was sent to adapter instance over message box. Used by email, pushover, text2speech, ...
adapter.on('message', obj => {
    if(typeof obj === 'object') {
        if(obj.command === 'browse') {
            // e.g. send email or pushover or whatever
            if(obj.callback) {
                adapter.log.info('start browse');
                ssdpScan(
                    'M-SEARCH * HTTP/1.1\r\n' +
                    'HOST: 239.255.255.250:1900\r\n' +
                    'ST: ssdp:all\r\n' +
                    'MAN: "ssdp:discover"\r\n' +
                    'MX: 3\r\n' +
                    '\r\n', true, 4000, (err, result) => {
                        if(result) {
                            result = result.filter(dev => dev.manufacturer && (dev.manufacturer.toLowerCase() === 'marantz' || dev.manufacturer.toLowerCase() === 'denon')).map(dev => {
                        	return {ip: dev.ip, name: dev.name}
                            });
                        } // endIf
                        adapter.sendTo(obj.from, obj.command, {error: err, list: result}, obj.callback);
                    });
            } // endIf
        } // endIf
    } // endIf
});

adapter.on('ready', () => {
    if(adapter.config.ip) {
    	adapter.log.info('Starting DENON AVR adapter');
    	main();
    } else adapter.log.warn('No IP-address set');
});

function main() {
    // Constants & Variables
    const client = new net.Socket();
    const host = adapter.config.ip;
    const volumeInDB = adapter.config.volumeInDB;
    const pollInterval = adapter.config.pollInterval;
    const requestInterval = adapter.config.requestInterval;
    let zoneTwo = false;
    let zoneThree = false;
    let displayAbility = false;
    let multiMonitor = false;
    let pollingVar = null;
    let connectingVar = null;
    
    checkVolumeDB(volumeInDB);
    
    // Connect
    connect(); // Connect on start
    
    client.on('timeout', () => {
    	pollingVar = false;
    	adapter.log.warn('AVR timed out due to no response');
    	adapter.setState('info.connection', false, true);
        client.destroy();
        client.unref();
        setTimeout(() => connect(), 30000); // Connect again in 30 seconds
    });

    // Connection handling
    client.on('error', error => {
	if(connectingVar) return;
	if(error.code === 'ECONNREFUSED') adapter.log.warn('Connection refused, make sure that there is no other Telnet connection');
	else if (error.code === 'EHOSTUNREACH') adapter.log.warn('AVR unreachable, check the Network Config of your AVR');
	else if(error.code === 'EALREADY' || error.code === 'EISCONN') return adapter.log.warn('Adapter is already connecting/connected');
	else adapter.log.warn('Connection closed: ' + error);
    	pollingVar = false;
    	adapter.setState('info.connection', false, true);
    	if(!connectingVar) {
    	    client.destroy();
            client.unref();
            connectingVar = setTimeout(() => connect(), 30000); // Connect again in 30 seconds
    	} // endIf
    });

    client.on('end', () => { // Denon has closed the connection
        adapter.log.warn('Denon AVR has cancelled the connection');
        pollingVar = false;
        adapter.setState('info.connection', false, true);
        if(!connectingVar) {
            client.destroy();
            client.unref();
            setTimeout(() => connect(), 30000); // Connect again in 30 seconds
        } // endIf
    });

    client.on('connect', () => { // Successfull connected
	clearTimeout(connectingVar);
	connectingVar = null;
        adapter.setState('info.connection', true, true);
        adapter.log.info('[CONNECT] Adapter connected to DENON-AVR: ' + host + ':23');
        adapter.log.debug('[CONNECT] Connected --> updating states on start');
        updateStates(); // Update states when connected
    });

    client.on('data', data => {
    	// split data by <cr>
    	const dataArr = data.toString().split(/[\r\n]+/); // Split by Carriage Return
    	for(let i=0; i < dataArr.length; i++) {
    		if(dataArr[i]) { // dataArr[i] contains element
    		    adapter.log.debug('[DATA] <== Incoming data: ' + dataArr[i]);
    		    handleResponse(dataArr[i]);
    		} // endIf
    	} // endFor
    });

     // Handle state changes
     adapter.on('stateChange', (id, state) => {
    	if (!id || !state || state.ack) return; // Ignore acknowledged state changes or error states      	
	
    	id = id.substring(adapter.namespace.length + 1); // remove instance name and id
	state = state.val; // only get state value
	
	adapter.log.debug('[COMMAND] State Change - ID: ' + id + '; State: ' + state);
	
	let quickNr;
	const m = id.match(/(\w+)\.quickSelect(\d)$/);
        if (m) {
            quickNr = m[2];
            id = m[1] + '.quickSelect'; // m[1] --> zone 
        } // endIf
        
	let leadingZero;
	switch(id) {
        	case 'zoneMain.powerZone':
        	    if(state === true) {
        		sendRequest('ZMON');
        	    } else sendRequest('ZMOFF');
        	    break;	
		case 'zoneMain.volume':
		    if (state < 0) state = 0;
		    if((state % 0.5) != 0) state = Math.round(state * 2) / 2;
		    if (state < 10) {
			leadingZero = '0';
		    } else leadingZero = '';
		    state = state.toString().replace('.', '') // remove points
		    sendRequest('MV' + leadingZero + state);
		    adapter.log.debug('[INFO] <== Changed mainVolume to ' + state);
		    break;
		case 'zoneMain.volumeDB':
		    state += 80; // convert to Vol
		    if (state < 0) state = 0;
		    if((state % 0.5) != 0) state = Math.round(state * 2) / 2;
		    if (state < 10) {
			leadingZero = '0';
		    } else leadingZero = '';
		    state = state.toString().replace('.', '') // remove points
		    sendRequest('MV' + leadingZero + state);
		    adapter.log.debug('[INFO] <== Changed mainVolume to ' + state);
		    break;
		case 'zoneMain.sleepTimer':
		    if(!state) { // state === 0
			sendRequest('SLPOFF');
		    } else if(state < 10) {
			sendRequest('SLP' + '00' + state);
		    } else if(state < 100) {
			sendRequest('SLP' + '0' + state);
		    } else if(state <= 120) {
			sendRequest('SLP' + state);
		    } // endElseIf
		    break;
		case 'zoneMain.volumeUp':
		    sendRequest('MVUP');
		    break;
		case 'zoneMain.volumeDown':
		    sendRequest('MVDOWN');
		    break;
		case 'zoneMain.muteIndicator':
		    if(state === true) {
			sendRequest('MUON')
		    } else {
			sendRequest('MUOFF')
		    } // endElseIf
		    break;
		case 'zoneMain.playPause':
		    sendRequest('NS94');
		    break;
		case 'zoneMain.play':
		    sendRequest('NS9A');
		    break;
		case 'zoneMain.pause':
		    sendRequest('NS9B');
		    break;
		case 'zoneMain.skipMinus':
		    sendRequest('NS9E');
		    break;
		case 'zoneMain.skipPlus':
		    sendRequest('NS9D');
		    break;
		case 'zoneMain.selectInput':
		    adapter.getObject('zoneMain.selectInput', (err, obj) => {
			sendRequest('SI' + decodeState(obj.common.states, state).toUpperCase());
		    });
		    break;
		case 'zoneMain.quickSelect':
		    sendRequest('MSQUICK' + quickNr);
		    break;
		case 'zoneMain.equalizerBassUp':
		    sendRequest('PSBAS UP');
		    break;
		case 'zoneMain.equalizerBassDown':
		    sendRequest('PSBAS DOWN');
		    break;
		case 'zoneMain.equalizerTrebleUp':
		    sendRequest('PSTRE UP');
		    break;
		case 'zoneMain.equalizerTrebleDown':
		    sendRequest('PSTRE DOWN');
		    break;
		case 'zoneMain.equalizerBass':
		    state = dbToAscii(state);
		    sendRequest('PSBAS ' + state);
		    break;
		case 'zoneMain.equalizerTreble':
		    state = dbToAscii(state);
		    sendRequest('PSTRE ' + state);
		    break;
		case 'settings.powerSystem':
		    if(state === true) {
			sendRequest('PWON')
		    } else {
			sendRequest('PWSTANDBY')
		    } // endElseIf
		    break;
		case 'settings.dynamicEq':
		    if(state) {
			sendRequest('PSDYNEQ ON');
		    } else sendRequest('PSDYNEQ OFF');
		    break;
		case 'settings.subwooferLevel':
		    state = dbToAscii(state);
		    sendRequest('PSSWL ' + state);
		    break;
		case 'settings.subwooferLevelDown':
		    sendRequest('PSSWL DOWN');
		    break;
		case 'settings.subwooferLevelUp':
		    sendRequest('PSSWL UP');
		    break;
		case 'settings.subwooferLevelState':
		    if(state) {
			sendRequest('PSSWL ON');
		    } else sendRequest('PSSWL OFF');
		    break;
		case 'settings.subwooferTwoLevel':
		    state = dbToAscii(state);
		    sendRequest('PSSWL2 ' + state);
		    break;
		case 'settings.subwooferTwoLevelDown':
		    sendRequest('PSSWL2 DOWN');
		    break;
		case 'settings.subwooferTwoLevelUp':
		    sendRequest('PSSWL2 UP');
		    break;
		case 'settings.audysseyLfc':
		    if(state) {
			sendRequest('PSLFC ON');
		    } else sendRequest('PSLFC OFF');
		    break;
		case 'settings.containmentAmountDown':
		    sendRequest('PSCNTAMT DOWN');
		    break;
		case 'settings.containmentAmountUp':
		    sendRequest('PSCNTAMT UP');
		    break;
		case 'settings.containmentAmount':
		    sendRequest('PSCNTAMT 0' + state);
		    break;
		case 'settings.multEq':
		    adapter.getObject('settings.multEq', (err, obj) => {
			sendRequest('PSMULTEQ:' + decodeState(obj.common.states, state).toUpperCase());
		    });
		    break;
		case 'settings.dynamicVolume':
		    adapter.getObject('settings.dynamicVolume', (err, obj) => {
			sendRequest('PSDYNVOL ' + decodeState(obj.common.states, state).toUpperCase());
		    });
		    break;
		case 'settings.referenceLevelOffset':
		    sendRequest('PSREFLEV ' + state);
		    break;
		case 'settings.surroundMode':
		    adapter.getObject('settings.surroundMode', (err, obj) => {
			sendRequest('MS' + decodeState(obj.common.states, state).toUpperCase());
		    });
		    break;
		case 'settings.expertCommand': // Sending custom commands
		    let expertState = state;
		    sendRequest(state);
		    adapter.getState('info.connection', (err, state) => {
			if(state.val === true) adapter.setState('settings.expertCommand', expertState, true);
		    });
		    break;
		case 'settings.toneControl':
		    if(state) {
			sendRequest('PSTONE CTRL ON');
		    } else sendRequest('PSTONE CTRL OFF');
		    break;
		case 'display.brightness':
		    adapter.getObject('display.brightness', (err, obj) => {
			sendRequest('DIM ' + decodeState(obj.common.states, state).toUpperCase().slice(0, 3));
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
		case 'zone2.sleepTimer':
		    if(!state) { // state === 0
			sendRequest('Z2SLPOFF');
		    } else if(state < 10) {
			sendRequest('Z2SLP' + '00' + state);
		    } else if(state < 100) {
			sendRequest('Z2SLP' + '0' + state);
		    } else if(state <= 120) {
			sendRequest('Z2SLP' + state);
		    } // endElseIf
		    break;
		case 'zone2.volumeUp':
		    sendRequest('Z2UP');
		    break;
		case 'zone2.volumeDown':
		    sendRequest('Z2DOWN');
		    break;
		case 'zone2.volume':
		    if (state < 0) state = 0;
		    if((state % 0.5) != 0) state = Math.round(state * 2) / 2;
		    if (state < 10) {
			leadingZero = '0';
		    } else leadingZero = '';
		    state = state.toString().replace('.', '') // remove points
		    sendRequest('Z2' + leadingZero + state);
		    break;
		case 'zone2.volumeDB':
		    state += 80; // Convert to Vol
		    if (state < 0) state = 0;
		    if((state % 0.5) != 0) state = Math.round(state * 2) / 2;
		    if (state < 10) {
			leadingZero = '0';
		    } else leadingZero = '';
		    state = state.toString().replace('.', '') // remove points
		    sendRequest('Z2' + leadingZero + state);
		    break;
                case 'zone2.selectInput':
                    adapter.getObject('zone2.selectInput', (err, obj) => {
                	sendRequest('Z2' + decodeState(obj.common.states, state).toUpperCase());
                    });
                    break;
		case 'zone2.quickSelect':
		    sendRequest('Z2QUICK' + quickNr);
		    break;
		case 'zone2.equalizerBassUp':
		    sendRequest('Z2PSBAS UP');
		    break;
		case 'zone2.equalizerBassDown':
		    sendRequest('Z2PSBAS DOWN');
		    break;
		case 'zone2.equalizerTrebleUp':
		    sendRequest('Z2PSTRE UP');
		    break;
		case 'zone2.equalizerTrebleDown':
		    sendRequest('Z2PSTRE DOWN');
		    break;
		case 'zone2.equalizerBass':
		    state = dbToAscii(state);
		    sendRequest('Z2PSBAS ' + state);
		    break;
		case 'zone2.equalizerTreble':
		    state = dbToAscii(state);
		    sendRequest('Z2PSTRE ' + state);
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
                    if (state < 0) state = 0;
                    if((state % 0.5) != 0) state = Math.round(state * 2) / 2;
                    if (state < 10) {
                            leadingZero = '0';
                    } else leadingZero = '';
                    state = state.toString().replace('.', '') // remove points
			sendRequest('Z3' + leadingZero + state);
			break;
		case 'zone3.volumeDB':
		    state += 80; // Convert to Vol
                    if (state < 0) state = 0;
                    if((state % 0.5) != 0) state = Math.round(state * 2) / 2;
                    if (state < 10) {
                            leadingZero = '0';
                    } else leadingZero = '';
                    state = state.toString().replace('.', '') // remove points
			sendRequest('Z3' + leadingZero + state);
			break;
		case 'zone3.selectInput':
                    adapter.getObject('zone3.selectInput', (err, obj) => {
                            sendRequest('Z3' + decodeState(obj.common.states, state).toUpperCase());
                    });
                    break;
		case 'zone3.quickSelect':
		    sendRequest('Z3QUICK' + quickNr);
		    break;
		case 'zone3.sleepTimer':
		    if(!state) { // state === 0
			sendRequest('Z3SLPOFF');
		    } else if(state < 10) {
			sendRequest('Z3SLP' + '00' + state);
		    } else if(state < 100) {
			sendRequest('Z3SLP' + '0' + state);
		    } else if(state <= 120) {
			sendRequest('Z3SLP' + state);
		    } // endElseIf
		    break;
		case 'zone3.equalizerBass':
		    state = dbToAscii(state);
		    sendRequest('Z3PSBAS ' + state);
		    break;
		case 'zone3.equalizerTreble':
		    state = dbToAscii(state);
		    sendRequest('Z3PSTRE ' + state);
		    break;
		case 'zone3.equalizerBassUp':
		    sendRequest('Z3PSBAS UP');
		    break;
		case 'zone3.equalizerBassDown':
		    sendRequest('Z3PSBAS DOWN');
		    break;
		case 'zone3.equalizerTrebleUp':
		    sendRequest('Z3PSTRE UP');
		    break;
		case 'zone3.equalizerTrebleDown':
		    sendRequest('Z3PSTRE DOWN');
		    break;
		case 'settings.cursorUp':
		    sendRequest('MNCUP');
		    break;
		case 'settings.cursorDown':
		    sendRequest('MNCDN');
		    break;
		case 'settings.cursorRight':
		    sendRequest('MNCRT');
		    break;
		case 'settings.cursorLeft':
		    sendRequest('MNCLT');
		    break;
		case 'settings.enter':
		    sendRequest('MNENT');
		    break;
		case 'settings.return':
		    sendRequest('MNRTN');
		    break;
		case 'settings.option':
		    sendRequest('MNOPT');
		    break;
		case 'settings.info':
		    sendRequest('MNINF');
		    break;
		case 'settings.setupMenu':
		    if(state) {
			sendRequest('MNMEN ON');
		    } else sendRequest('MNMEN OFF');
		    break;
		case 'settings.outputMonitor':
		    adapter.getObject('settings.outputMonitor', (err, obj) => {
			sendRequest('VSMONI' + decodeState(obj.common.states, state));
		    });
		    break;
		case 'settings.centerSpread':
		    if(state) sendRequest('PSCES ON');
		    else sendRequest('PSCES OFF');
		    break;
		default:
		    adapter.log.error('[COMMAND] ' + id + 'is not a valid state');
	} // endSwitch
     }); // endOnStateChange

    // all states changes inside the adapters namespace are subscribed
    adapter.subscribeStates('*');
    
    adapter.getForeignObject(adapter.namespace, (err, obj) => { // create device namespace
        if (!obj) {
            adapter.setForeignObject(adapter.namespace, {
                type: 'device',
                common: {
                    name: 'DENON device'
                }
            });
        } // endIf
    });

    /**
     * Internals
    */
    function connect() {
        client.setEncoding('utf8');
        client.setTimeout(35000);
        adapter.log.info('Trying to connect to ' + host + ':23');
        connectingVar = null;
        client.connect({port: 23, host: host});
    } // endConnect
    
    const updateCommands = ['NSET1 ?','NSFRN ?','ZM?',
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
			'Z3PSBAS ?', 'PSTONE CTRL ?',
			'MNMEN?', 'PSCES ?'
			];

    function updateStates() {
    	let i = 0;
    	let intervalVar = setInterval(() => {
			sendRequest(updateCommands[i]);
			i++;
			if(i == updateCommands.length) clearInterval(intervalVar);
		}, requestInterval);
    } // endUpdateStates
    
    const pollCommands = ['NSE', 'SLP?', 'Z2SLP?', 'Z3SLP?']; // Request Display State & Sleep Timer

    function pollStates() { // Polls states
    	let i = 0;
	pollingVar = false;
    	let intervalVar = setInterval(() => {
    	    sendRequest(pollCommands[i]);
    	    i++;
    	    if(i == pollCommands.length) clearInterval(intervalVar);
    	}, requestInterval);
    } // endPollStates

    function sendRequest(req) {
	client.write(req + '\r');
	adapter.log.debug('[INFO] ==> Message sent: ' + req);
    } // endSendRequest

    function handleResponse(data) {
	if(!pollingVar) { // Keep connection alive & poll states
		pollingVar = true;
		setTimeout(() => pollStates(), pollInterval); // Poll states every configured  seconds
	} // endIf
	// get command out of String
	let command;
	
	if(data.startsWith('Z2')) { // Transformation for Zone2 commands
		if(!zoneTwo) createZoneTwo(); // Create Zone2 states if not done yet
		command = data.replace(/\s+|\d+/g,'');
		
		if(command === 'Z') { // If everything is removed except Z --> Volume
			let vol = data.slice(2, data.toString().length).replace(/\s|[A-Z]/g, '');
			vol = vol.slice(0, 2) + '.' + vol.slice(2, 4); // Slice volume from string
			adapter.setState('zone2.volume', parseFloat(vol), true);
		    	if(volumeInDB) adapter.setState('zone2.volumeDB', parseFloat(vol)-80, true);
			return;
		} else {
			command = 'Z2' + command.slice(1, command.length);
		} // endElseIf
		if(command.startsWith('Z2')) { // Encode Input Source
			adapter.getObject('zoneMain.selectInput', (err, obj) => {
				let zTwoSi = data.slice(2, data.length);
				zTwoSi = zTwoSi.replace(' ', ''); // Remove blanks
				for(let j = 0; j < 21; j++) { // Check if command contains one of the possible Select Inputs
                      			if(decodeState(obj.common.states, j) == zTwoSi) {
                      			    adapter.setState('zone2.selectInput', zTwoSi, true);
                      			    return;
                      			} // endIf
				} // endFor
			});
			return;
		} // endIf
	} else if(data.startsWith('Z3')) { // Transformation for Zone3 commands
		if(!zoneThree) createZoneThree(); // Create Zone 3 states if not done yet
		command = data.replace(/\s+|\d+/g,'');
		if(command === 'Z') { // if everything is removed except Z --> Volume
			let vol = data.slice(2, data.toString().length).replace(/\s|[A-Z]/g, '');
			vol = vol.slice(0, 2) + '.' + vol.slice(2, 4); // Slice volume from string
			adapter.setState('zone3.volume', parseFloat(vol), true);
		    	if(volumeInDB) adapter.setState('zone3.volumeDB', parseFloat(vol)-80, true);
			return;
		} else {
			command = 'Z3' + command.slice(1, command.length);
		} // endElseIf
		if(command.startsWith('Z3')) { // Encode Input Source
			adapter.getObject('zoneMain.selectInput', (err, obj) => {
				let zThreeSi = data.slice(2, data.length);
				zThreeSi = zThreeSi.replace(' ', ''); // Remove blanks
				for(let j = 0; j < 21; j++) { // Check if command contains one of the possible Select Inputs
                  			if(decodeState(obj.common.states, j) == zThreeSi) {
                  			    adapter.setState('zone3.selectInput', zThreeSi, true);
                  			    return;
                  			} // endIf
				} // endFor
			});
			return;
		} // endIf 
	} else { // Transformation for normal commands
		command = data.replace(/\s+|\d+/g,'');
	} // endElse
	
	if(command.startsWith('DIM')) { // Handle display brightness
	    adapter.getObject('display.brightness', (err, obj) => {
		let bright = data.slice(4, data.length);
		bright = bright.replace(' ', ''); // Remove blanks
		for(let j = 0; j < 4; j++) { // Check if command contains one of the possible brightness states
  			if(decodeState(obj.common.states, j).toLowerCase().includes(bright.toLowerCase())) {
  			    adapter.setState('display.brightness', obj.common.states[j], true);
  			} // endIf
		} // endFor
	    });
	    return;
	} else if(command.startsWith('SI')) { // Handle select input
	    let siCommand = data.slice(2, data.length); // Get only source name
	    siCommand = siCommand.replace(' ', ''); // Remove blanks
	    adapter.setState('zoneMain.selectInput', siCommand, true);
	    return;
	} else if(command.startsWith('MS')) { // Handle Surround mode
	    let msCommand = command.slice(2, command.length);
	    adapter.setState('settings.surroundMode', msCommand, true);
	    return;
	} else if(command.startsWith('NSE') && !command.startsWith('NSET')) { // Handle display content
	    if(!displayAbility) createDisplayAndHttp();
	    let displayCont = data.slice(4, data.length).replace(/[\0\1\2]/g, ''); // Remove all STX, SOH, NULL
	    let dispContNr = data.slice(3, 4);
	    adapter.setState('display.displayContent' + dispContNr, displayCont, true);
	    return;
	} else if(command.startsWith('NSET')) {
	    // Network settings info
	    return;
	} else if (command.startsWith('SV')){
	    // Select Video
	    return;
	} else if(command.startsWith('NSFRN')) { // Handle friendly name
	    adapter.setState('info.friendlyName', data.slice(6, data.length), true);
	    return;
	} else if(command.startsWith('PSMULTEQ')){
	    let state = data.split(':')[1];
	    adapter.setState('settings.multEq', state, true);
	    return;
	} else if(command.startsWith('PSDYNVOL')) {
	    let state = data.split(' ')[1];
	    adapter.setState('settings.dynamicVolume', state, true);
	    return;
	} else if (command.startsWith('VSMONI')) {
	    let state = data.substring(6);
	    
	    if(!multiMonitor) { // make sure that state exists
		createMonitorState(() => {
		   if(state === 'AUTO') {
		       adapter.setState('settings.outputMonitor', 0, true); 
		   } else adapter.setState('settings.outputMonitor', parseFloat(state), true); 
		});
	    } else {
		if(state === 'AUTO') {
		    adapter.setState('settings.outputMonitor', 0, true); 
		} else adapter.setState('settings.outputMonitor', parseFloat(state), true); 
	    } // endElse
	    return;	    
	} // endElseIf
	
	adapter.log.debug('[INFO] <== Command to handle is ' + command);
	
	switch(command) {
		case 'PWON':
			adapter.setState('settings.powerSystem', true, true);
			break;
		case 'PWSTANDBY':
			adapter.setState('settings.powerSystem', false, true);
			break;
		case 'MV':
			data = data.slice(2, 4) + '.' + data.slice(4, 5); // Slice volume from string
			adapter.setState('zoneMain.volume', parseFloat(data), true);
		    	if(volumeInDB) adapter.setState('zoneMain.volumeDB', parseFloat(data)-80, true);
			break;
		case 'MVMAX':
			data = data.slice(6, 8) + '.' + data.slice(8, 9);
			adapter.setState('zoneMain.maximumVolume', parseFloat(data), true);
		    	if(volumeInDB) adapter.setState('zoneMain.maximumVolumeDB', parseFloat(data)-80, true);
			break;
		case 'MUON':
			adapter.setState('zoneMain.muteIndicator', true, true);
			break;
		case 'MUOFF':
			adapter.setState('zoneMain.muteIndicator', false, true);
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
		    	adapter.setState('zoneMain.powerZone', true, true);
		    	break;
		case 'ZMOFF':
			adapter.setState('zoneMain.powerZone', false, true);
	    		break;
		case 'SLP':
		    	data = data.slice(3, data.length);
		    	adapter.setState('zoneMain.sleepTimer', parseFloat(data), true);
		    	break;
		case 'SLPOFF':
		    	adapter.setState('zoneMain.sleepTimer', 0, true);
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
		    	adapter.setState('settings.dynamicEq', true, true)
		    	break;
		case 'PSDYNEQOFF':
		    	adapter.setState('settings.dynamicEq', false, true)
		    	break;
		case 'PSSWLON':
		    	adapter.setState('settings.subwooferLevelState', true, true)
		    	break;
		case 'PSSWLOFF':
		    	adapter.setState('settings.subwooferLevelState', false, true)
		    	break;
		case 'PSSWL': // Handle Subwoofer Level for first and second SW
		    {
		    	command = data.split(' ')[0];
		    	let state = data.split(' ')[1];
		    	state = asciiToDb(state);
		    	if(command === 'PSSWL') { // Check if PSSWL or PSSWL2
		    	    adapter.setState('settings.subwooferLevel', parseFloat(state), true);
		    	} else adapter.setState('settings.subwooferTwoLevel', parseFloat(state), true);
		    	break;
		    }
		case 'PSLFCON':
		    	adapter.setState('settings.audysseyLfc', true, true);
		    	break;
		case 'PSLFCOFF':
		    	adapter.setState('settings.audysseyLfc', false, true);
		    	break;
		case 'PSCNTAMT':
		    {
		    	let state = data.split(' ')[1];
		    	adapter.setState('settings.containmentAmount', parseFloat(state), true);
		    	break;
		    }
		case 'PSREFLEV':
		    {
		    	let state = data.split(' ')[1];
		    	adapter.setState('settings.referenceLevelOffset', state, true);
		    	break;
		    }
		case 'PSBAS':
		    {
		    	let state = data.split(' ')[1];
		    	state = asciiToDb(state);
		    	adapter.setState('zoneMain.equalizerBass', state, true);
		    	break;
		    }
		case 'PSTRE':
		    {
		    	let state = data.split(' ')[1];
		    	state = asciiToDb(state);
		    	adapter.setState('zoneMain.equalizerTreble', state, true);
		    	break;
		    }
		case 'ZPSTRE':
		    	command = data.split(' ')[0];
		    	let state = data.split(' ')[1];
		    	if(command === 'Z2PSTRE') {
		    	    adapter.setState('zone2.equalizerTreble', state, true);
		    	} else adapter.setState('zone3.equalizerTreble', state, true);
		    	break;
		case 'ZPSBAS':
		    {
		    	command = data.split(' ')[0];
		    	let state = data.split(' ')[1];
		    	if(command === 'Z2PSBAS') {
		    	    adapter.setState('zone2.equalizerBass', state, true);
		    	} else adapter.setState('zone3.equalizerBass', state, true);
		    	break;
		    }
		case 'PSTONECTRLON':
		    	adapter.setState('settings.toneControl', true, true);
		    	break;
		case 'PSTONECTRLOFF':
		    	adapter.setState('settings.toneControl', false, true);
		    	break;
		case 'MNMENON':
		    	adapter.setState('settings.setupMenu', true, true);
		    	break;
		case 'MNMENOFF':
		    	adapter.setState('settings.setupMenu', false, true);
		    	break;
		case 'PSCESON':
		    	adapter.setState('settings.centerSpread', true, true);
		    	break;
		case 'PSCESOFF':
		    	adapter.setState('settings.centerSpread', false, true);
		    	break;
		case 'PSDRCOFF':
		    	// Dynamic Compression direct change is off
		    	break;
		case 'PSLFE':
		    	// LFE --> amount of subwoofer signal additional directed to speakers
		    	break;
		default:
		    	adapter.log.debug('[INFO] <== Unhandled command ' + command);
	} // endSwitch
    } // endHandleResponse

    function decodeState(stateNames, state) { // decoding for e. g. selectInput
   	const stateArray = Object.keys(stateNames).map(key => stateNames[key]); // returns stateNames[key]
   	for(let i = 0; i < stateArray.length; i++) {
   	    if(state.toString().toUpperCase() === stateArray[i].toUpperCase() || i.toString() === state.toString()) return stateArray[i];
   	} // endFor
   	    return '';
   	} // endDecodeState
    
    function asciiToDb(vol) {
    	if(vol.length === 3) vol = vol / 10;
    	vol -= 50; // Vol to dB
    	return vol;
    } // endAsciiToDb
    
    function dbToAscii(vol) {
	vol += 50; // dB to vol
	vol = vol.toString().replace('.', '');
	return vol;
    } // endDbToAscii
    
    function checkVolumeDB(db) {
        if (db) { // create dB States
            adapter.setObjectNotExists('zoneMain.volumeDB', {
                type: 'state',
                common: {
                    name: 'Main Volume DB',
                    role: 'level.volume.main',
                    type: 'number',
                    read: true,
                    write: true,
                    min: -80,
                    max: 18,
                    unit: 'dB'
                }
            });
            adapter.setObjectNotExists('zoneMain.maximumVolumeDB', {
                type: 'state',
                common: {
                    name: 'Maximum Volume DB',
                    role: 'state',
                    type: 'number',
                    write: false,
                    read: true,
                    unit: 'dB'
                }
            });
        } else { // delete dB States
            adapter.delObject('zoneMain.volumeDB');
            adapter.delObject('zoneMain.maximumVolumeDB');
        } // endElseIf

    } // endCreateVolumeDB

    function createZoneTwo(cb) {
        adapter.setObjectNotExists('zone2', {
            type: 'channel',
            common: {
                name: 'Zone 2'
            },
            native: {}
        });

        adapter.setObjectNotExists('zone2.powerZone', {
            type: 'state',
            common: {
                name: 'Zone 2 Power State',
                role: 'switch.power.zone',
                type: 'boolean',
                write: true,
                read: true
            },
            native: {}
        });

        if (!volumeInDB) {
            adapter.setObjectNotExists('zone2.volume', {
                type: 'state',
                common: {
                    name: 'Zone 2 Volume',
                    role: 'level.volume.zone',
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
                    name: 'Zone 2 VolumeDB',
                    role: 'level.volume',
                    type: 'number',
                    unit: 'dB',
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
                name: 'Zone 2 Volume Up',
                role: 'button',
                type: 'boolean',
                write: true,
                read: false
            },
            native: {}
        });

        adapter.setObjectNotExists('zone2.volumeDown', {
            type: 'state',
            common: {
                name: 'Zone 2 Volume Down',
                role: 'button',
                type: 'boolean',
                write: true,
                read: false
            },
            native: {}
        });

        adapter.setObjectNotExists('zone2.selectInput', {
            type: 'state',
            common: {
                name: 'Zone 2 Select input',
                role: 'media.input',
                type: 'number',
                write: true,
                read: true,
                states: {
                    '0': 'PHONO',
                    '1': 'CD',
                    '2': 'TUNER',
                    '3': 'DVD',
                    '4': 'BD',
                    '5': 'TV',
                    '6': 'SAT/CBL',
                    '7': 'MPLAY',
                    '8': 'GAME',
                    '9': 'NET',
                    '10': 'SPOTIFY',
                    '11': 'LASTFM',
                    '12': 'IRADIO',
                    '13': 'SERVER',
                    '14': 'FAVORITES',
                    '15': 'AUX1',
                    '16': 'AUX2',
                    '17': 'AUX3',
                    '18': 'AUX4',
                    '19': 'AUX5',
                    '20': 'AUX6',
                    '21': 'AUX7'
                }
            },
            native: {}
        });

        adapter.setObjectNotExists('zone2.muteIndicator', {
            type: 'state',
            common: {
                name: 'Zone 2 Muted',
                role: 'media.mute',
                type: 'boolean',
                write: true,
                read: true
            },
            native: {}
        });

        adapter.setObjectNotExists('zone2.quickSelect1', {
            type: 'state',
            common: {
                name: 'Zone 2 Quick select 1',
                role: 'button',
                type: 'boolean',
                write: true,
                read: false
            },
            native: {}
        });

        adapter.setObjectNotExists('zone2.quickSelect2', {
            type: 'state',
            common: {
                name: 'Zone 2 Quick select 2',
                role: 'button',
                type: 'boolean',
                write: true,
                read: false
            },
            native: {}
        });

        adapter.setObjectNotExists('zone2.quickSelect3', {
            type: 'state',
            common: {
                name: 'Zone 2 Quick select 3',
                role: 'button',
                type: 'boolean',
                write: true,
                read: false
            },
            native: {}
        });

        adapter.setObjectNotExists('zone2.quickSelect4', {
            type: 'state',
            common: {
                name: 'Zone 2 Quick select 4',
                role: 'button',
                type: 'boolean',
                write: true,
                read: false
            },
            native: {}
        });

        adapter.setObjectNotExists('zone2.quickSelect5', {
            type: 'state',
            common: {
                name: 'Zone 2 Quick select 5',
                role: 'button',
                type: 'boolean',
                write: true,
                read: false
            },
            native: {}
        });

        adapter.setObjectNotExists('zone2.sleepTimer', {
            type: 'state',
            common: {
                name: 'Zone 2 Sleep Timer',
                role: 'media.timer.sleep',
                unit: 'min',
                type: 'number',
                write: true,
                read: true,
                min: 0,
                max: 120
            },
            native: {}
        });

        adapter.setObjectNotExists('zone2.equalizerBass', {
            type: 'state',
            common: {
                name: 'Zone 2 Bass Level',
                role: 'level.bass',
                type: 'number',
                write: true,
                read: true,
                unit: 'dB',
                min: -6,
                max: 6
            },
            native: {}
        });

        adapter.setObjectNotExists('zone2.equalizerBassUp', {
            type: 'state',
            common: {
                'name': 'Zone 2 Bass Up',
                'role': 'button',
                'type': 'boolean',
                'write': true,
                'read': false
            },
            native: {}
        });

        adapter.setObjectNotExists('zone2.equalizerBassDown', {
            type: 'state',
            common: {
                name: 'Zone 2 Bass Down',
                role: 'button',
                type: 'boolean',
                write: true,
                read: false
            },
            native: {}
        });

        adapter.setObjectNotExists('zone2.equalizerTreble', {
            type: 'state',
            common: {
                name: 'Zone 2 Treble',
                role: 'level.treble',
                type: 'number',
                write: true,
                read: true,
                unit: 'dB',
                min: -6,
                max: 6
            },
            native: {}
        });

        adapter.setObjectNotExists('zone2.equalizerTrebleUp', {
            type: 'state',
            common: {
                'name': 'Zone 2 Treble Up',
                'role': 'button',
                'type': 'boolean',
                'write': true,
                'read': false
            },
            native: {}
        });

        adapter.setObjectNotExists('zone2.equalizerTrebleDown', {
            type: 'state',
            common: {
                'name': 'Zone 2 Treble Down',
                'role': 'button',
                'type': 'boolean',
                'write': true,
                'read': false
            },
            native: {}
        });

        zoneTwo = true;
        adapter.log.debug('[INFO] <== Zone 2 detected');
	if (cb && typeof(cb) === "function") return cb();
	
    } // endCreateZoneTwo

    function createZoneThree(cb) {
        adapter.setObjectNotExists('zone3', {
            type: 'channel',
            common: {
                name: 'Zone 3'
            },
            native: {}
        });

        adapter.setObjectNotExists('zone3.powerZone', {
            type: 'state',
            common: {
                name: 'Zone 3 Power State',
                role: 'switch.power.zone',
                type: 'boolean',
                write: true,
                read: true
            },
            native: {}
        });

        if (!volumeInDB) {
            adapter.setObjectNotExists('zone3.volume', {
                type: 'state',
                common: {
                    name: 'Zone 3 volume',
                    role: 'level.volume.zone',
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
                    name: 'Zone 3 volumeDB',
                    role: 'level.volume.zone',
                    type: 'number',
                    unit: 'dB',
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
                name: 'Zone 3 Volume Up',
                role: 'button',
                type: 'number',
                write: true,
                read: false
            },
            native: {}
        });

        adapter.setObjectNotExists('zone3.volumeDown', {
            type: 'state',
            common: {
                name: 'Zone 3 Volume Down',
                role: 'button',
                type: 'number',
                write: true,
                read: false
            },
            native: {}
        });

        adapter.setObjectNotExists('zone3.selectInput', {
            type: 'state',
            common: {
                name: 'Zone 3 Select input',
                role: 'media.input',
                type: 'string',
                write: true,
                read: true,
                states: {
                    '0': 'PHONO',
                    '1': 'CD',
                    '2': 'TUNER',
                    '3': 'DVD',
                    '4': 'BD',
                    '5': 'TV',
                    '6': 'SAT/CBL',
                    '7': 'MPLAY',
                    '8': 'GAME',
                    '9': 'NET',
                    '10': 'SPOTIFY',
                    '11': 'LASTFM',
                    '12': 'IRADIO',
                    '13': 'SERVER',
                    '14': 'FAVORITES',
                    '15': 'AUX1',
                    '16': 'AUX2',
                    '17': 'AUX3',
                    '18': 'AUX4',
                    '19': 'AUX5',
                    '20': 'AUX6',
                    '21': 'AUX7'
                }
            },
            native: {}
        });

        adapter.setObjectNotExists('zone3.muteIndicator', {
            type: 'state',
            common: {
                name: 'Zone 3 Muted',
                role: 'media.mute',
                type: 'boolean',
                write: true,
                read: true
            },
            native: {}
        });

        adapter.setObjectNotExists('zone3.quickSelect1', {
            type: 'state',
            common: {
                name: 'Zone 3 Quick select 1',
                role: 'button',
                type: 'boolean',
                write: true,
                read: false
            },
            native: {}
        });

        adapter.setObjectNotExists('zone3.quickSelect2', {
            type: 'state',
            common: {
                name: 'Zone 3 Quick select 2',
                role: 'button',
                type: 'boolean',
                write: true,
                read: false
            },
            native: {}
        });

        adapter.setObjectNotExists('zone3.quickSelect3', {
            type: 'state',
            common: {
                name: 'Zone 3 Quick select 3',
                role: 'button',
                type: 'boolean',
                write: true,
                read: false
            },
            native: {}
        });

        adapter.setObjectNotExists('zone3.quickSelect4', {
            type: 'state',
            common: {
                name: 'Zone 3 Quick select 4',
                role: 'button',
                type: 'boolean',
                write: true,
                read: false
            },
            native: {}
        });

        adapter.setObjectNotExists('zone3.quickSelect5', {
            type: 'state',
            common: {
                name: 'Zone 3 Quick select 5',
                role: 'button',
                type: 'boolean',
                write: true,
                read: false
            },
            native: {}
        });

        adapter.setObjectNotExists('zone3.sleepTimer', {
            type: 'state',
            common: {
                name: 'Zone 3 Sleep Timer',
                role: 'level.timer.sleep',
                type: 'number',
                unit: 'min',
                write: true,
                read: true,
                min: 0,
                max: 120
            },
            native: {}
        });

        adapter.setObjectNotExists('zone3.equalizerBass', {
            type: 'state',
            common: {
                name: 'Zone 3 Bass Level',
                role: 'level.bass',
                type: 'number',
                write: true,
                read: true,
                unit: 'dB',
                min: -6,
                max: 6
            },
            native: {}
        });

        adapter.setObjectNotExists('zone3.equalizerBassUp', {
            type: 'state',
            common: {
                name: 'Zone 3 Bass Up',
                role: 'button',
                type: 'boolean',
                write: true,
                read: false
            },
            native: {}
        });

        adapter.setObjectNotExists('zone3.equalizerBassDown', {
            type: 'state',
            common: {
                name: 'Zone 3 Bass Down',
                role: 'button',
                type: 'boolean',
                write: true,
                read: false
            },
            native: {}
        });

        adapter.setObjectNotExists('zone3.equalizerTreble', {
            type: 'state',
            common: {
                name: 'Zone 3 Treble',
                role: 'level.treble',
                type: 'number',
                write: true,
                read: true,
                unit: 'dB',
                min: -6,
                max: 6
            },
            native: {}
        });

        adapter.setObjectNotExists('zone3.equalizerTrebleUp', {
            type: 'state',
            common: {
                'name': 'Zone 3 Treble Up',
                'role': 'button',
                'type': 'boolean',
                'write': true,
                'read': false
            },
            native: {}
        });

        adapter.setObjectNotExists('zone3.equalizerTrebleDown', {
            type: 'state',
            common: {
                'name': 'Zone 3 Treble Down',
                'role': 'button',
                'type': 'boolean',
                'write': true,
                'read': false
            },
            native: {}
        });

        zoneThree = true;
        adapter.log.debug('[INFO] <== Zone 3 detected');
	if (cb && typeof(cb) === "function") return cb();

    } // endCreateZoneThree
    
    function createDisplayAndHttp(cb) {
	adapter.setObjectNotExists('display.displayContent0', {
		type: 'state',
		common: {
			'name': 'Display content 0',
			'role': 'info.display',
			'type': 'string',
			'write': false,
			'read': true
		},
		native: {}
	});
	adapter.setObjectNotExists('display.displayContent1', {
		type: 'state',
		common: {
			'name': 'Display content 1',
			'role': 'info.display',
			'type': 'string',
			'write': false,
			'read': true
		},
		native: {}
	});
	adapter.setObjectNotExists('display.displayContent2', {
		type: 'state',
		common: {
			'name': 'Display content 2',
			'role': 'info.display',
			'type': 'string',
			'write': false,
			'read': true
		},
		native: {}
	});
	adapter.setObjectNotExists('display.displayContent3', {
		type: 'state',
		common: {
			'name': 'Display content 3',
			'role': 'info.display',
			'type': 'string',
			'write': false,
			'read': true
		},
		native: {}
	});
	adapter.setObjectNotExists('display.displayContent4', {
		type: 'state',
		common: {
			'name': 'Display content 4',
			'role': 'info.display',
			'type': 'string',
			'write': false,
			'read': true
		},
		native: {}
	});
	adapter.setObjectNotExists('display.displayContent5', {
		type: 'state',
		common: {
			'name': 'Display content 5',
			'role': 'info.display',
			'type': 'string',
			'write': false,
			'read': true
		},
		native: {}
	});
	adapter.setObjectNotExists('display.displayContent6', {
		type: 'state',
		common: {
			'name': 'Display content 6',
			'role': 'info.display',
			'type': 'string',
			'write': false,
			'read': true
		},
		native: {}
	});
	adapter.setObjectNotExists('display.displayContent7', {
		type: 'state',
		common: {
			'name': 'Display content 7',
			'role': 'info.display',
			'type': 'string',
			'write': false,
			'read': true
		},
		native: {}
	});
	adapter.setObjectNotExists('display.displayContent8', {
		type: 'state',
		common: {
			'name': 'Display content 8',
			'role': 'info.display',
			'type': 'string',
			'write': false,
			'read': true
		},
		native: {}
	});
	
	adapter.setObjectNotExists('zoneMain.iconURL', {
		type: 'state',
		common: {
        		'name': 'Cover',
        		'role': 'media.cover',
        		'type': 'string',
        		'write': false,
        		'read': true
        	},
        	native: {}
    	});
	
    	adapter.setState('zoneMain.iconURL', 'http://' + host + '/NetAudio/art.asp-jpg', true);
	displayAbility = true;
	adapter.log.debug('[INFO] <== Display Content created')
	if (cb && typeof(cb) === "function") return cb();
    } // endCreateDisplayAndHttp
    
    function createMonitorState(cb) {
	
	adapter.setObjectNotExists('settings.outputMonitor', {
            type: 'state',
            common: {
                name: 'Output monitor',
                role: 'video.output',
                type: 'number',
                write: true,
                read: true,
                states: {
                    '0': 'AUTO',
                    '1': '1',
                    '2': '2'
                }
            },
            native: {}
        });
	
	multiMonitor = true;	
	if (cb && typeof(cb) === "function") return cb();
    } // endCreateMonitorState

} // endMain
