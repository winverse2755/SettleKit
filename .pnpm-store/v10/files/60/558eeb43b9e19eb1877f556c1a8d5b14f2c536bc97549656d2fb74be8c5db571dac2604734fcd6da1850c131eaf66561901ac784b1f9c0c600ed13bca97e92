type LocaleSymbols = {
    decimalSymbol: string;
    groupSymbol: string;
    locale: string;
};
export type LocaleParts = LocaleSymbols & {
    value: string;
};
/**
 * @returns the locale symbols for the given locale defaulting to en-US
 */
export declare const getLocaleSymbols: (locale: string) => LocaleSymbols;
/**
 * @returns the effective browser locale
 */
export declare const getEffectiveLocale: () => string;
/**
 * @returns the value as a string with the given locale symbols
 * @param numStr the number as a string in the "from" locale (e.g. "1,2345.6" for en-US)
 * @param from the locale the numStr is in (e.g. "en-US")
 * @param to the locale to convert to (e.g. "fr-FR")
 */
export declare const convertNumStrToLocal: (numStr: string, from: string, to: string) => string;
/**
 * @returns the value as a string in the effective browser locale
 * @param numStr the number as a string in the effective browser locale (e.g. "1,2345.6" for en-US)
 * @param to the locale to use (e.g. "fr-FR")
 */
export declare const convertNumStrFromEffectiveTo: (numStr: string, to: string) => string;
/**
 * @returns the value as a string with the given locale symbols either from the given locale or the effective browser locale
 * @param numStr the number as a string in english format (e.g. "1,2345.6")
 * @param locale optional - the locale to use (e.g. "fr-FR")
 */
export declare const getEnUSNumberToLocalParts: (numStr: string, locale?: string) => LocaleParts;
export {};
