/**
 * Tests whether the given variable is a real object and not an Array
 * @param it The variable to test
 */
export declare function isObject(it: any): it is Record<string, any>;
/**
 * Tests whether the given variable is really an Array
 * @param it The variable to test
 */
export declare function isArray(it: any): it is any[];
/**
 * Translates text using the Google Translate API
 * @param text The text to translate
 * @param targetLang The target languate
 * @param yandex api key
 */
export declare function translateText(text: string, targetLang: string, yandex: string): Promise<void | string>;
export declare function translateYandex(text: string, targetLang: string, yandex: string): Promise<string>;
export declare function translateGoogle(text: string, targetLang: string): Promise<string>;
