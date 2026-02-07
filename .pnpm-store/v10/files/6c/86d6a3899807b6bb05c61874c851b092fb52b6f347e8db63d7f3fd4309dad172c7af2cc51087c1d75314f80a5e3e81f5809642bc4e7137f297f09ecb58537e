"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Time = void 0;
const toNumberish = (returnValue, initialValue) => {
    if (typeof initialValue === "bigint")
        return returnValue;
    return Number(returnValue);
};
const UNITS = ["ms", "s", "min", "h", "d", "w", "mo", "y"];
// biome-ignore lint/complexity/noStaticOnlyClass:
class Time {
    static ms;
    static s;
    static min;
    static h;
    static d;
    static w;
    static mo;
    static y;
}
exports.Time = Time;
Object.defineProperties(Time, Object.fromEntries(UNITS.map((unit, i) => [
    unit,
    {
        writable: false,
        value: {
            fromPeriod(period) {
                const { unit: unitFrom, duration } = Time.toPeriod(period);
                return Time[unit].from[unitFrom](duration);
            },
            from: Object.fromEntries(UNITS.map((unitFrom, iFrom) => {
                if (iFrom < i)
                    return [
                        unitFrom,
                        (value) => {
                            const normalizer = Time[unitFrom].from[unit](1n);
                            return toNumberish(BigInt(value) / normalizer, value);
                        },
                    ];
                if (iFrom > i)
                    return [
                        unitFrom,
                        (value) => {
                            switch (unitFrom) {
                                case "ms":
                                    return value;
                                case "s":
                                    return toNumberish(BigInt(value) * 1000n, value);
                                case "min":
                                    return toNumberish(Time[unit].from.s(BigInt(value)) * 60n, value);
                                case "h":
                                    return toNumberish(Time[unit].from.min(BigInt(value)) * 60n, value);
                                case "d":
                                    return toNumberish(Time[unit].from.h(BigInt(value)) * 24n, value);
                                case "w":
                                    return toNumberish(Time[unit].from.d(BigInt(value)) * 7n, value);
                                case "mo":
                                    return toNumberish(Time[unit].from.d(BigInt(value)) * 31n, value);
                                case "y":
                                    return toNumberish(Time[unit].from.d(BigInt(value)) * 365n, value);
                            }
                        },
                    ];
                return [unitFrom, (value) => value];
            })),
        },
    },
])));
(function (Time) {
    function toPeriod(periodLike) {
        if (typeof periodLike === "object")
            return periodLike;
        return {
            unit: periodLike,
            duration: 1,
        };
    }
    Time.toPeriod = toPeriod;
    async function wait(ms, value) {
        return new Promise((resolve) => setTimeout(() => resolve(value), ms));
    }
    Time.wait = wait;
    function timestamp() {
        return BigInt(Math.ceil(Date.now() / 1_000));
    }
    Time.timestamp = timestamp;
})(Time || (exports.Time = Time = {}));
