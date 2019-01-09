/**
 * DENON AVR adapter
 */

/* jshint -W097 */// jshint strict:false
/*jslint node: true */
'use strict';

const utils = require('@iobroker/adapter-core');
const net = require('net');
const helper = require(__dirname + '/lib/utils');
const ssdpScan = require('./lib/upnp').ssdpScan;
const client = new net.Socket();

// Constants & Variables
let adapter;
let host;
let volumeInDB;
let pollInterval;
let requestInterval;
let verboseConnection = true;
let previousError;

const zonesCreated = {};
let displayAbility = false;
let multiMonitor = false;
let pollingVar = null;
let connectingVar = null;
let subTwo = false;
let audysseyLfc = false;
let pictureModeAbility = false;
let receiverType;

function startAdapter(options) {
    options = options || {};
    Object.assign(options, {
        name: 'denon'
    });

    adapter = new utils.Adapter(options);

    adapter.on('unload', callback => {
        try {
            adapter.log.info('[END] Stopping Denon AVR adapter...');
            adapter.setState('info.connection', false, true);
            client.destroy(); // kill connection
            client.unref();	// kill connection
            callback();
        } catch (e) {
            callback();
        } // endTryCatch
    });

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
                                    return {ip: dev.ip, name: dev.name};
                                });
                            } // endIf
                            adapter.sendTo(obj.from, obj.command, {error: err, list: result}, obj.callback);
                        });
                } // endIf
            } // endIf
        } // endIf
    });

    adapter.on('ready', () => {
        if (adapter.config.ip) {

            adapter.log.info('[START] Starting DENON AVR adapter');
            host = adapter.config.ip;
            volumeInDB = adapter.config.volumeInDB;
            pollInterval = adapter.config.pollInterval || 7000;
            requestInterval = adapter.config.requestInterval || 100;

            adapter.getForeignObjectAsync(adapter.namespace).then((obj) => { // create device namespace
                if (!obj) {
                    adapter.setForeignObject(adapter.namespace, {
                        type: 'device',
                        common: {
                            name: 'DENON device'
                        }
                    });
                } // endIf
            });

            main();

        } else adapter.log.warn('No IP-address set');
    });

    // Handle state changes
    adapter.on('stateChange', (id, state) => {
        if (!id || !state || state.ack) return; // Ignore acknowledged state changes or error states

        id = id.substring(adapter.namespace.length + 1); // remove instance name and id
        state = state.val; // only get state value

        adapter.log.debug('[COMMAND] State Change - ID: ' + id + '; State: ' + state);

        if (receiverType === 'US') return handleUsStateChange(id, state);

        let leadingZero;

        switch (id) {
            case 'zoneMain.powerZone':
                if (state === true) {
                    sendRequest('ZMON');
                } else sendRequest('ZMOFF');
                break;
            case 'zoneMain.volume':
                if (state < 0) state = 0;
                if ((state % 0.5) !== 0) state = Math.round(state * 2) / 2;
                if (state < 10) {
                    leadingZero = '0';
                } else leadingZero = '';
                state = state.toString().replace('.', ''); // remove points
                sendRequest('MV' + leadingZero + state);
                adapter.log.debug('[INFO] <== Changed mainVolume to ' + state);
                break;
            case 'zoneMain.volumeDB':
                state += 80; // convert to Vol
                if (state < 0) state = 0;
                if ((state % 0.5) !== 0) state = Math.round(state * 2) / 2;
                if (state < 10) {
                    leadingZero = '0';
                } else leadingZero = '';
                state = state.toString().replace('.', ''); // remove points
                sendRequest('MV' + leadingZero + state);
                adapter.log.debug('[INFO] <== Changed mainVolume to ' + state);
                break;
            case 'zoneMain.sleepTimer':
                if (!state) { // state === 0
                    sendRequest('SLPOFF');
                } else if (state < 10) {
                    sendRequest('SLP' + '00' + state);
                } else if (state < 100) {
                    sendRequest('SLP' + '0' + state);
                } else if (state <= 120) {
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
                if (state === true) {
                    sendRequest('MUON');
                } else {
                    sendRequest('MUOFF');
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
                adapter.getObjectAsync('zoneMain.selectInput').then((obj) => {
                    sendRequest('SI' + helper.decodeState(obj.common.states, state).toUpperCase());
                });
                break;
            case 'zoneMain.quickSelect':
                sendRequest('MSQUICK' + state).then(() => sendRequest('MSSMART' + state));
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
                state = helper.dbToVol(state);
                sendRequest('PSBAS ' + state);
                break;
            case 'zoneMain.equalizerTreble':
                state = helper.dbToVol(state);
                sendRequest('PSTRE ' + state);
                break;
            case 'settings.powerSystem':
                if (state === true) {
                    sendRequest('PWON');
                } else {
                    sendRequest('PWSTANDBY');
                } // endElseIf
                break;
            case 'settings.dynamicEq':
                if (state) {
                    sendRequest('PSDYNEQ ON');
                } else sendRequest('PSDYNEQ OFF');
                break;
            case 'settings.subwooferLevel':
                state = helper.dbToVol(state);
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
                } else sendRequest('PSSWL OFF');
                break;
            case 'settings.subwooferTwoLevel':
                state = helper.dbToVol(state);
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
                adapter.getObjectAsync('settings.multEq').then((obj) => {
                    sendRequest('PSMULTEQ:' + helper.decodeState(obj.common.states, state).toUpperCase());
                });
                break;
            case 'settings.dynamicVolume':
                adapter.getObjectAsync('settings.dynamicVolume').then((obj) => {
                    sendRequest('PSDYNVOL ' + helper.decodeState(obj.common.states, state).toUpperCase());
                });
                break;
            case 'settings.referenceLevelOffset':
                sendRequest('PSREFLEV ' + state);
                break;
            case 'settings.surroundMode':
                adapter.getObjectAsync('settings.surroundMode').then((obj) => {
                    sendRequest('MS' + helper.decodeState(obj.common.states, state).toUpperCase());
                });
                break;
            case 'settings.expertCommand': { // Sending custom commands
                const expertState = state;
                sendRequest(state);
                adapter.getStateAsync('info.connection').then((state) => {
                    if (state.val === true) adapter.setState('settings.expertCommand', expertState, true);
                });
                break;
            }
            case 'settings.toneControl':
                if (state) {
                    sendRequest('PSTONE CTRL ON');
                } else sendRequest('PSTONE CTRL OFF');
                break;
            case 'display.brightness':
                adapter.getObjectAsync('display.brightness').then((obj) => {
                    sendRequest('DIM ' + helper.decodeState(obj.common.states, state).toUpperCase().slice(0, 3));
                });
                break;
            case 'zone2.powerZone':
                if (state === true) {
                    sendRequest('Z2ON');
                } else {
                    sendRequest('Z2OFF');
                } // endElseIf
                break;
            case 'zone2.muteIndicator':
                if (state === true) {
                    sendRequest('Z2MUON');
                } else {
                    sendRequest('Z2MUOFF');
                } // endElseIf
                break;
            case 'zone2.sleepTimer':
                if (!state) { // state === 0
                    sendRequest('Z2SLPOFF');
                } else if (state < 10) {
                    sendRequest('Z2SLP' + '00' + state);
                } else if (state < 100) {
                    sendRequest('Z2SLP' + '0' + state);
                } else if (state <= 120) {
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
                if ((state % 0.5) !== 0) state = Math.round(state * 2) / 2;
                if (state < 10) {
                    leadingZero = '0';
                } else leadingZero = '';
                state = state.toString().replace('.', ''); // remove dot
                sendRequest('Z2' + leadingZero + state);
                break;
            case 'zone2.volumeDB':
                state += 80; // Convert to Vol
                if (state < 0) state = 0;
                if ((state % 0.5) !== 0) state = Math.round(state * 2) / 2;
                if (state < 10) {
                    leadingZero = '0';
                } else leadingZero = '';
                state = state.toString().replace('.', ''); // remove dot
                sendRequest('Z2' + leadingZero + state);
                break;
            case 'zone2.selectInput':
                adapter.getObjectAsync('zone2.selectInput').then((obj) => {
                    sendRequest('Z2' + helper.decodeState(obj.common.states, state).toUpperCase());
                });
                break;
            case 'zone2.quickSelect':
                sendRequest('Z2QUICK' + state).then(() => sendRequest('Z2SMART' + state));
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
                state = helper.dbToVol(state);
                sendRequest('Z2PSBAS ' + state);
                break;
            case 'zone2.equalizerTreble':
                state = helper.dbToVol(state);
                sendRequest('Z2PSTRE ' + state);
                break;
            case 'zone3.powerZone':
                if (state === true) {
                    sendRequest('Z3ON');
                } else {
                    sendRequest('Z3OFF');
                } // endElseIf
                break;
            case 'zone3.muteIndicator':
                if (state === true) {
                    sendRequest('Z3MUON');
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
                if ((state % 0.5) !== 0) state = Math.round(state * 2) / 2;
                if (state < 10) {
                    leadingZero = '0';
                } else leadingZero = '';
                state = state.toString().replace('.', ''); // remove points
                sendRequest('Z3' + leadingZero + state);
                break;
            case 'zone3.volumeDB':
                state += 80; // Convert to Vol
                if (state < 0) state = 0;
                if ((state % 0.5) !== 0) state = Math.round(state * 2) / 2;
                if (state < 10) {
                    leadingZero = '0';
                } else leadingZero = '';
                state = state.toString().replace('.', ''); // remove points
                sendRequest('Z3' + leadingZero + state);
                break;
            case 'zone3.selectInput':
                adapter.getObjectAsync('zone3.selectInput').then((obj) => {
                    sendRequest('Z3' + helper.decodeState(obj.common.states, state).toUpperCase());
                });
                break;
            case 'zone3.quickSelect':
                sendRequest('Z3QUICK' + state).then(() => sendRequest('Z3SMART' + state));
                break;
            case 'zone3.sleepTimer':
                if (!state) { // state === 0
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
                state = helper.dbToVol(state);
                sendRequest('Z3PSBAS ' + state);
                break;
            case 'zone3.equalizerTreble':
                state = helper.dbToVol(state);
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
                if (state) {
                    sendRequest('MNMEN ON');
                } else sendRequest('MNMEN OFF');
                break;
            case 'settings.outputMonitor':
                adapter.getObjectAsync('settings.outputMonitor').then((obj) => {
                    sendRequest('VSMONI' + helper.decodeState(obj.common.states, state));
                });
                break;
            case 'settings.centerSpread':
                if (state) sendRequest('PSCES ON');
                else sendRequest('PSCES OFF');
                break;
            case 'settings.videoProcessingMode':
                adapter.getObjectAsync('settings.videoProcessingMode').then((obj) => {
                    sendRequest('VSVPM' + helper.decodeState(obj.common.states, state));
                });
                break;
            case 'settings.pictureMode':
                sendRequest('PV' + state);
                break;
            case 'zoneMain.channelVolumeFrontLeft':
                sendRequest('CVFL ' + helper.dbToVol(state));
                break;
            case 'zoneMain.channelVolumeFrontRight':
                sendRequest('CVFR ' + helper.dbToVol(state));
                break;
            case 'zoneMain.channelVolumeCenter':
                sendRequest('CVC ' + helper.dbToVol(state));
                break;
            case 'zoneMain.channelVolumeSurroundRight':
                sendRequest('CVSR ' + helper.dbToVol(state));
                break;
            case 'zoneMain.channelVolumeSurroundLeft':
                sendRequest('CVSL ' + helper.dbToVol(state));
                break;
            case 'settings.loadPreset': {
                let loadPresetState;
                if (parseInt(state) < 10)
                    loadPresetState = '0' + state;
                else loadPresetState = state;
                adapter.log.warn(loadPresetState);
                sendRequest('NSB' + loadPresetState);
                break;
            }
            case 'settings.savePreset': {
                let savePresetState;
                if (parseInt(state) < 10)
                    savePresetState = '0' + state;
                else savePresetState = state;
                sendRequest('NSC' + savePresetState).then(() => sendRequest('NSH'));
                break;
            }
            default:
                adapter.log.error('[COMMAND] ' + id + ' is not a valid state');
        } // endSwitch
    }); // endOnStateChange

    return adapter;
} // endStartAdapter


function main() {
    adapter.subscribeStates('*');

    checkVolumeDB(volumeInDB).then(() => connect()); // Connect on start
} // endMain

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
    verboseConnection = error.code !== previousError;
    if (connectingVar) return;
    previousError = error.code;
    if (verboseConnection) {
        if (error.code === 'ECONNREFUSED') adapter.log.warn('Connection refused, make sure that there is no other Telnet connection');
        else if (error.code === 'EHOSTUNREACH') adapter.log.warn('AVR unreachable, check the Network Config of your AVR');
        else if (error.code === 'EALREADY' || error.code === 'EISCONN') return adapter.log.warn('Adapter is already connecting/connected');
        else adapter.log.warn('Connection closed: ' + error);
    } else {
        if (error.code === 'ECONNREFUSED') adapter.log.debug('Connection refused, make sure that there is no other Telnet connection');
        else if (error.code === 'EHOSTUNREACH') adapter.log.debug('AVR unreachable, check the Network Config of your AVR');
        else if (error.code === 'EALREADY' || error.code === 'EISCONN') return adapter.log.debug('Adapter is already connecting/connected');
        else adapter.log.warn('Connection closed: ' + error);
    }

    pollingVar = false;
    adapter.setState('info.connection', false, true);
    if (!connectingVar) {
        client.destroy();
        client.unref();
        connectingVar = setTimeout(() => connect(), 30000); // Connect again in 30 seconds
    } // endIf
});

client.on('end', () => { // Denon has closed the connection
    adapter.log.warn('Denon AVR has cancelled the connection');
    pollingVar = false;
    adapter.setState('info.connection', false, true);
    if (!connectingVar) {
        client.destroy();
        client.unref();
        connectingVar = setTimeout(() => connect(), 30000); // Connect again in 30 seconds
    } // endIf
});

client.on('connect', () => { // Successfull connected
    clearTimeout(connectingVar);
    connectingVar = null;
    previousError = null;
    verboseConnection = true;
    adapter.setState('info.connection', true, true);
    adapter.log.info('[CONNECT] Adapter connected to DENON-AVR: ' + host + ':23');
    if (!receiverType) {
        adapter.log.debug('[CONNECT] Connected --> Check receiver type');
        sendRequest('SV?').then(() => sendRequest('SV01?'));
    } else {
        adapter.log.debug('[CONNECT] Connected --> updating states on start');
        updateStates(); // Update states when connected
    } // endElse
});

client.on('data', data => {
    // split data by <cr>
    const dataArr = data.toString().split(/[\r\n]+/); // Split by Carriage Return
    for (let i = 0; i < dataArr.length; i++) {
        if (dataArr[i]) { // dataArr[i] contains element
            adapter.log.debug('[DATA] <== Incoming data: ' + dataArr[i]);
            handleResponse(dataArr[i]);
        } // endIf
    } // endFor
});

/**
 * Internals
 */
function connect() {
    client.setEncoding('utf8');
    client.setTimeout(35000);
    if (verboseConnection)
        adapter.log.info('[CONNECT] Trying to connect to ' + host + ':23');
    else adapter.log.debug('[CONNECT] Trying to connect to ' + host + ':23');
    connectingVar = null;
    client.connect({port: 23, host: host});
} // endConnect

const updateCommands = ['NSET1 ?', 'NSFRN ?', 'ZM?',
    'MU?', 'PW?', 'SI?', 'SV?',
    'MS?', 'MV?', 'Z2?', 'Z2MU?',
    'Z3?', 'Z3MU?', 'NSE',
    'VSSC ?', 'VSASP ?',
    'VSMONI ?', 'TR?', 'DIM ?',
    'Z3SLP?', 'Z2SLP?', 'SLP?',
    'PSDYNEQ ?', 'PSMULTEQ: ?',
    'PSREFLEV ?', 'PSDYNVOL ?',
    'PSLFC ?', 'PSCNTAMT ?',
    'PSSWL ?', 'PSBAS ?',
    'PSTRE ?', 'Z2PSTRE ?',
    'Z3PSTRE ?', 'Z2PSBAS ?',
    'Z3PSBAS ?', 'PSTONE CTRL ?',
    'MNMEN?', 'PSCES ?', 'VSVPM ?',
    'PV?', 'CV?', 'MSQUICK ?',
    'Z2QUICK ?', 'Z3QUICK ?',
    'MSSMART ?', 'Z2SMART ?',
    'Z3SMART ?', 'NSH',
    'PW00?', 'SD00?'
];

function updateStates() {
    let i = 0;
    const intervalVar = setInterval(() => {
        sendRequest(updateCommands[i]);
        i++;
        if (i === updateCommands.length) clearInterval(intervalVar);
    }, requestInterval);
} // endUpdateStates

const pollCommands = ['NSE', 'SLP?',
    'Z2SLP?', 'Z3SLP?', 'MSQUICK ?',
    'MSSMART ?',
    'Z2QUICK ?', 'Z3QUICK ?',
    'Z2SMART ?', 'Z3SMART ?'
]; // Request Display State, Sleep Timer & Quick Select

function pollStates() { // Polls states
    let i = 0;
    pollingVar = false;
    const intervalVar = setInterval(() => {
        sendRequest(pollCommands[i]);
        i++;
        if (i === pollCommands.length) clearInterval(intervalVar);
    }, requestInterval);
} // endPollStates

function sendRequest(req) {
    return new Promise(resolve => {
        client.write(req + '\r');
        adapter.log.debug('[INFO] ==> Message sent: ' + req);
        resolve();
    });
} // endSendRequest

function handleUsResponse(data) {
    adapter.log.warn('[INFO] US command to handle is ' + data);
    // TODO: implement logic

    if (data.startsWith('SD00')) { // Handle display brightness
        adapter.getObjectAsync('display.brightness').then((obj) => {
            const bright = data.substring(4);
            for (let j = 0; j < 4; j++) { // Check if command contains one of the possible brightness states
                if (helper.decodeState(obj.common.states, j).toLowerCase().includes(bright.toLowerCase())) {
                    adapter.setState('display.brightness', obj.common.states[j], true);
                } // endIf
            } // endFor
        });
        return;
    } // endIf

    switch (data) {
        case 'PW00ON':
            adapter.setState('settings.powerSystem', true, true);
            break;
        case 'PW00STANDBY':
            adapter.setState('settings.powerSystem', false, true);
            break;
    } // endSwitch
} // endHandleUsResponse

function handleUsStateChange(id, stateVal) {
    // TODO: implement logic
    switch (id) {
        case 'settings.powerSystem':
            if (stateVal === true) {
                sendRequest('PW00ON');
            } else {
                sendRequest('PW00STANDBY');
            } // endElseIf
            break;
        case 'display.brightness':
            adapter.getObjectAsync('display.brightness').then((obj) => {
                sendRequest('SD00' + helper.decodeState(obj.common.states, stateVal).toUpperCase().slice(0, 3));
            });
            break;
    } // endSwitch

} // endHandleUsStateChange

function handleResponse(data) {
    if (!pollingVar) { // Keep connection alive & poll states
        pollingVar = true;
        setTimeout(() => pollStates(), pollInterval); // Poll states every configured seconds
    } // endIf

    // Detect receiver type --> first poll is SV?
    if (!receiverType) {
        if (data.startsWith('SV')) {
            if (/^SV[\d]+/g.test(data)) {
                return createStandardStates('US').then(() => {
                    adapter.log.debug('[UPDATE] Updating states');
                    updateStates(); // Update states when connected
                    handleResponse(data);
                });
            } else {
                return createStandardStates('DE').then(() => {
                    adapter.log.debug('[UPDATE] Updating states');
                    updateStates();
                    handleResponse(data);
                });
            } // endElse
        } else return; // return if remote command received before response to SV
    } else if (receiverType === 'US') return handleUsResponse(data);

    // get command out of String
    let command;

    if (/^Z\d.*/g.test(data)) { // Transformation for Zone2+ commands
        const zoneNumber = parseInt(data.slice(1, 2));
        if (!zonesCreated[zoneNumber]) createZone(zoneNumber); // Create Zone2+ states if not done yet
        command = data.replace(/\s+|\d+/g, '');

        if (command === 'Z') { // If everything is removed except Z --> Volume
            let vol = data.substring(2).replace(/\s|[A-Z]/g, '');
            vol = vol.slice(0, 2) + '.' + vol.slice(2, 4); // Slice volume from string
            adapter.setState('zone' + zoneNumber + '.volume', parseFloat(vol), true);
            if (volumeInDB) adapter.setState('zone' + zoneNumber + '.volumeDB', parseFloat(vol) - 80, true);
            return;
        } else {
            command = 'Z' + zoneNumber + command.slice(1, command.length);
        } // endElse

        if (/^Z\dQUICK.*/g.test(data) || /^Z\dSMART.*/g.test(data)) {
            const quickNr = parseInt(data.slice(-1));
            adapter.getStateAsync('zone' + zoneNumber + '.quickSelect').then((state) => {
                if (state.val === quickNr && state.ack) return;
                adapter.setState('zone' + zoneNumber + '.quickSelect', quickNr, true);
            }).catch(() => {
                adapter.setState('zone' + zoneNumber + '.quickSelect', quickNr, true);
            });
            return;
        } else if (/^Z\d.*/g.test(command)) { // Encode Input Source
            adapter.getObjectAsync('zoneMain.selectInput').then((obj) => {
                let zoneSi = data.substring(2);
                zoneSi = zoneSi.replace(' ', ''); // Remove blank
                for (let j = 0; j < 22; j++) { // Check if command contains one of the possible Select Inputs
                    if (helper.decodeState(obj.common.states, j.toString()) === zoneSi) {
                        adapter.setState('zone' + zoneNumber + '.selectInput', zoneSi, true);
                        return;
                    } // endIf
                } // endFor
            });
        } // endIf
    } else { // Transformation for normal commands
        command = data.replace(/\s+|\d+/g, '');
    } // endElse

    if (command.startsWith('DIM')) { // Handle display brightness
        adapter.getObjectAsync('display.brightness').then((obj) => {
            const bright = data.substring(4);
            for (let j = 0; j < 4; j++) { // Check if command contains one of the possible brightness states
                if (helper.decodeState(obj.common.states, j).toLowerCase().includes(bright.toLowerCase())) {
                    adapter.setState('display.brightness', obj.common.states[j], true);
                } // endIf
            } // endFor
        });
        return;
    } else if (command.startsWith('SI')) { // Handle select input
        let siCommand = data.substring(2); // Get only source name
        siCommand = siCommand.replace(' ', ''); // Remove blanks
        adapter.setState('zoneMain.selectInput', siCommand, true);
        return;
    } else if (command.startsWith('MS') && command !== 'MSQUICK' && command !== 'MSSMART') { // Handle Surround mode
        const msCommand = command.substring(2);
        adapter.setState('settings.surroundMode', msCommand, true);
        return;
    } else if (command === 'MSQUICK' || command === 'MSSMART') {
        const quickNr = parseInt(data.slice(-1));
        adapter.getStateAsync('zoneMain.quickSelect').then((state) => {
            if (state.val === quickNr && state.ack) return;
            adapter.setState('zoneMain.quickSelect', quickNr, true);
        }).catch(() => {
            adapter.setState('zoneMain.quickSelect', quickNr, true);
        });
        return;
    } else if (command.startsWith('NSE') && !command.startsWith('NSET')) { // Handle display content
        const displayCont = data.substring(4).replace(/[\0\1\2]/g, ''); // Remove all STX, SOH, NULL
        const dispContNr = data.slice(3, 4);

        if (!displayAbility) {
            createDisplayAndHttp().then(() => {
                adapter.setState('display.displayContent' + dispContNr, displayCont, true);
            });
        } else
            adapter.setState('display.displayContent' + dispContNr, displayCont, true);
        return;
    } else if (command.startsWith('NSET')) {
        // Network settings info
        return;
    } else if (command.startsWith('SV')) {
        // Select Video
        return;
    } else if (command.startsWith('NSFRN')) { // Handle friendly name
        adapter.setState('info.friendlyName', data.substring(6), true);
        return;
    } else if (command.startsWith('PSMULTEQ')) {
        const state = data.split(':')[1];
        adapter.setState('settings.multEq', state, true);
        return;
    } else if (command.startsWith('PSDYNVOL')) {
        const state = data.split(' ')[1];
        adapter.setState('settings.dynamicVolume', state, true);
        return;
    } else if (command.startsWith('VSMONI')) {
        const state = data.substring(6);

        if (!multiMonitor) { // make sure that state exists
            createMonitorState().then(() => {
                if (state === 'AUTO') {
                    adapter.setState('settings.outputMonitor', 0, true);
                } else adapter.setState('settings.outputMonitor', parseInt(state), true);
            });
        } else {
            if (state === 'AUTO') {
                adapter.setState('settings.outputMonitor', 0, true);
            } else adapter.setState('settings.outputMonitor', parseInt(state), true);
        } // endElse

        return;
    } else if (command.startsWith('VSVPM')) {
        const processingMode = data.substring(4);

        if (!multiMonitor) { // make sure that state exists
            createMonitorState().then(() => {
                adapter.setState('settings.videoProcessingMode', processingMode, true);
            });
        } else {
            adapter.setState('settings.videoProcessingMode', processingMode, true);
        } // endElse

        return;
    } else if (command.startsWith('PV')) {
        const pictureMode = data.substring(1);

        if (!pictureModeAbility) {
            createPictureMode().then(() => {
                adapter.getObjectAsync('settings.pictureMode').then((obj) => {
                    adapter.setState('settings.pictureMode', obj.common.states[pictureMode], true);
                });
            });
        } else {
            adapter.getObjectAsync('settings.pictureMode').then((obj) => {
                adapter.setState('settings.pictureMode', obj.common.states[pictureMode], true);
            });
        } // endElse
        return;
    } else if (command.startsWith('NSH')) {
        const presetNumber = parseInt(data.slice(3, 5));
        adapter.getStateAsync('info.onlinePresets').then((state) => {
            let knownPresets;
            if (!state || !state.val) knownPresets = [];
            else knownPresets = JSON.parse(state.val);
            knownPresets[presetNumber] = {
                id: presetNumber,
                channel: data.substring(5).replace(/\s\s+/g, '')
            };

            const sortedPresets = [];
            Object.keys(knownPresets).sort().forEach(key => sortedPresets[key] = knownPresets[key]);
            adapter.setState('info.onlinePresets', JSON.stringify(sortedPresets), true);
        });
    } // endElseIf

    adapter.log.debug('[INFO] <== Command to handle is ' + command);

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
            if (volumeInDB) adapter.setState('zoneMain.volumeDB', parseFloat(data) - 80, true);
            break;
        case 'MVMAX':
            data = data.slice(6, 8) + '.' + data.slice(8, 9);
            adapter.setState('zoneMain.maximumVolume', parseFloat(data), true);
            if (volumeInDB) adapter.setState('zoneMain.maximumVolumeDB', parseFloat(data) - 80, true);
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
            adapter.getStateAsync('zoneMain.sleepTimer').then((state) => {
                if (state.val !== parseInt(data) || !state.ack)
                    adapter.setState('zoneMain.sleepTimer', parseFloat(data), true);
            }).catch(() => adapter.setState('zoneMain.sleepTimer', parseFloat(data), true));
            break;
        case 'SLPOFF':
            adapter.getStateAsync('zoneMain.sleepTimer').then((state) => {
                if (state.val !== 0 || !state.ack)
                    adapter.setState('zoneMain.sleepTimer', 0, true);
            }).catch(() => adapter.setState('zoneMain.sleepTimer', 0, true));
            break;
        case 'Z2SLP':
            data = data.slice(5, data.length);
            adapter.getStateAsync('zone2.sleepTimer').then((state) => {
                if (state.val !== parseInt(data) || !state.ack)
                    adapter.setState('zone2.sleepTimer', parseFloat(data), true);
            }).catch(() => adapter.setState('zone2.sleepTimer', parseFloat(data), true));
            break;
        case 'Z2SLPOFF':
            adapter.getStateAsync('zone2.sleepTimer').then((state) => {
                if (state.val !== 0 || !state.ack)
                    adapter.setState('zone2.sleepTimer', 0, true);
            }).catch(() => adapter.setState('zone2.sleepTimer', 0, true));
            break;
        case 'Z3SLP':
            data = data.slice(5, data.length);
            adapter.getStateAsync('zone3.sleepTimer').then((state) => {
                if (state.val !== parseInt(data) || !state.ack)
                    adapter.setState('zone3.sleepTimer', parseFloat(data), true);
            }).catch(() => adapter.setState('zone3.sleepTimer', parseFloat(data), true));
            break;
        case 'Z3SLPOFF':
            adapter.getStateAsync('zone3.sleepTimer').then((state) => {
                if (state.val !== 0 || !state.ack)
                    adapter.setState('zone3.sleepTimer', 0, true);
            }).catch(() => adapter.setState('zone3.sleepTimer', 0, true));
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
        case 'PSSWL': {// Handle Subwoofer Level for first and second SW
            command = data.split(' ')[0];
            let state = data.split(' ')[1];
            state = helper.volToDb(state);
            if (command === 'PSSWL') { // Check if PSSWL or PSSWL2
                adapter.setState('settings.subwooferLevel', parseFloat(state), true);
            } else {
                if (!subTwo) { // make sure sub two state exists
                    createSubTwo().then(() => {
                        adapter.setState('settings.subwooferTwoLevel', parseFloat(state), true);
                    });
                } else
                    adapter.setState('settings.subwooferTwoLevel', parseFloat(state), true);
            } // endElse
            break;
        }
        case 'PSLFCON':
            if (!audysseyLfc) {
                createLfcAudyseey().then(() => {
                    adapter.setState('settings.audysseyLfc', true, true);
                });
            } else
                adapter.setState('settings.audysseyLfc', true, true);

            break;
        case 'PSLFCOFF':
            if (!audysseyLfc) {
                createLfcAudyseey().then(() => {
                    adapter.setState('settings.audysseyLfc', false, true);
                });
            } else
                adapter.setState('settings.audysseyLfc', false, true);

            break;
        case 'PSCNTAMT': {
            const state = data.split(' ')[1];
            if (!audysseyLfc) {
                createLfcAudyseey().then(() => {
                    adapter.setState('settings.containmentAmount', parseFloat(state), true);
                });
            } else
                adapter.setState('settings.containmentAmount', parseFloat(state), true);

            break;
        }
        case 'PSREFLEV': {
            const state = data.split(' ')[1];
            adapter.setState('settings.referenceLevelOffset', state, true);
            break;
        }
        case 'PSBAS': {
            let state = data.split(' ')[1];
            state = helper.volToDb(state);
            adapter.setState('zoneMain.equalizerBass', state, true);
            break;
        }
        case 'PSTRE': {
            let state = data.split(' ')[1];
            state = helper.volToDb(state);
            adapter.setState('zoneMain.equalizerTreble', state, true);
            break;
        }
        case 'ZPSTRE': {
            command = data.split(' ')[0];
            const state = data.split(' ')[1];
            if (command === 'Z2PSTRE') {
                adapter.setState('zone2.equalizerTreble', state, true);
            } else adapter.setState('zone3.equalizerTreble', state, true);
            break;
        }
        case 'ZPSBAS': {
            command = data.split(' ')[0];
            const state = data.split(' ')[1];
            if (command === 'Z2PSBAS') {
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
        case 'CVFL': {
            const channelVolume = data.split(' ')[1];
            adapter.setState('zoneMain.channelVolumeFrontLeft', helper.volToDb(channelVolume), true);
            break;
        }
        case 'CVFR': {
            const channelVolume = data.split(' ')[1];
            adapter.setState('zoneMain.channelVolumeFrontRight', helper.volToDb(channelVolume), true);
            break;
        }
        case 'CVC': {
            const channelVolume = data.split(' ')[1];
            adapter.setState('zoneMain.channelVolumeCenter', helper.volToDb(channelVolume), true);
            break;
        }
        case 'CVSR': {
            const channelVolume = data.split(' ')[1];
            adapter.setState('zoneMain.channelVolumeSurroundRight', helper.volToDb(channelVolume), true);
            break;
        }
        case 'CVSL': {
            const channelVolume = data.split(' ')[1];
            adapter.setState('zoneMain.channelVolumeSurroundLeft', helper.volToDb(channelVolume), true);
            break;
        }
        default:
            adapter.log.debug('[INFO] <== Unhandled command ' + command);
    } // endSwitch
} // endHandleResponse

function checkVolumeDB(db) {
    return new Promise(resolve => {
        if (db) { // create dB States
            const promises = [];

            promises.push(adapter.setObjectNotExistsAsync('zoneMain.volumeDB', {
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
            }));

            promises.push(adapter.setObjectNotExistsAsync('zoneMain.maximumVolumeDB', {
                type: 'state',
                common: {
                    name: 'Maximum Volume DB',
                    role: 'state',
                    type: 'number',
                    write: false,
                    read: true,
                    unit: 'dB'
                }
            }));

            Promise.all(promises).then(() => resolve());
        } else { // delete dB States
            adapter.delObject('zoneMain.volumeDB');
            adapter.delObject('zoneMain.maximumVolumeDB');
            resolve();
        } // endElseIf
    });
} // endCreateVolumeDB

function createZone(zone) {
    return new Promise(resolve => {
        const promises = [];

        promises.push(adapter.setObjectNotExistsAsync('zone' + zone, {
            type: 'channel',
            common: {
                name: 'Zone ' + zone
            },
            native: {}
        }));

        promises.push(adapter.setObjectNotExistsAsync('zone' + zone + '.powerZone', {
            type: 'state',
            common: {
                name: 'Zone ' + zone + ' Power State',
                role: 'switch.power.zone',
                type: 'boolean',
                write: true,
                read: true
            },
            native: {}
        }));

        promises.push(adapter.setObjectNotExistsAsync('zone' + zone + '.volume', {
            type: 'state',
            common: {
                name: 'Zone ' + zone + ' Volume',
                role: 'level.volume.zone',
                type: 'number',
                read: true,
                write: true,
                min: 0,
                max: 98
            },
            native: {}
        }));

        if (!volumeInDB) {
            adapter.delObject('zone' + zone + '.volumeDB');
        } else {
            promises.push(adapter.setObjectNotExistsAsync('zone' + zone + '.volumeDB', {
                type: 'state',
                common: {
                    name: 'Zone ' + zone + ' VolumeDB',
                    role: 'level.volume',
                    type: 'number',
                    unit: 'dB',
                    read: true,
                    write: true,
                    min: -80,
                    max: 18
                },
                native: {}
            }));
        } // endElse

        promises.push(adapter.setObjectNotExistsAsync('zone' + zone + '.volumeUp', {
            type: 'state',
            common: {
                name: 'Zone ' + zone + ' Volume Up',
                role: 'button',
                type: 'boolean',
                write: true,
                read: false
            },
            native: {}
        }));

        promises.push(adapter.setObjectNotExistsAsync('zone' + zone + '.volumeDown', {
            type: 'state',
            common: {
                name: 'Zone ' + zone + ' Volume Down',
                role: 'button',
                type: 'boolean',
                write: true,
                read: false
            },
            native: {}
        }));

        promises.push(adapter.setObjectNotExistsAsync('zone' + zone + '.selectInput', {
            type: 'state',
            common: {
                name: 'Zone ' + zone + ' Select input',
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
                    '21': 'AUX7',
                    '22': 'BT',
                    '23': 'USB'
                }
            },
            native: {}
        }));

        promises.push(adapter.setObjectNotExistsAsync('zone' + zone + '.muteIndicator', {
            type: 'state',
            common: {
                name: 'Zone ' + zone + ' Muted',
                role: 'media.mute',
                type: 'boolean',
                write: true,
                read: true
            },
            native: {}
        }));

        promises.push(adapter.setObjectNotExistsAsync('zone' + zone + '.quickSelect', {
            type: 'state',
            common: {
                name: 'Zone ' + zone + ' Quick select',
                role: 'media.quickSelect',
                type: 'number',
                write: true,
                read: true,
                min: 1,
                max: 5
            },
            native: {}
        }));

        promises.push(adapter.setObjectNotExistsAsync('zone' + zone + '.sleepTimer', {
            type: 'state',
            common: {
                name: 'Zone ' + zone + ' Sleep Timer',
                role: 'media.timer.sleep',
                unit: 'min',
                type: 'number',
                write: true,
                read: true,
                min: 0,
                max: 120
            },
            native: {}
        }));

        promises.push(adapter.setObjectNotExistsAsync('zone' + zone + '.equalizerBass', {
            type: 'state',
            common: {
                name: 'Zone ' + zone + ' Bass Level',
                role: 'level.bass',
                type: 'number',
                write: true,
                read: true,
                unit: 'dB',
                min: -6,
                max: 6
            },
            native: {}
        }));

        promises.push(adapter.setObjectNotExistsAsync('zone' + zone + '.equalizerBassUp', {
            type: 'state',
            common: {
                'name': 'Zone ' + zone + ' Bass Up',
                'role': 'button',
                'type': 'boolean',
                'write': true,
                'read': false
            },
            native: {}
        }));

        promises.push(adapter.setObjectNotExistsAsync('zone' + zone + '.equalizerBassDown', {
            type: 'state',
            common: {
                name: 'Zone ' + zone + ' Bass Down',
                role: 'button',
                type: 'boolean',
                write: true,
                read: false
            },
            native: {}
        }));

        promises.push(adapter.setObjectNotExistsAsync('zone' + zone + '.equalizerTreble', {
            type: 'state',
            common: {
                name: 'Zone ' + zone + ' Treble',
                role: 'level.treble',
                type: 'number',
                write: true,
                read: true,
                unit: 'dB',
                min: -6,
                max: 6
            },
            native: {}
        }));

        promises.push(adapter.setObjectNotExistsAsync('zone' + zone + '.equalizerTrebleUp', {
            type: 'state',
            common: {
                'name': 'Zone ' + zone + ' Treble Up',
                'role': 'button',
                'type': 'boolean',
                'write': true,
                'read': false
            },
            native: {}
        }));

        promises.push(adapter.setObjectNotExistsAsync('zone' + zone + '.equalizerTrebleDown', {
            type: 'state',
            common: {
                'name': 'Zone ' + zone + ' Treble Down',
                'role': 'button',
                'type': 'boolean',
                'write': true,
                'read': false
            },
            native: {}
        }));

        Promise.all(promises).then(() => {
            if (!zonesCreated[zone]) adapter.log.debug('[INFO] <== Zone ' + zone + ' detected');
            zonesCreated[zone] = true;
            resolve();
        });
    });
} // endCreateZone

function createDisplayAndHttp() {
    return new Promise(resolve => {
        const promises = [];

        promises.push(adapter.setObjectNotExistsAsync('display.displayContent0', {
            type: 'state',
            common: {
                'name': 'Display content 0',
                'role': 'info.display',
                'type': 'string',
                'write': false,
                'read': true
            },
            native: {}
        }));

        promises.push(adapter.setObjectNotExistsAsync('display.displayContent1', {
            type: 'state',
            common: {
                'name': 'Display content 1',
                'role': 'info.display',
                'type': 'string',
                'write': false,
                'read': true
            },
            native: {}
        }));

        promises.push(adapter.setObjectNotExistsAsync('display.displayContent2', {
            type: 'state',
            common: {
                'name': 'Display content 2',
                'role': 'info.display',
                'type': 'string',
                'write': false,
                'read': true
            },
            native: {}
        }));

        promises.push(adapter.setObjectNotExistsAsync('display.displayContent3', {
            type: 'state',
            common: {
                'name': 'Display content 3',
                'role': 'info.display',
                'type': 'string',
                'write': false,
                'read': true
            },
            native: {}
        }));

        promises.push(adapter.setObjectNotExistsAsync('display.displayContent4', {
            type: 'state',
            common: {
                'name': 'Display content 4',
                'role': 'info.display',
                'type': 'string',
                'write': false,
                'read': true
            },
            native: {}
        }));

        promises.push(adapter.setObjectNotExistsAsync('display.displayContent5', {
            type: 'state',
            common: {
                'name': 'Display content 5',
                'role': 'info.display',
                'type': 'string',
                'write': false,
                'read': true
            },
            native: {}
        }));

        promises.push(adapter.setObjectNotExistsAsync('display.displayContent6', {
            type: 'state',
            common: {
                'name': 'Display content 6',
                'role': 'info.display',
                'type': 'string',
                'write': false,
                'read': true
            },
            native: {}
        }));

        promises.push(adapter.setObjectNotExistsAsync('display.displayContent7', {
            type: 'state',
            common: {
                'name': 'Display content 7',
                'role': 'info.display',
                'type': 'string',
                'write': false,
                'read': true
            },
            native: {}
        }));

        promises.push(adapter.setObjectNotExistsAsync('display.displayContent8', {
            type: 'state',
            common: {
                'name': 'Display content 8',
                'role': 'info.display',
                'type': 'string',
                'write': false,
                'read': true
            },
            native: {}
        }));

        promises.push(adapter.setObjectNotExistsAsync('zoneMain.iconURL', {
            type: 'state',
            common: {
                'name': 'Cover',
                'role': 'media.cover',
                'type': 'string',
                'write': false,
                'read': true
            },
            native: {}
        }));

        Promise.all(promises).then(() => {
            if (!displayAbility) {
                adapter.setState('zoneMain.iconURL', 'http://' + host + '/NetAudio/art.asp-jpg', true);
                adapter.log.debug('[INFO] <== Display Content created');
            } // endIf
            displayAbility = true;
            resolve();
        });
    });
} // endCreateDisplayAndHttp

function createMonitorState() {
    return new Promise(resolve => {
        const promises = [];

        promises.push(adapter.setObjectNotExistsAsync('settings.outputMonitor', {
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
        }));

        promises.push(adapter.setObjectNotExistsAsync('settings.videoProcessingMode', {
            type: 'state',
            common: {
                name: 'Video processing mode',
                role: 'video.processingMode',
                type: 'number',
                write: true,
                read: true,
                states: {
                    '0': 'AUTO',
                    '1': 'GAME',
                    '2': 'MOVIE'
                }
            },
            native: {}
        }));

        Promise.all(promises).then(() => {
            if (!multiMonitor) adapter.log.debug('[INFO] <== Created monitor states');
            multiMonitor = true;
            resolve();
        });
    });

} // endCreateMonitorState

function createSubTwo() {
    return new Promise(resolve => {
        const promises = [];

        promises.push(adapter.setObjectNotExistsAsync('settings.subwooferTwoLevel', {
            type: 'state',
            common: {
                name: 'Second Subwoofer Level',
                role: 'level',
                type: 'number',
                write: true,
                read: true,
                min: -12,
                max: 12,
                unit: 'dB'
            },
            native: {}
        }));

        promises.push(adapter.setObjectNotExistsAsync('settings.subwooferTwoLevelUp', {
            type: 'state',
            common: {
                name: 'Subwoofer Two Level Up',
                role: 'button',
                type: 'boolean',
                write: true,
                read: false
            },
            native: {}
        }));

        promises.push(adapter.setObjectNotExistsAsync('settings.subwooferTwoLevelDown', {
            type: 'state',
            common: {
                name: 'Subwoofer Two Level Down',
                role: 'button',
                type: 'boolean',
                write: true,
                read: false
            },
            native: {}
        }));

        Promise.all(promises).then(() => {
            if (!subTwo) adapter.log.debug('[INFO] <== Created subwoofer two states');
            subTwo = true;
            resolve();
        });
    });
} // endCreateSubTwo

function createLfcAudyseey() {
    return new Promise(resolve => {
        const promises = [];

        promises.push(adapter.setObjectNotExistsAsync('settings.audysseyLfc', {
            type: 'state',
            common: {
                name: 'Audyssey Low Frequency Containment',
                role: 'switch',
                type: 'boolean',
                write: true,
                read: true
            },
            native: {}
        }));

        promises.push(adapter.setObjectNotExistsAsync('settings.containmentAmount', {
            type: 'state',
            common: {
                name: 'Audyssey Low Frequency Containment Amount',
                role: 'level',
                type: 'number',
                write: true,
                read: true,
                min: 1,
                max: 7
            },
            native: {}
        }));

        promises.push(adapter.setObjectNotExistsAsync('settings.containmentAmountUp', {
            type: 'state',
            common: {
                name: 'Containment Amount Up',
                role: 'button',
                type: 'boolean',
                write: true,
                read: false
            },
            native: {}
        }));

        promises.push(adapter.setObjectNotExistsAsync('settings.containmentAmountDown', {
            type: 'state',
            common: {
                name: 'Containment Amount Down',
                role: 'button',
                type: 'boolean',
                write: true,
                read: false
            },
            native: {}
        }));

        Promise.all(promises).then(() => {
            if (!audysseyLfc) adapter.log.debug('[INFO] <== Created Audyssey LFC states');
            audysseyLfc = true;
            resolve();
        });
    });
} // endCreateLfcAudyssey

function createPictureMode() {
    return new Promise(resolve => {
        adapter.setObjectNotExistsAsync('settings.pictureMode', {
            type: 'state',
            common: {
                name: 'Picture Mode Direct Change',
                role: 'media.pictureMode',
                type: 'string',
                write: true,
                read: false,
                states: {
                    'OFF': 'Off',
                    'STD': 'Standard',
                    'MOV': 'Movie',
                    'VVD': 'Vivid',
                    'STM': 'Stream',
                    'CTM': 'Custom',
                    'DAY': 'ISF Day',
                    'NGT': 'ISF Night'
                }
            },
            native: {}
        }).then(() => {
            pictureModeAbility = true;
            resolve();
        });
    });
} // endCreatePictureMode

function createStandardStates(type) {
    return new Promise((resolve, reject) => {
        const promises = [];
        if (type === 'DE') {
            for (const obj of helper.commonCommands) {
                const id = obj._id;
                delete obj._id;
                promises.push(adapter.setObjectNotExistsAsync(id, obj));
            } // endFor
            Promise.all(promises).then(() => {
                receiverType = 'DE';
                adapter.log.debug('[INFO] DE states created');
                resolve();
            });
        } else if (type === 'US') {
            for (const obj of helper.usCommands) {
                const id = obj._id;
                delete obj._id;
                promises.push(adapter.setObjectNotExistsAsync(id, obj));
            } // endFor
            Promise.all(promises).then(() => {
                receiverType = 'US';
                adapter.log.debug('[INFO] US states created');
                resolve();
            });
        } else reject(new Error('Unknown receiver type'));
    });
} // endCreateStandardStates

if (module && module.parent) {
    module.exports = startAdapter;
} else {
    // or start the instance directly
    startAdapter();
}
