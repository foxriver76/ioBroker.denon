"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.displayHttpStates = exports.subwooferTwoStates = exports.lfcCommands = exports.usCommands = exports.usCommandsZone = exports.commonCommands = void 0;
exports.commonCommands = [
    {
        _id: 'info.friendlyName',
        type: 'state',
        common: {
            role: 'info.name',
            name: 'Friendly Name',
            type: 'string',
            read: true,
            write: false
        },
        native: {}
    },
    {
        _id: 'tuner',
        type: 'channel',
        common: {
            name: 'Tuner'
        },
        native: {}
    },
    {
        _id: 'tuner.frequencyUp',
        type: 'state',
        common: {
            name: 'Tuner Frequency Up',
            role: 'button',
            type: 'boolean',
            write: true,
            read: false
        },
        native: {}
    },
    {
        _id: 'tuner.frequencyDown',
        type: 'state',
        common: {
            name: 'Tuner Frequency Down',
            role: 'button',
            type: 'boolean',
            write: true,
            read: false
        },
        native: {}
    },
    {
        _id: 'tuner.stationName',
        type: 'state',
        common: {
            name: 'Tuner Station Name',
            role: 'text',
            type: 'string',
            write: false,
            read: true
        },
        native: {}
    },
    {
        _id: 'tuner.frequency',
        type: 'state',
        common: {
            name: 'Tuner Frequency',
            role: 'value',
            type: 'number',
            write: true,
            read: false
        },
        native: {}
    },
    {
        _id: 'zoneMain',
        type: 'channel',
        common: {
            name: 'Main Zone'
        },
        native: {}
    },
    {
        _id: 'zoneMain.powerZone',
        type: 'state',
        common: {
            name: 'Main Zone Power State',
            role: 'switch.power.zone',
            type: 'boolean',
            write: true,
            read: true
        },
        native: {}
    },
    {
        _id: 'zoneMain.volume',
        type: 'state',
        common: {
            name: 'Main Volume',
            role: 'level.volume',
            type: 'number',
            read: true,
            write: true,
            min: 0,
            max: 98
        },
        native: {}
    },
    {
        _id: 'zoneMain.volumeUp',
        type: 'state',
        common: {
            name: 'Volume Up',
            role: 'button',
            type: 'boolean',
            write: true,
            read: false
        },
        native: {}
    },
    {
        _id: 'zoneMain.volumeDown',
        type: 'state',
        common: {
            name: 'Volume Down',
            role: 'button',
            type: 'boolean',
            write: true,
            read: false
        },
        native: {}
    },
    {
        _id: 'zoneMain.selectInput',
        type: 'state',
        common: {
            name: 'Select input',
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
    },
    {
        _id: 'zoneMain.playPause',
        type: 'state',
        common: {
            name: 'Play/Pause',
            role: 'button',
            type: 'boolean',
            write: true,
            read: false
        },
        native: {}
    },
    {
        _id: 'zoneMain.play',
        type: 'state',
        common: {
            name: 'Play',
            role: 'button',
            type: 'boolean',
            write: true,
            read: false
        },
        native: {}
    },
    {
        _id: 'zoneMain.pause',
        type: 'state',
        common: {
            name: 'Pause',
            role: 'button',
            type: 'boolean',
            write: true,
            read: false
        },
        native: {}
    },
    {
        _id: 'zoneMain.skipPlus',
        type: 'state',
        common: {
            name: 'Next',
            role: 'button',
            type: 'boolean',
            write: true,
            read: false
        },
        native: {}
    },
    {
        _id: 'zoneMain.skipMinus',
        type: 'state',
        common: {
            name: 'Previous',
            role: 'button',
            type: 'boolean',
            write: true,
            read: false
        },
        native: {}
    },
    {
        _id: 'zoneMain.maximumVolume',
        type: 'state',
        common: {
            name: 'Maximum Volume',
            role: 'state',
            type: 'number',
            write: false,
            read: true
        },
        native: {}
    },
    {
        _id: 'zoneMain.muteIndicator',
        type: 'state',
        common: {
            name: 'Muted',
            role: 'media.mute',
            type: 'boolean',
            write: true,
            read: true
        },
        native: {}
    },
    {
        _id: 'zoneMain.quickSelect',
        type: 'state',
        common: {
            name: 'Quick select',
            role: 'media.quickSelect',
            type: 'number',
            write: true,
            read: true,
            min: 1,
            max: 5
        },
        native: {}
    },
    {
        _id: 'zoneMain.sleepTimer',
        type: 'state',
        common: {
            name: 'Sleep timer',
            role: 'level.timer.sleep',
            unit: 'min',
            type: 'number',
            write: true,
            read: true,
            min: 0,
            max: 120
        },
        native: {}
    },
    {
        _id: 'zoneMain.equalizerBass',
        type: 'state',
        common: {
            name: 'Bass Level',
            role: 'level.bass',
            type: 'number',
            write: true,
            read: true,
            unit: 'dB',
            min: -6,
            max: 6
        },
        native: {}
    },
    {
        _id: 'zoneMain.equalizerBassUp',
        type: 'state',
        common: {
            name: 'Bass Up',
            role: 'button',
            type: 'boolean',
            write: true,
            read: false
        },
        native: {}
    },
    {
        _id: 'zoneMain.equalizerBassDown',
        type: 'state',
        common: {
            name: 'Bass Down',
            role: 'button',
            type: 'boolean',
            write: true,
            read: false
        },
        native: {}
    },
    {
        _id: 'zoneMain.equalizerTreble',
        type: 'state',
        common: {
            name: 'Treble Level',
            role: 'level.treble',
            type: 'number',
            write: true,
            read: true,
            unit: 'dB',
            min: -6,
            max: 6
        },
        native: {}
    },
    {
        _id: 'zoneMain.equalizerTrebleUp',
        type: 'state',
        common: {
            name: 'Treble Up',
            role: 'button',
            type: 'boolean',
            write: true,
            read: false
        },
        native: {}
    },
    {
        _id: 'zoneMain.equalizerTrebleDown',
        type: 'state',
        common: {
            name: 'Treble Down',
            role: 'button',
            type: 'boolean',
            write: true,
            read: false
        },
        native: {}
    },
    {
        _id: 'zoneMain.channelVolumeFrontLeft',
        type: 'state',
        common: {
            name: 'Channel Volume Front Left',
            role: 'level',
            type: 'number',
            write: true,
            read: true,
            unit: 'dB',
            min: -12,
            max: 12
        },
        native: {}
    },
    {
        _id: 'zoneMain.channelVolumeFrontRight',
        type: 'state',
        common: {
            name: 'Channel Volume Front Right',
            role: 'level',
            type: 'number',
            write: true,
            read: true,
            min: -12,
            max: 12,
            unit: 'dB'
        },
        native: {}
    },
    {
        _id: 'zoneMain.channelVolumeCenter',
        type: 'state',
        common: {
            name: 'Channel Volume Center',
            role: 'level',
            type: 'number',
            write: true,
            read: true,
            min: -12,
            max: 12,
            unit: 'dB'
        },
        native: {}
    },
    {
        _id: 'zoneMain.channelVolumeSurroundRight',
        type: 'state',
        common: {
            name: 'Channel Volume Surround Right',
            role: 'level',
            type: 'number',
            write: true,
            read: true,
            min: -12,
            max: 12,
            unit: 'dB'
        },
        native: {}
    },
    {
        _id: 'zoneMain.channelVolumeSurroundLeft',
        type: 'state',
        common: {
            name: 'Channel Volume Surround Left',
            role: 'level',
            type: 'number',
            write: true,
            read: true,
            min: -12,
            max: 12,
            unit: 'dB'
        },
        native: {}
    },
    {
        _id: 'zoneMain.channelVolumeSurroundDolbyRight',
        type: 'state',
        common: {
            name: 'Channel Volume Surround Dolby Right',
            role: 'level',
            type: 'number',
            write: true,
            read: true,
            min: -12,
            max: 12,
            unit: 'dB'
        },
        native: {}
    },
    {
        _id: 'zoneMain.channelVolumeSurroundDolbyLeft',
        type: 'state',
        common: {
            name: 'Channel Volume Surround Dolby Left',
            role: 'level',
            type: 'number',
            write: true,
            read: true,
            min: -12,
            max: 12,
            unit: 'dB'
        },
        native: {}
    },
    {
        _id: 'zoneMain.channelVolumeFrontDolbyLeft',
        type: 'state',
        common: {
            name: 'Channel Volume Front Dolby Left',
            role: 'level',
            type: 'number',
            write: true,
            read: true,
            min: -12,
            max: 12,
            unit: 'dB'
        },
        native: {}
    },
    {
        _id: 'zoneMain.channelVolumeFrontDolbyRight',
        type: 'state',
        common: {
            name: 'Channel Volume Front Dolby Right',
            role: 'level',
            type: 'number',
            write: true,
            read: true,
            min: -12,
            max: 12,
            unit: 'dB'
        },
        native: {}
    },
    {
        _id: 'zoneMain.channelVolumeFrontHeightLeft',
        type: 'state',
        common: {
            name: 'Channel Volume Front Height Left',
            role: 'level',
            type: 'number',
            write: true,
            read: true,
            min: -12,
            max: 12,
            unit: 'dB'
        },
        native: {}
    },
    {
        _id: 'zoneMain.channelVolumeFrontHeightRight',
        type: 'state',
        common: {
            name: 'Channel Volume Front Height Right',
            role: 'level',
            type: 'number',
            write: true,
            read: true,
            min: -12,
            max: 12,
            unit: 'dB'
        },
        native: {}
    },
    {
        _id: 'zoneMain.channelVolumeRearHeightLeft',
        type: 'state',
        common: {
            name: 'Channel Volume Rear Height Left',
            role: 'level',
            type: 'number',
            write: true,
            read: true,
            min: -12,
            max: 12,
            unit: 'dB'
        },
        native: {}
    },
    {
        _id: 'zoneMain.channelVolumeRearHeightRight',
        type: 'state',
        common: {
            name: 'Channel Volume Rear Height Right',
            role: 'level',
            type: 'number',
            write: true,
            read: true,
            min: -12,
            max: 12,
            unit: 'dB'
        },
        native: {}
    },
    {
        _id: 'zoneMain.channelVolumeSurroundHeightRight',
        type: 'state',
        common: {
            name: 'Channel Volume Surround Height Right',
            role: 'level',
            type: 'number',
            write: true,
            read: true,
            min: -12,
            max: 12,
            unit: 'dB'
        },
        native: {}
    },
    {
        _id: 'zoneMain.channelVolumeSurroundHeightLeft',
        type: 'state',
        common: {
            name: 'Channel Volume Surround Height Left',
            role: 'level',
            type: 'number',
            write: true,
            read: true,
            min: -12,
            max: 12,
            unit: 'dB'
        },
        native: {}
    },
    {
        _id: 'zoneMain.channelVolumeSubwoofer',
        type: 'state',
        common: {
            name: 'Channel Volume Subwoofer',
            role: 'level',
            type: 'number',
            write: true,
            read: true,
            min: -12,
            max: 12,
            unit: 'dB'
        },
        native: {}
    },
    {
        _id: 'zoneMain.channelVolumeSubwooferTwo',
        type: 'state',
        common: {
            name: 'Channel Volume Subwoofer Two',
            role: 'level',
            type: 'number',
            write: true,
            read: true,
            min: -12,
            max: 12,
            unit: 'dB'
        },
        native: {}
    },
    {
        _id: 'zoneMain.volumeDB',
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
        },
        native: {}
    },
    {
        _id: 'zoneMain.maximumVolumeDB',
        type: 'state',
        common: {
            name: 'Maximum Volume DB',
            role: 'state',
            type: 'number',
            write: false,
            read: true,
            unit: 'dB'
        },
        native: {}
    },
    {
        _id: 'settings.surroundMode',
        type: 'state',
        common: {
            name: 'Surround mode',
            role: 'state',
            type: 'string',
            write: true,
            read: true,
            states: {
                0: 'STEREO',
                1: 'VIRTUAL',
                2: 'VIDEO GAME',
                3: 'MCH STEREO',
                4: 'DTS SURROUND',
                5: 'DOLBY DIGITAL',
                6: 'MOVIE',
                7: 'MUSIC',
                8: 'DIRECT',
                9: 'PURE DIRECT',
                10: 'AUTO',
                11: 'GAME',
                12: 'AURO3D',
                13: 'AURO2DSURR',
                14: 'WIDE SCREEN',
                15: 'SUPER STADIUM',
                16: 'ROCK ARENA',
                17: 'JAZZ CLUB',
                18: 'CLASSIC CONCERT',
                19: 'MONO MOVIE',
                20: 'MATRIX'
            }
        },
        native: {}
    },
    {
        _id: 'settings.dynamicEq',
        type: 'state',
        common: {
            name: 'Dynamic Eq',
            role: 'switch',
            type: 'boolean',
            write: true,
            read: true
        },
        native: {}
    },
    {
        _id: 'settings.subwooferLevelState',
        type: 'state',
        common: {
            name: 'Subwoofer Level State',
            desc: 'Subwoofer Level State',
            role: 'switch',
            type: 'boolean',
            write: true,
            read: true
        },
        native: {}
    },
    {
        _id: 'settings.subwooferLevel',
        type: 'state',
        common: {
            name: 'Subwoofer Level',
            role: 'level',
            type: 'number',
            write: true,
            read: true,
            min: -12,
            max: 12,
            unit: 'dB'
        },
        native: {}
    },
    {
        _id: 'settings.subwooferLevelUp',
        type: 'state',
        common: {
            name: 'Subwoofer level Up',
            role: 'button',
            type: 'boolean',
            write: true,
            read: false
        },
        native: {}
    },
    {
        _id: 'settings.subwooferLevelDown',
        type: 'state',
        common: {
            name: 'Subwoofer level Down',
            role: 'button',
            type: 'boolean',
            write: true,
            read: false
        },
        native: {}
    },
    {
        _id: 'settings.multEq',
        type: 'state',
        common: {
            name: 'Mult EQ',
            role: 'level',
            type: 'string',
            write: true,
            read: true,
            states: {
                0: 'OFF',
                1: 'AUDYSSEY',
                2: 'BYP.LR',
                3: 'FLAT',
                4: 'MANUAL'
            }
        },
        native: {}
    },
    {
        _id: 'settings.dynamicVolume',
        type: 'state',
        common: {
            name: 'Dynamic Volume',
            role: 'level',
            type: 'string',
            write: true,
            read: true,
            states: {
                0: 'OFF',
                1: 'LIT',
                2: 'MED',
                3: 'HEV'
            }
        },
        native: {}
    },
    {
        _id: 'settings.referenceLevelOffset',
        type: 'state',
        common: {
            name: 'Reference Level Offset',
            role: 'level',
            type: 'string',
            write: true,
            read: true,
            unit: 'dB',
            states: {
                0: '0',
                5: '5',
                10: '10',
                15: '15'
            }
        },
        native: {}
    },
    {
        _id: 'settings.toneControl',
        type: 'state',
        common: {
            name: 'Tone Control',
            role: 'switch',
            type: 'boolean',
            write: true,
            read: true
        },
        native: {}
    },
    {
        _id: 'settings.cursorUp',
        type: 'state',
        common: {
            name: 'Cursor Up',
            role: 'button',
            type: 'boolean',
            write: true,
            read: true
        },
        native: {}
    },
    {
        _id: 'settings.cursorDown',
        type: 'state',
        common: {
            name: 'Cursor Down',
            role: 'button',
            type: 'boolean',
            write: true,
            read: true
        },
        native: {}
    },
    {
        _id: 'settings.cursorRight',
        type: 'state',
        common: {
            name: 'Cursor Right',
            role: 'button',
            type: 'boolean',
            write: true,
            read: true
        },
        native: {}
    },
    {
        _id: 'settings.cursorLeft',
        type: 'state',
        common: {
            name: 'Cursor Left',
            role: 'button',
            type: 'boolean',
            write: true,
            read: true
        },
        native: {}
    },
    {
        _id: 'settings.enter',
        type: 'state',
        common: {
            name: 'Enter',
            role: 'button',
            type: 'boolean',
            write: true,
            read: true
        },
        native: {}
    },
    {
        _id: 'settings.return',
        type: 'state',
        common: {
            name: 'Return',
            role: 'button',
            type: 'boolean',
            write: true,
            read: true
        },
        native: {}
    },
    {
        _id: 'settings.option',
        type: 'state',
        common: {
            name: 'Option',
            role: 'button',
            type: 'boolean',
            write: true,
            read: true
        },
        native: {}
    },
    {
        _id: 'settings.info',
        type: 'state',
        common: {
            name: 'Info',
            role: 'button',
            type: 'boolean',
            write: true,
            read: true
        },
        native: {}
    },
    {
        _id: 'settings.setupMenu',
        type: 'state',
        common: {
            name: 'Setup Menu',
            role: 'switch',
            type: 'boolean',
            write: true,
            read: true
        },
        native: {}
    },
    {
        _id: 'settings.centerSpread',
        type: 'state',
        common: {
            name: 'Center Spread',
            role: 'switch',
            type: 'boolean',
            write: true,
            read: true
        },
        native: {}
    },
    {
        _id: 'info.onlinePresets',
        type: 'state',
        common: {
            name: 'Net Audio Presets',
            role: 'presets.json',
            type: 'string',
            write: false,
            read: true,
            def: '{}'
        },
        native: {}
    },
    {
        _id: 'settings.savePreset',
        type: 'state',
        common: {
            name: 'Save Net Audio Preset',
            role: 'presets.save',
            type: 'string',
            write: true,
            read: true
        },
        native: {}
    },
    {
        _id: 'settings.loadPreset',
        type: 'state',
        common: {
            name: 'Load Net Audio Preset',
            role: 'presets.load',
            type: 'string',
            write: true,
            read: true
        },
        native: {}
    },
    {
        _id: 'settings.lfeAmount',
        type: 'state',
        common: {
            name: 'LFE Amount',
            role: 'level',
            type: 'number',
            write: true,
            read: true,
            unit: 'dB',
            min: 0,
            max: 10
        },
        native: {}
    },
    {
        _id: 'settings.dialogLevelAdjust',
        type: 'state',
        common: {
            name: 'Dialog Level Adjustment',
            role: 'indicator',
            type: 'boolean',
            write: true,
            read: true
        },
        native: {}
    },
    {
        _id: 'settings.dialogLevel',
        type: 'state',
        common: {
            name: 'Dialog Level',
            role: 'level',
            type: 'number',
            write: true,
            read: true,
            unit: 'dB',
            min: -12,
            max: 12
        },
        native: {}
    },
    {
        _id: 'settings.dialogControl',
        type: 'state',
        common: {
            name: 'Dialog Control',
            role: 'level',
            type: 'number',
            write: true,
            read: true,
            unit: 'dB',
            min: 0,
            max: 6
        },
        native: {}
    }
];
exports.usCommandsZone = [
    {
        _id: 'speakerOneVolume',
        type: 'state',
        common: {
            name: 'Speaker One Volume',
            role: 'level.volume',
            type: 'number',
            write: true,
            read: true,
            min: 0,
            max: 99
        },
        native: {}
    },
    {
        _id: 'speakerTwoVolume',
        type: 'state',
        common: {
            name: 'Speaker Two Volume',
            role: 'level.volume',
            type: 'number',
            write: true,
            read: true,
            min: 0,
            max: 99
        },
        native: {}
    },
    {
        _id: 'selectInputOne',
        type: 'state',
        common: {
            name: 'Speaker One Select Input',
            role: 'media.input',
            type: 'string',
            write: true,
            read: true,
            states: {
                0: 'BUS L',
                1: 'BUS R',
                2: 'BUS M',
                3: 'AUX'
            }
        },
        native: {}
    },
    {
        _id: 'selectInputTwo',
        type: 'state',
        common: {
            name: 'Speaker Two Select Input',
            role: 'media.input',
            type: 'string',
            write: true,
            read: true,
            states: {
                0: 'BUS L',
                1: 'BUS R',
                2: 'BUS M',
                3: 'AUX'
            }
        },
        native: {}
    },
    {
        _id: 'operationMode',
        type: 'state',
        common: {
            name: 'Operation Mode',
            role: 'media.mode',
            type: 'string',
            write: true,
            read: true,
            states: {
                0: 'NORMAL',
                1: 'BRIDGED'
            }
        },
        native: {}
    },
    {
        _id: 'lowCutFilterSpeakerOne',
        type: 'state',
        common: {
            name: 'Speaker One Channel Low Cut Filter',
            role: 'media.switch',
            type: 'boolean',
            write: true,
            read: true
        },
        native: {}
    },
    {
        _id: 'lowCutFilterSpeakerTwo',
        type: 'state',
        common: {
            name: 'Speaker Two Channel Low Cut Filter',
            role: 'media.switch',
            type: 'boolean',
            write: true,
            read: true
        },
        native: {}
    },
    {
        _id: 'zoneTurnOnModeChange',
        type: 'state',
        common: {
            name: 'Zone Turn On Mode Change',
            role: 'media.status',
            type: 'string',
            write: true,
            read: true,
            states: {
                0: 'Constant',
                1: 'Trigger in',
                2: 'Audio signal',
                3: 'Off'
            }
        },
        native: {}
    },
    {
        _id: 'triggerInput',
        type: 'state',
        common: {
            name: 'Zone Trigger Input',
            role: 'media.input',
            type: 'boolean',
            write: true,
            read: true
        },
        native: {}
    },
    {
        _id: 'audioSignalInput',
        type: 'state',
        common: {
            name: 'Channel Audio Signal Input',
            role: 'media.input',
            type: 'boolean',
            write: true,
            read: true
        },
        native: {}
    }
];
exports.usCommands = [
    {
        _id: 'settings.powerConfigurationChange',
        type: 'state',
        common: {
            name: 'Power Configuration Change',
            role: 'media.status',
            type: 'string',
            write: true,
            read: true,
            states: {
                0: 'Power Button',
                1: 'Master Trigger',
                2: 'On Line'
            }
        },
        native: {}
    },
    {
        _id: 'settings.masterTriggerInput',
        type: 'state',
        common: {
            name: 'Master Trigger Input',
            role: 'media.status',
            type: 'boolean',
            write: true,
            read: true
        },
        native: {}
    }
];
exports.lfcCommands = {
    'settings.audysseyLfc': {
        type: 'state',
        common: {
            name: 'Audyssey Low Frequency Containment',
            role: 'switch',
            type: 'boolean',
            write: true,
            read: true
        },
        native: {}
    },
    'settings.containmentAmount': {
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
    },
    'settings.containmentAmountUp': {
        type: 'state',
        common: {
            name: 'Containment Amount Up',
            role: 'button',
            type: 'boolean',
            write: true,
            read: false
        },
        native: {}
    },
    'settings.containmentAmountDown': {
        type: 'state',
        common: {
            name: 'Containment Amount Down',
            role: 'button',
            type: 'boolean',
            write: true,
            read: false
        },
        native: {}
    }
};
exports.subwooferTwoStates = {
    'settings.subwooferTwoLevel': {
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
    },
    'settings.subwooferTwoLevelUp': {
        type: 'state',
        common: {
            name: 'Subwoofer Two Level Up',
            role: 'button',
            type: 'boolean',
            write: true,
            read: false
        },
        native: {}
    },
    'settings.subwooferTwoLevelDown': {
        type: 'state',
        common: {
            name: 'Subwoofer Two Level Down',
            role: 'button',
            type: 'boolean',
            write: true,
            read: false
        },
        native: {}
    }
};
exports.displayHttpStates = {
    'display.displayContent0': {
        type: 'state',
        common: {
            name: 'Display content 0',
            role: 'info.display',
            type: 'string',
            write: false,
            read: true
        },
        native: {}
    },
    'display.displayContent1': {
        type: 'state',
        common: {
            name: 'Display content 1',
            role: 'info.display',
            type: 'string',
            write: false,
            read: true
        },
        native: {}
    },
    'display.displayContent2': {
        type: 'state',
        common: {
            name: 'Display content 2',
            role: 'info.display',
            type: 'string',
            write: false,
            read: true
        },
        native: {}
    },
    'display.displayContent3': {
        type: 'state',
        common: {
            name: 'Display content 3',
            role: 'info.display',
            type: 'string',
            write: false,
            read: true
        },
        native: {}
    },
    'display.displayContent4': {
        type: 'state',
        common: {
            name: 'Display content 4',
            role: 'info.display',
            type: 'string',
            write: false,
            read: true
        },
        native: {}
    },
    'display.displayContent5': {
        type: 'state',
        common: {
            name: 'Display content 5',
            role: 'info.display',
            type: 'string',
            write: false,
            read: true
        },
        native: {}
    },
    'display.displayContent6': {
        type: 'state',
        common: {
            name: 'Display content 6',
            role: 'info.display',
            type: 'string',
            write: false,
            read: true
        },
        native: {}
    },
    'display.displayContent7': {
        type: 'state',
        common: {
            name: 'Display content 7',
            role: 'info.display',
            type: 'string',
            write: false,
            read: true
        },
        native: {}
    },
    'display.displayContent8': {
        type: 'state',
        common: {
            name: 'Display content 8',
            role: 'info.display',
            type: 'string',
            write: false,
            read: true
        },
        native: {}
    },
    'zoneMain.iconURL': {
        type: 'state',
        common: {
            name: 'Cover',
            role: 'media.cover',
            type: 'string',
            write: false,
            read: true
        },
        native: {}
    }
};
//# sourceMappingURL=states.js.map