/**
 * DENON AVR adapter
 */

/* jshint -W097 */
/*jslint node: true */
'use strict';

// you have to require the utils module and call adapter function
const utils = require(__dirname + '/lib/utils'); // Get common adapter utils
const net = require('net'); // import net

// adapter will be restarted automatically every time as the configuration changed, e.g system.adapter.denon.0
const adapter = new utils.Adapter('denon');
const ssdpScan = require('./lib/upnp').ssdpScan;
let updateTimer = null;

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
    if (typeof obj === 'object') {
        if (obj.command === 'browse') {
            // e.g. send email or pushover or whatever
            if (obj.callback) {
                adapter.log.info('start browse');
                ssdpScan(
                    'M-SEARCH * HTTP/1.1\r\n' +
                    'HOST: 239.255.255.250:1900\r\n' +
                    'ST: ssdp:all\r\n' +
                    'MAN: "ssdp:discover"\r\n' +
                    'MX: 3\r\n' +
                    '\r\n', true, 4000, (err, result) => {
                        if (result) {
                            result = result.filter(dev => dev.manufacturer && (dev.manufacturer.toLowerCase() === 'marantz' || dev.manufacturer.toLowerCase() === 'denon')).map(dev => {
                                return {ip: dev.ip, name: dev.name}
                            });
                        }
                        adapter.sendTo(obj.from, obj.command, {error: err, list: result}, obj.callback);
                    }
                );
            }
        }
    }
});

// is called when databases are connected and adapter received configuration.
// start here!
adapter.on('ready', () => {
    if (adapter.config.ip) {
        adapter.log.info('Starting DENON AVR adapter');
        main();
    } else {
        adapter.log.warn('No IP-address set');
    }
});

function main() {

    // Constants & Variables
    const client = new net.Socket();
    const host = adapter.config.ip;
    const volumeInDB = adapter.config.volumeInDB;
    const statesMapping = {};
    let zoneTwo = false;
    let zoneThree = false;
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
        if (updateTimer) {
            clearInterval(updateTimer);
            updateTimer = null;
        }
        // Connect again in 30 seconds
        setTimeout(() => connect(), 30000);
    });

    // Connection handling
    client.on('error', error => {
        if (connectingVar) return;
        if (error.code === 'ECONNREFUSED') adapter.log.warn('Connection refused, make sure that there is no other Telnet connection');
        else if (error.code === 'EHOSTUNREACH') adapter.log.warn('AVR unreachable, check the Network Config of your AVR');
        else if (error.code === 'EALREADY' || error.code === 'EISCONN') return adapter.log.warn('Adapter is already connecting/connected');
        else adapter.log.warn('Connection closed: ' + error);
        adapter.setState('info.connection', false, true);
        if (updateTimer) {
            clearInterval(updateTimer);
            updateTimer = null;
        }
        if (!connectingVar) {
            client.destroy();
            client.unref();
            // Connect again in 30 seconds
            connectingVar = setTimeout(() => connect(), 30000);
        } // endIf
    });

    client.on('end', () => { // Denon has closed the connection
        adapter.log.warn('Denon AVR has cancelled the connection');
        adapter.setState('info.connection', false, true);
        if (updateTimer) {
            clearInterval(updateTimer);
            updateTimer = null;
        }
        if (!connectingVar) {
            client.destroy();
            client.unref();
            // Connect again in 30 seconds
            connectingVar = setTimeout(() => connect(), 30000);
        } // endIf
    });

    client.on('connect', () => { // Successfully connected
        clearTimeout(connectingVar);
        connectingVar = null;
        adapter.setState('info.connection', true, true);
        adapter.log.info('[CONNECT  ] Adapter connected to DENON-AVR: ' + host + ':23');
        adapter.log.debug('[CONNECT  ] Connected --> updating states on start');
        updateStates(pollStates);
        updateTimer = setInterval(() => updateStates(pollStates), adapter.config.pollInterval);
    });

    client.on('data', data => {
        // split data by <cr>
        const dataArr = data.toString().split(/[\r\n]+/); // Split by Carriage Return
        for (let i = 0; i < dataArr.length; i++) {
            if (dataArr[i]) {
                adapter.log.debug('[DATA    ] <== Incoming data: ' + dataArr[i]);
                handleResponse(dataArr[i]);
            } // endIf
        } // endFor
    });

    // Handle state changes
    adapter.on('stateChange', (id, state) => {
        if (!id || !state || state.ack) { // Ignore acknowledged state changes or error states
            return;
        } // endIf
        const fullId = id;
        id = id.substring(adapter.namespace.length + 1);

        state = state.val; // only get state value

        adapter.log.debug('[COMMAND ] State Change - ID: ' + id + '; State: ' + state);
        let quickNr;
        const m = id.match(/(\w+)\.quickSelect(\d)$/);
        if (m) {
            quickNr = m[2];
            id = m[1] + '.quickSelect';
        } // endElseIf

        let leadingZero;
        switch (id) {
            case 'zoneMain.powerZone':
                if (state) {
                    sendRequest('ZMON');
                } else {
                    sendRequest('ZMOFF');
                }
                break;
            case 'zoneMain.volume':
                if (state < 0) state = 0;
                if (state % 0.5) state = Math.round(state * 2) / 2;
                if (state < 10) {
                    leadingZero = '0';
                } else {
                    leadingZero = '';
                }
                state = state.toString().replace('.', ''); // remove points
                sendRequest('MV' + leadingZero + state);
                adapter.log.debug('[INFO    ] <== Changed mainVolume to ' + state);
                break;
            case 'zoneMain.volumeDB':
                state += 80; // convert to Vol
                if (state < 0) state = 0;
                if (state % 0.5) state = Math.round(state * 2) / 2;
                if (state < 10) {
                    leadingZero = '0';
                } else {
                    leadingZero = '';
                }
                state = state.toString().replace('.', ''); // remove points
                sendRequest('MV' + leadingZero + state);
                adapter.log.debug('[INFO    ] <== Changed mainVolume to ' + state);
                break;
            case 'zoneMain.volumeUp':
                sendRequest('MVUP');
                break;
            case 'zoneMain.volumeDown':
                sendRequest('MVDOWN');
                break;
            case 'zoneMain.muteIndicator':
                if (state) {
                    sendRequest('MUON')
                } else {
                    sendRequest('MUOFF')
                } // endElseIf
                break;
            case 'zoneMain.playPause':
                sendRequest('NS94');
                break;
            case 'zoneMain.skipMinus':
                sendRequest('NS9E');
                break;
            case 'zoneMain.skipPlus':
                sendRequest('NS9D');
                break;
            case 'zoneMain.selectInput':
                adapter.getObject('selectInput', (err, obj) => {
                    sendRequest('SI' + decodeState(obj.common.states, state).toUpperCase());
                });
                break;
            case 'zoneMain.sleepTimer':
                if (!state) {
                    sendRequest('SLPOFF');
                } else if (state < 10) {
                    sendRequest('SLP' + '00' + state);
                } else if (state < 100) {
                    sendRequest('SLP' + '0' + state);
                } else if (state <= 120) {
                    sendRequest('SLP' + state);
                } // endElseIf
                break;

            case 'display.brightness':
                adapter.getObject('display.brightness', (err, obj) => {
                    sendRequest('DIM ' + decodeState(obj.common.states, state).toUpperCase());
                });
                break;

            case 'zone2.powerZone':
                if (state) {
                    sendRequest('Z2ON');
                } else {
                    sendRequest('Z2OFF');
                } // endElseIf
                break;
            case 'zone2.muteIndicator':
                if (state) {
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
                if (state < 0) state = 0;
                if (state % 0.5) state = Math.round(state * 2) / 2;
                if (state < 10) {
                    leadingZero = '0';
                } else {
                    leadingZero = '';
                }
                state = state.toString().replace('.', ''); // remove points
                sendRequest('Z2' + leadingZero + state);
                break;
            case 'zone2.volumeDB':
                state += 80; // Convert to Vol
                if (state < 0) state = 0;
                if (state % 0.5) state = Math.round(state * 2) / 2;
                if (state < 10) {
                    leadingZero = '0';
                } else {
                    leadingZero = '';
                }
                state = state.toString().replace('.', ''); // remove points
                sendRequest('Z2' + leadingZero + state);
                break;
            case 'zone2.selectInput':
                adapter.getObject('zone2.selectInput', (err, obj) => {
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
                if (state) {
                    sendRequest('Z3ON');
                } else {
                    sendRequest('Z3OFF');
                } // endElseIf
                break;
            case 'zone3.muteIndicator':
                if (state) {
                    sendRequest('Z3MUON')
                } else {
                    sendRequest('Z3MUOFF');
                } // endElseIf
                break;
            case 'zone2.equalizerBass':
                state = dbToAscii(state);
                sendRequest('Z2PSBAS ' + state);
                break;
            case 'zone2.equalizerTreble':
                state = dbToAscii(state);
                sendRequest('Z2PSTRE ' + state);
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

            case 'zone3.volumeUp':
                sendRequest('Z3UP');
                break;
            case 'zone3.volumeDown':
                sendRequest('Z3DOWN');
                break;
            case 'zone3.volume':
                if (state < 0) state = 0;
                if (state % 0.5) state = Math.round(state * 2) / 2;
                if (state < 10) {
                    leadingZero = '0';
                } else {
                    leadingZero = '';
                }
                state = state.toString().replace('.', ''); // remove points
                sendRequest('Z3' + leadingZero + state);
                break;
            case 'zone3.volumeDB':
                state += 80; // Convert to Vol
                if (state < 0) state = 0;
                if (state % 0.5) state = Math.round(state * 2) / 2;
                if (state < 10) {
                    leadingZero = '0';
                } else {
                    leadingZero = '';
                }
                state = state.toString().replace('.', ''); // remove points
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
            case 'zone2.sleepTimer':
                if (!state) {
                    sendRequest('Z2SLPOFF');
                } else if (state < 10) {
                    sendRequest('Z2SLP' + '00' + state);
                } else if (state < 100) {
                    sendRequest('Z2SLP' + '0' + state);
                } else if (state <= 120) {
                    sendRequest('Z2SLP' + state);
                } // endElseIf
                break;
            case 'zone3.sleepTimer':
                if (!state) {
                    sendRequest('Z3SLPOFF');
                } else if (state < 10) {
                    sendRequest('Z3SLP' + '00' + state);
                } else if (state < 100) {
                    sendRequest('Z3SLP' + '0' + state);
                } else if (state <= 120) {
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

            case 'settings.powerSystem':
                if (state) {
                    sendRequest('PWON')
                } else {
                    sendRequest('PWSTANDBY')
                } // endElseIf
                break;
            case 'settings.surroundMode':
                adapter.getObject('settings.surroundMode', (err, obj) => {
                    sendRequest('MS' + decodeState(obj.common.states, state).toUpperCase());
                });
                break;
            case 'settings.expertCommand': // Sending custom commands
                const expertState = state;
                sendRequest(state);
                adapter.getState('info.connection', (err, state) => {
                    if (state.val) adapter.setState('expertCommand', expertState, true);
                });
                break;
            case 'settings.dynamicEq':
                if (state) {
                    sendRequest('PSDYNEQ ON');
                } else {
                    sendRequest('PSDYNEQ OFF');
                }
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
                if (state) {
                    sendRequest('PSSWL ON');
                } else {
                    sendRequest('PSSWL OFF');
                }
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
                if (state) {
                    sendRequest('PSLFC ON');
                } else {
                    sendRequest('PSLFC OFF');
                }
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
            case 'settings.equalizerBassUp':
                sendRequest('PSBAS UP');
                break;
            case 'settings.equalizerBassDown':
                sendRequest('PSBAS DOWN');
                break;
            case 'settings.equalizerTrebleUp':
                sendRequest('PSTRE UP');
                break;
            case 'settings.equalizerTrebleDown':
                sendRequest('PSTRE DOWN');
                break;
            case 'settings.equalizerBass':
                state = dbToAscii(state);
                sendRequest('PSBAS ' + state);
                break;
            case 'settings.equalizerTreble':
                state = dbToAscii(state);
                sendRequest('PSTRE ' + state);
                break;
            case 'settings.toneControl':
                if (state) {
                    sendRequest('PSTONE CTRL ON');
                } else {
                    sendRequest('PSTONE CTRL OFF');
                }
                break;
        } // endSwitch
    }); // endOnStateChange

    // all states changes inside the adapters namespace are subscribed
    adapter.subscribeStates('*');

    adapter.getForeignObject(adapter.namespace, (err, obj) => {
        if (!obj) {
            adapter.setForeignObject(adapter.namespace, {
                type: 'device',
                common: {
                    name: 'DENON device'
                }
            });
        }
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

    const updateCommandsStates = [
        'NSET1 ?', 'NSFRN ?', 'ZM?',
        'MU?', 'PW?', 'SI?', 'SV?',
        'MS?', 'MV?', 'Z2?', 'Z2MU?',
        'Z3?', 'Z3MU?',
        'VSSC ?', 'VSASP ?',
        'VSMONI ?', 'TR?', 'DIM ?',
        'Z3SLP?', 'Z2SLP?', 'SLP?',
        'PSDYNEQ ?', 'PSMULTEQ: ?',
        'PSREFLEV ?', 'PSDYNVOL ?',
        'PSLFC ?', 'PSCNTAMT ?',
        'PSSWL ?', 'PSBAS ?',
        'PSTRE ?', 'Z2PSTRE ?',
        'Z3PSTRE ?', 'Z2PSBAS ?',
        'Z3PSBAS ?', 'PSTONE CTRL ?'
    ];

    function updateStates(i, cb) {
        if (typeof i === 'function') {
            cb = i;
            i = 0;
        }
        i = i || 0;
        if (i >= updateCommandsStates.length) {
            adapter.log.debug('[STATES 1] <== END ==============================');
            cb && cb();
        } else {
            !i && adapter.log.debug('[STATES 1] ==> START ================================');
            sendRequest(updateCommandsStates[i]);
            setTimeout(updateStates, adapter.config.requestInterval || 100, i + 1, cb);
        }
    } // endUpdateStates

    const updateCommands = ['NSE', 'SV?', 'SLP?', 'Z2SLP?', 'Z3SLP?']; // Request Display State & Keep HEOS alive

    function pollStates(i, cb) { // Polls states
        if (typeof i === 'function') {
            cb = i;
            i = 0;
        }
        i = i || 0;
        if (i >= updateCommands.length) {
            adapter.log.debug('[STATES 2] <== END ================================');
            cb && cb();
        } else {
            !i && adapter.log.debug('[STATES 2] ==> START ==============================');
            sendRequest(updateCommands[i]);
            setTimeout(pollStates, adapter.config.requestInterval || 100, i + 1, cb);
        }
    } // endPollingStates

    function sendRequest(req) {
        client.write(req + '\r');
        if (updateCommandsStates.indexOf(req)) {
            adapter.log.debug('[STATES 1] ==> Message sent: ' + req);
        } else if (updateCommands.indexOf(req)) {
            adapter.log.debug('[STATES 2] ==> Message sent: ' + req);
        } else {
            adapter.log.debug('[COMMAND ] ==> Message sent: ' + req);
        }
    } // endSendRequest

    function numberToString(states, val, id) {
        Object.keys(states).forEach(i => {
            if (states[i] === val) {
                adapter.setState(id, parseInt(i, 10), true);
                return false;
            }
        });
    }

    function handleResponse(data) {
        // get command out of String
        let command;
        if (data.startsWith('Z2')) { // Transformation for Zone2 commands
            // Create Zone2 states if not done yet
            if (!zoneTwo) {
                createZoneTwo();
            }
            command = data.replace(/\s+|\d+/g, '');

            if (command === 'Z') { // If everything is removed except Z --> Volume
                let vol = data.substring(2).replace(/\s|[A-Z]/g, '');
                vol = vol.substring(0, 2) + '.' + vol.slice(2, 4); // Slice volume from string
                adapter.setState('zone2.volume', parseFloat(vol), true);
                if (volumeInDB) {
                    adapter.setState('zone2.volumeDB', parseFloat(vol) - 80, true);
                }
                return;
            } else {
                command = 'Z2' + command.substring(1);
            } // endElseIf

            if (command.startsWith('Z2')) { // Encode Input Source
                let zTwoSi = data.substring(2);
                zTwoSi = zTwoSi.replace(' ', ''); // Remove blanks
                if (statesMapping.selectInput) {
                    numberToString(statesMapping.selectInput, zTwoSi, 'zone2.selectInput');
                } else {
                    adapter.getObject('zoneMain.selectInput', (err, obj) => {
                        statesMapping.selectInput = obj.common.states;
                        numberToString(statesMapping.selectInput, zTwoSi, 'zone2.selectInput');
                    });
                }
            } // endIf
        } else if (data.startsWith('Z3')) { // Transformation for Zone3 commands
            // Create Zone 3 states if not done yet
            if (!zoneThree) {
                createZoneThree();
            }
            command = data.replace(/\s+|\d+/g, '');
            if (command === 'Z') { // if everything is removed except Z --> Volume
                let vol = data.substring(2).replace(/\s|[A-Z]/g, '');
                vol = vol.substring(0, 2) + '.' + vol.slice(2, 4); // Slice volume from string
                adapter.setState('zone3.volume', parseFloat(vol), true);
                if (volumeInDB) {
                    adapter.setState('zone3.volumeDB', parseFloat(vol) - 80, true);
                }
                return;
            } else {
                command = 'Z3' + command.substring(1);
            } // endElseIf
            if (command.startsWith('Z3')) { // Encode Input Source
                let zThreeSi = data.substring(2);
                zThreeSi = zThreeSi.replace(' ', ''); // Remove blanks
                if (statesMapping.selectInput) {
                    numberToString(statesMapping.selectInput, zThreeSi, 'zone3.selectInput');
                } else {
                    adapter.getObject('zoneMain.selectInput', (err, obj) => {
                        statesMapping.selectInput = obj.common.states;
                        numberToString(statesMapping.selectInput, zThreeSi, 'zone3.selectInput');
                    });
                }
            } // endIf
        } else { // Transformations for normal commands
            command = data.replace(/\s+|\d+/g, '');
        } // endElse

        if (command.startsWith('DIM')) { // Handle display brightness
            let bright = data.substring(4);
            bright = bright.replace(' ', '').toLowerCase(); // Remove blanks
            if (!statesMapping['display.brightness']) {
                adapter.getObject('display.brightness', (err, obj) => {
                    statesMapping['display.brightness'] = obj.common.states;
                    const mapStates = statesMapping['display.brightness'];
                    Object.keys(mapStates).forEach(i => {
                        if (mapStates[i].toLowerCase().includes(bright)) {
                            adapter.setState('display.brightness', parseInt(i, 10), true);
                            return false;
                        }
                    });
                });
            } else {
                const mapStates = statesMapping['display.brightness'];
                Object.keys(mapStates).forEach(i => {
                    if (mapStates[i].toLowerCase().includes(bright)) {
                        adapter.setState('display.brightness', parseInt(i, 10), true);
                        return false;
                    }
                });
            }

        } else if (command.startsWith('SI')) { // Handle select input
            let siCommand = data.substring(2); // Get only source name
            siCommand = siCommand.replace(' ', ''); // Remove blanks
            adapter.log.debug('[INFO    ] <== SI-Command: ' + siCommand);
            if (statesMapping.selectInput) {
                numberToString(statesMapping.selectInput, siCommand, 'zoneMain.selectInput');
            } else {
                adapter.getObject('zoneMain.selectInput', (err, obj) => {
                    statesMapping.selectInput = obj.common.states;
                    numberToString(statesMapping.selectInput, siCommand, 'zoneMain.selectInput');
                });
            }
            return;
        } else if (command.startsWith('MS')) { // Handle Surround mode
            const msCommand = command.substring(2);
            if (statesMapping.surroundMode) {
                numberToString(statesMapping.surroundMode, msCommand, 'settings.surroundMode');
            } else {
                adapter.getObject('settings.surroundMode', (err, obj) => {
                    statesMapping.surroundMode = obj.common.states;
                    numberToString(statesMapping.surroundMode, msCommand, 'settings.surroundMode');
                });
            }
            return;
        } else if (command.startsWith('NSE')) { // Handle display content
            const displayCont = data.substring(4).replace(/[\0\1\2]/, ''); // Remove STX, SOH, NULL
            const dispContNr = data.slice(3, 4);
            adapter.setState('display.displayContent' + dispContNr, displayCont, true);
            return;
        } else if (command.startsWith('NSFRN')) { // Handle friendly name
            adapter.setState('info.friendlyName', data.substring(6), true);
            return;
        } else if (command.startsWith('PSMULTEQ')) {
            const state = data.split(':')[1];
            if (statesMapping.multEq) {
                numberToString(statesMapping.multEq, state, 'settings.multEq');
            } else {
                adapter.getObject('settings.multEq', (err, obj) => {
                    statesMapping.multEq = obj.common.states;
                    numberToString(statesMapping.multEq, state, 'settings.multEq');
                });
            }
        } else if (command.startsWith('PSDYNVOL')) {
            const state = data.split(' ')[1];
            if (statesMapping.dynamicVolume) {
                numberToString(statesMapping.dynamicVolume, state, 'settings.dynamicVolume');
            } else {
                adapter.getObject('settings.dynamicVolume', (err, obj) => {
                    statesMapping.dynamicVolume = obj.common.states;
                    numberToString(statesMapping.dynamicVolume, state, 'settings.dynamicVolume');
                });
            }
        }// endElseIf

        adapter.log.debug('[INFO    ] <== Command to handle is ' + command);

        switch (command) {
            case 'PWON':
                adapter.setState('settings.powerSystem', true, true);
                break;
            case 'PWSTANDBY':
                adapter.setState('settings.powerSystem', false, true);
                break;
            case 'MV':
                data = data.slice(2, 4) + '.' + data.slice(4, 5); // Slice volume from string
                adapter.setState('zoneMain.volume', parseFloat(data), true);
                if (volumeInDB) {
                    adapter.setState('zoneMain.volumeDB', parseFloat(data) - 80, true);
                }
                break;
            case 'MVMAX':
                data = data.slice(6, 8) + '.' + data.slice(8, 9);
                adapter.setState('zoneMain.vmaximumVolume', parseFloat(data), true);
                if (volumeInDB) {
                    adapter.setState('maximumVolumeDB', parseFloat(data) - 80, true);
                }
                break;
            case 'MUON':
                adapter.setState('zoneMain.vmuteIndicator', true, true);
                break;
            case 'MUOFF':
                adapter.setState('zoneMain.vmuteIndicator', false, true);
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
                adapter.setState('zoneMain.sleepTimer', parseFloat(data.substring(3)), true);
                break;
            case 'SLPOFF':
                adapter.setState('zoneMain.sleepTimer', 0, true);
                break;
            case 'Z2SLP':
                adapter.setState('zone2.sleepTimer', parseFloat(data.substring(5)), true);
                break;
            case 'Z2SLPOFF':
                adapter.setState('zone2.sleepTimer', 0, true);
                break;
            case 'Z3SLP':
                adapter.setState('zone3.sleepTimer', parseFloat(data.substring(5)), true);
                break;
            case 'Z3SLPOFF':
                adapter.setState('zone3.sleepTimer', 0, true);
                break;
            case 'PSDYNEQON':
                adapter.setState('settings.dynamicEq', true, true);
                break;
            case 'PSDYNEQOFF':
                adapter.setState('settings.dynamicEq', false, true);
                break;
            case 'PSSWLON':
                adapter.setState('settings.subwooferLevelState', true, true);
                break;
            case 'PSSWLOFF':
                adapter.setState('settings.subwooferLevelState', false, true);
                break;
            case 'PSSWL': // Handle Subwoofer Level for first and second SW
                {
                    command = data.split(' ')[0];
                    let state_ = data.split(' ')[1];
                    state_ = asciiToDb(state_);
                    if (command === 'PSSWL') { // Check if PSSWL or PSSWL2
                        adapter.setState('settings.subwooferLevel', parseFloat(state_), true);
                    } else {
                        adapter.setState('settings.subwooferTwoLevel', parseFloat(state_), true);
                    }
                }
                break;
            case 'PSLFCON':
                adapter.setState('settings.audysseyLfc', true, true);
                break;
            case 'PSLFCOFF':
                adapter.setState('settings.audysseyLfc', false, true);
                break;
            case 'PSCNTAMT':
                adapter.setState('settings.containmentAmount', parseFloat(data.split(' ')[1]), true);
                break;
            case 'PSREFLEV':
                adapter.setState('settings.referenceLevelOffset', data.split(' ')[1], true);
                break;
            case 'PSBAS':
                {
                    let state_ = data.split(' ')[1];
                    state_ = asciiToDb(state_);
                    adapter.setState('zoneMain.equalizerBass', state_, true);
                }
                break;
            case 'PSTRE':
                {
                    let state_ = data.split(' ')[1];
                    state_ = asciiToDb(state_);
                    adapter.setState('zoneMain.equalizerTreble', state_, true);
                }
                break;
            case 'ZPSTRE':
                command = data.split(' ')[0];
                const state_ = data.split(' ')[1];
                if (command === 'Z2PSTRE') {
                    adapter.setState('zone2.equalizerTreble', state_, true);
                } else {
                    adapter.setState('zone3.equalizerTreble', state_, true);
                }
                break;
            case 'ZPSBAS':
                {
                    command = data.split(' ')[0];
                    const state_ = data.split(' ')[1];
                    if (command === 'Z2PSBAS') {
                        adapter.setState('zone2.equalizerBass', state_, true);
                    } else {
                        adapter.setState('zone3.equalizerBass', state_, true);
                    }
                }
                break;
            case 'PSTONECTRLON':
                adapter.setState('settings.toneControl', true, true);
                break;
            case 'PSTONECTRLOFF':
                adapter.setState('settings.toneControl', false, true);
                break;

        } // endSwitch
    } // endHandleResponse

    function decodeState(stateNames, state) { // decoding for e. g. selectInput
        const stateArray = Object.keys(stateNames).map(key => stateNames[key]);
        for (let i = 0; i < stateArray.length; i++) {
            if (state.toString().toUpperCase() === stateArray[i].toUpperCase() || i.toString() === state.toString()) {
                return stateArray[i];
            }
        } // endFor
        return '';
    } // endDecodeState

    function asciiToDb(vol) {
        if (vol.length === 3) vol = vol / 10;
        vol -= 50; // Vol to dB
        return vol;
    } // endVolToDb

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
                    max: 18
                }
            });
            adapter.setObjectNotExists('zoneMain.maximumVolumeDB', {
                type: 'state',
                common: {
                    name: 'Maximum Volume DB',
                    role: 'state',
                    type: 'number',
                    write: false,
                    read: true
                }
            });
        } else { // delete dB States
            adapter.delObject('zoneMain.volumeDB');
            adapter.delObject('zoneMain.maximumVolumeDB');
        } // endElseIf

    } // endCreateVolumeDB

    function createZoneTwo() {
        adapter.setObjectNotExists('zone2', {
            type: 'channel',
            common: {
                name: 'Zone2'
            },
            native: {}
        });

        adapter.setObjectNotExists('zone2.powerZone', {
            type: 'state',
            common: {
                name: 'Zone2 Power State',
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
                    name: 'Zone2 Volume',
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
                    name: 'Zone2 VolumeDB',
                    role: 'level.volume',
                    type: 'number',
                    unti: 'dB',
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
                name: 'Zone2 VolumeUp',
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
                name: 'zone2.volumeDown',
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
                name: 'Zone2 Select input',
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
                name: 'Zone2 Muted',
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
                name: 'Zone2 Quick select 1',
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
                name: 'Zone2 Quick select 2',
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
                name: 'Zone2 Quick select 3',
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
                name: 'Zone2 Quick select 4',
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
                name: 'Zone2 Quick select 5',
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
                name: 'Zone2 Sleep timer',
                role: 'media.timer.sleep',
                unit: 'sec',
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
                name: 'Zone2 Bass Level',
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
                'name': 'Zone2 Bass Up',
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
                name: 'Zone2 Bass Down',
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
                name: 'Zone2 Treble',
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
                'name': 'Zone2 Treble Up',
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
                'name': 'Zone2 Treble Down',
                'role': 'button',
                'type': 'boolean',
                'write': true,
                'read': false
            },
            native: {}
        });

        zoneTwo = true;
        adapter.log.debug('[INFO    ] <== Zone 2 detected');
    } // endCreateZoneTwo

    function createZoneThree() {
        adapter.setObjectNotExists('zone3', {
            type: 'channel',
            common: {
                name: 'Zone3'
            },
            native: {}
        });

        adapter.setObjectNotExists('zone3.powerZone', {
            type: 'state',
            common: {
                name: 'Zone3 Power State',
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
                    name: 'Zone3 volume',
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
                    name: 'Zone3 volumeDB',
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
                name: 'Zone3 Volume Up',
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
                name: 'Zone3 Volume Down',
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
                name: 'Zone3 Select input',
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
                name: 'Zone3 Mute Indicator',
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
                name: 'Zone3 Quick select 1',
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
                name: 'Zone3 Quick select 2',
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
                name: 'Zone3 Quick select 3',
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
                name: 'Zone3 Quick select 4',
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
                name: 'Zone3 Quick select 5',
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
                name: 'Zone3 Sleep Timer',
                role: 'level.timer.sleep',
                type: 'number',
                unit: 'sec',
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
                name: 'Zone3 Bass Level',
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
                name: 'Zone3 Bass Up',
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
                name: 'Zone3 Bass Down',
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
                name: 'Zone3 Treble',
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
                'name': 'Zone3 Treble Up',
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
                'name': 'Zone3 Treble Down',
                'role': 'button',
                'type': 'boolean',
                'write': true,
                'read': false
            },
            native: {}
        });

        zoneThree = true;
        adapter.log.debug('[INFO    ] <== Zone 3 detected');
    } // endCreateZoneThree

} // endMain
