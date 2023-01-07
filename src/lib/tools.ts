import axios from 'axios';

/**
 * Tests whether the given variable is a real object and not an Array
 * @param it The variable to test
 */
export function isObject(it: any): it is Record<string, any> {
    // This is necessary because:
    // typeof null === 'object'
    // typeof [] === 'object'
    // [] instanceof Object === true
    return Object.prototype.toString.call(it) === '[object Object]';
}

/**
 * Tests whether the given variable is really an Array
 * @param it The variable to test
 */
export function isArray(it: any): it is any[] {
    if (Array.isArray) {
        return Array.isArray(it);
    }
    return Object.prototype.toString.call(it) === '[object Array]';
}

/**
 * Translates text using the Google Translate API
 * @param text The text to translate
 * @param targetLang The target languate
 * @param yandex api key
 */
export async function translateText(text: string, targetLang: string, yandex: string): Promise<void | string> {
    if (targetLang === 'en') {
        return text;
    }
    if (yandex) {
        await translateYandex(text, targetLang, yandex);
    } else {
        await translateGoogle(text, targetLang);
    }
}

export async function translateYandex(text: string, targetLang: string, yandex: string): Promise<string> {
    if (targetLang === 'zh-cn') {
        targetLang = 'zh';
    }
    try {
        const url = `https://translate.yandex.net/api/v1.5/tr.json/translate?key=${yandex}&text=${encodeURIComponent(
            text
        )}&lang=en-${targetLang}`;
        const response = await axios({ url, timeout: 15000 });
        if (response.data && response.data.text) {
            return response.data.text[0];
        }
        throw new Error('Invalid response for translate request');
    } catch (e: any) {
        throw new Error(`Could not translate to "${targetLang}": ${e.message}`);
    }
}

export async function translateGoogle(text: string, targetLang: string): Promise<string> {
    try {
        const url = `http://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(
            text
        )}&ie=UTF-8&oe=UTF-8`;
        const response = await axios({ url, timeout: 15000 });
        if (isArray(response.data)) {
            // we got a valid response
            return response.data[0][0][0];
        }
        throw new Error('Invalid response for translate request');
    } catch (e: any) {
        throw new Error(`Could not translate to "${targetLang}": ${e.message}`);
    }
}
