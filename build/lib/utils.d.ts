/**
 * Decode state e.g. for selectInput by searching for state in key and value of the states
 *
 * @alias decodeState
 * @param stateRecord key value pair of states
 * @param state state key or value which will be matched
 */
export declare function decodeState(stateRecord: Record<string, string>, state: string | number): string;
/**
 * Converts user input into sendable volume command
 * @param input
 */
export declare function inputToVol(input: number): string;
/**
 * Convert volume to dB
 *
 * @alias volToDb
 * @param volStr volume e. g. '50.5'
 * @returns dB
 */
export declare function volToDb(volStr: string): number;
/**
 * Waits given ms
 *
 * @param ms
 */
export declare function wait(ms: number): Promise<void>;
/**
 * Convert dB to volume
 *
 * @param vol volume in dB e. g. '10.5'
 */
export declare function dbToVol(vol: string): string;
/**
 * Tests whether the given variable is a real object and not an Array
 * @param it The variable to test
 */
export declare function isObject(it: any): it is Record<string, any>;
