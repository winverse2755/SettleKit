"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VaultUtils = void 0;
const index_js_1 = require("../math/index.js");
var VaultUtils;
(function (VaultUtils) {
    VaultUtils.VIRTUAL_ASSETS = 1n;
    function decimalsOffset(decimals) {
        return index_js_1.MathLib.zeroFloorSub(18n, decimals);
    }
    VaultUtils.decimalsOffset = decimalsOffset;
    function toAssets(shares, { totalAssets, totalSupply, decimalsOffset, }, rounding = "Down") {
        return index_js_1.MathLib.mulDiv(shares, BigInt(totalAssets) + VaultUtils.VIRTUAL_ASSETS, BigInt(totalSupply) + 10n ** BigInt(decimalsOffset), rounding);
    }
    VaultUtils.toAssets = toAssets;
    function toShares(assets, { totalAssets, totalSupply, decimalsOffset, }, rounding = "Up") {
        return index_js_1.MathLib.mulDiv(assets, BigInt(totalSupply) + 10n ** BigInt(decimalsOffset), BigInt(totalAssets) + VaultUtils.VIRTUAL_ASSETS, rounding);
    }
    VaultUtils.toShares = toShares;
})(VaultUtils || (exports.VaultUtils = VaultUtils = {}));
