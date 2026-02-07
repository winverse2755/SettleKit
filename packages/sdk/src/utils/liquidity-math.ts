/**
 * Uniswap v3/v4 Liquidity Math Utilities
 * 
 * TypeScript port of Uniswap's TickMath.sol and LiquidityAmounts.sol
 * 
 * @see https://github.com/Uniswap/v3-core/blob/main/contracts/libraries/TickMath.sol
 * @see https://github.com/Uniswap/v3-periphery/blob/main/contracts/libraries/LiquidityAmounts.sol
 */

// =============================================================================
// Constants
// =============================================================================

/** Q96 = 2^96, used for fixed-point arithmetic in Uniswap */
export const Q96 = 2n ** 96n;

/** Minimum tick value that can be used */
export const MIN_TICK = -887272;

/** Maximum tick value that can be used */
export const MAX_TICK = 887272;

/** Minimum sqrt ratio (corresponds to MIN_TICK) */
export const MIN_SQRT_RATIO = 4295128739n;

/** Maximum sqrt ratio (corresponds to MAX_TICK) */
export const MAX_SQRT_RATIO = 1461446703485210103287273052203988822378723970342n;

// =============================================================================
// TickMath Functions
// =============================================================================

/**
 * Magic numbers used in getSqrtRatioAtTick calculation
 * These are precomputed values for the Taylor series expansion
 */
const TICK_MATH_MAGIC_NUMBERS: readonly bigint[] = [
    0xfffcb933bd6fad37aa2d162d1a594001n,
    0xfff97272373d413259a46990580e213an,
    0xfff2e50f5f656932ef12357cf3c7fdccn,
    0xffe5caca7e10e4e61c3624eaa0941cd0n,
    0xffcb9843d60f6159c9db58835c926644n,
    0xff973b41fa98c081472e6896dfb254c0n,
    0xff2ea16466c96a3843ec78b326b52861n,
    0xfe5dee046a99a2a811c461f1969c3053n,
    0xfcbe86c7900a88aedcffc83b479aa3a4n,
    0xf987a7253ac413176f2b074cf7815e54n,
    0xf3392b0822b70005940c7a398e4b70f3n,
    0xe7159475a2c29b7443b29c7fa6e889d9n,
    0xd097f3bdfd2022b8845ad8f792aa5825n,
    0xa9f746462d870fdf8a65dc1f90e061e5n,
    0x70d869a156d2a1b890bb3df62baf32f7n,
    0x31be135f97d08fd981231505542fcfa6n,
    0x9aa508b5b7a84e1c677de54f3e99bc9n,
    0x5d6af8dedb81196699c329225ee604n,
    0x2216e584f5fa1ea926041bedfe98n,
    0x48a170391f7dc42444e8fa2n,
];

/**
 * Calculates sqrt(1.0001^tick) * 2^96
 * 
 * @param tick - The tick for which to calculate the sqrt ratio
 * @returns The sqrt ratio as a Q64.96 fixed-point number (bigint)
 * @throws If |tick| > MAX_TICK
 * 
 * @example
 * const sqrtPriceX96 = getSqrtRatioAtTick(-887220);
 * console.log(sqrtPriceX96); // Returns the sqrt price at that tick
 */
export function getSqrtRatioAtTick(tick: number): bigint {
    const absTick = Math.abs(tick);
    
    if (absTick > MAX_TICK) {
        throw new Error(`Tick ${tick} exceeds maximum tick ${MAX_TICK}`);
    }

    // Start with base ratio depending on first bit
    let ratio: bigint = (absTick & 0x1) !== 0
        ? 0xfffcb933bd6fad37aa2d162d1a594001n
        : 0x100000000000000000000000000000000n;

    // Apply each magic number based on the bit position
    if ((absTick & 0x2) !== 0) ratio = (ratio * 0xfff97272373d413259a46990580e213an) >> 128n;
    if ((absTick & 0x4) !== 0) ratio = (ratio * 0xfff2e50f5f656932ef12357cf3c7fdccn) >> 128n;
    if ((absTick & 0x8) !== 0) ratio = (ratio * 0xffe5caca7e10e4e61c3624eaa0941cd0n) >> 128n;
    if ((absTick & 0x10) !== 0) ratio = (ratio * 0xffcb9843d60f6159c9db58835c926644n) >> 128n;
    if ((absTick & 0x20) !== 0) ratio = (ratio * 0xff973b41fa98c081472e6896dfb254c0n) >> 128n;
    if ((absTick & 0x40) !== 0) ratio = (ratio * 0xff2ea16466c96a3843ec78b326b52861n) >> 128n;
    if ((absTick & 0x80) !== 0) ratio = (ratio * 0xfe5dee046a99a2a811c461f1969c3053n) >> 128n;
    if ((absTick & 0x100) !== 0) ratio = (ratio * 0xfcbe86c7900a88aedcffc83b479aa3a4n) >> 128n;
    if ((absTick & 0x200) !== 0) ratio = (ratio * 0xf987a7253ac413176f2b074cf7815e54n) >> 128n;
    if ((absTick & 0x400) !== 0) ratio = (ratio * 0xf3392b0822b70005940c7a398e4b70f3n) >> 128n;
    if ((absTick & 0x800) !== 0) ratio = (ratio * 0xe7159475a2c29b7443b29c7fa6e889d9n) >> 128n;
    if ((absTick & 0x1000) !== 0) ratio = (ratio * 0xd097f3bdfd2022b8845ad8f792aa5825n) >> 128n;
    if ((absTick & 0x2000) !== 0) ratio = (ratio * 0xa9f746462d870fdf8a65dc1f90e061e5n) >> 128n;
    if ((absTick & 0x4000) !== 0) ratio = (ratio * 0x70d869a156d2a1b890bb3df62baf32f7n) >> 128n;
    if ((absTick & 0x8000) !== 0) ratio = (ratio * 0x31be135f97d08fd981231505542fcfa6n) >> 128n;
    if ((absTick & 0x10000) !== 0) ratio = (ratio * 0x9aa508b5b7a84e1c677de54f3e99bc9n) >> 128n;
    if ((absTick & 0x20000) !== 0) ratio = (ratio * 0x5d6af8dedb81196699c329225ee604n) >> 128n;
    if ((absTick & 0x40000) !== 0) ratio = (ratio * 0x2216e584f5fa1ea926041bedfe98n) >> 128n;
    if ((absTick & 0x80000) !== 0) ratio = (ratio * 0x48a170391f7dc42444e8fa2n) >> 128n;

    // Invert if tick is positive
    if (tick > 0) {
        const maxUint256 = (1n << 256n) - 1n;
        ratio = maxUint256 / ratio;
    }

    // Convert from Q128.128 to Q128.96 with rounding up
    const remainder = ratio % (1n << 32n);
    const sqrtPriceX96 = (ratio >> 32n) + (remainder === 0n ? 0n : 1n);

    return sqrtPriceX96;
}

// =============================================================================
// FullMath Functions (for precision in liquidity calculations)
// =============================================================================

/**
 * Calculates floor(a * b / denominator) with full precision
 * Handles overflow that would occur with a * b if the result overflows 256 bits
 * 
 * @param a - The multiplicand
 * @param b - The multiplier
 * @param denominator - The divisor
 * @returns floor(a * b / denominator)
 */
export function mulDiv(a: bigint, b: bigint, denominator: bigint): bigint {
    if (denominator === 0n) {
        throw new Error('Division by zero');
    }
    return (a * b) / denominator;
}

/**
 * Calculates ceil(a * b / denominator) with full precision
 * 
 * @param a - The multiplicand
 * @param b - The multiplier
 * @param denominator - The divisor
 * @returns ceil(a * b / denominator)
 */
export function mulDivRoundingUp(a: bigint, b: bigint, denominator: bigint): bigint {
    const result = mulDiv(a, b, denominator);
    if ((a * b) % denominator > 0n) {
        return result + 1n;
    }
    return result;
}

// =============================================================================
// LiquidityAmounts Functions
// =============================================================================

/**
 * Computes the amount of liquidity received for a given amount of token0 and price range
 * 
 * Formula: amount0 * (sqrt(upper) * sqrt(lower)) / (sqrt(upper) - sqrt(lower))
 * 
 * @param sqrtRatioAX96 - A sqrt price representing the first tick boundary
 * @param sqrtRatioBX96 - A sqrt price representing the second tick boundary  
 * @param amount0 - The amount of token0 being sent in
 * @returns The amount of liquidity received
 * 
 * @example
 * const liquidity = getLiquidityForAmount0(sqrtPriceLower, sqrtPriceUpper, ethAmount);
 */
export function getLiquidityForAmount0(
    sqrtRatioAX96: bigint,
    sqrtRatioBX96: bigint,
    amount0: bigint
): bigint {
    // Ensure sqrtRatioAX96 <= sqrtRatioBX96
    if (sqrtRatioAX96 > sqrtRatioBX96) {
        [sqrtRatioAX96, sqrtRatioBX96] = [sqrtRatioBX96, sqrtRatioAX96];
    }

    const intermediate = mulDiv(sqrtRatioAX96, sqrtRatioBX96, Q96);
    return mulDiv(amount0, intermediate, sqrtRatioBX96 - sqrtRatioAX96);
}

/**
 * Computes the amount of liquidity received for a given amount of token1 and price range
 * 
 * Formula: amount1 / (sqrt(upper) - sqrt(lower)) * Q96
 * 
 * @param sqrtRatioAX96 - A sqrt price representing the first tick boundary
 * @param sqrtRatioBX96 - A sqrt price representing the second tick boundary
 * @param amount1 - The amount of token1 being sent in
 * @returns The amount of liquidity received
 * 
 * @example
 * const liquidity = getLiquidityForAmount1(sqrtPriceLower, sqrtPriceUpper, usdcAmount);
 */
export function getLiquidityForAmount1(
    sqrtRatioAX96: bigint,
    sqrtRatioBX96: bigint,
    amount1: bigint
): bigint {
    // Ensure sqrtRatioAX96 <= sqrtRatioBX96
    if (sqrtRatioAX96 > sqrtRatioBX96) {
        [sqrtRatioAX96, sqrtRatioBX96] = [sqrtRatioBX96, sqrtRatioAX96];
    }

    return mulDiv(amount1, Q96, sqrtRatioBX96 - sqrtRatioAX96);
}

/**
 * Computes the maximum amount of liquidity received for given amounts of token0 and token1,
 * the current pool price, and the prices at the tick boundaries.
 * 
 * The function determines which calculation to use based on the current price relative to the range:
 * - If current price <= lower bound: Only token0 is needed (range is above current price)
 * - If current price >= upper bound: Only token1 is needed (range is below current price)  
 * - If current price is within range: Both tokens are needed, use minimum liquidity
 * 
 * @param sqrtRatioX96 - The current sqrt price of the pool
 * @param sqrtRatioAX96 - A sqrt price representing the lower tick boundary
 * @param sqrtRatioBX96 - A sqrt price representing the upper tick boundary
 * @param amount0 - The amount of token0 being sent in
 * @param amount1 - The amount of token1 being sent in
 * @returns The maximum amount of liquidity received
 * 
 * @example
 * const poolState = await getPoolState(poolId);
 * const liquidity = getLiquidityForAmounts(
 *     poolState.sqrtPriceX96,
 *     getSqrtRatioAtTick(tickLower),
 *     getSqrtRatioAtTick(tickUpper),
 *     ethAmount,
 *     usdcAmount
 * );
 */
export function getLiquidityForAmounts(
    sqrtRatioX96: bigint,
    sqrtRatioAX96: bigint,
    sqrtRatioBX96: bigint,
    amount0: bigint,
    amount1: bigint
): bigint {
    // Ensure sqrtRatioAX96 <= sqrtRatioBX96
    if (sqrtRatioAX96 > sqrtRatioBX96) {
        [sqrtRatioAX96, sqrtRatioBX96] = [sqrtRatioBX96, sqrtRatioAX96];
    }

    if (sqrtRatioX96 <= sqrtRatioAX96) {
        // Current price is below the range - only token0 is needed
        return getLiquidityForAmount0(sqrtRatioAX96, sqrtRatioBX96, amount0);
    } else if (sqrtRatioX96 < sqrtRatioBX96) {
        // Current price is within the range - both tokens needed
        const liquidity0 = getLiquidityForAmount0(sqrtRatioX96, sqrtRatioBX96, amount0);
        const liquidity1 = getLiquidityForAmount1(sqrtRatioAX96, sqrtRatioX96, amount1);
        // Return the minimum to ensure we don't exceed either token amount
        return liquidity0 < liquidity1 ? liquidity0 : liquidity1;
    } else {
        // Current price is above the range - only token1 is needed
        return getLiquidityForAmount1(sqrtRatioAX96, sqrtRatioBX96, amount1);
    }
}

/**
 * Computes the amount of token0 for a given amount of liquidity and a price range
 * 
 * This is the inverse of getLiquidityForAmount0 - given liquidity, calculate how much token0
 * 
 * @param sqrtRatioAX96 - A sqrt price representing the first tick boundary
 * @param sqrtRatioBX96 - A sqrt price representing the second tick boundary
 * @param liquidity - The liquidity being valued
 * @returns The amount of token0
 * 
 * @example
 * const ethAmount = getAmount0ForLiquidity(sqrtPriceLower, sqrtPriceUpper, liquidity);
 */
export function getAmount0ForLiquidity(
    sqrtRatioAX96: bigint,
    sqrtRatioBX96: bigint,
    liquidity: bigint
): bigint {
    // Ensure sqrtRatioAX96 <= sqrtRatioBX96
    if (sqrtRatioAX96 > sqrtRatioBX96) {
        [sqrtRatioAX96, sqrtRatioBX96] = [sqrtRatioBX96, sqrtRatioAX96];
    }

    // liquidity * Q96 * (sqrtRatioBX96 - sqrtRatioAX96) / sqrtRatioBX96 / sqrtRatioAX96
    return mulDiv(
        liquidity << 96n,
        sqrtRatioBX96 - sqrtRatioAX96,
        sqrtRatioBX96
    ) / sqrtRatioAX96;
}

/**
 * Computes the amount of token1 for a given amount of liquidity and a price range
 * 
 * This is the inverse of getLiquidityForAmount1 - given liquidity, calculate how much token1
 * 
 * @param sqrtRatioAX96 - A sqrt price representing the first tick boundary
 * @param sqrtRatioBX96 - A sqrt price representing the second tick boundary
 * @param liquidity - The liquidity being valued
 * @returns The amount of token1
 * 
 * @example
 * const usdcAmount = getAmount1ForLiquidity(sqrtPriceLower, sqrtPriceUpper, liquidity);
 */
export function getAmount1ForLiquidity(
    sqrtRatioAX96: bigint,
    sqrtRatioBX96: bigint,
    liquidity: bigint
): bigint {
    // Ensure sqrtRatioAX96 <= sqrtRatioBX96
    if (sqrtRatioAX96 > sqrtRatioBX96) {
        [sqrtRatioAX96, sqrtRatioBX96] = [sqrtRatioBX96, sqrtRatioAX96];
    }

    return mulDiv(liquidity, sqrtRatioBX96 - sqrtRatioAX96, Q96);
}

/**
 * Computes the token0 and token1 amounts for a given amount of liquidity,
 * the current pool price, and the prices at the tick boundaries
 * 
 * @param sqrtRatioX96 - The current sqrt price of the pool
 * @param sqrtRatioAX96 - A sqrt price representing the lower tick boundary
 * @param sqrtRatioBX96 - A sqrt price representing the upper tick boundary
 * @param liquidity - The liquidity being valued
 * @returns Object with amount0 and amount1
 */
export function getAmountsForLiquidity(
    sqrtRatioX96: bigint,
    sqrtRatioAX96: bigint,
    sqrtRatioBX96: bigint,
    liquidity: bigint
): { amount0: bigint; amount1: bigint } {
    // Ensure sqrtRatioAX96 <= sqrtRatioBX96
    if (sqrtRatioAX96 > sqrtRatioBX96) {
        [sqrtRatioAX96, sqrtRatioBX96] = [sqrtRatioBX96, sqrtRatioAX96];
    }

    let amount0 = 0n;
    let amount1 = 0n;

    if (sqrtRatioX96 <= sqrtRatioAX96) {
        // Current price is below the range - only token0
        amount0 = getAmount0ForLiquidity(sqrtRatioAX96, sqrtRatioBX96, liquidity);
    } else if (sqrtRatioX96 < sqrtRatioBX96) {
        // Current price is within the range - both tokens
        amount0 = getAmount0ForLiquidity(sqrtRatioX96, sqrtRatioBX96, liquidity);
        amount1 = getAmount1ForLiquidity(sqrtRatioAX96, sqrtRatioX96, liquidity);
    } else {
        // Current price is above the range - only token1
        amount1 = getAmount1ForLiquidity(sqrtRatioAX96, sqrtRatioBX96, liquidity);
    }

    return { amount0, amount1 };
}
