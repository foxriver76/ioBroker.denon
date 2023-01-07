"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.translateGoogle = exports.translateYandex = exports.translateText = exports.isArray = exports.isObject = void 0;
const axios_1 = __importDefault(require("axios"));
/**
 * Tests whether the given variable is a real object and not an Array
 * @param it The variable to test
 */
function isObject(it) {
    // This is necessary because:
    // typeof null === 'object'
    // typeof [] === 'object'
    // [] instanceof Object === true
    return Object.prototype.toString.call(it) === '[object Object]';
}
exports.isObject = isObject;
/**
 * Tests whether the given variable is really an Array
 * @param it The variable to test
 */
function isArray(it) {
    if (Array.isArray) {
        return Array.isArray(it);
    }
    return Object.prototype.toString.call(it) === '[object Array]';
}
exports.isArray = isArray;
/**
 * Translates text using the Google Translate API
 * @param text The text to translate
 * @param targetLang The target languate
 * @param yandex api key
 */
async function translateText(text, targetLang, yandex) {
    if (targetLang === 'en') {
        return text;
    }
    if (yandex) {
        await translateYandex(text, targetLang, yandex);
    }
    else {
        await translateGoogle(text, targetLang);
    }
}
exports.translateText = translateText;
async function translateYandex(text, targetLang, yandex) {
    if (targetLang === 'zh-cn') {
        targetLang = 'zh';
    }
    try {
        const url = `https://translate.yandex.net/api/v1.5/tr.json/translate?key=${yandex}&text=${encodeURIComponent(text)}&lang=en-${targetLang}`;
        const response = await (0, axios_1.default)({ url, timeout: 15000 });
        if (response.data && response.data.text) {
            return response.data.text[0];
        }
        throw new Error('Invalid response for translate request');
    }
    catch (e) {
        throw new Error(`Could not translate to "${targetLang}": ${e.message}`);
    }
}
exports.translateYandex = translateYandex;
async function translateGoogle(text, targetLang) {
    try {
        const url = `http://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}&ie=UTF-8&oe=UTF-8`;
        const response = await (0, axios_1.default)({ url, timeout: 15000 });
        if (isArray(response.data)) {
            // we got a valid response
            return response.data[0][0][0];
        }
        throw new Error('Invalid response for translate request');
    }
    catch (e) {
        throw new Error(`Could not translate to "${targetLang}": ${e.message}`);
    }
}
exports.translateGoogle = translateGoogle;
//# sourceMappingURL=tools.js.map