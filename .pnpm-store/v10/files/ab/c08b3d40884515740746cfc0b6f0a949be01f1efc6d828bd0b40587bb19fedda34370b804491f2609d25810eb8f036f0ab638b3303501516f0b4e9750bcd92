"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.retryPromiseLinearBackoff = exports.mergeEntries = exports.fromEntries = exports.entries = exports.values = exports.keys = exports.createGetValue = exports.transformValue = exports.getValue = exports.createHasValue = exports.hasValue = exports.bigIntComparator = exports.isDefined = exports.isNotUndefined = exports.isNotNull = exports.ZERO_ADDRESS = void 0;
exports.getLast = getLast;
exports.filterDefined = filterDefined;
exports.getLastDefined = getLastDefined;
exports.deepFreeze = deepFreeze;
const time_1 = require("./time");
exports.ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const isNotNull = (v) => v !== null;
exports.isNotNull = isNotNull;
const isNotUndefined = (v) => v !== undefined;
exports.isNotUndefined = isNotUndefined;
const isDefined = (v) => v != null;
exports.isDefined = isDefined;
const bigIntComparator = (getter, order = "asc") => (a, b) => {
    const xA = getter(a);
    const xB = getter(b);
    if (xA == null && xB == null)
        return 0;
    if (xA == null)
        return 1;
    if (xB == null)
        return -1;
    if (order === "asc")
        return xA > xB ? 1 : -1;
    return xA > xB ? -1 : 1;
};
exports.bigIntComparator = bigIntComparator;
// biome-ignore lint/suspicious/noExplicitAny: recursion breaks type
const _get = (data, path) => {
    if (data === null)
        return null;
    if (data === undefined)
        return undefined;
    if (path.length === 0)
        return data;
    const [key, ...rest] = path;
    return _get(data[key], rest);
};
const hasValue = (data, path) => (0, exports.isDefined)((0, exports.getValue)(data, path));
exports.hasValue = hasValue;
const createHasValue = (path) => (data) => (0, exports.hasValue)(data, path);
exports.createHasValue = createHasValue;
const getValue = (data, path) => _get(data, path.split("."));
exports.getValue = getValue;
const transformValue = (value, _transform) => ((0, exports.isDefined)(value) ? _transform(value) : value);
exports.transformValue = transformValue;
const createGetValue = (path) => (data) => (0, exports.getValue)(data, path);
exports.createGetValue = createGetValue;
const keys = (o) => Object.keys(o ?? {});
exports.keys = keys;
const values = (o) => Object.values(o ?? {});
exports.values = values;
const entries = (o) => Object.entries(o ?? {});
exports.entries = entries;
const fromEntries = (srcEntries) => Object.fromEntries(srcEntries);
exports.fromEntries = fromEntries;
const mergeEntries = (srcEntries, merger) => {
    const obj = {};
    for (const [key, value] of srcEntries) {
        const prev = obj[key];
        obj[key] = prev ? merger(prev, value) : value;
    }
    return obj;
};
exports.mergeEntries = mergeEntries;
const retryPromiseLinearBackoff = async (func, { timeout = 100, retries = 8, onError, }) => {
    let i = 0;
    do {
        try {
            return await func();
        }
        catch (error) {
            if (await onError?.(error, i))
                throw Error("stopped retrying");
            await time_1.Time.wait(timeout * ++i);
        }
    } while (i < retries);
    throw Error("too many retries");
};
exports.retryPromiseLinearBackoff = retryPromiseLinearBackoff;
function getLast(array) {
    return array[array.length - 1];
}
function filterDefined(array) {
    return array.filter(exports.isDefined);
}
function getLastDefined(array) {
    return getLast(filterDefined(array));
}
function deepFreeze(obj) {
    if (obj === null || obj === undefined) {
        // null or undefined are already immutable
        return obj;
    }
    const propNames = Object.getOwnPropertyNames(obj);
    for (const name of propNames) {
        // biome-ignore lint/suspicious/noExplicitAny: name is a property of obj
        const value = obj[name];
        if (value && typeof value === "object") {
            deepFreeze(value);
        }
    }
    return Object.freeze(obj);
}
