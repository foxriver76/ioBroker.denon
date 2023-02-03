"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const adapter_core_1 = __importDefault(require("@iobroker/adapter-core"));
const net_1 = __importDefault(require("net"));
const helper = __importStar(require("./lib/utils"));
const states = __importStar(require("./lib/states"));
const upnp_1 = require("./lib/upnp");
const client = new net_1.default.Socket();
let adapter;
let host;
let pollInterval;
let requestInterval;
let verboseConnection = true;
let previousError;
// holds a true value for already created capabilities
const capabilities = {
    display: false,
    multiMonitor: false,
    subTwo: false,
    audysseyLfc: false,
    pictureMode: false,
    speakerPreset: false
};
const zonesCreated = {};
let pollTimer = null;
let connectTimer = null;
let receiverType;
function startAdapter(options = {}) {
    adapter = new adapter_core_1.default.Adapter({ ...options, name: 'denon' });
    adapter.on('unload', callback => {
        try {
            if (connectTimer) {
                clearTimeout(connectTimer);
            }
            if (pollTimer) {
                clearTimeout(pollTimer);
            }
            /*
            if (intervalPollVar) {
                clearInterval(intervalPollVar);
            }
             */
            adapter.log.info('[END] Stopping Denon AVR adapter...');
            adapter.setState('info.connection', false, true);
            client.destroy(); // kill connection
            client.unref(); // kill connection
            callback();
        }
        catch (_a) {
            callback();
        }
    });
    adapter.on('message', obj => {
        if (typeof obj === 'object') {
            if (obj.command === 'browse') {
                // frontend will call browse
                if (obj.callback) {
                    adapter.log.info('start browse');
                    (0, upnp_1.ssdpScan)('M-SEARCH * HTTP/1.1\r\n' +
                        'HOST: 239.255.255.250:1900\r\n' +
                        'ST: ssdp:all\r\n' +
                        'MAN: "ssdp:discover"\r\n' +
                        'MX: 3\r\n' +
                        '\r\n', true, 4000, (err, result) => {
                        if (result) {
                            result = result
                                .filter(dev => dev.manufacturer &&
                                (dev.manufacturer.toLowerCase() === 'marantz' ||
                                    dev.manufacturer.toLowerCase() === 'denon'))
                                .map(dev => {
                                return { ip: dev.ip, name: dev.name };
                            });
                        }
                        adapter.sendTo(obj.from, obj.command, { error: err, list: result }, obj.callback);
                    });
                }
            }
        }
    });
    adapter.on('ready', () => {
        if (adapter.config.ip) {
            adapter.log.info('[START] Starting DENON AVR adapter');
            host = adapter.config.ip;
            pollInterval = adapter.config.pollInterval || 7000;
            requestInterval = adapter.config.requestInterval || 100;
            adapter.subscribeStates('*');
            connect();
        }
        else {
            adapter.log.warn('No IP-address set');
        }
    });
    // Handle state changes
    adapter.on('stateChange', async (id, state) => {
        // Ignore acknowledged state changes or error states
        if (!id || !state || state.ack || state.val === null) {
            return;
        }
        id = id.substring(adapter.namespace.length + 1); // remove instance name and id
        let stateVal = state.val; // only get state value
        let zoneNumber;
        if (/^zone\d\..+/g.test(id)) {
            zoneNumber = id.slice(4, 5);
            id = `zone.${id.substring(6)}`;
        }
        adapter.log.debug(`[COMMAND] State Change - ID: ${id}; State: ${stateVal}`);
        if (receiverType === 'US') {
            return handleUsStateChange(id, stateVal);
        }
        switch (id) {
            case 'zoneMain.powerZone':
                if (stateVal === true) {
                    await sendRequest('ZMON');
                }
                else {
                    await sendRequest('ZMOFF');
                }
                break;
            case 'zoneMain.volume': {
                const vol = helper.inputToVol(stateVal);
                await sendRequest(`MV${vol}`);
                adapter.log.debug(`[INFO] <== Changed mainVolume to ${vol}`);
                break;
            }
            case 'zoneMain.volumeDB': {
                stateVal += 80; // convert to Vol
                const vol = helper.inputToVol(stateVal);
                await sendRequest(`MV${vol}`);
                adapter.log.debug(`[INFO] <== Changed mainVolume to ${vol}`);
                break;
            }
            case 'zoneMain.sleepTimer':
                if (!stateVal) {
                    // state === 0
                    await sendRequest('SLPOFF');
                }
                else if (stateVal < 10) {
                    await sendRequest(`SLP00${stateVal}`);
                }
                else if (stateVal < 100) {
                    await sendRequest(`SLP0${stateVal}`);
                }
                else if (stateVal <= 120) {
                    await sendRequest(`SLP${stateVal}`);
                }
                break;
            case 'zoneMain.volumeUp':
                await sendRequest('MVUP');
                break;
            case 'zoneMain.volumeDown':
                await sendRequest('MVDOWN');
                break;
            case 'zoneMain.muteIndicator':
                if (stateVal === true) {
                    await sendRequest('MUON');
                }
                else {
                    await sendRequest('MUOFF');
                }
                break;
            case 'zoneMain.playPause':
                await sendRequest('NS94');
                break;
            case 'zoneMain.play':
                await sendRequest('NS9A');
                break;
            case 'zoneMain.pause':
                await sendRequest('NS9B');
                break;
            case 'zoneMain.skipMinus':
                await sendRequest('NS9E');
                break;
            case 'zoneMain.skipPlus':
                await sendRequest('NS9D');
                break;
            case 'zoneMain.selectInput': {
                const obj = await adapter.getObjectAsync('zoneMain.selectInput');
                await sendRequest(`SI${helper.decodeState(obj.common.states, state.val).toUpperCase()}`);
                break;
            }
            case 'zoneMain.quickSelect':
                await sendRequests([`MSQUICK${stateVal}`, `MSSMART${stateVal}`]);
                break;
            case 'zoneMain.equalizerBassUp':
                await sendRequest('PSBAS UP');
                break;
            case 'zoneMain.equalizerBassDown':
                await sendRequest('PSBAS DOWN');
                break;
            case 'zoneMain.equalizerTrebleUp':
                await sendRequest('PSTRE UP');
                break;
            case 'zoneMain.equalizerTrebleDown':
                await sendRequest('PSTRE DOWN');
                break;
            case 'zoneMain.equalizerBass':
                stateVal = helper.dbToVol(stateVal);
                await sendRequest(`PSBAS ${stateVal}`);
                break;
            case 'zoneMain.equalizerTreble':
                stateVal = helper.dbToVol(stateVal);
                await sendRequest(`PSTRE ${stateVal}`);
                break;
            case 'zoneMain.channelVolumeFrontLeft':
                await sendRequest(`CVFL ${helper.dbToVol(stateVal)}`);
                break;
            case 'zoneMain.channelVolumeFrontRight':
                await sendRequest(`CVFR ${helper.dbToVol(stateVal)}`);
                break;
            case 'zoneMain.channelVolumeCenter':
                await sendRequest(`CVC ${helper.dbToVol(stateVal)}`);
                break;
            case 'zoneMain.channelVolumeSurroundRight':
                await sendRequest(`CVSR ${helper.dbToVol(stateVal)}`);
                break;
            case 'zoneMain.channelVolumeSurroundLeft':
                await sendRequest(`CVSL ${helper.dbToVol(stateVal)}`);
                break;
            case 'zoneMain.channelVolumeSurroundDolbyLeft':
                await sendRequest(`CVSDL ${helper.dbToVol(stateVal)}`);
                break;
            case 'zoneMain.channelVolumeSurroundDolbyRight':
                await sendRequest(`CVSDR ${helper.dbToVol(stateVal)}`);
                break;
            case 'zoneMain.channelVolumeFrontDolbyLeft':
                await sendRequest(`CVFDL ${helper.dbToVol(stateVal)}`);
                break;
            case 'zoneMain.channelVolumeFrontDolbyRight':
                await sendRequest(`CVFDR ${helper.dbToVol(stateVal)}`);
                break;
            case 'zoneMain.channelVolumeFrontHeightLeft':
                await sendRequest(`CVFHL ${helper.dbToVol(stateVal)}`);
                break;
            case 'zoneMain.channelVolumeFrontHeightRight':
                await sendRequest(`CVFHR ${helper.dbToVol(stateVal)}`);
                break;
            case 'zoneMain.channelVolumeRearHeightLeft':
                await sendRequest(`CVRHL ${helper.dbToVol(stateVal)}`);
                break;
            case 'zoneMain.channelVolumeRearHeightRight':
                await sendRequest(`CVRHR ${helper.dbToVol(stateVal)}`);
                break;
            case 'zoneMain.channelVolumeSurroundHeightRight':
                await sendRequest(`CVSHR ${helper.dbToVol(stateVal)}`);
                break;
            case 'zoneMain.channelVolumeSurroundHeightLeft':
                await sendRequest(`CVSHL ${helper.dbToVol(stateVal)}`);
                break;
            case 'zoneMain.channelVolumeSubwoofer':
                await sendRequest(`CVSW ${helper.dbToVol(stateVal)}`);
                break;
            case 'zoneMain.channelVolumeSubwooferTwo':
                await sendRequest(`CVSW2 ${helper.dbToVol(stateVal)}`);
                break;
            case 'settings.powerSystem':
                if (stateVal === true) {
                    await sendRequest('PWON');
                }
                else {
                    await sendRequest('PWSTANDBY');
                }
                break;
            case 'settings.dynamicEq':
                if (stateVal) {
                    await sendRequest('PSDYNEQ ON');
                }
                else {
                    await sendRequest('PSDYNEQ OFF');
                }
                break;
            case 'settings.subwooferLevel':
                stateVal = helper.dbToVol(stateVal);
                await sendRequest(`PSSWL ${stateVal}`);
                break;
            case 'settings.subwooferLevelDown':
                await sendRequest('PSSWL DOWN');
                break;
            case 'settings.subwooferLevelUp':
                await sendRequest('PSSWL UP');
                break;
            case 'settings.subwooferLevelState':
                if (stateVal) {
                    await sendRequest('PSSWL ON');
                }
                else {
                    await sendRequest('PSSWL OFF');
                }
                break;
            case 'settings.subwooferTwoLevel':
                stateVal = helper.dbToVol(stateVal);
                await sendRequest(`PSSWL2 ${stateVal}`);
                break;
            case 'settings.subwooferTwoLevelDown':
                await sendRequest('PSSWL2 DOWN');
                break;
            case 'settings.subwooferTwoLevelUp':
                await sendRequest('PSSWL2 UP');
                break;
            case 'settings.audysseyLfc':
                if (stateVal) {
                    await sendRequest('PSLFC ON');
                }
                else {
                    await sendRequest('PSLFC OFF');
                }
                break;
            case 'settings.containmentAmountDown':
                await sendRequest('PSCNTAMT DOWN');
                break;
            case 'settings.containmentAmountUp':
                await sendRequest('PSCNTAMT UP');
                break;
            case 'settings.containmentAmount':
                await sendRequest(`PSCNTAMT 0${stateVal}`);
                break;
            case 'settings.multEq': {
                const obj = await adapter.getObjectAsync('settings.multEq');
                await sendRequest(`PSMULTEQ:${helper.decodeState(obj.common.states, state.val).toUpperCase()}`);
                break;
            }
            case 'settings.dynamicVolume': {
                const obj = await adapter.getObjectAsync('settings.dynamicVolume');
                await sendRequest(`PSDYNVOL ${helper.decodeState(obj.common.states, state.val).toUpperCase()}`);
                break;
            }
            case 'settings.referenceLevelOffset':
                await sendRequest(`PSREFLEV ${stateVal}`);
                break;
            case 'settings.surroundMode': {
                const obj = await adapter.getObjectAsync('settings.surroundMode');
                await sendRequest(`MS${helper.decodeState(obj.common.states, state.val).toUpperCase()}`);
                break;
            }
            case 'settings.expertReadingPattern':
                try {
                    // check if its a valid RegExp
                    new RegExp(stateVal);
                    await adapter.setStateAsync('settings.expertReadingPattern', stateVal, true);
                }
                catch (e) {
                    adapter.log.warn(`[COMMAND] Cannot update expert reading pattern: ${e.message}`);
                }
                break;
            case 'settings.expertCommand': {
                // Sending custom commands
                await sendRequest(stateVal);
                const connectionState = await adapter.getStateAsync('info.connection');
                // acknowledge when connection is true, thats all we can do here
                if ((connectionState === null || connectionState === void 0 ? void 0 : connectionState.val) === true) {
                    adapter.setState('settings.expertCommand', stateVal, true);
                }
                break;
            }
            case 'settings.toneControl':
                if (stateVal) {
                    await sendRequest('PSTONE CTRL ON');
                }
                else {
                    await sendRequest('PSTONE CTRL OFF');
                }
                break;
            case 'settings.cursorUp':
                await sendRequest('MNCUP');
                break;
            case 'settings.cursorDown':
                await sendRequest('MNCDN');
                break;
            case 'settings.cursorRight':
                await sendRequest('MNCRT');
                break;
            case 'settings.cursorLeft':
                await sendRequest('MNCLT');
                break;
            case 'settings.enter':
                await sendRequest('MNENT');
                break;
            case 'settings.return':
                await sendRequest('MNRTN');
                break;
            case 'settings.option':
                await sendRequest('MNOPT');
                break;
            case 'settings.info':
                await sendRequest('MNINF');
                break;
            case 'settings.setupMenu':
                if (stateVal) {
                    await sendRequest('MNMEN ON');
                }
                else {
                    await sendRequest('MNMEN OFF');
                }
                break;
            case 'settings.outputMonitor': {
                const obj = await adapter.getObjectAsync('settings.outputMonitor');
                await sendRequest(`VSMONI${helper.decodeState(obj.common.states, stateVal)}`);
                break;
            }
            case 'settings.centerSpread':
                if (stateVal) {
                    await sendRequest('PSCES ON');
                }
                else {
                    await sendRequest('PSCES OFF');
                }
                break;
            case 'settings.videoProcessingMode': {
                const obj = await adapter.getObjectAsync('settings.videoProcessingMode');
                await sendRequest(`VSVPM${helper.decodeState(obj.common.states, stateVal)}`);
                break;
            }
            case 'settings.pictureMode':
                await sendRequest(`PV${stateVal}`);
                break;
            case 'settings.loadPreset': {
                let loadPresetState;
                if (parseInt(stateVal) < 10) {
                    loadPresetState = `0${stateVal}`;
                }
                else {
                    loadPresetState = stateVal;
                }
                await sendRequest(`NSB${loadPresetState}`);
                break;
            }
            case 'settings.savePreset': {
                let savePresetState;
                if (parseInt(stateVal) < 10) {
                    savePresetState = `0${stateVal}`;
                }
                else {
                    savePresetState = stateVal;
                }
                await sendRequest(`NSC${savePresetState}`);
                break;
            }
            case 'display.brightness': {
                const obj = await adapter.getObjectAsync('display.brightness');
                await sendRequest(`DIM ${helper
                    .decodeState(obj.common.states, state.val)
                    .toUpperCase()
                    .slice(0, 3)}`);
                break;
            }
            case 'tuner.frequencyUp':
                await sendRequest('TFANUP');
                break;
            case 'tuner.frequencyDown':
                await sendRequest('TFANDOWN');
                break;
            case 'tuner.frequency': {
                // remove the dot from 106.90
                let strFreq = state.toString().replace('.', '');
                if (strFreq.length < 6 && stateVal < 1000) {
                    // below 1000 we need leading zero
                    strFreq = `0${strFreq}`;
                    if (stateVal < 100) {
                        // we need another one
                        strFreq = `0${strFreq}`;
                    }
                }
                // if its still the case, because e.g. 106.00 we add missing zeros
                while (strFreq.length < 6) {
                    strFreq = strFreq + '0';
                }
                await sendRequest(`TFAN${strFreq}`);
                break;
            }
            case 'zone.powerZone':
                if (stateVal === true) {
                    await sendRequest(`Z${zoneNumber}ON`);
                }
                else {
                    await sendRequest(`Z${zoneNumber}OFF`);
                }
                break;
            case 'zone.muteIndicator':
                if (stateVal === true) {
                    await sendRequest(`Z${zoneNumber}MUON`);
                }
                else {
                    await sendRequest(`Z${zoneNumber}MUOFF`);
                }
                break;
            case 'zone.sleepTimer':
                if (!stateVal) {
                    // state === 0
                    await sendRequest(`Z${zoneNumber}SLPOFF`);
                }
                else if (stateVal < 10) {
                    await sendRequest(`Z${zoneNumber}SLP00${stateVal}`);
                }
                else if (stateVal < 100) {
                    await sendRequest(`Z${zoneNumber}SLP0${stateVal}`);
                }
                else if (stateVal <= 120) {
                    await sendRequest(`Z${zoneNumber}SLP${stateVal}`);
                }
                break;
            case 'zone.volumeUp':
                await sendRequest(`Z${zoneNumber}UP`);
                break;
            case 'zone.volumeDown':
                await sendRequest(`Z${zoneNumber}DOWN`);
                break;
            case 'zone.volume':
                await sendRequest(`Z${zoneNumber}${helper.inputToVol(stateVal)}`);
                break;
            case 'zone.volumeDB':
                stateVal += 80; // Convert to Vol
                await sendRequest(`Z${zoneNumber}${helper.inputToVol(stateVal)}`);
                break;
            case 'zone.selectInput': {
                const obj = await adapter.getObjectAsync(`zone${zoneNumber}.selectInput`);
                await sendRequest(`Z${zoneNumber}${helper.decodeState(obj.common.states, state.val).toUpperCase()}`);
                break;
            }
            case 'zone.quickSelect':
                await sendRequests([`Z${zoneNumber}QUICK${stateVal}`, `Z${zoneNumber}SMART${stateVal}`]);
                break;
            case 'zone.equalizerBassUp':
                await sendRequest(`Z${zoneNumber}PSBAS UP`);
                break;
            case 'zone.equalizerBassDown':
                await sendRequest(`Z${zoneNumber}PSBAS DOWN`);
                break;
            case 'zone.equalizerTrebleUp':
                await sendRequest(`Z${zoneNumber}PSTRE UP`);
                break;
            case 'zone.equalizerTrebleDown':
                await sendRequest(`Z${zoneNumber}PSTRE DOWN`);
                break;
            case 'zone.equalizerBass':
                stateVal = helper.dbToVol(stateVal);
                await sendRequest(`Z${zoneNumber}PSBAS ${stateVal}`);
                break;
            case 'zone.equalizerTreble':
                stateVal = helper.dbToVol(stateVal);
                await sendRequest(`Z${zoneNumber}PSTRE ${stateVal}`);
                break;
            case 'zone.channelVolumeFrontLeft':
                await sendRequest(`Z${zoneNumber}CVFL ${helper.dbToVol(stateVal)}`);
                break;
            case 'zone.channelVolumeFrontRight':
                await sendRequest(`Z${zoneNumber}CVFR ${helper.dbToVol(stateVal)}`);
                break;
            case 'settings.lfeAmount':
                await sendRequest(`PSLFE ${stateVal < 10 ? `0${stateVal}` : 10}`);
                break;
            case 'settings.dialogControl':
                await sendRequest(`PSDIC 0${stateVal}`); // can only be 0 - 6
                break;
            case 'settings.dialogLevel':
                await sendRequest(`PSDIL ${helper.dbToVol(stateVal)}`);
                break;
            case 'settings.dialogLevelAdjust':
                await sendRequest(`PSDIL ${stateVal ? 'ON' : 'OFF'}`);
                break;
            case 'settings.speakerPreset':
                await sendRequest(`SPPR ${stateVal}`);
                break;
            default:
                adapter.log.error(`[COMMAND] ${id} is not a valid state`);
        }
    });
    return adapter;
}
client.on('timeout', () => {
    pollTimer = null;
    adapter.log.warn('AVR timed out due to no response');
    adapter.setState('info.connection', false, true);
    client.destroy();
    client.unref();
    if (!connectTimer) {
        connectTimer = setTimeout(() => connect(), 30000); // Connect again in 30 seconds
    }
});
// Connection handling
client.on('error', (error) => {
    verboseConnection = error.code !== previousError;
    if (connectTimer) {
        return;
    }
    previousError = error.code;
    const logLevel = verboseConnection ? 'warn' : 'debug';
    if (error.code === 'ECONNREFUSED') {
        adapter.log[logLevel]('Connection refused, make sure that there is no other Telnet connection');
    }
    else if (error.code === 'EHOSTUNREACH') {
        adapter.log[logLevel]('AVR unreachable, check the Network Config of your AVR');
    }
    else if (error.code === 'EALREADY' || error.code === 'EISCONN') {
        return adapter.log[logLevel]('Adapter is already connecting/connected');
    }
    else if (error.code === 'ETIMEDOUT') {
        adapter.log[logLevel]('Connection timed out');
    }
    else {
        adapter.log[logLevel](`Connection closed: ${error}`);
    }
    reconnect();
});
client.on('end', () => {
    // Denon has closed the connection
    adapter.log.warn('Denon AVR has cancelled the connection');
    reconnect();
});
/**
 * Reconnect to AVR after 30 seconds
 */
function reconnect() {
    pollTimer = null;
    adapter.setState('info.connection', false, true);
    if (!connectTimer) {
        client.destroy();
        client.unref();
        connectTimer = setTimeout(() => connect(), 30000); // Connect again in 30 seconds
    }
}
client.on('connect', async () => {
    // Successfully connected
    connectTimer = null;
    previousError = null;
    verboseConnection = true;
    adapter.setState('info.connection', true, true);
    adapter.log.info(`[CONNECT] Adapter connected to DENON-AVR: ${host}:23`);
    if (!receiverType) {
        adapter.log.debug('[CONNECT] Connected --> Check receiver type');
        await sendRequests(['SV?', 'SV01?', 'BDSTATUS?', 'MV?']);
    }
    else {
        adapter.log.debug('[CONNECT] Connected --> updating states on start');
        updateStates(); // Update states when connected
    }
});
client.on('data', data => {
    // split data by <cr>
    const dataArr = data.toString().split(/[\r\n]+/); // Split by Carriage Return
    for (const data of dataArr) {
        if (data) {
            // data not empty
            adapter.log.debug(`[DATA] <== Incoming data: ${data}`);
            handleResponse(data);
        }
    }
});
/**
 * Internals
 */
function connect() {
    client.setEncoding('utf8');
    if (verboseConnection) {
        adapter.log.info(`[CONNECT] Trying to connect to ${host}:23`);
    }
    else {
        adapter.log.debug(`[CONNECT] Trying to connect to ${host}:23`);
    }
    connectTimer = null;
    client.connect({ port: 23, host: host });
    // give the connection a timeout after being idle for 35 seconds (needed after connect call)
    client.setTimeout(35000);
}
const updateCommands = [
    'NSET1 ?',
    'NSFRN ?',
    'ZM?',
    'MU?',
    'PW?',
    'SI?',
    'SV?',
    'MS?',
    'MV?',
    'Z2?',
    'Z2MU?',
    'Z3?',
    'Z3MU?',
    'NSE',
    'VSSC ?',
    'VSASP ?',
    'VSMONI ?',
    'TR?',
    'DIM ?',
    'Z3SLP?',
    'Z2SLP?',
    'SLP?',
    'PSDYNEQ ?',
    'PSMULTEQ: ?',
    'PSREFLEV ?',
    'PSDYNVOL ?',
    'PSLFC ?',
    'PSCNTAMT ?',
    'PSSWL ?',
    'PSBAS ?',
    'PSTRE ?',
    'Z2PSTRE ?',
    'Z3PSTRE ?',
    'Z2PSBAS ?',
    'Z3PSBAS ?',
    'PSTONE CTRL ?',
    'MNMEN?',
    'PSCES ?',
    'VSVPM ?',
    'PV?',
    'CV?',
    'MSQUICK ?',
    'Z2QUICK ?',
    'Z3QUICK ?',
    'MSSMART ?',
    'Z2SMART ?',
    'Z3SMART ?',
    'NSH',
    'Z2CV?',
    'Z3CV?',
    'PSLFE ?',
    'PW00?',
    'SD00?',
    'SV01?',
    'SV02?',
    'SV03?',
    'SV04?',
    'SV05?',
    'SV06?',
    'SV07?',
    'SV08?',
    'SV09?',
    'SV10?',
    'SV11?',
    'SV12?',
    'SO02?',
    'SO04?',
    'SO06?',
    'SO08?',
    'SO10?',
    'SO12?',
    'SF01?',
    'SF02?',
    'SF03?',
    'SF04?',
    'SF05?',
    'SF06?',
    'SF07?',
    'SF08?',
    'SF09?',
    'SF10?',
    'SF11?',
    'SF12?',
    'SI01?',
    'SI02?',
    'SI03?',
    'SI04?',
    'SI05?',
    'SI06?',
    'SI07?',
    'SI08?',
    'SI09?',
    'SI10?',
    'SI11?',
    'SI12?',
    'ST00?',
    'ST02?',
    'ST04?',
    'ST06?',
    'ST08?',
    'ST10?',
    'ST12?',
    'TI00?',
    'TI02?',
    'TI04?',
    'TI06?',
    'TI08?',
    'TI10?',
    'TI12?',
    'AI02?',
    'AI04?',
    'AI06?',
    'AI08?',
    'AI10?',
    'AI12?',
    'PR00TR?',
    'PR00IN?',
    'PR00TM?',
    'PR02PR?',
    'PR04PR?',
    'PR06PR?',
    'PR08PR?',
    'PR10PR?',
    'PR12PR?',
    'PR02OH?',
    'PR04OH?',
    'PR06OH?',
    'PR08OH?',
    'PR10OH?',
    'PR12OH?',
    'BDSTATUS?',
    'PSDIL ?',
    'PSDIC ?',
    'TFAN?',
    'TFANNAME?',
    'SPPR ?'
];
/**
 * Update all states by sending the defined updateCommands
 */
async function updateStates() {
    await sendRequests(updateCommands);
}
const pollCommands = [
    'NSE',
    'SLP?',
    'Z2SLP?',
    'Z3SLP?',
    'MSQUICK ?',
    'MSSMART ?',
    'PR00TR?',
    'Z2QUICK ?',
    'Z3QUICK ?',
    'Z2SMART ?',
    'Z3SMART ?',
    'BDSTATUS?'
]; // Request Display State, Sleep Timer & Quick Select
async function pollStates() {
    // Polls states
    pollTimer = null;
    await sendRequests(pollCommands);
}
/**
 * Send data array to socket respecting request interval
 *
 * @param requests array of requests
 */
async function sendRequests(requests) {
    for (const req of requests) {
        await sendRequest(req);
        await helper.wait(requestInterval);
    }
}
/**
 * Send data to socket
 *
 * @param req
 */
function sendRequest(req) {
    return new Promise(resolve => {
        client.write(`${req}\r`, () => {
            adapter.log.debug(`[INFO] ==> Message sent: ${req}`);
            resolve();
        });
    });
}
async function handleUsResponse(data) {
    var _a, _b;
    adapter.log.debug(`[INFO] US command to handle is ${data}`);
    if (data.startsWith('SD00')) {
        // Handle display brightness
        const obj = (await adapter.getObjectAsync('display.brightness'));
        const bright = data.substring(4);
        for (const j of Object.keys(obj.common.states)) {
            // Check if command contains one of the possible brightness states
            if (helper.decodeState(obj.common.states, j).toLowerCase().includes(bright.toLowerCase())) {
                adapter.setState('display.brightness', obj.common.states[j], true);
            }
        }
        return;
    }
    else if (!data.startsWith('ST00') && /ST\d\d.+/g.test(data)) {
        const zoneNumber = parseInt(data.slice(2, 4));
        const command = data.substring(4);
        if (command === 'CONT') {
            adapter.setState(`zone${zoneNumber}.zoneTurnOnModeChange`, 'Constant', true);
        }
        else if (command === 'TRIG') {
            adapter.setState(`zone${zoneNumber}.zoneTurnOnModeChange`, 'Trigger in', true);
        }
        else if (command === 'ASIG') {
            adapter.setState(`zone${zoneNumber}.zoneTurnOnModeChange`, 'Audio signal', true);
        }
        else if (command === 'OFF') {
            adapter.setState(`zone${zoneNumber}.zoneTurnOnModeChange`, 'Off', true);
        }
        return;
    }
    else if (/SV[0-9]+/g.test(data)) {
        const zoneNumber = parseInt(data.slice(2, 4)) % 2 ? parseInt(data.slice(2, 4)) + 1 : parseInt(data.slice(2, 4));
        const volume = parseFloat(`${data.slice(4, 6)}.${data.slice(6, 7)}`);
        const state = await adapter.getStateAsync(`zone${zoneNumber}.operationMode`);
        if (((_a = state === null || state === void 0 ? void 0 : state.val) === null || _a === void 0 ? void 0 : _a.toString()) === '0' || (state === null || state === void 0 ? void 0 : state.val) === 'NORMAL') {
            const speaker = parseInt(data.slice(2, 4)) === zoneNumber ? 'speakerTwo' : 'speakerOne';
            adapter.setState(`zone${zoneNumber}.${speaker}Volume`, volume, true);
        }
        else {
            adapter.setState(`zone${zoneNumber}.speakerOneVolume`, volume, true);
            adapter.setState(`zone${zoneNumber}.speakerTwoVolume`, volume, true);
        }
        return;
    }
    else if (/SO\d\d.+/g.test(data)) {
        const zoneNumber = parseInt(data.slice(2, 4));
        const command = data.substring(4);
        if (command === 'NOR') {
            adapter.setState(`zone${zoneNumber}.operationMode`, 'NORMAL', true);
        }
        else if (command === 'BRI') {
            adapter.setState(`zone${zoneNumber}.operationMode`, 'BRIDGED', true);
        }
        return;
    }
    else if (/SF\d\d.+/g.test(data)) {
        const zoneNumber = parseInt(data.slice(2, 4)) % 2 ? parseInt(data.slice(2, 4)) + 1 : parseInt(data.slice(2, 4));
        const command = data.substring(4);
        const state = await adapter.getStateAsync(`zone${zoneNumber}.operationMode`);
        if (((_b = state === null || state === void 0 ? void 0 : state.val) === null || _b === void 0 ? void 0 : _b.toString()) === '0' || (state === null || state === void 0 ? void 0 : state.val) === 'NORMAL') {
            const speaker = parseInt(data.slice(2, 4)) === zoneNumber ? 'SpeakerTwo' : 'SpeakerOne';
            if (command === 'OFF') {
                adapter.setState(`zone${zoneNumber}.lowCutFilter${speaker}`, false, true);
            }
            else if (command === 'ON') {
                adapter.setState(`zone${zoneNumber}.lowCutFilter${speaker}`, true, true);
            }
        }
        else {
            if (command === 'ON') {
                adapter.setState(`zone${zoneNumber}.lowCutFilterSpeakerOne`, true, true);
                adapter.setState(`zone${zoneNumber}.lowCutFilterSpeakerTwo`, true, true);
            }
            else if (command === 'OFF') {
                adapter.setState(`zone${zoneNumber}.lowCutFilterSpeakerOne`, false, true);
                adapter.setState(`zone${zoneNumber}.lowCutFilterSpeakerTwo`, false, true);
            }
        }
        return;
    }
    else if (/SI\d\d.+/g.test(data)) {
        const zoneNumber = parseInt(data.slice(2, 4)) % 2 ? parseInt(data.slice(2, 4)) + 1 : parseInt(data.slice(2, 4));
        const command = data.substring(4);
        const state = await adapter.getStateAsync(`zone${zoneNumber}.operationMode`);
        if ((state === null || state === void 0 ? void 0 : state.val) === '0' || (state === null || state === void 0 ? void 0 : state.val) === 'NORMAL') {
            const speaker = parseInt(data.slice(2, 4)) === zoneNumber ? 'Two' : 'One';
            const obj = (await adapter.getObjectAsync(`zone${zoneNumber}.selectInputOne`));
            for (const j of Object.keys(obj.common.states)) {
                // Check if command contains one of the possible brightness states
                if (helper
                    .decodeState(obj.common.states, j)
                    .replace(' ', '')
                    .toLowerCase()
                    .includes(command.toLowerCase())) {
                    adapter.setState(`zone${zoneNumber}.selectInput${speaker}`, obj.common.states[j], true);
                }
            }
        }
        else {
            const obj = (await adapter.getObjectAsync(`zone${zoneNumber}.selectInputOne`));
            for (const j of Object.keys(obj.common.states)) {
                // Check if command contains one of the possible brightness states
                if (helper
                    .decodeState(obj.common.states, j)
                    .replace(' ', '')
                    .toLowerCase()
                    .includes(command.toLowerCase())) {
                    adapter.setState(`zone${zoneNumber}.selectInputOne`, obj.common.states[j], true);
                    adapter.setState(`zone${zoneNumber}.selectInputTwo`, obj.common.states[j], true);
                }
            }
        }
        return;
    }
    else if (/TI\d\d.+/g.test(data)) {
        const zoneNumber = parseInt(data.slice(2, 4));
        const command = data.substring(4);
        if (command === 'YES') {
            adapter.setState(`zone${zoneNumber}.triggerInput`, true, true);
        }
        else if (command === 'NO') {
            adapter.setState(`zone${zoneNumber}.triggerInput`, false, true);
        }
        return;
    }
    else if (/AI\d\d.+/g.test(data)) {
        const zoneNumber = parseInt(data.slice(2, 4));
        const command = data.substring(4);
        if (command === 'YES') {
            adapter.setState(`zone${zoneNumber}.audioSignalInput`, true, true);
        }
        else if (command === 'NO') {
            adapter.setState(`zone${zoneNumber}.audioSignalInput`, false, true);
        }
        return;
    }
    switch (data) {
        case 'PW00ON':
            adapter.setState('settings.powerSystem', true, true);
            break;
        case 'PW00STANDBY':
            adapter.setState('settings.powerSystem', false, true);
            break;
        case 'TI00YES':
            adapter.setState('settings.masterTriggerInput', true, true);
            break;
        case 'TI00NO':
            adapter.setState('settings.masterTriggerInput', false, true);
            break;
        case 'ST00PBTN':
            adapter.setState('powerConfigurationChange', 'Power Button', true);
            break;
        case 'ST00TRIG':
            adapter.setState('powerConfigurationChange', 'Master Trigger', true);
            break;
        case 'ST00ONLI':
            adapter.setState('powerConfigurationChange', 'On Line', true);
            break;
        default:
            adapter.log.debug(`[INFO] <== Unhandled US command ${data}`);
    }
}
/**
 * Handle state change for US receiver
 * @param id state id
 * @param stateVal state value
 */
async function handleUsStateChange(id, stateVal) {
    var _a, _b, _c;
    let zoneNumber = '';
    if (id.startsWith('zone')) {
        zoneNumber = id.split('.').shift().substring(4);
        zoneNumber = parseInt(zoneNumber) < 10 ? `0${zoneNumber}` : zoneNumber;
        id = id.split('.').pop();
    }
    switch (id) {
        case 'settings.powerSystem':
            if (stateVal === true) {
                await sendRequest('PW00ON');
            }
            else {
                await sendRequest('PW00STANDBY');
            }
            break;
        case 'settings.expertReadingPattern':
            try {
                new RegExp(stateVal);
                await adapter.setStateAsync('settings.expertReadingPattern', stateVal, true);
            }
            catch (e) {
                adapter.log.warn(`[COMMAND] Cannot update expert reading pattern: ${e.message}`);
            }
            break;
        case 'display.brightness': {
            const obj = await adapter.getObjectAsync('display.brightness');
            await sendRequest(`SD00${helper.decodeState(obj.common.states, stateVal).toUpperCase().slice(0, 3)}`);
            break;
        }
        case 'settings.expertCommand': {
            // Sending custom commands
            await sendRequest(stateVal);
            const state = await adapter.getStateAsync('info.connection');
            if ((state === null || state === void 0 ? void 0 : state.val) === true) {
                adapter.setState('settings.expertCommand', stateVal, true);
            }
            break;
        }
        case 'settings.powerConfigurationChange':
            if (stateVal.toUpperCase() === 'POWER BUTTON' || stateVal === '0') {
                await sendRequest('ST00PBTN');
            }
            else if (stateVal.toUpperCase() === 'MASTER TRIGGER' || stateVal === '1') {
                await sendRequest('ST00TRIG');
            }
            else if (stateVal.toUpperCase() === 'ON LINE' || stateVal === '2') {
                await sendRequest('ST00ONLI');
            }
            break;
        case 'settings.masterTriggerInput':
            if (stateVal) {
                await sendRequest('TI00YES');
            }
            else {
                await sendRequest('TI00NO');
            }
            break;
        case 'audioSignalInput':
            if (stateVal) {
                await sendRequest(`AI${zoneNumber}YES`);
            }
            else {
                await sendRequest(`AI${zoneNumber}NO`);
            }
            break;
        case 'lowCutFilterSpeakerOne': {
            const state = await adapter.getStateAsync(`zone${parseInt(zoneNumber)}.operationMode`);
            if (((_a = state === null || state === void 0 ? void 0 : state.val) === null || _a === void 0 ? void 0 : _a.toString()) === '0' || (state === null || state === void 0 ? void 0 : state.val) === 'NORMAL') {
                const calculatedZoneNumber = parseInt(zoneNumber) % 2 ? parseInt(zoneNumber) : parseInt(zoneNumber) - 1;
                zoneNumber = calculatedZoneNumber < 10 ? `0${calculatedZoneNumber}` : calculatedZoneNumber.toString();
            }
            if (stateVal) {
                await sendRequest(`SF${zoneNumber}ON`);
            }
            else {
                await sendRequest(`SF${zoneNumber}OFF`);
            }
            break;
        }
        case 'lowCutFilterSpeakerTwo':
            if (stateVal) {
                await sendRequest(`SF${zoneNumber}ON`);
            }
            else {
                await sendRequest(`SF${zoneNumber}OFF`);
            }
            break;
        case 'operationMode':
            if (stateVal === 0 || stateVal === 'NORMAL') {
                await sendRequest(`SO${zoneNumber}NOR`);
            }
            else {
                await sendRequest(`SO${zoneNumber}BRI`);
            }
            break;
        case 'selectInputOne': {
            const state = await adapter.getStateAsync(`zone${parseInt(zoneNumber)}.operationMode`);
            if (((_b = state === null || state === void 0 ? void 0 : state.val) === null || _b === void 0 ? void 0 : _b.toString()) === '0' || (state === null || state === void 0 ? void 0 : state.val) === 'NORMAL') {
                const calculatedZoneNumber = parseInt(zoneNumber) % 2 ? parseInt(zoneNumber) : parseInt(zoneNumber) - 1;
                zoneNumber = calculatedZoneNumber < 10 ? `0${calculatedZoneNumber}` : calculatedZoneNumber.toString();
            }
            await sendRequest(`SI${zoneNumber}${stateVal.replace(' ', '')}`);
            break;
        }
        case 'selectInputTwo':
            await sendRequest(`SI${zoneNumber}${stateVal.replace(' ', '')}`);
            break;
        case 'speakerOneVolume': {
            const state = await adapter.getStateAsync(`zone${parseInt(zoneNumber)}.operationMode`);
            if (((_c = state === null || state === void 0 ? void 0 : state.val) === null || _c === void 0 ? void 0 : _c.toString()) === '0' || (state === null || state === void 0 ? void 0 : state.val) === 'NORMAL') {
                const calculatedZoneNumber = parseInt(zoneNumber) % 2 ? parseInt(zoneNumber) : parseInt(zoneNumber) - 1;
                zoneNumber = calculatedZoneNumber < 10 ? `0${calculatedZoneNumber}` : calculatedZoneNumber.toString();
            }
            const vol = helper.inputToVol(stateVal);
            await sendRequest(`SV${zoneNumber}${vol}`);
            adapter.log.debug(`[INFO] <== Changed speakerOneVolume to ${vol}`);
            break;
        }
        case 'speakerTwoVolume': {
            const vol = helper.inputToVol(stateVal);
            await sendRequest(`SV${zoneNumber}${vol}`);
            adapter.log.debug(`[INFO] <== Changed speakerTwoVolume to ${vol}`);
            break;
        }
        case 'triggerInput':
            if (stateVal) {
                await sendRequest(`TI${zoneNumber}YES`);
            }
            else {
                await sendRequest(`TI${zoneNumber}NO`);
            }
            break;
        case 'zoneTurnOnModeChange':
            if (stateVal.toString() === '0' || stateVal.toUpperCase() === 'CONSTANT') {
                await sendRequest(`ST${zoneNumber}CONT`);
            }
            else if (stateVal.toString() === '1' || stateVal.toUpperCase() === 'TRIGGER IN') {
                await sendRequest(`ST${zoneNumber}TRIG`);
            }
            else if (stateVal.toString() === '2' || stateVal.toUpperCase() === 'AUDIO SIGNAL') {
                await sendRequest(`ST${zoneNumber}ASIG`);
            }
            else if (stateVal.toString() === '3' || stateVal.toUpperCase() === 'OFF') {
                await sendRequest(`ST${zoneNumber}OFF`);
            }
            break;
        default:
            adapter.log.error(`[COMMAND] ${id} is not a valid US state`);
    }
}
/**
 * Handle single response from AVR
 *
 * @param data
 */
async function handleResponse(data) {
    if (!pollTimer) {
        // Keep connection alive & poll states
        pollTimer = setTimeout(() => pollStates(), pollInterval); // Poll states every configured seconds
    }
    // independent from receiver we handle the expert pattern
    const expertPattern = await adapter.getStateAsync('settings.expertReadingPattern');
    // if ack is false, it was not a valid regex
    if ((expertPattern === null || expertPattern === void 0 ? void 0 : expertPattern.val) && expertPattern.ack === true) {
        const expertRegex = new RegExp(expertPattern.val);
        if (expertRegex.test(data)) {
            adapter.setState('settings.expertReadingResult', data, true);
        }
    }
    // Detect receiver type --> first poll is SV? and SV00?
    if (!receiverType) {
        if (data.startsWith('SV') || /^MV\d+/g.test(data)) {
            if (/^SV[\d]+/g.test(data)) {
                receiverType = 'US';
                await createStandardStates('US');
                adapter.log.debug('[UPDATE] Updating states');
                return void updateStates(); // Update states when connected
            }
            else {
                receiverType = 'DE';
                await createStandardStates('DE');
                adapter.log.debug('[UPDATE] Updating states');
                return void updateStates();
            }
        }
        else if (data.startsWith('BDSTATUS')) {
            // DENON Ceol Piccolo protocol detected , but we handle it as DE
            receiverType = 'DE';
            await createStandardStates('DE');
            adapter.log.debug('[UPDATE] Updating states');
            return void updateStates();
        }
        else {
            return;
        } // return if remote command received before response to SV (receiverCheck)
    }
    else if (receiverType === 'US') {
        return void handleUsResponse(data);
    }
    // get command out of String
    let command;
    if (/^Z\d.*/g.test(data)) {
        // Transformation for Zone2+ commands
        const zoneNumber = parseInt(data.slice(1, 2));
        if (!zonesCreated[zoneNumber]) {
            await createZone(zoneNumber);
        } // Create Zone2+ states if not done yet
        command = data.replace(/\s+|\d+/g, '');
        if (command === 'Z') {
            // If everything is removed except Z --> Volume
            let vol = data.substring(2).replace(/\s|[A-Z]/g, '');
            vol = `${vol.slice(0, 2)}.${vol.slice(2, 4)}`; // Slice volume from string
            adapter.setState(`zone${zoneNumber}.volume`, parseFloat(vol), true);
            adapter.setState(`zone${zoneNumber}.volumeDB`, parseFloat(vol) - 80, true);
            return;
        }
        else {
            command = `Z${zoneNumber}${command.slice(1, command.length)}`;
        }
        if (/^Z\dQUICK.*/g.test(data) || /^Z\dSMART.*/g.test(data)) {
            const quickNr = parseInt(data.slice(-1));
            try {
                const state = await adapter.getStateAsync(`zone${zoneNumber}.quickSelect`);
                if ((state === null || state === void 0 ? void 0 : state.val) === quickNr && state.ack) {
                    return;
                }
            }
            catch (_a) {
                // ignore
            }
            adapter.setState(`zone${zoneNumber}.quickSelect`, quickNr, true);
            return;
        }
        else if (/^Z\d.*/g.test(command)) {
            // Encode Input Source
            const obj = await adapter.getObjectAsync('zoneMain.selectInput');
            let zoneSi = data.substring(2);
            zoneSi = zoneSi.replace(' ', ''); // Remove blank
            for (const j of Object.keys(obj.common.states)) {
                // Check if command contains one of the possible Select Inputs
                if (helper.decodeState(obj.common.states, j.toString()) === zoneSi) {
                    ensureAttrInStates(`zone${zoneNumber}.selectInput`, zoneSi);
                    adapter.setState(`zone${zoneNumber}.selectInput`, zoneSi, true);
                    return;
                }
            }
        }
    }
    else {
        // Transformation for normal commands
        command = data.replace(/\s+|\d+/g, '');
    }
    if (command.startsWith('DIM')) {
        // Handle display brightness
        const obj = (await adapter.getObjectAsync('display.brightness'));
        const bright = data.substring(4);
        for (const j of Object.keys(obj.common.states)) {
            // Check if command contains one of the possible brightness states
            if (helper.decodeState(obj.common.states, j).toLowerCase().includes(bright.toLowerCase())) {
                adapter.setState('display.brightness', obj.common.states[j], true);
            }
        }
        return;
    }
    else if (command.startsWith('SI')) {
        // Handle select input
        let siCommand = data.substring(2); // Get only source name
        siCommand = siCommand.replace(' ', ''); // Remove blanks
        ensureAttrInStates('zoneMain.selectInput', siCommand);
        adapter.setState('zoneMain.selectInput', siCommand, true);
        return;
    }
    else if (command.startsWith('MS') && command !== 'MSQUICK' && command !== 'MSSMART') {
        // Handle Surround mode
        const msCommand = data.substring(2); // use data because ms can have digits and spaces
        adapter.setState('settings.surroundMode', msCommand, true);
        return;
    }
    else if (command === 'MSQUICK' || command === 'MSSMART') {
        const quickNr = parseInt(data.slice(-1));
        const state = await adapter.getStateAsync('zoneMain.quickSelect');
        if ((state === null || state === void 0 ? void 0 : state.val) === quickNr && (state === null || state === void 0 ? void 0 : state.ack)) {
            return;
        }
        adapter.setState('zoneMain.quickSelect', quickNr, true);
        return;
    }
    else if (command.startsWith('NSE') && !command.startsWith('NSET')) {
        // Handle display content
        if (command === 'NSE') {
            // on older models it sometimes sends just NSE for unknown reasons - ignore it
            return;
        }
        const displayCont = data.substring(4).replace(/[\0\1\2]/g, ''); // Remove all STX, SOH, NULL
        const dispContNr = data.slice(3, 4);
        if (!capabilities.display) {
            await createDisplayAndHttp();
        }
        adapter.setState(`display.displayContent${dispContNr}`, displayCont, true);
        return;
    }
    else if (command.startsWith('NSET')) {
        // Network settings info
        return;
    }
    else if (command.startsWith('SV')) {
        // Select Video
        return;
    }
    else if (command.startsWith('NSFRN')) {
        // Handle friendly name
        adapter.setState('info.friendlyName', data.substring(6), true);
        return;
    }
    else if (command.startsWith('PSMULTEQ')) {
        const state = data.split(':')[1];
        adapter.setState('settings.multEq', state, true);
        return;
    }
    else if (command.startsWith('PSDYNVOL')) {
        const state = data.split(' ')[1];
        adapter.setState('settings.dynamicVolume', state, true);
        return;
    }
    else if (command.startsWith('VSMONI')) {
        const state = data.substring(6);
        if (!capabilities.multiMonitor) {
            // make sure that state exists
            await createMonitorState();
        }
        if (state === 'AUTO') {
            adapter.setState('settings.outputMonitor', 0, true);
        }
        else {
            adapter.setState('settings.outputMonitor', parseInt(state), true);
        }
        return;
    }
    else if (command.startsWith('VSVPM')) {
        const processingMode = data.substring(4);
        if (!capabilities.multiMonitor) {
            // make sure that state exists
            await createMonitorState();
        }
        adapter.setState('settings.videoProcessingMode', processingMode, true);
        return;
    }
    else if (command.startsWith('PV') && command.length > 2) {
        const pictureMode = data.substring(1);
        if (!capabilities.pictureMode) {
            await createPictureMode();
        }
        const obj = await adapter.getObjectAsync('settings.pictureMode');
        adapter.setState('settings.pictureMode', obj.common.states[pictureMode], true);
        return;
    }
    else if (command.startsWith('NSH')) {
        const presetNumber = parseInt(data.slice(3, 5));
        const state = await adapter.getStateAsync('info.onlinePresets');
        let knownPresets;
        if (!state || !state.val) {
            knownPresets = {};
        }
        else {
            knownPresets = JSON.parse(state.val);
        }
        knownPresets[presetNumber] = {
            id: presetNumber,
            channel: data.substring(5).replace(/\s\s+/g, '')
        };
        const sortedPresets = [];
        Object.keys(knownPresets)
            .sort()
            // @ts-expect-error revisit this, cannot test currently
            .forEach(key => (sortedPresets[key] = knownPresets[key]));
        adapter.setState('info.onlinePresets', JSON.stringify(sortedPresets), true);
        return;
    }
    else if (command.startsWith('TFANNAME')) {
        // get name only
        const stationName = data.substring(8);
        adapter.setState('tuner.stationName', stationName, true);
        return;
    }
    else if (command === 'TFAN') {
        // example TFAN010690 -> 106.9 always 6 digits with 2 decimals
        const freq = parseFloat(`${data.substring(4, 8)}.${data.substring(8)}`);
        adapter.setState('tuner.frequency', freq, true);
        return;
    }
    let zoneNumber = '';
    if (/Z\d.+/g.test(command)) {
        // remove zone number from command and save it
        zoneNumber = command.slice(1, 2);
        command = `Z${command.substring(2)}`;
    }
    adapter.log.debug(`[INFO] <== Command to handle is ${command}`);
    switch (command) {
        case 'PWON':
            adapter.setState('settings.powerSystem', true, true);
            break;
        case 'PWSTANDBY':
            adapter.setState('settings.powerSystem', false, true);
            break;
        case 'MV':
            data = `${data.slice(2, 4)}.${data.slice(4, 5)}`; // Slice volume from string
            adapter.setState('zoneMain.volume', parseFloat(data), true);
            adapter.setState('zoneMain.volumeDB', parseFloat(data) - 80, true);
            break;
        case 'MVMAX':
            data = `${data.slice(6, 8)}.${data.slice(8, 9)}`;
            adapter.setState('zoneMain.maximumVolume', parseFloat(data), true);
            adapter.setState('zoneMain.maximumVolumeDB', parseFloat(data) - 80, true);
            break;
        case 'MUON':
            adapter.setState('zoneMain.muteIndicator', true, true);
            break;
        case 'MUOFF':
            adapter.setState('zoneMain.muteIndicator', false, true);
            break;
        case 'ZON':
            adapter.setState(`zone${zoneNumber}.powerZone`, true, true);
            break;
        case 'ZOFF':
            adapter.setState(`zone${zoneNumber}.powerZone`, false, true);
            break;
        case 'ZMUON':
            adapter.setState(`zone${zoneNumber}.muteIndicator`, true, true);
            break;
        case 'ZMUOFF':
            adapter.setState(`zone${zoneNumber}.muteIndicator`, false, true);
            break;
        case 'ZMON':
            adapter.setState('zoneMain.powerZone', true, true);
            break;
        case 'ZMOFF':
            adapter.setState('zoneMain.powerZone', false, true);
            break;
        case 'SLP': {
            data = data.slice(3, data.length);
            const state = await adapter.getStateAsync('zoneMain.sleepTimer');
            if ((state === null || state === void 0 ? void 0 : state.val) === parseInt(data) && (state === null || state === void 0 ? void 0 : state.ack)) {
                return;
            }
            adapter.setState('zoneMain.sleepTimer', parseFloat(data), true);
            break;
        }
        case 'SLPOFF': {
            adapter.setStateChanged('zoneMain.sleepTimer', 0, true);
            break;
        }
        case 'ZSLP':
            data = data.slice(5, data.length);
            adapter.setStateChanged(`zone${zoneNumber}.sleepTimer`, parseFloat(data), true);
            break;
        case 'ZSLPOFF':
            adapter.setStateChanged(`zone${zoneNumber}.sleepTimer`, 0, true);
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
        case 'PSSWL': {
            // Handle Subwoofer Level for first and second SW
            command = data.split(' ')[0];
            const volDb = helper.volToDb(data.split(' ')[1]);
            if (command === 'PSSWL') {
                // Check if PSSWL or PSSWL2
                adapter.setState('settings.subwooferLevel', volDb, true);
            }
            else {
                if (!capabilities.subTwo) {
                    // make sure sub two state exists
                    await createSubTwo();
                }
                adapter.setState('settings.subwooferTwoLevel', volDb, true);
            }
            break;
        }
        case 'PSLFCON':
            if (!capabilities.audysseyLfc) {
                await createLfcAudyssey();
            }
            adapter.setState('settings.audysseyLfc', true, true);
            break;
        case 'PSLFCOFF':
            if (!capabilities.audysseyLfc) {
                await createLfcAudyssey();
            }
            adapter.setState('settings.audysseyLfc', false, true);
            break;
        case 'PSCNTAMT': {
            const state = data.split(' ')[1];
            if (!capabilities.audysseyLfc) {
                await createLfcAudyssey();
            }
            adapter.setState('settings.containmentAmount', parseFloat(state), true);
            break;
        }
        case 'PSREFLEV': {
            const state = data.split(' ')[1];
            adapter.setState('settings.referenceLevelOffset', state, true);
            break;
        }
        case 'PSBAS': {
            const volDb = helper.volToDb(data.split(' ')[1]);
            adapter.setState('zoneMain.equalizerBass', volDb, true);
            break;
        }
        case 'PSTRE': {
            const volDb = helper.volToDb(data.split(' ')[1]);
            adapter.setState('zoneMain.equalizerTreble', volDb, true);
            break;
        }
        case 'ZPSTRE': {
            const volDb = helper.volToDb(data.split(' ')[1]);
            adapter.setState(`zone${zoneNumber}.equalizerTreble`, volDb, true);
            break;
        }
        case 'ZPSBAS': {
            const volDb = helper.volToDb(data.split(' ')[1]);
            adapter.setState(`zone${zoneNumber}.equalizerBass`, volDb, true);
            break;
        }
        case 'ZCVFL': {
            const channelVolume = data.split(' ')[1];
            adapter.setState(`zone${zoneNumber}.channelVolumeFrontLeft`, helper.volToDb(channelVolume), true);
            break;
        }
        case 'ZCVFR': {
            const channelVolume = data.split(' ')[1];
            adapter.setState(`zone${zoneNumber}.channelVolumeFrontRight`, helper.volToDb(channelVolume), true);
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
        case 'PSLFE': {
            // LFE --> amount of subwoofer signal additional directed to speakers
            const lfeAmount = parseInt(data.split(' ')[1]);
            adapter.setState('settings.lfeAmount', lfeAmount, true);
            break;
        }
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
        case 'CVSDL': {
            const channelVolume = data.split(' ')[1];
            adapter.setState('zoneMain.channelVolumeSurroundDolbyLeft', helper.volToDb(channelVolume), true);
            break;
        }
        case 'CVSDR': {
            const channelVolume = data.split(' ')[1];
            adapter.setState('zoneMain.channelVolumeSurroundDolbyRight', helper.volToDb(channelVolume), true);
            break;
        }
        case 'CVFDL': {
            const channelVolume = data.split(' ')[1];
            adapter.setState('zoneMain.channelVolumeFrontDolbyLeft', helper.volToDb(channelVolume), true);
            break;
        }
        case 'CVFDR': {
            const channelVolume = data.split(' ')[1];
            adapter.setState('zoneMain.channelVolumeFrontDolbyRight', helper.volToDb(channelVolume), true);
            break;
        }
        case 'CVSHL': {
            const channelVolume = data.split(' ')[1];
            adapter.setState('zoneMain.channelVolumeSurroundHeightLeft', helper.volToDb(channelVolume), true);
            break;
        }
        case 'CVSHR': {
            const channelVolume = data.split(' ')[1];
            adapter.setState('zoneMain.channelVolumeSurroundHeightRight', helper.volToDb(channelVolume), true);
            break;
        }
        case 'CVFHR': {
            const channelVolume = data.split(' ')[1];
            adapter.setState('zoneMain.channelVolumeFrontHeightRight', helper.volToDb(channelVolume), true);
            break;
        }
        case 'CVFHL': {
            const channelVolume = data.split(' ')[1];
            adapter.setState('zoneMain.channelVolumeFrontHeightLeft', helper.volToDb(channelVolume), true);
            break;
        }
        case 'CVRHR': {
            const channelVolume = data.split(' ')[1];
            adapter.setState('zoneMain.channelVolumeRearHeightRight', helper.volToDb(channelVolume), true);
            break;
        }
        case 'CVRHL': {
            const channelVolume = data.split(' ')[1];
            adapter.setState('zoneMain.channelVolumeRearHeightLeft', helper.volToDb(channelVolume), true);
            break;
        }
        case 'CVSW': {
            // can be subwoofer or subwooferTwo
            const channelVolume = data.split(' ')[1];
            command = data.split(' ')[0];
            if (command === 'CVSW') {
                // Check if CVSW or CVSW2
                adapter.setState('zoneMain.channelVolumeSubwoofer', helper.volToDb(channelVolume), true);
            }
            else {
                adapter.setState('zoneMain.channelVolumeSubwooferTwo', helper.volToDb(channelVolume), true);
            }
            break;
        }
        case 'PSDILON':
            adapter.setState('settings.dialogLevelAdjust', true, true);
            break;
        case 'PSDILOFF':
            adapter.setState('settings.dialogLevelAdjust', false, true);
            break;
        case 'PSDIL': {
            const level = data.split(' ')[1];
            adapter.setState('settings.dialogLevel', helper.volToDb(level), true);
            break;
        }
        case 'PSDIC': {
            const level = parseInt(data.split(' ')[1]);
            adapter.setState('settings.dialogControl', level, true);
            break;
        }
        case 'SPPR': {
            if (!capabilities.speakerPreset) {
                await createSpeakerPreset();
            }
            const preset = parseInt(data.split(' ')[1]);
            adapter.setState('settings.speakerPreset', preset, true);
            break;
        }
        default:
            adapter.log.debug(`[INFO] <== Unhandled command ${command}`);
    }
}
/**
 * Create all zone specific objects for given zone
 *
 * @param zone - zone number to be created
 */
async function createZone(zone) {
    const promises = [];
    promises.push(adapter.setObjectNotExistsAsync(`zone${zone}`, {
        type: 'channel',
        common: {
            name: `Zone ${zone}`
        },
        native: {}
    }));
    promises.push(adapter.setObjectNotExistsAsync(`zone${zone}.powerZone`, {
        type: 'state',
        common: {
            name: `Zone ${zone} Power State`,
            role: 'switch.power.zone',
            type: 'boolean',
            write: true,
            read: true
        },
        native: {}
    }));
    promises.push(adapter.setObjectNotExistsAsync(`zone${zone}.volume`, {
        type: 'state',
        common: {
            name: `Zone ${zone} Volume`,
            role: 'level.volume.zone',
            type: 'number',
            read: true,
            write: true,
            min: 0,
            max: 98
        },
        native: {}
    }));
    promises.push(adapter.setObjectNotExistsAsync(`zone${zone}.volumeDB`, {
        type: 'state',
        common: {
            name: `Zone ${zone} VolumeDB`,
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
    promises.push(adapter.setObjectNotExistsAsync(`zone${zone}.volumeUp`, {
        type: 'state',
        common: {
            name: `Zone ${zone} Volume Up`,
            role: 'button',
            type: 'boolean',
            write: true,
            read: false
        },
        native: {}
    }));
    promises.push(adapter.setObjectNotExistsAsync(`zone${zone}.volumeDown`, {
        type: 'state',
        common: {
            name: `Zone ${zone} Volume Down`,
            role: 'button',
            type: 'boolean',
            write: true,
            read: false
        },
        native: {}
    }));
    promises.push(adapter.extendObjectAsync(`zone${zone}.selectInput`, {
        type: 'state',
        common: {
            name: `Zone ${zone} Select input`,
            role: 'media.input',
            type: 'string',
            write: true,
            read: true,
            states: {
                0: 'PHONO',
                1: 'CD',
                2: 'TUNER',
                3: 'DVD',
                4: 'BD',
                5: 'TV',
                6: 'SAT/CBL',
                7: 'MPLAY',
                8: 'GAME',
                9: 'NET',
                10: 'SPOTIFY',
                11: 'LASTFM',
                12: 'IRADIO',
                13: 'SERVER',
                14: 'FAVORITES',
                15: 'AUX1',
                16: 'AUX2',
                17: 'AUX3',
                18: 'AUX4',
                19: 'AUX5',
                20: 'AUX6',
                21: 'AUX7',
                22: 'BT',
                23: 'USB'
            }
        },
        native: {}
    }, { preserve: { common: ['name'] } }));
    promises.push(adapter.setObjectNotExistsAsync(`zone${zone}.muteIndicator`, {
        type: 'state',
        common: {
            name: `Zone ${zone} Muted`,
            role: 'media.mute',
            type: 'boolean',
            write: true,
            read: true
        },
        native: {}
    }));
    promises.push(adapter.setObjectNotExistsAsync(`zone${zone}.quickSelect`, {
        type: 'state',
        common: {
            name: `Zone ${zone} Quick select`,
            role: 'media.quickSelect',
            type: 'number',
            write: true,
            read: true,
            min: 1,
            max: 5
        },
        native: {}
    }));
    promises.push(adapter.setObjectNotExistsAsync(`zone${zone}.sleepTimer`, {
        type: 'state',
        common: {
            name: `Zone ${zone} Sleep Timer`,
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
    promises.push(adapter.setObjectNotExistsAsync(`zone${zone}.equalizerBass`, {
        type: 'state',
        common: {
            name: `Zone ${zone} Bass Level`,
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
    promises.push(adapter.setObjectNotExistsAsync(`zone${zone}.equalizerBassUp`, {
        type: 'state',
        common: {
            name: `Zone ${zone} Bass Up`,
            role: 'button',
            type: 'boolean',
            write: true,
            read: false
        },
        native: {}
    }));
    promises.push(adapter.setObjectNotExistsAsync(`zone${zone}.equalizerBassDown`, {
        type: 'state',
        common: {
            name: `Zone ${zone} Bass Down`,
            role: 'button',
            type: 'boolean',
            write: true,
            read: false
        },
        native: {}
    }));
    promises.push(adapter.setObjectNotExistsAsync(`zone${zone}.equalizerTreble`, {
        type: 'state',
        common: {
            name: `Zone ${zone} Treble`,
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
    promises.push(adapter.setObjectNotExistsAsync(`zone${zone}.equalizerTrebleUp`, {
        type: 'state',
        common: {
            name: `Zone ${zone} Treble Up`,
            role: 'button',
            type: 'boolean',
            write: true,
            read: false
        },
        native: {}
    }));
    promises.push(adapter.setObjectNotExistsAsync(`zone${zone}.equalizerTrebleDown`, {
        type: 'state',
        common: {
            name: `Zone ${zone} Treble Down`,
            role: 'button',
            type: 'boolean',
            write: true,
            read: false
        },
        native: {}
    }));
    promises.push(adapter.setObjectNotExistsAsync(`zone${zone}.channelVolumeFrontRight`, {
        type: 'state',
        common: {
            name: `Zone ${zone} Channel Volume Front Right`,
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
    promises.push(adapter.setObjectNotExistsAsync(`zone${zone}.channelVolumeFrontLeft`, {
        type: 'state',
        common: {
            name: `Zone ${zone} Channel Volume Front Left`,
            role: 'level',
            type: 'number',
            write: true,
            read: true,
            unit: 'dB',
            min: -12,
            max: 12
        },
        native: {}
    }));
    try {
        await Promise.all(promises);
        if (!zonesCreated[zone]) {
            adapter.log.debug(`[INFO] <== Zone ${zone} detected`);
        }
        zonesCreated[zone] = true;
    }
    catch (e) {
        adapter.log.warn(`Could not create zone ${zone}: ${e.message}`);
    }
}
/**
 * Creates the display states and more for AVRs which have an http-interface (states still updated via telnet)
 */
async function createDisplayAndHttp() {
    const promises = [];
    for (const [id, obj] of Object.entries(states.displayHttpStates)) {
        promises.push(adapter.extendObjectAsync(id, obj));
    }
    try {
        await Promise.all(promises);
        if (!capabilities.display) {
            adapter.setState('zoneMain.iconURL', `http://${host}/NetAudio/art.asp-jpg`, true);
            adapter.log.debug('[INFO] <== Display Content created');
        }
        capabilities.display = true;
    }
    catch (e) {
        adapter.log.error(`Could not create Display Content states: ${e.message}`);
    }
}
/**
 * Creates the monitor state objects
 */
async function createMonitorState() {
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
                0: 'AUTO',
                1: '1',
                2: '2'
            }
        },
        native: {}
    }));
    promises.push(adapter.extendObjectAsync('settings.videoProcessingMode', {
        type: 'state',
        common: {
            name: 'Video processing mode',
            role: 'video.processingMode',
            type: 'string',
            write: true,
            read: true,
            states: {
                0: 'AUTO',
                1: 'GAME',
                2: 'MOVIE'
            }
        },
        native: {}
    }, { preserve: { common: ['name'] } }));
    try {
        await Promise.all(promises);
        if (!capabilities.multiMonitor) {
            adapter.log.debug('[INFO] <== Created monitor states');
        }
        capabilities.multiMonitor = true;
    }
    catch (e) {
        adapter.log.error(`Could not create monitor states: ${e.message}`);
    }
}
/**
 * Creates the subwoofer two objects
 */
async function createSubTwo() {
    const promises = [];
    for (const [id, obj] of Object.entries(states.subwooferTwoStates)) {
        promises.push(adapter.extendObjectAsync(id, obj));
    }
    try {
        await Promise.all(promises);
        if (!capabilities.subTwo) {
            adapter.log.debug('[INFO] <== Created subwoofer two states');
        }
        capabilities.subTwo = true;
    }
    catch (e) {
        adapter.log.error(`Could not create subwoofer two states: ${e.message}`);
    }
}
/**
 * Creates th LFC Audyssey objects
 */
async function createLfcAudyssey() {
    const promises = [];
    for (const [id, obj] of Object.entries(states.lfcCommands)) {
        promises.push(adapter.extendObjectAsync(id, obj));
    }
    try {
        await Promise.all(promises);
        if (!capabilities.audysseyLfc) {
            adapter.log.debug('[INFO] <== Created Audyssey LFC states');
        }
        capabilities.audysseyLfc = true;
    }
    catch (e) {
        adapter.log.error(`Could not create Audyssey LFC states: ${e.message}`);
    }
}
/**
 * Creates the picture mode objects
 */
async function createPictureMode() {
    await adapter.setObjectNotExistsAsync('settings.pictureMode', {
        type: 'state',
        common: {
            name: 'Picture Mode Direct Change',
            role: 'media.pictureMode',
            type: 'string',
            write: true,
            read: false,
            states: {
                OFF: 'Off',
                STD: 'Standard',
                MOV: 'Movie',
                VVD: 'Vivid',
                STM: 'Stream',
                CTM: 'Custom',
                DAY: 'ISF Day',
                NGT: 'ISF Night'
            }
        },
        native: {}
    });
    capabilities.pictureMode = true;
}
/**
 * Creates the Speaker Preset Object
 */
async function createSpeakerPreset() {
    await adapter.setObjectNotExistsAsync('settings.speakerPreset', {
        type: 'state',
        common: {
            name: 'Speaker Preset',
            type: 'number',
            role: 'value',
            read: true,
            write: true,
            states: {
                1: '1',
                2: '2'
            }
        },
        native: {}
    });
    capabilities.speakerPreset = true;
}
/**
 * Ensures that the val is part of the state list of given object id
 *
 * @param id - object id
 * @param val - attribute which will be added to the object if not present
 */
async function ensureAttrInStates(id, val) {
    try {
        const obj = await adapter.getObjectAsync(id);
        if ((obj === null || obj === void 0 ? void 0 : obj.common) && helper.isObject(obj.common.states)) {
            const values = Object.values(obj.common.states);
            // check if its already part of the object
            if (!values.includes(val)) {
                obj.common.states[values.length] = val;
                await adapter.setObjectAsync(id, obj);
                adapter.log.info(`[INFO] Added ${val} to ${id}`);
            }
        }
    }
    catch (e) {
        adapter.log.error(`Could not ensure attribute ${val} to be in ${id}: ${e.message}`);
    }
}
/**
 * Create standard state objects
 *
 * @param type
 */
async function createStandardStates(type) {
    const promises = [];
    if (type === 'DE') {
        for (const obj of states.commonCommands) {
            const id = obj._id;
            // @ts-expect-error optimize structure
            delete obj._id;
            promises.push(adapter.extendObjectAsync(id, obj, { preserve: { common: ['name'] } }));
        }
        try {
            await Promise.all(promises);
            adapter.log.debug('[INFO] DE states created');
        }
        catch (e) {
            adapter.log.error(`Could not create DE states: ${e.message}`);
        }
    }
    else if (type === 'US') {
        for (const obj of states.usCommands) {
            const id = obj._id;
            // @ts-expect-error optimize structure
            delete obj._id;
            promises.push(adapter.extendObjectAsync(id, obj, { preserve: { common: ['name'] } }));
        }
        for (let i = 1; i <= 6; i++) {
            // iterate over zones
            const zoneNumber = i * 2;
            promises.push(adapter.setObjectNotExistsAsync(`zone${zoneNumber}`, {
                type: 'channel',
                common: {
                    name: 'Settings and device commands'
                },
                native: {}
            }));
            for (const obj of states.usCommandsZone) {
                const id = `zone${zoneNumber}.${obj._id}`;
                promises.push(adapter.setObjectNotExistsAsync(id, {
                    type: obj.type,
                    common: obj.common,
                    native: obj.native
                }));
            }
        }
        try {
            await Promise.all(promises);
            adapter.log.debug('[INFO] US states created');
        }
        catch (e) {
            adapter.log.error(`Could not create US states: ${e.message}`);
        }
    }
    else {
        throw new Error('Unknown receiver type');
    }
}
if (module === require.main) {
    startAdapter();
}
else {
    // export for compact mode
    module.exports = startAdapter;
}
//# sourceMappingURL=main.js.map