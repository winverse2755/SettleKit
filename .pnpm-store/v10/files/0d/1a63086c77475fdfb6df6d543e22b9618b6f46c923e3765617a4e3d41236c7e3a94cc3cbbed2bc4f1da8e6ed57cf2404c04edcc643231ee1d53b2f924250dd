/**
 * Copyright (c) 2026, Circle Internet Group, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

var zod = require('zod');
require('@ethersproject/bytes');
require('@ethersproject/address');
require('bs58');
var units = require('@ethersproject/units');
var providerCctpV2 = require('@circle-fin/provider-cctp-v2');

/**
 * Detect the runtime environment and return a shortened identifier.
 *
 * @returns Runtime string, e.g., "node/18", "browser/Chrome", or "unknown"
 */
/**
 * Set an application-level identifier prefix for all HTTP requests.
 *
 * This allows applications to identify themselves in the user agent string,
 * which is useful for tracking and analytics at the application level.
 *
 * @param prefix - Application identifier with version, e.g., "my-app/1.0.0"
 *
 * @example
 * ```typescript
 * import { setExternalPrefix } from '\@circle-fin/bridge-kit'
 *
 * setExternalPrefix('my-dapp/2.1.0')
 * // All subsequent HTTP requests will include this prefix
 * ```
 */
const setExternalPrefix = (prefix) => {
    if (typeof globalThis !== 'undefined') {
        globalThis.__STABLECOIN_KITS_EXTERNAL_PREFIX__ = prefix;
    }
};
/**
 * Register a kit identifier globally (internal use only).
 *
 * This is called automatically when a kit module loads, using build-time
 * injected constants. For now, only one kit can be registered at a time.
 *
 * @param kitIdentifier - Kit identifier, e.g., "\@circle-fin/bridge-kit/1.2.3"
 * @internal
 */
const registerKit = (kitIdentifier) => {
    if (typeof globalThis !== 'undefined') {
        globalThis.__STABLECOIN_KITS_CURRENT_KIT__ = kitIdentifier;
    }
};

/**
 * Valid recoverability values for error handling strategies.
 *
 * - FATAL errors are thrown immediately (invalid inputs, insufficient funds)
 * - RETRYABLE errors are returned when a flow fails to start but could work later
 * - RESUMABLE errors are returned when a flow fails mid-execution but can be continued
 */
const RECOVERABILITY_VALUES = [
    'RETRYABLE',
    'RESUMABLE',
    'FATAL',
];
/**
 * Error type constants for categorizing errors by origin.
 *
 * This const object provides a reference for error types, enabling
 * IDE autocomplete and preventing typos when creating custom errors.
 *
 * @remarks
 * While internal error definitions use string literals with type annotations
 * for strict type safety, this constant is useful for developers creating
 * custom error instances or checking error types programmatically.
 *
 * @example
 * ```typescript
 * import { ERROR_TYPES, KitError } from '@core/errors'
 *
 * // Use for type checking
 * if (error.type === ERROR_TYPES.BALANCE) {
 *   console.log('This is a balance error')
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Use as reference when creating custom errors
 * const error = new KitError({
 *   code: 9999,
 *   name: 'CUSTOM_ERROR',
 *   type: ERROR_TYPES.BALANCE,  // IDE autocomplete works here
 *   recoverability: 'FATAL',
 *   message: 'Custom balance error'
 * })
 * ```
 */
const ERROR_TYPES = {
    /** User input validation and parameter checking */
    INPUT: 'INPUT',
    /** Insufficient token balances and amount validation */
    BALANCE: 'BALANCE',
    /** On-chain execution: reverts, gas issues, transaction failures */
    ONCHAIN: 'ONCHAIN',
    /** Blockchain RPC provider issues and endpoint problems */
    RPC: 'RPC',
    /** Internet connectivity, DNS resolution, connection issues */
    NETWORK: 'NETWORK',
    /** Catch-all for unrecognized errors (code 0) */
    UNKNOWN: 'UNKNOWN',
};
/**
 * Array of valid error type values for validation.
 * Derived from ERROR_TYPES const object.
 */
const ERROR_TYPE_VALUES = Object.values(ERROR_TYPES);

// Create mutable arrays for Zod enum validation
const RECOVERABILITY_ARRAY = [...RECOVERABILITY_VALUES];
const ERROR_TYPE_ARRAY = [...ERROR_TYPE_VALUES];
/**
 * Error code ranges for validation.
 * Single source of truth for valid error code ranges.
 *
 * Note: Code 0 is special - it's the UNKNOWN catch-all error.
 */
const ERROR_CODE_RANGES = [
    { min: 1000, max: 1999, type: 'INPUT' },
    { min: 3000, max: 3999, type: 'NETWORK' },
    { min: 4000, max: 4999, type: 'RPC' },
    { min: 5000, max: 5999, type: 'ONCHAIN' },
    { min: 9000, max: 9999, type: 'BALANCE' },
];
/** Special code for UNKNOWN errors */
const UNKNOWN_ERROR_CODE = 0;
/**
 * Zod schema for validating ErrorDetails objects.
 *
 * This schema provides runtime validation for all ErrorDetails properties,
 * ensuring type safety and proper error handling for JavaScript consumers.
 *
 * @example
 * ```typescript
 * import { errorDetailsSchema } from '@core/errors'
 *
 * const result = errorDetailsSchema.safeParse({
 *   code: 1001,
 *   name: 'INPUT_NETWORK_MISMATCH',
 *   type: 'INPUT',
 *   recoverability: 'FATAL',
 *   message: 'Source and destination networks must be different'
 * })
 *
 * if (!result.success) {
 *   console.error('Validation failed:', result.error.issues)
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Runtime error
 * const result = errorDetailsSchema.safeParse({
 *   code: 9001,
 *   name: 'BALANCE_INSUFFICIENT_TOKEN',
 *   type: 'BALANCE',
 *   recoverability: 'FATAL',
 *   message: 'Insufficient USDC balance'
 * })
 * ```
 */
const errorDetailsSchema = zod.z.object({
    /**
     * Numeric identifier following standardized ranges:
     * - 0: UNKNOWN - Catch-all for unrecognized errors
     * - 1000-1999: INPUT errors - Parameter validation
     * - 3000-3999: NETWORK errors - Connectivity issues
     * - 4000-4999: RPC errors - Provider issues, gas estimation
     * - 5000-5999: ONCHAIN errors - Transaction/simulation failures
     * - 9000-9999: BALANCE errors - Insufficient funds
     */
    code: zod.z
        .number()
        .int('Error code must be an integer')
        .refine((code) => code === UNKNOWN_ERROR_CODE ||
        ERROR_CODE_RANGES.some((range) => code >= range.min && code <= range.max), {
        message: 'Error code must be 0 (UNKNOWN) or in valid ranges: 1000-1999 (INPUT), 3000-3999 (NETWORK), 4000-4999 (RPC), 5000-5999 (ONCHAIN), 9000-9999 (BALANCE)',
    }),
    /** Human-readable ID (e.g., "INPUT_NETWORK_MISMATCH", "BALANCE_INSUFFICIENT_TOKEN") */
    name: zod.z
        .string()
        .min(1, 'Error name must be a non-empty string')
        .regex(/^[A-Z_][A-Z0-9_]*$/, 'Error name must match pattern: ^[A-Z_][A-Z0-9_]*$'),
    /** Error category indicating where the error originated */
    type: zod.z.enum(ERROR_TYPE_ARRAY, {
        errorMap: () => ({
            message: 'Error type must be one of: INPUT, BALANCE, ONCHAIN, RPC, NETWORK, UNKNOWN',
        }),
    }),
    /** Error handling strategy */
    recoverability: zod.z.enum(RECOVERABILITY_ARRAY, {
        errorMap: () => ({
            message: 'Recoverability must be one of: RETRYABLE, RESUMABLE, FATAL',
        }),
    }),
    /** User-friendly explanation with context */
    message: zod.z
        .string()
        .min(1, 'Error message must be a non-empty string')
        .max(1000, 'Error message must be 1000 characters or less'),
    /** Raw error details, context, or the original error that caused this one. */
    cause: zod.z
        .object({
        /** Free-form error payload from underlying system */
        trace: zod.z.unknown().optional(),
    })
        .optional(),
});

/**
 * Validates an ErrorDetails object using Zod schema.
 *
 * @param details - The object to validate
 * @returns The validated ErrorDetails object
 * @throws TypeError When validation fails
 *
 * @example
 * ```typescript
 * import { validateErrorDetails } from '@core/errors'
 *
 * try {
 *   const validDetails = validateErrorDetails({
 *     code: 1001,
 *     name: 'NETWORK_MISMATCH',
 *     recoverability: 'FATAL',
 *     message: 'Source and destination networks must be different'
 *   })
 * } catch (error) {
 *   console.error('Validation failed:', error.message)
 * }
 * ```
 */
function validateErrorDetails(details) {
    const result = errorDetailsSchema.safeParse(details);
    if (!result.success) {
        const issues = result.error.issues
            .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
            .join(', ');
        throw new TypeError(`Invalid ErrorDetails: ${issues}`);
    }
    return result.data;
}

/**
 * Maximum length for error messages in fallback validation errors.
 *
 * KitError enforces a 1000-character limit on error messages. When creating
 * fallback validation errors that combine multiple Zod issues, we use 950
 * characters to leave a 50-character buffer for:
 * - The error message prefix ("Invalid bridge parameters: ")
 * - Potential encoding differences or formatting overhead
 * - Safety margin to prevent KitError constructor failures
 *
 * This ensures that even with concatenated issue summaries, the final message
 * stays within KitError's constraints.
 */
const MAX_MESSAGE_LENGTH = 950;
/**
 * Standard error message for invalid amount format.
 *
 * The SDK enforces strict dot-decimal notation for amount values. This constant
 * provides a consistent error message when users provide amounts with:
 * - Comma decimals (e.g., "1,5")
 * - Thousand separators (e.g., "1,000.50")
 * - Non-numeric characters
 * - Invalid format
 */
const AMOUNT_FORMAT_ERROR_MESSAGE = 'Amount must be a numeric string with dot (.) as decimal separator (e.g., "10.5", "100"), with no thousand separators or comma decimals';
/**
 * Error message for amounts that must be greater than zero.
 */
const AMOUNT_GREATER_THAN_ZERO_MESSAGE = 'Amount must be greater than 0';
/**
 * Error message for amounts exceeding maximum decimal places.
 *
 * USDC uses 6 decimal places, so amounts with more precision are invalid.
 */
const AMOUNT_MAX_DECIMAL_PLACES_MESSAGE = 'Maximum supported decimal places: 6';
/**
 * Error message for amounts that must be non-negative.
 *
 * Used when validating amounts that can be zero or positive but not negative.
 */
const AMOUNT_NON_NEGATIVE_MESSAGE = 'Amount must be non-negative';
/**
 * Error message for invalid maxFee format.
 *
 * Used when validating the maxFee configuration parameter. The maxFee can be zero
 * or positive and must follow strict dot-decimal notation.
 */
const MAX_FEE_FORMAT_ERROR_MESSAGE = 'maxFee must be a numeric string with dot (.) as decimal separator (e.g., "1", "0.5", ".5", "1.5"), with no thousand separators or comma decimals';

/**
 * Structured error class for Stablecoin Kit operations.
 *
 * This class extends the native Error class while implementing the ErrorDetails
 * interface, providing a consistent error format for programmatic handling
 * across the Stablecoin Kits ecosystem. All properties are immutable to ensure
 * error objects cannot be modified after creation.
 *
 * @example
 * ```typescript
 * import { KitError } from '@core/errors'
 *
 * const error = new KitError({
 *   code: 1001,
 *   name: 'INPUT_NETWORK_MISMATCH',
 *   recoverability: 'FATAL',
 *   message: 'Cannot bridge between mainnet and testnet'
 * })
 *
 * if (error instanceof KitError) {
 *   console.log(`Error ${error.code}: ${error.name}`)
 *   // → "Error 1001: INPUT_NETWORK_MISMATCH"
 * }
 * ```
 *
 * @example
 * ```typescript
 * import { KitError } from '@core/errors'
 *
 * // Error with cause information
 * const error = new KitError({
 *   code: 1002,
 *   name: 'INVALID_AMOUNT',
 *   recoverability: 'FATAL',
 *   message: 'Amount must be greater than zero',
 *   cause: {
 *     trace: { providedAmount: -100, minimumAmount: 0 }
 *   }
 * })
 *
 * throw error
 * ```
 */
class KitError extends Error {
    /** Numeric identifier following standardized ranges (1000+ for INPUT errors) */
    code;
    /** Human-readable ID (e.g., "NETWORK_MISMATCH") */
    name;
    /** Error category indicating where the error originated */
    type;
    /** Error handling strategy */
    recoverability;
    /** Raw error details, context, or the original error that caused this one. */
    cause;
    /**
     * Create a new KitError instance.
     *
     * @param details - The error details object containing all required properties.
     * @throws \{TypeError\} When details parameter is missing or invalid.
     */
    constructor(details) {
        // Truncate message if it exceeds maximum length to prevent validation errors
        let message = details.message;
        if (message.length > MAX_MESSAGE_LENGTH) {
            message = `${message.slice(0, MAX_MESSAGE_LENGTH - 3)}...`;
        }
        const truncatedDetails = { ...details, message };
        // Validate input at runtime for JavaScript consumers using Zod
        const validatedDetails = validateErrorDetails(truncatedDetails);
        super(validatedDetails.message);
        // Set properties as readonly at runtime
        Object.defineProperties(this, {
            name: {
                value: validatedDetails.name,
                writable: false,
                enumerable: true,
                configurable: false,
            },
            code: {
                value: validatedDetails.code,
                writable: false,
                enumerable: true,
                configurable: false,
            },
            type: {
                value: validatedDetails.type,
                writable: false,
                enumerable: true,
                configurable: false,
            },
            recoverability: {
                value: validatedDetails.recoverability,
                writable: false,
                enumerable: true,
                configurable: false,
            },
            ...(validatedDetails.cause && {
                cause: {
                    value: validatedDetails.cause,
                    writable: false,
                    enumerable: true,
                    configurable: false,
                },
            }),
        });
    }
}

/**
 * Standardized error code ranges for consistent categorization:
 *
 * - 0: UNKNOWN - Catch-all for unrecognized errors
 * - 1000-1999: INPUT errors - Parameter validation, input format errors
 * - 3000-3999: NETWORK errors - Internet connectivity, DNS, connection issues
 * - 4000-4999: RPC errors - Blockchain provider issues, gas estimation, nonce errors
 * - 5000-5999: ONCHAIN errors - Transaction/simulation failures, gas exhaustion, reverts
 * - 9000-9999: BALANCE errors - Insufficient funds, token balance, allowance
 */
/**
 * Standardized error definitions for INPUT type errors.
 *
 * Each entry combines the numeric error code, string name, and type
 * to ensure consistency when creating error instances.
 *
 * Error codes follow a hierarchical numbering scheme where the first digit
 * indicates the error category (1 = INPUT) and subsequent digits provide
 * specific error identification within that category.
 *
 *
 * @example
 * ```typescript
 * import { InputError } from '@core/errors'
 *
 * const error = new KitError({
 *   ...InputError.NETWORK_MISMATCH,
 *   recoverability: 'FATAL',
 *   message: 'Source and destination networks must be different'
 * })
 *
 * // Access code, name, and type individually if needed
 * console.log(InputError.NETWORK_MISMATCH.code)  // 1001
 * console.log(InputError.NETWORK_MISMATCH.name)  // 'INPUT_NETWORK_MISMATCH'
 * console.log(InputError.NETWORK_MISMATCH.type)  // 'INPUT'
 * ```
 */
const InputError = {
    /** Network type mismatch between chains (mainnet vs testnet) */
    NETWORK_MISMATCH: {
        code: 1001,
        name: 'INPUT_NETWORK_MISMATCH',
        type: 'INPUT',
    },
    /** Invalid amount format or value (negative, zero, or malformed) */
    INVALID_AMOUNT: {
        code: 1002,
        name: 'INPUT_INVALID_AMOUNT',
        type: 'INPUT',
    },
    /** Unsupported or invalid bridge route configuration */
    UNSUPPORTED_ROUTE: {
        code: 1003,
        name: 'INPUT_UNSUPPORTED_ROUTE',
        type: 'INPUT',
    },
    /** Invalid wallet or contract address format */
    INVALID_ADDRESS: {
        code: 1004,
        name: 'INPUT_INVALID_ADDRESS',
        type: 'INPUT',
    },
    /** Invalid or unsupported chain identifier */
    INVALID_CHAIN: {
        code: 1005,
        name: 'INPUT_INVALID_CHAIN',
        type: 'INPUT',
    },
    /** Invalid or unknown token (symbol not found, missing decimals, etc.) */
    INVALID_TOKEN: {
        code: 1006,
        name: 'INPUT_INVALID_TOKEN',
        type: 'INPUT',
    },
    /** General validation failure for complex validation rules */
    VALIDATION_FAILED: {
        code: 1098,
        name: 'INPUT_VALIDATION_FAILED',
        type: 'INPUT',
    },
};
/**
 * Standardized error definitions for BALANCE type errors.
 *
 * BALANCE errors indicate insufficient funds or allowance issues
 * that prevent transaction execution.
 *
 * @example
 * ```typescript
 * import { BalanceError } from '@core/errors'
 *
 * const error = new KitError({
 *   ...BalanceError.INSUFFICIENT_TOKEN,
 *   recoverability: 'FATAL',
 *   message: 'Insufficient USDC balance on Ethereum',
 *   cause: { trace: { required: '100', available: '50' } }
 * })
 * ```
 */
const BalanceError = {
    /** Insufficient token balance for transaction */
    INSUFFICIENT_TOKEN: {
        code: 9001,
        name: 'BALANCE_INSUFFICIENT_TOKEN',
        type: 'BALANCE',
    },
    /** Insufficient native token (ETH/SOL/etc) for gas fees */
    INSUFFICIENT_GAS: {
        code: 9002,
        name: 'BALANCE_INSUFFICIENT_GAS',
        type: 'BALANCE',
    },
    /** Insufficient allowance for token transfer */
    INSUFFICIENT_ALLOWANCE: {
        code: 9003,
        name: 'BALANCE_INSUFFICIENT_ALLOWANCE',
        type: 'BALANCE',
    },
};
/**
 * Standardized error definitions for ONCHAIN type errors.
 *
 * ONCHAIN errors occur during transaction execution, simulation,
 * or interaction with smart contracts on the blockchain.
 *
 * @example
 * ```typescript
 * import { OnchainError } from '@core/errors'
 *
 * const error = new KitError({
 *   ...OnchainError.SIMULATION_FAILED,
 *   recoverability: 'FATAL',
 *   message: 'Simulation failed: ERC20 transfer amount exceeds balance',
 *   cause: { trace: { reason: 'ERC20: transfer amount exceeds balance' } }
 * })
 * ```
 */
const OnchainError = {
    /** Transaction reverted on-chain after execution */
    TRANSACTION_REVERTED: {
        code: 5001,
        name: 'ONCHAIN_TRANSACTION_REVERTED',
        type: 'ONCHAIN',
    },
    /** Pre-flight transaction simulation failed */
    SIMULATION_FAILED: {
        code: 5002,
        name: 'ONCHAIN_SIMULATION_FAILED',
        type: 'ONCHAIN',
    },
    /** Transaction ran out of gas during execution */
    OUT_OF_GAS: {
        code: 5003,
        name: 'ONCHAIN_OUT_OF_GAS',
        type: 'ONCHAIN',
    },
    /** Transaction exceeds block gas limit */
    GAS_LIMIT_EXCEEDED: {
        code: 5004,
        name: 'ONCHAIN_GAS_LIMIT_EXCEEDED',
        type: 'ONCHAIN',
    },
};
/**
 * Standardized error definitions for RPC type errors.
 *
 * RPC errors occur when communicating with blockchain RPC providers,
 * including endpoint failures, invalid responses, and provider-specific issues.
 *
 * @example
 * ```typescript
 * import { RpcError } from '@core/errors'
 *
 * const error = new KitError({
 *   ...RpcError.ENDPOINT_ERROR,
 *   recoverability: 'RETRYABLE',
 *   message: 'RPC endpoint unavailable on Ethereum',
 *   cause: { trace: { endpoint: 'https://mainnet.infura.io' } }
 * })
 * ```
 */
const RpcError = {
    /** RPC endpoint returned error or is unavailable */
    ENDPOINT_ERROR: {
        code: 4001,
        name: 'RPC_ENDPOINT_ERROR',
        type: 'RPC',
    },
    /** Invalid or unexpected RPC response format */
    INVALID_RESPONSE: {
        code: 4002,
        name: 'RPC_INVALID_RESPONSE',
        type: 'RPC',
    },
    /** Nonce-related errors from RPC provider */
    NONCE_ERROR: {
        code: 4003,
        name: 'RPC_NONCE_ERROR',
        type: 'RPC',
    },
};
/**
 * Standardized error definitions for NETWORK type errors.
 *
 * NETWORK errors indicate connectivity issues at the network layer,
 * including DNS failures, connection timeouts, and unreachable endpoints.
 *
 * @example
 * ```typescript
 * import { NetworkError } from '@core/errors'
 *
 * const error = new KitError({
 *   ...NetworkError.CONNECTION_FAILED,
 *   recoverability: 'RETRYABLE',
 *   message: 'Failed to connect to Ethereum network',
 *   cause: { trace: { error: 'ECONNREFUSED' } }
 * })
 * ```
 */
const NetworkError = {
    /** Network connection failed or unreachable */
    CONNECTION_FAILED: {
        code: 3001,
        name: 'NETWORK_CONNECTION_FAILED',
        type: 'NETWORK',
    },
    /** Network request timeout */
    TIMEOUT: {
        code: 3002,
        name: 'NETWORK_TIMEOUT',
        type: 'NETWORK',
    },
};

/**
 * Creates error for network type mismatch between source and destination.
 *
 * This error is thrown when attempting to bridge between chains that have
 * different network types (e.g., mainnet to testnet), which is not supported
 * for security reasons.
 *
 * @param sourceChain - The source chain definition
 * @param destChain - The destination chain definition
 * @returns KitError with specific network mismatch details
 *
 * @example
 * ```typescript
 * import { createNetworkMismatchError } from '@core/errors'
 * import { Ethereum, BaseSepolia } from '@core/chains'
 *
 * // This will throw a detailed error
 * throw createNetworkMismatchError(Ethereum, BaseSepolia)
 * // Message: "Cannot bridge between Ethereum (mainnet) and Base Sepolia (testnet). Source and destination networks must both be testnet or both be mainnet."
 * ```
 */
function createNetworkMismatchError(sourceChain, destChain) {
    const sourceNetworkType = sourceChain.isTestnet ? 'testnet' : 'mainnet';
    const destNetworkType = destChain.isTestnet ? 'testnet' : 'mainnet';
    const errorDetails = {
        ...InputError.NETWORK_MISMATCH,
        recoverability: 'FATAL',
        message: `Cannot bridge between ${sourceChain.name} (${sourceNetworkType}) and ${destChain.name} (${destNetworkType}). Source and destination networks must both be testnet or both be mainnet.`,
        cause: {
            trace: { sourceChain: sourceChain.name, destChain: destChain.name },
        },
    };
    return new KitError(errorDetails);
}
/**
 * Creates error for unsupported bridge route.
 *
 * This error is thrown when attempting to bridge between chains that don't
 * have a supported bridge route configured.
 *
 * @param source - Source chain name
 * @param destination - Destination chain name
 * @returns KitError with specific route details
 *
 * @example
 * ```typescript
 * import { createUnsupportedRouteError } from '@core/errors'
 *
 * throw createUnsupportedRouteError('Ethereum', 'Solana')
 * // Message: "Route from Ethereum to Solana is not supported"
 * ```
 */
function createUnsupportedRouteError(source, destination) {
    const errorDetails = {
        ...InputError.UNSUPPORTED_ROUTE,
        recoverability: 'FATAL',
        message: `Route from ${source} to ${destination} is not supported.`,
        cause: {
            trace: { source, destination },
        },
    };
    return new KitError(errorDetails);
}
/**
 * Creates error for invalid amount format or precision.
 *
 * This error is thrown when the provided amount doesn't meet validation
 * requirements such as precision, range, or format.
 *
 * @param amount - The invalid amount string
 * @param reason - Specific reason why amount is invalid
 * @returns KitError with amount details and validation rule
 *
 * @example
 * ```typescript
 * import { createInvalidAmountError } from '@core/errors'
 *
 * throw createInvalidAmountError('0.000001', 'Amount must be at least 0.01 USDC')
 * // Message: "Invalid amount '0.000001': Amount must be at least 0.01 USDC"
 *
 * throw createInvalidAmountError('1,000.50', 'Amount must be a numeric string with dot (.) as decimal separator, with no thousand separators or comma decimals')
 * // Message: "Invalid amount '1,000.50': Amount must be a numeric string with dot (.) as decimal separator, with no thousand separators or comma decimals."
 * ```
 */
function createInvalidAmountError(amount, reason) {
    const errorDetails = {
        ...InputError.INVALID_AMOUNT,
        recoverability: 'FATAL',
        message: `Invalid amount '${amount}': ${reason}.`,
        cause: {
            trace: { amount, reason },
        },
    };
    return new KitError(errorDetails);
}
/**
 * Creates error for invalid wallet address format.
 *
 * This error is thrown when the provided address doesn't match the expected
 * format for the specified chain.
 *
 * @param address - The invalid address string
 * @param chain - Chain name where address is invalid
 * @param expectedFormat - Description of expected address format
 * @returns KitError with address details and format requirements
 *
 * @example
 * ```typescript
 * import { createInvalidAddressError } from '@core/errors'
 *
 * throw createInvalidAddressError('0x123', 'Ethereum', '42-character hex string starting with 0x')
 * // Message: "Invalid address '0x123' for Ethereum. Expected 42-character hex string starting with 0x."
 *
 * throw createInvalidAddressError('invalid', 'Solana', 'base58-encoded string')
 * // Message: "Invalid address 'invalid' for Solana. Expected base58-encoded string."
 * ```
 */
function createInvalidAddressError(address, chain, expectedFormat) {
    const errorDetails = {
        ...InputError.INVALID_ADDRESS,
        recoverability: 'FATAL',
        message: `Invalid address '${address}' for ${chain}. Expected ${expectedFormat}.`,
        cause: {
            trace: { address, chain, expectedFormat },
        },
    };
    return new KitError(errorDetails);
}
/**
 * Creates error for invalid chain configuration.
 *
 * This error is thrown when the provided chain doesn't meet the required
 * configuration or is not supported for the operation.
 *
 * @param chain - The invalid chain name or identifier
 * @param reason - Specific reason why chain is invalid
 * @returns KitError with chain details and validation rule
 *
 * @example
 * ```typescript
 * import { createInvalidChainError } from '@core/errors'
 *
 * throw createInvalidChainError('UnknownChain', 'Chain is not supported by this bridge')
 * // Message: "Invalid chain 'UnknownChain': Chain is not supported by this bridge"
 * ```
 */
function createInvalidChainError(chain, reason) {
    const errorDetails = {
        ...InputError.INVALID_CHAIN,
        recoverability: 'FATAL',
        message: `Invalid chain '${chain}': ${reason}`,
        cause: {
            trace: { chain, reason },
        },
    };
    return new KitError(errorDetails);
}
/**
 * Creates error for general validation failure.
 *
 * This error is thrown when input validation fails for reasons not covered
 * by more specific error types.
 *
 * @param field - The field that failed validation
 * @param value - The invalid value (can be any type)
 * @param reason - Specific reason why validation failed
 * @returns KitError with validation details
 *
 * @example
 * ```typescript
 * import { createValidationFailedError } from '@core/errors'
 *
 * throw createValidationFailedError('recipient', 'invalid@email', 'Must be a valid wallet address')
 * // Message: "Validation failed for 'recipient': 'invalid@email' - Must be a valid wallet address"
 *
 * throw createValidationFailedError('chainId', 999, 'Unsupported chain ID')
 * // Message: "Validation failed for 'chainId': 999 - Unsupported chain ID"
 *
 * throw createValidationFailedError('config', { invalid: true }, 'Missing required properties')
 * // Message: "Validation failed for 'config': [object Object] - Missing required properties"
 * ```
 */
function createValidationFailedError$1(field, value, reason) {
    // Convert value to string for display, handling different types appropriately
    let valueString;
    if (typeof value === 'string') {
        valueString = `'${value}'`;
    }
    else if (typeof value === 'object' && value !== null) {
        valueString = JSON.stringify(value);
    }
    else {
        valueString = String(value);
    }
    const errorDetails = {
        ...InputError.VALIDATION_FAILED,
        recoverability: 'FATAL',
        message: `Validation failed for '${field}': ${valueString} - ${reason}.`,
        cause: {
            trace: { field, value, reason },
        },
    };
    return new KitError(errorDetails);
}
/**
 * Creates a KitError from a Zod validation error with detailed error information.
 *
 * This factory function converts Zod validation failures into standardized KitError
 * instances with INPUT_VALIDATION_FAILED code (1098). It extracts all Zod issues
 * and includes them in both the error message and trace for debugging, providing
 * developers with comprehensive validation feedback.
 *
 * The error message includes all validation errors concatenated with semicolons.
 *
 * @param zodError - The Zod validation error containing one or more validation issues
 * @param context - Context string describing what was being validated (e.g., 'bridge parameters', 'user input')
 * @returns KitError with INPUT_VALIDATION_FAILED code and structured validation details
 *
 * @example
 * ```typescript
 * import { createValidationErrorFromZod } from '@core/errors'
 * import { z } from 'zod'
 *
 * const schema = z.object({
 *   name: z.string().min(3),
 *   age: z.number().positive()
 * })
 *
 * const result = schema.safeParse({ name: 'ab', age: -1 })
 * if (!result.success) {
 *   throw createValidationErrorFromZod(result.error, 'user data')
 * }
 * // Throws: KitError with message:
 * // "Invalid user data: name: String must contain at least 3 character(s); age: Number must be greater than 0"
 * // And cause.trace.validationErrors containing all validation errors as an array
 * ```
 *
 * @example
 * ```typescript
 * // Usage in validation functions
 * import { createValidationErrorFromZod } from '@core/errors'
 *
 * function validateBridgeParams(params: unknown): asserts params is BridgeParams {
 *   const result = bridgeParamsSchema.safeParse(params)
 *   if (!result.success) {
 *     throw createValidationErrorFromZod(result.error, 'bridge parameters')
 *   }
 * }
 * ```
 */
function createValidationErrorFromZod(zodError, context) {
    // Format each Zod issue as "path: message"
    const validationErrors = zodError.issues.map((issue) => {
        const path = issue.path.length > 0 ? `${issue.path.join('.')}: ` : '';
        return `${path}${issue.message}`;
    });
    // Join all errors with semicolons to show complete validation feedback
    const issueSummary = validationErrors.join('; ');
    const allErrors = issueSummary || 'Invalid Input';
    // Build full message from context and validation errors
    const fullMessage = `Invalid ${context}: ${allErrors}`;
    const errorDetails = {
        ...InputError.VALIDATION_FAILED,
        recoverability: 'FATAL',
        message: fullMessage,
        cause: {
            trace: {
                validationErrors, // Array of formatted error strings for display
                zodError: zodError.message, // Original Zod error message
                zodIssues: zodError.issues, // Full Zod issues array for debugging
            },
        },
    };
    return new KitError(errorDetails);
}

// -----------------------------------------------------------------------------
// Blockchain Enum
// -----------------------------------------------------------------------------
/**
 * Enumeration of all blockchains known to this library.
 *
 * This enum contains every blockchain that has a chain definition, regardless
 * of whether bridging is currently supported. For chains that support bridging
 * via CCTPv2, see {@link BridgeChain}.
 *
 * @enum
 * @category Enums
 * @description Provides string identifiers for each blockchain with a definition.
 * @see {@link BridgeChain} for the subset of chains that support CCTPv2 bridging.
 */
exports.Blockchain = void 0;
(function (Blockchain) {
    Blockchain["Algorand"] = "Algorand";
    Blockchain["Algorand_Testnet"] = "Algorand_Testnet";
    Blockchain["Aptos"] = "Aptos";
    Blockchain["Aptos_Testnet"] = "Aptos_Testnet";
    Blockchain["Arc_Testnet"] = "Arc_Testnet";
    Blockchain["Arbitrum"] = "Arbitrum";
    Blockchain["Arbitrum_Sepolia"] = "Arbitrum_Sepolia";
    Blockchain["Avalanche"] = "Avalanche";
    Blockchain["Avalanche_Fuji"] = "Avalanche_Fuji";
    Blockchain["Base"] = "Base";
    Blockchain["Base_Sepolia"] = "Base_Sepolia";
    Blockchain["Celo"] = "Celo";
    Blockchain["Celo_Alfajores_Testnet"] = "Celo_Alfajores_Testnet";
    Blockchain["Codex"] = "Codex";
    Blockchain["Codex_Testnet"] = "Codex_Testnet";
    Blockchain["Ethereum"] = "Ethereum";
    Blockchain["Ethereum_Sepolia"] = "Ethereum_Sepolia";
    Blockchain["Hedera"] = "Hedera";
    Blockchain["Hedera_Testnet"] = "Hedera_Testnet";
    Blockchain["HyperEVM"] = "HyperEVM";
    Blockchain["HyperEVM_Testnet"] = "HyperEVM_Testnet";
    Blockchain["Ink"] = "Ink";
    Blockchain["Ink_Testnet"] = "Ink_Testnet";
    Blockchain["Linea"] = "Linea";
    Blockchain["Linea_Sepolia"] = "Linea_Sepolia";
    Blockchain["Monad"] = "Monad";
    Blockchain["Monad_Testnet"] = "Monad_Testnet";
    Blockchain["NEAR"] = "NEAR";
    Blockchain["NEAR_Testnet"] = "NEAR_Testnet";
    Blockchain["Noble"] = "Noble";
    Blockchain["Noble_Testnet"] = "Noble_Testnet";
    Blockchain["Optimism"] = "Optimism";
    Blockchain["Optimism_Sepolia"] = "Optimism_Sepolia";
    Blockchain["Polkadot_Asset_Hub"] = "Polkadot_Asset_Hub";
    Blockchain["Polkadot_Westmint"] = "Polkadot_Westmint";
    Blockchain["Plume"] = "Plume";
    Blockchain["Plume_Testnet"] = "Plume_Testnet";
    Blockchain["Polygon"] = "Polygon";
    Blockchain["Polygon_Amoy_Testnet"] = "Polygon_Amoy_Testnet";
    Blockchain["Sei"] = "Sei";
    Blockchain["Sei_Testnet"] = "Sei_Testnet";
    Blockchain["Solana"] = "Solana";
    Blockchain["Solana_Devnet"] = "Solana_Devnet";
    Blockchain["Sonic"] = "Sonic";
    Blockchain["Sonic_Testnet"] = "Sonic_Testnet";
    Blockchain["Stellar"] = "Stellar";
    Blockchain["Stellar_Testnet"] = "Stellar_Testnet";
    Blockchain["Sui"] = "Sui";
    Blockchain["Sui_Testnet"] = "Sui_Testnet";
    Blockchain["Unichain"] = "Unichain";
    Blockchain["Unichain_Sepolia"] = "Unichain_Sepolia";
    Blockchain["World_Chain"] = "World_Chain";
    Blockchain["World_Chain_Sepolia"] = "World_Chain_Sepolia";
    Blockchain["XDC"] = "XDC";
    Blockchain["XDC_Apothem"] = "XDC_Apothem";
    Blockchain["ZKSync_Era"] = "ZKSync_Era";
    Blockchain["ZKSync_Sepolia"] = "ZKSync_Sepolia";
})(exports.Blockchain || (exports.Blockchain = {}));
// -----------------------------------------------------------------------------
// Bridge Chain Enum (CCTPv2 Supported Chains)
// -----------------------------------------------------------------------------
/**
 * Enumeration of blockchains that support cross-chain bridging via CCTPv2.
 *
 * The enum is derived from the full {@link Blockchain} enum but filtered to only
 * include chains with active CCTPv2 support. When new chains gain CCTPv2 support,
 * they are added to this enum.
 *
 * @enum
 * @category Enums
 *
 * @remarks
 * - This enum is the **canonical source** of bridging-supported chains.
 * - Use this enum (or its string literals) in `kit.bridge()` calls for type safety.
 * - Attempting to use a chain not in this enum will produce a TypeScript compile error.
 *
 * @example
 * ```typescript
 * import { BridgeKit, BridgeChain } from '@circle-fin/bridge-kit'
 *
 * const kit = new BridgeKit()
 *
 * // ✅ Valid - autocomplete suggests only supported chains
 * await kit.bridge({
 *   from: { adapter, chain: BridgeChain.Ethereum },
 *   to: { adapter, chain: BridgeChain.Base },
 *   amount: '100'
 * })
 *
 * // ✅ Also valid - string literals work with autocomplete
 * await kit.bridge({
 *   from: { adapter, chain: 'Ethereum_Sepolia' },
 *   to: { adapter, chain: 'Base_Sepolia' },
 *   amount: '100'
 * })
 *
 * // ❌ Compile error - Algorand is not in BridgeChain
 * await kit.bridge({
 *   from: { adapter, chain: 'Algorand' }, // TypeScript error!
 *   to: { adapter, chain: 'Base' },
 *   amount: '100'
 * })
 * ```
 *
 * @see {@link Blockchain} for the complete list of all known blockchains.
 * @see {@link BridgeChainIdentifier} for the type that accepts these values.
 */
exports.BridgeChain = void 0;
(function (BridgeChain) {
    // Mainnet chains with CCTPv2 support
    BridgeChain["Arbitrum"] = "Arbitrum";
    BridgeChain["Avalanche"] = "Avalanche";
    BridgeChain["Base"] = "Base";
    BridgeChain["Codex"] = "Codex";
    BridgeChain["Ethereum"] = "Ethereum";
    BridgeChain["HyperEVM"] = "HyperEVM";
    BridgeChain["Ink"] = "Ink";
    BridgeChain["Linea"] = "Linea";
    BridgeChain["Monad"] = "Monad";
    BridgeChain["Optimism"] = "Optimism";
    BridgeChain["Plume"] = "Plume";
    BridgeChain["Polygon"] = "Polygon";
    BridgeChain["Sei"] = "Sei";
    BridgeChain["Solana"] = "Solana";
    BridgeChain["Sonic"] = "Sonic";
    BridgeChain["Unichain"] = "Unichain";
    BridgeChain["World_Chain"] = "World_Chain";
    BridgeChain["XDC"] = "XDC";
    // Testnet chains with CCTPv2 support
    BridgeChain["Arc_Testnet"] = "Arc_Testnet";
    BridgeChain["Arbitrum_Sepolia"] = "Arbitrum_Sepolia";
    BridgeChain["Avalanche_Fuji"] = "Avalanche_Fuji";
    BridgeChain["Base_Sepolia"] = "Base_Sepolia";
    BridgeChain["Codex_Testnet"] = "Codex_Testnet";
    BridgeChain["Ethereum_Sepolia"] = "Ethereum_Sepolia";
    BridgeChain["HyperEVM_Testnet"] = "HyperEVM_Testnet";
    BridgeChain["Ink_Testnet"] = "Ink_Testnet";
    BridgeChain["Linea_Sepolia"] = "Linea_Sepolia";
    BridgeChain["Monad_Testnet"] = "Monad_Testnet";
    BridgeChain["Optimism_Sepolia"] = "Optimism_Sepolia";
    BridgeChain["Plume_Testnet"] = "Plume_Testnet";
    BridgeChain["Polygon_Amoy_Testnet"] = "Polygon_Amoy_Testnet";
    BridgeChain["Sei_Testnet"] = "Sei_Testnet";
    BridgeChain["Solana_Devnet"] = "Solana_Devnet";
    BridgeChain["Sonic_Testnet"] = "Sonic_Testnet";
    BridgeChain["Unichain_Sepolia"] = "Unichain_Sepolia";
    BridgeChain["World_Chain_Sepolia"] = "World_Chain_Sepolia";
    BridgeChain["XDC_Apothem"] = "XDC_Apothem";
})(exports.BridgeChain || (exports.BridgeChain = {}));

/**
 * Helper function to define a chain with proper TypeScript typing.
 *
 * This utility function works with TypeScript's `as const` assertion to create
 * strongly-typed, immutable chain definition objects. It preserves literal types
 * from the input and ensures the resulting object maintains all type information.
 *
 * When used with `as const`, it allows TypeScript to infer the most specific
 * possible types for all properties, including string literals and numeric literals,
 * rather than widening them to general types like string or number.
 * @typeParam T - The specific chain definition type (must extend ChainDefinition)
 * @param chain - The chain definition object, typically with an `as const` assertion
 * @returns The same chain definition with preserved literal types
 * @example
 * ```typescript
 * // Define an EVM chain with literal types preserved
 * const Ethereum = defineChain({
 *   type: 'evm',
 *   chain: Blockchain.Ethereum,
 *   chainId: 1,
 *   name: 'Ethereum',
 *   nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
 *   isTestnet: false,
 *   usdcAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
 *   eurcAddress: null,
 *   cctp: {
 *     domain: 0,
 *     contracts: {
 *       TokenMessengerV1: '0xbd3fa81b58ba92a82136038b25adec7066af3155',
 *       MessageTransmitterV1: '0x0a992d191deec32afe36203ad87d7d289a738f81'
 *     }
 *   }
 * } as const);
 * ```
 */
function defineChain(chain) {
    return chain;
}

/**
 * Algorand Mainnet chain definition
 * @remarks
 * This represents the official production network for the Algorand blockchain.
 */
const Algorand = defineChain({
    type: 'algorand',
    chain: exports.Blockchain.Algorand,
    name: 'Algorand',
    title: 'Algorand Mainnet',
    nativeCurrency: {
        name: 'Algo',
        symbol: 'ALGO',
        decimals: 6,
    },
    isTestnet: false,
    explorerUrl: 'https://explorer.perawallet.app/tx/{hash}',
    rpcEndpoints: ['https://mainnet-api.algonode.cloud'],
    eurcAddress: null,
    usdcAddress: '31566704',
    cctp: null,
});

/**
 * Algorand Testnet chain definition
 * @remarks
 * This represents the official testnet for the Algorand blockchain.
 */
const AlgorandTestnet = defineChain({
    type: 'algorand',
    chain: exports.Blockchain.Algorand_Testnet,
    name: 'Algorand Testnet',
    title: 'Algorand Test Network',
    nativeCurrency: {
        name: 'Algo',
        symbol: 'ALGO',
        decimals: 6,
    },
    isTestnet: true,
    explorerUrl: 'https://testnet.explorer.perawallet.app/tx/{hash}',
    rpcEndpoints: ['https://testnet-api.algonode.cloud'],
    eurcAddress: null,
    usdcAddress: '10458941',
    cctp: null,
});

/**
 * Aptos Mainnet chain definition
 * @remarks
 * This represents the official production network for the Aptos blockchain.
 */
const Aptos = defineChain({
    type: 'aptos',
    chain: exports.Blockchain.Aptos,
    name: 'Aptos',
    title: 'Aptos Mainnet',
    nativeCurrency: {
        name: 'Aptos',
        symbol: 'APT',
        decimals: 8,
    },
    isTestnet: false,
    explorerUrl: 'https://explorer.aptoslabs.com/txn/{hash}?network=mainnet',
    rpcEndpoints: ['https://fullnode.mainnet.aptoslabs.com/v1'],
    eurcAddress: null,
    usdcAddress: '0xbae207659db88bea0cbead6da0ed00aac12edcdda169e591cd41c94180b46f3b',
    cctp: {
        domain: 9,
        contracts: {
            v1: {
                type: 'split',
                tokenMessenger: '0x9bce6734f7b63e835108e3bd8c36743d4709fe435f44791918801d0989640a9d',
                messageTransmitter: '0x177e17751820e4b4371873ca8c30279be63bdea63b88ed0f2239c2eea10f1772',
                confirmations: 1,
            },
        },
    },
});

/**
 * Aptos Testnet chain definition
 * @remarks
 * This represents the official test network for the Aptos blockchain.
 */
const AptosTestnet = defineChain({
    type: 'aptos',
    chain: exports.Blockchain.Aptos_Testnet,
    name: 'Aptos Testnet',
    title: 'Aptos Test Network',
    nativeCurrency: {
        name: 'Aptos',
        symbol: 'APT',
        decimals: 8,
    },
    isTestnet: true,
    explorerUrl: 'https://explorer.aptoslabs.com/txn/{hash}?network=testnet',
    rpcEndpoints: ['https://fullnode.testnet.aptoslabs.com/v1'],
    eurcAddress: null,
    usdcAddress: '0x69091fbab5f7d635ee7ac5098cf0c1efbe31d68fec0f2cd565e8d168daf52832',
    cctp: {
        domain: 9,
        contracts: {
            v1: {
                type: 'split',
                tokenMessenger: '0x5f9b937419dda90aa06c1836b7847f65bbbe3f1217567758dc2488be31a477b9',
                messageTransmitter: '0x081e86cebf457a0c6004f35bd648a2794698f52e0dde09a48619dcd3d4cc23d9',
                confirmations: 1,
            },
        },
    },
});

/**
 * The bridge contract address for EVM testnet networks.
 *
 * This contract handles USDC transfers on testnet environments across
 * EVM-compatible chains. Use this address when deploying or testing
 * cross-chain USDC transfers on test networks.
 */
const BRIDGE_CONTRACT_EVM_TESTNET = '0xC5567a5E3370d4DBfB0540025078e283e36A363d';
/**
 * The bridge contract address for EVM mainnet networks.
 *
 * This contract handles USDC transfers on mainnet environments across
 * EVM-compatible chains. Use this address for production cross-chain
 * USDC transfers on live networks.
 */
const BRIDGE_CONTRACT_EVM_MAINNET = '0xB3FA262d0fB521cc93bE83d87b322b8A23DAf3F0';

/**
 * Arc Testnet chain definition
 * @remarks
 * This represents the test network for the Arc blockchain,
 * Circle's EVM-compatible Layer-1 designed for stablecoin finance
 * and asset tokenization. Arc uses USDC as the native gas token and
 * features the Malachite Byzantine Fault Tolerant (BFT) consensus
 * engine for sub-second finality.
 */
const ArcTestnet = defineChain({
    type: 'evm',
    chain: exports.Blockchain.Arc_Testnet,
    name: 'Arc Testnet',
    title: 'ArcTestnet',
    nativeCurrency: {
        name: 'USDC',
        symbol: 'USDC',
        // Arc uses native USDC with 18 decimals for gas payments (EVM standard).
        // Note: The ERC-20 USDC contract at usdcAddress uses 6 decimals.
        // See: https://docs.arc.network/arc/references/contract-addresses
        decimals: 18,
    },
    chainId: 5042002,
    isTestnet: true,
    explorerUrl: 'https://testnet.arcscan.app/tx/{hash}',
    rpcEndpoints: ['https://rpc.testnet.arc.network/'],
    eurcAddress: '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a',
    usdcAddress: '0x3600000000000000000000000000000000000000',
    cctp: {
        domain: 26,
        contracts: {
            v2: {
                type: 'split',
                tokenMessenger: '0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA',
                messageTransmitter: '0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275',
                confirmations: 1,
                fastConfirmations: 1,
            },
        },
    },
    kitContracts: {
        bridge: BRIDGE_CONTRACT_EVM_TESTNET,
    },
});

/**
 * Arbitrum Mainnet chain definition
 * @remarks
 * This represents the official production network for the Arbitrum blockchain.
 */
const Arbitrum = defineChain({
    type: 'evm',
    chain: exports.Blockchain.Arbitrum,
    name: 'Arbitrum',
    title: 'Arbitrum Mainnet',
    nativeCurrency: {
        name: 'Ether',
        symbol: 'ETH',
        decimals: 18,
    },
    chainId: 42161,
    isTestnet: false,
    explorerUrl: 'https://arbiscan.io/tx/{hash}',
    rpcEndpoints: ['https://arb1.arbitrum.io/rpc'],
    eurcAddress: null,
    usdcAddress: '0xaf88d065e77c8cc2239327c5edb3a432268e5831',
    cctp: {
        domain: 3,
        contracts: {
            v1: {
                type: 'split',
                tokenMessenger: '0x19330d10D9Cc8751218eaf51E8885D058642E08A',
                messageTransmitter: '0xC30362313FBBA5cf9163F0bb16a0e01f01A896ca',
                confirmations: 65,
            },
            v2: {
                type: 'split',
                tokenMessenger: '0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d',
                messageTransmitter: '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
                confirmations: 65,
                fastConfirmations: 1,
            },
        },
    },
    kitContracts: {
        bridge: BRIDGE_CONTRACT_EVM_MAINNET,
    },
});

/**
 * Arbitrum Sepolia Testnet chain definition
 * @remarks
 * This represents the official test network for the Arbitrum blockchain on Sepolia.
 */
const ArbitrumSepolia = defineChain({
    type: 'evm',
    chain: exports.Blockchain.Arbitrum_Sepolia,
    name: 'Arbitrum Sepolia',
    title: 'Arbitrum Sepolia Testnet',
    nativeCurrency: {
        name: 'Sepolia Ether',
        symbol: 'ETH',
        decimals: 18,
    },
    chainId: 421614,
    isTestnet: true,
    explorerUrl: 'https://sepolia.arbiscan.io/tx/{hash}',
    rpcEndpoints: ['https://sepolia-rollup.arbitrum.io/rpc'],
    eurcAddress: null,
    usdcAddress: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',
    cctp: {
        domain: 3,
        contracts: {
            v1: {
                type: 'split',
                tokenMessenger: '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5',
                messageTransmitter: '0xaCF1ceeF35caAc005e15888dDb8A3515C41B4872',
                confirmations: 65,
            },
            v2: {
                type: 'split',
                tokenMessenger: '0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA',
                messageTransmitter: '0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275',
                confirmations: 65,
                fastConfirmations: 1,
            },
        },
    },
    kitContracts: {
        bridge: BRIDGE_CONTRACT_EVM_TESTNET,
    },
});

/**
 * Avalanche Mainnet chain definition
 * @remarks
 * This represents the official production network for the Avalanche blockchain.
 */
const Avalanche = defineChain({
    type: 'evm',
    chain: exports.Blockchain.Avalanche,
    name: 'Avalanche',
    title: 'Avalanche Mainnet',
    nativeCurrency: {
        name: 'Avalanche',
        symbol: 'AVAX',
        decimals: 18,
    },
    chainId: 43114,
    isTestnet: false,
    explorerUrl: 'https://subnets.avax.network/c-chain/tx/{hash}',
    rpcEndpoints: ['https://api.avax.network/ext/bc/C/rpc'],
    eurcAddress: '0xc891eb4cbdeff6e073e859e987815ed1505c2acd',
    usdcAddress: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
    cctp: {
        domain: 1,
        contracts: {
            v1: {
                type: 'split',
                tokenMessenger: '0x6b25532e1060ce10cc3b0a99e5683b91bfde6982',
                messageTransmitter: '0x8186359af5f57fbb40c6b14a588d2a59c0c29880',
                confirmations: 1,
            },
            v2: {
                type: 'split',
                tokenMessenger: '0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d',
                messageTransmitter: '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
                confirmations: 1,
                fastConfirmations: 1,
            },
        },
    },
    kitContracts: {
        bridge: BRIDGE_CONTRACT_EVM_MAINNET,
    },
});

/**
 * Avalanche Fuji Testnet chain definition
 * @remarks
 * This represents the official test network for the Avalanche blockchain.
 */
const AvalancheFuji = defineChain({
    type: 'evm',
    chain: exports.Blockchain.Avalanche_Fuji,
    name: 'Avalanche Fuji',
    title: 'Avalanche Fuji Testnet',
    nativeCurrency: {
        name: 'Avalanche',
        symbol: 'AVAX',
        decimals: 18,
    },
    chainId: 43113,
    isTestnet: true,
    explorerUrl: 'https://subnets-test.avax.network/c-chain/tx/{hash}',
    eurcAddress: '0x5e44db7996c682e92a960b65ac713a54ad815c6b',
    usdcAddress: '0x5425890298aed601595a70ab815c96711a31bc65',
    cctp: {
        domain: 1,
        contracts: {
            v1: {
                type: 'split',
                tokenMessenger: '0xeb08f243e5d3fcff26a9e38ae5520a669f4019d0',
                messageTransmitter: '0xa9fb1b3009dcb79e2fe346c16a604b8fa8ae0a79',
                confirmations: 1,
            },
            v2: {
                type: 'split',
                tokenMessenger: '0x8fe6b999dc680ccfdd5bf7eb0974218be2542daa',
                messageTransmitter: '0xe737e5cebeeba77efe34d4aa090756590b1ce275',
                confirmations: 1,
                fastConfirmations: 1,
            },
        },
    },
    rpcEndpoints: ['https://api.avax-test.network/ext/bc/C/rpc'],
    kitContracts: {
        bridge: BRIDGE_CONTRACT_EVM_TESTNET,
    },
});

/**
 * Base chain definition
 * @remarks
 * This represents the official production network for the Base blockchain.
 */
const Base = defineChain({
    type: 'evm',
    chain: exports.Blockchain.Base,
    name: 'Base',
    title: 'Base Mainnet',
    nativeCurrency: {
        name: 'Ether',
        symbol: 'ETH',
        decimals: 18,
    },
    chainId: 8453,
    isTestnet: false,
    explorerUrl: 'https://basescan.org/tx/{hash}',
    rpcEndpoints: ['https://mainnet.base.org', 'https://base.publicnode.com'],
    eurcAddress: '0x60a3e35cc302bfa44cb288bc5a4f316fdb1adb42',
    usdcAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    cctp: {
        domain: 6,
        contracts: {
            v1: {
                type: 'split',
                tokenMessenger: '0x1682Ae6375C4E4A97e4B583BC394c861A46D8962',
                messageTransmitter: '0xAD09780d193884d503182aD4588450C416D6F9D4',
                confirmations: 65,
            },
            v2: {
                type: 'split',
                tokenMessenger: '0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d',
                messageTransmitter: '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
                confirmations: 65,
                fastConfirmations: 1,
            },
        },
    },
    kitContracts: {
        bridge: BRIDGE_CONTRACT_EVM_MAINNET,
    },
});

/**
 * Base Sepolia Testnet chain definition
 * @remarks
 * This represents the official test network for the Base blockchain on Sepolia.
 */
const BaseSepolia = defineChain({
    type: 'evm',
    chain: exports.Blockchain.Base_Sepolia,
    name: 'Base Sepolia',
    title: 'Base Sepolia Testnet',
    nativeCurrency: {
        name: 'Sepolia Ether',
        symbol: 'ETH',
        decimals: 18,
    },
    chainId: 84532,
    isTestnet: true,
    explorerUrl: 'https://sepolia.basescan.org/tx/{hash}',
    rpcEndpoints: ['https://sepolia.base.org'],
    eurcAddress: '0x808456652fdb597867f38412077A9182bf77359F',
    usdcAddress: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    cctp: {
        domain: 6,
        contracts: {
            v1: {
                type: 'split',
                tokenMessenger: '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5',
                messageTransmitter: '0x7865fAfC2db2093669d92c0F33AeEF291086BEFD',
                confirmations: 65,
            },
            v2: {
                type: 'split',
                tokenMessenger: '0x8fe6b999dc680ccfdd5bf7eb0974218be2542daa',
                messageTransmitter: '0xe737e5cebeeba77efe34d4aa090756590b1ce275',
                confirmations: 65,
                fastConfirmations: 1,
            },
        },
    },
    kitContracts: {
        bridge: BRIDGE_CONTRACT_EVM_TESTNET,
    },
});

/**
 * Celo Mainnet chain definition
 * @remarks
 * This represents the official production network for the Celo blockchain.
 */
const Celo = defineChain({
    type: 'evm',
    chain: exports.Blockchain.Celo,
    name: 'Celo',
    title: 'Celo Mainnet',
    nativeCurrency: {
        name: 'Celo',
        symbol: 'CELO',
        decimals: 18,
    },
    chainId: 42220,
    isTestnet: false,
    explorerUrl: 'https://celoscan.io/tx/{hash}',
    rpcEndpoints: ['https://forno.celo.org'],
    eurcAddress: null,
    usdcAddress: '0xcebA9300f2b948710d2653dD7B07f33A8B32118C',
    cctp: null,
});

/**
 * Celo Alfajores Testnet chain definition
 * @remarks
 * This represents the official test network for the Celo blockchain.
 */
const CeloAlfajoresTestnet = defineChain({
    type: 'evm',
    chain: exports.Blockchain.Celo_Alfajores_Testnet,
    name: 'Celo Alfajores',
    title: 'Celo Alfajores Testnet',
    nativeCurrency: {
        name: 'Celo',
        symbol: 'CELO',
        decimals: 18,
    },
    chainId: 44787,
    isTestnet: true,
    explorerUrl: 'https://alfajores.celoscan.io/tx/{hash}',
    rpcEndpoints: ['https://alfajores-forno.celo-testnet.org'],
    eurcAddress: null,
    usdcAddress: '0x2F25deB3848C207fc8E0c34035B3Ba7fC157602B',
    cctp: null,
});

/**
 * Codex Mainnet chain definition
 * @remarks
 * This represents the main network for the Codex blockchain.
 */
const Codex = defineChain({
    type: 'evm',
    chain: exports.Blockchain.Codex,
    name: 'Codex Mainnet',
    title: 'Codex Mainnet',
    nativeCurrency: {
        name: 'ETH',
        symbol: 'ETH',
        decimals: 18,
    },
    chainId: 81224,
    isTestnet: false,
    explorerUrl: 'https://explorer.codex.xyz/tx/{hash}',
    rpcEndpoints: ['https://rpc.codex.xyz'],
    eurcAddress: null,
    usdcAddress: '0xd996633a415985DBd7D6D12f4A4343E31f5037cf',
    cctp: {
        domain: 12,
        contracts: {
            v2: {
                type: 'split',
                tokenMessenger: '0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d',
                messageTransmitter: '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
                confirmations: 65,
                fastConfirmations: 1,
            },
        },
    },
    kitContracts: {
        bridge: BRIDGE_CONTRACT_EVM_MAINNET,
    },
});

/**
 * Codex Testnet chain definition
 * @remarks
 * This represents the test network for the Codex blockchain.
 */
const CodexTestnet = defineChain({
    type: 'evm',
    chain: exports.Blockchain.Codex_Testnet,
    name: 'Codex Testnet',
    title: 'Codex Testnet',
    nativeCurrency: {
        name: 'ETH',
        symbol: 'ETH',
        decimals: 18,
    },
    chainId: 812242,
    isTestnet: true,
    explorerUrl: 'https://explorer.codex-stg.xyz/tx/{hash}',
    rpcEndpoints: ['https://rpc.codex-stg.xyz'],
    eurcAddress: null,
    usdcAddress: '0x6d7f141b6819C2c9CC2f818e6ad549E7Ca090F8f',
    cctp: {
        domain: 12,
        contracts: {
            v2: {
                type: 'split',
                tokenMessenger: '0x8fe6b999dc680ccfdd5bf7eb0974218be2542daa',
                messageTransmitter: '0xe737e5cebeeba77efe34d4aa090756590b1ce275',
                confirmations: 65,
                fastConfirmations: 1,
            },
        },
    },
    kitContracts: {
        bridge: BRIDGE_CONTRACT_EVM_TESTNET,
    },
});

/**
 * Ethereum Mainnet chain definition
 * @remarks
 * This represents the official production network for the Ethereum blockchain.
 */
const Ethereum = defineChain({
    type: 'evm',
    chain: exports.Blockchain.Ethereum,
    name: 'Ethereum',
    title: 'Ethereum Mainnet',
    nativeCurrency: {
        name: 'Ether',
        symbol: 'ETH',
        decimals: 18,
    },
    chainId: 1,
    isTestnet: false,
    explorerUrl: 'https://etherscan.io/tx/{hash}',
    rpcEndpoints: ['https://eth.merkle.io', 'https://ethereum.publicnode.com'],
    eurcAddress: '0x1aBaEA1f7C830bD89Acc67eC4af516284b1bC33c',
    usdcAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    cctp: {
        domain: 0,
        contracts: {
            v1: {
                type: 'split',
                tokenMessenger: '0xbd3fa81b58ba92a82136038b25adec7066af3155',
                messageTransmitter: '0x0a992d191deec32afe36203ad87d7d289a738f81',
                confirmations: 65,
            },
            v2: {
                type: 'split',
                tokenMessenger: '0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d',
                messageTransmitter: '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
                confirmations: 65,
                fastConfirmations: 2,
            },
        },
    },
    kitContracts: {
        bridge: BRIDGE_CONTRACT_EVM_MAINNET,
    },
});

/**
 * Ethereum Sepolia Testnet chain definition
 * @remarks
 * This represents the official test network for the Ethereum blockchain on Sepolia.
 */
const EthereumSepolia = defineChain({
    type: 'evm',
    chain: exports.Blockchain.Ethereum_Sepolia,
    name: 'Ethereum Sepolia',
    title: 'Ethereum Sepolia Testnet',
    nativeCurrency: {
        name: 'Sepolia Ether',
        symbol: 'ETH',
        decimals: 18,
    },
    chainId: 11155111,
    isTestnet: true,
    explorerUrl: 'https://sepolia.etherscan.io/tx/{hash}',
    rpcEndpoints: ['https://sepolia.drpc.org'],
    eurcAddress: '0x08210F9170F89Ab7658F0B5E3fF39b0E03C594D4',
    usdcAddress: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
    cctp: {
        domain: 0,
        contracts: {
            v1: {
                type: 'split',
                tokenMessenger: '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5',
                messageTransmitter: '0x7865fAfC2db2093669d92c0F33AeEF291086BEFD',
                confirmations: 65,
            },
            v2: {
                type: 'split',
                tokenMessenger: '0x8fe6b999dc680ccfdd5bf7eb0974218be2542daa',
                messageTransmitter: '0xe737e5cebeeba77efe34d4aa090756590b1ce275',
                confirmations: 65,
                fastConfirmations: 2,
            },
        },
    },
    kitContracts: {
        bridge: BRIDGE_CONTRACT_EVM_TESTNET,
    },
});

/**
 * Hedera Mainnet chain definition
 * @remarks
 * This represents the official production network for the Hedera blockchain.
 */
const Hedera = defineChain({
    type: 'hedera',
    chain: exports.Blockchain.Hedera,
    name: 'Hedera',
    title: 'Hedera Mainnet',
    nativeCurrency: {
        name: 'HBAR',
        symbol: 'HBAR',
        decimals: 18,
    },
    isTestnet: false,
    explorerUrl: 'https://hashscan.io/mainnet/transaction/{hash}', // Note: Hedera uses `transaction_id`, not hash. Format is typically `0.0.X-YYYY...`.
    rpcEndpoints: ['https://mainnet.hashio.io/api'],
    eurcAddress: null,
    usdcAddress: '0.0.456858',
    cctp: null,
});

/**
 * Hedera Testnet chain definition
 * @remarks
 * This represents the official test network for the Hedera blockchain.
 */
const HederaTestnet = defineChain({
    type: 'hedera',
    chain: exports.Blockchain.Hedera_Testnet,
    name: 'Hedera Testnet',
    title: 'Hedera Test Network',
    nativeCurrency: {
        name: 'HBAR',
        symbol: 'HBAR',
        decimals: 18,
    },
    isTestnet: true,
    explorerUrl: 'https://hashscan.io/testnet/transaction/{hash}', // Note: Hedera uses `transaction_id`, not hash. Format is typically `0.0.X-YYYY...`.
    rpcEndpoints: ['https://testnet.hashio.io/api'],
    eurcAddress: null,
    usdcAddress: '0.0.429274',
    cctp: null,
});

/**
 * HyperEVM Mainnet chain definition
 * @remarks
 * This represents the official production network for the HyperEVM blockchain.
 * HyperEVM is a Layer 1 blockchain specialized for DeFi and trading applications
 * with native orderbook and matching engine.
 */
const HyperEVM = defineChain({
    type: 'evm',
    chain: exports.Blockchain.HyperEVM,
    name: 'HyperEVM',
    title: 'HyperEVM Mainnet',
    nativeCurrency: {
        name: 'Hype',
        symbol: 'HYPE',
        decimals: 18,
    },
    chainId: 999,
    isTestnet: false,
    explorerUrl: 'https://hyperevmscan.io/tx/{hash}',
    rpcEndpoints: ['https://rpc.hyperliquid.xyz/evm'],
    eurcAddress: null,
    usdcAddress: '0xb88339CB7199b77E23DB6E890353E22632Ba630f',
    cctp: {
        domain: 19,
        contracts: {
            v2: {
                type: 'split',
                tokenMessenger: '0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d',
                messageTransmitter: '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
                confirmations: 1,
                fastConfirmations: 1,
            },
        },
    },
    kitContracts: {
        bridge: BRIDGE_CONTRACT_EVM_MAINNET,
    },
});

/**
 * HyperEVM Testnet chain definition
 * @remarks
 * This represents the official testnet for the HyperEVM blockchain.
 * Used for development and testing purposes before deploying to mainnet.
 */
const HyperEVMTestnet = defineChain({
    type: 'evm',
    chain: exports.Blockchain.HyperEVM_Testnet,
    name: 'HyperEVM Testnet',
    title: 'HyperEVM Test Network',
    nativeCurrency: {
        name: 'Hype',
        symbol: 'HYPE',
        decimals: 18,
    },
    chainId: 998,
    isTestnet: true,
    explorerUrl: 'https://testnet.hyperliquid.xyz/explorer/tx/{hash}',
    rpcEndpoints: ['https://rpc.hyperliquid-testnet.xyz/evm'],
    eurcAddress: null,
    usdcAddress: '0x2B3370eE501B4a559b57D449569354196457D8Ab',
    cctp: {
        domain: 19,
        contracts: {
            v2: {
                type: 'split',
                tokenMessenger: '0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA',
                messageTransmitter: '0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275',
                confirmations: 1,
                fastConfirmations: 1,
            },
        },
    },
    kitContracts: {
        bridge: BRIDGE_CONTRACT_EVM_TESTNET,
    },
});

/**
 * Ink Mainnet chain definition
 * @remarks
 * This represents the official production network for the Ink blockchain.
 * Ink is a Layer 1 blockchain specialized for DeFi and trading applications
 * with native orderbook and matching engine.
 */
const Ink = defineChain({
    type: 'evm',
    chain: exports.Blockchain.Ink,
    name: 'Ink',
    title: 'Ink Mainnet',
    nativeCurrency: {
        name: 'Ether',
        symbol: 'ETH',
        decimals: 18,
    },
    chainId: 57073,
    isTestnet: false,
    explorerUrl: 'https://explorer.inkonchain.com/tx/{hash}',
    rpcEndpoints: [
        'https://rpc-gel.inkonchain.com',
        'https://rpc-qnd.inkonchain.com',
    ],
    eurcAddress: null,
    usdcAddress: '0x2D270e6886d130D724215A266106e6832161EAEd',
    cctp: {
        domain: 21,
        contracts: {
            v2: {
                type: 'split',
                tokenMessenger: '0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d',
                messageTransmitter: '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
                confirmations: 65,
                fastConfirmations: 1,
            },
        },
    },
    kitContracts: {
        bridge: BRIDGE_CONTRACT_EVM_MAINNET,
    },
});

/**
 * Ink Testnet chain definition
 * @remarks
 * This represents the official testnet for the Ink blockchain.
 * Used for development and testing purposes before deploying to mainnet.
 */
const InkTestnet = defineChain({
    type: 'evm',
    chain: exports.Blockchain.Ink_Testnet,
    name: 'Ink Sepolia',
    title: 'Ink Sepolia Testnet',
    nativeCurrency: {
        name: 'Sepolia Ether',
        symbol: 'ETH',
        decimals: 18,
    },
    chainId: 763373,
    isTestnet: true,
    explorerUrl: 'https://explorer-sepolia.inkonchain.com/tx/{hash}',
    rpcEndpoints: [
        'https://rpc-gel-sepolia.inkonchain.com',
        'https://rpc-qnd-sepolia.inkonchain.com',
    ],
    eurcAddress: null,
    usdcAddress: '0xFabab97dCE620294D2B0b0e46C68964e326300Ac',
    cctp: {
        domain: 21,
        contracts: {
            v2: {
                type: 'split',
                tokenMessenger: '0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA',
                messageTransmitter: '0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275',
                confirmations: 65,
                fastConfirmations: 1,
            },
        },
    },
    kitContracts: {
        bridge: BRIDGE_CONTRACT_EVM_TESTNET,
    },
});

/**
 * Linea Mainnet chain definition
 * @remarks
 * This represents the official production network for the Linea blockchain.
 */
const Linea = defineChain({
    type: 'evm',
    chain: exports.Blockchain.Linea,
    name: 'Linea',
    title: 'Linea Mainnet',
    nativeCurrency: {
        name: 'Ether',
        symbol: 'ETH',
        decimals: 18,
    },
    chainId: 59144,
    isTestnet: false,
    explorerUrl: 'https://lineascan.build/tx/{hash}',
    rpcEndpoints: ['https://rpc.linea.build'],
    eurcAddress: null,
    usdcAddress: '0x176211869ca2b568f2a7d4ee941e073a821ee1ff',
    cctp: {
        domain: 11,
        contracts: {
            v2: {
                type: 'split',
                tokenMessenger: '0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d',
                messageTransmitter: '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
                confirmations: 1,
                fastConfirmations: 1,
            },
        },
    },
    kitContracts: {
        bridge: BRIDGE_CONTRACT_EVM_MAINNET,
    },
});

/**
 * Linea Sepolia Testnet chain definition
 * @remarks
 * This represents the official test network for the Linea blockchain on Sepolia.
 */
const LineaSepolia = defineChain({
    type: 'evm',
    chain: exports.Blockchain.Linea_Sepolia,
    name: 'Linea Sepolia',
    title: 'Linea Sepolia Testnet',
    nativeCurrency: {
        name: 'Sepolia Ether',
        symbol: 'ETH',
        decimals: 18,
    },
    chainId: 59141,
    isTestnet: true,
    explorerUrl: 'https://sepolia.lineascan.build/tx/{hash}',
    rpcEndpoints: ['https://rpc.sepolia.linea.build'],
    eurcAddress: null,
    usdcAddress: '0xfece4462d57bd51a6a552365a011b95f0e16d9b7',
    cctp: {
        domain: 11,
        contracts: {
            v2: {
                type: 'split',
                tokenMessenger: '0x8fe6b999dc680ccfdd5bf7eb0974218be2542daa',
                messageTransmitter: '0xe737e5cebeeba77efe34d4aa090756590b1ce275',
                confirmations: 1,
                fastConfirmations: 1,
            },
        },
    },
    kitContracts: {
        bridge: BRIDGE_CONTRACT_EVM_TESTNET,
    },
});

/**
 * Monad Mainnet chain definition
 * @remarks
 * This represents the official production network for the Monad blockchain.
 * Monad is a high-performance EVM-compatible Layer-1 blockchain featuring
 * over 10,000 TPS, sub-second finality, and near-zero gas fees.
 */
const Monad = defineChain({
    type: 'evm',
    chain: exports.Blockchain.Monad,
    name: 'Monad',
    title: 'Monad Mainnet',
    nativeCurrency: {
        name: 'Monad',
        symbol: 'MON',
        decimals: 18,
    },
    chainId: 143,
    isTestnet: false,
    explorerUrl: 'https://monadscan.com/tx/{hash}',
    rpcEndpoints: ['https://rpc.monad.xyz'],
    eurcAddress: null,
    usdcAddress: '0x754704Bc059F8C67012fEd69BC8A327a5aafb603',
    cctp: {
        domain: 15,
        contracts: {
            v2: {
                type: 'split',
                tokenMessenger: '0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d',
                messageTransmitter: '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
                confirmations: 1,
                fastConfirmations: 1,
            },
        },
    },
    kitContracts: {
        bridge: BRIDGE_CONTRACT_EVM_MAINNET,
    },
});

/**
 * Monad Testnet chain definition
 * @remarks
 * This represents the official test network for the Monad blockchain.
 * Monad is a high-performance EVM-compatible Layer-1 blockchain featuring
 * over 10,000 TPS, sub-second finality, and near-zero gas fees.
 */
const MonadTestnet = defineChain({
    type: 'evm',
    chain: exports.Blockchain.Monad_Testnet,
    name: 'Monad Testnet',
    title: 'Monad Testnet',
    nativeCurrency: {
        name: 'Monad',
        symbol: 'MON',
        decimals: 18,
    },
    chainId: 10143,
    isTestnet: true,
    explorerUrl: 'https://testnet.monadscan.com/tx/{hash}',
    rpcEndpoints: ['https://testnet-rpc.monad.xyz'],
    eurcAddress: null,
    usdcAddress: '0x534b2f3A21130d7a60830c2Df862319e593943A3',
    cctp: {
        domain: 15,
        contracts: {
            v2: {
                type: 'split',
                tokenMessenger: '0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA',
                messageTransmitter: '0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275',
                confirmations: 1,
                fastConfirmations: 1,
            },
        },
    },
    kitContracts: {
        bridge: BRIDGE_CONTRACT_EVM_TESTNET,
    },
});

/**
 * NEAR Protocol Mainnet chain definition
 * @remarks
 * This represents the official production network for the NEAR Protocol blockchain.
 */
const NEAR = defineChain({
    type: 'near',
    chain: exports.Blockchain.NEAR,
    name: 'NEAR Protocol',
    title: 'NEAR Mainnet',
    nativeCurrency: {
        name: 'NEAR',
        symbol: 'NEAR',
        decimals: 24,
    },
    isTestnet: false,
    explorerUrl: 'https://nearblocks.io/txns/{hash}',
    rpcEndpoints: ['https://eth-rpc.mainnet.near.org'],
    eurcAddress: null,
    usdcAddress: '17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1',
    cctp: null,
});

/**
 * NEAR Testnet chain definition
 * @remarks
 * This represents the official test network for the NEAR Protocol blockchain.
 */
const NEARTestnet = defineChain({
    type: 'near',
    chain: exports.Blockchain.NEAR_Testnet,
    name: 'NEAR Protocol Testnet',
    title: 'NEAR Test Network',
    nativeCurrency: {
        name: 'NEAR',
        symbol: 'NEAR',
        decimals: 24,
    },
    isTestnet: true,
    explorerUrl: 'https://testnet.nearblocks.io/txns/{hash}',
    rpcEndpoints: ['https://eth-rpc.testnet.near.org'],
    eurcAddress: null,
    usdcAddress: '3e2210e1184b45b64c8a434c0a7e7b23cc04ea7eb7a6c3c32520d03d4afcb8af',
    cctp: null,
});

/**
 * Noble Mainnet chain definition
 * @remarks
 * This represents the official production network for the Noble blockchain.
 */
const Noble = defineChain({
    type: 'noble',
    chain: exports.Blockchain.Noble,
    name: 'Noble',
    title: 'Noble Mainnet',
    nativeCurrency: {
        name: 'Noble USDC',
        symbol: 'USDC',
        decimals: 6,
    },
    isTestnet: false,
    explorerUrl: 'https://www.mintscan.io/noble/tx/{hash}',
    rpcEndpoints: ['https://noble-rpc.polkachu.com'],
    eurcAddress: null,
    usdcAddress: 'uusdc',
    cctp: {
        domain: 4,
        contracts: {
            v1: {
                type: 'merged',
                contract: 'noble12l2w4ugfz4m6dd73yysz477jszqnfughxvkss5',
                confirmations: 1,
            },
        },
    },
});

/**
 * Noble Testnet chain definition
 * @remarks
 * This represents the official test network for the Noble blockchain.
 */
const NobleTestnet = defineChain({
    type: 'noble',
    chain: exports.Blockchain.Noble_Testnet,
    name: 'Noble Testnet',
    title: 'Noble Test Network',
    nativeCurrency: {
        name: 'Noble USDC',
        symbol: 'USDC',
        decimals: 6,
    },
    isTestnet: true,
    explorerUrl: 'https://www.mintscan.io/noble-testnet/tx/{hash}',
    rpcEndpoints: ['https://noble-testnet-rpc.polkachu.com'],
    eurcAddress: null,
    usdcAddress: 'uusdc',
    cctp: {
        domain: 4,
        contracts: {
            v1: {
                type: 'merged',
                contract: 'noble12l2w4ugfz4m6dd73yysz477jszqnfughxvkss5',
                confirmations: 1,
            },
        },
    },
});

/**
 * Optimism Mainnet chain definition
 * @remarks
 * This represents the official production network for the Optimism blockchain.
 */
const Optimism = defineChain({
    type: 'evm',
    chain: exports.Blockchain.Optimism,
    name: 'Optimism',
    title: 'Optimism Mainnet',
    nativeCurrency: {
        name: 'Ether',
        symbol: 'ETH',
        decimals: 18,
    },
    chainId: 10,
    isTestnet: false,
    explorerUrl: 'https://optimistic.etherscan.io/tx/{hash}',
    rpcEndpoints: ['https://mainnet.optimism.io'],
    eurcAddress: null,
    usdcAddress: '0x0b2c639c533813f4aa9d7837caf62653d097ff85',
    cctp: {
        domain: 2,
        contracts: {
            v1: {
                type: 'split',
                tokenMessenger: '0x2B4069517957735bE00ceE0fadAE88a26365528f',
                messageTransmitter: '0x0a992d191deec32afe36203ad87d7d289a738f81',
                confirmations: 65,
            },
            v2: {
                type: 'split',
                tokenMessenger: '0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d',
                messageTransmitter: '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
                confirmations: 65,
                fastConfirmations: 1,
            },
        },
    },
    kitContracts: {
        bridge: BRIDGE_CONTRACT_EVM_MAINNET,
    },
});

/**
 * Optimism Sepolia Testnet chain definition
 * @remarks
 * This represents the official test network for the Optimism blockchain on Sepolia.
 */
const OptimismSepolia = defineChain({
    type: 'evm',
    chain: exports.Blockchain.Optimism_Sepolia,
    name: 'Optimism Sepolia',
    title: 'Optimism Sepolia Testnet',
    nativeCurrency: {
        name: 'Sepolia Ether',
        symbol: 'ETH',
        decimals: 18,
    },
    chainId: 11155420,
    isTestnet: true,
    explorerUrl: 'https://sepolia-optimistic.etherscan.io/tx/{hash}',
    rpcEndpoints: ['https://sepolia.optimism.io'],
    eurcAddress: null,
    usdcAddress: '0x5fd84259d66Cd46123540766Be93DFE6D43130D7',
    cctp: {
        domain: 2,
        contracts: {
            v1: {
                type: 'split',
                tokenMessenger: '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5',
                messageTransmitter: '0x7865fAfC2db2093669d92c0F33AeEF291086BEFD',
                confirmations: 65,
            },
            v2: {
                type: 'split',
                tokenMessenger: '0x8fe6b999dc680ccfdd5bf7eb0974218be2542daa',
                messageTransmitter: '0xe737e5cebeeba77efe34d4aa090756590b1ce275',
                confirmations: 65,
                fastConfirmations: 1,
            },
        },
    },
    kitContracts: {
        bridge: BRIDGE_CONTRACT_EVM_TESTNET,
    },
});

/**
 * Plume Mainnet chain definition
 * @remarks
 * This represents the official production network for the Plume blockchain.
 * Plume is a Layer 1 blockchain specialized for DeFi and trading applications
 * with native orderbook and matching engine.
 */
const Plume = defineChain({
    type: 'evm',
    chain: exports.Blockchain.Plume,
    name: 'Plume',
    title: 'Plume Mainnet',
    nativeCurrency: {
        name: 'Plume',
        symbol: 'PLUME',
        decimals: 18,
    },
    chainId: 98866,
    isTestnet: false,
    explorerUrl: 'https://explorer.plume.org/tx/{hash}',
    rpcEndpoints: ['https://rpc.plume.org'],
    eurcAddress: null,
    usdcAddress: '0x222365EF19F7947e5484218551B56bb3965Aa7aF',
    cctp: {
        domain: 22,
        contracts: {
            v2: {
                type: 'split',
                tokenMessenger: '0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d',
                messageTransmitter: '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
                confirmations: 65,
                fastConfirmations: 1,
            },
        },
    },
    kitContracts: {
        bridge: BRIDGE_CONTRACT_EVM_MAINNET,
    },
});

/**
 * Plume Testnet chain definition
 * @remarks
 * This represents the official testnet for the Plume blockchain.
 * Used for development and testing purposes before deploying to mainnet.
 */
const PlumeTestnet = defineChain({
    type: 'evm',
    chain: exports.Blockchain.Plume_Testnet,
    name: 'Plume Testnet',
    title: 'Plume Test Network',
    nativeCurrency: {
        name: 'Plume',
        symbol: 'PLUME',
        decimals: 18,
    },
    chainId: 98867,
    isTestnet: true,
    explorerUrl: 'https://testnet-explorer.plume.org/tx/{hash}',
    rpcEndpoints: ['https://testnet-rpc.plume.org'],
    eurcAddress: null,
    usdcAddress: '0xcB5f30e335672893c7eb944B374c196392C19D18',
    cctp: {
        domain: 22,
        contracts: {
            v2: {
                type: 'split',
                tokenMessenger: '0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA',
                messageTransmitter: '0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275',
                confirmations: 65,
                fastConfirmations: 1,
            },
        },
    },
    kitContracts: {
        bridge: BRIDGE_CONTRACT_EVM_TESTNET,
    },
});

/**
 * Polkadot Asset Hub chain definition
 * @remarks
 * This represents the official asset management parachain for the Polkadot blockchain.
 */
const PolkadotAssetHub = defineChain({
    type: 'polkadot',
    chain: exports.Blockchain.Polkadot_Asset_Hub,
    name: 'Polkadot Asset Hub',
    title: 'Polkadot Asset Hub',
    nativeCurrency: {
        name: 'Polkadot',
        symbol: 'DOT',
        decimals: 10,
    },
    isTestnet: false,
    explorerUrl: 'https://polkadot.subscan.io/extrinsic/{hash}',
    rpcEndpoints: ['https://asset-hub-polkadot-rpc.n.dwellir.com'],
    eurcAddress: null,
    usdcAddress: '1337',
    cctp: null,
});

/**
 * Polkadot Westmint chain definition
 * @remarks
 * This represents an asset management parachain in the Polkadot ecosystem.
 */
const PolkadotWestmint = defineChain({
    type: 'polkadot',
    chain: exports.Blockchain.Polkadot_Westmint,
    name: 'Polkadot Westmint',
    title: 'Polkadot Westmint',
    nativeCurrency: {
        name: 'Polkadot',
        symbol: 'DOT',
        decimals: 10,
    },
    isTestnet: false,
    explorerUrl: 'https://assethub-polkadot.subscan.io/extrinsic/{hash}',
    rpcEndpoints: ['https://westmint-rpc.polkadot.io'],
    eurcAddress: null,
    usdcAddress: 'Asset ID 31337',
    cctp: null,
});

/**
 * Polygon Mainnet chain definition
 * @remarks
 * This represents the official production network for the Polygon blockchain.
 */
const Polygon = defineChain({
    type: 'evm',
    chain: exports.Blockchain.Polygon,
    name: 'Polygon',
    title: 'Polygon Mainnet',
    nativeCurrency: {
        name: 'POL',
        symbol: 'POL',
        decimals: 18,
    },
    chainId: 137,
    isTestnet: false,
    explorerUrl: 'https://polygonscan.com/tx/{hash}',
    rpcEndpoints: ['https://polygon-rpc.com', 'https://polygon.publicnode.com'],
    eurcAddress: null,
    usdcAddress: '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359',
    cctp: {
        domain: 7,
        contracts: {
            v1: {
                type: 'split',
                tokenMessenger: '0x9daF8c91AEFAE50b9c0E69629D3F6Ca40cA3B3FE',
                messageTransmitter: '0xF3be9355363857F3e001be68856A2f96b4C39Ba9',
                confirmations: 200,
            },
            v2: {
                type: 'split',
                tokenMessenger: '0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d',
                messageTransmitter: '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
                confirmations: 33,
                fastConfirmations: 13,
            },
        },
    },
    kitContracts: {
        bridge: BRIDGE_CONTRACT_EVM_MAINNET,
    },
});

/**
 * Polygon Amoy Testnet chain definition
 * @remarks
 * This represents the official test network for the Polygon blockchain.
 */
const PolygonAmoy = defineChain({
    type: 'evm',
    chain: exports.Blockchain.Polygon_Amoy_Testnet,
    name: 'Polygon Amoy',
    title: 'Polygon Amoy Testnet',
    nativeCurrency: {
        name: 'POL',
        symbol: 'POL',
        decimals: 18,
    },
    chainId: 80002,
    isTestnet: true,
    explorerUrl: 'https://amoy.polygonscan.com/tx/{hash}',
    rpcEndpoints: ['https://rpc-amoy.polygon.technology'],
    eurcAddress: null,
    usdcAddress: '0x41e94eb019c0762f9bfcf9fb1e58725bfb0e7582',
    cctp: {
        domain: 7,
        contracts: {
            v1: {
                type: 'split',
                tokenMessenger: '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5',
                messageTransmitter: '0x7865fAfC2db2093669d92c0F33AeEF291086BEFD',
                confirmations: 200,
            },
            v2: {
                type: 'split',
                tokenMessenger: '0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA',
                messageTransmitter: '0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275',
                confirmations: 33,
                fastConfirmations: 13,
            },
        },
    },
    kitContracts: {
        bridge: BRIDGE_CONTRACT_EVM_TESTNET,
    },
});

/**
 * Sei Mainnet chain definition
 * @remarks
 * This represents the official production network for the Sei blockchain.
 * Sei is a Layer 1 blockchain specialized for DeFi and trading applications
 * with native orderbook and matching engine.
 */
const Sei = defineChain({
    type: 'evm',
    chain: exports.Blockchain.Sei,
    name: 'Sei',
    title: 'Sei Mainnet',
    nativeCurrency: {
        name: 'Sei',
        symbol: 'SEI',
        decimals: 18,
    },
    chainId: 1329,
    isTestnet: false,
    explorerUrl: 'https://seitrace.com/tx/{hash}?chain=pacific-1',
    rpcEndpoints: ['https://evm-rpc.sei-apis.com'],
    eurcAddress: null,
    usdcAddress: '0xe15fC38F6D8c56aF07bbCBe3BAf5708A2Bf42392',
    cctp: {
        domain: 16,
        contracts: {
            v2: {
                type: 'split',
                tokenMessenger: '0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d',
                messageTransmitter: '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
                confirmations: 1,
                fastConfirmations: 1,
            },
        },
    },
    kitContracts: {
        bridge: BRIDGE_CONTRACT_EVM_MAINNET,
    },
});

/**
 * Sei Testnet chain definition
 * @remarks
 * This represents the official testnet for the Sei blockchain.
 * Used for development and testing purposes before deploying to mainnet.
 */
const SeiTestnet = defineChain({
    type: 'evm',
    chain: exports.Blockchain.Sei_Testnet,
    name: 'Sei Testnet',
    title: 'Sei Test Network',
    nativeCurrency: {
        name: 'Sei',
        symbol: 'SEI',
        decimals: 18,
    },
    chainId: 1328,
    isTestnet: true,
    explorerUrl: 'https://seitrace.com/tx/{hash}?chain=atlantic-2',
    rpcEndpoints: ['https://evm-rpc-testnet.sei-apis.com'],
    eurcAddress: null,
    usdcAddress: '0x4fCF1784B31630811181f670Aea7A7bEF803eaED',
    cctp: {
        domain: 16,
        contracts: {
            v2: {
                type: 'split',
                tokenMessenger: '0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA',
                messageTransmitter: '0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275',
                confirmations: 1,
                fastConfirmations: 1,
            },
        },
    },
    kitContracts: {
        bridge: BRIDGE_CONTRACT_EVM_TESTNET,
    },
});

/**
 * Sonic Mainnet chain definition
 * @remarks
 * This represents the official production network for the Sonic blockchain.
 */
const Sonic = defineChain({
    type: 'evm',
    chain: exports.Blockchain.Sonic,
    name: 'Sonic',
    title: 'Sonic Mainnet',
    nativeCurrency: {
        name: 'Sonic',
        symbol: 'S',
        decimals: 18,
    },
    chainId: 146,
    isTestnet: false,
    explorerUrl: 'https://sonicscan.org/tx/{hash}',
    rpcEndpoints: ['https://rpc.soniclabs.com'],
    eurcAddress: null,
    usdcAddress: '0x29219dd400f2Bf60E5a23d13Be72B486D4038894',
    cctp: {
        domain: 13,
        contracts: {
            v2: {
                type: 'split',
                tokenMessenger: '0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d',
                messageTransmitter: '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
                confirmations: 1,
                fastConfirmations: 1,
            },
        },
    },
    kitContracts: {
        bridge: BRIDGE_CONTRACT_EVM_MAINNET,
    },
});

/**
 * Sonic Testnet chain definition
 * @remarks
 * This represents the official test network for the Sonic blockchain.
 */
const SonicTestnet = defineChain({
    type: 'evm',
    chain: exports.Blockchain.Sonic_Testnet,
    name: 'Sonic Testnet',
    title: 'Sonic Testnet',
    nativeCurrency: {
        name: 'Sonic',
        symbol: 'S',
        decimals: 18,
    },
    chainId: 14601,
    isTestnet: true,
    explorerUrl: 'https://testnet.sonicscan.org/tx/{hash}',
    rpcEndpoints: ['https://rpc.testnet.soniclabs.com'],
    eurcAddress: null,
    usdcAddress: '0x0BA304580ee7c9a980CF72e55f5Ed2E9fd30Bc51',
    cctp: {
        domain: 13,
        contracts: {
            v2: {
                type: 'split',
                tokenMessenger: '0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA',
                messageTransmitter: '0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275',
                confirmations: 1,
                fastConfirmations: 1,
            },
        },
    },
    kitContracts: {
        bridge: BRIDGE_CONTRACT_EVM_TESTNET,
    },
});

/**
 * Solana Mainnet chain definition
 * @remarks
 * This represents the official production network for the Solana blockchain.
 */
const Solana = defineChain({
    type: 'solana',
    chain: exports.Blockchain.Solana,
    name: 'Solana',
    title: 'Solana Mainnet',
    nativeCurrency: {
        name: 'Solana',
        symbol: 'SOL',
        decimals: 9,
    },
    isTestnet: false,
    explorerUrl: 'https://solscan.io/tx/{hash}',
    rpcEndpoints: ['https://api.mainnet-beta.solana.com'],
    eurcAddress: 'HzwqbKZw8HxMN6bF2yFZNrht3c2iXXzpKcFu7uBEDKtr',
    usdcAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    cctp: {
        domain: 5,
        contracts: {
            v1: {
                type: 'split',
                tokenMessenger: 'CCTPiPYPc6AsJuwueEnWgSgucamXDZwBd53dQ11YiKX3',
                messageTransmitter: 'CCTPmbSD7gX1bxKPAmg77w8oFzNFpaQiQUWD43TKaecd',
                confirmations: 32,
            },
            v2: {
                type: 'split',
                tokenMessenger: 'CCTPV2vPZJS2u2BBsUoscuikbYjnpFmbFsvVuJdgUMQe',
                messageTransmitter: 'CCTPV2Sm4AdWt5296sk4P66VBZ7bEhcARwFaaS9YPbeC',
                confirmations: 32,
                fastConfirmations: 3,
            },
        },
    },
    kitContracts: {
        bridge: 'DFaauJEjmiHkPs1JG89A4p95hDWi9m9SAEERY1LQJiC3',
    },
});

/**
 * Solana Devnet chain definition
 * @remarks
 * This represents the development test network for the Solana blockchain.
 */
const SolanaDevnet = defineChain({
    type: 'solana',
    chain: exports.Blockchain.Solana_Devnet,
    name: 'Solana Devnet',
    title: 'Solana Development Network',
    nativeCurrency: {
        name: 'Solana',
        symbol: 'SOL',
        decimals: 9,
    },
    isTestnet: true,
    explorerUrl: 'https://solscan.io/tx/{hash}?cluster=devnet',
    eurcAddress: 'HzwqbKZw8HxMN6bF2yFZNrht3c2iXXzpKcFu7uBEDKtr',
    usdcAddress: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
    cctp: {
        domain: 5,
        contracts: {
            v1: {
                type: 'split',
                tokenMessenger: 'CCTPiPYPc6AsJuwueEnWgSgucamXDZwBd53dQ11YiKX3',
                messageTransmitter: 'CCTPmbSD7gX1bxKPAmg77w8oFzNFpaQiQUWD43TKaecd',
                confirmations: 32,
            },
            v2: {
                type: 'split',
                tokenMessenger: 'CCTPV2vPZJS2u2BBsUoscuikbYjnpFmbFsvVuJdgUMQe',
                messageTransmitter: 'CCTPV2Sm4AdWt5296sk4P66VBZ7bEhcARwFaaS9YPbeC',
                confirmations: 32,
                fastConfirmations: 3,
            },
        },
    },
    kitContracts: {
        bridge: 'DFaauJEjmiHkPs1JG89A4p95hDWi9m9SAEERY1LQJiC3',
    },
    rpcEndpoints: ['https://api.devnet.solana.com'],
});

/**
 * Stellar Mainnet chain definition
 * @remarks
 * This represents the official production network for the Stellar blockchain.
 */
const Stellar = defineChain({
    type: 'stellar',
    chain: exports.Blockchain.Stellar,
    name: 'Stellar',
    title: 'Stellar Mainnet',
    nativeCurrency: {
        name: 'Stellar Lumens',
        symbol: 'XLM',
        decimals: 7,
    },
    isTestnet: false,
    explorerUrl: 'https://stellar.expert/explorer/public/tx/{hash}',
    rpcEndpoints: ['https://horizon.stellar.org'],
    eurcAddress: 'EURC-GDHU6WRG4IEQXM5NZ4BMPKOXHW76MZM4Y2IEMFDVXBSDP6SJY4ITNPP2',
    usdcAddress: 'USDC-GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
    cctp: null,
});

/**
 * Stellar Testnet chain definition
 * @remarks
 * This represents the official test network for the Stellar blockchain.
 */
const StellarTestnet = defineChain({
    type: 'stellar',
    chain: exports.Blockchain.Stellar_Testnet,
    name: 'Stellar Testnet',
    title: 'Stellar Test Network',
    nativeCurrency: {
        name: 'Stellar Lumens',
        symbol: 'XLM',
        decimals: 7,
    },
    isTestnet: true,
    explorerUrl: 'https://stellar.expert/explorer/testnet/tx/{hash}',
    rpcEndpoints: ['https://horizon-testnet.stellar.org'],
    eurcAddress: 'EURC-GB3Q6QDZYTHWT7E5PVS3W7FUT5GVAFC5KSZFFLPU25GO7VTC3NM2ZTVO',
    usdcAddress: 'USDC-GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
    cctp: null,
});

/**
 * Sui Mainnet chain definition
 * @remarks
 * This represents the official production network for the Sui blockchain.
 */
const Sui = defineChain({
    type: 'sui',
    chain: exports.Blockchain.Sui,
    name: 'Sui',
    title: 'Sui Mainnet',
    nativeCurrency: {
        name: 'Sui',
        symbol: 'SUI',
        decimals: 9,
    },
    isTestnet: false,
    explorerUrl: 'https://suiscan.xyz/mainnet/tx/{hash}',
    rpcEndpoints: ['https://fullnode.mainnet.sui.io'],
    eurcAddress: null,
    usdcAddress: '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC',
    cctp: {
        domain: 8,
        contracts: {
            v1: {
                type: 'split',
                tokenMessenger: '0x2aa6c5d56376c371f88a6cc42e852824994993cb9bab8d3e6450cbe3cb32b94e',
                messageTransmitter: '0x08d87d37ba49e785dde270a83f8e979605b03dc552b5548f26fdf2f49bf7ed1b',
                confirmations: 1,
            },
        },
    },
});

/**
 * Sui Testnet chain definition
 * @remarks
 * This represents the official test network for the Sui blockchain.
 */
const SuiTestnet = defineChain({
    type: 'sui',
    chain: exports.Blockchain.Sui_Testnet,
    name: 'Sui Testnet',
    title: 'Sui Test Network',
    nativeCurrency: {
        name: 'Sui',
        symbol: 'SUI',
        decimals: 9,
    },
    isTestnet: true,
    explorerUrl: 'https://suiscan.xyz/testnet/tx/{hash}',
    rpcEndpoints: ['https://fullnode.testnet.sui.io'],
    eurcAddress: null,
    usdcAddress: '0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC',
    cctp: {
        domain: 8,
        contracts: {
            v1: {
                type: 'split',
                tokenMessenger: '0x31cc14d80c175ae39777c0238f20594c6d4869cfab199f40b69f3319956b8beb',
                messageTransmitter: '0x4931e06dce648b3931f890035bd196920770e913e43e45990b383f6486fdd0a5',
                confirmations: 1,
            },
        },
    },
});

/**
 * Unichain Mainnet chain definition
 * @remarks
 * This represents the official production network for the Unichain blockchain.
 */
const Unichain = defineChain({
    type: 'evm',
    chain: exports.Blockchain.Unichain,
    name: 'Unichain',
    title: 'Unichain Mainnet',
    nativeCurrency: {
        name: 'Uni',
        symbol: 'UNI',
        decimals: 18,
    },
    chainId: 130,
    isTestnet: false,
    explorerUrl: 'https://unichain.blockscout.com/tx/{hash}',
    rpcEndpoints: ['https://rpc.unichain.org', 'https://mainnet.unichain.org'],
    eurcAddress: null,
    usdcAddress: '0x078D782b760474a361dDA0AF3839290b0EF57AD6',
    cctp: {
        domain: 10,
        contracts: {
            v1: {
                type: 'split',
                tokenMessenger: '0x4e744b28E787c3aD0e810eD65A24461D4ac5a762',
                messageTransmitter: '0x353bE9E2E38AB1D19104534e4edC21c643Df86f4',
                confirmations: 65,
            },
            v2: {
                type: 'split',
                tokenMessenger: '0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d',
                messageTransmitter: '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
                confirmations: 65,
                fastConfirmations: 1,
            },
        },
    },
    kitContracts: {
        bridge: BRIDGE_CONTRACT_EVM_MAINNET,
    },
});

/**
 * Unichain Sepolia Testnet chain definition
 * @remarks
 * This represents the official test network for the Unichain blockchain.
 */
const UnichainSepolia = defineChain({
    type: 'evm',
    chain: exports.Blockchain.Unichain_Sepolia,
    name: 'Unichain Sepolia',
    title: 'Unichain Sepolia Testnet',
    nativeCurrency: {
        name: 'Sepolia Uni',
        symbol: 'UNI',
        decimals: 18,
    },
    chainId: 1301,
    isTestnet: true,
    explorerUrl: 'https://unichain-sepolia.blockscout.com/tx/{hash}',
    rpcEndpoints: ['https://sepolia.unichain.org'],
    eurcAddress: null,
    usdcAddress: '0x31d0220469e10c4E71834a79b1f276d740d3768F',
    cctp: {
        domain: 10,
        contracts: {
            v1: {
                type: 'split',
                tokenMessenger: '0x8ed94B8dAd2Dc5453862ea5e316A8e71AAed9782',
                messageTransmitter: '0xbc498c326533d675cf571B90A2Ced265ACb7d086',
                confirmations: 65,
            },
            v2: {
                type: 'split',
                tokenMessenger: '0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA',
                messageTransmitter: '0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275',
                confirmations: 65,
                fastConfirmations: 1,
            },
        },
    },
    kitContracts: {
        bridge: BRIDGE_CONTRACT_EVM_TESTNET,
    },
});

/**
 * World Chain chain definition
 * @remarks
 * This represents the main network for the World Chain blockchain.
 */
const WorldChain = defineChain({
    type: 'evm',
    chain: exports.Blockchain.World_Chain,
    name: 'World Chain',
    title: 'World Chain',
    nativeCurrency: {
        name: 'Ether',
        symbol: 'ETH',
        decimals: 18,
    },
    chainId: 480,
    isTestnet: false,
    explorerUrl: 'https://worldscan.org/tx/{hash}',
    rpcEndpoints: ['https://worldchain-mainnet.g.alchemy.com/public'],
    eurcAddress: null,
    usdcAddress: '0x79A02482A880bCe3F13E09da970dC34dB4cD24D1',
    cctp: {
        domain: 14,
        contracts: {
            v2: {
                type: 'split',
                tokenMessenger: '0x28b5a0e9C621a5BadaA536219b3a228C8168cF5d',
                messageTransmitter: '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
                confirmations: 65,
                fastConfirmations: 1,
            },
        },
    },
    kitContracts: {
        bridge: BRIDGE_CONTRACT_EVM_MAINNET,
    },
});

/**
 * World Chain Sepolia chain definition
 * @remarks
 * This represents the test network for the World Chain blockchain.
 */
const WorldChainSepolia = defineChain({
    type: 'evm',
    chain: exports.Blockchain.World_Chain_Sepolia,
    name: 'World Chain Sepolia',
    title: 'World Chain Sepolia',
    nativeCurrency: {
        name: 'Ether',
        symbol: 'ETH',
        decimals: 18,
    },
    chainId: 4801,
    isTestnet: true,
    explorerUrl: 'https://sepolia.worldscan.org/tx/{hash}',
    rpcEndpoints: [
        'https://worldchain-sepolia.drpc.org',
        'https://worldchain-sepolia.g.alchemy.com/public',
    ],
    eurcAddress: null,
    usdcAddress: '0x66145f38cBAC35Ca6F1Dfb4914dF98F1614aeA88',
    cctp: {
        domain: 14,
        contracts: {
            v2: {
                type: 'split',
                tokenMessenger: '0x8fe6b999dc680ccfdd5bf7eb0974218be2542daa',
                messageTransmitter: '0xe737e5cebeeba77efe34d4aa090756590b1ce275',
                confirmations: 65,
                fastConfirmations: 1,
            },
        },
    },
    kitContracts: {
        bridge: BRIDGE_CONTRACT_EVM_TESTNET,
    },
});

/**
 * XDC Mainnet chain definition
 * @remarks
 * This represents the official production network for the XDC blockchain.
 * XDC is a Layer 1 blockchain specialized for DeFi and trading applications
 * with native orderbook and matching engine.
 */
const XDC = defineChain({
    type: 'evm',
    chain: exports.Blockchain.XDC,
    name: 'XDC',
    title: 'XDC Mainnet',
    nativeCurrency: {
        name: 'XDC',
        symbol: 'XDC',
        decimals: 18,
    },
    chainId: 50,
    isTestnet: false,
    explorerUrl: 'https://xdcscan.io/tx/{hash}',
    rpcEndpoints: ['https://erpc.xinfin.network'],
    eurcAddress: null,
    usdcAddress: '0xfA2958CB79b0491CC627c1557F441eF849Ca8eb1',
    cctp: {
        domain: 18,
        contracts: {
            v2: {
                type: 'split',
                tokenMessenger: '0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d',
                messageTransmitter: '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
                confirmations: 3,
                fastConfirmations: 3,
            },
        },
    },
    kitContracts: {
        bridge: BRIDGE_CONTRACT_EVM_MAINNET,
    },
});

/**
 * XDC Apothem Testnet chain definition
 * @remarks
 * This represents the official test network for the XDC Network, known as Apothem.
 */
const XDCApothem = defineChain({
    type: 'evm',
    chain: exports.Blockchain.XDC_Apothem,
    name: 'Apothem Network',
    title: 'Apothem Network',
    nativeCurrency: {
        name: 'TXDC',
        symbol: 'TXDC',
        decimals: 18,
    },
    chainId: 51,
    isTestnet: true,
    explorerUrl: 'https://testnet.xdcscan.com/tx/{hash}',
    rpcEndpoints: ['https://erpc.apothem.network'],
    eurcAddress: null,
    usdcAddress: '0xb5AB69F7bBada22B28e79C8FFAECe55eF1c771D4',
    cctp: {
        domain: 18,
        contracts: {
            v2: {
                type: 'split',
                tokenMessenger: '0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA',
                messageTransmitter: '0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275',
                confirmations: 3,
                fastConfirmations: 1,
            },
        },
    },
    kitContracts: {
        bridge: BRIDGE_CONTRACT_EVM_TESTNET,
    },
});

/**
 * ZKSync Era Mainnet chain definition
 * @remarks
 * This represents the official production network for the ZKSync Era blockchain.
 */
const ZKSyncEra = defineChain({
    type: 'evm',
    chain: exports.Blockchain.ZKSync_Era,
    name: 'ZKSync Era',
    title: 'ZKSync Era Mainnet',
    nativeCurrency: {
        name: 'Ether',
        symbol: 'ETH',
        decimals: 18,
    },
    chainId: 324,
    isTestnet: false,
    explorerUrl: 'https://explorer.zksync.io/tx/{hash}',
    rpcEndpoints: ['https://mainnet.era.zksync.io'],
    eurcAddress: null,
    usdcAddress: '0x1d17CBcF0D6D143135aE902365D2E5e2A16538D4',
    cctp: null,
});

/**
 * ZKSync Era Sepolia Testnet chain definition
 * @remarks
 * This represents the official test network for the ZKSync Era blockchain on Sepolia.
 */
const ZKSyncEraSepolia = defineChain({
    type: 'evm',
    chain: exports.Blockchain.ZKSync_Sepolia,
    name: 'ZKSync Era Sepolia',
    title: 'ZKSync Era Sepolia Testnet',
    nativeCurrency: {
        name: 'Sepolia Ether',
        symbol: 'ETH',
        decimals: 18,
    },
    chainId: 300,
    isTestnet: true,
    explorerUrl: 'https://sepolia.explorer.zksync.io/tx/{hash}',
    rpcEndpoints: ['https://sepolia.era.zksync.dev'],
    eurcAddress: null,
    usdcAddress: '0xAe045DE5638162fa134807Cb558E15A3F5A7F853',
    cctp: null,
});

var Blockchains = {
    __proto__: null,
    Algorand: Algorand,
    AlgorandTestnet: AlgorandTestnet,
    Aptos: Aptos,
    AptosTestnet: AptosTestnet,
    Arbitrum: Arbitrum,
    ArbitrumSepolia: ArbitrumSepolia,
    ArcTestnet: ArcTestnet,
    Avalanche: Avalanche,
    AvalancheFuji: AvalancheFuji,
    Base: Base,
    BaseSepolia: BaseSepolia,
    Celo: Celo,
    CeloAlfajoresTestnet: CeloAlfajoresTestnet,
    Codex: Codex,
    CodexTestnet: CodexTestnet,
    Ethereum: Ethereum,
    EthereumSepolia: EthereumSepolia,
    Hedera: Hedera,
    HederaTestnet: HederaTestnet,
    HyperEVM: HyperEVM,
    HyperEVMTestnet: HyperEVMTestnet,
    Ink: Ink,
    InkTestnet: InkTestnet,
    Linea: Linea,
    LineaSepolia: LineaSepolia,
    Monad: Monad,
    MonadTestnet: MonadTestnet,
    NEAR: NEAR,
    NEARTestnet: NEARTestnet,
    Noble: Noble,
    NobleTestnet: NobleTestnet,
    Optimism: Optimism,
    OptimismSepolia: OptimismSepolia,
    Plume: Plume,
    PlumeTestnet: PlumeTestnet,
    PolkadotAssetHub: PolkadotAssetHub,
    PolkadotWestmint: PolkadotWestmint,
    Polygon: Polygon,
    PolygonAmoy: PolygonAmoy,
    Sei: Sei,
    SeiTestnet: SeiTestnet,
    Solana: Solana,
    SolanaDevnet: SolanaDevnet,
    Sonic: Sonic,
    SonicTestnet: SonicTestnet,
    Stellar: Stellar,
    StellarTestnet: StellarTestnet,
    Sui: Sui,
    SuiTestnet: SuiTestnet,
    Unichain: Unichain,
    UnichainSepolia: UnichainSepolia,
    WorldChain: WorldChain,
    WorldChainSepolia: WorldChainSepolia,
    XDC: XDC,
    XDCApothem: XDCApothem,
    ZKSyncEra: ZKSyncEra,
    ZKSyncEraSepolia: ZKSyncEraSepolia
};

/**
 * Base schema for common chain definition properties.
 * This contains all properties shared between EVM and non-EVM chains.
 */
const baseChainDefinitionSchema = zod.z.object({
    chain: zod.z.nativeEnum(exports.Blockchain, {
        required_error: 'Chain enum is required. Please provide a valid Blockchain enum value.',
        invalid_type_error: 'Chain must be a valid Blockchain enum value.',
    }),
    name: zod.z.string({
        required_error: 'Chain name is required. Please provide a valid chain name.',
        invalid_type_error: 'Chain name must be a string.',
    }),
    title: zod.z.string().optional(),
    nativeCurrency: zod.z.object({
        name: zod.z.string(),
        symbol: zod.z.string(),
        decimals: zod.z.number(),
    }),
    isTestnet: zod.z.boolean({
        required_error: 'isTestnet is required. Please specify whether this is a testnet.',
        invalid_type_error: 'isTestnet must be a boolean.',
    }),
    explorerUrl: zod.z.string({
        required_error: 'Explorer URL is required. Please provide a valid explorer URL.',
        invalid_type_error: 'Explorer URL must be a string.',
    }),
    rpcEndpoints: zod.z.array(zod.z.string()),
    eurcAddress: zod.z.string().nullable(),
    usdcAddress: zod.z.string().nullable(),
    cctp: zod.z.any().nullable(), // We'll accept any CCTP config structure
    kitContracts: zod.z
        .object({
        bridge: zod.z.string().optional(),
    })
        .optional(),
});
/**
 * Zod schema for validating EVM chain definitions specifically.
 * This schema extends the base schema with EVM-specific properties.
 *
 * @example
 * ```typescript
 * import { evmChainDefinitionSchema } from '@core/chains/validation'
 * import { Blockchain } from '@core/chains'
 *
 * const ethereumChain = {
 *   type: 'evm',
 *   chain: Blockchain.Ethereum,
 *   name: 'Ethereum',
 *   chainId: 1,
 *   nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
 *   isTestnet: false,
 *   explorerUrl: 'https://etherscan.io/tx/{hash}',
 *   usdcAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
 *   eurcAddress: null,
 *   cctp: null
 * }
 *
 * const result = evmChainDefinitionSchema.safeParse(ethereumChain)
 * if (result.success) {
 *   console.log('EVM chain definition is valid')
 * } else {
 *   console.error('Validation failed:', result.error)
 * }
 * ```
 */
const evmChainDefinitionSchema = baseChainDefinitionSchema
    .extend({
    type: zod.z.literal('evm'),
    chainId: zod.z.number({
        required_error: 'EVM chains must have a chainId. Please provide a valid EVM chain ID.',
        invalid_type_error: 'EVM chain ID must be a number.',
    }),
})
    .strict(); //// Reject any additional properties not defined in the schema
/**
 * Zod schema for validating non-EVM chain definitions.
 * This schema extends the base schema with non-EVM specific properties.
 */
const nonEvmChainDefinitionSchema = baseChainDefinitionSchema
    .extend({
    type: zod.z.enum([
        'algorand',
        'avalanche',
        'solana',
        'aptos',
        'near',
        'stellar',
        'sui',
        'hedera',
        'noble',
        'polkadot',
    ]),
})
    .strict(); // Reject any additional properties not defined in the schema
/**
 * Discriminated union schema for all chain definitions.
 * This schema validates different chain types based on their 'type' field.
 *
 * @example
 * ```typescript
 * import { chainDefinitionSchema } from '@core/chains/validation'
 * import { Blockchain } from '@core/chains'
 *
 * // EVM chain
 * chainDefinitionSchema.parse({
 *   type: 'evm',
 *   chain: Blockchain.Ethereum,
 *   chainId: 1,
 *   // ... other properties
 * })
 *
 * // Non-EVM chain
 * chainDefinitionSchema.parse({
 *   type: 'solana',
 *   chain: Blockchain.Solana,
 *   // ... other properties (no chainId)
 * })
 * ```
 */
const chainDefinitionSchema$1 = zod.z.discriminatedUnion('type', [
    evmChainDefinitionSchema,
    nonEvmChainDefinitionSchema,
]);
/**
 * Zod schema for validating chain identifiers.
 * This schema accepts either a string blockchain identifier, a Blockchain enum value,
 * or a full ChainDefinition object.
 *
 * @example
 * ```typescript
 * import { chainIdentifierSchema } from '@core/chains/validation'
 * import { Blockchain, Ethereum } from '@core/chains'
 *
 * // All of these are valid:
 * chainIdentifierSchema.parse('Ethereum')
 * chainIdentifierSchema.parse(Blockchain.Ethereum)
 * chainIdentifierSchema.parse(Ethereum)
 * ```
 */
zod.z.union([
    zod.z
        .string()
        .refine((val) => val in exports.Blockchain, 'Must be a valid Blockchain enum value as string'),
    zod.z.nativeEnum(exports.Blockchain),
    chainDefinitionSchema$1,
]);
/**
 * Zod schema for validating bridge chain identifiers.
 *
 * This schema validates that the provided chain is supported for CCTPv2 bridging.
 * It accepts either a BridgeChain enum value, a string matching a BridgeChain value,
 * or a ChainDefinition for a supported chain.
 *
 * Use this schema when validating chain parameters for bridge operations to ensure
 * only CCTPv2-supported chains are accepted at runtime.
 *
 * @example
 * ```typescript
 * import { bridgeChainIdentifierSchema } from '@core/chains/validation'
 * import { BridgeChain, Chains } from '@core/chains'
 *
 * // Valid - BridgeChain enum value
 * bridgeChainIdentifierSchema.parse(BridgeChain.Ethereum)
 *
 * // Valid - string literal
 * bridgeChainIdentifierSchema.parse('Base_Sepolia')
 *
 * // Valid - ChainDefinition (validated by CCTP support)
 * bridgeChainIdentifierSchema.parse(Chains.Solana)
 *
 * // Invalid - Algorand is not in BridgeChain (throws ZodError)
 * bridgeChainIdentifierSchema.parse('Algorand')
 * ```
 *
 * @see {@link BridgeChain} for the enum of supported chains.
 */
const bridgeChainIdentifierSchema = zod.z.union([
    zod.z.string().refine((val) => val in exports.BridgeChain, (val) => ({
        message: `Chain "${val}" is not supported for bridging. Only chains in the BridgeChain enum support CCTPv2 bridging.`,
    })),
    chainDefinitionSchema$1.refine((chainDef) => chainDef.chain in exports.BridgeChain, (chainDef) => ({
        message: `Chain "${chainDef.name}" (${chainDef.chain}) is not supported for bridging. Only chains in the BridgeChain enum support CCTPv2 bridging.`,
    })),
]);

/**
 * Retrieve a chain definition by its blockchain enum value.
 *
 * Searches the set of known chain definitions and returns the one matching the provided
 * blockchain enum or string value. Throws an error if no matching chain is found.
 *
 * @param blockchain - The blockchain enum or its string representation to look up.
 * @returns The corresponding ChainDefinition object for the given blockchain.
 *
 * @throws Error If no chain definition is found for the provided enum value.
 *
 * @example
 * ```typescript
 * import { getChainByEnum } from '@core/chains'
 * import { Blockchain } from '@core/chains'
 *
 * const ethereum = getChainByEnum(Blockchain.Ethereum)
 * console.log(ethereum.name) // "Ethereum"
 * ```
 */
const getChainByEnum = (blockchain) => {
    const chain = Object.values(Blockchains).find((chain) => {
        return chain.chain === blockchain;
    });
    if (!chain) {
        throw new Error(`No chain definition found for blockchain: ${blockchain}`);
    }
    return chain;
};

/**
 * Resolves a flexible chain identifier to a ChainDefinition.
 *
 * This function handles all three supported formats:
 * - ChainDefinition objects (passed through unchanged)
 * - Blockchain enum values (resolved via getChainByEnum)
 * - String literals of blockchain values (resolved via getChainByEnum)
 *
 * @param chainIdentifier - The chain identifier to resolve
 * @returns The resolved ChainDefinition object
 * @throws Error if the chain identifier cannot be resolved
 *
 * @example
 * ```typescript
 * import { resolveChainIdentifier } from '@core/chains'
 * import { Blockchain, Ethereum } from '@core/chains'
 *
 * // All of these resolve to the same ChainDefinition:
 * const chain1 = resolveChainIdentifier(Ethereum)
 * const chain2 = resolveChainIdentifier(Blockchain.Ethereum)
 * const chain3 = resolveChainIdentifier('Ethereum')
 * ```
 */
function resolveChainIdentifier(chainIdentifier) {
    // If it's already a ChainDefinition object, return it unchanged
    if (typeof chainIdentifier === 'object') {
        return chainIdentifier;
    }
    // If it's a string or enum value, resolve it via getChainByEnum
    if (typeof chainIdentifier === 'string') {
        return getChainByEnum(chainIdentifier);
    }
    // This should never happen with proper typing, but provide a fallback
    throw new Error(`Invalid chain identifier type: ${typeof chainIdentifier}. Expected ChainDefinition object, Blockchain enum, or string literal.`);
}

/**
 * Extracts chain information including name, display name, and expected address format.
 *
 * This function determines the chain type by checking the explicit `type` property first,
 * then falls back to name-based matching for Solana chains. The expected address format
 * is determined based on the chain type:
 * - EVM chains: 42-character hex address starting with 0x
 * - Solana chains: 44-character base58 encoded string
 * - Other chains: Generic format message based on chain type
 *
 * @param chain - The chain identifier (ChainDefinition object, string name, or undefined/null)
 * @returns Chain information with name, display name, and expected address format
 *
 * @example
 * ```typescript
 * import { extractChainInfo } from '@core/chains'
 *
 * // EVM chain with explicit type
 * const info1 = extractChainInfo({ name: 'Ethereum', type: 'evm' })
 * console.log(info1.name) // → "Ethereum"
 * console.log(info1.displayName) // → "Ethereum"
 * console.log(info1.expectedAddressFormat)
 * // → "42-character hex address starting with 0x"
 *
 * // Solana chain (inferred from name)
 * const info2 = extractChainInfo('Solana')
 * console.log(info2.expectedAddressFormat)
 * // → "44-character base58 encoded string"
 *
 * // Non-EVM chain with explicit type
 * const info3 = extractChainInfo({ name: 'Algorand', type: 'algorand' })
 * console.log(info3.expectedAddressFormat)
 * // → "valid algorand address"
 *
 * // Unknown chain
 * const info4 = extractChainInfo(undefined)
 * console.log(info4.name) // → "unknown"
 * console.log(info4.expectedAddressFormat) // → "valid blockchain address"
 * ```
 */
function extractChainInfo(chain) {
    const name = typeof chain === 'string' ? chain : (chain?.name ?? 'unknown');
    const chainType = typeof chain === 'object' && chain !== null ? chain.type : undefined;
    // Use explicit chain type if available, fallback to name matching
    const isSolana = chainType === undefined
        ? name.toLowerCase().includes('solana')
        : chainType === 'solana';
    // Default to EVM if not Solana and no explicit non-EVM type
    const isEVM = chainType === undefined
        ? !isSolana // Default to EVM for unknown chains (unless they're Solana)
        : chainType === 'evm';
    // Determine expected address format based on chain type
    let expectedAddressFormat;
    if (isSolana) {
        expectedAddressFormat = '44-character base58 encoded string';
    }
    else if (isEVM) {
        expectedAddressFormat = '42-character hex address starting with 0x';
    }
    else {
        expectedAddressFormat = `valid ${chainType ?? 'blockchain'} address`;
    }
    return {
        name,
        displayName: name.replaceAll('_', ' '),
        expectedAddressFormat,
    };
}

/**
 * Type guard to check if an error is a KitError instance.
 *
 * This guard enables TypeScript to narrow the type from `unknown` to
 * `KitError`, providing access to structured error properties like
 * code, name, and recoverability.
 *
 * @param error - Unknown error to check
 * @returns True if error is KitError with proper type narrowing
 *
 * @example
 * ```typescript
 * import { isKitError } from '@core/errors'
 *
 * try {
 *   await kit.bridge(params)
 * } catch (error) {
 *   if (isKitError(error)) {
 *     // TypeScript knows this is KitError
 *     console.log(`Structured error: ${error.name} (${error.code})`)
 *   } else {
 *     console.log('Regular error:', error)
 *   }
 * }
 * ```
 */
function isKitError(error) {
    return error instanceof KitError;
}
/**
 * Checks if an error is a KitError with FATAL recoverability.
 *
 * FATAL errors indicate issues that cannot be resolved through retries,
 * such as invalid inputs, configuration problems, or business rule
 * violations. These errors require user intervention to fix.
 *
 * @param error - Unknown error to check
 * @returns True if error is a KitError with FATAL recoverability
 *
 * @example
 * ```typescript
 * import { isFatalError } from '@core/errors'
 *
 * try {
 *   await kit.bridge(params)
 * } catch (error) {
 *   if (isFatalError(error)) {
 *     // Show user-friendly error message - don't retry
 *     showUserError(error.message)
 *   }
 * }
 * ```
 */
function isFatalError(error) {
    return isKitError(error) && error.recoverability === 'FATAL';
}
/**
 * Error codes that are considered retryable by default.
 *
 * @remarks
 * These are typically transient errors that may succeed on retry:
 * - Network connectivity issues (3001, 3002)
 * - Provider unavailability (4001, 4002)
 * - RPC nonce errors (4003)
 */
const DEFAULT_RETRYABLE_ERROR_CODES = [
    // Network errors
    3001, // NETWORK_CONNECTION_FAILED
    3002, // NETWORK_TIMEOUT
    // Provider errors
    4001, // PROVIDER_UNAVAILABLE
    4002, // PROVIDER_TIMEOUT
    4003, // RPC_NONCE_ERROR
];
/**
 * Checks if an error is retryable.
 *
 * @remarks
 * Check order for KitError instances:
 * 1. If `recoverability === 'RETRYABLE'`, return `true` immediately (priority check).
 * 2. Otherwise, check if `error.code` is in `DEFAULT_RETRYABLE_ERROR_CODES` (fallback check).
 * 3. Non-KitError instances always return `false`.
 *
 * This two-tier approach allows both explicit recoverability control and
 * backward-compatible code-based retry logic.
 *
 * RETRYABLE errors indicate transient failures that may succeed on
 * subsequent attempts, such as network timeouts or temporary service
 * unavailability. These errors are safe to retry after a delay.
 *
 * @param error - Unknown error to check
 * @returns True if error is retryable
 *
 * @example
 * ```typescript
 * import { isRetryableError } from '@core/errors'
 *
 * try {
 *   await kit.bridge(params)
 * } catch (error) {
 *   if (isRetryableError(error)) {
 *     // Implement retry logic with exponential backoff
 *     setTimeout(() => retryOperation(), 5000)
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * import { isRetryableError, createNetworkConnectionError, KitError } from '@core/errors'
 *
 * // KitError with RETRYABLE recoverability (priority check)
 * const error1 = createNetworkConnectionError('Ethereum')
 * isRetryableError(error1) // true
 *
 * // KitError with default retryable code (fallback check)
 * const error2 = new KitError({
 *   code: 3002, // NETWORK_TIMEOUT - in DEFAULT_RETRYABLE_ERROR_CODES
 *   name: 'NETWORK_TIMEOUT',
 *   type: 'NETWORK',
 *   recoverability: 'FATAL', // Not RETRYABLE
 *   message: 'Timeout',
 * })
 * isRetryableError(error2) // true (code 3002 is in default list)
 *
 * // KitError with non-retryable code and FATAL recoverability
 * const error3 = new KitError({
 *   code: 1001,
 *   name: 'INVALID_INPUT',
 *   type: 'INPUT',
 *   recoverability: 'FATAL',
 *   message: 'Invalid input',
 * })
 * isRetryableError(error3) // false
 *
 * // Non-KitError
 * const error4 = new Error('Standard error')
 * isRetryableError(error4) // false
 * ```
 */
function isRetryableError(error) {
    // Use proper type guard to check if it's a KitError
    if (isKitError(error)) {
        // Priority check: explicit recoverability
        if (error.recoverability === 'RETRYABLE') {
            return true;
        }
        // Fallback check: error code against default retryable codes
        return DEFAULT_RETRYABLE_ERROR_CODES.includes(error.code);
    }
    return false;
}
/**
 * Type guard to check if error is KitError with INPUT type.
 *
 * INPUT errors represent validation failures, invalid parameters,
 * or user input problems. These errors are always FATAL and require
 * the user to correct their input before retrying.
 *
 * @param error - Unknown error to check
 * @returns True if error is KitError with INPUT type
 *
 * @example
 * ```typescript
 * import { isInputError } from '@core/errors'
 *
 * try {
 *   await kit.bridge(params)
 * } catch (error) {
 *   if (isInputError(error)) {
 *     console.log('Validation error:', error.message)
 *     showValidationUI()
 *   }
 * }
 * ```
 */
function isInputError(error) {
    return isKitError(error) && error.type === ERROR_TYPES.INPUT;
}
/**
 * Type guard to check if error is KitError with BALANCE type.
 *
 * BALANCE errors indicate insufficient funds or allowance issues
 * that prevent transaction execution. These errors are always FATAL
 * and require the user to add funds or approve more tokens.
 *
 * @param error - Unknown error to check
 * @returns True if error is KitError with BALANCE type
 *
 * @example
 * ```typescript
 * import { isBalanceError } from '@core/errors'
 *
 * try {
 *   await kit.bridge(params)
 * } catch (error) {
 *   if (isBalanceError(error)) {
 *     console.log('Insufficient funds:', error.message)
 *     showAddFundsUI()
 *   }
 * }
 * ```
 */
function isBalanceError(error) {
    return isKitError(error) && error.type === ERROR_TYPES.BALANCE;
}
/**
 * Type guard to check if error is KitError with ONCHAIN type.
 *
 * ONCHAIN errors occur during transaction execution or simulation,
 * including reverts, gas issues, and smart contract failures.
 * These errors are typically FATAL.
 *
 * @param error - Unknown error to check
 * @returns True if error is KitError with ONCHAIN type
 *
 * @example
 * ```typescript
 * import { isOnchainError } from '@core/errors'
 *
 * try {
 *   await kit.bridge(params)
 * } catch (error) {
 *   if (isOnchainError(error)) {
 *     console.log('Transaction failed:', error.message)
 *     showTransactionErrorUI()
 *   }
 * }
 * ```
 */
function isOnchainError(error) {
    return isKitError(error) && error.type === ERROR_TYPES.ONCHAIN;
}
/**
 * Type guard to check if error is KitError with RPC type.
 *
 * RPC errors occur when communicating with blockchain RPC providers.
 * These errors are typically RETRYABLE as they often indicate
 * temporary provider issues.
 *
 * @param error - Unknown error to check
 * @returns True if error is KitError with RPC type
 *
 * @example
 * ```typescript
 * import { isRpcError } from '@core/errors'
 *
 * try {
 *   await kit.bridge(params)
 * } catch (error) {
 *   if (isRpcError(error)) {
 *     console.log('RPC error:', error.message)
 *     retryWithBackoff()
 *   }
 * }
 * ```
 */
function isRpcError(error) {
    return isKitError(error) && error.type === ERROR_TYPES.RPC;
}
/**
 * Type guard to check if error is KitError with NETWORK type.
 *
 * NETWORK errors indicate connectivity issues at the network layer.
 * These errors are typically RETRYABLE as they often indicate
 * temporary network problems.
 *
 * @param error - Unknown error to check
 * @returns True if error is KitError with NETWORK type
 *
 * @example
 * ```typescript
 * import { isNetworkError } from '@core/errors'
 *
 * try {
 *   await kit.bridge(params)
 * } catch (error) {
 *   if (isNetworkError(error)) {
 *     console.log('Network issue:', error.message)
 *     retryWithBackoff()
 *   }
 * }
 * ```
 */
function isNetworkError(error) {
    return isKitError(error) && error.type === ERROR_TYPES.NETWORK;
}
/**
 * Safely extracts error message from any error type.
 *
 * This utility handles different error types gracefully, extracting
 * meaningful messages from Error instances, string errors, or providing
 * a fallback for unknown error types. Never throws.
 *
 * @param error - Unknown error to extract message from
 * @returns Error message string, or fallback message
 *
 * @example
 * ```typescript
 * import { getErrorMessage } from '@core/errors'
 *
 * try {
 *   await riskyOperation()
 * } catch (error) {
 *   const message = getErrorMessage(error)
 *   console.log('Error occurred:', message)
 *   // Works with Error, KitError, string, or any other type
 * }
 * ```
 */
function getErrorMessage(error) {
    if (error instanceof Error) {
        return error.message;
    }
    if (typeof error === 'string') {
        return error;
    }
    return 'An unknown error occurred';
}
/**
 * Gets the error code from a KitError, or null if not applicable.
 *
 * This utility safely extracts the numeric error code from KitError
 * instances, returning null for non-KitError types. Useful for
 * programmatic error handling based on specific error codes.
 *
 * @param error - Unknown error to extract code from
 * @returns Error code number, or null if not a KitError
 *
 * @example
 * ```typescript
 * import { getErrorCode, InputError } from '@core/errors'
 *
 * try {
 *   await kit.bridge(params)
 * } catch (error) {
 *   const code = getErrorCode(error)
 *   if (code === InputError.NETWORK_MISMATCH.code) {
 *     // Handle network mismatch specifically
 *     showNetworkMismatchHelp()
 *   }
 * }
 * ```
 */
function getErrorCode(error) {
    return isKitError(error) ? error.code : null;
}

/**
 * Validates if an address format is correct for the specified chain.
 *
 * This function checks the explicit chain `type` property first, then falls back
 * to name-based matching to determine whether to validate as a Solana or EVM address.
 *
 * @param address - The address to validate
 * @param chain - The chain identifier or chain definition (cannot be null)
 * @returns True if the address format is valid for the chain, false otherwise
 *
 * @example
 * ```typescript
 * import { isValidAddressForChain } from '@core/errors'
 *
 * // EVM address validation
 * isValidAddressForChain('0x742d35Cc6634C0532925a3b8D0C0C1C4C5C6C7C8', 'Ethereum')
 * // → true
 *
 * // Solana address validation
 * isValidAddressForChain('9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM', { name: 'Solana', type: 'solana' })
 * // → true
 *
 * // Invalid format
 * isValidAddressForChain('invalid', 'Ethereum')
 * // → false
 * ```
 */
function isValidAddressForChain(address, chain) {
    const chainType = typeof chain === 'object' ? chain.type : undefined;
    const name = typeof chain === 'string' ? chain : chain.name;
    // Use explicit chain type if available, fallback to name matching
    const isSolana = chainType !== undefined
        ? chainType === 'solana'
        : name.toLowerCase().includes('solana');
    if (isSolana) {
        // Solana base58 address: 32-44 characters from base58 alphabet
        return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
    }
    // EVM hex address: 0x followed by 40 hex characters
    return /^0x[a-fA-F0-9]{40}$/.test(address);
}
/**
 * Type guard to check if a value is an object.
 *
 * @param val - The value to check
 * @returns True if the value is a non-null object
 */
function isObject(val) {
    return typeof val === 'object' && val !== null;
}
/**
 * Type guard to check if a value is a chain with isTestnet property.
 *
 * @param chain - The value to check
 * @returns True if the value is a chain object with name and isTestnet properties
 *
 * @example
 * ```typescript
 * import { isChainWithTestnet } from '@core/errors'
 *
 * const chain1 = { name: 'Ethereum', isTestnet: false }
 * isChainWithTestnet(chain1) // → true
 *
 * const chain2 = { name: 'Ethereum' }
 * isChainWithTestnet(chain2) // → false
 *
 * const chain3 = 'Ethereum'
 * isChainWithTestnet(chain3) // → false
 * ```
 */
function isChainWithTestnet(chain) {
    return (isObject(chain) &&
        'isTestnet' in chain &&
        typeof chain['isTestnet'] === 'boolean' &&
        'name' in chain &&
        typeof chain['name'] === 'string');
}
/**
 * Gets chain identifier from toData object.
 *
 * Looks for chain in context.chain first, then falls back to direct chain property.
 *
 * @param toData - The destination data object
 * @returns The chain identifier or null
 */
function getChainFromToData(toData) {
    const context = toData['context'];
    const chain = context?.['chain'] ?? toData['chain'];
    return chain;
}
/**
 * Gets chain name from params object.
 *
 * @param params - The parameters object
 * @returns The chain name as a string, or null if not found
 */
function getChainName(params) {
    if (isObject(params)) {
        const chain = params['chain'];
        if (typeof chain === 'string') {
            return chain;
        }
        if (isObject(chain) && 'name' in chain) {
            return chain.name;
        }
    }
    return null;
}
/**
 * Extracts from data from params object.
 *
 * Supports both 'from' and 'source' property names.
 *
 * @param params - The parameters object
 * @returns The from/source data or undefined
 */
function extractFromData(params) {
    return (params['from'] ?? params['source']);
}
/**
 * Extracts to data from params object.
 *
 * Supports both 'to' and 'destination' property names.
 *
 * @param params - The parameters object
 * @returns The to/destination data or undefined
 */
function extractToData(params) {
    return (params['to'] ?? params['destination']);
}
/**
 * Gets address from params object using a dot-separated path.
 *
 * Traverses nested objects to extract the address value at the specified path.
 *
 * @param params - The parameters object
 * @param path - Dot-separated path to extract address from (e.g., 'to.recipientAddress')
 * @returns The address as a string, or 'unknown' if not found
 *
 * @example
 * ```typescript
 * // Extract from specific path
 * getAddressFromParams(params, 'to.recipientAddress')
 * // Returns the value at params.to.recipientAddress
 * ```
 */
function getAddressFromParams(params, path) {
    const parts = path.split('.');
    let current = params;
    for (const part of parts) {
        if (current !== null &&
            current !== undefined &&
            typeof current === 'object' &&
            part in current) {
            current = current[part];
        }
        else {
            return 'unknown';
        }
    }
    return typeof current === 'string' ? current : 'unknown';
}
/**
 * Gets chain identifier from params object.
 *
 * Looks for chain in to.context.chain, to.chain, or direct chain property.
 *
 * @param params - The parameters object
 * @returns The chain identifier or null
 */
function getChainFromParams(params) {
    const to = extractToData(params);
    const chain = to?.['chain'] ?? params['chain'];
    return chain;
}

/**
 * Converts a Zod validation error into a specific KitError instance using structured pattern matching.
 *
 * This function inspects Zod's error details (path, code, message) and delegates each issue
 * to specialized handlers that generate domain-specific KitError objects. It leverages
 * Zod's error codes and path information for robust matching, avoiding fragile string checks.
 *
 * @param zodError - The Zod validation error containing one or more issues
 * @param params - The original parameters that failed validation (used to extract invalid values)
 * @returns A specific KitError instance with actionable error details
 */
function convertZodErrorToStructured(zodError, params) {
    // Handle null/undefined params gracefully
    if (params === null || params === undefined) {
        return createValidationFailedError(zodError);
    }
    const paramsObj = params;
    const toData = extractToData(paramsObj);
    const fromData = extractFromData(paramsObj);
    for (const issue of zodError.issues) {
        const path = issue.path.join('.');
        const code = issue.code;
        // Try to handle specific error types
        const amountError = handleAmountError(path, code, issue.message, paramsObj);
        if (amountError)
            return amountError;
        const chainError = handleChainError(path, code, issue.message, fromData, toData);
        if (chainError)
            return chainError;
        const addressError = handleAddressError(path, code, issue.message, paramsObj);
        if (addressError)
            return addressError;
    }
    // Fallback
    return createValidationFailedError(zodError);
}
/**
 * Creates a generic validation failed error for null/undefined params or unmapped error cases.
 *
 * This is a fallback handler used when:
 * - Parameters are null or undefined
 * - No specific error handler matches the Zod error
 * - The error doesn't fit into amount/chain/address categories
 *
 * This function delegates to createValidationErrorFromZod with a generic "parameters" context.
 *
 * @param zodError - The Zod validation error with all issues
 * @returns A generic KitError with INPUT_VALIDATION_FAILED code
 */
function createValidationFailedError(zodError) {
    return createValidationErrorFromZod(zodError, 'parameters');
}
/**
 * Handles amount-related validation errors from Zod.
 *
 * Checks if the validation error path includes 'amount' and attempts
 * to convert generic Zod errors into specific KitError instances with
 * actionable messages. Delegates to specialized handlers in order of specificity:
 * 1. Negative amount errors (too_small)
 * 2. Custom validation errors (decimal places, numeric string)
 * 3. Invalid string format errors
 * 4. Invalid type errors
 *
 * @param path - The Zod error path (e.g., 'amount' or 'config.amount')
 * @param code - The Zod error code (e.g., 'too_small', 'invalid_string', 'custom')
 * @param message - The original Zod error message
 * @param paramsObj - The original params object for extracting the invalid amount value
 * @returns KitError with INPUT_INVALID_AMOUNT code if this is an amount error, null otherwise
 */
function handleAmountError(path, code, message, paramsObj) {
    if (!path.includes('amount'))
        return null;
    const amount = typeof paramsObj['amount'] === 'string' ? paramsObj['amount'] : 'unknown';
    // Try different error handlers in order of specificity
    const negativeError = handleNegativeAmountError(code, message, amount);
    if (negativeError)
        return negativeError;
    const customError = handleCustomAmountError(code, message, amount);
    if (customError)
        return customError;
    const stringFormatError = handleInvalidStringAmountError(code, message, amount);
    if (stringFormatError)
        return stringFormatError;
    const typeError = handleInvalidTypeAmountError(code, amount);
    if (typeError)
        return typeError;
    return null;
}
/**
 * Handles negative or too-small amount validation errors.
 *
 * Detects Zod 'too_small' error codes or messages containing 'greater than'
 * and creates a specific error indicating the amount must be positive.
 *
 * @param code - The Zod error code
 * @param message - The Zod error message
 * @param amount - The invalid amount value as a string
 * @returns KitError if this is a negative/too-small amount error, null otherwise
 */
function handleNegativeAmountError(code, message, amount) {
    if (code === 'too_small' || message.includes('greater than')) {
        return createInvalidAmountError(amount, AMOUNT_GREATER_THAN_ZERO_MESSAGE);
    }
    return null;
}
/**
 * Handles custom Zod refinement validation errors for amounts.
 *
 * Processes Zod 'custom' error codes from .refine() validators and matches
 * against known patterns:
 * - 'non-negative' - amount must be \>= 0
 * - 'decimal places' - too many decimal places
 * - 'numeric string' - value is not a valid numeric string
 *
 * @param code - The Zod error code (must be 'custom')
 * @param message - The custom error message from the refinement
 * @param amount - The invalid amount value as a string
 * @returns KitError with specific message if pattern matches, null otherwise
 */
function handleCustomAmountError(code, message, amount) {
    if (code !== 'custom')
        return null;
    if (message.includes('non-negative')) {
        return createInvalidAmountError(amount, AMOUNT_NON_NEGATIVE_MESSAGE);
    }
    if (message.includes('greater than 0')) {
        return createInvalidAmountError(amount, AMOUNT_GREATER_THAN_ZERO_MESSAGE);
    }
    if (message.includes('decimal places')) {
        return createInvalidAmountError(amount, message);
    }
    if (message.includes('numeric string')) {
        return createInvalidAmountError(amount, AMOUNT_FORMAT_ERROR_MESSAGE);
    }
    return null;
}
/**
 * Handles Zod 'invalid_string' errors for amount values.
 *
 * Processes string validation failures (e.g., regex mismatches) and categorizes them:
 * 1. Negative numbers that pass Number() but fail other validations
 * 2. Decimal places validation failures (too many decimal places)
 * 3. Numeric format validation failures (invalid characters, comma decimals, thousand separators)
 * 4. Generic invalid number strings (must use dot decimal notation)
 *
 * Note: The SDK enforces strict dot-decimal notation. Comma decimals (e.g., "1,5") and
 * thousand separators (e.g., "1,000.50") are not allowed. UI layers should normalize
 * locale-specific formats before passing values to the SDK.
 *
 * @param code - The Zod error code (must be 'invalid_string')
 * @param message - The Zod error message from string validation
 * @param amount - The invalid amount value as a string
 * @returns KitError with context-specific message if pattern matches, null otherwise
 */
function handleInvalidStringAmountError(code, message, amount) {
    if (code !== 'invalid_string')
        return null;
    // Check for decimal places validation
    if (isDecimalPlacesError(message)) {
        return createInvalidAmountError(amount, AMOUNT_MAX_DECIMAL_PLACES_MESSAGE);
    }
    // Check for numeric format validation
    if (isNumericFormatError(message)) {
        return createInvalidAmountError(amount, AMOUNT_FORMAT_ERROR_MESSAGE);
    }
    // For other cases like 'abc', return specific error
    if (!message.includes('valid number format')) {
        return createInvalidAmountError(amount, AMOUNT_FORMAT_ERROR_MESSAGE);
    }
    return null;
}
/**
 * Handles Zod 'invalid_type' errors for amount values.
 *
 * Triggered when the amount is not a string type (e.g., number, boolean, object).
 * Creates an error indicating the amount must be a string representation of a number
 * using strict dot-decimal notation (no comma decimals or thousand separators).
 *
 * @param code - The Zod error code (must be 'invalid_type')
 * @param amount - The invalid amount value (will be converted to string for error message)
 * @returns KitError if this is a type mismatch, null otherwise
 */
function handleInvalidTypeAmountError(code, amount) {
    if (code === 'invalid_type') {
        return createInvalidAmountError(amount, AMOUNT_FORMAT_ERROR_MESSAGE);
    }
    return null;
}
/**
 * Checks if an error message indicates a decimal places validation failure.
 *
 * Looks for keywords like 'maximum', 'at most', and 'decimal places' to identify
 * errors related to too many decimal digits in an amount value.
 *
 * @param message - The error message to analyze
 * @returns True if the message indicates a decimal places error, false otherwise
 */
function isDecimalPlacesError(message) {
    return ((message.includes('maximum') || message.includes('at most')) &&
        message.includes('decimal places'));
}
/**
 * Checks if an error message indicates a numeric format validation failure.
 *
 * Identifies errors where a value contains 'numeric' but is not specifically
 * about 'valid number format' or 'numeric string' (to avoid false positives).
 *
 * @param message - The error message to analyze
 * @returns True if the message indicates a numeric format error, false otherwise
 */
function isNumericFormatError(message) {
    return (message.includes('numeric') &&
        !message.includes('valid number format') &&
        !message.includes('numeric string'));
}
/**
 * Handles chain-related validation errors from Zod.
 *
 * Checks if the validation error path includes 'chain' and extracts the
 * chain name from either the source (from) or destination (to) data.
 * Creates a KitError with the invalid chain name and original error message.
 *
 * @param path - The Zod error path (e.g., 'from.chain' or 'to.chain')
 * @param _code - The Zod error code (unused, prefixed with _ to indicate intentionally ignored)
 * @param message - The original Zod error message
 * @param fromData - The source/from data object (may contain chain info)
 * @param toData - The destination/to data object (may contain chain info)
 * @returns KitError with INPUT_INVALID_CHAIN code if this is a chain error, null otherwise
 */
function handleChainError(path, _code, message, fromData, toData) {
    if (!path.includes('chain'))
        return null;
    const chain = getChainName(fromData) ?? getChainName(toData);
    return createInvalidChainError(chain ?? 'unknown', message);
}
/**
 * Handles address-related validation errors from Zod.
 *
 * Checks if the validation error path includes 'address' and extracts both
 * the invalid address from the path and the target chain from the params.
 * Uses chain utilities to determine the expected address format (EVM or Solana)
 * and creates a context-specific error message.
 *
 * @param path - The Zod error path (e.g., 'to.recipientAddress')
 * @param _code - The Zod error code (unused, prefixed with _ to indicate intentionally ignored)
 * @param _message - The original Zod error message (unused, we create a more specific message)
 * @param paramsObj - The original params object for extracting address and chain info
 * @returns KitError with INPUT_INVALID_ADDRESS code if this is an address error, null otherwise
 */
function handleAddressError(path, _code, _message, paramsObj) {
    if (!path.toLowerCase().includes('address'))
        return null;
    const address = getAddressFromParams(paramsObj, path);
    const chain = getChainFromParams(paramsObj);
    const chainInfo = extractChainInfo(chain);
    return createInvalidAddressError(address, chainInfo.displayName, chainInfo.expectedAddressFormat);
}

/**
 * Validates data against a Zod schema with enhanced error reporting.
 *
 * This function performs validation using Zod schemas and provides detailed error
 * messages that include the validation context. It's designed to give developers
 * clear feedback about what went wrong during validation.
 *
 * @param value - The value to validate
 * @param schema - The Zod schema to validate against
 * @param context - Context string to include in error messages (e.g., 'bridge parameters')
 * @returns Asserts that value is of type T (type narrowing)
 * @throws {KitError} If validation fails with INPUT_VALIDATION_FAILED code (1098)
 *
 * @example
 * ```typescript
 * validate(params, BridgeParamsSchema, 'bridge parameters')
 * // After this call, TypeScript knows params is of type BridgeParams
 * ```
 */
function validate(value, schema, context) {
    const result = schema.safeParse(value);
    if (!result.success) {
        throw createValidationErrorFromZod(result.error, context);
    }
}

/**
 * Symbol used to track validation state on objects.
 * This allows us to attach metadata to objects without interfering with their structure,
 * enabling optimized validation by skipping already validated objects.
 * @internal
 */
const VALIDATION_STATE = Symbol('validationState');
/**
 * Validates data against a Zod schema with state tracking and enhanced error reporting.
 *
 * This function performs validation using Zod schemas while tracking validation state
 * and providing detailed error messages. It's designed for use in scenarios where
 * validation state needs to be monitored and reported.
 *
 * @param value - The value to validate
 * @param schema - The Zod schema to validate against
 * @param context - Context string to include in error messages (e.g., 'bridge parameters')
 * @param validatorName - Symbol identifying the validator for state tracking
 * @returns Asserts that value is of type T (type narrowing)
 * @throws {KitError} If validation fails with INPUT_VALIDATION_FAILED code (1098)
 *
 * @example
 * ```typescript
 * const result = validateWithStateTracking(BridgeParamsSchema, params, 'bridge parameters')
 * ```
 */
function validateWithStateTracking(value, schema, context, validatorName) {
    // Skip validation for null or undefined values
    if (value === null) {
        throw new KitError({
            ...InputError.VALIDATION_FAILED,
            recoverability: 'FATAL',
            message: `Invalid ${context}: Value is null`,
            cause: {
                trace: {
                    validationErrors: ['Value is null'],
                },
            },
        });
    }
    if (value === undefined) {
        throw new KitError({
            ...InputError.VALIDATION_FAILED,
            recoverability: 'FATAL',
            message: `Invalid ${context}: Value is undefined`,
            cause: {
                trace: {
                    validationErrors: ['Value is undefined'],
                },
            },
        });
    }
    // Ensure value is an object that can hold validation state
    if (typeof value !== 'object') {
        throw new KitError({
            ...InputError.VALIDATION_FAILED,
            recoverability: 'FATAL',
            message: `Invalid ${context}: Value must be an object`,
            cause: {
                trace: {
                    validationErrors: [`Value must be an object, got ${typeof value}`],
                },
            },
        });
    }
    // Get or initialize validation state
    const valueWithState = value;
    const state = valueWithState[VALIDATION_STATE] ?? { validatedBy: [] };
    // Skip validation if already validated by this validator
    if (state.validatedBy.includes(validatorName)) {
        return;
    }
    // Delegate to the validate function for actual validation (now throws KitError)
    validate(value, schema, context);
    // Update validation state
    state.validatedBy.push(validatorName);
    valueWithState[VALIDATION_STATE] = state;
}

/**
 * Zod schema for validating chain definition objects used in buildExplorerUrl.
 * This schema ensures the chain definition has the required properties for URL generation.
 */
const chainDefinitionSchema = zod.z.object({
    name: zod.z
        .string({
        required_error: 'Chain name is required',
        invalid_type_error: 'Chain name must be a string',
    })
        .min(1, 'Chain name cannot be empty'),
    explorerUrl: zod.z
        .string({
        required_error: 'Explorer URL template is required',
        invalid_type_error: 'Explorer URL template must be a string',
    })
        .min(1, 'Explorer URL template cannot be empty')
        .refine((url) => url.includes('{hash}'), 'Explorer URL template must contain a {hash} placeholder'),
});
/**
 * Zod schema for validating transaction hash strings used in buildExplorerUrl.
 * This schema ensures the transaction hash is a non-empty string.
 */
const transactionHashSchema = zod.z
    .string({
    required_error: 'Transaction hash is required',
    invalid_type_error: 'Transaction hash must be a string',
})
    .min(1, 'Transaction hash cannot be empty')
    .transform((hash) => hash.trim()) // Automatically trim whitespace
    .refine((hash) => hash.length > 0, 'Transaction hash must not be empty or whitespace-only');
/**
 * Zod schema for validating buildExplorerUrl function parameters.
 * This schema validates both the chain definition and transaction hash together.
 */
zod.z.object({
    chainDef: chainDefinitionSchema,
    txHash: transactionHashSchema,
});
/**
 * Zod schema for validating the generated explorer URL.
 * This schema ensures the generated URL is valid.
 */
zod.z
    .string()
    .url('Generated explorer URL is invalid');

/**
 * A type-safe event emitter for managing action-based event subscriptions.
 *
 * Actionable provides a strongly-typed publish/subscribe pattern for events,
 * where each event (action) has its own specific payload type. Handlers can
 * subscribe to specific events or use a wildcard to receive all events.
 *
 * @typeParam AllActions - A record mapping action names to their payload types.
 *
 * @example
 * ```typescript
 * import { Actionable } from '@circle-fin/bridge-kit/utils';
 *
 * // Define your action types
 * type TransferActions = {
 *   started: { txHash: string; amount: string };
 *   completed: { txHash: string; destinationTxHash: string };
 *   failed: { error: Error };
 * };
 *
 * // Create an actionable instance
 * const transferEvents = new Actionable<TransferActions>();
 *
 * // Subscribe to a specific event
 * transferEvents.on('completed', (payload) => {
 *   console.log(`Transfer completed with hash: ${payload.destinationTxHash}`);
 * });
 *
 * // Subscribe to all events
 * transferEvents.on('*', (payload) => {
 *   console.log('Event received:', payload);
 * });
 *
 * // Dispatch an event
 * transferEvents.dispatch('completed', {
 *   txHash: '0x123',
 *   destinationTxHash: '0xabc'
 * });
 * ```
 */
class Actionable {
    // Store event handlers by action key
    handlers = {};
    // Store wildcard handlers that receive all events
    wildcard = [];
    // Implementation that handles both overloads
    on(action, handler) {
        if (action === '*') {
            // Add to wildcard handlers array
            this.wildcard.push(handler);
        }
        else {
            // Initialize the action's handler array if it doesn't exist
            if (!this.handlers[action]) {
                this.handlers[action] = [];
            }
            // Add the handler to the specific action's array
            this.handlers[action].push(handler);
        }
    }
    // Implementation that handles both overloads
    off(action, handler) {
        if (action === '*') {
            // Find and remove the handler from wildcard array
            const index = this.wildcard.indexOf(handler);
            if (index !== -1) {
                this.wildcard.splice(index, 1);
            }
        }
        else if (this.handlers[action]) {
            // Check if there are handlers for this action
            // Find and remove the specific handler
            const index = this.handlers[action].indexOf(handler);
            if (index !== -1) {
                this.handlers[action].splice(index, 1);
            }
        }
    }
    /**
     * Dispatch an action with its payload to all registered handlers.
     *
     * This method notifies both:
     * - Handlers registered specifically for this action
     * - Wildcard handlers registered for all actions
     *
     * @param action - The action key identifying the event type.
     * @param payload - The data associated with the action.
     *
     * @example
     * ```typescript
     * type Actions = {
     *   transferStarted: { amount: string; destination: string };
     *   transferComplete: { txHash: string };
     * };
     *
     * const events = new Actionable<Actions>();
     *
     * // Dispatch an event
     * events.dispatch('transferStarted', {
     *   amount: '100',
     *   destination: '0xABC123'
     * });
     * ```
     */
    dispatch(action, payload) {
        // Execute all handlers registered for this specific action
        for (const h of this.handlers[action] ?? [])
            h(payload);
        // Execute all wildcard handlers
        for (const h of this.wildcard)
            h(payload);
    }
}

/**
 * Convert a value from its smallest unit representation to a human-readable decimal string.
 *
 * This function normalizes token values from their blockchain representation (where
 * everything is stored as integers in the smallest denomination) to human-readable
 * decimal format. Uses the battle-tested implementation from @ethersproject/units.
 *
 * @param value - The value in smallest units (e.g., "1000000" for 1 USDC with 6 decimals)
 * @param decimals - The number of decimal places for the unit conversion
 * @returns A human-readable decimal string (e.g., "1.0")
 * @throws Error if the value is not a valid numeric string
 *
 * @example
 * ```typescript
 * import { formatUnits } from '@core/utils'
 *
 * // Format USDC (6 decimals)
 * const usdcFormatted = formatUnits('1000000', 6)
 * console.log(usdcFormatted) // "1.0"
 *
 * // Format ETH (18 decimals)
 * const ethFormatted = formatUnits('1000000000000000000', 18)
 * console.log(ethFormatted) // "1.0"
 *
 * // Format with fractional part
 * const fractionalFormatted = formatUnits('1500000', 6)
 * console.log(fractionalFormatted) // "1.5"
 * ```
 */
const formatUnits = (value, decimals) => {
    return units.formatUnits(value, decimals);
};
/**
 * Convert a human-readable decimal string to its smallest unit representation.
 *
 * This function converts user-friendly decimal values into the integer representation
 * required by blockchain operations, where all values are stored in the smallest
 * denomination. Uses the battle-tested implementation from @ethersproject/units.
 *
 * @param value - The decimal string to convert (e.g., "1.0")
 * @param decimals - The number of decimal places for the unit conversion
 * @returns The value in smallest units as a bigint (e.g., 1000000n for 1 USDC with 6 decimals)
 * @throws Error if the value is not a valid decimal string
 *
 * @example
 * ```typescript
 * import { parseUnits } from '@core/utils'
 *
 * // Parse USDC (6 decimals)
 * const usdcParsed = parseUnits('1.0', 6)
 * console.log(usdcParsed) // 1000000n
 *
 * // Parse ETH (18 decimals)
 * const ethParsed = parseUnits('1.0', 18)
 * console.log(ethParsed) // 1000000000000000000n
 *
 * // Parse fractional amount
 * const fractionalParsed = parseUnits('1.5', 6)
 * console.log(fractionalParsed) // 1500000n
 *
 * // Parse integer (no decimal point)
 * const integerParsed = parseUnits('42', 6)
 * console.log(integerParsed) // 42000000n
 * ```
 */
const parseUnits = (value, decimals) => {
    return units.parseUnits(value, decimals).toBigInt();
};

/**
 * Format a token amount into a human-readable decimal string.
 *
 * Accepts a smallest-unit string and either assumes USDC's 6 decimals or derives the
 * native decimals from the provided chain definition. Delegates to {@link formatUnits}
 * to preserve consistent rounding and formatting behaviour across the SDK.
 *
 * @remarks
 * When `token` is `'native'`, supply a chain identifier that {@link resolveChainIdentifier}
 * can resolve so the native currency decimals can be determined.
 *
 * @param params - The formatting input including the raw value and token selector.
 * @returns The decimal string representation of the amount.
 * @throws Error if the value cannot be parsed or if the chain identifier is unknown.
 *
 * @example
 * ```typescript
 * import { formatAmount } from '@core/utils'
 * import { Ethereum } from '@core/chains'
 *
 * const usdcAmount = formatAmount({ value: '1000000', token: 'USDC' })
 * console.log(usdcAmount) // "1"
 *
 * const ethAmount = formatAmount({
 *   value: '3141592000000000000',
 *   token: 'native',
 *   chain: Ethereum,
 * })
 * console.log(ethAmount) // "3.141592"
 * ```
 */
const formatAmount = (params) => {
    const { value, token } = params;
    switch (token) {
        case 'USDC':
            return formatUnits(value, 6);
        case 'native':
            return formatUnits(value, resolveChainIdentifier(params.chain).nativeCurrency.decimals);
        default:
            // This will cause a compile-time error if a new token type is added to
            // `FormatAmountParams` but not handled in this switch statement, ensuring exhaustiveness.
            throw new Error(`formatAmount: Unhandled token type: ${token}`);
    }
};

/**
 * Parse a human-readable token amount into its smallest unit representation.
 *
 * Accepts a decimal string and either assumes USDC's 6 decimals or derives the
 * native decimals from the provided chain definition. Delegates to {@link parseUnits}
 * to preserve deterministic rounding and bigint conversions across the SDK.
 *
 * @remarks
 * When `token` is `'native'`, supply a chain identifier that {@link resolveChainIdentifier}
 * can resolve so the native currency decimals can be determined.
 *
 * @param params - The parsing input including the amount value, token, and optional chain identifier.
 * @returns The bigint representation of the amount in smallest units.
 * @throws Error if the value cannot be parsed or if the chain identifier is unknown.
 *
 * @example
 * ```typescript
 * import { parseAmount } from '@core/utils'
 * import { Ethereum } from '@core/chains'
 *
 * const usdcAmount = parseAmount({ value: '1', token: 'USDC' })
 * console.log(usdcAmount) // 1000000n
 *
 * const ethAmount = parseAmount({
 *   value: '3.141592',
 *   token: 'native',
 *   chain: Ethereum,
 * })
 * console.log(ethAmount) // 3141592000000000000n
 * ```
 */
const parseAmount = (params) => {
    const { value, token } = params;
    switch (token) {
        case 'USDC':
            return parseUnits(value, 6);
        case 'native':
            return parseUnits(value, resolveChainIdentifier(params.chain).nativeCurrency.decimals);
        default:
            // This will cause a compile-time error if a new token type is added to
            // `FormatAmountParams` but not handled in this switch statement, ensuring exhaustiveness.
            throw new Error(`parseAmount: Unhandled token type: ${token}`);
    }
};

var name = "@circle-fin/bridge-kit";
var version = "1.5.0";
var pkg = {
	name: name,
	version: version};

const assertCustomFeePolicySymbol = Symbol('assertCustomFeePolicy');
/**
 * Schema for validating BridgeKit custom fee policy.
 *
 * Validates the shape of {@link CustomFeePolicy}, which lets SDK consumers
 * provide custom fee calculation and fee-recipient resolution logic.
 *
 * - computeFee: optional function (recommended) that receives human-readable amounts
 *   and returns a fee as a string (or Promise<string>).
 * - calculateFee: optional function (deprecated) that receives smallest-unit amounts
 *   and returns a fee as a string (or Promise<string>).
 * - resolveFeeRecipientAddress: required function that returns a recipient address as a
 *   string (or Promise<string>).
 *
 * Exactly one of `computeFee` or `calculateFee` must be provided (not both).
 *
 * This schema only ensures the presence and return types of the functions; it
 * does not validate their argument types.
 *
 * @example
 * ```ts
 * const config = {
 *   computeFee: async () => '1', // 1 USDC (human-readable)
 *   resolveFeeRecipientAddress: () => '0x1234567890123456789012345678901234567890',
 * }
 * const result = customFeePolicySchema.safeParse(config)
 * // result.success === true
 * ```
 */
const customFeePolicySchema = zod.z
    .object({
    computeFee: zod.z
        .function()
        .returns(zod.z.string().or(zod.z.promise(zod.z.string())))
        .optional(),
    calculateFee: zod.z
        .function()
        .returns(zod.z.string().or(zod.z.promise(zod.z.string())))
        .optional(),
    resolveFeeRecipientAddress: zod.z
        .function()
        .returns(zod.z.string().or(zod.z.promise(zod.z.string()))),
})
    .strict()
    .refine((data) => {
    const hasComputeFee = data.computeFee !== undefined;
    const hasCalculateFee = data.calculateFee !== undefined;
    // XOR: exactly one must be provided
    return hasComputeFee !== hasCalculateFee;
}, {
    message: 'Provide either computeFee or calculateFee, not both. Use computeFee (recommended) for human-readable amounts.',
});
/**
 * Assert that the provided value conforms to {@link CustomFeePolicy}.
 *
 * Throws a validation error with annotated paths if the configuration is
 * malformed.
 *
 * @param config - The custom fee policy to validate
 *
 * @example
 * ```ts
 * const config = {
 *   computeFee: () => '1', // 1 USDC (human-readable)
 *   resolveFeeRecipientAddress: () => '0x1234567890123456789012345678901234567890',
 * }
 * assertCustomFeePolicy(config)
 * // If no error is thrown, `config` is a valid CustomFeePolicy
 * ```
 */
function assertCustomFeePolicy(config) {
    validateWithStateTracking(config, customFeePolicySchema, 'BridgeKit custom fee policy', assertCustomFeePolicySymbol);
}

/**
 * Symbol used to track that assertBridgeParams has validated an object.
 * @internal
 */
const ASSERT_BRIDGE_PARAMS_SYMBOL = Symbol('assertBridgeParams');
/**
 * Validates that source and destination chains are both testnet or both mainnet.
 * @param fromData - Source chain data
 * @param toData - Destination chain data
 * @throws KitError If networks are mismatched
 * @internal
 */
function validateNetworkMatch(fromData, toData) {
    if (!isChainWithTestnet(fromData['chain']) ||
        !isChainWithTestnet(toData['chain']) ||
        fromData['chain'].isTestnet === toData['chain'].isTestnet) {
        return;
    }
    throw new KitError({
        ...InputError.NETWORK_MISMATCH,
        recoverability: 'FATAL',
        message: `Cannot bridge between ${fromData['chain'].name} (${fromData['chain'].isTestnet ? 'testnet' : 'mainnet'}) and ${toData['chain'].name} (${toData['chain'].isTestnet ? 'testnet' : 'mainnet'}). Source and destination networks must both be testnet or both be mainnet.`,
        cause: {
            trace: {
                fromChain: fromData['chain'].name,
                toChain: toData['chain'].name,
                fromIsTestnet: fromData['chain'].isTestnet,
                toIsTestnet: toData['chain'].isTestnet,
            },
        },
    });
}
/**
 * Validates that the address format matches the destination chain requirements.
 * @param toData - Destination chain data containing address
 * @throws KitError If address format is invalid for the chain
 * @internal
 */
function validateAddressFormat(toData) {
    if (typeof toData['address'] !== 'string') {
        return;
    }
    const address = toData['address'];
    const chain = getChainFromToData(toData);
    if (chain !== null && !isValidAddressForChain(address, chain)) {
        const chainInfo = extractChainInfo(chain);
        throw createInvalidAddressError(address, chainInfo.displayName, chainInfo.expectedAddressFormat);
    }
}
function assertBridgeParams(params, schema) {
    // Use validateWithStateTracking to avoid duplicate validations
    // This will skip validation if already validated by this function
    try {
        validateWithStateTracking(params, schema, 'bridge parameters', ASSERT_BRIDGE_PARAMS_SYMBOL);
    }
    catch (error) {
        // Convert generic KitError validation failure to structured KitError with specific codes
        if (error instanceof KitError &&
            error.code === InputError.VALIDATION_FAILED.code) {
            // Re-parse to get the underlying Zod error for enhanced error mapping
            const result = schema.safeParse(params);
            if (!result.success) {
                throw convertZodErrorToStructured(result.error, params);
            }
        }
        // Re-throw if it's not a validation error or couldn't be parsed
        throw error;
    }
    // Additional business logic checks that Zod cannot handle
    const typedParams = params;
    const fromData = extractFromData(typedParams);
    const toData = extractToData(typedParams);
    // Check for network mismatch if both chains have isTestnet property
    if (fromData && toData) {
        validateNetworkMatch(fromData, toData);
    }
    // Address format validation with chain context (if address provided)
    if (toData) {
        validateAddressFormat(toData);
    }
}

/**
 * Schema for validating hexadecimal strings with '0x' prefix.
 *
 * This schema validates that a string:
 * - Is a string type
 * - Is not empty after trimming
 * - Starts with '0x'
 * - Contains only valid hexadecimal characters (0-9, a-f, A-F) after '0x'
 *
 * @remarks
 * This schema does not validate length, making it suitable for various hex string types
 * like addresses, transaction hashes, and other hex-encoded data.
 *
 * @throws {KitError} If validation fails with INPUT_VALIDATION_FAILED code (1098), with details about which properties failed
 *
 * @example
 * ```typescript
 * import { hexStringSchema } from '@core/adapter'
 *
 * const validAddress = '0x1234567890123456789012345678901234567890'
 * const validTxHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
 *
 * const addressResult = hexStringSchema.safeParse(validAddress)
 * const txHashResult = hexStringSchema.safeParse(validTxHash)
 * console.log(addressResult.success) // true
 * console.log(txHashResult.success) // true
 * ```
 */
const hexStringSchema = zod.z
    .string()
    .min(1, 'Hex string is required')
    .refine((value) => value.trim().length > 0, 'Hex string cannot be empty')
    .refine((value) => value.startsWith('0x'), 'Hex string must start with 0x prefix')
    .refine((value) => {
    const hexPattern = /^0x[0-9a-fA-F]+$/;
    return hexPattern.test(value);
}, 'Hex string contains invalid characters. Only hexadecimal characters (0-9, a-f, A-F) are allowed after 0x');
/**
 * Schema for validating EVM addresses.
 *
 * This schema validates that a string is a properly formatted EVM address:
 * - Must be a valid hex string with '0x' prefix
 * - Must be exactly 42 characters long (0x + 40 hex characters)
 *
 * @throws {KitError} If validation fails with INPUT_VALIDATION_FAILED code (1098), with details about which properties failed
 *
 * @example
 * ```typescript
 * import { evmAddressSchema } from '@core/adapter'
 *
 * const validAddress = '0x1234567890123456789012345678901234567890'
 *
 * const result = evmAddressSchema.safeParse(validAddress)
 * console.log(result.success) // true
 * ```
 */
hexStringSchema.refine((value) => value.length === 42, 'EVM address must be exactly 42 characters long (0x + 40 hex characters)');
/**
 * Schema for validating transaction hashes.
 *
 * This schema validates that a string is a properly formatted transaction hash:
 * - Must be a valid hex string with '0x' prefix
 * - Must be exactly 66 characters long (0x + 64 hex characters)
 *
 * @throws {KitError} If validation fails with INPUT_VALIDATION_FAILED code (1098), with details about which properties failed
 *
 * @example
 * ```typescript
 * import { evmTransactionHashSchema } from '@core/adapter'
 *
 * const validTxHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
 *
 * const result = evmTransactionHashSchema.safeParse(validTxHash)
 * console.log(result.success) // true
 * ```
 */
hexStringSchema.refine((value) => value.length === 66, 'Transaction hash must be exactly 66 characters long (0x + 64 hex characters)');
/**
 * Schema for validating base58-encoded strings.
 *
 * This schema validates that a string:
 * - Is a string type
 * - Is not empty after trimming
 * - Contains only valid base58 characters (1-9, A-H, J-N, P-Z, a-k, m-z)
 * - Does not contain commonly confused characters (0, O, I, l)
 *
 * @remarks
 * This schema does not validate length, making it suitable for various base58-encoded data
 * like Solana addresses, transaction signatures, and other base58-encoded data.
 *
 * @throws {KitError} If validation fails with INPUT_VALIDATION_FAILED code (1098), with details about which properties failed
 *
 * @example
 * ```typescript
 * import { base58StringSchema } from '@core/adapter'
 *
 * const validAddress = 'DhzPkKCLJGHBZbs1AzmK2tRNLZkV8J3yWF3LuWMuKJpN'
 * const validTxHash = '3Jf8k2L5mN9pQ7rS1tV4wX6yZ8aB2cD4eF5gH7iJ9kL1mN3oP5qR7sT9uV1wX3yZ5'
 *
 * const addressResult = base58StringSchema.safeParse(validAddress)
 * const txHashResult = base58StringSchema.safeParse(validTxHash)
 * console.log(addressResult.success) // true
 * console.log(txHashResult.success) // true
 * ```
 */
const base58StringSchema = zod.z
    .string()
    .min(1, 'Base58 string is required')
    .refine((value) => value.trim().length > 0, 'Base58 string cannot be empty')
    .refine((value) => {
    // Base58 alphabet: 123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz
    // Excludes: 0, O, I, l to avoid confusion
    const base58Pattern = /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/;
    return base58Pattern.test(value);
}, 'Base58 string contains invalid characters. Only base58 characters (1-9, A-H, J-N, P-Z, a-k, m-z) are allowed');
/**
 * Schema for validating Solana addresses.
 *
 * This schema validates that a string is a properly formatted Solana address:
 * - Must be a valid base58-encoded string
 * - Must be between 32-44 characters long (typical length for base58-encoded 32-byte addresses)
 *
 * @throws {KitError} If validation fails with INPUT_VALIDATION_FAILED code (1098), with details about which properties failed
 *
 * @example
 * ```typescript
 * import { solanaAddressSchema } from '@core/adapter'
 *
 * const validAddress = 'DhzPkKCLJGHBZbs1AzmK2tRNLZkV8J3yWF3LuWMuKJpN'
 *
 * const result = solanaAddressSchema.safeParse(validAddress)
 * console.log(result.success) // true
 * ```
 */
base58StringSchema.refine((value) => value.length >= 32 && value.length <= 44, 'Solana address must be between 32-44 characters long (base58-encoded 32-byte address)');
/**
 * Schema for validating Solana transaction hashes.
 *
 * This schema validates that a string is a properly formatted Solana transaction hash:
 * - Must be a valid base58-encoded string
 * - Must be between 86-88 characters long (typical length for base58-encoded 64-byte signatures)
 *
 * @throws {KitError} If validation fails with INPUT_VALIDATION_FAILED code (1098), with details about which properties failed
 *
 * @example
 * ```typescript
 * import { solanaTransactionHashSchema } from '@core/adapter'
 *
 * const validTxHash = '5VfYmGBjvQKe3xgLtTQPSMEUdpEVHrJwLK7pKBJWKzYpNBE2g3kJrq7RSe9M8DqzQJ5J2aZPTjHLvd4WgxPpJKS'
 *
 * const result = solanaTransactionHashSchema.safeParse(validTxHash)
 * console.log(result.success) // true
 * ```
 */
base58StringSchema.refine((value) => value.length >= 86 && value.length <= 88, 'Solana transaction hash must be between 86-88 characters long (base58-encoded 64-byte signature)');
/**
 * Schema for validating Adapter objects.
 * Checks for the required methods that define an Adapter.
 */
const adapterSchema = zod.z.object({
    prepare: zod.z.function(),
    waitForTransaction: zod.z.function(),
    getAddress: zod.z.function(),
});

/**
 * Transfer speed options for cross-chain operations.
 *
 * Defines the available speed modes for CCTPv2 transfers, affecting
 * both transfer time and potential fee implications.
 */
exports.TransferSpeed = void 0;
(function (TransferSpeed) {
    /** Fast burn mode - reduces transfer time but may have different fee implications */
    TransferSpeed["FAST"] = "FAST";
    /** Standard burn mode - normal transfer time with standard fees */
    TransferSpeed["SLOW"] = "SLOW";
})(exports.TransferSpeed || (exports.TransferSpeed = {}));

/**
 * Factory to validate a numeric string with strict dot-decimal notation.
 * Only accepts dot (.) as the decimal separator. Thousand separators are not allowed.
 *
 * This enforces an unambiguous format for SDK inputs. Internationalization concerns
 * (comma vs dot decimal separators) should be handled in the UI layer before passing
 * values to the SDK.
 *
 * Accepts the following formats:
 * - Whole numbers: "1", "100", "1000"
 * - Leading zero decimals: "0.1", "0.5", "0.001"
 * - Shorthand decimals: ".1", ".5", ".001"
 * - Standard decimals: "1.23", "100.50"
 *
 * Does NOT accept:
 * - Comma decimal separator: "1,5" (use "1.5" instead)
 * - Thousand separators: "1,000.50" or "1.000,50" (use "1000.50" instead)
 * - Multiple decimal points: "1.2.3"
 * - Negative numbers: "-100"
 * - Non-numeric characters: "abc", "100a"
 *
 * Behavior differences controlled by options:
 * - allowZero: when false, value must be strictly greater than 0; when true, non-negative.
 * - regexMessage: error message when the basic numeric format fails.
 * - maxDecimals: maximum number of decimal places allowed (e.g., 6 for USDC).
 */
const createDecimalStringValidator = (options) => (schema) => {
    // Capitalize first letter of attribute name for error messages
    const capitalizedAttributeName = options.attributeName.charAt(0).toUpperCase() +
        options.attributeName.slice(1);
    return schema
        .regex(/^-?(?:\d+(?:\.\d+)?|\.\d+)$/, options.regexMessage)
        .superRefine((val, ctx) => {
        const amount = Number.parseFloat(val);
        if (Number.isNaN(amount)) {
            ctx.addIssue({
                code: zod.z.ZodIssueCode.custom,
                message: options.regexMessage,
            });
            return;
        }
        // Check decimal precision if maxDecimals is specified
        if (options.maxDecimals !== undefined) {
            const decimalPart = val.split('.')[1];
            if (decimalPart && decimalPart.length > options.maxDecimals) {
                ctx.addIssue({
                    code: zod.z.ZodIssueCode.custom,
                    message: `Maximum supported decimal places: ${options.maxDecimals.toString()}`,
                });
                return;
            }
        }
        if (options.allowZero && amount < 0) {
            ctx.addIssue({
                code: zod.z.ZodIssueCode.custom,
                message: `${capitalizedAttributeName} must be non-negative`,
            });
        }
        else if (!options.allowZero && amount <= 0) {
            ctx.addIssue({
                code: zod.z.ZodIssueCode.custom,
                message: `${capitalizedAttributeName} must be greater than 0`,
            });
        }
    });
};
/**
 * Schema for validating chain definitions.
 * This ensures the basic structure of a chain definition is valid.
 * A chain definition must include at minimum a name and type.
 *
 * @throws KitError if validation fails
 *
 * @example
 * ```typescript
 * import { chainDefinitionSchema } from '@core/provider'
 *
 * const validChain = {
 *   name: 'Ethereum',
 *   type: 'evm'
 * }
 *
 * const result = chainDefinitionSchema.safeParse(validChain)
 * console.log(result.success) // true
 * ```
 */
zod.z.object({
    name: zod.z.string().min(1, 'Chain name is required'),
    type: zod.z.string().min(1, 'Chain type is required'),
});
/**
 * Schema for validating wallet contexts.
 * This ensures all required fields are present and properly typed.
 * A wallet context must include:
 * - A valid adapter with prepare and execute methods
 * - A valid Ethereum address
 * - A valid chain definition with required properties
 *
 * @throws KitError if validation fails
 *
 * @example
 * ```typescript
 * import { walletContextSchema } from '@core/provider'
 *
 * const validContext = {
 *   adapter: {
 *     prepare: () => Promise.resolve({}),
 *     waitForTransaction: () => Promise.resolve({})
 *   },
 *   address: '0x1234567890123456789012345678901234567890',
 *   chain: {
 *     name: 'Ethereum',
 *     type: 'evm',
 *     isTestnet: false
 *   }
 * }
 *
 * const result = walletContextSchema.safeParse(validContext)
 * console.log(result.success) // true
 * ```
 */
const walletContextSchema = zod.z.object({
    adapter: zod.z.object({
        prepare: zod.z.function().returns(zod.z.any()),
        waitForTransaction: zod.z.function().returns(zod.z.any()),
    }),
    address: zod.z.string().min(1),
    chain: zod.z.object({
        name: zod.z.string(),
        type: zod.z.string(),
        isTestnet: zod.z.boolean(),
    }),
});
/**
 * Schema for validating a custom fee configuration.
 * Validates the simplified CustomFee interface which includes:
 * - An optional fee amount as string
 * - An optional fee recipient as string address
 *
 * @throws KitError if validation fails
 *
 * @example
 * ```typescript
 * import { customFeeSchema } from '@core/provider'
 *
 * const validConfig = {
 *   value: '1000000',
 *   recipientAddress: '0x1234567890123456789012345678901234567890'
 * }
 *
 * const result = customFeeSchema.safeParse(validConfig)
 * console.log(result.success) // true
 * ```
 */
const customFeeSchema = zod.z
    .object({
    /**
     * The fee to charge for the transfer as string.
     * Must be a non-negative value using dot (.) as decimal separator,
     * with no thousand separators or comma decimals.
     */
    value: createDecimalStringValidator({
        allowZero: true,
        regexMessage: 'Value must be a non-negative numeric string with dot (.) as decimal separator, with no thousand separators or comma decimals.',
        attributeName: 'value',
    })(zod.z.string()).optional(),
    /**
     * The fee recipient address.
     * Must be a valid address string.
     */
    recipientAddress: zod.z
        .string()
        .trim()
        .min(1, 'Fee recipient must be a non-empty string')
        .optional(),
})
    .strict();
/**
 * Schema for validating bridge parameters.
 * This ensures all required fields are present and properly typed.
 * A bridge must include:
 * - A valid amount (non-empty numeric string \> 0)
 * - Valid source and destination wallet contexts
 * - USDC as the token
 * - Optional config with transfer speed and max fee settings
 *
 * @throws KitError if validation fails
 *
 * @example
 * ```typescript
 * import { bridgeParamsSchema } from '@core/provider'
 *
 * const validBridge = {
 *   amount: '100.50',
 *   source: {
 *     adapter: sourceAdapter,
 *     address: '0xSourceAddress',
 *     chain: sourceChain
 *   },
 *   destination: {
 *     adapter: destAdapter,
 *     address: '0xDestAddress',
 *     chain: destChain
 *   },
 *   token: 'USDC',
 *   config: {
 *     transferSpeed: 'FAST',
 *     maxFee: '1.5', // Must use dot as decimal separator
 *     customFee: {
 *       value: '0.5', // Must use dot as decimal separator
 *       recipientAddress: '0x1234567890123456789012345678901234567890'
 *     }
 *   }
 * }
 *
 * const result = bridgeParamsSchema.safeParse(validBridge)
 * console.log(result.success) // true
 * ```
 */
zod.z.object({
    amount: zod.z
        .string()
        .min(1, 'Required')
        .pipe(createDecimalStringValidator({
        allowZero: false,
        regexMessage: AMOUNT_FORMAT_ERROR_MESSAGE,
        attributeName: 'amount',
        maxDecimals: 6,
    })(zod.z.string())),
    source: walletContextSchema,
    destination: walletContextSchema,
    token: zod.z.literal('USDC'),
    config: zod.z.object({
        transferSpeed: zod.z.nativeEnum(exports.TransferSpeed).optional(),
        maxFee: zod.z
            .string()
            .pipe(createDecimalStringValidator({
            allowZero: true,
            regexMessage: MAX_FEE_FORMAT_ERROR_MESSAGE,
            attributeName: 'maxFee',
            maxDecimals: 6,
        })(zod.z.string()))
            .optional(),
        customFee: customFeeSchema.optional(),
    }),
});

/**
 * Schema for validating AdapterContext for bridge operations.
 * Must always contain both adapter and chain explicitly.
 *
 * Optionally includes address for developer-controlled adapters.
 */
const adapterContextSchema = zod.z.object({
    adapter: adapterSchema,
    chain: bridgeChainIdentifierSchema,
    address: zod.z.string().optional(),
});
/**
 * Schema for validating BridgeDestinationWithAddress objects.
 * Contains an explicit recipientAddress along with adapter and chain.
 * The address format is validated based on the chain type (EVM or Solana).
 */
const bridgeDestinationWithAddressSchema = adapterContextSchema
    .extend({
    recipientAddress: zod.z.string().min(1, 'Recipient address is required'),
})
    .superRefine((data, ctx) => {
    const chain = data.chain;
    if (chain === null) {
        return;
    }
    if (!isValidAddressForChain(data.recipientAddress, chain)) {
        const chainInfo = extractChainInfo(chain);
        ctx.addIssue({
            code: zod.z.ZodIssueCode.custom,
            path: ['recipientAddress'],
            message: `Invalid address format for ${String(chainInfo.name)}. Expected ${chainInfo.expectedAddressFormat}, but received: ${data.recipientAddress}`,
        });
    }
});
/**
 * Schema for validating BridgeDestination union type.
 * Can be an AdapterContext or BridgeDestinationWithAddress.
 *
 * The order matters: we check the more specific schema (with recipientAddress) first.
 * This ensures that objects with an empty recipientAddress field are rejected rather
 * than silently treated as AdapterContext with the field ignored.
 */
const bridgeDestinationSchema = zod.z.union([
    bridgeDestinationWithAddressSchema,
    adapterContextSchema.strict(),
]);
/**
 * Schema for validating bridge parameters with chain identifiers.
 * This extends the core provider's schema but adapts it for the bridge kit's
 * more flexible interface that accepts chain identifiers.
 *
 * The schema validates:
 * - From adapter context (must always include both adapter and chain)
 * - To bridge destination (AdapterContext or BridgeDestinationWithAddress)
 * - Amount is a non-empty numeric string \> 0
 * - Token is optional and defaults to 'USDC'
 * - Optional config parameters (transfer speed, max fee)
 *
 * @example
 * ```typescript
 * import { bridgeParamsWithChainIdentifierSchema } from '@circle-fin/bridge-kit'
 *
 * const params = {
 *   from: {
 *     adapter: sourceAdapter,
 *     chain: 'Ethereum'
 *   },
 *   to: {
 *     adapter: destAdapter,
 *     chain: 'Base'
 *   },
 *   amount: '100.50',
 *   token: 'USDC',
 *   config: {
 *     transferSpeed: 'FAST'
 *   }
 * }
 *
 * const result = bridgeParamsWithChainIdentifierSchema.safeParse(params)
 * if (result.success) {
 *   console.log('Parameters are valid')
 * } else {
 *   console.error('Validation failed:', result.error)
 * }
 * ```
 */
const bridgeParamsWithChainIdentifierSchema = zod.z.object({
    from: adapterContextSchema.strict(),
    to: bridgeDestinationSchema,
    amount: zod.z
        .string()
        .min(1, 'Required')
        .pipe(createDecimalStringValidator({
        allowZero: false,
        regexMessage: AMOUNT_FORMAT_ERROR_MESSAGE,
        attributeName: 'amount',
        maxDecimals: 6,
    })(zod.z.string())),
    token: zod.z.literal('USDC').optional(),
    config: zod.z
        .object({
        transferSpeed: zod.z.nativeEnum(exports.TransferSpeed).optional(),
        maxFee: zod.z
            .string()
            .min(1, 'Required')
            .pipe(createDecimalStringValidator({
            allowZero: true,
            regexMessage: MAX_FEE_FORMAT_ERROR_MESSAGE,
            attributeName: 'maxFee',
            maxDecimals: 6,
        })(zod.z.string()))
            .optional(),
        customFee: customFeeSchema.optional(),
    })
        .optional(),
});

/**
 * Resolves a chain identifier to a chain definition.
 *
 * Both AdapterContext and BridgeDestinationWithAddress have the chain property
 * at the top level, so we can directly access it from either type.
 *
 * @param ctx - The bridge destination containing the chain identifier
 * @returns The resolved chain definition
 * @throws If the chain definition cannot be resolved
 *
 * @example
 * ```typescript
 * import { Blockchain } from '@core/chains'
 *
 * // AdapterContext
 * const chain1 = resolveChainDefinition({
 *   adapter: mockAdapter,
 *   chain: 'Ethereum'
 * })
 *
 * // BridgeDestinationWithAddress
 * const chain2 = resolveChainDefinition({
 *   adapter: mockAdapter,
 *   chain: 'Base',
 *   recipientAddress: '0x123...'
 * })
 * ```
 */
function resolveChainDefinition(ctx) {
    return resolveChainIdentifier(ctx.chain);
}
/**
 * Resolves the signer's address from a bridge destination.
 *
 * This function resolves the address that will be used for transaction signing,
 * ignoring any `recipientAddress` field which is handled separately.
 *
 * It handles two cases:
 * - Developer-controlled adapters - returns the explicit address from context
 * - User-controlled adapters - calls getAddress() on the adapter
 *
 * @param ctx - The bridge destination to resolve the address from
 * @returns The resolved signer address string
 *
 * @example
 * ```typescript
 * // Developer-controlled adapter
 * const addr1 = await resolveAddress({
 *   adapter: devAdapter,
 *   chain: 'Ethereum',
 *   address: '0x1234567890123456789012345678901234567890'
 * }) // Returns: '0x1234567890123456789012345678901234567890'
 *
 * // User-controlled adapter
 * const addr2 = await resolveAddress({
 *   adapter: userAdapter,
 *   chain: 'Ethereum'
 * }) // Returns adapter's connected address
 * ```
 */
async function resolveAddress(ctx) {
    // Handle based on adapter's addressContext
    if (ctx.adapter.capabilities?.addressContext === 'developer-controlled') {
        // Developer-controlled: address must be provided explicitly
        if ('address' in ctx && ctx.address) {
            return ctx.address;
        }
        throw new Error('Address is required in context for developer-controlled adapters. ' +
            'Please provide: { adapter, chain, address: "0x..." }');
    }
    else {
        // User-controlled: address should not be provided (auto-resolved from adapter)
        if ('address' in ctx && ctx.address) {
            throw new Error('Address should not be provided for user-controlled adapters. ' +
                'The address is automatically resolved from the connected wallet.');
        }
        // Derive address from adapter
        const chain = resolveChainDefinition(ctx);
        return await ctx.adapter.getAddress(chain);
    }
}
/**
 * Resolves the amount of a transfer by formatting it according to the token's decimal places.
 *
 * This function takes the raw amount from the transfer parameters and formats it
 * using the appropriate decimal places for the specified token. Currently supports
 * USDC (6 decimals) and falls back to the raw amount for other tokens.
 *
 * @param params - The bridge parameters containing the amount, token type, and from context
 * @returns The formatted amount string with proper decimal places
 *
 * @example
 * ```typescript
 * import { Adapter } from '@core/adapter'
 *
 * const params = {
 *   amount: '1000000',
 *   token: 'USDC',
 *   from: { adapter: mockAdapter, chain: Ethereum },
 *   to: { adapter: mockAdapter, chain: Base }
 * }
 * const formattedAmount = resolveAmount(params) // Returns '1000000000000'
 * ```
 */
function resolveAmount(params) {
    if (params.token === 'USDC') {
        return parseUnits(params.amount, 6).toString();
    }
    return params.amount;
}
/**
 * Resolves and normalizes bridge configuration for the provider.
 *
 * This function takes the optional configuration from bridge parameters and returns
 * a normalized BridgeConfig with:
 * - Default transfer speed set to FAST if not provided
 * - Max fee values converted from human-readable to smallest units (6 decimals for USDC)
 * - Custom fee values converted from human-readable to smallest units (6 decimals for USDC)
 *
 * @param params - The bridge parameters containing optional configuration
 * @returns A normalized BridgeConfig with defaults applied and values formatted
 *
 * @example
 * ```typescript
 * import { TransferSpeed } from '@core/provider'
 *
 * const params = {
 *   amount: '100',
 *   token: 'USDC',
 *   from: { adapter: mockAdapter, chain: Ethereum },
 *   to: { adapter: mockAdapter, chain: Base },
 *   config: {
 *     maxFee: '1',
 *     customFee: { value: '0.5' }
 *   }
 * }
 * const config = resolveConfig(params)
 * // Returns: {
 * //   transferSpeed: TransferSpeed.FAST,
 * //   maxFee: '1000000',
 * //   customFee: { value: '500000' }
 * // }
 * ```
 */
function resolveConfig(params) {
    // Convert maxFee from human-readable to minor units if provided
    const maxFee = params.config?.maxFee
        ? parseUnits(params.config.maxFee, 6).toString()
        : undefined;
    // Convert customFee.value from human-readable to minor units if provided
    const rawCustomFee = params.config?.customFee;
    const customFee = rawCustomFee
        ? {
            ...rawCustomFee,
            value: rawCustomFee.value
                ? parseUnits(rawCustomFee.value, 6).toString()
                : undefined,
        }
        : undefined;
    return {
        ...params.config,
        transferSpeed: params.config?.transferSpeed ?? exports.TransferSpeed.FAST,
        ...(maxFee !== undefined && { maxFee }),
        ...(customFee !== undefined && { customFee }),
    };
}
/**
 * Resolves and normalizes bridge parameters for the BridgeKit.
 *
 * This function takes bridge parameters with explicit adapter contexts and normalizes them
 * into the format expected by bridging providers.
 *
 * The function performs parallel resolution of:
 * - Source and destination addresses
 * - Source and destination chain definitions
 * - Amount formatting
 *
 * @param params - The bridge parameters containing source/destination contexts, amount, and token
 * @returns Promise resolving to normalized bridge parameters for provider consumption
 * @throws \{Error\} If parameters cannot be resolved (invalid chains, etc.)
 *
 * @example
 * ```typescript
 * import { BridgeKit } from '@bridge-kit'
 *
 * const params = {
 *   from: { adapter: sourceAdapter, chain: 'Ethereum' },
 *   to: { adapter: destAdapter, chain: 'Base' },
 *   amount: '10.5',
 *   token: 'USDC'
 * }
 *
 * const resolved = await resolveBridgeParams(params)
 * console.log('Normalized for provider:', resolved)
 * ```
 */
async function resolveBridgeParams(params) {
    const fromChain = resolveChainDefinition(params.from);
    const toChain = resolveChainDefinition(params.to);
    // Validate adapter chain support after resolution
    // This ensures adapters support the resolved chains before proceeding
    params.from.adapter.validateChainSupport(fromChain);
    params.to.adapter.validateChainSupport(toChain);
    const [fromAddress, toAddress] = await Promise.all([
        resolveAddress(params.from),
        resolveAddress(params.to),
    ]);
    const token = params.token ?? 'USDC';
    // Extract adapters - now always from explicit contexts
    const fromAdapter = params.from.adapter;
    const toAdapter = params.to.adapter;
    // Extract recipientAddress from params.to if it exists
    const recipientAddress = 'recipientAddress' in params.to ? params.to.recipientAddress : undefined;
    return {
        amount: resolveAmount({
            ...params,
            token,
        }),
        token,
        config: resolveConfig({
            ...params}),
        source: {
            adapter: fromAdapter,
            chain: fromChain,
            address: fromAddress,
        },
        destination: {
            adapter: toAdapter,
            chain: toChain,
            address: toAddress,
            ...(recipientAddress !== undefined && { recipientAddress }),
        },
    };
}

/**
 * The default providers that will be used in addition to the providers provided
 * to the BridgeKit constructor.
 */
const getDefaultProviders = () => [new providerCctpV2.CCTPV2BridgingProvider()];

/**
 * A helper function to get a function that transforms an amount into a human-readable string or a bigint string.
 * @param formatDirection - The direction to format the amount in.
 * @returns A function that transforms an amount into a human-readable string or a bigint string.
 */
const getAmountTransformer = (formatDirection) => formatDirection === 'to-human-readable'
    ? (params) => formatAmount(params)
    : (params) => parseAmount(params).toString();
/**
 * Format the bridge result into human-readable string values for the user or bigint string values for internal use.
 *
 * @typeParam T - The specific result type (must extend BridgeResult or EstimateResult). Preserves the exact type passed in.
 * @param result - The bridge result to format.
 * @param formatDirection - The direction to format the result in.
 *   - If 'to-human-readable', the result will be converted to human-readable string values.
 *   - If 'to-internal', the result will be converted to bigint string values (usually for internal use).
 * @returns The formatted bridge result.
 *
 * @example
 * ```typescript
 * const result = await kit.bridge({
 *   amount: '1000000',
 *   token: 'USDC',
 *   from: { adapter: adapter, chain: 'Ethereum' },
 *   to: { adapter: adapter, chain: 'Base' },
 * })
 *
 * // Format the bridge result into human-readable string values for the user
 * const formattedResultHumanReadable = formatBridgeResult(result, 'to-human-readable')
 * console.log(formattedResultHumanReadable)
 *
 * // Format the bridge result into bigint string values for internal use
 * const formattedResultInternal = formatBridgeResult(result, 'to-internal')
 * console.log(formattedResultInternal)
 * ```
 */
const formatBridgeResult = (result, formatDirection) => {
    const transform = getAmountTransformer(formatDirection);
    return {
        ...result,
        amount: transform({ value: result.amount, token: result.token }),
        ...('config' in result &&
            result.config &&
            Object.keys(result.config).length > 0 && {
            config: {
                ...result.config,
                ...(result.config.maxFee && {
                    maxFee: transform({
                        value: result.config.maxFee,
                        token: result.token,
                    }),
                }),
                ...(result.config.customFee && {
                    customFee: {
                        ...result.config.customFee,
                        ...(result.config.customFee.value && {
                            value: transform({
                                value: result.config.customFee.value,
                                token: result.token,
                            }),
                        }),
                    },
                }),
            },
        }),
    };
};

/**
 * Route cross-chain USDC bridging through Circle's Cross-Chain Transfer Protocol v2 (CCTPv2).
 *
 * This method orchestrates the entire cross-chain bridging process including:
 * 1. Parameter validation and route resolution
 * 2. Provider selection and configuration
 * 3. Transaction execution on both source and destination chains
 * 4. Event emission for monitoring and debugging
 *
 * The process is atomic - if any step fails, the method will throw an error
 * with detailed information about the failure point and any completed steps.
 *
 * @param params - The bridge parameters containing source, destination, amount, and token
 * @returns Promise resolving to the bridge result with transaction details and steps
 * @throws {KitError} If the parameters are invalid
 * @throws {BridgeError} If the bridging process fails
 * @throws {UnsupportedRouteError} If the route is not supported
 *
 * @example
 * ```typescript
 * import { BridgeKit } from '@circle-fin/bridge-kit'
 * import { createViemAdapterFromPrivateKey } from '@circle-fin/adapter-viem-v2'
 *
 * // Create kit with default CCTPv2 provider
 * const kit = new BridgeKit()
 * const adapter = createViemAdapterFromPrivateKey({ privateKey: '0x...' })
 *
 * // Execute cross-chain transfer
 * const result = await kit.bridge({
 *   from: { adapter, chain: 'Ethereum' },
 *   to: { adapter, chain: 'Base' },
 *   amount: '10.50'
 * })
 *
 * // Monitor bridge events
 * kit.on('approve', (payload) => {
 *   console.log('Approval complete:', payload.values.txHash)
 * })
 * ```
 */
class BridgeKit {
    /**
     * The providers used for executing transfers.
     */
    providers;
    /**
     * The action dispatcher for the kit.
     */
    actionDispatcher;
    /**
     * A custom fee policy for the kit.
     */
    customFeePolicy;
    /**
     * Create a new BridgeKit instance.
     *
     * @param config - The configuration containing the CCTPv2 provider
     *
     * @example
     * ```typescript
     * import { BridgeKit } from '@circle-fin/bridge-kit'
     *
     * const kit = new BridgeKit()
     * ```
     */
    constructor(config = {}) {
        // Handle provider configuration
        const defaultProviders = getDefaultProviders();
        this.providers = [...defaultProviders, ...(config.providers ?? [])];
        this.actionDispatcher = new Actionable();
        for (const provider of this.providers) {
            provider.registerDispatcher(this.actionDispatcher);
        }
    }
    // implementation just forwards to the bus
    on(actionOrWildCard, handler) {
        this.actionDispatcher.on(actionOrWildCard, handler);
    }
    // implementation just forwards to the bus
    off(actionOrWildCard, handler) {
        this.actionDispatcher.off(actionOrWildCard, handler);
    }
    /**
     * Execute a cross-chain USDC transfer using CCTPv2.
     *
     * Handle the complete CCTPv2 transfer flow, including parameter validation,
     * chain resolution, and transfer execution. Provide comprehensive validation of
     * all parameters before initiating the transfer.
     *
     * Perform validation of:
     * - Source and destination wallet contexts
     * - Chain identifiers (string, enum, or chain definition)
     * - Amount format and token type
     * - CCTPv2 support for the chain pair
     * - Transfer configuration options
     *
     * @param params - The transfer parameters containing source, destination, amount, and token
     * @returns Promise resolving to the transfer result with transaction details and steps
     * @throws {KitError} When any parameter validation fails.
     * @throws {Error} When CCTPv2 does not support the specified route.
     *
     * @example
     * ```typescript
     * import { BridgeKit } from '@circle-fin/bridge-kit'
     * import { createViemAdapterFromPrivateKey } from '@circle-fin/adapter-viem-v2'
     *
     * const kit = new BridgeKit()
     *
     * // Create a single adapter that can work across chains
     * const adapter = createViemAdapterFromPrivateKey({
     *   privateKey: process.env.PRIVATE_KEY,
     * })
     *
     * const result = await kit.bridge({
     *   from: {
     *     adapter,
     *     chain: 'Ethereum'
     *   },
     *   to: {
     *     adapter,
     *     chain: 'Base'
     *   },
     *   amount: '100.50'
     * })
     *
     * // Handle result
     * if (result.state === 'success') {
     *   console.log('Bridge completed!')
     *   result.steps.forEach(step => {
     *     console.log(`${step.name}: ${step.explorerUrl}`)
     *   })
     * } else {
     *   console.error('Bridge failed:', result.steps)
     * }
     * ```
     */
    async bridge(params) {
        // First validate the parameters
        assertBridgeParams(params, bridgeParamsWithChainIdentifierSchema);
        // Then resolve chain definitions (includes adapter chain support validation)
        const resolvedParams = await resolveBridgeParams(params);
        // Validate network compatibility
        this.validateNetworkCompatibility(resolvedParams);
        // Merge the custom fee config into the resolved params
        const finalResolvedParams = await this.mergeCustomFeeConfig(resolvedParams);
        // Find a provider that supports this route
        const provider = this.findProviderForRoute(finalResolvedParams);
        // Execute the transfer using the provider
        // Format the bridge result into human-readable string values for the user
        return formatBridgeResult(await provider.bridge(finalResolvedParams), 'to-human-readable');
    }
    /**
     * Retry a failed or incomplete cross-chain USDC bridge operation.
     *
     * Provide a high-level interface for resuming bridge operations that have failed
     * or become stuck during execution. Automatically identify the provider that was
     * used for the original transfer and delegate the retry logic to that provider's
     * implementation.
     *
     * Use this functionality to handle:
     * - Network timeouts or temporary connectivity issues
     * - Gas estimation failures that can be resolved with updated parameters
     * - Pending transactions that need to be resubmitted
     * - Failed steps in multi-step bridge flows
     *
     * @param result - The bridge result from a previous failed or incomplete operation.
     *                 Must contain the provider name and step execution history.
     * @param context - The retry context containing fresh adapter instances for both
     *                  source and destination chains. These adapters should be properly
     *                  configured with current network connections and signing capabilities.
     * @returns A promise that resolves to the updated bridge result after retry execution.
     *          The result will contain the complete step history including both original
     *          and retry attempts.
     *
     * @throws {Error} When the original provider specified in the result is not found
     *         in the current kit configuration.
     * @throws {Error} When the underlying provider's retry operation fails due to
     *         non-recoverable errors or invalid state.
     *
     * @example
     * ```typescript
     * import { BridgeKit } from '@circle-fin/bridge-kit'
     * import { createViemAdapterFromPrivateKey } from '@circle-fin/adapter-viem-v2'
     *
     * const kit = new BridgeKit()
     *
     * // Create adapters for source and destination chains
     * const sourceAdapter = createViemAdapterFromPrivateKey({ privateKey: '...' })
     * const destAdapter = createViemAdapterFromPrivateKey({ privateKey: '...' })
     *
     * // Assume we have a failed bridge result from a previous operation
     * const failedResult: BridgeResult = {
     *   state: 'error',
     *   provider: 'CCTPV2BridgingProvider',
     *   steps: [
     *     { name: 'approve', state: 'success', txHash: '0x123...' },
     *     { name: 'burn', state: 'error', errorMessage: 'Gas limit exceeded' }
     *   ],
     *   // ... other properties
     * }
     *
     *
     * try {
     *   const retryResult = await kit.retry(failedResult, {
     *     from: sourceAdapter,
     *     to: destAdapter
     *   })
     *
     *   console.log('Retry completed successfully:', retryResult.state)
     *   console.log('Total steps executed:', retryResult.steps.length)
     * } catch (error) {
     *   console.error('Retry failed:', error.message)
     *   // Handle retry failure (may require manual intervention)
     * }
     * ```
     */
    async retry(result, context) {
        const provider = this.providers.find((p) => p.name === result.provider);
        if (!provider) {
            throw new Error(`Provider ${result.provider} not found`);
        }
        // Format the bridge result into bigint string values for internal use
        const formattedBridgeResultInternal = formatBridgeResult(result, 'to-internal');
        // Execute the retry using the provider
        // Format the bridge result into human-readable string values for the user
        return formatBridgeResult(await provider.retry(formattedBridgeResultInternal, context), 'to-human-readable');
    }
    /**
     * Estimate the cost and fees for a cross-chain USDC bridge operation.
     *
     * This method calculates the expected gas fees and protocol costs for bridging
     * without actually executing the transaction. It performs the same validation
     * as the bridge method but stops before execution.
     * @param params - The bridge parameters for cost estimation
     * @returns Promise resolving to detailed cost breakdown including gas estimates
     * @throws {KitError} When the parameters are invalid.
     * @throws {UnsupportedRouteError} When the route is not supported.
     *
     * @example
     * ```typescript
     * const estimate = await kit.estimate({
     *   from: { adapter: adapter, chain: 'Ethereum' },
     *   to: { adapter: adapter, chain: 'Base' },
     *   amount: '10.50',
     *   token: 'USDC'
     * })
     * console.log('Estimated cost:', estimate.totalCost)
     * ```
     */
    async estimate(params) {
        // First validate the parameters
        assertBridgeParams(params, bridgeParamsWithChainIdentifierSchema);
        // Then resolve chain definitions (includes adapter chain support validation)
        const resolvedParams = await resolveBridgeParams(params);
        // Validate network compatibility
        this.validateNetworkCompatibility(resolvedParams);
        // Merge the custom fee config into the resolved params
        const finalResolvedParams = await this.mergeCustomFeeConfig(resolvedParams);
        // Find a provider that supports this route
        const provider = this.findProviderForRoute(finalResolvedParams);
        // Estimate the transfer using the provider and format amounts to human-readable strings
        return formatBridgeResult(await provider.estimate(finalResolvedParams), 'to-human-readable');
    }
    /**
     * Get all chains supported by any provider in the kit, with optional filtering.
     *
     * Aggregate and deduplicate the supported chains from all registered providers.
     * This provides a comprehensive list of chains that can be used as either source
     * or destination for transfers through this kit instance.
     *
     * The method automatically deduplicates chains based on their chain identifier,
     * ensuring each chain appears only once in the result regardless of how many
     * providers support it.
     *
     * @param options - Optional filtering options to narrow down the returned chains
     * @returns Array of unique chain definitions supported by the registered providers
     *
     * @example
     * ```typescript
     * import { BridgeKit } from '@circle-fin/bridge-kit'
     *
     * const kit = new BridgeKit()
     *
     * // Get all supported chains (no filtering)
     * const allChains = kit.getSupportedChains()
     *
     * // Get only EVM chains
     * const evmChains = kit.getSupportedChains({ chainType: 'evm' })
     *
     * // Get EVM and Solana chains
     * const evmAndSolana = kit.getSupportedChains({ chainType: ['evm', 'solana'] })
     *
     * // Get only mainnet chains
     * const mainnets = kit.getSupportedChains({ isTestnet: false })
     *
     * // Get only EVM mainnet chains
     * const evmMainnets = kit.getSupportedChains({ chainType: 'evm', isTestnet: false })
     *
     * console.log('Supported chains:')
     * allChains.forEach(chain => {
     *   console.log(`- ${chain.name} (${chain.type})`)
     * })
     * ```
     */
    getSupportedChains(options) {
        const supportedChains = this.providers.flatMap((p) => p.supportedChains);
        // Deduplicate chains by using chain identifiers as object keys
        // Later duplicates will override earlier ones, keeping only the last occurrence
        let chains = Object.values(Object.fromEntries(supportedChains.map((chain) => [chain.chain, chain])));
        // Apply chain type filter if provided
        if (options?.chainType !== undefined) {
            // Validate at runtime since JS consumers can bypass TypeScript's narrow type.
            const supportedChainTypes = ['evm', 'solana'];
            const chainTypeInput = options.chainType;
            const chainTypeValues = Array.isArray(chainTypeInput)
                ? chainTypeInput
                : [chainTypeInput];
            if (!chainTypeValues.every((chainType) => supportedChainTypes.includes(chainType))) {
                const listFormatter = new Intl.ListFormat('en', {
                    style: 'long',
                    type: 'conjunction',
                });
                throw createValidationFailedError$1('options.chainType', options.chainType, `Supported chain types include: ${listFormatter.format(supportedChainTypes)}`);
            }
            const chainTypes = new Set(chainTypeValues);
            chains = chains.filter((chain) => chainTypes.has(chain.type));
        }
        // Apply testnet filter if provided
        if (options?.isTestnet !== undefined) {
            chains = chains.filter((chain) => chain.isTestnet === options.isTestnet);
        }
        return chains;
    }
    /**
     * Validate that source and destination chains are on the same network type.
     *
     * This method ensures that both chains are either testnet or mainnet, preventing
     * cross-network transfers which are not supported by the bridging protocols.
     *
     * @param resolvedParams - The resolved bridge parameters containing source and destination chains
     * @throws {NetworkMismatchError} If source and destination chains are on different network types
     */
    validateNetworkCompatibility(resolvedParams) {
        if (resolvedParams.source.chain.isTestnet !==
            resolvedParams.destination.chain.isTestnet) {
            throw createNetworkMismatchError(resolvedParams.source.chain, resolvedParams.destination.chain);
        }
    }
    /**
     * Find a provider that supports the given transfer route.
     *
     * This method centralizes the provider selection logic to ensure consistency
     * between transfer and estimate operations. It resolves the source and destination
     * chains from the provided adapters and finds the first provider that supports
     * the route for the specified token.
     *
     * @param params - The transfer parameters containing source, destination, and token
     * @returns Promise resolving to the provider that supports this route
     * @throws Will throw an error if no provider supports the route
     */
    findProviderForRoute(params) {
        const provider = this.providers.find((p) => p.supportsRoute(params.source.chain, params.destination.chain, params.token));
        if (!provider) {
            throw createUnsupportedRouteError(params.source.chain.name, params.destination.chain.name);
        }
        return provider;
    }
    /**
     * Merge custom fee configuration into provider parameters.
     *
     * Prioritizes any custom fee configuration already present on the
     * provider-resolved params and uses the kit-level custom fee configuration
     * as a fallback only when a value is missing. If neither the provider params
     * nor the kit configuration can supply a value, no custom fee configuration
     * is added to the provider params.
     *
     * @param originalParams - The original bridge parameters received by the kit.
     * @param providerParams - The provider-resolved bridge parameters that may be enriched.
     * @returns The same `providerParams` reference with custom fee configuration merged when applicable.
     *
     * @remarks
     * - Existing values on `providerParams.config.customFee` are preserved.
     * - Kit-level functions are invoked lazily and only for missing values.
     * - If both sources provide no values, `customFee` is omitted entirely.
     */
    async mergeCustomFeeConfig(providerParams) {
        // Prefer any custom fee already resolved by the provider
        const existingFee = providerParams.config?.customFee?.value;
        const existingFeeRecipient = providerParams.config?.customFee?.recipientAddress;
        // Fill missing values using kit-level configuration (if available)
        const fee = existingFee ?? (await this.resolveFee(providerParams));
        const feeRecipient = existingFeeRecipient ??
            (await this.customFeePolicy?.resolveFeeRecipientAddress(providerParams.source.chain, providerParams));
        // Only attach customFee if at least one value is defined
        if (fee !== undefined || feeRecipient !== undefined) {
            providerParams.config = {
                ...providerParams.config,
                customFee: {
                    value: fee,
                    recipientAddress: feeRecipient,
                },
            };
        }
        return providerParams;
    }
    /**
     * Resolve the custom fee for a bridge transfer.
     *
     * Checks which fee function the user provided and executes accordingly:
     * - `computeFee`: receives human-readable amounts, returns human-readable fee
     * - `calculateFee` (deprecated): receives smallest units, returns smallest units
     *
     * @param providerParams - The resolved bridge parameters (amounts in smallest units).
     * @returns The resolved fee in smallest units, or undefined if no fee policy is set.
     */
    async resolveFee(providerParams) {
        if (!this.customFeePolicy) {
            return undefined;
        }
        const token = providerParams.token ?? 'USDC';
        if (token !== 'USDC') {
            throw createValidationFailedError$1('token', token, 'Custom fee policy only supports USDC');
        }
        // eslint-disable-next-line @typescript-eslint/no-deprecated -- intentionally support deprecated calculateFee
        const { computeFee, calculateFee } = this.customFeePolicy;
        let fee;
        if (computeFee) {
            // Convert amount to human-readable for the user's computeFee
            const humanReadableParams = {
                ...providerParams,
                amount: formatUnits(providerParams.amount, 6),
            };
            fee = await computeFee(humanReadableParams);
        }
        // Fall back to deprecated calculateFee (receives smallest units)
        if (calculateFee) {
            fee = await calculateFee(providerParams);
        }
        if (fee) {
            return parseUnits(fee, 6).toString();
        }
        return undefined;
    }
    /**
     * Set the custom fee policy for the kit.
     *
     * Use `computeFee` (recommended) for human-readable amounts, or `calculateFee`
     * (deprecated) for smallest-unit amounts. Only one should be provided.
     *
     * ```text
     * Transfer amount (user input, e.g., 1,000 USDC)
     *   ↓ Wallet signs for transfer + custom fee (e.g., 1,000 + 10 = 1,010 USDC)
     *   ↓ Custom fee split (10% Circle, 90% your recipientAddress wallet)
     *   ↓ Full transfer amount (1,000 USDC) forwarded to CCTPv2
     *   ↓ CCTPv2 protocol fee (e.g., 0.1 USDC) deducted from transfer amount
     *   ↓ User receives funds on destination chain (e.g., 999.9 USDC)
     * ```
     *
     * @param customFeePolicy - The custom fee policy to set.
     * @throws {KitError} If the custom fee policy is invalid or missing required functions
     *
     * @example
     * ```typescript
     * import { BridgeKit } from '@circle-fin/bridge-kit'
     *
     * const kit = new BridgeKit()
     *
     * kit.setCustomFeePolicy({
     *   // computeFee receives human-readable amounts (e.g., '100' for 100 USDC)
     *   computeFee: (params) => {
     *     const amount = parseFloat(params.amount)
     *
     *     // 1% fee, bounded to 5-50 USDC
     *     const fee = Math.min(Math.max(amount * 0.01, 5), 50)
     *     return fee.toFixed(6)
     *   },
     *   resolveFeeRecipientAddress: (feePayoutChain) => {
     *     return feePayoutChain.type === 'solana'
     *       ? '9xQeWvG816bUx9EP9MnZ4buHh3A6E2dFQa4Xz6V7C7Gn'
     *       : '0x23f9a5BEA7B92a0638520607407BC7f0310aEeD4'
     *   },
     * })
     *
     * // 100 USDC transfer + 5 USDC custom fee results:
     * // - Wallet signs for 105 USDC total.
     * // - Circle receives 0.5 USDC (10% share of the custom fee).
     * // - Your recipientAddress wallet receives 4.5 USDC.
     * // - CCTPv2 processes 100 USDC and later deducts its own protocol fee.
     * ```
     */
    setCustomFeePolicy(customFeePolicy) {
        assertCustomFeePolicy(customFeePolicy);
        // Store the policy as-is; resolveFee handles the branching logic
        this.customFeePolicy = customFeePolicy;
    }
    /**
     * Remove the custom fee policy for the kit.
     *
     * @example
     * ```typescript
     * kit.removeCustomFeePolicy()
     * ```
     */
    removeCustomFeePolicy() {
        this.customFeePolicy = undefined;
    }
}

/**
 *
 * Bridge Kit
 *
 * A strongly-typed SDK for moving USDC between heterogeneous blockchain networks
 * @packageDocumentation
 */
// Auto-register this kit for user agent tracking
registerKit(`${pkg.name}/${pkg.version}`);

exports.BalanceError = BalanceError;
exports.BridgeKit = BridgeKit;
exports.InputError = InputError;
exports.KitError = KitError;
exports.NetworkError = NetworkError;
exports.OnchainError = OnchainError;
exports.RpcError = RpcError;
exports.bridgeParamsWithChainIdentifierSchema = bridgeParamsWithChainIdentifierSchema;
exports.getErrorCode = getErrorCode;
exports.getErrorMessage = getErrorMessage;
exports.isBalanceError = isBalanceError;
exports.isFatalError = isFatalError;
exports.isInputError = isInputError;
exports.isKitError = isKitError;
exports.isNetworkError = isNetworkError;
exports.isOnchainError = isOnchainError;
exports.isRetryableError = isRetryableError;
exports.isRpcError = isRpcError;
exports.resolveChainIdentifier = resolveChainIdentifier;
exports.setExternalPrefix = setExternalPrefix;
//# sourceMappingURL=index.cjs.map
