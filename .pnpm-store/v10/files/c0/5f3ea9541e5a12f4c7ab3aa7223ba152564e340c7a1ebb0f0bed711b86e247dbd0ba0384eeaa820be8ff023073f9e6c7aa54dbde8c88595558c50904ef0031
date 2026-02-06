"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatUnion = formatUnion;
exports.formatEnumeration = formatEnumeration;
function formatItemsList(items, lastSeparator) {
    switch (items.length) {
        case 0:
            return "";
        case 1:
            return items[0];
        case 2:
            return `${items[0]} ${lastSeparator} ${items[1]}`;
        default:
            return `${items.slice(0, -1).join(", ")} ${lastSeparator} ${items[items.length - 1]}`;
    }
}
/**
 * Humanizes an array of strings into a comma-separated list with an "or" before the last item.
 * For example, ["a", "b", "c"] becomes "a, b or c".
 *
 * @param items Array of strings
 * @returns Humanized union
 */
function formatUnion(items) {
    return formatItemsList(items, "or");
}
/**
 * Humanizes an array of strings into a comma-separated list with an "and" before the last item.
 * For example, ["a", "b", "c"] becomes "a, b and c".
 *
 * @param items Array of strings
 * @returns Humanized enumeration
 */
function formatEnumeration(items) {
    return formatItemsList(items, "and");
}
