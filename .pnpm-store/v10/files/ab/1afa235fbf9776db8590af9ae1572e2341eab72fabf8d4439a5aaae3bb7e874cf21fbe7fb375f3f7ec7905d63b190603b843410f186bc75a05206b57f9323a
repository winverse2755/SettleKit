"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEnUSNumberToLocalParts = exports.convertNumStrFromEffectiveTo = exports.convertNumStrToLocal = exports.getEffectiveLocale = exports.getLocaleSymbols = void 0;
const _convertEnNumStrToLocale = (numStr, localSymbols) => {
    return numStr
        .replaceAll(",", "#TEMP#")
        .replaceAll(".", localSymbols.decimalSymbol)
        .replaceAll("#TEMP#", localSymbols.groupSymbol);
};
/**
 * @returns the locale symbols for the given locale defaulting to en-US
 */
const getLocaleSymbols = (locale) => {
    let formatter;
    const formatterOptions = {
        useGrouping: true,
        maximumFractionDigits: 1,
        minimumFractionDigits: 1,
    };
    try {
        formatter = new Intl.NumberFormat(locale, formatterOptions);
    }
    catch {
        formatter = new Intl.NumberFormat("en-US", formatterOptions);
    }
    const parts = formatter.formatToParts(12345.6);
    const decimalSymbol = parts.find((part) => part.type === "decimal").value;
    const groupSymbol = parts.find((part) => part.type === "group").value;
    return { decimalSymbol, groupSymbol, locale };
};
exports.getLocaleSymbols = getLocaleSymbols;
/**
 * @returns the effective browser locale
 */
const getEffectiveLocale = () => {
    if (typeof window !== "undefined") {
        try {
            const locale = navigator?.language || document?.documentElement?.lang || "en-US";
            new Intl.NumberFormat(locale);
            return locale;
        }
        catch {
            return "en-US";
        }
    }
    return "en-US";
};
exports.getEffectiveLocale = getEffectiveLocale;
/**
 * @returns the value as a string with the given locale symbols
 * @param numStr the number as a string in the "from" locale (e.g. "1,2345.6" for en-US)
 * @param from the locale the numStr is in (e.g. "en-US")
 * @param to the locale to convert to (e.g. "fr-FR")
 */
const convertNumStrToLocal = (numStr, from, to) => {
    const fromSymbols = (0, exports.getLocaleSymbols)(from);
    const toSymbols = (0, exports.getLocaleSymbols)(to);
    return numStr
        .replaceAll(fromSymbols.groupSymbol, "#GROUP#")
        .replaceAll(fromSymbols.decimalSymbol, "#DECIMAL#")
        .replaceAll("#GROUP#", toSymbols.groupSymbol)
        .replaceAll("#DECIMAL#", toSymbols.decimalSymbol);
};
exports.convertNumStrToLocal = convertNumStrToLocal;
/**
 * @returns the value as a string in the effective browser locale
 * @param numStr the number as a string in the effective browser locale (e.g. "1,2345.6" for en-US)
 * @param to the locale to use (e.g. "fr-FR")
 */
const convertNumStrFromEffectiveTo = (numStr, to) => {
    const from = (0, exports.getEffectiveLocale)();
    return (0, exports.convertNumStrToLocal)(numStr, from, to);
};
exports.convertNumStrFromEffectiveTo = convertNumStrFromEffectiveTo;
/**
 * @returns the value as a string with the given locale symbols either from the given locale or the effective browser locale
 * @param numStr the number as a string in english format (e.g. "1,2345.6")
 * @param locale optional - the locale to use (e.g. "fr-FR")
 */
const getEnUSNumberToLocalParts = (numStr, locale) => {
    const _locale = locale || (0, exports.getEffectiveLocale)();
    const localSymbols = (0, exports.getLocaleSymbols)(_locale);
    const value = _convertEnNumStrToLocale(numStr, localSymbols);
    return { ...localSymbols, value };
};
exports.getEnUSNumberToLocalParts = getEnUSNumberToLocalParts;
