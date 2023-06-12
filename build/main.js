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
const utils = __importStar(require("@iobroker/adapter-core"));
const net_1 = __importDefault(require("net"));
const helper = __importStar(require("./lib/utils"));
const states = __importStar(require("./lib/states"));
const upnp_1 = require("./lib/upnp");
const states_1 = require("./lib/states");
class Denon extends utils.Adapter {
    constructor(options = {}) {
        super({ ...options, name: 'denon' });
        /** Commands to send on initial connection */
        this.updateCommands = [
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
        /** Commands to send during poll. Request Display State, Sleep Timer & Quick Select*/
        this.pollCommands = [
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
        ];
        this.client = new net_1.default.Socket();
        this.verboseConnection = true;
        // holds a true value for already created capabilities
        this.capabilities = {
            display: false,
            multiMonitor: false,
            subTwo: false,
            audysseyLfc: false,
            pictureMode: false,
            speakerPreset: false
        };
        /**
         * Mapping id to command
         */
        this.CHANNEL_VOLUME_MAPPINGS = {
            FrontLeft: 'FL',
            FrontRight: 'FR',
            Center: 'C',
            SurroundRight: 'SR',
            SurroundLeft: 'SL',
            SurroundDolbyRight: 'SDR',
            SurroundDolbyLeft: 'SDL',
            FrontDolbyLeft: 'FDL',
            FrontDolbyRight: 'FDR',
            FrontHeightLeft: 'FHL',
            FrontHeightRight: 'FHR',
            RearHeightLeft: 'RHL',
            RearHeightRight: 'RHR',
            SurroundHeightRight: 'SHR',
            SurroundHeightLeft: 'SHL',
            Subwoofer: 'SW',
            SubwooferTwo: 'SW2',
            SubwooferThree: 'SW3',
            SubwooferFour: 'SW4',
            SurroundBackLeft: 'SBL',
            SurroundBackRight: 'SBR',
            SurroundBack: 'SB',
            FrontWideLeft: 'FWL',
            FrontWideRight: 'FWR',
            TopFrontLeft: 'TFL',
            TopFrontRight: 'TFR',
            TopMiddleLeft: 'TML',
            TopMiddleRight: 'TMR',
            TopRearLeft: 'TRL',
            TopRearRight: 'TRR',
            BackDolbyLeft: 'BDL',
            BackDolbyRight: 'BDR',
            TopSurround: 'TS',
            CenterHeight: 'CH',
            TactileTransducer: 'TTR'
        };
        /**
         * Maps the channel volume command to last part of state id
         */
        this.CHANNEL_VOLUME_REMAPPING = helper.reverseObject(this.CHANNEL_VOLUME_MAPPINGS);
        this.zonesCreated = {};
        this.pollTimer = null;
        this.connectTimer = null;
        this.on('stateChange', this.onStateChange.bind(this));
        this.on('ready', this.onReady.bind(this));
        this.on('message', this.onMessage.bind(this));
        this.on('unload', this.onUnload.bind(this));
        this.init();
    }
    /**
     * Initialize the client handlers
     */
    init() {
        this.client.on('timeout', () => {
            this.pollTimer = null;
            this.log.warn('AVR timed out due to no response');
            this.reconnect();
        });
        this.client.on('error', (error) => {
            this.verboseConnection = error.code !== this.previousError;
            if (this.connectTimer) {
                return;
            }
            this.previousError = error.code;
            const logLevel = this.verboseConnection ? 'warn' : 'debug';
            if (error.code === 'ECONNREFUSED') {
                this.log[logLevel]('Connection refused, make sure that there is no other Telnet connection');
            }
            else if (error.code === 'EHOSTUNREACH') {
                this.log[logLevel]('AVR unreachable, check the Network Config of your AVR');
            }
            else if (error.code === 'EALREADY' || error.code === 'EISCONN') {
                return this.log[logLevel]('Adapter is already connecting/connected');
            }
            else if (error.code === 'ETIMEDOUT') {
                this.log[logLevel]('Connection timed out');
            }
            else {
                this.log[logLevel](`Connection closed: ${error}`);
            }
            this.reconnect();
        });
        this.client.on('end', () => {
            // Denon has closed the connection
            this.log.warn('Denon AVR has cancelled the connection');
            this.reconnect();
        });
        this.client.on('connect', async () => {
            // Successfully connected
            this.connectTimer = null;
            this.previousError = undefined;
            this.verboseConnection = true;
            this.setState('info.connection', true, true);
            this.log.info(`[CONNECT] Adapter connected to DENON-AVR: ${this.avrHost}:23`);
            if (!this.receiverType) {
                this.log.debug('[CONNECT] Connected --> Check receiver type');
                await this.sendRequests(['SV?', 'SV01?', 'BDSTATUS?', 'MV?']);
            }
            else {
                this.log.debug('[CONNECT] Connected --> updating states on start');
                this.updateStates(); // Update states when connected
            }
        });
        this.client.on('data', data => {
            // split data by <cr>
            const dataArr = data.toString().split(/[\r\n]+/); // Split by Carriage Return
            for (const data of dataArr) {
                if (data) {
                    // data not empty
                    this.log.debug(`[DATA] <== Incoming data: ${data}`);
                    this.handleResponse(data);
                }
            }
        });
    }
    /**
     * Is called when adapter shuts down - callback has to be called under any circumstances!
     */
    onUnload(callback) {
        try {
            if (this.connectTimer) {
                clearTimeout(this.connectTimer);
            }
            if (this.pollTimer) {
                clearTimeout(this.pollTimer);
            }
            this.log.info('[END] Stopping Denon AVR adapter...');
            this.setState('info.connection', false, true);
            this.client.destroy(); // kill connection
            this.client.unref(); // kill connection
            callback();
        }
        catch (_a) {
            callback();
        }
    }
    /**
     * Is called when databases are connected and adapter received configuration.
     */
    async onReady() {
        if (this.config.ip) {
            this.log.info('[START] Starting DENON AVR adapter');
            this.avrHost = this.config.ip;
            this.pollInterval = this.config.pollInterval || 7000;
            this.requestInterval = this.config.requestInterval || 100;
            this.subscribeStates('*');
            this.connect();
        }
        else {
            this.log.warn('No IP-address set');
        }
    }
    /**
     * Listen to messages from frontend
     *
     * @param obj the received message
     */
    async onMessage(obj) {
        if (typeof obj === 'object') {
            if (obj.command === 'browse') {
                // frontend will call browse
                if (obj.callback) {
                    this.log.info('start browse');
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
                        this.sendTo(obj.from, obj.command, { error: err, list: result }, obj.callback);
                    });
                }
            }
        }
    }
    /**
     * Is called if a subscribed state changes
     */
    async onStateChange(id, state) {
        // Ignore acknowledged state changes or error states
        if (!id || !state || state.ack || state.val === null) {
            return;
        }
        id = id.substring(this.namespace.length + 1); // remove instance name and id
        let stateVal = state.val; // only get state value
        let zoneNumber;
        if (/^zone\d\..+/g.test(id)) {
            zoneNumber = id.slice(4, 5);
            id = `zone.${id.substring(6)}`;
        }
        this.log.debug(`[COMMAND] State Change - ID: ${id}; State: ${stateVal}`);
        if (this.receiverType === 'US') {
            return this.handleUsStateChange(id, stateVal);
        }
        const channelVolStartsWith = 'zoneMain.channelVolume';
        if (id.startsWith(channelVolStartsWith)) {
            const channel = id.substring(channelVolStartsWith.length);
            const command = this.CHANNEL_VOLUME_MAPPINGS[channel];
            await this.sendRequest(`CV${command} ${helper.dbToVol(stateVal)}`);
        }
        switch (id) {
            case 'zoneMain.powerZone':
                if (stateVal === true) {
                    await this.sendRequest('ZMON');
                }
                else {
                    await this.sendRequest('ZMOFF');
                }
                break;
            case 'zoneMain.volume': {
                const vol = helper.inputToVol(stateVal);
                await this.sendRequest(`MV${vol}`);
                this.log.debug(`[INFO] <== Changed mainVolume to ${vol}`);
                break;
            }
            case 'zoneMain.volumeDB': {
                stateVal += 80; // convert to Vol
                const vol = helper.inputToVol(stateVal);
                await this.sendRequest(`MV${vol}`);
                this.log.debug(`[INFO] <== Changed mainVolume to ${vol}`);
                break;
            }
            case 'zoneMain.sleepTimer':
                if (!stateVal) {
                    // state === 0
                    await this.sendRequest('SLPOFF');
                }
                else if (stateVal < 10) {
                    await this.sendRequest(`SLP00${stateVal}`);
                }
                else if (stateVal < 100) {
                    await this.sendRequest(`SLP0${stateVal}`);
                }
                else if (stateVal <= 120) {
                    await this.sendRequest(`SLP${stateVal}`);
                }
                break;
            case 'zoneMain.volumeUp':
                await this.sendRequest('MVUP');
                break;
            case 'zoneMain.volumeDown':
                await this.sendRequest('MVDOWN');
                break;
            case 'zoneMain.muteIndicator':
                if (stateVal === true) {
                    await this.sendRequest('MUON');
                }
                else {
                    await this.sendRequest('MUOFF');
                }
                break;
            case 'zoneMain.playPause':
                await this.sendRequest('NS94');
                break;
            case 'zoneMain.play':
                await this.sendRequest('NS9A');
                break;
            case 'zoneMain.pause':
                await this.sendRequest('NS9B');
                break;
            case 'zoneMain.skipMinus':
                await this.sendRequest('NS9E');
                break;
            case 'zoneMain.skipPlus':
                await this.sendRequest('NS9D');
                break;
            case 'zoneMain.selectInput': {
                const obj = await this.getObjectAsync('zoneMain.selectInput');
                await this.sendRequest(`SI${helper.decodeState(obj.common.states, state.val).toUpperCase()}`);
                break;
            }
            case 'zoneMain.quickSelect':
                await this.sendRequests([`MSQUICK${stateVal}`, `MSSMART${stateVal}`]);
                break;
            case 'zoneMain.equalizerBassUp':
                await this.sendRequest('PSBAS UP');
                break;
            case 'zoneMain.equalizerBassDown':
                await this.sendRequest('PSBAS DOWN');
                break;
            case 'zoneMain.equalizerTrebleUp':
                await this.sendRequest('PSTRE UP');
                break;
            case 'zoneMain.equalizerTrebleDown':
                await this.sendRequest('PSTRE DOWN');
                break;
            case 'zoneMain.equalizerBass':
                stateVal = helper.dbToVol(stateVal);
                await this.sendRequest(`PSBAS ${stateVal}`);
                break;
            case 'zoneMain.equalizerTreble':
                stateVal = helper.dbToVol(stateVal);
                await this.sendRequest(`PSTRE ${stateVal}`);
                break;
            case 'settings.powerSystem':
                if (stateVal === true) {
                    await this.sendRequest('PWON');
                }
                else {
                    await this.sendRequest('PWSTANDBY');
                }
                break;
            case 'settings.dynamicEq':
                if (stateVal) {
                    await this.sendRequest('PSDYNEQ ON');
                }
                else {
                    await this.sendRequest('PSDYNEQ OFF');
                }
                break;
            case 'settings.subwooferLevel':
                stateVal = helper.dbToVol(stateVal);
                await this.sendRequest(`PSSWL ${stateVal}`);
                break;
            case 'settings.subwooferLevelDown':
                await this.sendRequest('PSSWL DOWN');
                break;
            case 'settings.subwooferLevelUp':
                await this.sendRequest('PSSWL UP');
                break;
            case 'settings.subwooferLevelState':
                if (stateVal) {
                    await this.sendRequest('PSSWL ON');
                }
                else {
                    await this.sendRequest('PSSWL OFF');
                }
                break;
            case 'settings.subwooferTwoLevel':
                stateVal = helper.dbToVol(stateVal);
                await this.sendRequest(`PSSWL2 ${stateVal}`);
                break;
            case 'settings.subwooferTwoLevelDown':
                await this.sendRequest('PSSWL2 DOWN');
                break;
            case 'settings.subwooferTwoLevelUp':
                await this.sendRequest('PSSWL2 UP');
                break;
            case 'settings.audysseyLfc':
                if (stateVal) {
                    await this.sendRequest('PSLFC ON');
                }
                else {
                    await this.sendRequest('PSLFC OFF');
                }
                break;
            case 'settings.containmentAmountDown':
                await this.sendRequest('PSCNTAMT DOWN');
                break;
            case 'settings.containmentAmountUp':
                await this.sendRequest('PSCNTAMT UP');
                break;
            case 'settings.containmentAmount':
                await this.sendRequest(`PSCNTAMT 0${stateVal}`);
                break;
            case 'settings.multEq': {
                const obj = await this.getObjectAsync('settings.multEq');
                await this.sendRequest(`PSMULTEQ:${helper.decodeState(obj.common.states, state.val).toUpperCase()}`);
                break;
            }
            case 'settings.dynamicVolume': {
                const obj = await this.getObjectAsync('settings.dynamicVolume');
                await this.sendRequest(`PSDYNVOL ${helper.decodeState(obj.common.states, state.val).toUpperCase()}`);
                break;
            }
            case 'settings.referenceLevelOffset':
                await this.sendRequest(`PSREFLEV ${stateVal}`);
                break;
            case 'settings.surroundMode': {
                const obj = await this.getObjectAsync('settings.surroundMode');
                await this.sendRequest(`MS${helper.decodeState(obj.common.states, state.val).toUpperCase()}`);
                break;
            }
            case 'settings.expertReadingPattern':
                try {
                    // check if it's a valid RegExp
                    new RegExp(stateVal);
                    await this.setStateAsync('settings.expertReadingPattern', stateVal, true);
                }
                catch (e) {
                    this.log.warn(`[COMMAND] Cannot update expert reading pattern: ${e.message}`);
                }
                break;
            case 'settings.expertCommand': {
                // Sending custom commands
                await this.sendRequest(stateVal);
                const connectionState = await this.getStateAsync('info.connection');
                // acknowledge when connection is true, thats all we can do here
                if ((connectionState === null || connectionState === void 0 ? void 0 : connectionState.val) === true) {
                    this.setState('settings.expertCommand', stateVal, true);
                }
                break;
            }
            case 'settings.toneControl':
                if (stateVal) {
                    await this.sendRequest('PSTONE CTRL ON');
                }
                else {
                    await this.sendRequest('PSTONE CTRL OFF');
                }
                break;
            case 'settings.cursorUp':
                await this.sendRequest('MNCUP');
                break;
            case 'settings.cursorDown':
                await this.sendRequest('MNCDN');
                break;
            case 'settings.cursorRight':
                await this.sendRequest('MNCRT');
                break;
            case 'settings.cursorLeft':
                await this.sendRequest('MNCLT');
                break;
            case 'settings.enter':
                await this.sendRequest('MNENT');
                break;
            case 'settings.return':
                await this.sendRequest('MNRTN');
                break;
            case 'settings.option':
                await this.sendRequest('MNOPT');
                break;
            case 'settings.info':
                await this.sendRequest('MNINF');
                break;
            case 'settings.setupMenu':
                if (stateVal) {
                    await this.sendRequest('MNMEN ON');
                }
                else {
                    await this.sendRequest('MNMEN OFF');
                }
                break;
            case 'settings.outputMonitor': {
                const obj = await this.getObjectAsync('settings.outputMonitor');
                await this.sendRequest(`VSMONI${helper.decodeState(obj.common.states, stateVal)}`);
                break;
            }
            case 'settings.centerSpread':
                if (stateVal) {
                    await this.sendRequest('PSCES ON');
                }
                else {
                    await this.sendRequest('PSCES OFF');
                }
                break;
            case 'settings.videoProcessingMode': {
                const obj = await this.getObjectAsync('settings.videoProcessingMode');
                await this.sendRequest(`VSVPM${helper.decodeState(obj.common.states, stateVal)}`);
                break;
            }
            case 'settings.pictureMode':
                await this.sendRequest(`PV${stateVal}`);
                break;
            case 'settings.loadPreset': {
                let loadPresetState;
                if (parseInt(stateVal) < 10) {
                    loadPresetState = `0${stateVal}`;
                }
                else {
                    loadPresetState = stateVal;
                }
                await this.sendRequest(`NSB${loadPresetState}`);
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
                await this.sendRequest(`NSC${savePresetState}`);
                break;
            }
            case 'display.brightness': {
                const obj = await this.getObjectAsync('display.brightness');
                await this.sendRequest(`DIM ${helper
                    .decodeState(obj.common.states, state.val)
                    .toUpperCase()
                    .slice(0, 3)}`);
                break;
            }
            case 'tuner.frequencyUp':
                await this.sendRequest('TFANUP');
                break;
            case 'tuner.frequencyDown':
                await this.sendRequest('TFANDOWN');
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
                // if it's still the case, because e.g. 106.00 we add missing zeros
                while (strFreq.length < 6) {
                    strFreq = strFreq + '0';
                }
                await this.sendRequest(`TFAN${strFreq}`);
                break;
            }
            case 'zone.powerZone':
                if (stateVal === true) {
                    await this.sendRequest(`Z${zoneNumber}ON`);
                }
                else {
                    await this.sendRequest(`Z${zoneNumber}OFF`);
                }
                break;
            case 'zone.muteIndicator':
                if (stateVal === true) {
                    await this.sendRequest(`Z${zoneNumber}MUON`);
                }
                else {
                    await this.sendRequest(`Z${zoneNumber}MUOFF`);
                }
                break;
            case 'zone.sleepTimer':
                if (!stateVal) {
                    // state === 0
                    await this.sendRequest(`Z${zoneNumber}SLPOFF`);
                }
                else if (stateVal < 10) {
                    await this.sendRequest(`Z${zoneNumber}SLP00${stateVal}`);
                }
                else if (stateVal < 100) {
                    await this.sendRequest(`Z${zoneNumber}SLP0${stateVal}`);
                }
                else if (stateVal <= 120) {
                    await this.sendRequest(`Z${zoneNumber}SLP${stateVal}`);
                }
                break;
            case 'zone.volumeUp':
                await this.sendRequest(`Z${zoneNumber}UP`);
                break;
            case 'zone.volumeDown':
                await this.sendRequest(`Z${zoneNumber}DOWN`);
                break;
            case 'zone.volume':
                await this.sendRequest(`Z${zoneNumber}${helper.inputToVol(stateVal)}`);
                break;
            case 'zone.volumeDB':
                stateVal += 80; // Convert to Vol
                await this.sendRequest(`Z${zoneNumber}${helper.inputToVol(stateVal)}`);
                break;
            case 'zone.selectInput': {
                const obj = await this.getObjectAsync(`zone${zoneNumber}.selectInput`);
                await this.sendRequest(`Z${zoneNumber}${helper.decodeState(obj.common.states, state.val).toUpperCase()}`);
                break;
            }
            case 'zone.quickSelect':
                await this.sendRequests([`Z${zoneNumber}QUICK${stateVal}`, `Z${zoneNumber}SMART${stateVal}`]);
                break;
            case 'zone.equalizerBassUp':
                await this.sendRequest(`Z${zoneNumber}PSBAS UP`);
                break;
            case 'zone.equalizerBassDown':
                await this.sendRequest(`Z${zoneNumber}PSBAS DOWN`);
                break;
            case 'zone.equalizerTrebleUp':
                await this.sendRequest(`Z${zoneNumber}PSTRE UP`);
                break;
            case 'zone.equalizerTrebleDown':
                await this.sendRequest(`Z${zoneNumber}PSTRE DOWN`);
                break;
            case 'zone.equalizerBass':
                stateVal = helper.dbToVol(stateVal);
                await this.sendRequest(`Z${zoneNumber}PSBAS ${stateVal}`);
                break;
            case 'zone.equalizerTreble':
                stateVal = helper.dbToVol(stateVal);
                await this.sendRequest(`Z${zoneNumber}PSTRE ${stateVal}`);
                break;
            case 'zone.channelVolumeFrontLeft':
                await this.sendRequest(`Z${zoneNumber}CVFL ${helper.dbToVol(stateVal)}`);
                break;
            case 'zone.channelVolumeFrontRight':
                await this.sendRequest(`Z${zoneNumber}CVFR ${helper.dbToVol(stateVal)}`);
                break;
            case 'settings.lfeAmount':
                await this.sendRequest(`PSLFE ${stateVal < 10 ? `0${stateVal}` : 10}`);
                break;
            case 'settings.dialogControl':
                await this.sendRequest(`PSDIC 0${stateVal}`); // can only be 0 - 6
                break;
            case 'settings.dialogLevel':
                await this.sendRequest(`PSDIL ${helper.dbToVol(stateVal)}`);
                break;
            case 'settings.dialogLevelAdjust':
                await this.sendRequest(`PSDIL ${stateVal ? 'ON' : 'OFF'}`);
                break;
            case 'settings.speakerPreset':
                await this.sendRequest(`SPPR ${stateVal}`);
                break;
            default:
                this.log.error(`[COMMAND] ${id} is not a valid state`);
        }
    }
    /**
     * Create standard state objects
     *
     * @param type the AVR type
     */
    async createStandardStates(type) {
        const promises = [];
        if (type === 'DE') {
            for (const obj of states.commonCommands) {
                const id = obj._id;
                // @ts-expect-error optimize structure
                delete obj._id;
                promises.push(this.extendObjectAsync(id, obj, { preserve: { common: ['name'] } }));
            }
            try {
                await Promise.all(promises);
                this.log.debug('[INFO] DE states created');
            }
            catch (e) {
                this.log.error(`Could not create DE states: ${e.message}`);
            }
        }
        else if (type === 'US') {
            for (const obj of states.usCommands) {
                const id = obj._id;
                // @ts-expect-error optimize structure
                delete obj._id;
                promises.push(this.extendObjectAsync(id, obj, { preserve: { common: ['name'] } }));
            }
            for (let i = 1; i <= 6; i++) {
                // iterate over zones
                const zoneNumber = i * 2;
                promises.push(this.setObjectNotExistsAsync(`zone${zoneNumber}`, {
                    type: 'channel',
                    common: {
                        name: 'Settings and device commands'
                    },
                    native: {}
                }));
                for (const obj of states.usCommandsZone) {
                    const id = `zone${zoneNumber}.${obj._id}`;
                    promises.push(this.setObjectNotExistsAsync(id, {
                        type: obj.type,
                        common: obj.common,
                        native: obj.native
                    }));
                }
            }
            try {
                await Promise.all(promises);
                this.log.debug('[INFO] US states created');
            }
            catch (e) {
                this.log.error(`Could not create US states: ${e.message}`);
            }
        }
        else {
            throw new Error('Unknown receiver type');
        }
    }
    connect() {
        this.client.setEncoding('utf8');
        if (this.verboseConnection) {
            this.log.info(`[CONNECT] Trying to connect to ${this.avrHost}:23`);
        }
        else {
            this.log.debug(`[CONNECT] Trying to connect to ${this.avrHost}:23`);
        }
        this.connectTimer = null;
        this.client.connect({ port: 23, host: this.avrHost });
        // give the connection a timeout after being idle for 35 seconds (needed after connect call)
        this.client.setTimeout(35000);
    }
    /**
     * Reconnect to AVR after 30 seconds
     */
    reconnect() {
        this.pollTimer = null;
        this.setState('info.connection', false, true);
        if (!this.connectTimer) {
            this.client.destroy();
            this.client.unref();
            this.connectTimer = setTimeout(() => this.connect(), 30000); // Connect again in 30 seconds
        }
    }
    /**
     * Creates the monitor state objects
     */
    async createMonitorState() {
        const promises = [];
        promises.push(this.setObjectNotExistsAsync('settings.outputMonitor', {
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
        promises.push(this.extendObjectAsync('settings.videoProcessingMode', {
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
            if (!this.capabilities.multiMonitor) {
                this.log.debug('[INFO] <== Created monitor states');
            }
            this.capabilities.multiMonitor = true;
        }
        catch (e) {
            this.log.error(`Could not create monitor states: ${e.message}`);
        }
    }
    /**
     * Creates the subwoofer two objects
     */
    async createSubTwo() {
        const promises = [];
        for (const [id, obj] of Object.entries(states.subwooferTwoStates)) {
            promises.push(this.extendObjectAsync(id, obj));
        }
        try {
            await Promise.all(promises);
            if (!this.capabilities.subTwo) {
                this.log.debug('[INFO] <== Created subwoofer two states');
            }
            this.capabilities.subTwo = true;
        }
        catch (e) {
            this.log.error(`Could not create subwoofer two states: ${e.message}`);
        }
    }
    /**
     * Creates th LFC Audyssey objects
     */
    async createLfcAudyssey() {
        const promises = [];
        for (const [id, obj] of Object.entries(states.lfcCommands)) {
            promises.push(this.extendObjectAsync(id, obj));
        }
        try {
            await Promise.all(promises);
            if (!this.capabilities.audysseyLfc) {
                this.log.debug('[INFO] <== Created Audyssey LFC states');
            }
            this.capabilities.audysseyLfc = true;
        }
        catch (e) {
            this.log.error(`Could not create Audyssey LFC states: ${e.message}`);
        }
    }
    /**
     * Creates the picture mode objects
     */
    async createPictureMode() {
        await this.setObjectNotExistsAsync('settings.pictureMode', {
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
        this.capabilities.pictureMode = true;
    }
    /**
     * Creates the Speaker Preset Object
     */
    async createSpeakerPreset() {
        await this.setObjectNotExistsAsync('settings.speakerPreset', {
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
        this.capabilities.speakerPreset = true;
    }
    /**
     * Update all states by sending the defined updateCommands
     */
    async updateStates() {
        await this.sendRequests(this.updateCommands);
    }
    async pollStates() {
        // Polls states
        this.pollTimer = null;
        await this.sendRequests(this.pollCommands);
    }
    /**
     * Send data array to socket respecting request interval
     *
     * @param requests array of requests
     */
    async sendRequests(requests) {
        for (const req of requests) {
            await this.sendRequest(req);
            await helper.wait(this.requestInterval);
        }
    }
    /**
     * Send data to socket
     *
     * @param req
     */
    sendRequest(req) {
        return new Promise(resolve => {
            this.client.write(`${req}\r`, () => {
                this.log.debug(`[INFO] ==> Message sent: ${req}`);
                resolve();
            });
        });
    }
    async handleUsResponse(data) {
        var _a, _b;
        this.log.debug(`[INFO] US command to handle is ${data}`);
        if (data.startsWith('SD00')) {
            // Handle display brightness
            const obj = (await this.getObjectAsync('display.brightness'));
            const bright = data.substring(4);
            for (const j of Object.keys(obj.common.states)) {
                // Check if command contains one of the possible brightness states
                if (helper.decodeState(obj.common.states, j).toLowerCase().includes(bright.toLowerCase())) {
                    this.setState('display.brightness', obj.common.states[j], true);
                }
            }
            return;
        }
        else if (!data.startsWith('ST00') && /ST\d\d.+/g.test(data)) {
            const zoneNumber = parseInt(data.slice(2, 4));
            const command = data.substring(4);
            if (command === 'CONT') {
                this.setState(`zone${zoneNumber}.zoneTurnOnModeChange`, 'Constant', true);
            }
            else if (command === 'TRIG') {
                this.setState(`zone${zoneNumber}.zoneTurnOnModeChange`, 'Trigger in', true);
            }
            else if (command === 'ASIG') {
                this.setState(`zone${zoneNumber}.zoneTurnOnModeChange`, 'Audio signal', true);
            }
            else if (command === 'OFF') {
                this.setState(`zone${zoneNumber}.zoneTurnOnModeChange`, 'Off', true);
            }
            return;
        }
        else if (/SV[0-9]+/g.test(data)) {
            const zoneNumber = parseInt(data.slice(2, 4)) % 2 ? parseInt(data.slice(2, 4)) + 1 : parseInt(data.slice(2, 4));
            const volume = parseFloat(`${data.slice(4, 6)}.${data.slice(6, 7)}`);
            const state = await this.getStateAsync(`zone${zoneNumber}.operationMode`);
            if (((_a = state === null || state === void 0 ? void 0 : state.val) === null || _a === void 0 ? void 0 : _a.toString()) === '0' || (state === null || state === void 0 ? void 0 : state.val) === 'NORMAL') {
                const speaker = parseInt(data.slice(2, 4)) === zoneNumber ? 'speakerTwo' : 'speakerOne';
                this.setState(`zone${zoneNumber}.${speaker}Volume`, volume, true);
            }
            else {
                this.setState(`zone${zoneNumber}.speakerOneVolume`, volume, true);
                this.setState(`zone${zoneNumber}.speakerTwoVolume`, volume, true);
            }
            return;
        }
        else if (/SO\d\d.+/g.test(data)) {
            const zoneNumber = parseInt(data.slice(2, 4));
            const command = data.substring(4);
            if (command === 'NOR') {
                this.setState(`zone${zoneNumber}.operationMode`, 'NORMAL', true);
            }
            else if (command === 'BRI') {
                this.setState(`zone${zoneNumber}.operationMode`, 'BRIDGED', true);
            }
            return;
        }
        else if (/SF\d\d.+/g.test(data)) {
            const zoneNumber = parseInt(data.slice(2, 4)) % 2 ? parseInt(data.slice(2, 4)) + 1 : parseInt(data.slice(2, 4));
            const command = data.substring(4);
            const state = await this.getStateAsync(`zone${zoneNumber}.operationMode`);
            if (((_b = state === null || state === void 0 ? void 0 : state.val) === null || _b === void 0 ? void 0 : _b.toString()) === '0' || (state === null || state === void 0 ? void 0 : state.val) === 'NORMAL') {
                const speaker = parseInt(data.slice(2, 4)) === zoneNumber ? 'SpeakerTwo' : 'SpeakerOne';
                if (command === 'OFF') {
                    this.setState(`zone${zoneNumber}.lowCutFilter${speaker}`, false, true);
                }
                else if (command === 'ON') {
                    this.setState(`zone${zoneNumber}.lowCutFilter${speaker}`, true, true);
                }
            }
            else {
                if (command === 'ON') {
                    this.setState(`zone${zoneNumber}.lowCutFilterSpeakerOne`, true, true);
                    this.setState(`zone${zoneNumber}.lowCutFilterSpeakerTwo`, true, true);
                }
                else if (command === 'OFF') {
                    this.setState(`zone${zoneNumber}.lowCutFilterSpeakerOne`, false, true);
                    this.setState(`zone${zoneNumber}.lowCutFilterSpeakerTwo`, false, true);
                }
            }
            return;
        }
        else if (/SI\d\d.+/g.test(data)) {
            const zoneNumber = parseInt(data.slice(2, 4)) % 2 ? parseInt(data.slice(2, 4)) + 1 : parseInt(data.slice(2, 4));
            const command = data.substring(4);
            const state = await this.getStateAsync(`zone${zoneNumber}.operationMode`);
            if ((state === null || state === void 0 ? void 0 : state.val) === '0' || (state === null || state === void 0 ? void 0 : state.val) === 'NORMAL') {
                const speaker = parseInt(data.slice(2, 4)) === zoneNumber ? 'Two' : 'One';
                const obj = (await this.getObjectAsync(`zone${zoneNumber}.selectInputOne`));
                for (const j of Object.keys(obj.common.states)) {
                    // Check if command contains one of the possible brightness states
                    if (helper
                        .decodeState(obj.common.states, j)
                        .replace(' ', '')
                        .toLowerCase()
                        .includes(command.toLowerCase())) {
                        this.setState(`zone${zoneNumber}.selectInput${speaker}`, obj.common.states[j], true);
                    }
                }
            }
            else {
                const obj = (await this.getObjectAsync(`zone${zoneNumber}.selectInputOne`));
                for (const j of Object.keys(obj.common.states)) {
                    // Check if command contains one of the possible brightness states
                    if (helper
                        .decodeState(obj.common.states, j)
                        .replace(' ', '')
                        .toLowerCase()
                        .includes(command.toLowerCase())) {
                        this.setState(`zone${zoneNumber}.selectInputOne`, obj.common.states[j], true);
                        this.setState(`zone${zoneNumber}.selectInputTwo`, obj.common.states[j], true);
                    }
                }
            }
            return;
        }
        else if (/TI\d\d.+/g.test(data)) {
            const zoneNumber = parseInt(data.slice(2, 4));
            const command = data.substring(4);
            if (command === 'YES') {
                this.setState(`zone${zoneNumber}.triggerInput`, true, true);
            }
            else if (command === 'NO') {
                this.setState(`zone${zoneNumber}.triggerInput`, false, true);
            }
            return;
        }
        else if (/AI\d\d.+/g.test(data)) {
            const zoneNumber = parseInt(data.slice(2, 4));
            const command = data.substring(4);
            if (command === 'YES') {
                this.setState(`zone${zoneNumber}.audioSignalInput`, true, true);
            }
            else if (command === 'NO') {
                this.setState(`zone${zoneNumber}.audioSignalInput`, false, true);
            }
            return;
        }
        switch (data) {
            case 'PW00ON':
                this.setState('settings.powerSystem', true, true);
                break;
            case 'PW00STANDBY':
                this.setState('settings.powerSystem', false, true);
                break;
            case 'TI00YES':
                this.setState('settings.masterTriggerInput', true, true);
                break;
            case 'TI00NO':
                this.setState('settings.masterTriggerInput', false, true);
                break;
            case 'ST00PBTN':
                this.setState('powerConfigurationChange', 'Power Button', true);
                break;
            case 'ST00TRIG':
                this.setState('powerConfigurationChange', 'Master Trigger', true);
                break;
            case 'ST00ONLI':
                this.setState('powerConfigurationChange', 'On Line', true);
                break;
            default:
                this.log.debug(`[INFO] <== Unhandled US command ${data}`);
        }
    }
    /**
     * Handle state change for US receiver
     * @param id state id
     * @param stateVal state value
     */
    async handleUsStateChange(id, stateVal) {
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
                    await this.sendRequest('PW00ON');
                }
                else {
                    await this.sendRequest('PW00STANDBY');
                }
                break;
            case 'settings.expertReadingPattern':
                try {
                    new RegExp(stateVal);
                    await this.setStateAsync('settings.expertReadingPattern', stateVal, true);
                }
                catch (e) {
                    this.log.warn(`[COMMAND] Cannot update expert reading pattern: ${e.message}`);
                }
                break;
            case 'display.brightness': {
                const obj = await this.getObjectAsync('display.brightness');
                await this.sendRequest(`SD00${helper.decodeState(obj.common.states, stateVal).toUpperCase().slice(0, 3)}`);
                break;
            }
            case 'settings.expertCommand': {
                // Sending custom commands
                await this.sendRequest(stateVal);
                const state = await this.getStateAsync('info.connection');
                if ((state === null || state === void 0 ? void 0 : state.val) === true) {
                    this.setState('settings.expertCommand', stateVal, true);
                }
                break;
            }
            case 'settings.powerConfigurationChange':
                if (stateVal.toUpperCase() === 'POWER BUTTON' || stateVal === '0') {
                    await this.sendRequest('ST00PBTN');
                }
                else if (stateVal.toUpperCase() === 'MASTER TRIGGER' || stateVal === '1') {
                    await this.sendRequest('ST00TRIG');
                }
                else if (stateVal.toUpperCase() === 'ON LINE' || stateVal === '2') {
                    await this.sendRequest('ST00ONLI');
                }
                break;
            case 'settings.masterTriggerInput':
                if (stateVal) {
                    await this.sendRequest('TI00YES');
                }
                else {
                    await this.sendRequest('TI00NO');
                }
                break;
            case 'audioSignalInput':
                if (stateVal) {
                    await this.sendRequest(`AI${zoneNumber}YES`);
                }
                else {
                    await this.sendRequest(`AI${zoneNumber}NO`);
                }
                break;
            case 'lowCutFilterSpeakerOne': {
                const state = await this.getStateAsync(`zone${parseInt(zoneNumber)}.operationMode`);
                if (((_a = state === null || state === void 0 ? void 0 : state.val) === null || _a === void 0 ? void 0 : _a.toString()) === '0' || (state === null || state === void 0 ? void 0 : state.val) === 'NORMAL') {
                    const calculatedZoneNumber = parseInt(zoneNumber) % 2 ? parseInt(zoneNumber) : parseInt(zoneNumber) - 1;
                    zoneNumber =
                        calculatedZoneNumber < 10 ? `0${calculatedZoneNumber}` : calculatedZoneNumber.toString();
                }
                if (stateVal) {
                    await this.sendRequest(`SF${zoneNumber}ON`);
                }
                else {
                    await this.sendRequest(`SF${zoneNumber}OFF`);
                }
                break;
            }
            case 'lowCutFilterSpeakerTwo':
                if (stateVal) {
                    await this.sendRequest(`SF${zoneNumber}ON`);
                }
                else {
                    await this.sendRequest(`SF${zoneNumber}OFF`);
                }
                break;
            case 'operationMode':
                if (stateVal === 0 || stateVal === 'NORMAL') {
                    await this.sendRequest(`SO${zoneNumber}NOR`);
                }
                else {
                    await this.sendRequest(`SO${zoneNumber}BRI`);
                }
                break;
            case 'selectInputOne': {
                const state = await this.getStateAsync(`zone${parseInt(zoneNumber)}.operationMode`);
                if (((_b = state === null || state === void 0 ? void 0 : state.val) === null || _b === void 0 ? void 0 : _b.toString()) === '0' || (state === null || state === void 0 ? void 0 : state.val) === 'NORMAL') {
                    const calculatedZoneNumber = parseInt(zoneNumber) % 2 ? parseInt(zoneNumber) : parseInt(zoneNumber) - 1;
                    zoneNumber =
                        calculatedZoneNumber < 10 ? `0${calculatedZoneNumber}` : calculatedZoneNumber.toString();
                }
                await this.sendRequest(`SI${zoneNumber}${stateVal.replace(' ', '')}`);
                break;
            }
            case 'selectInputTwo':
                await this.sendRequest(`SI${zoneNumber}${stateVal.replace(' ', '')}`);
                break;
            case 'speakerOneVolume': {
                const state = await this.getStateAsync(`zone${parseInt(zoneNumber)}.operationMode`);
                if (((_c = state === null || state === void 0 ? void 0 : state.val) === null || _c === void 0 ? void 0 : _c.toString()) === '0' || (state === null || state === void 0 ? void 0 : state.val) === 'NORMAL') {
                    const calculatedZoneNumber = parseInt(zoneNumber) % 2 ? parseInt(zoneNumber) : parseInt(zoneNumber) - 1;
                    zoneNumber =
                        calculatedZoneNumber < 10 ? `0${calculatedZoneNumber}` : calculatedZoneNumber.toString();
                }
                const vol = helper.inputToVol(stateVal);
                await this.sendRequest(`SV${zoneNumber}${vol}`);
                this.log.debug(`[INFO] <== Changed speakerOneVolume to ${vol}`);
                break;
            }
            case 'speakerTwoVolume': {
                const vol = helper.inputToVol(stateVal);
                await this.sendRequest(`SV${zoneNumber}${vol}`);
                this.log.debug(`[INFO] <== Changed speakerTwoVolume to ${vol}`);
                break;
            }
            case 'triggerInput':
                if (stateVal) {
                    await this.sendRequest(`TI${zoneNumber}YES`);
                }
                else {
                    await this.sendRequest(`TI${zoneNumber}NO`);
                }
                break;
            case 'zoneTurnOnModeChange':
                if (stateVal.toString() === '0' || stateVal.toUpperCase() === 'CONSTANT') {
                    await this.sendRequest(`ST${zoneNumber}CONT`);
                }
                else if (stateVal.toString() === '1' || stateVal.toUpperCase() === 'TRIGGER IN') {
                    await this.sendRequest(`ST${zoneNumber}TRIG`);
                }
                else if (stateVal.toString() === '2' || stateVal.toUpperCase() === 'AUDIO SIGNAL') {
                    await this.sendRequest(`ST${zoneNumber}ASIG`);
                }
                else if (stateVal.toString() === '3' || stateVal.toUpperCase() === 'OFF') {
                    await this.sendRequest(`ST${zoneNumber}OFF`);
                }
                break;
            default:
                this.log.error(`[COMMAND] ${id} is not a valid US state`);
        }
    }
    /**
     * Handle single response from AVR
     *
     * @param data
     */
    async handleResponse(data) {
        if (!this.pollTimer) {
            // Keep connection alive & poll states
            this.pollTimer = setTimeout(() => this.pollStates(), this.pollInterval); // Poll states every configured seconds
        }
        // independent of receiver we handle the expert pattern
        const expertPattern = await this.getStateAsync('settings.expertReadingPattern');
        // if ack is false, it was not a valid regex
        if ((expertPattern === null || expertPattern === void 0 ? void 0 : expertPattern.val) && expertPattern.ack) {
            const expertRegex = new RegExp(expertPattern.val);
            if (expertRegex.test(data)) {
                this.setState('settings.expertReadingResult', data, true);
            }
        }
        // Detect receiver type --> first poll is SV? and SV00?
        if (!this.receiverType) {
            if (data.startsWith('SV') || /^MV\d+/g.test(data)) {
                if (/^SV[\d]+/g.test(data)) {
                    this.receiverType = 'US';
                    await this.createStandardStates('US');
                    this.log.debug('[UPDATE] Updating states');
                    return void this.updateStates(); // Update states when connected
                }
                else {
                    this.receiverType = 'DE';
                    await this.createStandardStates('DE');
                    this.log.debug('[UPDATE] Updating states');
                    return void this.updateStates();
                }
            }
            else if (data.startsWith('BDSTATUS')) {
                // DENON Ceol Piccolo protocol detected , but we handle it as DE
                this.receiverType = 'DE';
                await this.createStandardStates('DE');
                this.log.debug('[UPDATE] Updating states');
                return void this.updateStates();
            }
            else {
                return;
            } // return if remote command received before response to SV (receiverCheck)
        }
        else if (this.receiverType === 'US') {
            return void this.handleUsResponse(data);
        }
        // get command out of String
        let command;
        if (/^Z\d.*/g.test(data)) {
            // Transformation for Zone2+ commands
            const zoneNumber = parseInt(data.slice(1, 2));
            if (!this.zonesCreated[zoneNumber]) {
                await this.createZone(zoneNumber);
            } // Create Zone2+ states if not done yet
            command = data.replace(/\s+|\d+/g, '');
            if (command === 'Z') {
                // If everything is removed except Z --> Volume
                let vol = data.substring(2).replace(/\s|[A-Z]/g, '');
                vol = `${vol.slice(0, 2)}.${vol.slice(2, 4)}`; // Slice volume from string
                this.setState(`zone${zoneNumber}.volume`, parseFloat(vol), true);
                this.setState(`zone${zoneNumber}.volumeDB`, parseFloat(vol) - 80, true);
                return;
            }
            else {
                command = `Z${zoneNumber}${command.slice(1, command.length)}`;
            }
            if (/^Z\dQUICK.*/g.test(data) || /^Z\dSMART.*/g.test(data)) {
                const quickNr = parseInt(data.slice(-1));
                try {
                    const state = await this.getStateAsync(`zone${zoneNumber}.quickSelect`);
                    if ((state === null || state === void 0 ? void 0 : state.val) === quickNr && state.ack) {
                        return;
                    }
                }
                catch (_a) {
                    // ignore
                }
                this.setState(`zone${zoneNumber}.quickSelect`, quickNr, true);
                return;
            }
            else if (/^Z\d.*/g.test(command)) {
                // Encode Input Source
                const obj = await this.getObjectAsync('zoneMain.selectInput');
                let zoneSi = data.substring(2);
                zoneSi = zoneSi.replace(' ', ''); // Remove blank
                for (const j of Object.keys(obj.common.states)) {
                    // Check if command contains one of the possible Select Inputs
                    if (helper.decodeState(obj.common.states, j.toString()) === zoneSi) {
                        this.ensureAttrInStates(`zone${zoneNumber}.selectInput`, zoneSi);
                        this.setState(`zone${zoneNumber}.selectInput`, zoneSi, true);
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
            const obj = (await this.getObjectAsync('display.brightness'));
            const bright = data.substring(4);
            for (const j of Object.keys(obj.common.states)) {
                // Check if command contains one of the possible brightness states
                if (helper.decodeState(obj.common.states, j).toLowerCase().includes(bright.toLowerCase())) {
                    this.setState('display.brightness', obj.common.states[j], true);
                }
            }
            return;
        }
        else if (command.startsWith('SI')) {
            // Handle select input
            let siCommand = data.substring(2); // Get only source name
            siCommand = siCommand.replace(' ', ''); // Remove blanks
            this.ensureAttrInStates('zoneMain.selectInput', siCommand);
            this.setState('zoneMain.selectInput', siCommand, true);
            return;
        }
        else if (command.startsWith('MS') && command !== 'MSQUICK' && command !== 'MSSMART') {
            // Handle Surround mode
            const msCommand = data.substring(2); // use data because ms can have digits and spaces
            this.setState('settings.surroundMode', msCommand, true);
            return;
        }
        else if (command === 'MSQUICK' || command === 'MSSMART') {
            const quickNr = parseInt(data.slice(-1));
            const state = await this.getStateAsync('zoneMain.quickSelect');
            if ((state === null || state === void 0 ? void 0 : state.val) === quickNr && (state === null || state === void 0 ? void 0 : state.ack)) {
                return;
            }
            this.setState('zoneMain.quickSelect', quickNr, true);
            return;
        }
        else if (command.startsWith('NSE') && !command.startsWith('NSET')) {
            // Handle display content
            if (command === 'NSE') {
                // on older models it sometimes sends just NSE for unknown reasons - ignore it
                return;
            }
            const displayCont = data.substring(4, data.indexOf('\0')).replace(/[\1\2]/g, ''); // Remove all STX, SOH, NULL
            const dispContNr = data.slice(3, 4);
            if (!this.capabilities.display) {
                await this.createDisplayAndHttp();
            }
            this.setState(`display.displayContent${dispContNr}`, displayCont, true);
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
            this.setState('info.friendlyName', data.substring(6), true);
            return;
        }
        else if (command.startsWith('PSMULTEQ')) {
            const state = data.split(':')[1];
            this.setState('settings.multEq', state, true);
            return;
        }
        else if (command.startsWith('PSDYNVOL')) {
            const state = data.split(' ')[1];
            this.setState('settings.dynamicVolume', state, true);
            return;
        }
        else if (command.startsWith('VSMONI')) {
            const state = data.substring(6);
            if (!this.capabilities.multiMonitor) {
                // make sure that state exists
                await this.createMonitorState();
            }
            if (state === 'AUTO') {
                this.setState('settings.outputMonitor', 0, true);
            }
            else {
                this.setState('settings.outputMonitor', parseInt(state), true);
            }
            return;
        }
        else if (command.startsWith('VSVPM')) {
            const processingMode = data.substring(4);
            if (!this.capabilities.multiMonitor) {
                // make sure that state exists
                await this.createMonitorState();
            }
            this.setState('settings.videoProcessingMode', processingMode, true);
            return;
        }
        else if (command.startsWith('PV') && command.length > 2) {
            const pictureMode = data.substring(1);
            if (!this.capabilities.pictureMode) {
                await this.createPictureMode();
            }
            const obj = await this.getObjectAsync('settings.pictureMode');
            if ((obj === null || obj === void 0 ? void 0 : obj.common.states) && pictureMode in obj.common.states) {
                this.setState('settings.pictureMode', obj.common.states[pictureMode], true);
            }
            else {
                this.log.debug(`Unknown picture mode: "${pictureMode}"`);
            }
            return;
        }
        else if (command.startsWith('NSH')) {
            const presetNumber = parseInt(data.slice(3, 5));
            const state = await this.getStateAsync('info.onlinePresets');
            let knownPresets;
            if (!(state === null || state === void 0 ? void 0 : state.val)) {
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
            this.setState('info.onlinePresets', JSON.stringify(sortedPresets), true);
            return;
        }
        else if (command.startsWith('TFANNAME')) {
            // get name only
            const stationName = data.substring(8);
            this.setState('tuner.stationName', stationName, true);
            return;
        }
        else if (command === 'TFAN') {
            // example TFAN010690 -> 106.9 always 6 digits with 2 decimals
            const freq = parseFloat(`${data.substring(4, 8)}.${data.substring(8)}`);
            this.setState('tuner.frequency', freq, true);
            return;
        }
        else if (command.startsWith('CV')) {
            const cvCmd = command.split(' ')[0].substring(2);
            const channel = this.CHANNEL_VOLUME_REMAPPING[cvCmd];
            if (!channel) {
                this.log.debug(`Unknown channel volume received: ${channel}`);
                return;
            }
            const channelVolume = data.split(' ')[1];
            this.setState(`zoneMain.channelVolume${channel}`, helper.volToDb(channelVolume), true);
        }
        let zoneNumber = '';
        if (/Z\d.+/g.test(command)) {
            // remove zone number from command and save it
            zoneNumber = command.slice(1, 2);
            command = `Z${command.substring(2)}`;
        }
        this.log.debug(`[INFO] <== Command to handle is ${command}`);
        switch (command) {
            case 'PWON':
                this.setState('settings.powerSystem', true, true);
                break;
            case 'PWSTANDBY':
                this.setState('settings.powerSystem', false, true);
                break;
            case 'MV':
                data = `${data.slice(2, 4)}.${data.slice(4, 5)}`; // Slice volume from string
                this.setState('zoneMain.volume', parseFloat(data), true);
                this.setState('zoneMain.volumeDB', parseFloat(data) - 80, true);
                break;
            case 'MVMAX':
                data = `${data.slice(6, 8)}.${data.slice(8, 9)}`;
                this.setState('zoneMain.maximumVolume', parseFloat(data), true);
                this.setState('zoneMain.maximumVolumeDB', parseFloat(data) - 80, true);
                break;
            case 'MUON':
                this.setState('zoneMain.muteIndicator', true, true);
                break;
            case 'MUOFF':
                this.setState('zoneMain.muteIndicator', false, true);
                break;
            case 'ZON':
                this.setState(`zone${zoneNumber}.powerZone`, true, true);
                break;
            case 'ZOFF':
                this.setState(`zone${zoneNumber}.powerZone`, false, true);
                break;
            case 'ZMUON':
                this.setState(`zone${zoneNumber}.muteIndicator`, true, true);
                break;
            case 'ZMUOFF':
                this.setState(`zone${zoneNumber}.muteIndicator`, false, true);
                break;
            case 'ZMON':
                this.setState('zoneMain.powerZone', true, true);
                break;
            case 'ZMOFF':
                this.setState('zoneMain.powerZone', false, true);
                break;
            case 'SLP': {
                data = data.slice(3, data.length);
                const state = await this.getStateAsync('zoneMain.sleepTimer');
                if ((state === null || state === void 0 ? void 0 : state.val) === parseInt(data) && (state === null || state === void 0 ? void 0 : state.ack)) {
                    return;
                }
                this.setState('zoneMain.sleepTimer', parseFloat(data), true);
                break;
            }
            case 'SLPOFF': {
                this.setStateChanged('zoneMain.sleepTimer', 0, true);
                break;
            }
            case 'ZSLP':
                data = data.slice(5, data.length);
                this.setStateChanged(`zone${zoneNumber}.sleepTimer`, parseFloat(data), true);
                break;
            case 'ZSLPOFF':
                this.setStateChanged(`zone${zoneNumber}.sleepTimer`, 0, true);
                break;
            case 'PSDYNEQON':
                this.setState('settings.dynamicEq', true, true);
                break;
            case 'PSDYNEQOFF':
                this.setState('settings.dynamicEq', false, true);
                break;
            case 'PSSWLON':
                this.setState('settings.subwooferLevelState', true, true);
                break;
            case 'PSSWLOFF':
                this.setState('settings.subwooferLevelState', false, true);
                break;
            case 'PSSWL': {
                // Handle Subwoofer Level for first and second SW
                command = data.split(' ')[0];
                const volDb = helper.volToDb(data.split(' ')[1]);
                if (command === 'PSSWL') {
                    // Check if PSSWL or PSSWL2
                    this.setState('settings.subwooferLevel', volDb, true);
                }
                else {
                    if (!this.capabilities.subTwo) {
                        // make sure sub two state exists
                        await this.createSubTwo();
                    }
                    this.setState('settings.subwooferTwoLevel', volDb, true);
                }
                break;
            }
            case 'PSLFCON':
                if (!this.capabilities.audysseyLfc) {
                    await this.createLfcAudyssey();
                }
                this.setState('settings.audysseyLfc', true, true);
                break;
            case 'PSLFCOFF':
                if (!this.capabilities.audysseyLfc) {
                    await this.createLfcAudyssey();
                }
                this.setState('settings.audysseyLfc', false, true);
                break;
            case 'PSCNTAMT': {
                const state = data.split(' ')[1];
                if (!this.capabilities.audysseyLfc) {
                    await this.createLfcAudyssey();
                }
                this.setState('settings.containmentAmount', parseFloat(state), true);
                break;
            }
            case 'PSREFLEV': {
                const state = data.split(' ')[1];
                this.setState('settings.referenceLevelOffset', state, true);
                break;
            }
            case 'PSBAS': {
                const volDb = helper.volToDb(data.split(' ')[1]);
                this.setState('zoneMain.equalizerBass', volDb, true);
                break;
            }
            case 'PSTRE': {
                const volDb = helper.volToDb(data.split(' ')[1]);
                this.setState('zoneMain.equalizerTreble', volDb, true);
                break;
            }
            case 'ZPSTRE': {
                const volDb = helper.volToDb(data.split(' ')[1]);
                this.setState(`zone${zoneNumber}.equalizerTreble`, volDb, true);
                break;
            }
            case 'ZPSBAS': {
                const volDb = helper.volToDb(data.split(' ')[1]);
                this.setState(`zone${zoneNumber}.equalizerBass`, volDb, true);
                break;
            }
            case 'ZCVFL': {
                const channelVolume = data.split(' ')[1];
                this.setState(`zone${zoneNumber}.channelVolumeFrontLeft`, helper.volToDb(channelVolume), true);
                break;
            }
            case 'ZCVFR': {
                const channelVolume = data.split(' ')[1];
                this.setState(`zone${zoneNumber}.channelVolumeFrontRight`, helper.volToDb(channelVolume), true);
                break;
            }
            case 'PSTONECTRLON':
                this.setState('settings.toneControl', true, true);
                break;
            case 'PSTONECTRLOFF':
                this.setState('settings.toneControl', false, true);
                break;
            case 'MNMENON':
                this.setState('settings.setupMenu', true, true);
                break;
            case 'MNMENOFF':
                this.setState('settings.setupMenu', false, true);
                break;
            case 'PSCESON':
                this.setState('settings.centerSpread', true, true);
                break;
            case 'PSCESOFF':
                this.setState('settings.centerSpread', false, true);
                break;
            case 'PSDRCOFF':
                // Dynamic Compression direct change is off
                break;
            case 'PSLFE': {
                // LFE --> amount of subwoofer signal additional directed to speakers
                const lfeAmount = parseInt(data.split(' ')[1]);
                this.setState('settings.lfeAmount', lfeAmount, true);
                break;
            }
            case 'PSDILON':
                this.setState('settings.dialogLevelAdjust', true, true);
                break;
            case 'PSDILOFF':
                this.setState('settings.dialogLevelAdjust', false, true);
                break;
            case 'PSDIL': {
                const level = data.split(' ')[1];
                this.setState('settings.dialogLevel', helper.volToDb(level), true);
                break;
            }
            case 'PSDIC': {
                const level = parseInt(data.split(' ')[1]);
                this.setState('settings.dialogControl', level, true);
                break;
            }
            case 'SPPR': {
                if (!this.capabilities.speakerPreset) {
                    await this.createSpeakerPreset();
                }
                const preset = parseInt(data.split(' ')[1]);
                this.setState('settings.speakerPreset', preset, true);
                break;
            }
            default:
                this.log.debug(`[INFO] <== Unhandled command ${command}`);
        }
    }
    /**
     * Create all zone specific objects for given zone
     *
     * @param zone - zone number to be created
     */
    async createZone(zone) {
        const promises = [];
        const zoneObjs = (0, states_1.getZoneObjects)(zone);
        for (const [id, obj] of Object.entries(zoneObjs)) {
            promises.push(this.extendObjectAsync(id, obj, { preserve: { common: ['name'] } }));
        }
        try {
            await Promise.all(promises);
            if (!this.zonesCreated[zone]) {
                this.log.debug(`[INFO] <== Zone ${zone} detected`);
            }
            this.zonesCreated[zone] = true;
        }
        catch (e) {
            this.log.warn(`Could not create zone ${zone}: ${e.message}`);
        }
    }
    /**
     * Creates the display states and more for AVRs which have an http-interface (states still updated via telnet)
     */
    async createDisplayAndHttp() {
        const promises = [];
        for (const [id, obj] of Object.entries(states.displayHttpStates)) {
            promises.push(this.extendObjectAsync(id, obj));
        }
        try {
            await Promise.all(promises);
            if (!this.capabilities.display) {
                this.setState('zoneMain.iconURL', `http://${this.avrHost}/NetAudio/art.asp-jpg`, true);
                this.log.debug('[INFO] <== Display Content created');
            }
            this.capabilities.display = true;
        }
        catch (e) {
            this.log.error(`Could not create Display Content states: ${e.message}`);
        }
    }
    /**
     * Ensures that the val is part of the state list of given object id
     *
     * @param id - object id
     * @param val - attribute which will be added to the object if not present
     */
    async ensureAttrInStates(id, val) {
        try {
            const obj = await this.getObjectAsync(id);
            if ((obj === null || obj === void 0 ? void 0 : obj.common) && helper.isObject(obj.common.states)) {
                const values = Object.values(obj.common.states);
                // check if its already part of the object
                if (!values.includes(val)) {
                    obj.common.states[values.length] = val;
                    await this.setObjectAsync(id, obj);
                    this.log.info(`[INFO] Added ${val} to ${id}`);
                }
            }
        }
        catch (e) {
            this.log.error(`Could not ensure attribute ${val} to be in ${id}: ${e.message}`);
        }
    }
}
if (require.main !== module) {
    // Export the constructor in compact mode
    module.exports = (options) => new Denon(options);
}
else {
    // otherwise start the instance directly
    (() => new Denon())();
}
//# sourceMappingURL=main.js.map