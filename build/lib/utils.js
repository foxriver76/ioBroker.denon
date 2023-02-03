"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isObject = exports.dbToVol = exports.wait = exports.volToDb = exports.inputToVol = exports.decodeState = void 0;
/**
 * Decode state e.g. for selectInput by searching for state in key and value of the states
 *
 * @alias decodeState
 * @param stateRecord key value pair of states
 * @param state state key or value which will be matched
 */
function decodeState(stateRecord, state) {
    for (const [id, name] of Object.entries(stateRecord)) {
        if (state.toString().toUpperCase() === name.toUpperCase() || id === state.toString()) {
            return name;
        }
    }
    return '';
}
exports.decodeState = decodeState;
/**
 * Converts user input into sendable volume command
 * @param input
 */
function inputToVol(input) {
    let leadingZero;
    if (input < 0) {
        input = 0;
    }
    if (input % 0.5 !== 0) {
        input = Math.round(input * 2) / 2;
    }
    if (input < 10) {
        leadingZero = '0';
    }
    else {
        leadingZero = '';
    }
    return leadingZero + input.toString().replace('.', '');
}
exports.inputToVol = inputToVol;
/**
 * Convert volume to dB
 *
 * @alias volToDb
 * @param volStr volume e. g. '50.5'
 * @returns dB
 */
function volToDb(volStr) {
    let vol;
    if (volStr.length === 3) {
        vol = parseInt(volStr) / 10; // "305" -> 30.5
    }
    else {
        vol = parseInt(volStr);
    }
    vol -= 50; // Vol to dB
    return vol;
}
exports.volToDb = volToDb;
/**
 * Waits given ms
 *
 * @param ms
 */
function wait(ms) {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve();
        }, ms);
    });
}
exports.wait = wait;
/**
 * Convert dB to volume
 *
 * @param vol volume in dB e. g. '10.5'
 */
function dbToVol(vol) {
    vol += 50; // dB to vol
    vol = vol.toString().replace('.', '');
    return vol;
}
exports.dbToVol = dbToVol;
/**
 * Tests whether the given variable is a real object and not an Array
 * @param it The variable to test
 */
function isObject(it) {
    // This is necessary because:
    // typeof null === 'object'
    // typeof [] === 'object'
    // [] instanceof Object === true
    return Object.prototype.toString.call(it) === '[object Object]'; // this code is 25% faster then below one
}
exports.isObject = isObject;
//# sourceMappingURL=utils.js.map