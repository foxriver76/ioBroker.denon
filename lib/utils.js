/**
 * Decode state e.g. for selectInput by searching for state in key and value of the states
 *
 * @alias decodeState
 * @param {Object} stateNames key value pair of states
 * @param {string} state state key or value which will be matched
 */
function decodeState(stateNames, state) { // decoding for e. g. selectInput --> Input: Key (when ascending integer) or Value Output: Value
    const stateArray = Object.keys(stateNames).map(key => stateNames[key]); // returns stateNames[key]
    for (const i in stateArray) {
        if (state.toString().toUpperCase() === stateArray[i].toUpperCase() || i.toString() === state.toString()) return stateArray[i];
    } // endFor
    return '';
} // endDecodeState

/**
 * Convert volume to dB
 *
 * @alias volToDb
 * @param {string} vol volume e. g. '50.5'
 */
function volToDb(vol) {
    if (vol.length === 3) vol = vol / 10;
    vol -= 50; // Vol to dB
    return vol;
} // endVolToDb

/**
 * Convert dB to volume
 *
 * @alias dbToVol
 * @param {string} vol volume in dB e. g. '10.5'
 */
function dbToVol(vol) {
    vol += 50; // dB to vol
    vol = vol.toString().replace('.', '');
    return vol;
} // endDbToVol

module.exports = {
    decodeState,
    volToDb,
    dbToVol
};