/**
 * Decode state e.g. for selectInput by searching for state in key and value of the states
 *
 * @alias decodeState
 * @param stateRecord key value pair of states
 * @param state state key or value which will be matched
 */
export function decodeState(stateRecord: Record<string, string>, state: string | number): string {
    for (const [id, name] of Object.entries(stateRecord)) {
        if (state.toString().toUpperCase() === name.toUpperCase() || id === state.toString()) {
            return name;
        }
    }
    return '';
}

/**
 * Converts user input into sendable volume command
 * @param input
 */
export function inputToVol(input: number): string {
    let leadingZero: string;

    if (input < 0) {
        input = 0;
    }
    if (input % 0.5 !== 0) {
        input = Math.round(input * 2) / 2;
    }
    if (input < 10) {
        leadingZero = '0';
    } else {
        leadingZero = '';
    }

    return leadingZero + input.toString().replace('.', '');
}

/**
 * Convert volume to dB
 *
 * @alias volToDb
 * @param volStr volume e. g. '50.5'
 * @returns dB
 */
export function volToDb(volStr: string): number {
    let vol: number;
    if (volStr.length === 3) {
        vol = parseInt(volStr) / 10; // "305" -> 30.5
    } else {
        vol = parseInt(volStr);
    }

    vol -= 50; // Vol to dB
    return vol;
}

/**
 * Waits given ms
 *
 * @param ms
 */
export function wait(ms: number): Promise<void> {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve();
        }, ms);
    });
}

/**
 * Convert dB to volume
 *
 * @param vol volume in dB e. g. '10.5'
 */
export function dbToVol(vol: string): string {
    vol += 50; // dB to vol
    vol = vol.toString().replace('.', '');
    return vol;
}

/**
 * Tests whether the given variable is a real object and not an Array
 * @param it The variable to test
 */
export function isObject(it: any): it is Record<string, any> {
    // This is necessary because:
    // typeof null === 'object'
    // typeof [] === 'object'
    // [] instanceof Object === true
    return Object.prototype.toString.call(it) === '[object Object]'; // this code is 25% faster then below one
}

/**
 * Reverses an object, making the keys the new values and vice-versa
 * @param obj The object to reverse
 */
export function reverseObject<T extends string, A extends string>(obj: Record<T, A>): Record<A, T> {
    return Object.fromEntries(Object.entries(obj).map(([key, value]) => [value, key]));
}
