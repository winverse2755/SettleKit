declare const UNITS: readonly ["ms", "s", "min", "h", "d", "w", "mo", "y"];
type TUnit = (typeof UNITS)[number];
type TPeriod = {
    unit: TUnit;
    duration: number;
};
type P = {
    [U in TUnit]: <T extends number | bigint>(value: T) => T extends number ? number : bigint;
};
type Converters = {
    from: P;
    fromPeriod(period: Time.PeriodLike): number;
};
export declare class Time {
    static ms: Converters;
    static s: Converters;
    static min: Converters;
    static h: Converters;
    static d: Converters;
    static w: Converters;
    static mo: Converters;
    static y: Converters;
}
export declare namespace Time {
    type Unit = TUnit;
    type Period = TPeriod;
    type PeriodLike = TPeriod | TUnit;
    function toPeriod(periodLike: PeriodLike): Period;
    function wait<T>(ms: number, value?: T): Promise<unknown>;
    function timestamp(): bigint;
}
export {};
