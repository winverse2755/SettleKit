"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConstantWrappedToken = void 0;
const index_js_1 = require("../math/index.js");
const WrappedToken_js_1 = require("./WrappedToken.js");
class ConstantWrappedToken extends WrappedToken_js_1.WrappedToken {
    underlyingDecimals;
    constructor(token, underlying, underlyingDecimals = 0) {
        super(token, underlying);
        this.underlyingDecimals = BigInt(underlyingDecimals);
    }
    toWrappedExactAmountIn(unwrappedAmount, _slippage, rounding = "Down") {
        return super.toWrappedExactAmountIn(unwrappedAmount, 0n, rounding);
    }
    /** The amount of unwrappedTokens that should be wrapped to receive `wrappedAmount` */
    toWrappedExactAmountOut(wrappedAmount, _slippage, rounding = "Up") {
        return super.toWrappedExactAmountOut(wrappedAmount, 0n, rounding);
    }
    /** The expected amount when unwrapping `wrappedAmount` */
    toUnwrappedExactAmountIn(wrappedAmount, _slippage, rounding = "Down") {
        return super.toUnwrappedExactAmountIn(wrappedAmount, 0n, rounding);
    }
    /** The amount of wrappedTokens that should be unwrapped to receive `unwrappedAmount` */
    toUnwrappedExactAmountOut(unwrappedAmount, _slippage, rounding = "Up") {
        return super.toUnwrappedExactAmountOut(unwrappedAmount, 0n, rounding);
    }
    _wrap(amount) {
        return index_js_1.MathLib.mulDivDown(amount, 10n ** BigInt(this.decimals), 10n ** this.underlyingDecimals);
    }
    _unwrap(amount) {
        return index_js_1.MathLib.mulDivDown(amount, 10n ** this.underlyingDecimals, 10n ** BigInt(this.decimals));
    }
}
exports.ConstantWrappedToken = ConstantWrappedToken;
