export declare const commonCommands: ioBroker.AnyObject[];
export declare const usCommandsZone: ioBroker.StateObject[];
export declare const usCommands: ioBroker.StateObject[];
export declare const lfcCommands: Record<string, ioBroker.SettableStateObject>;
export declare const subwooferTwoStates: Record<string, ioBroker.SettableStateObject>;
export declare const displayHttpStates: Record<string, ioBroker.SettableStateObject>;
/**
 * Retrive zone objects for given zone
 * @param zone number of the zone
 */
export declare function getZoneObjects(zone: number): Record<string, ioBroker.SettableObject>;
