"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PreLiquidationPosition = exports.PreLiquidationParams = void 0;
const constants_1 = require("../constants");
const market_1 = require("../market");
const math_1 = require("../math");
const Position_1 = require("./Position");
class PreLiquidationParams {
    preLltv;
    preLCF1;
    preLCF2;
    preLIF1;
    preLIF2;
    preLiquidationOracle;
    constructor({ preLltv, preLCF1, preLCF2, preLIF1, preLIF2, preLiquidationOracle, }) {
        this.preLltv = BigInt(preLltv);
        this.preLCF1 = BigInt(preLCF1);
        this.preLCF2 = BigInt(preLCF2);
        this.preLIF1 = BigInt(preLIF1);
        this.preLIF2 = BigInt(preLIF2);
        this.preLiquidationOracle = preLiquidationOracle;
    }
    getCloseFactor(quotient) {
        return (this.preLCF1 + math_1.MathLib.wMulDown(quotient, this.preLCF2 - this.preLCF1));
    }
    getIncentiveFactor(quotient) {
        return (this.preLIF1 + math_1.MathLib.wMulDown(quotient, this.preLIF2 - this.preLIF1));
    }
}
exports.PreLiquidationParams = PreLiquidationParams;
class PreLiquidationPosition extends Position_1.AccrualPosition {
    preLiquidationParams;
    preLiquidation;
    preLiquidationOraclePrice;
    _baseMarket;
    constructor({ preLiquidationParams, preLiquidation, preLiquidationOraclePrice, ...position }, market) {
        super(position, {
            ...market,
            params: {
                ...market.params,
                lltv: BigInt(preLiquidationParams.preLltv),
            },
            price: preLiquidationOraclePrice != null
                ? BigInt(preLiquidationOraclePrice)
                : undefined,
        });
        this.preLiquidationParams = new PreLiquidationParams(preLiquidationParams);
        this.preLiquidation = preLiquidation;
        if (preLiquidationOraclePrice != null)
            this.preLiquidationOraclePrice = BigInt(preLiquidationOraclePrice);
        this._baseMarket = new market_1.Market(market);
    }
    get market() {
        return this._baseMarket;
    }
    get _lltv() {
        return this._baseMarket.params.lltv;
    }
    /**
     * @inheritdoc `undefined` if the pre-liquidation's oracle reverts.
     * `undefined` if it may be liquidatable on Morpho.
     */
    get isHealthy() {
        const { collateralValue } = this;
        if (collateralValue == null)
            return;
        const { borrowAssets } = this;
        if (borrowAssets > math_1.MathLib.wMulDown(collateralValue, this._lltv))
            return;
        return (borrowAssets <=
            math_1.MathLib.wMulDown(collateralValue, this.preLiquidationParams.preLltv));
    }
    /**
     * @inheritdoc `undefined` if the pre-liquidation's oracle reverts.
     */
    get isLiquidatable() {
        const { collateralValue } = this;
        if (collateralValue == null)
            return;
        const { borrowAssets } = this;
        return (borrowAssets >
            math_1.MathLib.wMulDown(collateralValue, this.preLiquidationParams.preLltv) &&
            borrowAssets <= math_1.MathLib.wMulDown(collateralValue, this._lltv));
    }
    /**
     * @inheritdoc `undefined` if the pre-liquidation's oracle reverts.
     */
    get seizableCollateral() {
        if (this._market.price == null)
            return;
        if (!this.isLiquidatable)
            return 0n;
        const { ltv } = this;
        if (ltv == null)
            return;
        const quotient = math_1.MathLib.wDivDown(ltv - this.preLiquidationParams.preLltv, this._lltv - this.preLiquidationParams.preLltv);
        const repayableShares = math_1.MathLib.wMulDown(this.borrowShares, this.preLiquidationParams.getCloseFactor(quotient));
        const repayableAssets = math_1.MathLib.wMulDown(math_1.SharesMath.toAssets(repayableShares, this._market.totalBorrowAssets, this._market.totalBorrowShares, "Down"), this.preLiquidationParams.getIncentiveFactor(quotient));
        return math_1.MathLib.mulDivDown(repayableAssets, constants_1.ORACLE_PRICE_SCALE, this._market.price);
    }
}
exports.PreLiquidationPosition = PreLiquidationPosition;
