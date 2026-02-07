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

import { http, fallback, createPublicClient, parseAbi, encodeFunctionData, createWalletClient, custom } from 'viem';
import { z } from 'zod';
import { hexlify, hexZeroPad } from '@ethersproject/bytes';
import { getAddress } from '@ethersproject/address';
import bs58 from 'bs58';
import '@ethersproject/units';
import { zksyncSepoliaTestnet, zksync, xdcTestnet, xdc, worldchainSepolia, worldchain, unichainSepolia, unichain, sonic, seiTestnet, sei, polygonAmoy, polygon, optimismSepolia, optimism, lineaSepolia, linea, sepolia, mainnet, celoAlfajores, celo, baseSepolia, base, avalancheFuji, avalanche, arbitrumSepolia, arbitrum } from 'viem/chains';
import { privateKeyToAccount, nonceManager } from 'viem/accounts';

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
const errorDetailsSchema = z.object({
    /**
     * Numeric identifier following standardized ranges:
     * - 0: UNKNOWN - Catch-all for unrecognized errors
     * - 1000-1999: INPUT errors - Parameter validation
     * - 3000-3999: NETWORK errors - Connectivity issues
     * - 4000-4999: RPC errors - Provider issues, gas estimation
     * - 5000-5999: ONCHAIN errors - Transaction/simulation failures
     * - 9000-9999: BALANCE errors - Insufficient funds
     */
    code: z
        .number()
        .int('Error code must be an integer')
        .refine((code) => code === UNKNOWN_ERROR_CODE ||
        ERROR_CODE_RANGES.some((range) => code >= range.min && code <= range.max), {
        message: 'Error code must be 0 (UNKNOWN) or in valid ranges: 1000-1999 (INPUT), 3000-3999 (NETWORK), 4000-4999 (RPC), 5000-5999 (ONCHAIN), 9000-9999 (BALANCE)',
    }),
    /** Human-readable ID (e.g., "INPUT_NETWORK_MISMATCH", "BALANCE_INSUFFICIENT_TOKEN") */
    name: z
        .string()
        .min(1, 'Error name must be a non-empty string')
        .regex(/^[A-Z_][A-Z0-9_]*$/, 'Error name must match pattern: ^[A-Z_][A-Z0-9_]*$'),
    /** Error category indicating where the error originated */
    type: z.enum(ERROR_TYPE_ARRAY, {
        errorMap: () => ({
            message: 'Error type must be one of: INPUT, BALANCE, ONCHAIN, RPC, NETWORK, UNKNOWN',
        }),
    }),
    /** Error handling strategy */
    recoverability: z.enum(RECOVERABILITY_ARRAY, {
        errorMap: () => ({
            message: 'Recoverability must be one of: RETRYABLE, RESUMABLE, FATAL',
        }),
    }),
    /** User-friendly explanation with context */
    message: z
        .string()
        .min(1, 'Error message must be a non-empty string')
        .max(1000, 'Error message must be 1000 characters or less'),
    /** Raw error details, context, or the original error that caused this one. */
    cause: z
        .object({
        /** Free-form error payload from underlying system */
        trace: z.unknown().optional(),
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
    /** Invalid or unsupported chain identifier */
    INVALID_CHAIN: {
        code: 1005,
        name: 'INPUT_INVALID_CHAIN',
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
    }};
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
    }};
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
    }};
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
    }};

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

/**
 * Creates error for insufficient token balance.
 *
 * This error is thrown when a wallet does not have enough tokens to
 * complete a transaction. The error is FATAL as it requires user
 * intervention to add funds.
 *
 * @param chain - The blockchain network where the balance check failed
 * @param token - The token symbol (e.g., 'USDC', 'ETH')
 * @param trace - Optional trace context to include in error (can include rawError and additional debugging data)
 * @returns KitError with insufficient token balance details
 *
 * @example
 * ```typescript
 * import { createInsufficientTokenBalanceError } from '@core/errors'
 *
 * throw createInsufficientTokenBalanceError('Ethereum', 'USDC')
 * // Message: "Insufficient USDC balance on Ethereum"
 * ```
 *
 * @example
 * ```typescript
 * // With trace context for debugging
 * try {
 *   await transfer(...)
 * } catch (error) {
 *   throw createInsufficientTokenBalanceError('Base', 'USDC', {
 *     rawError: error,
 *     balance: '1000000',
 *     amount: '5000000',
 *   })
 * }
 * ```
 */
function createInsufficientTokenBalanceError(chain, token, trace) {
    return new KitError({
        ...BalanceError.INSUFFICIENT_TOKEN,
        recoverability: 'FATAL',
        message: `Insufficient ${token} balance on ${chain}`,
        cause: {
            trace: {
                ...trace,
                chain,
                token,
            },
        },
    });
}
/**
 * Creates error for insufficient gas funds.
 *
 * This error is thrown when a wallet does not have enough native tokens
 * (ETH, SOL, etc.) to pay for transaction gas fees. The error is FATAL
 * as it requires user intervention to add gas funds.
 *
 * @param chain - The blockchain network where the gas check failed
 * @param trace - Optional trace context to include in error (can include rawError and additional debugging data)
 * @returns KitError with insufficient gas details
 *
 * @example
 * ```typescript
 * import { createInsufficientGasError } from '@core/errors'
 *
 * throw createInsufficientGasError('Ethereum')
 * // Message: "Insufficient gas funds on Ethereum"
 * ```
 *
 * @example
 * ```typescript
 * // With trace context for debugging
 * throw createInsufficientGasError('Ethereum', {
 *   rawError: error,
 *   gasRequired: '21000',
 *   gasAvailable: '10000',
 *   walletAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
 * })
 * ```
 */
function createInsufficientGasError(chain, trace) {
    return new KitError({
        ...BalanceError.INSUFFICIENT_GAS,
        recoverability: 'FATAL',
        message: `Insufficient gas funds on ${chain}`,
        cause: {
            trace: {
                ...trace,
                chain,
            },
        },
    });
}

/**
 * Creates error for transaction simulation failures.
 *
 * This error is thrown when a pre-flight transaction simulation fails,
 * typically due to contract logic that would revert. The error is FATAL
 * as it indicates the transaction would fail if submitted.
 *
 * @param chain - The blockchain network where the simulation failed
 * @param reason - The reason for simulation failure (e.g., revert message)
 * @param trace - Optional trace context to include in error (can include rawError and additional debugging data)
 * @returns KitError with simulation failure details
 *
 * @example
 * ```typescript
 * import { createSimulationFailedError } from '@core/errors'
 *
 * throw createSimulationFailedError('Ethereum', 'ERC20: insufficient allowance')
 * // Message: "Simulation failed on Ethereum: ERC20: insufficient allowance"
 * ```
 *
 * @example
 * ```typescript
 * // With trace context for debugging
 * throw createSimulationFailedError('Ethereum', 'ERC20: insufficient allowance', {
 *   rawError: error,
 *   txHash: '0x1234...',
 *   gasLimit: '21000',
 * })
 * ```
 */
function createSimulationFailedError(chain, reason, trace) {
    return new KitError({
        ...OnchainError.SIMULATION_FAILED,
        recoverability: 'FATAL',
        message: `Simulation failed on ${chain}: ${reason}`,
        cause: {
            trace: {
                ...trace,
                chain,
                reason,
            },
        },
    });
}
/**
 * Creates error for transaction reverts.
 *
 * This error is thrown when a transaction is submitted and confirmed
 * but reverts on-chain. The error is FATAL as it indicates the
 * transaction executed but failed.
 *
 * @param chain - The blockchain network where the transaction reverted
 * @param reason - The reason for the revert (e.g., revert message)
 * @param trace - Optional trace context to include in error (can include rawError and additional debugging data)
 * @returns KitError with transaction revert details
 *
 * @example
 * ```typescript
 * import { createTransactionRevertedError } from '@core/errors'
 *
 * throw createTransactionRevertedError('Base', 'Slippage exceeded')
 * // Message: "Transaction reverted on Base: Slippage exceeded"
 * ```
 *
 * @example
 * ```typescript
 * // With trace context for debugging
 * throw createTransactionRevertedError('Base', 'Slippage exceeded', {
 *   rawError: error,
 *   txHash: '0xabc...',
 *   blockNumber: '12345',
 * })
 * ```
 */
function createTransactionRevertedError(chain, reason, trace) {
    return new KitError({
        ...OnchainError.TRANSACTION_REVERTED,
        recoverability: 'FATAL',
        message: `Transaction reverted on ${chain}: ${reason}`,
        cause: {
            trace: {
                ...trace,
                chain,
                reason,
            },
        },
    });
}
/**
 * Creates error for out of gas failures.
 *
 * This error is thrown when a transaction runs out of gas during execution.
 * The error is FATAL as it requires adjusting gas limits or transaction logic.
 *
 * @param chain - The blockchain network where the transaction ran out of gas
 * @param trace - Optional trace context to include in error (can include rawError and additional debugging data)
 * @returns KitError with out of gas details
 *
 * @example
 * ```typescript
 * import { createOutOfGasError } from '@core/errors'
 *
 * throw createOutOfGasError('Polygon')
 * // Message: "Transaction ran out of gas on Polygon"
 * ```
 *
 * @example
 * ```typescript
 * // With trace context for debugging
 * throw createOutOfGasError('Polygon', {
 *   rawError: error,
 *   gasUsed: '50000',
 *   gasLimit: '45000',
 * })
 * ```
 */
function createOutOfGasError(chain, trace) {
    return new KitError({
        ...OnchainError.OUT_OF_GAS,
        recoverability: 'FATAL',
        message: `Transaction ran out of gas on ${chain}`,
        cause: {
            trace: {
                ...trace,
                chain,
            },
        },
    });
}

/**
 * Creates error for RPC endpoint failures.
 *
 * This error is thrown when an RPC provider endpoint fails, returns an error,
 * or is unavailable. The error is RETRYABLE as RPC issues are often temporary.
 *
 * @param chain - The blockchain network where the RPC error occurred
 * @param trace - Optional trace context to include in error (can include rawError and additional debugging data)
 * @returns KitError with RPC endpoint error details
 *
 * @example
 * ```typescript
 * import { createRpcEndpointError } from '@core/errors'
 *
 * throw createRpcEndpointError('Ethereum')
 * // Message: "RPC endpoint error on Ethereum"
 * ```
 *
 * @example
 * ```typescript
 * // With trace context for debugging
 * throw createRpcEndpointError('Ethereum', {
 *   rawError: error,
 *   endpoint: 'https://mainnet.infura.io/v3/...',
 *   statusCode: 429,
 * })
 * ```
 */
function createRpcEndpointError(chain, trace) {
    return new KitError({
        ...RpcError.ENDPOINT_ERROR,
        recoverability: 'RETRYABLE',
        message: `RPC endpoint error on ${chain}`,
        cause: {
            trace: {
                ...trace,
                chain,
            },
        },
    });
}

/**
 * Creates error for network connection failures.
 *
 * This error is thrown when network connectivity issues prevent reaching
 * the blockchain network. The error is RETRYABLE as network issues are
 * often temporary.
 *
 * @param chain - The blockchain network where the connection failed
 * @param trace - Optional trace context to include in error (can include rawError and additional debugging data)
 * @returns KitError with network connection error details
 *
 * @example
 * ```typescript
 * import { createNetworkConnectionError } from '@core/errors'
 *
 * throw createNetworkConnectionError('Ethereum')
 * // Message: "Network connection failed for Ethereum"
 * ```
 *
 * @example
 * ```typescript
 * // With trace context for debugging
 * throw createNetworkConnectionError('Ethereum', {
 *   rawError: error,
 *   endpoint: 'https://eth-mainnet.g.alchemy.com/v2/...',
 *   retryCount: 3,
 * })
 * ```
 */
function createNetworkConnectionError(chain, trace) {
    return new KitError({
        ...NetworkError.CONNECTION_FAILED,
        recoverability: 'RETRYABLE',
        message: `Network connection failed for ${chain}`,
        cause: {
            trace: {
                ...trace,
                chain,
            },
        },
    });
}

/**
 * Parses raw blockchain errors into structured KitError instances.
 *
 * This function uses pattern matching to identify common blockchain error
 * types and converts them into standardized KitError format. It handles
 * errors from viem, ethers, Solana web3.js, and other blockchain libraries.
 *
 * The parser recognizes 5 main error patterns:
 * 1. Insufficient balance errors
 * 2. Simulation/execution reverted errors
 * 3. Gas-related errors
 * 4. Network connectivity errors
 * 5. RPC provider errors
 *
 * @param error - The raw error from the blockchain library
 * @param context - Context information including chain and optional token
 * @returns A structured KitError instance
 *
 * @example
 * ```typescript
 * import { parseBlockchainError } from '@core/errors'
 *
 * try {
 *   await walletClient.sendTransaction(...)
 * } catch (error) {
 *   throw parseBlockchainError(error, {
 *     chain: 'Ethereum',
 *     token: 'USDC',
 *     operation: 'transfer'
 *   })
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Minimal usage
 * try {
 *   await connection.sendTransaction(...)
 * } catch (error) {
 *   throw parseBlockchainError(error, { chain: 'Solana' })
 * }
 * ```
 */
function parseBlockchainError(error, context) {
    const msg = extractMessage(error);
    const token = context.token ?? 'token';
    // Pattern 1: Insufficient balance errors
    // Matches balance-related errors from ERC20 contracts, native transfers, and Solana programs
    if (/transfer amount exceeds balance|insufficient (balance|funds)|burn amount exceeded/i.test(msg)) {
        return createInsufficientTokenBalanceError(context.chain, token, {
            rawError: error,
        });
    }
    // Pattern 2: Simulation and execution reverts
    // Matches contract revert errors and simulation failures
    if (/execution reverted|simulation failed|transaction reverted|transaction failed/i.test(msg)) {
        const reason = extractRevertReason(msg) ?? 'Transaction reverted';
        // Distinguish between simulation failures and transaction reverts
        // "simulation failed" or "eth_call" indicates pre-flight simulation
        // "transaction failed" or context.operation === 'transaction' indicates post-execution
        if (/simulation failed/i.test(msg) || context.operation === 'simulation') {
            return createSimulationFailedError(context.chain, reason, {
                rawError: error,
            });
        }
        // Transaction execution failures or reverts
        return createTransactionRevertedError(context.chain, reason, {
            rawError: error,
        });
    }
    // Pattern 3: Gas-related errors
    // Matches gas estimation failures and gas exhaustion
    // Check specific patterns first, then generic "gas" patterns
    // Gas estimation failures are RPC issues
    if (/gas estimation failed|cannot estimate gas/i.test(msg)) {
        return createRpcEndpointError(context.chain, { rawError: error });
    }
    // Gas exhaustion errors
    // Use specific patterns without wildcards to avoid ReDoS
    if (/out of gas|gas limit exceeded|exceeds block gas limit/i.test(msg)) {
        return createOutOfGasError(context.chain, { rawError: error });
    }
    // Insufficient funds for gas
    if (/insufficient funds for gas/i.test(msg)) {
        return createInsufficientGasError(context.chain, { rawError: error });
    }
    // Pattern 4: Network connectivity errors
    // Matches connection failures, DNS errors, and timeouts
    if (/connection (refused|failed)|network|timeout|ENOTFOUND|ECONNREFUSED/i.test(msg)) {
        return createNetworkConnectionError(context.chain, { rawError: error });
    }
    // Pattern 5: RPC provider errors
    // Matches RPC endpoint errors, invalid responses, and rate limits
    if (/rpc|invalid response|rate limit|too many requests/i.test(msg)) {
        return createRpcEndpointError(context.chain, { rawError: error });
    }
    // Fallback based on operation context
    // Gas-related operations are RPC calls
    if (context.operation === 'estimateGas' ||
        context.operation === 'getGasPrice') {
        return createRpcEndpointError(context.chain, { rawError: error });
    }
    // Fallback for unrecognized errors
    // Defaults to simulation failed as transaction execution is the most common failure point
    return createSimulationFailedError(context.chain, msg.length > 0 ? msg : 'Unknown error', { rawError: error });
}
/**
 * Type guard to check if error has Solana-Kit structure with logs.
 *
 * Checks if the error object contains a context with logs array,
 * which is the structure used by Solana Kit errors.
 *
 * @param error - Unknown error to check
 * @returns True if error has Solana-Kit logs structure
 */
function hasSolanaLogs(error) {
    return (error !== null &&
        typeof error === 'object' &&
        'context' in error &&
        error.context !== null &&
        typeof error.context === 'object' &&
        'logs' in error.context &&
        Array.isArray(error.context.logs));
}
/**
 * Extracts a human-readable error message from various error types.
 *
 * Handles Error objects, string errors, objects with message properties,
 * Solana-Kit errors with context logs, and falls back to string representation.
 * For Solana-Kit errors, extracts Anchor error messages from transaction logs.
 *
 * @param error - Unknown error to extract message from
 * @returns Extracted error message string
 *
 * @example
 * ```typescript
 * const msg1 = extractMessage(new Error('test'))  // 'test'
 * const msg2 = extractMessage('string error')     // 'string error'
 * const msg3 = extractMessage({ message: 'obj' }) // 'obj'
 * ```
 */
function extractMessage(error) {
    // Check for Solana-Kit errors with context.logs
    if (hasSolanaLogs(error)) {
        // Extract Anchor error message from logs
        const anchorLog = error.context.logs.find((log) => log.includes('AnchorError') || log.includes('Error Message'));
        if (anchorLog !== undefined) {
            // Return the anchor error log which contains the detailed message
            return anchorLog;
        }
    }
    if (error instanceof Error) {
        return error.message;
    }
    if (typeof error === 'string') {
        return error;
    }
    if (typeof error === 'object' && error !== null && 'message' in error) {
        return String(error.message);
    }
    return String(error);
}
/**
 * Extracts the revert reason from an error message.
 *
 * Attempts to parse out the meaningful reason from execution revert errors,
 * removing common prefixes like "execution reverted:" or "reverted:".
 *
 * @param msg - The error message to extract from
 * @returns The extracted revert reason, or null if not found
 *
 * @example
 * ```typescript
 * const reason = extractRevertReason(
 *   'execution reverted: ERC20: transfer amount exceeds balance'
 * )
 * // Returns: 'ERC20: transfer amount exceeds balance'
 * ```
 *
 * @example
 * ```typescript
 * const reason = extractRevertReason(
 *   'Simulation failed: Execution reverted with reason: Insufficient allowance'
 * )
 * // Returns: 'Insufficient allowance'
 * ```
 */
function extractRevertReason(msg) {
    // Try to extract reason after "execution reverted:" or "reason:"
    // Use [^\n.]+ instead of .+? to avoid ReDoS vulnerability
    const patterns = [
        /(?:execution reverted|reverted):\s*([^\n.]+)/i,
        /reason:\s*([^\n.]+)/i,
        /with reason:\s*([^\n.]+)/i,
    ];
    for (const pattern of patterns) {
        const match = pattern.exec(msg);
        const extractedReason = match?.at(1);
        if (extractedReason !== undefined && extractedReason.length > 0) {
            return extractedReason.trim();
        }
    }
    return null;
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
var Blockchain;
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
})(Blockchain || (Blockchain = {}));
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
var BridgeChain;
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
})(BridgeChain || (BridgeChain = {}));

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
    chain: Blockchain.Algorand,
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
    chain: Blockchain.Algorand_Testnet,
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
    chain: Blockchain.Aptos,
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
    chain: Blockchain.Aptos_Testnet,
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
    chain: Blockchain.Arc_Testnet,
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
    chain: Blockchain.Arbitrum,
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
    chain: Blockchain.Arbitrum_Sepolia,
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
    chain: Blockchain.Avalanche,
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
    chain: Blockchain.Avalanche_Fuji,
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
    chain: Blockchain.Base,
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
    chain: Blockchain.Base_Sepolia,
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
    chain: Blockchain.Celo,
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
    chain: Blockchain.Celo_Alfajores_Testnet,
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
    chain: Blockchain.Codex,
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
    chain: Blockchain.Codex_Testnet,
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
    chain: Blockchain.Ethereum,
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
    chain: Blockchain.Ethereum_Sepolia,
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
    chain: Blockchain.Hedera,
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
    chain: Blockchain.Hedera_Testnet,
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
    chain: Blockchain.HyperEVM,
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
    chain: Blockchain.HyperEVM_Testnet,
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
    chain: Blockchain.Ink,
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
    chain: Blockchain.Ink_Testnet,
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
    chain: Blockchain.Linea,
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
    chain: Blockchain.Linea_Sepolia,
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
    chain: Blockchain.Monad,
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
    chain: Blockchain.Monad_Testnet,
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
    chain: Blockchain.NEAR,
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
    chain: Blockchain.NEAR_Testnet,
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
    chain: Blockchain.Noble,
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
    chain: Blockchain.Noble_Testnet,
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
    chain: Blockchain.Optimism,
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
    chain: Blockchain.Optimism_Sepolia,
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
    chain: Blockchain.Plume,
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
    chain: Blockchain.Plume_Testnet,
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
    chain: Blockchain.Polkadot_Asset_Hub,
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
    chain: Blockchain.Polkadot_Westmint,
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
    chain: Blockchain.Polygon,
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
    chain: Blockchain.Polygon_Amoy_Testnet,
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
    chain: Blockchain.Sei,
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
    chain: Blockchain.Sei_Testnet,
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
    chain: Blockchain.Sonic,
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
    chain: Blockchain.Sonic_Testnet,
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
    chain: Blockchain.Solana,
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
    chain: Blockchain.Solana_Devnet,
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
    chain: Blockchain.Stellar,
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
    chain: Blockchain.Stellar_Testnet,
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
    chain: Blockchain.Sui,
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
    chain: Blockchain.Sui_Testnet,
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
    chain: Blockchain.Unichain,
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
    chain: Blockchain.Unichain_Sepolia,
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
    chain: Blockchain.World_Chain,
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
    chain: Blockchain.World_Chain_Sepolia,
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
    chain: Blockchain.XDC,
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
    chain: Blockchain.XDC_Apothem,
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
    chain: Blockchain.ZKSync_Era,
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
    chain: Blockchain.ZKSync_Sepolia,
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

var Blockchains = /*#__PURE__*/Object.freeze({
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
});

/**
 * Check if a chain supports a specific type of custom smart contract logic.
 *
 * This function examines a chain definition to determine if it has a specific
 * contract type configured. When a chain has custom contract support, it can
 * use enhanced features and custom business logic in addition to the standard
 * CCTP approve/burn/mint flow.
 *
 * @param chain - The chain definition to examine for custom contract support.
 * @param contractType - The type of contract to check for (e.g., 'bridge').
 * @returns True if the chain supports the specified contract type with a valid address configured.
 *
 * @example
 * ```typescript
 * import { hasCustomContractSupport, Ethereum } from '@core/chains'
 *
 * // Check if a chain supports bridge contracts
 * if (hasCustomContractSupport(Ethereum, 'bridge')) {
 *   // Runtime validation confirmed kitContracts.bridge exists
 *   console.log('Bridge contract:', Ethereum.kitContracts?.bridge)
 *   return executeCustomFlow(Ethereum.kitContracts?.bridge!, params)
 * } else {
 *   console.log('Using standard CCTP flow')
 *   return executeStandardFlow(params)
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Usage in flow determination
 * function determineBridgingFlow(chain: ChainDefinition, params: BridgeParams) {
 *   if (hasCustomContractSupport(chain, 'bridge')) {
 *     return 'custom'
 *   } else if (isCCTPV2Supported(chain)) {
 *     return 'standard'
 *   } else {
 *     throw new Error(`Chain ${chain.name} is not supported for bridging`)
 *   }
 * }
 *
 * // Future usage with other contract types (when added to KitContractType)
 * // if (hasCustomContractSupport(someChain, 'customType')) {
 * //   console.log('Custom contract:', someChain.kitContracts?.customType)
 * // }
 * ```
 */
function hasCustomContractSupport(chain, contractType) {
    const contractAddress = chain.kitContracts?.[contractType];
    return (typeof contractAddress === 'string' && contractAddress.trim().length > 0);
}

/**
 * Base schema for common chain definition properties.
 * This contains all properties shared between EVM and non-EVM chains.
 */
const baseChainDefinitionSchema = z.object({
    chain: z.nativeEnum(Blockchain, {
        required_error: 'Chain enum is required. Please provide a valid Blockchain enum value.',
        invalid_type_error: 'Chain must be a valid Blockchain enum value.',
    }),
    name: z.string({
        required_error: 'Chain name is required. Please provide a valid chain name.',
        invalid_type_error: 'Chain name must be a string.',
    }),
    title: z.string().optional(),
    nativeCurrency: z.object({
        name: z.string(),
        symbol: z.string(),
        decimals: z.number(),
    }),
    isTestnet: z.boolean({
        required_error: 'isTestnet is required. Please specify whether this is a testnet.',
        invalid_type_error: 'isTestnet must be a boolean.',
    }),
    explorerUrl: z.string({
        required_error: 'Explorer URL is required. Please provide a valid explorer URL.',
        invalid_type_error: 'Explorer URL must be a string.',
    }),
    rpcEndpoints: z.array(z.string()),
    eurcAddress: z.string().nullable(),
    usdcAddress: z.string().nullable(),
    cctp: z.any().nullable(), // We'll accept any CCTP config structure
    kitContracts: z
        .object({
        bridge: z.string().optional(),
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
    type: z.literal('evm'),
    chainId: z.number({
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
    type: z.enum([
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
const chainDefinitionSchema$1 = z.discriminatedUnion('type', [
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
z.union([
    z
        .string()
        .refine((val) => val in Blockchain, 'Must be a valid Blockchain enum value as string'),
    z.nativeEnum(Blockchain),
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
z.union([
    z.string().refine((val) => val in BridgeChain, (val) => ({
        message: `Chain "${val}" is not supported for bridging. Only chains in the BridgeChain enum support CCTPv2 bridging.`,
    })),
    chainDefinitionSchema$1.refine((chainDef) => chainDef.chain in BridgeChain, (chainDef) => ({
        message: `Chain "${chainDef.name}" (${chainDef.chain}) is not supported for bridging. Only chains in the BridgeChain enum support CCTPv2 bridging.`,
    })),
]);

/**
 * Get all supported EVM chain definitions.
 *
 * This function searches through all available blockchain definitions and returns
 * only those that are EVM-compatible. It provides a comprehensive list of all
 * EVM chains supported by the Stablecoin Kits ecosystem.
 *
 * @returns Array of all EVM chain definitions supported by the library
 *
 * @example
 * ```typescript
 * import { getAllEvmChains } from '@core/chains'
 *
 * const evmChains = getAllEvmChains()
 * console.log(`Found ${evmChains.length} EVM chains`)
 *
 * // List all EVM chain names
 * evmChains.forEach(chain => {
 *   console.log(`- ${chain.name} (Chain ID: ${chain.chainId})`)
 * })
 *
 * // Use for adapter capabilities
 * const capabilities = {
 *   addressContext: 'user-controlled',
 *   supportedChains: getAllEvmChains() // Support all EVM chains
 * }
 * ```
 *
 * @example
 * ```typescript
 * import { getAllEvmChains } from '@core/chains'
 *
 * // Filter for mainnet chains only
 * const mainnetChains = getAllEvmChains().filter(chain => !chain.isTestnet)
 *
 * // Filter for specific chains
 * const layer2Chains = getAllEvmChains().filter(chain =>
 *   ['Base', 'Polygon', 'Arbitrum', 'Optimism'].includes(chain.name)
 * )
 * ```
 */
function getAllEvmChains() {
    return Object.values(Blockchains).filter((chain) => chain.type === 'evm');
}

/**
 * Retrieve a chain definition by EVM chain ID.
 *
 * This function searches through all available blockchain definitions to find
 * a chain that matches the provided EVM chain ID. The ID corresponds
 * to the standard EIP-155 chain ID.
 *
 * @param id - The numeric EVM chain ID (EIP-155 chain ID).
 * @returns The chain definition object matching the provided chain ID.
 * @throws When no chain matches the specified ID.
 *
 * @example
 * ```typescript
 * import { getChainByEvmChainId } from '@core/chains';
 *
 * // Get Ethereum mainnet by chain ID
 * const ethereum = getChainByEvmChainId(1);
 * console.log(ethereum.name); // "Ethereum"
 * console.log(ethereum.type); // "evm"
 * console.log(ethereum.chainId); // 1
 *
 * // Get Polygon by chain ID
 * const polygon = getChainByEvmChainId(137);
 * console.log(polygon.name); // "Polygon"
 *
 * // Get Base by chain ID
 * const base = getChainByEvmChainId(8453);
 * console.log(base.name); // "Base"
 *
 * // Handle non-existent chain
 * try {
 *   const unknownChain = getChainByEvmChainId(99999);
 * } catch (error) {
 *   console.error('Chain not found:', error.message);
 * }
 * ```
 */
function getChainByEvmChainId(id) {
    const chain = Object.values(Blockchains).find((chain) => {
        return chain.type === 'evm' && chain.chainId === id;
    });
    if (!chain) {
        throw new Error(`Chain with ID ${String(id)} not found`);
    }
    return chain;
}

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
 * Extract the default RPC endpoint from a chain definition.
 *
 * This utility function provides a standardized way to access the primary
 * RPC endpoint from a chain definition. It returns the first endpoint in
 * the rpcEndpoints array, which is considered the primary/default endpoint.
 *
 * @param chain - The chain definition containing RPC endpoints
 * @returns The default RPC endpoint URL
 * @throws Error when no RPC endpoints are available
 *
 * @example
 * ```typescript
 * import { getDefaultRpcEndpoint } from '@core/chains'
 * import { Ethereum } from '@core/chains'
 *
 * // Get the default RPC endpoint for Ethereum
 * const rpcUrl = getDefaultRpcEndpoint(Ethereum)
 * console.log(rpcUrl) // "https://cloudflare-eth.com"
 * ```
 *
 * @example
 * ```typescript
 * import { getDefaultRpcEndpoint } from '@core/chains'
 * import { resolveChainIdentifier } from '@core/chains'
 *
 * // Use with dynamic chain resolution
 * const chain = resolveChainIdentifier('Polygon')
 * const rpcUrl = getDefaultRpcEndpoint(chain)
 * console.log(rpcUrl) // "https://polygon-rpc.com"
 * ```
 *
 * @example
 * ```typescript
 * import { getDefaultRpcEndpoint } from '@core/chains'
 * import { createPublicClient, http } from 'viem'
 * import { getViemChainByEnum } from '@adapters/viem.v2'
 *
 * // Use with viem PublicClient creation
 * const chain = resolveChainIdentifier('Ethereum')
 * const viemChain = getViemChainByEnum(chain.chain)
 * const rpcUrl = getDefaultRpcEndpoint(chain)
 *
 * const publicClient = createPublicClient({
 *   chain: viemChain,
 *   transport: http(rpcUrl)
 * })
 * ```
 */
function getDefaultRpcEndpoint(chain) {
    const defaultEndpoint = chain.rpcEndpoints[0];
    if (defaultEndpoint === undefined || defaultEndpoint === '') {
        throw new Error(`No RPC endpoints found for chain ${chain.name}. Please ensure the chain definition includes default RPC endpoints.`);
    }
    return defaultEndpoint;
}

/**
 * Resolves the contract address for CCTP v2 smart contracts.
 *
 * This method handles both split and merged contract configurations,
 * returning the appropriate address based on the requested contract type.
 *
 * @param chain - The chain definition to resolve the contract address for
 * @param contractType - The type of contract address to resolve ('tokenMessenger' or 'messageTransmitter')
 * @returns The contract address for the specified contract type
 * @throws Error when chain does not support CCTP v2 or has unsupported contract configuration
 */
const resolveCCTPV2ContractAddress = (chain, contractType) => {
    // Handle custom bridge contract for tokenMessenger (burn transaction)
    if (contractType === 'tokenMessenger' &&
        hasCustomContractSupport(chain, 'bridge') &&
        chain.kitContracts?.bridge !== undefined) {
        return chain.kitContracts.bridge;
    }
    // At this point we know CCTP v2 is supported, so contracts exist
    const cctpConfig = chain.cctp;
    const contracts = cctpConfig.contracts.v2;
    // Handle different contract types with explicit type checking
    switch (contracts.type) {
        case 'split':
            return contractType === 'tokenMessenger'
                ? contracts.tokenMessenger
                : contracts.messageTransmitter;
        case 'merged':
            return contracts.contract;
        default: {
            // Runtime safety check - this should never happen with proper typing
            const unknownContract = contracts;
            throw new Error(`Unsupported CCTP v2 contract type on chain ${chain.name}. Expected "split" or "merged", but received '${unknownContract.type ?? 'unknown'}'.`);
        }
    }
};

/**
 * Type-safe registry for managing and executing blockchain action handlers.
 *
 * Provides a centralized system for registering action handlers with full
 * TypeScript type safety, ensuring that handlers can only be registered
 * with compatible action keys and payload types. Supports both individual
 * handler registration and batch registration operations.
 *
 * @remarks
 * The registry uses a Map internally for O(1) lookups and maintains type
 * safety through generic constraints and careful type assertions. All
 * type assertions are validated at registration time to ensure runtime
 * type safety matches compile-time guarantees.
 */
class ActionRegistry {
    actionHandlers = new Map();
    /**
     * Register a type-safe action handler for a specific action key.
     *
     * Associates an action handler function with its corresponding action key,
     * ensuring compile-time type safety between the action and its expected
     * payload structure. The handler will be available for execution via
     * {@link executeAction}.
     *
     * @typeParam TActionKey - The specific action key being registered.
     * @param action - The action key to register the handler for.
     * @param handler - The handler function for processing this action type.
     * @returns Void.
     *
     * @throws Error When action parameter is not a valid string.
     * @throws TypeError When handler parameter is not a function.
     *
     * @example
     * ```typescript
     * import { ActionRegistry } from '@core/adapter'
     * import type { ActionHandler } from '@core/adapter'
     *
     * const registry = new ActionRegistry()
     *
     * // Register a CCTP deposit handler
     * const depositHandler: ActionHandler<'cctp.v2.depositForBurn'> = async (params, resolved) => {
     *   console.log('Processing deposit:', params.amount)
     *   return {
     *     chainId: params.chainId,
     *     data: '0x...',
     *     to: '0x...',
     *     value: '0'
     *   }
     * }
     *
     * registry.registerHandler('cctp.v2.depositForBurn', depositHandler)
     * ```
     */
    registerHandler(action, handler) {
        // Runtime validation for JavaScript consumers
        if (typeof action !== 'string' || action.length === 0) {
            throw new TypeError(`Action must be a non-empty string, received: ${typeof action}`);
        }
        if (typeof handler !== 'function') {
            throw new TypeError(`Handler must be a function, received: ${typeof handler}`);
        }
        // The handler is upcast to ActionHandler<ActionKeys> for storage,
        // but type safety is maintained at the call site through the generic constraint
        this.actionHandlers.set(action, handler);
    }
    /**
     * Register multiple action handlers in a single operation.
     *
     * Efficiently register multiple handlers from a record object, where keys
     * are action identifiers and values are their corresponding handler
     * functions. Provides a convenient way to bulk-register handlers while
     * maintaining type safety.
     *
     * @param handlers - A record mapping action keys to their handler functions.
     * @returns Void.
     *
     * @throws {Error} When handlers parameter is not a valid object.
     * @throws {Error} When any individual handler registration fails.
     *
     * @example
     * ```typescript
     * import { ActionRegistry } from '@core/adapter'
     * import type { ActionHandler, ActionHandlers } from '@core/adapter'
     *
     * const registry = new ActionRegistry()
     *
     * // Register multiple handlers at once
     * const tokenHandlers: ActionHandlers = {
     *   'token.approve': async (params, resolved) => ({
     *     chainId: resolved.chain,
     *     data: '0x095ea7b3...',
     *     to: params.tokenAddress,
     *     value: '0'
     *   }),
     *   'token.transfer': async (params, resolved) => ({
     *     chainId: resolved.chain,
     *     data: '0xa9059cbb...',
     *     to: params.tokenAddress,
     *     value: '0'
     *   })
     * }
     *
     * registry.registerHandlers(tokenHandlers)
     * console.log('Registered multiple token handlers')
     * ```
     */
    registerHandlers(handlers) {
        // Runtime validation for JavaScript consumers
        if (typeof handlers !== 'object' || handlers === null) {
            throw new Error(`Handlers must be a non-null object, received: ${typeof handlers}`);
        }
        // Register each handler individually to benefit from per-handler validation
        for (const [action, handler] of Object.entries(handlers)) {
            this.registerHandler(action, handler);
        }
    }
    /**
     * Check whether a specific action is supported by this registry.
     *
     * Determine if a handler has been registered for the given action key.
     * Use this method to conditionally execute actions or provide appropriate
     * error messages when actions are not available.
     *
     * @param action - The action key to check for support.
     * @returns True if the action is supported, false otherwise.
     *
     * @throws {Error} When action parameter is not a valid string.
     *
     * @example
     * ```typescript
     * import { ActionRegistry } from '@core/adapter'
     *
     * const registry = new ActionRegistry()
     *
     * // Check if actions are supported before attempting to use them
     * if (registry.supportsAction('token.approve')) {
     *   console.log('Token approval is supported')
     * } else {
     *   console.log('Token approval not available')
     * }
     *
     * // Conditional logic based on support
     * const action = 'cctp.v2.depositForBurn'
     * if (registry.supportsAction(action)) {
     *   // Safe to execute
     *   console.log(`${action} is available`)
     * } else {
     *   console.warn(`${action} is not registered`)
     * }
     * ```
     */
    supportsAction(action) {
        // Runtime validation for JavaScript consumers
        if (typeof action !== 'string' || action.length === 0) {
            throw new TypeError(`Action must be a non-empty string, received: ${typeof action}`);
        }
        return this.actionHandlers.has(action);
    }
    /**
     * Execute a registered action handler with type-safe parameters.
     *
     * Look up and execute the handler associated with the given action key,
     * passing the provided parameters and context, returning the resulting prepared
     * chain request. TypeScript ensures the parameters match the expected
     * structure for the specified action.
     *
     * @typeParam TActionKey - The specific action key being executed.
     * @param action - The action key identifying which handler to execute.
     * @param params - The parameters to pass to the action handler.
     * @param context - The resolved operation context with concrete chain and address values.
     * @returns A promise resolving to the prepared chain request.
     * @throws {KitError} When the handler execution fails with a structured error.
     * @throws {Error} When no handler is registered for the specified action.
     * @throws {Error} When the handler execution fails with an unstructured error.
     *
     * @example
     * ```typescript
     * import { ActionRegistry } from '@core/adapter'
     * import type { ChainEnum } from '@core/chains'
     *
     * const registry = new ActionRegistry()
     *
     * // First register a handler
     * registry.registerHandler('token.approve', async (params, context) => ({
     *   chainId: context.chain, // Always defined
     *   data: '0x095ea7b3...',
     *   to: params.tokenAddress,
     *   value: '0'
     * }))
     *
     * // Execute the action with resolved context (typically called from adapter.prepareAction)
     * const resolvedContext = { chain: 'Base', address: '0x123...' }
     * const result = await registry.executeAction('token.approve', {
     *   chainId: ChainEnum.Ethereum,
     *   tokenAddress: '0xA0b86a33E6441c8C1c7C16e4c5e3e5b5e4c5e3e5b5e4c5e',
     *   delegate: '0x1234567890123456789012345678901234567890',
     *   amount: '1000000'
     * }, resolvedContext)
     *
     * console.log('Transaction prepared:', result.data)
     * ```
     */
    async executeAction(action, params, context) {
        // Runtime validation for JavaScript consumers
        if (typeof action !== 'string' || action.length === 0) {
            throw new TypeError(`Action must be a non-empty string, received: ${typeof action}`);
        }
        const handler = this.actionHandlers.get(action);
        if (!handler) {
            throw new Error(`Action ${action} is not supported`);
        }
        try {
            // Type safety is guaranteed by the registration process
            return await handler(params, context);
        }
        catch (error) {
            // If it's already a KitError with structured information, re-throw as-is
            // to preserve error code, name, type, recoverability, and cause
            if (error instanceof KitError) {
                throw error;
            }
            // For other errors, re-throw with context for better debugging
            const message = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to execute action ${action}: ${message}`);
        }
    }
}

/**
 * Resolves an operation context into concrete chain and address values.
 *
 * This function ensures that action handlers always receive defined chain and address
 * values by applying validation and resolution logic based on the adapter's capabilities.
 * It enforces compile-time and runtime address requirements based on the adapter's
 * address control model.
 *
 * **Resolution logic**:
 * - **Chain**: Uses provided chain identifier and resolves to ChainDefinition
 * - **Address**:
 *   - For user-controlled adapters: Retrieves current address from adapter (context address ignored)
 *   - For developer-controlled adapters: Uses address provided in context (required)
 *
 * @typeParam TAdapterCapabilities - The adapter capabilities type for compile-time validation
 * @param adapter - The typed adapter instance with capabilities defined
 * @param ctx - Operation context with compile-time validated address requirements
 * @returns Promise resolving to concrete chain and address values
 * @throws Error when adapter capabilities are not defined
 * @throws Error when operation context is not provided
 * @throws Error when address is required but not provided (developer-controlled)
 * @throws Error when adapter.getAddress() fails (user-controlled)
 *
 * @example
 * ```typescript
 * import { resolveOperationContext } from '@core/adapter'
 *
 * // User-controlled adapter - address forbidden in context
 * const userAdapter: Adapter<{ addressContext: 'user-controlled', supportedChains: [] }>
 * const resolved = await resolveOperationContext(userAdapter, {
 *   chain: 'Base' // address will be resolved from wallet
 * })
 * console.log(resolved.chain)   // ChainDefinition - always defined
 * console.log(resolved.address) // string - resolved from adapter
 *
 * // Developer-controlled adapter - address required in context
 * const devAdapter: Adapter<{ addressContext: 'developer-controlled', supportedChains: [] }>
 * const resolved = await resolveOperationContext(devAdapter, {
 *   chain: 'Base',
 *   address: '0x123...' // Required and enforced at compile time
 * })
 * console.log(resolved.address) // '0x123...' - from context
 * ```
 */
async function resolveOperationContext(adapter, ctx) {
    // Adapter must have capabilities defined
    if (adapter.capabilities === undefined) {
        throw new Error('Adapter capabilities must be defined. Please ensure the adapter implements the capabilities property.');
    }
    // Operation context is required for new typed adapters
    if (ctx === undefined) {
        throw new Error('Operation context is required. Please provide a context with the required chain and address information.');
    }
    // Resolve chain from context (required)
    const resolvedChain = resolveChainIdentifier(ctx.chain);
    // Resolve address based on adapter capabilities
    let resolvedAddress;
    if (adapter.capabilities.addressContext === 'developer-controlled') {
        // Developer-controlled: address must be explicitly provided
        if (!ctx.address) {
            throw new Error('Address is required for developer-controlled adapters. Please provide an address in the operation context.');
        }
        resolvedAddress = ctx.address;
    }
    else {
        // User-controlled: get current address from adapter
        try {
            // Pass resolved chain to getAddress for adapters that support it (like ViemAdapter)
            // The chain parameter is optional in implementations, so this is safe
            resolvedAddress = await adapter.getAddress(resolvedChain);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to resolve address from user-controlled adapter: ${message}`);
        }
    }
    return {
        chain: resolvedChain,
        address: resolvedAddress,
    };
}

/**
 * Abstract class defining the standard interface for an adapter that interacts with a specific blockchain.
 *
 * A `Adapter` is responsible for encapsulating chain-specific logic necessary to
 * perform operations like sending transactions, querying balances, or interacting with smart contracts.
 * Implementations of this class will provide concrete logic for a particular blockchain protocol.
 *
 * This abstraction allows the Stablecoin Kits to work with multiple blockchains in a uniform way.
 *
 * @typeParam TAdapterCapabilities - The adapter capabilities type for compile-time address validation.
 * When provided, enables strict typing of operation context based on the adapter's address control model.
 */
class Adapter {
    /**
     * Capabilities of this adapter, defining address control model and supported chains.
     *
     * This property determines how the adapter behaves, especially for address selection
     * and bridge API requirements. The `addressContext` must match the adapter's type parameter.
     *
     * @remarks
     * The `addressContext` value must align with the adapter's generic type parameter for proper
     * type safety in bridge operations.
     *
     * @example
     * ```typescript
     * // User-controlled adapter (private key, browser wallet)
     * capabilities = {
     *   addressContext: 'user-controlled', // Address implicit in bridge operations
     *   supportedChains: [Ethereum, Base, Polygon]
     * }
     *
     * // Developer-controlled adapter (enterprise provider)
     * capabilities = {
     *   addressContext: 'developer-controlled', // Address required in bridge operations
     *   supportedChains: [Ethereum, Base, Solana]
     * }
     * ```
     */
    capabilities;
    /**
     * Registry of available actions for this adapter.
     *
     * The {@link ActionRegistry} provides a catalog of supported operations
     * (such as token transfers, approvals, etc.) that can be performed by this adapter
     * on the connected blockchain. This enables dynamic discovery and invocation
     * of chain-specific or cross-chain actions in a type-safe manner.
     *
     * @readonly
     */
    actionRegistry = new ActionRegistry();
    /**
     * Prepares (but does not execute) an action for the connected blockchain.
     *
     * This method looks up the appropriate action handler for the given action key
     * and prepares the transaction request using the provided parameters. The returned
     * {@link PreparedChainRequest} allows developers to estimate gas costs and execute
     * the transaction at a later time, enabling pre-flight simulation and deferred execution.
     *
     * **Compile-time Address Validation**: When used with typed adapters that have capabilities,
     * this method enforces address requirements at compile time:
     * - **User-controlled adapters**: The `address` field is forbidden in the context
     * - **Developer-controlled adapters**: The `address` field is required in the context
     * - **Legacy adapters**: The `address` field remains optional for backward compatibility
     *
     * @remarks
     * This method does not send any transaction to the network. Instead, it returns a
     * prepared request object with `estimate()` and `execute()` methods, allowing
     * developers to inspect, simulate, or submit the transaction as needed.
     *
     * @param action - The action key identifying which handler to use for preparation.
     * @param params - The parameters to pass to the action handler.
     * @param ctx - Operation context with compile-time validated address requirements based on adapter capabilities.
     * @returns A promise that resolves to a {@link PreparedChainRequest} for estimation and execution.
     * @throws Error If the specified action key does not correspond to a registered handler.
     * @throws Error If the provided parameters are invalid for the action.
     * @throws Error If the operation context cannot be resolved.
     *
     * @example
     * ```typescript
     * // User-controlled adapter (address forbidden)
     * const userAdapter: Adapter<{ addressContext: 'user-controlled', supportedChains: [] }>
     * await userAdapter.prepareAction('token.approve', params, {
     *   chain: 'Ethereum'
     *   // address: '0x123...' // ❌ TypeScript error: address not allowed
     * })
     *
     * // Developer-controlled adapter (address required)
     * const devAdapter: Adapter<{ addressContext: 'developer-controlled', supportedChains: [] }>
     * await devAdapter.prepareAction('token.approve', params, {
     *   chain: 'Ethereum',
     *   address: '0x123...' // ✅ Required for developer-controlled
     * })
     * ```
     */
    async prepareAction(action, params, ctx) {
        // Only prepares the action; does not execute it.
        // The returned PreparedChainRequest allows for estimation and execution.
        // Resolve the operation context to ensure handlers receive concrete values
        const resolvedContext = await resolveOperationContext(this, ctx);
        return this.actionRegistry.executeAction(action, params, resolvedContext);
    }
    /**
     * Ensures the adapter is operating on the specified chain, switching if necessary.
     *
     * This method provides a unified interface for establishing chain preconditions across different adapter types.
     * The behavior varies based on the adapter's capabilities:
     * - **Private key adapters**: Recreate clients with new RPC endpoints
     * - **Browser wallet adapters**: Request chain switch via EIP-1193 or equivalent
     * - **Multi-entity adapters**: Validate chain support (operations are contextual)
     *
     * @param chain - The target chain for operations.
     * @returns A promise that resolves when the adapter is operating on the specified chain.
     * @throws When the target chain is not supported or chain switching fails.
     *
     * @remarks
     * This method always calls `switchToChain()` to ensure consistency across all adapter types.
     * The underlying implementations handle idempotent switching efficiently (e.g., browser wallets
     * gracefully handle switching to the current chain, private key adapters recreate lightweight clients).
     *
     * @example
     * ```typescript
     * // Private key adapter - switches chains seamlessly
     * await privateKeyAdapter.ensureChain(Base)
     *
     * // Browser wallet - requests user to switch chains
     * await metamaskAdapter.ensureChain(Polygon)
     *
     * // Multi-entity adapter - validates chain is supported
     * await circleWalletsAdapter.ensureChain(Ethereum)
     * ```
     */
    async ensureChain(targetChain) {
        this.validateChainSupport(targetChain);
        // Always delegate to switchToChain - implementations handle idempotent switching
        try {
            await this.switchToChain(targetChain);
        }
        catch (error) {
            throw new Error(`Failed to switch to chain ${targetChain.name}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Validate that the target chain is supported by this adapter.
     *
     * @param targetChain - The chain to validate.
     * @throws KitError with INVALID_CHAIN code if the chain is not supported by this adapter.
     */
    validateChainSupport(targetChain) {
        if (this.capabilities?.supportedChains) {
            const isSupported = this.capabilities.supportedChains.some((supportedChain) => supportedChain.chain === targetChain.chain);
            if (!isSupported) {
                const supportedCount = this.capabilities.supportedChains.length;
                // List supported chain names for better user experience
                const supportedChainNames = this.capabilities.supportedChains
                    .map((chainDef) => chainDef.name)
                    .join(', ');
                const reason = `Not supported by this adapter. It supports ${supportedCount.toString()} ${supportedCount === 1 ? 'chain' : 'chains'}: ${supportedChainNames}`;
                throw createInvalidChainError(targetChain.name, reason);
            }
        }
        else if (this.chainType && targetChain.type !== this.chainType) {
            const reason = `Chain type mismatch: adapter supports ${this.chainType} chains, but received ${targetChain.type ?? 'unknown'} chain`;
            throw createInvalidChainError(targetChain.name, reason);
        }
    }
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
const chainDefinitionSchema = z.object({
    name: z
        .string({
        required_error: 'Chain name is required',
        invalid_type_error: 'Chain name must be a string',
    })
        .min(1, 'Chain name cannot be empty'),
    explorerUrl: z
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
const transactionHashSchema = z
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
z.object({
    chainDef: chainDefinitionSchema,
    txHash: transactionHashSchema,
});
/**
 * Zod schema for validating the generated explorer URL.
 * This schema ensures the generated URL is valid.
 */
z
    .string()
    .url('Generated explorer URL is invalid');

/**
 * Validates data against a Zod schema and throws a KitError on failure.
 *
 * This utility function provides consistent validation and error formatting across the codebase.
 * It performs the validation and formats error messages with contextual information while
 * preserving all individual validation errors in a structured format.
 *
 * @param value - The value to validate
 * @param schema - The Zod schema to validate against
 * @param message - Error message (e.g., 'Invalid EVM address', 'Configuration error')
 * @returns Asserts that value is of type T (type narrowing)
 * @throws {KitError} If validation fails with INPUT_VALIDATION_FAILED code (1098) and detailed error information
 *
 * @example
 * ```typescript
 * import { validateOrThrow } from '@core/utils'
 * import { z } from 'zod'
 *
 * const userSchema = z.object({
 *   name: z.string().min(3),
 *   age: z.number().positive()
 * })
 *
 * // This will throw KitError if validation fails
 * validateOrThrow({ name: 'Jo', age: -1 }, userSchema, 'Invalid user data')
 * // Throws: KitError with code 1098 and message "Invalid user data: name: String must contain at least 3 character(s)"
 * ```
 *
 * @example
 * ```typescript
 * // Usage in assertion functions with flexible messaging
 * validateOrThrow(address, evmAddressSchema, 'Invalid EVM address')
 * validateOrThrow(config, configSchema, 'Configuration error')
 * validateOrThrow(params, paramSchema, 'Bad parameters')
 * ```
 *
 * @example
 * ```typescript
 * // Usage in validation functions
 * function validateUserParams(params: unknown): void {
 *   validateOrThrow(params, userSchema, 'Invalid user parameters')
 *   // If we reach here, params is guaranteed to be valid
 * }
 * ```
 */
function validateOrThrow(value, schema, message) {
    const result = schema.safeParse(value);
    if (!result.success) {
        throw createValidationErrorFromZod(result.error, message);
    }
}

/**
 * Detect the format of the provided address string.
 *
 * Analyzes the address format and returns the corresponding chain type or bytes32
 * format. Supports EVM addresses (0x-prefixed 40-char hex), bytes32 addresses
 * (0x-prefixed 64-char hex), and Solana addresses (base58 encoded 32-byte keys).
 *
 * @param address - The address string to analyze.
 * @returns The detected format: 'evm', 'solana', or 'bytes32'.
 * @throws Error if the address format is unrecognized.
 *
 * @example
 * ```typescript
 * import { detectFormat } from '@core/utils'
 *
 * // EVM address
 * const evmFormat = detectFormat('0x1234567890abcdef1234567890abcdef12345678')
 * console.log(evmFormat) // 'evm'
 *
 * // Solana address
 * const solanaFormat = detectFormat('11111111111111111111111111111112')
 * console.log(solanaFormat) // 'solana'
 *
 * // Bytes32 address
 * const bytes32Format = detectFormat('0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef')
 * console.log(bytes32Format) // 'bytes32'
 * ```
 */
const detectFormat = (address) => {
    if (/^0x[0-9a-fA-F]{40}$/.test(address)) {
        return 'evm';
    }
    if (/^0x[0-9a-fA-F]{64}$/.test(address)) {
        return 'bytes32';
    }
    const decoded = bs58.decode(address);
    if (decoded.length === 32)
        return 'solana';
    throw new Error(`Unsupported address format: ${address}`);
};
/**
 * Convert an EVM address or Solana base58 key into a 32-byte hex string.
 *
 * This function normalizes addresses from different blockchain formats into a
 * standardized 32-byte hex representation. EVM addresses are zero-padded to
 * 32 bytes, while Solana addresses are decoded from base58 format.
 *
 * @param address - The address string to convert.
 * @returns A 32-byte hex string (0x-prefixed).
 * @throws Error if the address format is unsupported.
 *
 * @example
 * ```typescript
 * import { toBytes32 } from '@core/utils'
 *
 * // Convert EVM address
 * const evmBytes32 = toBytes32('0x1234567890abcdef1234567890abcdef12345678')
 * console.log(evmBytes32) // '0x0000000000000000000000001234567890abcdef1234567890abcdef12345678'
 *
 * // Convert Solana address
 * const solanaBytes32 = toBytes32('11111111111111111111111111111112')
 * console.log(solanaBytes32) // '0x...' (32-byte hex representation)
 * ```
 */
const toBytes32 = (address) => {
    const fmt = detectFormat(address);
    switch (fmt) {
        case 'evm':
            // pad 20-byte address → 32 bytes
            return hexZeroPad(address, 32);
        case 'bytes32':
            return address;
        case 'solana':
            // base58 decode → raw 32 bytes → hex
            return hexlify(bs58.decode(address));
    }
    throw new Error(`Unsupported address format: ${address}`);
};
/**
 * Convert a bytes32 hex string to a checksummed EVM address.
 *
 * This function extracts the last 20 bytes from a 32-byte hex string and
 * converts it to a valid EVM address with EIP-55 checksum formatting.
 *
 * @param bytes32 - The 32-byte hex string (with or without 0x prefix).
 * @returns A checksummed EVM address (0x-prefixed).
 * @throws Error if the input is not a valid hex string.
 *
 * @example
 * ```typescript
 * import { bytes32ToEvm } from '@core/utils'
 *
 * // Convert bytes32 to EVM address
 * const evmAddress = bytes32ToEvm('0x0000000000000000000000001234567890abcdef1234567890abcdef12345678')
 * console.log(evmAddress) // '0x1234567890AbcdEF1234567890aBcdeF12345678' (checksummed)
 *
 * // Works without 0x prefix too
 * const evmAddress2 = bytes32ToEvm('0000000000000000000000001234567890abcdef1234567890abcdef12345678')
 * console.log(evmAddress2) // '0x1234567890AbcdEF1234567890aBcdeF12345678'
 * ```
 */
const bytes32ToEvm = (bytes32) => {
    // remove 0x prefix
    const hex = bytes32.startsWith('0x') ? bytes32.slice(2) : bytes32;
    // take last 20 bytes (40 hex chars)
    const ethHex = '0x' + hex.slice(-40);
    // apply EIP-55 checksum
    return getAddress(ethHex);
};
/**
 * Convert a bytes32 hex string to a Solana base58 address.
 *
 * This function takes a 32-byte hex string and converts it to a Solana
 * public key address using base58 encoding.
 *
 * @param bytes32 - The 32-byte hex string (with or without 0x prefix).
 * @returns A Solana address in base58 format.
 * @throws Error if the input is not a valid hex string.
 *
 * @example
 * ```typescript
 * import { bytes32ToSolana } from '@core/utils'
 *
 * // Convert bytes32 to Solana address
 * const solanaAddress = bytes32ToSolana('0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef')
 * console.log(solanaAddress) // Base58 encoded address
 *
 * // Works without 0x prefix too
 * const solanaAddress2 = bytes32ToSolana('1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef')
 * console.log(solanaAddress2) // Base58 encoded address
 * ```
 */
function bytes32ToSolana(bytes32) {
    const hex = bytes32.startsWith('0x') ? bytes32.slice(2) : bytes32;
    const buffer = Buffer.from(hex, 'hex');
    return bs58.encode(new Uint8Array(buffer));
}
/**
 * Convert any supported address format into the target format.
 * @param address - input address (auto-detected)
 * @param targetFormat - one of 'evm', 'solana', or 'bytes32'
 * @returns converted address string
 */
const convertAddress = (address, targetFormat) => {
    const current = detectFormat(address);
    if (current === targetFormat)
        return address;
    // first normalize to bytes32
    const asBytes32 = toBytes32(address);
    // then to target
    switch (targetFormat) {
        case 'bytes32':
            return asBytes32;
        case 'evm':
            return bytes32ToEvm(asBytes32);
        case 'solana':
            return bytes32ToSolana(asBytes32);
    }
    throw new Error(`Unsupported address format: ${address}`);
};

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
const hexStringSchema = z
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
const evmAddressSchema = hexStringSchema.refine((value) => value.length === 42, 'EVM address must be exactly 42 characters long (0x + 40 hex characters)');
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
const base58StringSchema = z
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
const adapterSchema = z.object({
    prepare: z.function(),
    waitForTransaction: z.function(),
    getAddress: z.function(),
});

/**
 * Asserts that the provided parameters match the EVM address interface.
 * The validation includes:
 * - A valid EVM address
 *
 * @param address - The address to validate
 * @throws {KitError} If validation fails with INPUT_VALIDATION_FAILED code (1098), with details about which properties failed
 *
 * @example
 * ```typescript
 * import { assertEvmAddress } from '@core/adapter'
 *
 * // Prepare EVM address
 * const address = '0x1234567890123456789012345678901234567890'
 *
 * // This will throw if validation fails
 * assertEvmAddress(address)
 *
 * // If we get here, address is guaranteed to be valid
 * console.log('EVM address is valid')
 * ```
 */
function assertEvmAddress(address) {
    validateOrThrow(address, evmAddressSchema, 'Invalid EVM address');
}

/**
 * Creates a no-op prepared chain request.
 *
 * @remarks
 * This function returns a no-op prepared chain request that performs no operation.
 * It is used when an action is not supported by the target chain or when
 * no actual blockchain interaction is required.
 *
 * The estimate and execute methods return placeholder values since no actual
 * transaction is performed. This allows the calling code to handle unsupported
 * operations gracefully without breaking the expected interface contract.
 *
 * @returns A promise that resolves to a no-op prepared chain request.
 * @example
 * ```typescript
 * const noopRequest = await createNoopChainRequest();
 * const gasEstimate = await noopRequest.estimate();
 * console.log(gasEstimate); // { gas: 0n, gasPrice: 0n, fee: '0' }
 *
 * const txHash = await noopRequest.execute();
 * console.log(txHash); // "0x0000000000000000000000000000000000000000000000000000000000000000"
 * ```
 */
const createNoopChainRequest = async () => {
    return Promise.resolve({
        type: 'noop',
        estimate: async () => Promise.resolve({ gas: 0n, gasPrice: 0n, fee: '0' }),
        execute: async () => Promise.resolve('0x0000000000000000000000000000000000000000000000000000000000000000'),
    });
};

/**
 * Default buffer in basis points (5%) applied to transaction fee calculations.
 * This provides a safety margin for gas price fluctuations to ensure transaction success.
 *
 * @remarks
 * This constant is used across all adapter implementations to provide consistent
 * fee buffering behavior. One basis point equals 0.01%, so 500 basis points equals 5%.
 *
 * @example
 * ```typescript
 * import { DEFAULT_BUFFER_BASIS_POINTS } from '@core/adapter'
 *
 * // Use in fee calculation
 * const bufferedFee = baseFee + (baseFee * DEFAULT_BUFFER_BASIS_POINTS) / 10000n
 * ```
 */
const DEFAULT_BUFFER_BASIS_POINTS = 500n;

/**
 * Creates default adapter capabilities with intelligent chain expansion and clean type inference.
 *
 * This utility function automatically expands to include all supported chains of the specified
 * ecosystem type. It provides maximum flexibility while maintaining a clean API and preserves
 * exact literal types for TypeScript inference.
 *
 * @param ecosystem - The ecosystem type to expand to all supported chains of that type
 * @param overrides - Optional overrides to merge with the generated capabilities
 * @returns Complete AdapterCapabilities with auto-detected supported chains and preserved types
 */
function createAdapterCapabilities(ecosystem, overrides) {
    // Use provided addressContext or default to 'user-controlled'
    const addressContext = overrides?.addressContext ?? 'user-controlled';
    // If we have valid non-empty supportedChains override, use it directly
    if (overrides?.supportedChains && overrides.supportedChains.length > 0) {
        return {
            addressContext,
            supportedChains: overrides.supportedChains,
            ...overrides,
        };
    }
    // No overrides, no supportedChains in overrides, or empty supportedChains array
    // Silently fall back to auto-detection based on ecosystem type
    const supportedChains = getSupportedChains(ecosystem);
    return {
        addressContext,
        ...overrides,
        supportedChains,
    };
}
/**
 * Expands to all supported chains of the specified ecosystem type.
 *
 * @param ecosystem - The ecosystem type to expand to
 * @returns Array of all supported chains of the specified ecosystem type
 *
 * @internal
 */
function getSupportedChains(ecosystem) {
    switch (ecosystem) {
        case 'evm':
            // Get all EVM chains for maximum flexibility
            return getAllEvmChains();
        case 'solana':
            // Get all Solana chains
            return [Solana, SolanaDevnet];
        default:
            // This should never happen due to TypeScript typing, but provides safety
            throw new Error(`Unsupported ecosystem type: ${String(ecosystem)}`);
    }
}

/**
 * ERC20 ABI
 *
 * This ABI is used to interact with generic ERC20 tokens on EVM networks.
 *
 * @see https://github.com/ethereum/EIPs/blob/master/EIPS/eip-20.md
 */
const erc20Abi = [
    {
        constant: true,
        inputs: [],
        name: 'name',
        outputs: [
            {
                name: '',
                type: 'string',
            },
        ],
        payable: false,
        stateMutability: 'view',
        type: 'function',
    },
    {
        constant: false,
        inputs: [
            {
                name: '_spender',
                type: 'address',
            },
            {
                name: '_value',
                type: 'uint256',
            },
        ],
        name: 'approve',
        outputs: [
            {
                name: '',
                type: 'bool',
            },
        ],
        payable: false,
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        constant: true,
        inputs: [],
        name: 'totalSupply',
        outputs: [
            {
                name: '',
                type: 'uint256',
            },
        ],
        payable: false,
        stateMutability: 'view',
        type: 'function',
    },
    {
        constant: false,
        inputs: [
            {
                name: '_from',
                type: 'address',
            },
            {
                name: '_to',
                type: 'address',
            },
            {
                name: '_value',
                type: 'uint256',
            },
        ],
        name: 'transferFrom',
        outputs: [
            {
                name: '',
                type: 'bool',
            },
        ],
        payable: false,
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        constant: true,
        inputs: [],
        name: 'decimals',
        outputs: [
            {
                name: '',
                type: 'uint8',
            },
        ],
        payable: false,
        stateMutability: 'view',
        type: 'function',
    },
    {
        constant: true,
        inputs: [
            {
                name: '_owner',
                type: 'address',
            },
        ],
        name: 'balanceOf',
        outputs: [
            {
                name: 'balance',
                type: 'uint256',
            },
        ],
        payable: false,
        stateMutability: 'view',
        type: 'function',
    },
    {
        constant: true,
        inputs: [],
        name: 'symbol',
        outputs: [
            {
                name: '',
                type: 'string',
            },
        ],
        payable: false,
        stateMutability: 'view',
        type: 'function',
    },
    {
        constant: false,
        inputs: [
            {
                name: '_to',
                type: 'address',
            },
            {
                name: '_value',
                type: 'uint256',
            },
        ],
        name: 'transfer',
        outputs: [
            {
                name: '',
                type: 'bool',
            },
        ],
        payable: false,
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        constant: true,
        inputs: [
            {
                name: '_owner',
                type: 'address',
            },
            {
                name: '_spender',
                type: 'address',
            },
        ],
        name: 'allowance',
        outputs: [
            {
                name: '',
                type: 'uint256',
            },
        ],
        payable: false,
        stateMutability: 'view',
        type: 'function',
    },
    {
        payable: true,
        stateMutability: 'payable',
        type: 'fallback',
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                name: 'owner',
                type: 'address',
            },
            {
                indexed: true,
                name: 'spender',
                type: 'address',
            },
            {
                indexed: false,
                name: 'value',
                type: 'uint256',
            },
        ],
        name: 'Approval',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                name: 'from',
                type: 'address',
            },
            {
                indexed: true,
                name: 'to',
                type: 'address',
            },
            {
                indexed: false,
                name: 'value',
                type: 'uint256',
            },
        ],
        name: 'Transfer',
        type: 'event',
    },
];

/**
 * USDC ABI
 *
 * This ABI is used to interact with the USDC token on EVM networks.
 *
 * @see https://developers.circle.com/stablecoins/what-is-usdc
 */
const usdcAbi = [
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: 'address',
                name: 'owner',
                type: 'address',
            },
            {
                indexed: true,
                internalType: 'address',
                name: 'spender',
                type: 'address',
            },
            {
                indexed: false,
                internalType: 'uint256',
                name: 'value',
                type: 'uint256',
            },
        ],
        name: 'Approval',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: 'address',
                name: 'authorizer',
                type: 'address',
            },
            {
                indexed: true,
                internalType: 'bytes32',
                name: 'nonce',
                type: 'bytes32',
            },
        ],
        name: 'AuthorizationCanceled',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: 'address',
                name: 'authorizer',
                type: 'address',
            },
            {
                indexed: true,
                internalType: 'bytes32',
                name: 'nonce',
                type: 'bytes32',
            },
        ],
        name: 'AuthorizationUsed',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: 'address',
                name: '_account',
                type: 'address',
            },
        ],
        name: 'Blacklisted',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: 'address',
                name: 'newBlacklister',
                type: 'address',
            },
        ],
        name: 'BlacklisterChanged',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: 'address',
                name: 'burner',
                type: 'address',
            },
            {
                indexed: false,
                internalType: 'uint256',
                name: 'amount',
                type: 'uint256',
            },
        ],
        name: 'Burn',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: 'address',
                name: 'newMasterMinter',
                type: 'address',
            },
        ],
        name: 'MasterMinterChanged',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: 'address',
                name: 'minter',
                type: 'address',
            },
            {
                indexed: true,
                internalType: 'address',
                name: 'to',
                type: 'address',
            },
            {
                indexed: false,
                internalType: 'uint256',
                name: 'amount',
                type: 'uint256',
            },
        ],
        name: 'Mint',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: 'address',
                name: 'minter',
                type: 'address',
            },
            {
                indexed: false,
                internalType: 'uint256',
                name: 'minterAllowedAmount',
                type: 'uint256',
            },
        ],
        name: 'MinterConfigured',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: 'address',
                name: 'oldMinter',
                type: 'address',
            },
        ],
        name: 'MinterRemoved',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: false,
                internalType: 'address',
                name: 'previousOwner',
                type: 'address',
            },
            {
                indexed: false,
                internalType: 'address',
                name: 'newOwner',
                type: 'address',
            },
        ],
        name: 'OwnershipTransferred',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [],
        name: 'Pause',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: 'address',
                name: 'newAddress',
                type: 'address',
            },
        ],
        name: 'PauserChanged',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: 'address',
                name: 'newRescuer',
                type: 'address',
            },
        ],
        name: 'RescuerChanged',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: 'address',
                name: 'from',
                type: 'address',
            },
            {
                indexed: true,
                internalType: 'address',
                name: 'to',
                type: 'address',
            },
            {
                indexed: false,
                internalType: 'uint256',
                name: 'value',
                type: 'uint256',
            },
        ],
        name: 'Transfer',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: 'address',
                name: '_account',
                type: 'address',
            },
        ],
        name: 'UnBlacklisted',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [],
        name: 'Unpause',
        type: 'event',
    },
    {
        inputs: [],
        name: 'CANCEL_AUTHORIZATION_TYPEHASH',
        outputs: [
            {
                internalType: 'bytes32',
                name: '',
                type: 'bytes32',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'DOMAIN_SEPARATOR',
        outputs: [
            {
                internalType: 'bytes32',
                name: '',
                type: 'bytes32',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'PERMIT_TYPEHASH',
        outputs: [
            {
                internalType: 'bytes32',
                name: '',
                type: 'bytes32',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'RECEIVE_WITH_AUTHORIZATION_TYPEHASH',
        outputs: [
            {
                internalType: 'bytes32',
                name: '',
                type: 'bytes32',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'TRANSFER_WITH_AUTHORIZATION_TYPEHASH',
        outputs: [
            {
                internalType: 'bytes32',
                name: '',
                type: 'bytes32',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'owner',
                type: 'address',
            },
            {
                internalType: 'address',
                name: 'spender',
                type: 'address',
            },
        ],
        name: 'allowance',
        outputs: [
            {
                internalType: 'uint256',
                name: '',
                type: 'uint256',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'spender',
                type: 'address',
            },
            {
                internalType: 'uint256',
                name: 'value',
                type: 'uint256',
            },
        ],
        name: 'approve',
        outputs: [
            {
                internalType: 'bool',
                name: '',
                type: 'bool',
            },
        ],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'authorizer',
                type: 'address',
            },
            {
                internalType: 'bytes32',
                name: 'nonce',
                type: 'bytes32',
            },
        ],
        name: 'authorizationState',
        outputs: [
            {
                internalType: 'bool',
                name: '',
                type: 'bool',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'account',
                type: 'address',
            },
        ],
        name: 'balanceOf',
        outputs: [
            {
                internalType: 'uint256',
                name: '',
                type: 'uint256',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: '_account',
                type: 'address',
            },
        ],
        name: 'blacklist',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [],
        name: 'blacklister',
        outputs: [
            {
                internalType: 'address',
                name: '',
                type: 'address',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'uint256',
                name: '_amount',
                type: 'uint256',
            },
        ],
        name: 'burn',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'authorizer',
                type: 'address',
            },
            {
                internalType: 'bytes32',
                name: 'nonce',
                type: 'bytes32',
            },
            {
                internalType: 'uint8',
                name: 'v',
                type: 'uint8',
            },
            {
                internalType: 'bytes32',
                name: 'r',
                type: 'bytes32',
            },
            {
                internalType: 'bytes32',
                name: 's',
                type: 'bytes32',
            },
        ],
        name: 'cancelAuthorization',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'minter',
                type: 'address',
            },
            {
                internalType: 'uint256',
                name: 'minterAllowedAmount',
                type: 'uint256',
            },
        ],
        name: 'configureMinter',
        outputs: [
            {
                internalType: 'bool',
                name: '',
                type: 'bool',
            },
        ],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [],
        name: 'currency',
        outputs: [
            {
                internalType: 'string',
                name: '',
                type: 'string',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'decimals',
        outputs: [
            {
                internalType: 'uint8',
                name: '',
                type: 'uint8',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'spender',
                type: 'address',
            },
            {
                internalType: 'uint256',
                name: 'decrement',
                type: 'uint256',
            },
        ],
        name: 'decreaseAllowance',
        outputs: [
            {
                internalType: 'bool',
                name: '',
                type: 'bool',
            },
        ],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'spender',
                type: 'address',
            },
            {
                internalType: 'uint256',
                name: 'increment',
                type: 'uint256',
            },
        ],
        name: 'increaseAllowance',
        outputs: [
            {
                internalType: 'bool',
                name: '',
                type: 'bool',
            },
        ],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'string',
                name: 'tokenName',
                type: 'string',
            },
            {
                internalType: 'string',
                name: 'tokenSymbol',
                type: 'string',
            },
            {
                internalType: 'string',
                name: 'tokenCurrency',
                type: 'string',
            },
            {
                internalType: 'uint8',
                name: 'tokenDecimals',
                type: 'uint8',
            },
            {
                internalType: 'address',
                name: 'newMasterMinter',
                type: 'address',
            },
            {
                internalType: 'address',
                name: 'newPauser',
                type: 'address',
            },
            {
                internalType: 'address',
                name: 'newBlacklister',
                type: 'address',
            },
            {
                internalType: 'address',
                name: 'newOwner',
                type: 'address',
            },
        ],
        name: 'initialize',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'string',
                name: 'newName',
                type: 'string',
            },
        ],
        name: 'initializeV2',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'lostAndFound',
                type: 'address',
            },
        ],
        name: 'initializeV2_1',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: '_account',
                type: 'address',
            },
        ],
        name: 'isBlacklisted',
        outputs: [
            {
                internalType: 'bool',
                name: '',
                type: 'bool',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'account',
                type: 'address',
            },
        ],
        name: 'isMinter',
        outputs: [
            {
                internalType: 'bool',
                name: '',
                type: 'bool',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'masterMinter',
        outputs: [
            {
                internalType: 'address',
                name: '',
                type: 'address',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: '_to',
                type: 'address',
            },
            {
                internalType: 'uint256',
                name: '_amount',
                type: 'uint256',
            },
        ],
        name: 'mint',
        outputs: [
            {
                internalType: 'bool',
                name: '',
                type: 'bool',
            },
        ],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'minter',
                type: 'address',
            },
        ],
        name: 'minterAllowance',
        outputs: [
            {
                internalType: 'uint256',
                name: '',
                type: 'uint256',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'name',
        outputs: [
            {
                internalType: 'string',
                name: '',
                type: 'string',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'owner',
                type: 'address',
            },
        ],
        name: 'nonces',
        outputs: [
            {
                internalType: 'uint256',
                name: '',
                type: 'uint256',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'owner',
        outputs: [
            {
                internalType: 'address',
                name: '',
                type: 'address',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'pause',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [],
        name: 'paused',
        outputs: [
            {
                internalType: 'bool',
                name: '',
                type: 'bool',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'pauser',
        outputs: [
            {
                internalType: 'address',
                name: '',
                type: 'address',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'owner',
                type: 'address',
            },
            {
                internalType: 'address',
                name: 'spender',
                type: 'address',
            },
            {
                internalType: 'uint256',
                name: 'value',
                type: 'uint256',
            },
            {
                internalType: 'uint256',
                name: 'deadline',
                type: 'uint256',
            },
            {
                internalType: 'uint8',
                name: 'v',
                type: 'uint8',
            },
            {
                internalType: 'bytes32',
                name: 'r',
                type: 'bytes32',
            },
            {
                internalType: 'bytes32',
                name: 's',
                type: 'bytes32',
            },
        ],
        name: 'permit',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'from',
                type: 'address',
            },
            {
                internalType: 'address',
                name: 'to',
                type: 'address',
            },
            {
                internalType: 'uint256',
                name: 'value',
                type: 'uint256',
            },
            {
                internalType: 'uint256',
                name: 'validAfter',
                type: 'uint256',
            },
            {
                internalType: 'uint256',
                name: 'validBefore',
                type: 'uint256',
            },
            {
                internalType: 'bytes32',
                name: 'nonce',
                type: 'bytes32',
            },
            {
                internalType: 'uint8',
                name: 'v',
                type: 'uint8',
            },
            {
                internalType: 'bytes32',
                name: 'r',
                type: 'bytes32',
            },
            {
                internalType: 'bytes32',
                name: 's',
                type: 'bytes32',
            },
        ],
        name: 'receiveWithAuthorization',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'minter',
                type: 'address',
            },
        ],
        name: 'removeMinter',
        outputs: [
            {
                internalType: 'bool',
                name: '',
                type: 'bool',
            },
        ],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'contract IERC20',
                name: 'tokenContract',
                type: 'address',
            },
            {
                internalType: 'address',
                name: 'to',
                type: 'address',
            },
            {
                internalType: 'uint256',
                name: 'amount',
                type: 'uint256',
            },
        ],
        name: 'rescueERC20',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [],
        name: 'rescuer',
        outputs: [
            {
                internalType: 'address',
                name: '',
                type: 'address',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'symbol',
        outputs: [
            {
                internalType: 'string',
                name: '',
                type: 'string',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'totalSupply',
        outputs: [
            {
                internalType: 'uint256',
                name: '',
                type: 'uint256',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'to',
                type: 'address',
            },
            {
                internalType: 'uint256',
                name: 'value',
                type: 'uint256',
            },
        ],
        name: 'transfer',
        outputs: [
            {
                internalType: 'bool',
                name: '',
                type: 'bool',
            },
        ],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'from',
                type: 'address',
            },
            {
                internalType: 'address',
                name: 'to',
                type: 'address',
            },
            {
                internalType: 'uint256',
                name: 'value',
                type: 'uint256',
            },
        ],
        name: 'transferFrom',
        outputs: [
            {
                internalType: 'bool',
                name: '',
                type: 'bool',
            },
        ],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'newOwner',
                type: 'address',
            },
        ],
        name: 'transferOwnership',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'from',
                type: 'address',
            },
            {
                internalType: 'address',
                name: 'to',
                type: 'address',
            },
            {
                internalType: 'uint256',
                name: 'value',
                type: 'uint256',
            },
            {
                internalType: 'uint256',
                name: 'validAfter',
                type: 'uint256',
            },
            {
                internalType: 'uint256',
                name: 'validBefore',
                type: 'uint256',
            },
            {
                internalType: 'bytes32',
                name: 'nonce',
                type: 'bytes32',
            },
            {
                internalType: 'uint8',
                name: 'v',
                type: 'uint8',
            },
            {
                internalType: 'bytes32',
                name: 'r',
                type: 'bytes32',
            },
            {
                internalType: 'bytes32',
                name: 's',
                type: 'bytes32',
            },
        ],
        name: 'transferWithAuthorization',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: '_account',
                type: 'address',
            },
        ],
        name: 'unBlacklist',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [],
        name: 'unpause',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: '_newBlacklister',
                type: 'address',
            },
        ],
        name: 'updateBlacklister',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: '_newMasterMinter',
                type: 'address',
            },
        ],
        name: 'updateMasterMinter',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: '_newPauser',
                type: 'address',
            },
        ],
        name: 'updatePauser',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'newRescuer',
                type: 'address',
            },
        ],
        name: 'updateRescuer',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [],
        name: 'version',
        outputs: [
            {
                internalType: 'string',
                name: '',
                type: 'string',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
];

/**
 * Message Transmitter V2 ABI
 *
 * This ABI is used to interact with the Message Transmitter V2 contract on EVM networks.
 *
 * @see https://developers.circle.com/stablecoins/evm-smart-contracts#messagetransmitter
 */
const messageTransmitterV2Abi = [
    {
        type: 'constructor',
        inputs: [
            {
                name: '_localDomain',
                type: 'uint32',
                internalType: 'uint32',
            },
            {
                name: '_version',
                type: 'uint32',
                internalType: 'uint32',
            },
        ],
        stateMutability: 'nonpayable',
    },
    {
        type: 'function',
        name: 'NONCE_USED',
        inputs: [],
        outputs: [
            {
                name: '',
                type: 'uint256',
                internalType: 'uint256',
            },
        ],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'acceptOwnership',
        inputs: [],
        outputs: [],
        stateMutability: 'nonpayable',
    },
    {
        type: 'function',
        name: 'attesterManager',
        inputs: [],
        outputs: [
            {
                name: '',
                type: 'address',
                internalType: 'address',
            },
        ],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'disableAttester',
        inputs: [
            {
                name: 'attester',
                type: 'address',
                internalType: 'address',
            },
        ],
        outputs: [],
        stateMutability: 'nonpayable',
    },
    {
        type: 'function',
        name: 'enableAttester',
        inputs: [
            {
                name: 'newAttester',
                type: 'address',
                internalType: 'address',
            },
        ],
        outputs: [],
        stateMutability: 'nonpayable',
    },
    {
        type: 'function',
        name: 'getEnabledAttester',
        inputs: [
            {
                name: 'index',
                type: 'uint256',
                internalType: 'uint256',
            },
        ],
        outputs: [
            {
                name: '',
                type: 'address',
                internalType: 'address',
            },
        ],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'getNumEnabledAttesters',
        inputs: [],
        outputs: [
            {
                name: '',
                type: 'uint256',
                internalType: 'uint256',
            },
        ],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'initialize',
        inputs: [
            {
                name: 'owner_',
                type: 'address',
                internalType: 'address',
            },
            {
                name: 'pauser_',
                type: 'address',
                internalType: 'address',
            },
            {
                name: 'rescuer_',
                type: 'address',
                internalType: 'address',
            },
            {
                name: 'attesterManager_',
                type: 'address',
                internalType: 'address',
            },
            {
                name: 'attesters_',
                type: 'address[]',
                internalType: 'address[]',
            },
            {
                name: 'signatureThreshold_',
                type: 'uint256',
                internalType: 'uint256',
            },
            {
                name: 'maxMessageBodySize_',
                type: 'uint256',
                internalType: 'uint256',
            },
        ],
        outputs: [],
        stateMutability: 'nonpayable',
    },
    {
        type: 'function',
        name: 'initializedVersion',
        inputs: [],
        outputs: [
            {
                name: '',
                type: 'uint64',
                internalType: 'uint64',
            },
        ],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'isEnabledAttester',
        inputs: [
            {
                name: 'attester',
                type: 'address',
                internalType: 'address',
            },
        ],
        outputs: [
            {
                name: '',
                type: 'bool',
                internalType: 'bool',
            },
        ],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'localDomain',
        inputs: [],
        outputs: [
            {
                name: '',
                type: 'uint32',
                internalType: 'uint32',
            },
        ],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'maxMessageBodySize',
        inputs: [],
        outputs: [
            {
                name: '',
                type: 'uint256',
                internalType: 'uint256',
            },
        ],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'owner',
        inputs: [],
        outputs: [
            {
                name: '',
                type: 'address',
                internalType: 'address',
            },
        ],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'pause',
        inputs: [],
        outputs: [],
        stateMutability: 'nonpayable',
    },
    {
        type: 'function',
        name: 'paused',
        inputs: [],
        outputs: [
            {
                name: '',
                type: 'bool',
                internalType: 'bool',
            },
        ],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'pauser',
        inputs: [],
        outputs: [
            {
                name: '',
                type: 'address',
                internalType: 'address',
            },
        ],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'pendingOwner',
        inputs: [],
        outputs: [
            {
                name: '',
                type: 'address',
                internalType: 'address',
            },
        ],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'receiveMessage',
        inputs: [
            {
                name: 'message',
                type: 'bytes',
                internalType: 'bytes',
            },
            {
                name: 'attestation',
                type: 'bytes',
                internalType: 'bytes',
            },
        ],
        outputs: [
            {
                name: 'success',
                type: 'bool',
                internalType: 'bool',
            },
        ],
        stateMutability: 'nonpayable',
    },
    {
        type: 'function',
        name: 'rescueERC20',
        inputs: [
            {
                name: 'tokenContract',
                type: 'address',
                internalType: 'contract IERC20',
            },
            {
                name: 'to',
                type: 'address',
                internalType: 'address',
            },
            {
                name: 'amount',
                type: 'uint256',
                internalType: 'uint256',
            },
        ],
        outputs: [],
        stateMutability: 'nonpayable',
    },
    {
        type: 'function',
        name: 'rescuer',
        inputs: [],
        outputs: [
            {
                name: '',
                type: 'address',
                internalType: 'address',
            },
        ],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'sendMessage',
        inputs: [
            {
                name: 'destinationDomain',
                type: 'uint32',
                internalType: 'uint32',
            },
            {
                name: 'recipient',
                type: 'bytes32',
                internalType: 'bytes32',
            },
            {
                name: 'destinationCaller',
                type: 'bytes32',
                internalType: 'bytes32',
            },
            {
                name: 'minFinalityThreshold',
                type: 'uint32',
                internalType: 'uint32',
            },
            {
                name: 'messageBody',
                type: 'bytes',
                internalType: 'bytes',
            },
        ],
        outputs: [],
        stateMutability: 'nonpayable',
    },
    {
        type: 'function',
        name: 'setMaxMessageBodySize',
        inputs: [
            {
                name: 'newMaxMessageBodySize',
                type: 'uint256',
                internalType: 'uint256',
            },
        ],
        outputs: [],
        stateMutability: 'nonpayable',
    },
    {
        type: 'function',
        name: 'setSignatureThreshold',
        inputs: [
            {
                name: 'newSignatureThreshold',
                type: 'uint256',
                internalType: 'uint256',
            },
        ],
        outputs: [],
        stateMutability: 'nonpayable',
    },
    {
        type: 'function',
        name: 'signatureThreshold',
        inputs: [],
        outputs: [
            {
                name: '',
                type: 'uint256',
                internalType: 'uint256',
            },
        ],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'transferOwnership',
        inputs: [
            {
                name: 'newOwner',
                type: 'address',
                internalType: 'address',
            },
        ],
        outputs: [],
        stateMutability: 'nonpayable',
    },
    {
        type: 'function',
        name: 'unpause',
        inputs: [],
        outputs: [],
        stateMutability: 'nonpayable',
    },
    {
        type: 'function',
        name: 'updateAttesterManager',
        inputs: [
            {
                name: 'newAttesterManager',
                type: 'address',
                internalType: 'address',
            },
        ],
        outputs: [],
        stateMutability: 'nonpayable',
    },
    {
        type: 'function',
        name: 'updatePauser',
        inputs: [
            {
                name: '_newPauser',
                type: 'address',
                internalType: 'address',
            },
        ],
        outputs: [],
        stateMutability: 'nonpayable',
    },
    {
        type: 'function',
        name: 'updateRescuer',
        inputs: [
            {
                name: 'newRescuer',
                type: 'address',
                internalType: 'address',
            },
        ],
        outputs: [],
        stateMutability: 'nonpayable',
    },
    {
        type: 'function',
        name: 'usedNonces',
        inputs: [
            {
                name: '',
                type: 'bytes32',
                internalType: 'bytes32',
            },
        ],
        outputs: [
            {
                name: '',
                type: 'uint256',
                internalType: 'uint256',
            },
        ],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'version',
        inputs: [],
        outputs: [
            {
                name: '',
                type: 'uint32',
                internalType: 'uint32',
            },
        ],
        stateMutability: 'view',
    },
    {
        type: 'event',
        name: 'AttesterDisabled',
        inputs: [
            {
                name: 'attester',
                type: 'address',
                indexed: true,
                internalType: 'address',
            },
        ],
        anonymous: false,
    },
    {
        type: 'event',
        name: 'AttesterEnabled',
        inputs: [
            {
                name: 'attester',
                type: 'address',
                indexed: true,
                internalType: 'address',
            },
        ],
        anonymous: false,
    },
    {
        type: 'event',
        name: 'AttesterManagerUpdated',
        inputs: [
            {
                name: 'previousAttesterManager',
                type: 'address',
                indexed: true,
                internalType: 'address',
            },
            {
                name: 'newAttesterManager',
                type: 'address',
                indexed: true,
                internalType: 'address',
            },
        ],
        anonymous: false,
    },
    {
        type: 'event',
        name: 'Initialized',
        inputs: [
            {
                name: 'version',
                type: 'uint64',
                indexed: false,
                internalType: 'uint64',
            },
        ],
        anonymous: false,
    },
    {
        type: 'event',
        name: 'MaxMessageBodySizeUpdated',
        inputs: [
            {
                name: 'newMaxMessageBodySize',
                type: 'uint256',
                indexed: false,
                internalType: 'uint256',
            },
        ],
        anonymous: false,
    },
    {
        type: 'event',
        name: 'MessageReceived',
        inputs: [
            {
                name: 'caller',
                type: 'address',
                indexed: true,
                internalType: 'address',
            },
            {
                name: 'sourceDomain',
                type: 'uint32',
                indexed: false,
                internalType: 'uint32',
            },
            {
                name: 'nonce',
                type: 'bytes32',
                indexed: true,
                internalType: 'bytes32',
            },
            {
                name: 'sender',
                type: 'bytes32',
                indexed: false,
                internalType: 'bytes32',
            },
            {
                name: 'finalityThresholdExecuted',
                type: 'uint32',
                indexed: true,
                internalType: 'uint32',
            },
            {
                name: 'messageBody',
                type: 'bytes',
                indexed: false,
                internalType: 'bytes',
            },
        ],
        anonymous: false,
    },
    {
        type: 'event',
        name: 'MessageSent',
        inputs: [
            {
                name: 'message',
                type: 'bytes',
                indexed: false,
                internalType: 'bytes',
            },
        ],
        anonymous: false,
    },
    {
        type: 'event',
        name: 'OwnershipTransferStarted',
        inputs: [
            {
                name: 'previousOwner',
                type: 'address',
                indexed: true,
                internalType: 'address',
            },
            {
                name: 'newOwner',
                type: 'address',
                indexed: true,
                internalType: 'address',
            },
        ],
        anonymous: false,
    },
    {
        type: 'event',
        name: 'OwnershipTransferred',
        inputs: [
            {
                name: 'previousOwner',
                type: 'address',
                indexed: true,
                internalType: 'address',
            },
            {
                name: 'newOwner',
                type: 'address',
                indexed: true,
                internalType: 'address',
            },
        ],
        anonymous: false,
    },
    {
        type: 'event',
        name: 'Pause',
        inputs: [],
        anonymous: false,
    },
    {
        type: 'event',
        name: 'PauserChanged',
        inputs: [
            {
                name: 'newAddress',
                type: 'address',
                indexed: true,
                internalType: 'address',
            },
        ],
        anonymous: false,
    },
    {
        type: 'event',
        name: 'RescuerChanged',
        inputs: [
            {
                name: 'newRescuer',
                type: 'address',
                indexed: true,
                internalType: 'address',
            },
        ],
        anonymous: false,
    },
    {
        type: 'event',
        name: 'SignatureThresholdUpdated',
        inputs: [
            {
                name: 'oldSignatureThreshold',
                type: 'uint256',
                indexed: false,
                internalType: 'uint256',
            },
            {
                name: 'newSignatureThreshold',
                type: 'uint256',
                indexed: false,
                internalType: 'uint256',
            },
        ],
        anonymous: false,
    },
    {
        type: 'event',
        name: 'Unpause',
        inputs: [],
        anonymous: false,
    },
];

/**
 * Token Messenger V2 ABI
 *
 * This ABI is used to interact with the Token Messenger V2 contract on EVM networks.
 *
 * @see https://developers.circle.com/stablecoins/evm-smart-contracts#tokenmessenger
 */
const tokenMessengerV2Abi = [
    {
        type: 'constructor',
        inputs: [
            {
                name: '_messageTransmitter',
                type: 'address',
                internalType: 'address',
            },
            {
                name: '_messageBodyVersion',
                type: 'uint32',
                internalType: 'uint32',
            },
        ],
        stateMutability: 'nonpayable',
    },
    {
        type: 'function',
        name: 'acceptOwnership',
        inputs: [],
        outputs: [],
        stateMutability: 'nonpayable',
    },
    {
        type: 'function',
        name: 'addLocalMinter',
        inputs: [
            {
                name: 'newLocalMinter',
                type: 'address',
                internalType: 'address',
            },
        ],
        outputs: [],
        stateMutability: 'nonpayable',
    },
    {
        type: 'function',
        name: 'addRemoteTokenMessenger',
        inputs: [
            {
                name: 'domain',
                type: 'uint32',
                internalType: 'uint32',
            },
            {
                name: 'tokenMessenger',
                type: 'bytes32',
                internalType: 'bytes32',
            },
        ],
        outputs: [],
        stateMutability: 'nonpayable',
    },
    {
        type: 'function',
        name: 'denylist',
        inputs: [
            {
                name: 'account',
                type: 'address',
                internalType: 'address',
            },
        ],
        outputs: [],
        stateMutability: 'nonpayable',
    },
    {
        type: 'function',
        name: 'denylister',
        inputs: [],
        outputs: [
            {
                name: '',
                type: 'address',
                internalType: 'address',
            },
        ],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'depositForBurn',
        inputs: [
            {
                name: 'amount',
                type: 'uint256',
                internalType: 'uint256',
            },
            {
                name: 'destinationDomain',
                type: 'uint32',
                internalType: 'uint32',
            },
            {
                name: 'mintRecipient',
                type: 'bytes32',
                internalType: 'bytes32',
            },
            {
                name: 'burnToken',
                type: 'address',
                internalType: 'address',
            },
            {
                name: 'destinationCaller',
                type: 'bytes32',
                internalType: 'bytes32',
            },
            {
                name: 'maxFee',
                type: 'uint256',
                internalType: 'uint256',
            },
            {
                name: 'minFinalityThreshold',
                type: 'uint32',
                internalType: 'uint32',
            },
        ],
        outputs: [],
        stateMutability: 'nonpayable',
    },
    {
        type: 'function',
        name: 'depositForBurnWithHook',
        inputs: [
            {
                name: 'amount',
                type: 'uint256',
                internalType: 'uint256',
            },
            {
                name: 'destinationDomain',
                type: 'uint32',
                internalType: 'uint32',
            },
            {
                name: 'mintRecipient',
                type: 'bytes32',
                internalType: 'bytes32',
            },
            {
                name: 'burnToken',
                type: 'address',
                internalType: 'address',
            },
            {
                name: 'destinationCaller',
                type: 'bytes32',
                internalType: 'bytes32',
            },
            {
                name: 'maxFee',
                type: 'uint256',
                internalType: 'uint256',
            },
            {
                name: 'minFinalityThreshold',
                type: 'uint32',
                internalType: 'uint32',
            },
            {
                name: 'hookData',
                type: 'bytes',
                internalType: 'bytes',
            },
        ],
        outputs: [],
        stateMutability: 'nonpayable',
    },
    {
        type: 'function',
        name: 'feeRecipient',
        inputs: [],
        outputs: [
            {
                name: '',
                type: 'address',
                internalType: 'address',
            },
        ],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'handleReceiveFinalizedMessage',
        inputs: [
            {
                name: 'remoteDomain',
                type: 'uint32',
                internalType: 'uint32',
            },
            {
                name: 'sender',
                type: 'bytes32',
                internalType: 'bytes32',
            },
            {
                name: '',
                type: 'uint32',
                internalType: 'uint32',
            },
            {
                name: 'messageBody',
                type: 'bytes',
                internalType: 'bytes',
            },
        ],
        outputs: [
            {
                name: '',
                type: 'bool',
                internalType: 'bool',
            },
        ],
        stateMutability: 'nonpayable',
    },
    {
        type: 'function',
        name: 'handleReceiveUnfinalizedMessage',
        inputs: [
            {
                name: 'remoteDomain',
                type: 'uint32',
                internalType: 'uint32',
            },
            {
                name: 'sender',
                type: 'bytes32',
                internalType: 'bytes32',
            },
            {
                name: 'finalityThresholdExecuted',
                type: 'uint32',
                internalType: 'uint32',
            },
            {
                name: 'messageBody',
                type: 'bytes',
                internalType: 'bytes',
            },
        ],
        outputs: [
            {
                name: '',
                type: 'bool',
                internalType: 'bool',
            },
        ],
        stateMutability: 'nonpayable',
    },
    {
        type: 'function',
        name: 'initialize',
        inputs: [
            {
                name: 'owner_',
                type: 'address',
                internalType: 'address',
            },
            {
                name: 'rescuer_',
                type: 'address',
                internalType: 'address',
            },
            {
                name: 'feeRecipient_',
                type: 'address',
                internalType: 'address',
            },
            {
                name: 'denylister_',
                type: 'address',
                internalType: 'address',
            },
            {
                name: 'tokenMinter_',
                type: 'address',
                internalType: 'address',
            },
            {
                name: 'remoteDomains_',
                type: 'uint32[]',
                internalType: 'uint32[]',
            },
            {
                name: 'remoteTokenMessengers_',
                type: 'bytes32[]',
                internalType: 'bytes32[]',
            },
        ],
        outputs: [],
        stateMutability: 'nonpayable',
    },
    {
        type: 'function',
        name: 'initializedVersion',
        inputs: [],
        outputs: [
            {
                name: '',
                type: 'uint64',
                internalType: 'uint64',
            },
        ],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'isDenylisted',
        inputs: [
            {
                name: 'account',
                type: 'address',
                internalType: 'address',
            },
        ],
        outputs: [
            {
                name: '',
                type: 'bool',
                internalType: 'bool',
            },
        ],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'localMessageTransmitter',
        inputs: [],
        outputs: [
            {
                name: '',
                type: 'address',
                internalType: 'address',
            },
        ],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'localMinter',
        inputs: [],
        outputs: [
            {
                name: '',
                type: 'address',
                internalType: 'contract ITokenMinterV2',
            },
        ],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'messageBodyVersion',
        inputs: [],
        outputs: [
            {
                name: '',
                type: 'uint32',
                internalType: 'uint32',
            },
        ],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'owner',
        inputs: [],
        outputs: [
            {
                name: '',
                type: 'address',
                internalType: 'address',
            },
        ],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'pendingOwner',
        inputs: [],
        outputs: [
            {
                name: '',
                type: 'address',
                internalType: 'address',
            },
        ],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'remoteTokenMessengers',
        inputs: [
            {
                name: '',
                type: 'uint32',
                internalType: 'uint32',
            },
        ],
        outputs: [
            {
                name: '',
                type: 'bytes32',
                internalType: 'bytes32',
            },
        ],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'removeLocalMinter',
        inputs: [],
        outputs: [],
        stateMutability: 'nonpayable',
    },
    {
        type: 'function',
        name: 'removeRemoteTokenMessenger',
        inputs: [
            {
                name: 'domain',
                type: 'uint32',
                internalType: 'uint32',
            },
        ],
        outputs: [],
        stateMutability: 'nonpayable',
    },
    {
        type: 'function',
        name: 'rescueERC20',
        inputs: [
            {
                name: 'tokenContract',
                type: 'address',
                internalType: 'contract IERC20',
            },
            {
                name: 'to',
                type: 'address',
                internalType: 'address',
            },
            {
                name: 'amount',
                type: 'uint256',
                internalType: 'uint256',
            },
        ],
        outputs: [],
        stateMutability: 'nonpayable',
    },
    {
        type: 'function',
        name: 'rescuer',
        inputs: [],
        outputs: [
            {
                name: '',
                type: 'address',
                internalType: 'address',
            },
        ],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'setFeeRecipient',
        inputs: [
            {
                name: '_feeRecipient',
                type: 'address',
                internalType: 'address',
            },
        ],
        outputs: [],
        stateMutability: 'nonpayable',
    },
    {
        type: 'function',
        name: 'transferOwnership',
        inputs: [
            {
                name: 'newOwner',
                type: 'address',
                internalType: 'address',
            },
        ],
        outputs: [],
        stateMutability: 'nonpayable',
    },
    {
        type: 'function',
        name: 'unDenylist',
        inputs: [
            {
                name: 'account',
                type: 'address',
                internalType: 'address',
            },
        ],
        outputs: [],
        stateMutability: 'nonpayable',
    },
    {
        type: 'function',
        name: 'updateDenylister',
        inputs: [
            {
                name: 'newDenylister',
                type: 'address',
                internalType: 'address',
            },
        ],
        outputs: [],
        stateMutability: 'nonpayable',
    },
    {
        type: 'function',
        name: 'updateRescuer',
        inputs: [
            {
                name: 'newRescuer',
                type: 'address',
                internalType: 'address',
            },
        ],
        outputs: [],
        stateMutability: 'nonpayable',
    },
    {
        type: 'event',
        name: 'Denylisted',
        inputs: [
            {
                name: 'account',
                type: 'address',
                indexed: true,
                internalType: 'address',
            },
        ],
        anonymous: false,
    },
    {
        type: 'event',
        name: 'DenylisterChanged',
        inputs: [
            {
                name: 'oldDenylister',
                type: 'address',
                indexed: true,
                internalType: 'address',
            },
            {
                name: 'newDenylister',
                type: 'address',
                indexed: true,
                internalType: 'address',
            },
        ],
        anonymous: false,
    },
    {
        type: 'event',
        name: 'DepositForBurn',
        inputs: [
            {
                name: 'burnToken',
                type: 'address',
                indexed: true,
                internalType: 'address',
            },
            {
                name: 'amount',
                type: 'uint256',
                indexed: false,
                internalType: 'uint256',
            },
            {
                name: 'depositor',
                type: 'address',
                indexed: true,
                internalType: 'address',
            },
            {
                name: 'mintRecipient',
                type: 'bytes32',
                indexed: false,
                internalType: 'bytes32',
            },
            {
                name: 'destinationDomain',
                type: 'uint32',
                indexed: false,
                internalType: 'uint32',
            },
            {
                name: 'destinationTokenMessenger',
                type: 'bytes32',
                indexed: false,
                internalType: 'bytes32',
            },
            {
                name: 'destinationCaller',
                type: 'bytes32',
                indexed: false,
                internalType: 'bytes32',
            },
            {
                name: 'maxFee',
                type: 'uint256',
                indexed: false,
                internalType: 'uint256',
            },
            {
                name: 'minFinalityThreshold',
                type: 'uint32',
                indexed: true,
                internalType: 'uint32',
            },
            {
                name: 'hookData',
                type: 'bytes',
                indexed: false,
                internalType: 'bytes',
            },
        ],
        anonymous: false,
    },
    {
        type: 'event',
        name: 'FeeRecipientSet',
        inputs: [
            {
                name: 'feeRecipient',
                type: 'address',
                indexed: false,
                internalType: 'address',
            },
        ],
        anonymous: false,
    },
    {
        type: 'event',
        name: 'Initialized',
        inputs: [
            {
                name: 'version',
                type: 'uint64',
                indexed: false,
                internalType: 'uint64',
            },
        ],
        anonymous: false,
    },
    {
        type: 'event',
        name: 'LocalMinterAdded',
        inputs: [
            {
                name: 'localMinter',
                type: 'address',
                indexed: false,
                internalType: 'address',
            },
        ],
        anonymous: false,
    },
    {
        type: 'event',
        name: 'LocalMinterRemoved',
        inputs: [
            {
                name: 'localMinter',
                type: 'address',
                indexed: false,
                internalType: 'address',
            },
        ],
        anonymous: false,
    },
    {
        type: 'event',
        name: 'MintAndWithdraw',
        inputs: [
            {
                name: 'mintRecipient',
                type: 'address',
                indexed: true,
                internalType: 'address',
            },
            {
                name: 'amount',
                type: 'uint256',
                indexed: false,
                internalType: 'uint256',
            },
            {
                name: 'mintToken',
                type: 'address',
                indexed: true,
                internalType: 'address',
            },
            {
                name: 'feeCollected',
                type: 'uint256',
                indexed: false,
                internalType: 'uint256',
            },
        ],
        anonymous: false,
    },
    {
        type: 'event',
        name: 'OwnershipTransferStarted',
        inputs: [
            {
                name: 'previousOwner',
                type: 'address',
                indexed: true,
                internalType: 'address',
            },
            {
                name: 'newOwner',
                type: 'address',
                indexed: true,
                internalType: 'address',
            },
        ],
        anonymous: false,
    },
    {
        type: 'event',
        name: 'OwnershipTransferred',
        inputs: [
            {
                name: 'previousOwner',
                type: 'address',
                indexed: true,
                internalType: 'address',
            },
            {
                name: 'newOwner',
                type: 'address',
                indexed: true,
                internalType: 'address',
            },
        ],
        anonymous: false,
    },
    {
        type: 'event',
        name: 'RemoteTokenMessengerAdded',
        inputs: [
            {
                name: 'domain',
                type: 'uint32',
                indexed: false,
                internalType: 'uint32',
            },
            {
                name: 'tokenMessenger',
                type: 'bytes32',
                indexed: false,
                internalType: 'bytes32',
            },
        ],
        anonymous: false,
    },
    {
        type: 'event',
        name: 'RemoteTokenMessengerRemoved',
        inputs: [
            {
                name: 'domain',
                type: 'uint32',
                indexed: false,
                internalType: 'uint32',
            },
            {
                name: 'tokenMessenger',
                type: 'bytes32',
                indexed: false,
                internalType: 'bytes32',
            },
        ],
        anonymous: false,
    },
    {
        type: 'event',
        name: 'RescuerChanged',
        inputs: [
            {
                name: 'newRescuer',
                type: 'address',
                indexed: true,
                internalType: 'address',
            },
        ],
        anonymous: false,
    },
    {
        type: 'event',
        name: 'UnDenylisted',
        inputs: [
            {
                name: 'account',
                type: 'address',
                indexed: true,
                internalType: 'address',
            },
        ],
        anonymous: false,
    },
];

/**
 * ABI for the BridgingKit - custom bridge contract.
 *
 * This ABI contains following core functions:
 * - Pre-approval bridging (requires prior ERC20 approval)
 * - Permit-based bridging (uses EIP-2612 signatures)
 * - Hook data support for destination chain interpretation
 * - Fee calculation utilities for transaction planning
 *
 */
const bridgeContractAbi = [
    {
        type: 'function',
        name: 'bridgeWithPermit',
        inputs: [
            {
                name: 'bridgeParams',
                type: 'tuple',
                internalType: 'struct BridgingKitContract.BridgeParams',
                components: [
                    {
                        name: 'amount',
                        type: 'uint256',
                        internalType: 'uint256',
                    },
                    {
                        name: 'maxFee',
                        type: 'uint256',
                        internalType: 'uint256',
                    },
                    {
                        name: 'fee',
                        type: 'uint256',
                        internalType: 'uint256',
                    },
                    {
                        name: 'mintRecipient',
                        type: 'bytes32',
                        internalType: 'bytes32',
                    },
                    {
                        name: 'destinationCaller',
                        type: 'bytes32',
                        internalType: 'bytes32',
                    },
                    {
                        name: 'burnToken',
                        type: 'address',
                        internalType: 'address',
                    },
                    {
                        name: 'feeRecipient',
                        type: 'address',
                        internalType: 'address',
                    },
                    {
                        name: 'destinationDomain',
                        type: 'uint32',
                        internalType: 'uint32',
                    },
                    {
                        name: 'minFinalityThreshold',
                        type: 'uint32',
                        internalType: 'uint32',
                    },
                ],
            },
            {
                name: 'permitParams',
                type: 'tuple',
                internalType: 'struct BridgingKitContract.PermitParams',
                components: [
                    {
                        name: 'deadline',
                        type: 'uint256',
                        internalType: 'uint256',
                    },
                    {
                        name: 'v',
                        type: 'uint8',
                        internalType: 'uint8',
                    },
                    {
                        name: 'r',
                        type: 'bytes32',
                        internalType: 'bytes32',
                    },
                    {
                        name: 's',
                        type: 'bytes32',
                        internalType: 'bytes32',
                    },
                ],
            },
        ],
        outputs: [],
        stateMutability: 'nonpayable',
    },
    {
        type: 'function',
        name: 'bridgeWithPermitAndHook',
        inputs: [
            {
                name: 'bridgeParams',
                type: 'tuple',
                internalType: 'struct BridgingKitContract.BridgeParams',
                components: [
                    {
                        name: 'amount',
                        type: 'uint256',
                        internalType: 'uint256',
                    },
                    {
                        name: 'maxFee',
                        type: 'uint256',
                        internalType: 'uint256',
                    },
                    {
                        name: 'fee',
                        type: 'uint256',
                        internalType: 'uint256',
                    },
                    {
                        name: 'mintRecipient',
                        type: 'bytes32',
                        internalType: 'bytes32',
                    },
                    {
                        name: 'destinationCaller',
                        type: 'bytes32',
                        internalType: 'bytes32',
                    },
                    {
                        name: 'burnToken',
                        type: 'address',
                        internalType: 'address',
                    },
                    {
                        name: 'feeRecipient',
                        type: 'address',
                        internalType: 'address',
                    },
                    {
                        name: 'destinationDomain',
                        type: 'uint32',
                        internalType: 'uint32',
                    },
                    {
                        name: 'minFinalityThreshold',
                        type: 'uint32',
                        internalType: 'uint32',
                    },
                ],
            },
            {
                name: 'permitParams',
                type: 'tuple',
                internalType: 'struct BridgingKitContract.PermitParams',
                components: [
                    {
                        name: 'deadline',
                        type: 'uint256',
                        internalType: 'uint256',
                    },
                    {
                        name: 'v',
                        type: 'uint8',
                        internalType: 'uint8',
                    },
                    {
                        name: 'r',
                        type: 'bytes32',
                        internalType: 'bytes32',
                    },
                    {
                        name: 's',
                        type: 'bytes32',
                        internalType: 'bytes32',
                    },
                ],
            },
            {
                name: 'hookData',
                type: 'bytes',
                internalType: 'bytes',
            },
        ],
        outputs: [],
        stateMutability: 'nonpayable',
    },
    {
        type: 'function',
        name: 'bridgeWithPreapproval',
        inputs: [
            {
                name: 'bridgeParams',
                type: 'tuple',
                internalType: 'struct BridgingKitContract.BridgeParams',
                components: [
                    {
                        name: 'amount',
                        type: 'uint256',
                        internalType: 'uint256',
                    },
                    {
                        name: 'maxFee',
                        type: 'uint256',
                        internalType: 'uint256',
                    },
                    {
                        name: 'fee',
                        type: 'uint256',
                        internalType: 'uint256',
                    },
                    {
                        name: 'mintRecipient',
                        type: 'bytes32',
                        internalType: 'bytes32',
                    },
                    {
                        name: 'destinationCaller',
                        type: 'bytes32',
                        internalType: 'bytes32',
                    },
                    {
                        name: 'burnToken',
                        type: 'address',
                        internalType: 'address',
                    },
                    {
                        name: 'feeRecipient',
                        type: 'address',
                        internalType: 'address',
                    },
                    {
                        name: 'destinationDomain',
                        type: 'uint32',
                        internalType: 'uint32',
                    },
                    {
                        name: 'minFinalityThreshold',
                        type: 'uint32',
                        internalType: 'uint32',
                    },
                ],
            },
        ],
        outputs: [],
        stateMutability: 'nonpayable',
    },
    {
        type: 'function',
        name: 'bridgeWithPreapprovalAndHook',
        inputs: [
            {
                name: 'bridgeParams',
                type: 'tuple',
                internalType: 'struct BridgingKitContract.BridgeParams',
                components: [
                    {
                        name: 'amount',
                        type: 'uint256',
                        internalType: 'uint256',
                    },
                    {
                        name: 'maxFee',
                        type: 'uint256',
                        internalType: 'uint256',
                    },
                    {
                        name: 'fee',
                        type: 'uint256',
                        internalType: 'uint256',
                    },
                    {
                        name: 'mintRecipient',
                        type: 'bytes32',
                        internalType: 'bytes32',
                    },
                    {
                        name: 'destinationCaller',
                        type: 'bytes32',
                        internalType: 'bytes32',
                    },
                    {
                        name: 'burnToken',
                        type: 'address',
                        internalType: 'address',
                    },
                    {
                        name: 'feeRecipient',
                        type: 'address',
                        internalType: 'address',
                    },
                    {
                        name: 'destinationDomain',
                        type: 'uint32',
                        internalType: 'uint32',
                    },
                    {
                        name: 'minFinalityThreshold',
                        type: 'uint32',
                        internalType: 'uint32',
                    },
                ],
            },
            {
                name: 'hookData',
                type: 'bytes',
                internalType: 'bytes',
            },
        ],
        outputs: [],
        stateMutability: 'nonpayable',
    },
    {
        type: 'function',
        name: 'calculateFeeShares',
        inputs: [
            {
                name: 'fee',
                type: 'uint256',
                internalType: 'uint256',
            },
        ],
        outputs: [
            {
                name: 'developerShare',
                type: 'uint256',
                internalType: 'uint256',
            },
            {
                name: 'protocolShare',
                type: 'uint256',
                internalType: 'uint256',
            },
        ],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'getProtocolFee',
        inputs: [
            {
                name: 'fee',
                type: 'uint256',
                internalType: 'uint256',
            },
        ],
        outputs: [
            {
                name: 'protocolFee',
                type: 'uint256',
                internalType: 'uint256',
            },
        ],
        stateMutability: 'view',
    },
];

/**
 * Core type definitions for EVM-compatible blockchain transaction execution
 * and gas estimation.
 *
 * This module provides TypeScript interfaces and types for handling EVM-compatible
 * blockchain transactions across different networks.
 *
 * @module constants
 */
/**
 * A constant representing the zero hash value.
 *
 * @remarks
 * This is a 32-byte hash value that is used as a placeholder for certain
 * operations where a hash is required but the actual value is not relevant.
 */
const ZERO_HASH = '0x0000000000000000000000000000000000000000000000000000000000000000';

/**
 * Prepares an EVM-compatible `depositForBurn` transaction for CCTP v2.
 *
 * This function creates a prepared chain request for burning USDC tokens on the source EVM chain
 * to initiate a cross-chain transfer using Circle's CCTP v2 protocol. It leverages the adapter's
 * chain context and transaction preparation utilities to construct a transaction targeting the
 * TokenMessengerV2 contract.
 *
 * The function validates that the `fromChain` is EVM-compatible, then constructs a transaction
 * using the canonical TokenMessengerV2 ABI and the resolved contract address for the source chain.
 * The resulting prepared request can be executed or simulated by the caller.
 *
 * @param params - The action payload containing:
 *   - `fromChain`: The EVM chain definition where the burn will occur.
 *   - `toChain`: The destination chain definition (must include CCTP domain).
 *   - `amount`: The amount of USDC to burn (as a string, in the smallest unit).
 *   - `mintRecipient`: The address (as string) to receive minted USDC on the destination chain.
 *   - `maxFee`: The maximum fee to pay for the cross-chain message relay.
 *   - `minFinalityThreshold`: The minimum finality threshold for the burn event.
 * @param adapter - The EVM adapter responsible for chain context and transaction preparation.
 * @param context - The resolved operation context providing chain and address information.
 * @returns A promise that resolves to a prepared chain request for the `depositForBurn` call.
 * @throws Error if the `fromChain` is not EVM-compatible or if preparation fails.
 *
 * @example
 * ```typescript
 * const prepared = await depositForBurn(
 *   {
 *     fromChain,
 *     toChain,
 *     amount: '1000000',
 *     mintRecipient: '0xabc...',
 *     maxFee: 0n,
 *     minFinalityThreshold: 1n,
 *   },
 *   adapter,
 *   context
 * );
 * await prepared.execute();
 * ```
 */
const depositForBurn = async (params, adapter, context) => {
    if (params.fromChain.type !== 'evm') {
        throw new Error(`Expected fromChain to be EVM chain definition, but received chain type: ${params.fromChain.type}`);
    }
    // Prepare the deposit for burn transaction
    return adapter.prepare({
        type: 'evm',
        abi: tokenMessengerV2Abi,
        address: resolveCCTPV2ContractAddress(params.fromChain, 'tokenMessenger'),
        functionName: 'depositForBurn',
        args: [
            BigInt(params.amount),
            params.toChain.cctp.domain,
            convertAddress(params.mintRecipient, 'bytes32'),
            params.fromChain.usdcAddress,
            params.destinationCaller ?? ZERO_HASH, // destinationCaller as ZeroHash (allows any caller) if not provided
            params.maxFee,
            params.minFinalityThreshold,
        ],
    }, context);
};

/**
 * Prepares an EVM-compatible `receiveMessage` transaction for CCTP v2.
 *
 * This function creates a prepared chain request for minting USDC tokens on the destination EVM chain
 * using Circle's CCTP v2 protocol. It leverages the adapter's chain context and transaction preparation
 * utilities to construct a transaction targeting the MessageTransmitterV2 contract.
 *
 * The function validates that the `toChain` is EVM-compatible, then constructs a transaction
 * using the canonical MessageTransmitterV2 ABI and the resolved contract address for the destination chain.
 * The resulting prepared request can be executed or simulated by the caller.
 *
 * @param params - The action payload containing:
 *   - `toChain`: The EVM chain definition where the mint will occur (must include CCTP domain).
 *   - `message`: The cross-chain message to be processed for minting USDC.
 *   - `attestation`: The attestation from Circle required to validate the message.
 * @param adapter - The EVM adapter responsible for chain context and transaction preparation.
 * @param context - The resolved operation context providing chain and address information.
 * @returns A promise that resolves to a prepared chain request for the `receiveMessage` call.
 * @throws Error if the `toChain` is not EVM-compatible or if preparation fails.
 *
 * @example
 * ```typescript
 * const prepared = await receiveMessage(
 *   {
 *     toChain,
 *     message: '0x...',
 *     attestation: '0x...',
 *   },
 *   adapter,
 *   context
 * );
 * await prepared.execute();
 * ```
 */
const receiveMessage = async (params, adapter, context) => {
    if (params.toChain.type !== 'evm') {
        throw new Error(`Expected toChain to be EVM chain definition, but received chain type: ${params.toChain.type}`);
    }
    // Prepare the receive message transaction
    return adapter.prepare({
        type: 'evm',
        abi: messageTransmitterV2Abi,
        address: resolveCCTPV2ContractAddress(params.toChain, 'messageTransmitter'),
        functionName: 'receiveMessage',
        args: [params.message, params.attestation],
    }, context);
};

/**
 * Prepares an EVM-compatible `customBurn` transaction for CCTP v2 using a custom bridge contract.
 *
 * This function creates a prepared chain request for burning USDC tokens using a custom bridge
 * contract that supports both preapproval and permit-based token authorization. The custom
 * bridge provides enhanced functionality with gas optimization and flexible approval methods.
 *
 * The function automatically selects the appropriate bridge method based on parameters:
 * - When `permitParams` is provided → uses `bridgeWithPermit` for EIP-2612 signature-based approval
 * - When `permitParams` is not provided → uses `bridgeWithPreapproval` for traditional preapproval
 *
 * The action provides a unified interface for both approval methods, with extra bridge
 * contract parameters (fee, burnToken, feeRecipient) automatically resolved for ease of use.
 *
 * @param params - The action payload containing:
 *   - `fromChain`: The EVM chain definition where the burn will occur (must support custom bridge).
 *   - `toChain`: The destination chain definition (must include CCTP domain).
 *   - `amount`: The amount of USDC to burn (as bigint, in the smallest unit).
 *   - `mintRecipient`: The address to receive minted USDC on the destination chain.
 *   - `destinationCaller`: Optional address authorized to call receiveMessage (zero hash if any).
 *   - `maxFee`: The maximum fee to pay for Circle's fast liquidity network.
 *   - `minFinalityThreshold`: The minimum finality threshold for the burn event.
 *   - `protocolFee`: Optional protocol fee amount (defaults to 0n for basic usage).
 *   - `feeRecipient`: Optional fee recipient address (defaults to bridge address).
 *   - `permitParams`: Optional EIP-2612 permit signature for gasless approval.
 *
 *   For basic usage, only the core CCTP parameters are needed (same as depositForBurn).
 *   For advanced usage, protocol fee parameters enable custom fee collection.
 *   For gasless transactions, provide permitParams to avoid separate approval transactions.
 * @param adapter - The EVM adapter responsible for chain context and transaction preparation.
 * @param context - The resolved operation context providing chain and address information.
 * @returns A promise that resolves to a prepared chain request for the `customBurn` operation.
 * @throws Error if the source chain doesn't support custom bridge contracts.
 * @throws Error if the source chain is not EVM-compatible.
 * @throws Error if permit signature validation fails.
 * @throws Error if transaction preparation fails.
 *
 * @example
 * ```typescript
 * import { hasCustomContractSupport } from '@core/chains'
 *
 * // Check if chain supports custom bridge before using
 * if (hasCustomContractSupport(sourceChain, 'bridge')) {
 *
 *   // Basic usage with preapproval (same interface as depositForBurn)
 *   const basicTransfer = await customBurn(
 *     {
 *       fromChain: sourceChain,
 *       toChain: destinationChain,
 *       amount: BigInt('1000000'),
 *       mintRecipient: recipientAddress,
 *       maxFee: BigInt('1000'),
 *       minFinalityThreshold: 65
 *       // protocolFee and feeRecipient auto-default
 *     },
 *     adapter,
 *     context
 *   )
 *
 *   // Usage with permit signature (gasless approval)
 *   const permitTransfer = await customBurn(
 *     {
 *       fromChain: sourceChain,
 *       toChain: destinationChain,
 *       amount: BigInt('1000000'),
 *       mintRecipient: recipientAddress,
 *       maxFee: BigInt('1000'),
 *       minFinalityThreshold: 65,
 *       permitParams: {
 *         deadline: BigInt(Math.floor(Date.now() / 1000) + 3600), // 1 hour
 *         v: 27,
 *         r: '0x1234567890abcdef...',
 *         s: '0xfedcba0987654321...'
 *       }
 *     },
 *     adapter,
 *     context
 *   )
 *
 *   // Advanced usage with protocol fees
 *   const advancedTransfer = await customBurn(
 *     {
 *       fromChain: sourceChain,
 *       toChain: destinationChain,
 *       amount: BigInt('1000000'),
 *       mintRecipient: recipientAddress,
 *       maxFee: BigInt('1000'),
 *       minFinalityThreshold: 65,
 *       protocolFee: BigInt('100'),
 *       feeRecipient: '0xFeeRecipientAddress'
 *     },
 *     adapter,
 *     context
 *   )
 *
 *   await basicTransfer.execute()
 * }
 * ```
 */
const customBurn = async (params, adapter, context) => {
    // Validate that this is an EVM chain
    if (params.fromChain.type !== 'evm') {
        throw new Error(`Expected fromChain to be EVM chain definition, but received chain type: ${params.fromChain.type}`);
    }
    // Validate that the chain supports custom bridge contracts
    if (!hasCustomContractSupport(params.fromChain, 'bridge')) {
        throw new Error(`Chain ${params.fromChain.name} does not support custom bridge contracts. Use 'cctp.v2.depositForBurn' instead.`);
    }
    // Validate logical consistency: protocolFee and feeRecipient must be used together
    const protocolFee = params.protocolFee ?? 0n;
    if (protocolFee > 0n && params.feeRecipient === undefined) {
        throw new Error('protocolFee requires feeRecipient. Specify where the fee should be sent.');
    }
    if (params.feeRecipient !== undefined && protocolFee === 0n) {
        throw new Error('feeRecipient requires non-zero protocolFee. Specify the fee amount to send.');
    }
    // Validate address format for user-provided feeRecipient
    if (params.feeRecipient !== undefined) {
        assertEvmAddress(params.feeRecipient);
    }
    // Validate permit signature components if provided
    if (params.permitParams) {
        const currentTimestamp = BigInt(Math.floor(Date.now() / 1000));
        if (params.permitParams.deadline <= currentTimestamp) {
            throw new Error('Permit deadline has expired');
        }
        if (![27, 28].includes(params.permitParams.v)) {
            throw new Error('Invalid permit signature recovery parameter (v)');
        }
    }
    // Get the custom bridge contract address from chain definition
    const bridgeAddress = params.fromChain.kitContracts?.bridge;
    if (bridgeAddress === undefined) {
        throw new Error(`No bridge contract address found for chain ${params.fromChain.name}`);
    }
    assertEvmAddress(bridgeAddress);
    // Prepare the bridge parameters struct for the contract call
    // Use optional parameters with sensible defaults:
    // - feeRecipient: defaults to bridge address (safe for zero fees)
    // - burnToken: auto-resolve from chain definition (same as depositForBurn)
    const destinationCallerAddress = convertAddress(params.destinationCaller ?? ZERO_HASH, 'bytes32');
    const feeRecipient = params.feeRecipient ?? bridgeAddress;
    const bridgeParams = {
        amount: params.amount,
        maxFee: params.maxFee,
        fee: protocolFee,
        mintRecipient: convertAddress(params.mintRecipient, 'bytes32'),
        destinationCaller: destinationCallerAddress,
        burnToken: params.fromChain.usdcAddress,
        feeRecipient,
        destinationDomain: params.toChain.cctp.domain,
        minFinalityThreshold: BigInt(params.minFinalityThreshold), // Convert to bigint for contract
    };
    // Prepare the custom bridge transaction - select method based on whether permit is provided
    const args = [bridgeParams];
    let functionName = 'bridgeWithPreapproval';
    if (params.permitParams) {
        // Use bridgeWithPermit when permit signature is provided
        const permitParams = {
            deadline: params.permitParams.deadline,
            v: params.permitParams.v,
            r: params.permitParams.r,
            s: params.permitParams.s,
        };
        args.push(permitParams);
        functionName = 'bridgeWithPermit';
    }
    return adapter.prepare({
        type: 'evm',
        abi: bridgeContractAbi,
        address: bridgeAddress,
        functionName,
        args,
    }, context);
};

/**
 * Prepares an EVM-compatible native token balance read (ETH, MATIC, etc.).
 *
 * This function creates a prepared chain request for reading the native token balance
 * of a given wallet address on an EVM-based chain. If no wallet address is provided,
 * the adapter's default address from context is used.
 *
 * @param params - The action payload for the native balance lookup:
 *   - `walletAddress` (optional): The wallet address to check. Defaults to context address.
 * @param adapter - The EVM adapter providing chain context.
 * @param context - The resolved operation context providing chain and address information.
 * @returns A promise resolving to a prepared chain request.
 *   The `execute` method returns the balance as a string (in wei).
 * @throws {KitError} If the current chain is not EVM-compatible (INPUT_INVALID_CHAIN).
 * @throws Error If address validation fails.
 *
 * @example
 * ```typescript
 * import { Ethereum } from '@core/chains'
 *
 * const prepared = await balanceOf(
 *   { walletAddress: '0x1234...' },
 *   adapter,
 *   context
 * )
 * const balance = await prepared.execute()
 * console.log(balance) // e.g., "1000000000000000000" (1 ETH in wei)
 *
 * // Check balance for the adapter's address (no walletAddress provided)
 * const prepared2 = await balanceOf({}, adapter, context)
 * const balance2 = await prepared2.execute()
 * ```
 */
const balanceOf$2 = async (params, adapter, context) => {
    const chain = context.chain;
    if (chain.type !== 'evm') {
        throw createInvalidChainError(chain.name, `Expected EVM chain definition, but received chain type: ${chain.type}`);
    }
    // Use provided wallet address or fall back to context address
    const walletAddress = params.walletAddress ?? context.address;
    // Validate the address
    assertEvmAddress(walletAddress);
    // Create noop request for gas estimation (reading balance is free)
    const noopRequest = await createNoopChainRequest();
    return {
        type: 'evm',
        estimate: noopRequest.estimate,
        execute: async () => {
            const balance = await adapter.readNativeBalance(walletAddress, chain);
            return balance.toString();
        },
    };
};

/**
 * Prepares an EVM-compatible `balanceOf` read for any ERC-20 token.
 *
 * This function creates a prepared chain request for reading the balance of a given wallet address
 * for a specified ERC-20 token on an EVM-based chain. It validates the chain type and both addresses,
 * then constructs a read-only contract call using the canonical ERC-20 ABI and the provided token address.
 * The resulting prepared request can be executed or simulated by the caller.
 *
 * @param params - The action payload containing:
 *   - `tokenAddress`: The contract address of the ERC-20 token.
 *   - `walletAddress`: The address to check the token balance for.
 * @param adapter - The EVM adapter responsible for chain context and contract interaction.
 * @param context - The resolved operation context providing chain and address information.
 * @returns A promise that resolves to a prepared chain request for the `balanceOf` call.
 *   The `execute` method returns the balance as a string (in the token's smallest unit).
 * @throws Error if the current chain is not EVM-compatible, if address validation fails, or if the contract call fails.
 *
 * @example
 * ```typescript
 * const prepared = await balanceOf(
 *   { tokenAddress: '0xA0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', walletAddress: '0xabc...' },
 *   adapter,
 *   context
 * );
 * const balance = await prepared.execute();
 * console.log(balance); // e.g., "1000000" (for 1 USDC with 6 decimals)
 * ```
 */
const balanceOf$1 = async (params, adapter, context) => {
    const chain = context.chain;
    if (chain.type !== 'evm') {
        throw new Error(`Expected EVM chain definition, but received chain type: ${chain.type}`);
    }
    const { tokenAddress, walletAddress: walletAddressParam } = params;
    // Use provided wallet address or fall back to context address
    const walletAddress = walletAddressParam ?? context.address;
    // validate the address
    assertEvmAddress(walletAddress);
    assertEvmAddress(tokenAddress);
    try {
        return await adapter.prepare({
            type: 'evm',
            address: tokenAddress,
            abi: erc20Abi,
            functionName: 'balanceOf',
            args: [walletAddress],
        }, context);
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to get token balance for ${walletAddress} from ${tokenAddress}: ${errorMessage}`);
    }
};

/**
 * Prepares an EVM-compatible `allowance` read for any ERC-20 token.
 *
 * This function creates a prepared chain request for reading the allowance of a given wallet (owner)
 * and delegate (spender) address for a specified ERC-20 token on an EVM-based chain. It validates the chain type
 * and all addresses, then constructs a read-only contract call using the canonical ERC-20 ABI and the provided token address.
 * The resulting prepared request can be executed or simulated by the caller.
 *
 * @param params - The action payload containing:
 *   - `tokenAddress`: The contract address of the ERC-20 token.
 *   - `walletAddress`: The address of the token owner (if not provided, will use the adapter's address).
 *   - `delegate`: The address to check the allowance for (spender).
 * @param adapter - The EVM adapter responsible for chain context and contract interaction.
 * @param context - The resolved operation context providing chain and address information.
 * @returns A promise that resolves to a prepared chain request for the `allowance` call.
 *   The `execute` method returns the allowance as a string (in the token's smallest unit).
 * @throws Error if the current chain is not EVM-compatible, if address validation fails, or if the contract call fails.
 *
 * @example
 * ```typescript
 * const prepared = await allowance(
 *   { tokenAddress: '0xA0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', walletAddress: '0xabc...', delegate: '0xdef...' },
 *   adapter,
 *   context
 * );
 * const allowance = await prepared.execute();
 * console.log(allowance); // e.g., "1000000" (for 1 USDC allowance with 6 decimals)
 * ```
 */
const allowance$1 = async (params, adapter, context) => {
    const chain = context.chain;
    if (chain.type !== 'evm') {
        throw new Error(`Expected EVM chain definition, but received chain type: ${chain.type}`);
    }
    const { tokenAddress, walletAddress: walletAddressParam, delegate } = params;
    // Use provided wallet address or fall back to context address
    const walletAddress = walletAddressParam ?? context.address;
    // validate the address
    assertEvmAddress(walletAddress);
    assertEvmAddress(tokenAddress);
    assertEvmAddress(delegate);
    try {
        return await adapter.prepare({
            type: 'evm',
            address: tokenAddress,
            abi: erc20Abi,
            functionName: 'allowance',
            args: [walletAddress, delegate],
        }, context);
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to get token allowance for ${walletAddress} from ${tokenAddress}: ${errorMessage}`);
    }
};

/**
 * Prepares an EVM-compatible `increaseAllowance` transaction for USDC.
 *
 * This function creates a prepared chain request for increasing the allowance
 * of a delegate (spender) to spend USDC tokens on behalf of the caller. It is
 * intended for use with EVM-based chains and leverages the adapter's chain context
 * and transaction preparation utilities.
 *
 * The function validates that the current chain is EVM-compatible, then constructs
 * a transaction using the canonical USDC ABI and the chain's USDC contract address.
 * The resulting prepared request can be executed or simulated by the caller.
 *
 * @param params - The action payload containing:
 *   - `delegate`: The address to grant additional USDC allowance to.
 *   - `amount`: The amount of USDC (as a string, in the smallest unit) to increase the allowance by.
 * @param adapter - The EVM adapter responsible for chain context and transaction preparation.
 * @param context - The resolved operation context providing chain and address information.
 * @returns A promise that resolves to a prepared chain request for the `increaseAllowance` call.
 * @throws Error if the current chain is not EVM-compatible or if preparation fails.
 *
 * @example
 * ```typescript
 * const prepared = await increaseAllowance(
 *   { delegate: '0xabc...', amount: '1000000' },
 *   adapter,
 *   context
 * );
 * await prepared.execute();
 * ```
 */
const increaseAllowance = async (params, adapter, context) => {
    const { delegate, amount } = params;
    // Use params.chain if provided (temp backwards compatibility), otherwise use context.chain
    const chain = params.chain ?? context.chain;
    if (chain.type !== 'evm') {
        throw new Error(`Expected EVM chain definition, but received chain type: ${chain.type}`);
    }
    // Prepare the increase allowance transaction
    return adapter.prepare({
        type: 'evm',
        abi: usdcAbi,
        address: chain.usdcAddress,
        functionName: 'increaseAllowance',
        args: [delegate, amount],
    }, context);
};

/**
 * Prepares a read-only EVM chain request to fetch the USDC balance for a wallet.
 *
 * This function validates that the current chain is EVM-compatible and that a canonical
 * USDC contract address is available for the chain. It then delegates to the generic
 * ERC-20 `balanceOf` action, automatically supplying the correct USDC contract address.
 *
 * If `walletAddress` is omitted, the adapter's default address will be used.
 *
 * @param params - The action payload for USDC balance lookup:
 *   - `walletAddress` (optional): The address to check the USDC balance for. If not provided, the adapter's address is used.
 * @param adapter - The EVM adapter providing chain context and contract interaction.
 * @param context - The resolved operation context providing chain and address information.
 * @returns A promise resolving to a prepared chain request for the USDC `balanceOf` call.
 *   The returned request's `execute` method yields the balance as a string (in USDC's smallest unit).
 * @throws Error if the current chain is not EVM-compatible, if the USDC address is missing, or if the contract call fails.
 *
 * @example
 * ```typescript
 * const prepared = await balanceOf({ walletAddress: '0xabc...' }, adapter, context);
 * const balance = await prepared.execute();
 * console.log(balance); // e.g., "1000000" (for 1 USDC with 6 decimals)
 * ```
 */
const balanceOf = async (params, adapter, context) => {
    // get the USDC address for the chain from context
    const chain = context.chain;
    const tokenAddress = chain.usdcAddress;
    if (tokenAddress == null) {
        throw new Error(`USDC address not found for chain ${chain.name}`);
    }
    // use the generic token balanceOf functionality with the USDC address
    return await balanceOf$1({
        tokenAddress,
        walletAddress: params.walletAddress,
    }, adapter, context);
};

/**
 * Prepares a read-only EVM chain request to fetch the USDC allowance for a wallet and delegate.
 *
 * This function validates that the current chain is EVM-compatible and that a canonical
 * USDC contract address is available for the chain. It then delegates to the generic
 * ERC-20 `allowance` action, automatically supplying the correct USDC contract address,
 * the wallet address (owner), and the delegate (spender).
 *
 * If `walletAddress` is omitted, the adapter's default address will be used.
 *
 * @param params - The action payload for USDC allowance lookup:
 *   - `walletAddress` (optional): The address to check the USDC allowance for. If not provided, the adapter's address is used.
 *   - `delegate`: The address of the spender (delegate) to check the allowance for.
 * @param adapter - The EVM adapter providing chain context and contract interaction.
 * @param context - The resolved operation context providing chain and address information.
 * @returns A promise resolving to a prepared chain request for the USDC `allowance` call.
 *   The returned request's `execute` method yields the allowance as a string (in USDC's smallest unit).
 * @throws Error if the current chain is not EVM-compatible, if the USDC address is missing, or if the contract call fails.
 *
 * @example
 * ```typescript
 * const prepared = await allowance({ walletAddress: '0xabc...', delegate: '0xdef...' }, adapter, context);
 * const allowanceValue = await prepared.execute();
 * console.log(allowanceValue); // e.g., "1000000" (for 1 USDC with 6 decimals)
 * ```
 */
const allowance = async (params, adapter, context) => {
    const { walletAddress, delegate } = params;
    // get the USDC address for the chain from context
    const chain = context.chain;
    const tokenAddress = chain.usdcAddress;
    if (tokenAddress == null) {
        throw new Error(`USDC address not found for chain ${chain.name}`);
    }
    // use the generic token allowance functionality with the USDC address
    return await allowance$1({
        tokenAddress,
        walletAddress,
        delegate,
    }, adapter, context);
};

/**
 * Creates a collection of action handlers for EVM blockchain operations.
 *
 * This factory function generates type-safe action handlers that implement
 * the ActionHandlers interface for EVM-specific blockchain operations.
 * Each handler processes action payloads and returns prepared chain requests
 * that can be executed by the EVM adapter.
 *
 * @remarks
 * All handlers include comprehensive runtime validation and error handling
 * to ensure reliable cross-chain operations. The handlers automatically
 * handle EVM-specific transaction formatting and account management.
 *
 * @param adapter - The configured EVM adapter for blockchain operations.
 * @returns A collection of type-safe action handlers for EVM operations.
 *
 * @throws Error When handler execution fails due to network or validation errors.
 */
const getHandlers = (adapter) => {
    return {
        /**
         * Handler for token allowance operations on EVM chains.
         *
         * Gets the allowance of the token for the given address.
         */
        'token.allowance': async (params, context) => {
            return allowance$1(params, adapter, context);
        },
        /**
         * Handler for token balance of operations on EVM chains.
         *
         * Gets the balance of the token for the given address.
         */
        'token.balanceOf': async (params, context) => {
            return balanceOf$1(params, adapter, context);
        },
        /**
         * Handler for USDC allowance operations on EVM chains.
         *
         * Gets the allowance of the USDC for the given address.
         */
        'usdc.allowance': async (params, context) => {
            return allowance(params, adapter, context);
        },
        /**
         * Handler for USDC balance of operations on EVM chains.
         *
         * Gets the balance of the USDC for the given address.
         */
        'usdc.balanceOf': async (params, context) => {
            return balanceOf(params, adapter, context);
        },
        /**
         * Handler for USDC increase allowance operations on EVM chains.
         *
         * Increases the allowance of the USDC contract to the delegate address.
         */
        'usdc.increaseAllowance': async (params, context) => {
            return increaseAllowance(params, adapter, context);
        },
        /**
         * Handler for CCTP v2 deposit for burn operations on EVM chains.
         *
         * Burns USDC tokens on the given EVM chain to initiate a cross-chain
         * transfer. This is the first step in the CCTP bridge process.
         */
        'cctp.v2.depositForBurn': async (params, context) => {
            return depositForBurn(params, adapter, context);
        },
        /**
         * Handler for CCTP v2 receive message operations on EVM chains.
         *
         * Mints USDC tokens on the given EVM chain using a valid
         * attestation from Circle. This completes the cross-chain transfer.
         */
        'cctp.v2.receiveMessage': async (params, context) => {
            return receiveMessage(params, adapter, context);
        },
        /**
         * Handler for CCTP v2 custom burn operations on EVM chains.
         *
         * Burns USDC tokens using a custom bridge contract that combines
         * approval and burning in a single transaction. This provides enhanced
         * functionality with protocol fees and preapproval funnel for chains
         * that support custom bridge contracts.
         */
        'cctp.v2.customBurn': async (params, context) => {
            return customBurn(params, adapter, context);
        },
        /**
         * Handler for native token balance operations on EVM chains.
         *
         * Gets the native balance (ETH, MATIC, etc.) for the given address.
         */
        'native.balanceOf': async (params, context) => {
            return balanceOf$2(params, adapter, context);
        },
    };
};

const EIP2612_NONCES_ABI = [
    {
        name: 'nonces',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'owner', type: 'address' }],
        outputs: [{ name: '', type: 'uint256' }],
    },
];
/**
 * Abstract base class for EVM-compatible blockchain adapters.
 *
 * This class extends the generic `Adapter` to provide EVM-specific functionality
 * for interacting with Ethereum Virtual Machine compatible blockchains. It automatically
 * registers EVM-specific action handlers during construction and sets the chain type to 'evm'.
 *
 * The signTypedData method uses a generic TypedData interface from the signTypedData module,
 * making it compatible with any EIP-712 standard (EIP-2612, EIP-7597, ERC-3009, etc.) while
 * maintaining type safety throughout the signing process.
 *
 * Includes caching and synchronization capabilities for provider-based adapters that need
 * to respond to account and chain changes from external wallets (e.g., MetaMask).
 */
class EvmAdapter extends Adapter {
    /**
     * The type of chain this adapter is for.
     */
    chainType = 'evm';
    /**
     * Cached gas price for the current network.
     */
    cachedGasPrice;
    /**
     * The constructor for the EVM adapter.
     *
     * @remarks
     * This constructor registers the action handlers for the EVM adapter.
     */
    constructor() {
        super();
        this.actionRegistry.registerHandlers(getHandlers(this));
    }
    /**
     * Fetches the current EIP-2612 nonce for a token owner.
     *
     * This method queries the token contract's `nonces(address)` function to get
     * the current nonce value for permit signatures. It uses the adapter's `prepare`
     * method to handle the contract interaction, making it framework-agnostic.
     *
     * @param tokenAddress - The ERC-20 token contract address
     * @param ownerAddress - The address of the token owner
     * @returns Promise resolving to the current nonce value
     * @throws Error when the contract call fails or the token doesn't support EIP-2612
     *
     * @example
     * ```typescript
     * // Get current nonce for permit signing
     * const nonce = await adapter.fetchEIP2612Nonce(
     *   '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
     *   '0x123...' // owner address
     * )
     * ```
     */
    async fetchEIP2612Nonce(tokenAddress, ownerAddress, ctx) {
        try {
            // Use the adapter's prepare method to call the nonces function
            const preparedNonce = await this.prepare({
                abi: EIP2612_NONCES_ABI,
                address: tokenAddress,
                functionName: 'nonces',
                args: [ownerAddress],
                type: 'evm',
            }, ctx);
            const nonce = await preparedNonce.execute();
            return BigInt(String(nonce));
        }
        catch (error) {
            throw new Error(`Failed to fetch EIP-2612 nonce for token ${tokenAddress} and owner ${ownerAddress}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Calculate the total transaction fee including compute cost and buffer for the configured chain.
     *
     * This method computes the fee by multiplying the estimated compute units by the
     * current gas price, then adds a configurable buffer to account for fee fluctuations
     * and ensure transaction success. The buffer is specified in basis points (1 basis
     * point = 0.01%).
     *
     * @param baseComputeUnits - The base compute units for the transaction.
     * @param bufferBasisPoints - The buffer to add as basis points (e.g., 500 = 5%). Defaults to DEFAULT_BUFFER_BASIS_POINTS (5%).
     * @param chain - The chain definition to fetch gas price for.
     * @returns A promise that resolves to the estimated gas cost including buffer.
     * @throws Error when gas price retrieval fails.
     *
     * @example
     * ```typescript
     * import { ViemAdapter } from '@circle-fin/adapter-viem-v2'
     * import { Ethereum } from '@core/chains'
     *
     * const adapter = new ViemAdapter({ publicClient, walletClient })
     *
     * // Calculate transaction fee with default 5% buffer
     * const fee = await adapter.calculateTransactionFee(1000000000n, undefined, Ethereum)
     * console.log('Transaction fee:', fee.toString(), 'wei')
     *
     * // Calculate transaction fee with custom 10% buffer
     * const feeWithCustomBuffer = await adapter.calculateTransactionFee(1000000000n, 1000n, Ethereum)
     * console.log('Transaction fee with custom buffer:', feeWithCustomBuffer.toString(), 'wei')
     * ```
     */
    async calculateTransactionFee(baseComputeUnits, bufferBasisPoints = DEFAULT_BUFFER_BASIS_POINTS, chain) {
        const gasPrice = await this.fetchGasPrice(chain);
        // Calculate fee and add buffer
        const fee = baseComputeUnits * gasPrice;
        return {
            gas: baseComputeUnits,
            gasPrice,
            fee: String(fee + (fee * bufferBasisPoints) / 10000n),
        };
    }
}

// --- Signature Parsing Constants ---
const SIGNATURE_BYTE_LENGTH = 65; // Total bytes in an Ethereum signature
const HEX_CHARS_PER_BYTE = 2;
const SIGNATURE_HEX_LENGTH = SIGNATURE_BYTE_LENGTH * HEX_CHARS_PER_BYTE;
const R_HEX_LENGTH = 32 * HEX_CHARS_PER_BYTE; // 32 bytes for 'r'
const S_HEX_LENGTH = 32 * HEX_CHARS_PER_BYTE; // 32 bytes for 's'
// --- Recovery ID Validation Constants ---
/**
 * Legacy recovery IDs (pre-EIP-155 format):
 * - 0 or 1 (older clients) or 27, 28 (Ethereum before chain-id inclusion)
 */
const LEGACY_V_VALUES = new Set([0, 1, 27, 28]);
/**
 * Minimum v value indicating an EIP-155 style signature.
 * Calculated as 35 + (2 * chainId) + recoveryId (0 or 1).
 */
const MIN_EIP155_V = 35;
/**
 * parseSignature
 *
 * Parse a 65-byte ECDSA signature into its r, s, and v components, expressed in hex.
 *
 * Ethereum signatures are structured as:
 *   signature = r (32 bytes) || s (32 bytes) || v (1 byte)
 *
 * - r, s: Big-endian hex values (32 bytes each)
 * - v: Recovery identifier, used by secp256k1 to reconstruct the signer’s public key
 *
 * @param signatureHex - Signature as a hex string, optionally prefixed with "0x".
 * @returns { r, s, v }
 *   - r: Hex string of the R component.
 *   - s: Hex string of the S component.
 *   - v: Numeric recovery ID.
 *
 * @throws Error if:
 *   - Input is not valid hex.
 *   - Incorrect length (must be exactly 65 bytes / 130 hex chars).
 *   - v is outside the supported range (Legacy or EIP-155 formula).
 *
 * Notes on EIP-155 overload:
 * EIP-155 repurposes the v field so that:
 *   v = 35 + (2 * chainId) + recoveryId(0 or 1)
 * Any v value >= 35 indicates the chain-id is encoded, preventing cross-chain replay.
 * r and s values remain unchanged.
 *
 * Example:
 * ```typescript
 * const rawSig = '0x6c1b...f02b'
 * try {
 *   const { r, s, v } = parseSignature(rawSig)
 *   console.log('R:', r)
 *   console.log('S:', s)
 *   console.log('Recovery ID (v):', v)
 * } catch (err) {
 *   console.error('Signature parse error:', err.message)
 * }
 * ```
 */
function parseSignature(signatureHex) {
    // 1) Remove optional '0x' prefix
    const hex = signatureHex.startsWith('0x')
        ? signatureHex.slice(2)
        : signatureHex;
    // 2) Validate hex format and length
    const VALID_HEX_REGEX = /^[0-9a-fA-F]+$/;
    if (!VALID_HEX_REGEX.test(hex)) {
        throw new Error('Signature must be a valid hex string (0-9, a-f, A-F).');
    }
    if (hex.length !== SIGNATURE_HEX_LENGTH) {
        throw new Error(`Invalid length: expected ${SIGNATURE_HEX_LENGTH.toString()} hex chars (65 bytes), got ${hex.length.toString()}`);
    }
    // 3) Extract components
    const r = `0x${hex.slice(0, R_HEX_LENGTH)}`;
    const s = `0x${hex.slice(R_HEX_LENGTH, R_HEX_LENGTH + S_HEX_LENGTH)}`;
    const vValue = parseInt(hex.slice(R_HEX_LENGTH + S_HEX_LENGTH), 16);
    // 4) Ensure v is within supported values
    const isLegacy = LEGACY_V_VALUES.has(vValue);
    const isEIP155 = vValue >= MIN_EIP155_V;
    if (!isLegacy && !isEIP155) {
        throw new Error(`Unsupported v value: ${vValue.toString()}. Must be one of [${[
            ...LEGACY_V_VALUES,
        ].join(', ')}] or >=${MIN_EIP155_V.toString()}`);
    }
    return { r: r, s: s, v: vValue };
}
/**
 * buildTypedData
 *
 * Create an EIP-712 compliant "TypedData" object, encapsulating:
 *  - Domain separator (application/contract identity, chain ID)
 *  - Explicit type definitions (field names and types)
 *  - Primary type name identifying the root object
 *  - Message payload matching the defined schema
 *
 * This enforces structured, non-ambiguous signing, and guards against signature replay.
 *
 * @typeParam Types - Map of type names to arrays of { name, type } definitions.
 * @typeParam Msg - Object whose shape matches the primaryType fields.
 *
 * @param domain - EIP712Domain, e.g. { name, version, chainId, verifyingContract }.
 * @param types - Type definitions, e.g.:
 *   {
 *     Mail: [ { name: 'from', type: 'string' }, { name: 'contents', type: 'string' } ],
 *   }
 * @param primaryType - Root key in types, e.g. 'Mail'.
 * @param message - The actual values, e.g. { from: 'Alice', contents: 'Hello' }.
 *
 * @returns TypedData object ready for use with signing libraries.
 *
 * Example:
 * ```typescript
 * const typedData = buildTypedData(
 *   { name: 'MyDApp', version: '1', chainId: 1, verifyingContract: '0xabc...' },
 *   { Message: [{ name: 'text', type: 'string' }] },
 *   'Message',
 *   { text: 'Hello, EIP-712!' }
 * )
 * // Pass typedData to ethers.js signer._signTypedData(domain, types, message)
 * ```
 */
function buildTypedData(domain, types, primaryType, message) {
    return { domain, types, primaryType, message };
}

/**
 * Compute default deadline for permit signatures.
 *
 * Returns a timestamp 1 hour (3600 seconds) from the current time,
 * converted to Unix timestamp format as a bigint. This is commonly
 * used as the default expiration time for EIP-2612 permit signatures.
 *
 * @returns Unix timestamp (in seconds) 1 hour from now as a bigint
 *
 * @example
 * ```typescript
 * import { computeDefaultDeadline } from '@core/adapter-evm'
 *
 * const deadline = computeDefaultDeadline()
 * console.log(`Permit expires at: ${deadline}`)
 * // Output: Permit expires at: 1640998800
 * ```
 */
function computeDefaultDeadline() {
    return BigInt(Math.floor(Date.now() / 1000) + 3600);
}

/**
 * EIP-2612 permit type definition.
 * Defines the structure for permit signatures according to EIP-2612 specification.
 *
 * @see {@link https://eips.ethereum.org/EIPS/eip-2612 | EIP-2612 Specification}
 */
const EIP2612_TYPES = {
    Permit: [
        { name: 'owner', type: 'address' },
        { name: 'spender', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
        { name: 'deadline', type: 'uint256' },
    ],
};

/**
 * Build EIP-2612 typed data for permit signing.
 *
 * This function creates the complete EIP-712 typed data structure required
 * for EIP-2612 permit signatures, including automatic nonce fetching using
 * the adapter's built-in nonce fetching capability.
 *
 * **Address Formatting**: All addresses are automatically formatted with proper
 * EIP-55 checksumming using the `convertAddress` utility, ensuring compatibility
 * with strict validation libraries like viem.
 *
 * **Nonce Handling**: The nonce can be provided explicitly or will be fetched
 * automatically using the adapter's `fetchEIP2612Nonce` method, which queries
 * the token contract's `nonces(owner)` function.
 *
 * **Deadline Calculation**: If no deadline is provided, it defaults to 24 hours
 * from the current time (computed using `computeDefaultDeadline`).
 *
 * @param meta - Domain metadata for the token contract
 * @param adapter - Adapter instance with nonce-fetching capability
 * @param opts - EIP-2612 permit options including owner, spender, value
 * @returns Complete EIP-712 typed data ready for signing
 *
 * @example
 * ```typescript
 * import { buildEIP2612TypedData } from '@core/adapter-evm'
 *
 * const typedData = await buildEIP2612TypedData(
 *   {
 *     name: 'USD Coin',
 *     version: '2',
 *     chainId: 1,
 *     verifyingContract: '0xa0b86a33e6441e4d178bb0c14ce0e9ce9c83bdd8'
 *   },
 *   adapter,
 *   {
 *     owner: '0x742d35cc6639c0532fbe9002b3a2265ca4c878f8e',
 *     spender: '0x1234567890123456789012345678901234567890',
 *     value: 1000000n
 *   }
 * )
 *
 * const signature = await adapter.signTypedData(typedData)
 * ```
 */
async function buildEIP2612TypedData(meta, adapter, opts, ctx) {
    // Format addresses to ensure proper EIP-55 checksumming
    const formattedOwner = convertAddress(opts.owner, 'evm');
    const formattedSpender = convertAddress(opts.spender, 'evm');
    const formattedContract = convertAddress(meta.verifyingContract, 'evm');
    // Fetch nonce if not provided - adapter handles the contract interaction
    const nonce = opts.nonce ??
        (await adapter.fetchEIP2612Nonce(formattedContract, formattedOwner, ctx));
    /*
     * Calculate deadline if not provided (24 hours from now)
     * EIP-2612 deadline is a uint256 in the permit struct, so we use bigint for full compatibility
     * with on-chain values and to avoid overflow/precision issues with large timestamps.
     * Most real-world deadlines are within JS safe integer range, but using bigint is safest.
     */
    const now = BigInt(Math.floor(Date.now() / 1000));
    const deadline = opts.deadline !== undefined
        ? BigInt(opts.deadline)
        : computeDefaultDeadline();
    if (deadline <= now) {
        throw new Error(`EIP-2612 deadline must be in the future (got ${deadline.toString()}, now ${now.toString()})`);
    }
    // Build the message with properly formatted addresses
    const message = {
        owner: formattedOwner,
        spender: formattedSpender,
        value: opts.value,
        nonce,
        deadline,
    };
    // Return complete typed data structure with formatted contract address
    return buildTypedData({ ...meta, verifyingContract: formattedContract }, EIP2612_TYPES, 'Permit', message);
}

/**
 * Checks if a function in an ABI is read-only (view or pure).
 *
 * @param abi - The contract ABI to inspect
 * @param functionName - The name of the function to check
 * @param defaultValue - The value to return if the function is not found in the ABI. If not provided, throws an error.
 * @returns true if the function has 'view' or 'pure' stateMutability, false otherwise, or defaultValue if function not found
 *
 * @example
 * ```typescript
 * import { isReadOnlyFunction } from '@core/adapter-evm/utils'
 * import { erc20Abi } from '@core/abis'
 *
 * const isBalanceOfReadOnly = isReadOnlyFunction(erc20Abi, 'balanceOf')
 * console.log(isBalanceOfReadOnly) // true
 *
 * const isApproveReadOnly = isReadOnlyFunction(erc20Abi, 'approve')
 * console.log(isApproveReadOnly) // false
 *
 * // With default value - won't throw if function not found
 * const isUnknownReadOnly = isReadOnlyFunction(someAbi, 'unknownFunction', false)
 * console.log(isUnknownReadOnly) // false (instead of throwing)
 * ```
 */
function isReadOnlyFunction(abi, functionName, defaultValue) {
    const functionAbi = abi.find((item) => item.type === 'function' && item.name === functionName);
    if (!functionAbi) {
        {
            return defaultValue;
        }
    }
    // Check if the function has view or pure stateMutability
    return (functionAbi.stateMutability === 'view' ||
        functionAbi.stateMutability === 'pure');
}

/**
 * Zod schema for validating EVM adapter capabilities.
 *
 * This schema ensures that EVM adapter capabilities meet the requirements for the
 * OperationContext pattern by validating the addressContext property and ensuring
 * the supportedChains property contains only EVM-compatible chains.
 *
 * @remarks
 * This schema enforces that all supported chains are EVM type, making it specific
 * to EVM adapters (Ethers, Viem, etc.). For non-EVM adapters, a different validation
 * schema should be used.
 *
 * When used with the validate() function from @core/utils, this throws KitError
 * with INPUT_VALIDATION_FAILED code if validation fails, with details about which
 * properties failed.
 *
 * @example
 * ```typescript
 * import { AdapterCapabilitiesSchema } from '@core/adapter-evm/validation'
 * import { Ethereum, Base } from '@core/chains'
 *
 * // Valid user-controlled capabilities
 * const userCapabilities = {
 *   addressContext: 'user-controlled',
 *   supportedChains: [Ethereum, Base]
 * }
 *
 * // Valid developer-controlled capabilities
 * const devCapabilities = {
 *   addressContext: 'developer-controlled',
 *   supportedChains: [Ethereum]
 * }
 *
 * AdapterCapabilitiesSchema.parse(userCapabilities) // passes
 * AdapterCapabilitiesSchema.parse(devCapabilities) // passes
 * ```
 *
 * @example
 * ```typescript
 * // Invalid - non-EVM chain
 * const invalidCapabilities = {
 *   addressContext: 'user-controlled',
 *   supportedChains: [{ type: 'solana', name: 'Solana', chainId: 0 }]
 * }
 *
 * AdapterCapabilitiesSchema.parse(invalidCapabilities) // throws Zod validation error
 * ```
 */
const AdapterCapabilitiesSchema = z
    .object({
    /**
     * Defines who controls the address used in operations.
     * Must be either 'user-controlled' or 'developer-controlled'.
     */
    addressContext: z.enum(['user-controlled', 'developer-controlled'], {
        errorMap: () => ({
            message: "addressContext must be either 'user-controlled' or 'developer-controlled'. " +
                "Use 'user-controlled' for browser wallets, private keys, or hardware wallets. " +
                "Use 'developer-controlled' for enterprise custody solutions or multi-entity adapters.",
        }),
    }),
    /**
     * Array of supported chains. Must contain at least one EVM chain.
     * All chains must be valid EVM ChainDefinition objects.
     */
    supportedChains: z
        .array(z
        .object({
        type: z.literal('evm'),
        chainId: z.number(),
    })
        .passthrough(), // Allow additional ChainDefinition properties
    {
        errorMap: () => ({
            message: 'supportedChains must be an array. Provide an array of EVM ChainDefinition objects.',
        }),
    })
        .min(1, {
        message: 'supportedChains cannot be empty. Please specify at least one supported chain.',
    }),
})
    .strict();

/**
 * Zod schema for validating EIP-712 domain objects.
 *
 * This schema ensures that EIP-712 domain objects conform to the standard
 * specification with all required fields and proper types. The domain
 * separator prevents signature replay attacks across different domains.
 *
 * @throws KitError if validation fails
 *
 * @example
 * ```typescript
 * import { eip712DomainSchema } from '@core/adapter-evm/validation'
 *
 * const domain = {
 *   name: 'USDC',
 *   version: '2',
 *   chainId: 1,
 *   verifyingContract: '0xA0b86a33E6441e4d178bb0c14ce0E9Ce9c83bdd8'
 * }
 *
 * const result = eip712DomainSchema.safeParse(domain)
 * if (result.success) {
 *   console.log('Domain is valid')
 * } else {
 *   console.error('Validation failed:', result.error)
 * }
 * ```
 */
const eip712DomainSchema = z.object({
    name: z
        .string({
        required_error: 'Domain name is required. Please provide the domain name.',
        invalid_type_error: 'Domain name must be a string.',
    })
        .min(1, 'Domain name cannot be empty.'),
    version: z
        .string({
        required_error: 'Domain version is required. Please provide the domain version.',
        invalid_type_error: 'Domain version must be a string.',
    })
        .min(1, 'Domain version cannot be empty.'),
    chainId: z
        .number({
        required_error: 'Chain ID is required. Please provide the chain ID.',
        invalid_type_error: 'Chain ID must be a number.',
    })
        .int('Chain ID must be an integer.')
        .positive('Chain ID must be positive.'),
    verifyingContract: z
        .string({
        required_error: 'Verifying contract address is required. Please provide the contract address.',
        invalid_type_error: 'Verifying contract address must be a string.',
    })
        .regex(/^0x[a-fA-F0-9]{40}$/, 'Verifying contract must be a valid Ethereum address.'),
    salt: z
        .string()
        .regex(/^0x[a-fA-F0-9]+$/, 'Salt must be a valid hex string.')
        .optional(),
});
/**
 * Zod schema for validating TypedData field definitions.
 *
 * This schema validates individual field definitions within EIP-712 type
 * definitions. Each field must have a name and a valid Solidity type.
 *
 * @throws KitError if validation fails
 *
 * @example
 * ```typescript
 * import { typedDataFieldSchema } from '@core/adapter-evm/validation'
 *
 * const field = {
 *   name: 'owner',
 *   type: 'address'
 * }
 *
 * const result = typedDataFieldSchema.safeParse(field)
 * if (result.success) {
 *   console.log('Field is valid')
 * } else {
 *   console.error('Validation failed:', result.error)
 * }
 * ```
 */
const typedDataFieldSchema = z.object({
    name: z
        .string({
        required_error: 'Field name is required. Please provide the field name.',
        invalid_type_error: 'Field name must be a string.',
    })
        .min(1, 'Field name cannot be empty'),
    type: z
        .string({
        required_error: 'Field type is required. Please provide the Solidity type.',
        invalid_type_error: 'Field type must be a string.',
    })
        .min(1, 'Field type cannot be empty'),
});
/**
 * Zod schema for validating complete EIP-712 TypedData structures.
 *
 * This schema validates the complete EIP-712 typed data structure including
 * domain, types, primaryType, and message. It ensures all components are
 * properly structured and the primaryType exists in the types definition.
 *
 * @throws KitError if validation fails
 *
 * @example
 * ```typescript
 * import { typedDataSchema } from '@core/adapter-evm/validation'
 *
 * const typedData = {
 *   domain: {
 *     name: 'USDC',
 *     version: '2',
 *     chainId: 1,
 *     verifyingContract: '0xA0b86a33E6441e4d178bb0c14ce0E9Ce9c83bdd8'
 *   },
 *   types: {
 *     Permit: [
 *       { name: 'owner', type: 'address' },
 *       { name: 'spender', type: 'address' },
 *       { name: 'value', type: 'uint256' },
 *       { name: 'nonce', type: 'uint256' },
 *       { name: 'deadline', type: 'uint256' }
 *     ]
 *   },
 *   primaryType: 'Permit',
 *   message: {
 *     owner: '0x1234567890123456789012345678901234567890',
 *     spender: '0x0987654321098765432109876543210987654321',
 *     value: 1000000,
 *     nonce: 0,
 *     deadline: 1640995200
 *   }
 * }
 *
 * const result = typedDataSchema.safeParse(typedData)
 * if (result.success) {
 *   console.log('TypedData is valid')
 * } else {
 *   console.error('Validation failed:', result.error)
 * }
 * ```
 */
const typedDataSchema = z
    .object({
    domain: eip712DomainSchema,
    types: z
        .record(z.string().min(1, 'Type name cannot be empty.'), z
        .array(typedDataFieldSchema, {
        required_error: 'Type definition is required. Please provide an array of field definitions.',
        invalid_type_error: 'Type definition must be an array of TypedDataField objects.',
    })
        .min(1, 'Type definition cannot be empty. Please provide at least one field.'))
        .refine((types) => Object.keys(types).length > 0, 'Types object cannot be empty. Please provide at least one type definition.'),
    primaryType: z
        .string({
        required_error: 'Primary type is required. Please provide the primary type name.',
        invalid_type_error: 'Primary type must be a string.',
    })
        .min(1, 'Primary type cannot be empty.'),
    message: z.record(z.unknown(), {
        required_error: 'Message is required. Please provide the message object.',
        invalid_type_error: 'Message must be an object.',
    }),
})
    .refine((data) => data.primaryType in data.types, (data) => ({
    message: `Primary type "${data.primaryType}" must exist in the types definition. Available types: ${Object.keys(data.types).join(', ')}.`,
    path: ['primaryType'],
}));
const abiParameterSchema = z.object({
    name: z.string(),
    type: z.string().min(1, 'Parameter type cannot be empty'),
    internalType: z.string().optional(),
    components: z.lazy(() => z.array(abiParameterSchema)).optional(), // For tuple types
});
/**
 * Schema for validating ABI entries (function definitions, events, etc).
 *
 * This schema validates individual ABI entries that describe contract functions,
 * constructors, events, and other contract interface elements.
 *
 * @throws KitError if validation fails
 *
 * @example
 * ```typescript
 * import { abiEntrySchema } from '@core/adapter-evm/validation'
 *
 * const functionAbi = {
 *   type: 'function',
 *   name: 'transfer',
 *   inputs: [
 *     { name: 'to', type: 'address' },
 *     { name: 'value', type: 'uint256' }
 *   ],
 *   outputs: [{ name: '', type: 'bool' }],
 *   stateMutability: 'nonpayable'
 * }
 *
 * const result = abiEntrySchema.safeParse(functionAbi)
 * ```
 */
const abiEntrySchema = z.object({
    type: z.enum([
        'function',
        'constructor',
        'event',
        'fallback',
        'receive',
        'error',
    ]),
    name: z.string().optional(), // Not required for constructor, fallback, receive
    inputs: z.array(abiParameterSchema).default([]),
    outputs: z.array(abiParameterSchema).optional(),
    stateMutability: z.enum(['pure', 'view', 'nonpayable', 'payable']).optional(),
    // Legacy fields for backwards compatibility
    constant: z.boolean().optional(),
    payable: z.boolean().optional(),
    anonymous: z.boolean().optional(), // For events
});
/**
 * Schema for validating complete ABI arrays.
 *
 * This schema validates arrays of ABI entries, ensuring each entry is properly
 * structured for contract interaction.
 *
 * @throws KitError if validation fails
 *
 * @example
 * ```typescript
 * import { abiSchema } from '@core/adapter-evm/validation'
 *
 * const abi = [
 *   {
 *     type: 'function',
 *     name: 'balanceOf',
 *     inputs: [{ name: 'owner', type: 'address' }],
 *     outputs: [{ name: '', type: 'uint256' }],
 *     stateMutability: 'view'
 *   }
 * ]
 *
 * const result = abiSchema.safeParse(abi)
 * ```
 */
const abiSchema = z
    .array(abiEntrySchema)
    .min(1, 'ABI must contain at least one entry');
/**
 * Schema for validating EVM adapter instances.
 *
 * This ensures all required properties and methods are present on an EVM adapter.
 * An EVM adapter must include:
 * - A chainType property set to 'evm'
 * - An actionRegistry with registerHandlers method and actionHandlers record
 * - A prepare method for creating chain requests
 *
 * @throws KitError if validation fails
 *
 * @example
 * ```typescript
 * import { evmAdapterSchema } from '@core/evmAdapter'
 *
 * const validAdapter = {
 *   chainType: 'evm' as const,
 *   actionRegistry: {
 *     registerHandlers: (handlers: any) => {},
 *     actionHandlers: {
 *       'usdc.approve': async (params: any) => ({})
 *     }
 *   },
 *   prepare: async (request: any) => ({}),
 * }
 *
 * const result = evmAdapterSchema.safeParse(validAdapter)
 * console.log(result.success) // true
 * ```
 */
adapterSchema.extend({
    chainType: z.literal('evm'),
    actionRegistry: z.object({
        registerHandlers: z.function().returns(z.any()),
        actionHandlers: z.map(z.string(), z.function().returns(z.any())),
    }),
});
/**
 * Schema for validating EVM prepared chain request parameters.
 *
 * This schema validates the parameters needed to execute a contract call on an EVM-compatible chain.
 * It ensures proper formatting of addresses, ABI structure, and function parameters.
 *
 * @throws KitError if validation fails
 *
 * @example
 * ```typescript
 * import { evmPreparedChainRequestParamsSchema } from '@core/adapter-evm/validation'
 *
 * const params = {
 *   type: 'evm',
 *   abi: [{
 *     type: 'function',
 *     name: 'transfer',
 *     inputs: [
 *       { name: 'to', type: 'address' },
 *       { name: 'value', type: 'uint256' }
 *     ],
 *     outputs: [{ name: '', type: 'bool' }],
 *     stateMutability: 'nonpayable'
 *   }],
 *   address: '0x1234567890123456789012345678901234567890',
 *   functionName: 'transfer',
 *   args: ['0xabcdef...', '1000000']
 * }
 *
 * const result = evmPreparedChainRequestParamsSchema.safeParse(params)
 * ```
 */
const evmPreparedChainRequestParamsSchema = z.object({
    type: z.literal('evm'),
    abi: abiSchema,
    address: evmAddressSchema,
    functionName: z
        .string({
        required_error: 'Function name is required',
        invalid_type_error: 'Function name must be a string',
    })
        .min(1, 'Function name cannot be empty')
        .refine((name) => /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name), 'Function name must be a valid identifier (letters, numbers, underscore, dollar sign, cannot start with number)'),
    args: z.array(z.unknown(), {
        required_error: 'Arguments array is required',
        invalid_type_error: 'Arguments must be an array',
    }),
});
/**
 * Zod schema for validating Ethereum transaction hashes.
 *
 * This schema validates transaction hash strings to ensure they conform to the
 * standard Ethereum transaction hash format:
 * - Must be a non-empty string
 * - Must start with '0x'
 * - Must be exactly 66 characters long (0x + 64 hex characters)
 * - Must contain only valid hexadecimal characters (0-9, a-f, A-F)
 *
 * @throws KitError if validation fails
 *
 * @example
 * ```typescript
 * import { transactionHashSchema } from '@core/adapter-evm/validation'
 *
 * const txHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
 * const result = transactionHashSchema.safeParse(txHash)
 *
 * if (result.success) {
 *   console.log('Transaction hash is valid')
 * } else {
 *   console.error('Validation failed:', result.error.issues[0]?.message)
 * }
 * ```
 */
const evmTransactionHashSchema = z
    .string({
    required_error: 'Transaction hash is required and must be a string. Please provide a valid transaction hash.',
    invalid_type_error: 'Transaction hash is required and must be a string. Please provide a valid transaction hash.',
})
    .min(1, {
    message: 'Transaction hash cannot be empty. Please provide a valid transaction hash.',
})
    .refine((hash) => hash.startsWith('0x') && hash.length === 66, (hash) => ({
    message: `Transaction hash "${hash}" is not a valid format. Expected a 32-byte hex string prefixed with '0x' (66 characters total).`,
}))
    .refine((hash) => /^0x[0-9a-fA-F]{64}$/.test(hash), (hash) => ({
    message: `Transaction hash "${hash}" contains invalid characters. Only hexadecimal characters (0-9, a-f, A-F) are allowed after '0x'.`,
}));
/**
 * Zod schema for validating EVM private keys.
 *
 * This schema validates private key strings to ensure they are properly formatted:
 * - Accepts private keys with or without '0x' prefix
 * - Automatically normalizes by adding '0x' prefix if missing
 * - Validates that the key is exactly 64 hexadecimal characters (32 bytes)
 * - Ensures only valid hexadecimal characters (0-9, a-f, A-F) are used
 *
 * @remarks
 * This is a shared schema used by both ethers.v6 and viem.v2 adapters to ensure
 * consistent private key validation across all EVM adapters.
 *
 * @throws KitError if validation fails
 *
 * @example
 * ```typescript
 * import { evmPrivateKeySchema } from '@core/adapter-evm/validation'
 *
 * // Both formats are accepted and normalized
 * const keyWithPrefix = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
 * const keyWithoutPrefix = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
 *
 * const result1 = evmPrivateKeySchema.safeParse(keyWithPrefix)
 * const result2 = evmPrivateKeySchema.safeParse(keyWithoutPrefix)
 *
 * // Both succeed and produce the same normalized result with '0x' prefix
 * ```
 */
const evmPrivateKeySchema = z
    .string({
    required_error: 'Private key is required. Please provide a valid private key.',
    invalid_type_error: 'Private key must be a string. Please provide a valid private key.',
})
    .transform((val) => (val.startsWith('0x') ? val : `0x${val}`))
    .pipe(z.string().regex(/^0x[0-9a-fA-F]{64}$/, {
    message: 'Private key must be a valid 64-character hex string. Please provide a valid private key with or without "0x" prefix.',
}));

const assertEvmPreparedChainRequestParamsSymbol = Symbol('assertEvmPreparedChainRequestParams');
/**
 * Asserts that the provided parameters match the EvmPreparedChainRequestParams interface.
 * The validation includes:
 * - A valid contract address in hexadecimal format
 * - A valid contract ABI (either parsed or string array)
 * - A valid function name that exists in the ABI
 * - Arguments that match the function signature
 *
 * @param params - The parameters to validate
 * @throws KitError with INPUT_VALIDATION_FAILED code if validation fails, with details about which properties failed
 *
 * @example
 * ```typescript
 * import { assertEvmPreparedChainRequestParams } from '@core/adapter-evm'
 *
 * // Prepare EVM chain request parameters
 * const requestParams = {
 *   type: 'evm' as const,
 *   address: '0x1234567890123456789012345678901234567890',
 *   abi: ['function approve(address spender, uint256 amount) returns (bool)'],
 *   functionName: 'approve',
 *   args: ['0xSpenderAddress', BigInt(1000000)]
 * }
 *
 * // This will throw KitError if validation fails
 * assertEvmPreparedChainRequestParams(requestParams)
 *
 * // If we get here, request parameters are guaranteed to be valid
 * console.log('EVM prepared chain request parameters are valid')
 * ```
 */
function assertEvmPreparedChainRequestParams(params) {
    validateWithStateTracking(params, evmPreparedChainRequestParamsSchema, 'Request params', assertEvmPreparedChainRequestParamsSymbol);
}

/**
 * Asserts that the provided value is a valid EVM transaction hash.
 *
 * EVM transaction hashes must conform to the standard Ethereum format:
 * - Must be a non-empty string
 * - Must start with '0x'
 * - Must be exactly 66 characters long (0x + 64 hex characters)
 * - Must contain only valid hexadecimal characters (0-9, a-f, A-F)
 *
 * @param txHash - The transaction hash to validate
 * @throws KitError with INPUT_VALIDATION_FAILED code if validation fails, with details about which properties failed
 *
 * @example
 * ```typescript
 * import { assertEvmTransactionHash } from '@core/adapter-evm'
 *
 * // Valid transaction hash
 * assertEvmTransactionHash('0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef')
 * // No error thrown
 *
 * // Invalid transaction hash
 * assertEvmTransactionHash('invalid-hash')
 * // Throws KitError with descriptive message
 * ```
 */
function assertEvmTransactionHash(txHash) {
    validate(txHash, evmTransactionHashSchema, 'Transaction hash');
}

/**
 * Asserts that the provided data matches the EIP-712 TypedData interface.
 *
 * This function validates the complete EIP-712 typed data structure including
 * domain, types, primaryType, and message components. It ensures all components
 * are properly structured according to the EIP-712 standard and that the
 * primaryType exists in the types definition.
 *
 * The validation includes:
 * - Valid EIP-712 domain with required fields (name, version, chainId, verifyingContract)
 * - Proper types definition with valid field structures
 * - Existing primaryType in the types definition
 * - Well-formed message object
 *
 * @typeParam Types - The EIP-712 types definition for the standard being validated
 * @typeParam Message - The message structure for the standard being validated
 * @param typedData - The typed data to validate
 * @throws {KitError} If validation fails with INPUT_VALIDATION_FAILED code (1098), with details about which properties failed
 *
 * @example
 * ```typescript
 * import { assertTypedData } from '@core/adapter-evm'
 *
 * // Prepare EIP-2612 permit typed data
 * const typedData = {
 *   domain: {
 *     name: 'USDC',
 *     version: '2',
 *     chainId: 1,
 *     verifyingContract: '0xA0b86a33E6441e4d178bb0c14ce0E9Ce9c83bdd8'
 *   },
 *   types: {
 *     Permit: [
 *       { name: 'owner', type: 'address' },
 *       { name: 'spender', type: 'address' },
 *       { name: 'value', type: 'uint256' },
 *       { name: 'nonce', type: 'uint256' },
 *       { name: 'deadline', type: 'uint256' }
 *     ]
 *   },
 *   primaryType: 'Permit',
 *   message: {
 *     owner: '0x1234567890123456789012345678901234567890',
 *     spender: '0x0987654321098765432109876543210987654321',
 *     value: 1000000,
 *     nonce: 0,
 *     deadline: 1640995200
 *   }
 * }
 *
 * // This will throw if validation fails
 * assertTypedData(typedData)
 *
 * // If we get here, typedData is guaranteed to be valid EIP-712 structure
 * console.log('TypedData is valid for signing')
 * ```
 */
function assertTypedData(typedData) {
    validateOrThrow(typedData, typedDataSchema, 'Invalid typed data');
}

/**
 * Create an enhanced HTTP transport that uses our chain definition RPC endpoints.
 *
 * This utility creates a Viem HTTP transport that prioritizes our chain definition's
 * default RPC endpoints over Viem's built-in endpoints. For chains with multiple
 * RPC endpoints, it automatically creates a fallback transport for improved reliability.
 *
 * **Automatic Failover**: When a chain definition includes multiple RPC endpoints,
 * the transport will automatically fall back to subsequent endpoints if the primary
 * endpoint fails. This provides built-in redundancy for supported chains.
 *
 * This is especially useful for:
 * - Custom chains that aren't in Viem's built-in chain definitions
 * - Using more reliable or preferred RPC endpoints than Viem's defaults
 * - Maintaining consistency with our chain configuration across EVM and non-EVM chains
 * - Automatic failover when primary RPC endpoints experience issues
 *
 * @param chainDefinition - Optional chain definition to extract RPC endpoint from
 * @param customUrl - Optional custom RPC URL to override both chain definition and Viem defaults
 * @returns A configured Viem HTTP transport (single endpoint or fallback transport)
 *
 * @example
 * ```typescript
 * import { createEnhancedTransport } from '@adapters/viem.v2'
 * import { Ethereum } from '@core/chains'
 * import { createWalletClient } from 'viem'
 *
 * // Use our chain definition's default RPC endpoint
 * const transport = createEnhancedTransport(Ethereum)
 * const client = createWalletClient({
 *   transport,
 *   // ... other config
 * })
 * ```
 *
 * @example
 * ```typescript
 * import { createEnhancedTransport } from '@adapters/viem.v2'
 * import { Unichain } from '@core/chains'
 *
 * // For chains with multiple endpoints, automatic failover is enabled
 * const transport = createEnhancedTransport(Unichain)
 * // Creates fallback transport: https://rpc.unichain.org → https://mainnet.unichain.org
 * ```
 *
 * @example
 * ```typescript
 * import { createEnhancedTransport } from '@adapters/viem.v2'
 *
 * // Use custom RPC URL (highest priority)
 * const transport = createEnhancedTransport(undefined, 'https://my-custom-rpc.com')
 * ```
 *
 * @example
 * ```typescript
 * import { createEnhancedTransport } from '@adapters/viem.v2'
 *
 * // Fall back to Viem's default (when no chain definition provided)
 * const transport = createEnhancedTransport()
 * ```
 */
function createEnhancedTransport(chainDefinition, customUrl) {
    if (chainDefinition && chainDefinition.rpcEndpoints.length > 0) {
        const endpoints = chainDefinition.rpcEndpoints;
        // If only one endpoint, use simple http transport with proper validation
        if (endpoints.length === 1) {
            const rpcUrl = getDefaultRpcEndpoint(chainDefinition);
            return http(rpcUrl);
        }
        // Multiple endpoints: create fallback transport for automatic failover
        const transports = endpoints.map((endpoint) => http(endpoint));
        return fallback(transports);
    }
    // Fall back to Viem's default RPC endpoint
    return http();
}

/**
 * Create a cached factory function for generating PublicClient instances.
 *
 * This higher-order function returns a memoized PublicClient factory that
 * creates and caches PublicClient instances per chain ID. Subsequent calls
 * with the same chain will return the cached instance, improving performance
 * by avoiding redundant client creation.
 *
 * The returned PublicClient automatically uses vetted RPC endpoints from our
 * chain definitions. When no explicit chainDefinition is provided, it will
 * automatically resolve the chain definition based on the viem Chain's ID.
 * If the chain is not found in our definitions, it falls back to viem's
 * default transport. Each chain's PublicClient is cached indefinitely
 * based on the chain ID.
 *
 * @param cache - A Map instance for caching PublicClient instances by chain ID.
 * @param chainDefinition - Optional chain definition to use for RPC endpoint selection.
 *   If not provided, will be automatically resolved from the chain ID.
 * @returns A factory function that creates or retrieves cached PublicClient instances.
 *
 * @example
 * ```typescript
 * import { getDefaultPublicClient } from '@adapters/viem.v2'
 * import { mainnet, sepolia } from 'viem/chains'
 *
 * // Create a cache and factory - automatically uses our vetted RPC endpoints
 * const cache = new Map()
 * const createPublicClient = getDefaultPublicClient(cache)
 *
 * // Create clients for different chains - automatically uses chain definition endpoints
 * const mainnetClient = createPublicClient({ chain: mainnet })
 * // Uses our Ethereum chain definition RPC endpoint: https://eth.merkle.io
 *
 * const sepoliaClient = createPublicClient({ chain: sepolia })
 * // Uses our Ethereum Sepolia chain definition RPC endpoint: https://sepolia.drpc.org
 *
 * // Subsequent calls return cached instances
 * const sameMainnetClient = createPublicClient({ chain: mainnet })
 * console.log(mainnetClient === sameMainnetClient) // true
 * ```
 *
 * @example
 * ```typescript
 * import { getDefaultPublicClient } from '@adapters/viem.v2'
 * import { Ethereum } from '@core/chains'
 * import { getViemChainByEnum } from '@adapters/viem.v2'
 *
 * // Explicit chain definition (for consistency or custom chains)
 * const cache = new Map()
 * const viemChain = getViemChainByEnum(Ethereum.chain)
 * const createPublicClient = getDefaultPublicClient(cache, Ethereum)
 *
 * const client = createPublicClient({ chain: viemChain })
 * // Uses the explicitly provided Ethereum chain definition RPC endpoint
 * ```
 */
const getDefaultPublicClient = (cache, chainDefinition) => ({ chain }) => {
    // Check cache first
    const publicClient = cache.get(chain.id);
    if (publicClient) {
        return publicClient;
    }
    try {
        // Resolve chain definition if not provided
        let resolvedChainDefinition = chainDefinition;
        if (!resolvedChainDefinition) {
            try {
                resolvedChainDefinition = getChainByEvmChainId(chain.id);
            }
            catch {
                // If we can't resolve the chain definition, fall back to no definition
                // This allows custom chains or chains not in our definitions to still work
                resolvedChainDefinition = undefined;
            }
        }
        // Use our enhanced transport utility for consistent RPC endpoint selection
        const transport = createEnhancedTransport(resolvedChainDefinition);
        // Create new PublicClient with the enhanced transport
        // Type assertion ensures compatibility when consumers use non-strict TypeScript configurations.
        // Viem's createPublicClient return type can be overly specific in non-strict mode,
        // causing type mismatches. The assertion to PublicClient interface resolves this safely.
        const newPublicClient = createPublicClient({
            transport,
            chain,
        });
        // Cache the new client
        cache.set(chain.id, newPublicClient);
        return newPublicClient;
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to create PublicClient for chain ${chain.name} (ID: ${String(chain.id)}): ${message}. Please ensure the chain configuration is valid and the RPC endpoint is accessible.`);
    }
};

/**
 * Map a Blockchain enum value to its corresponding Viem Chain definition.
 *
 * This function provides a centralized mapping between the internal Blockchain
 * enum and Viem's chain definitions, enabling consistent chain identification
 * across the bridge kit. It supports both standard viem chains and custom
 * chain definitions for networks not yet included in viem/chains.
 *
 * The function validates input and throws descriptive errors for unsupported
 * blockchains or invalid input values. Custom chain definitions are maintained
 * for networks like Codex that are not yet available in the official viem
 * chain registry.
 *
 * @param chain - The Blockchain enum value to map to a Viem Chain.
 * @returns The corresponding Viem Chain definition with complete configuration.
 * @throws Error when the blockchain is not supported or input is invalid.
 *
 * @example
 * ```typescript
 * import { getViemChainByEnum } from '@adapters/viem.v2'
 * import { Blockchain } from '@core/chains'
 *
 * // Get standard viem chain
 * const ethChain = getViemChainByEnum(Blockchain.Ethereum)
 * console.log(ethChain.name) // "Ethereum"
 * console.log(ethChain.id) // 1
 *
 * // Get custom chain definition
 * const codexChain = getViemChainByEnum(Blockchain.Codex)
 * console.log(codexChain.name) // "Codex Mainnet"
 * console.log(codexChain.id) // 81224
 * ```
 *
 * @example
 * ```typescript
 * import { getViemChainByEnum } from '@adapters/viem.v2'
 * import { Blockchain } from '@core/chains'
 *
 * // Use with different network types
 * const mainnetChain = getViemChainByEnum(Blockchain.Ethereum)
 * const testnetChain = getViemChainByEnum(Blockchain.Ethereum_Sepolia)
 * const l2Chain = getViemChainByEnum(Blockchain.Arbitrum)
 *
 * // Access chain configuration
 * console.log(mainnetChain.rpcUrls.default.http[0])
 * console.log(testnetChain.nativeCurrency.symbol)
 * console.log(l2Chain.blockExplorers?.default?.url)
 * ```
 *
 * @example
 * ```typescript
 * import { getViemChainByEnum } from '@adapters/viem.v2'
 * import { Blockchain } from '@core/chains'
 *
 * // Error handling for unsupported chains
 * try {
 *   const chain = getViemChainByEnum('invalid' as Blockchain)
 * } catch (error) {
 *   console.error('Chain not supported:', error.message)
 * }
 * ```
 */
const getViemChainByEnum = (chain) => {
    const definition = getChainByEnum(chain);
    switch (definition.chain) {
        case Blockchain.Arbitrum:
            return arbitrum;
        case Blockchain.Arbitrum_Sepolia:
            return arbitrumSepolia;
        case Blockchain.Avalanche:
            return avalanche;
        case Blockchain.Avalanche_Fuji:
            return avalancheFuji;
        case Blockchain.Base:
            return base;
        case Blockchain.Base_Sepolia:
            return baseSepolia;
        case Blockchain.Celo:
            return celo;
        case Blockchain.Celo_Alfajores_Testnet:
            return celoAlfajores;
        case Blockchain.Ethereum:
            return mainnet;
        case Blockchain.Ethereum_Sepolia:
            return sepolia;
        case Blockchain.Linea:
            return linea;
        case Blockchain.Linea_Sepolia:
            return lineaSepolia;
        case Blockchain.Optimism:
            return optimism;
        case Blockchain.Optimism_Sepolia:
            return optimismSepolia;
        case Blockchain.Polygon:
            return polygon;
        case Blockchain.Polygon_Amoy_Testnet:
            return polygonAmoy;
        case Blockchain.Sei:
            return sei;
        case Blockchain.Sei_Testnet:
            return seiTestnet;
        case Blockchain.Sonic:
            return sonic;
        case Blockchain.Unichain:
            return unichain;
        case Blockchain.Unichain_Sepolia:
            return unichainSepolia;
        case Blockchain.World_Chain:
            return worldchain;
        case Blockchain.World_Chain_Sepolia:
            return worldchainSepolia;
        case Blockchain.XDC:
            return xdc;
        case Blockchain.XDC_Apothem:
            return xdcTestnet;
        case Blockchain.ZKSync_Era:
            return zksync;
        case Blockchain.ZKSync_Sepolia:
            return zksyncSepoliaTestnet;
        /**
         * Custom EVM chain definitions for networks not yet included in viem/chains.
         *
         * These definitions should be kept in sync with the official chain parameters
         * and updated if/when viem adds native support.
         */
        case Blockchain.Arc_Testnet:
        case Blockchain.Codex:
        case Blockchain.Codex_Testnet:
        case Blockchain.HyperEVM:
        case Blockchain.HyperEVM_Testnet:
        case Blockchain.Ink:
        case Blockchain.Ink_Testnet:
        case Blockchain.Monad:
        case Blockchain.Monad_Testnet:
        case Blockchain.Plume:
        case Blockchain.Plume_Testnet:
        case Blockchain.Sonic_Testnet:
            return {
                id: definition.chainId,
                name: definition.name,
                nativeCurrency: definition.nativeCurrency,
                rpcUrls: {
                    default: {
                        http: definition.rpcEndpoints,
                    },
                },
                blockExplorers: {
                    default: {
                        name: `${definition.name} Explorer`,
                        url: definition.explorerUrl,
                    },
                },
            };
        default:
            throw new Error(`Unsupported blockchain: ${String(chain)}. Please ensure the blockchain is supported in the getViemChainByEnum mapping or add a custom definition.`);
    }
};

/**
 * Zod schema for validating ViemAdapterOptions with getter-based wallet client.
 * This schema validates the clean, single-pattern ViemAdapterOptions structure that supports
 * both synchronous and asynchronous wallet client getters for maximum flexibility.
 *
 * @example
 * ```typescript
 * import { ViemAdapterOptionsSchema } from '@circle-fin/adapter-viem-v2/validation'
 * import { createPublicClient, createWalletClient, http } from 'viem'
 * import { mainnet } from 'viem/chains'
 * import { privateKeyToAccount } from 'viem/accounts'
 *
 * // Synchronous getter pattern
 * const account = privateKeyToAccount('0x...')
 * const options1 = {
 *   getPublicClient: ({ chain }) => createPublicClient({
 *     chain,
 *     transport: http()
 *   }),
 *   getWalletClient: () => createWalletClient({
 *     account,
 *     chain: mainnet,
 *     transport: http()
 *   })
 * }
 *
 * // Asynchronous getter pattern
 * const options2 = {
 *   getPublicClient: ({ chain }) => createPublicClient({
 *     chain,
 *     transport: http()
 *   }),
 *   getWalletClient: async () => {
 *     const wallet = await connectWallet()
 *     return createWalletClient({
 *       account: wallet.account,
 *       chain: mainnet,
 *       transport: http()
 *     })
 *   }
 * }
 *
 * const result1 = ViemAdapterOptionsSchema.safeParse(options1)
 * const result2 = ViemAdapterOptionsSchema.safeParse(options2)
 * ```
 */
const ViemAdapterOptionsSchema = z.object({
    getPublicClient: z
        .function()
        .args(z.object({ chain: z.unknown() }))
        .returns(z.unknown()),
    getWalletClient: z
        .function()
        .returns(z.union([z.unknown(), z.promise(z.unknown())]))
        .refine((fn) => {
        // Basic function validation - we can't validate the return type at schema time
        // The actual wallet client validation will occur at runtime
        return typeof fn === 'function';
    }, {
        message: 'getWalletClient must be a function that returns WalletClient or Promise<WalletClient>',
    }),
});
/**
 * Zod schema for validating CreateViemAdapterFromPrivateKeyParams.
 * This schema validates the parameters for creating a ViemAdapter from a private key.
 *
 * @remarks
 * Private keys can be provided with or without the '0x' prefix. The schema automatically
 * normalizes keys by adding the '0x' prefix if missing before validation.
 *
 * @example
 * ```typescript
 * import { createAdapterFromPrivateKeyParamsSchema } from '@circle-fin/adapter-viem-v2/validation'
 * import { Blockchain, Ethereum } from '@core/chains'
 *
 * // Both formats are supported:
 * const paramsWithPrefix = {
 *   privateKey: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
 *   chain: Ethereum
 * }
 *
 * const paramsWithoutPrefix = {
 *   privateKey: '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
 *   chain: Ethereum
 * }
 *
 * const result1 = createAdapterFromPrivateKeyParamsSchema.safeParse(paramsWithPrefix)
 * const result2 = createAdapterFromPrivateKeyParamsSchema.safeParse(paramsWithoutPrefix)
 * // Both succeed and produce the same normalized result
 * ```
 */
const createAdapterFromPrivateKeyParamsSchema = z.object({
    privateKey: evmPrivateKeySchema,
    getPublicClient: z
        .function()
        .args(z.object({ chain: z.unknown() }))
        .returns(z.unknown())
        .optional(),
    getWalletClient: z
        .function()
        .args(z.object({ chain: z.unknown(), account: z.unknown() }))
        .returns(z.union([z.unknown(), z.promise(z.unknown())]))
        .optional(),
    capabilities: AdapterCapabilitiesSchema.partial().optional(),
});
/**
 * Zod schema for validating CreateViemAdapterFromProviderParams.
 * This schema validates the parameters for creating a ViemAdapter from an EIP1193 provider.
 *
 * @example
 * ```typescript
 * import { createAdapterFromProviderParamsSchema } from '@circle-fin/adapter-viem-v2/validation'
 * import { Blockchain, Ethereum } from '@core/chains'
 *
 * const params = {
 *   provider: window.ethereum,
 *   chain: Ethereum // or Blockchain.Ethereum or 'Ethereum'
 * }
 *
 * const result = createAdapterFromProviderParamsSchema.safeParse(params)
 * if (result.success) {
 *   console.log('Parameters are valid')
 * } else {
 *   console.error('Validation failed:', result.error)
 * }
 * ```
 */
const createAdapterFromProviderParamsSchema = z.object({
    provider: z
        .object({
        request: z.function(),
    })
        .passthrough(),
    getPublicClient: z
        .function()
        .args(z.object({ chain: z.unknown() }))
        .returns(z.unknown())
        .optional(),
    capabilities: AdapterCapabilitiesSchema.partial().optional(),
});

/**
 * Validates ViemAdapterOptions configuration.
 *
 * This function validates the ViemAdapterOptions structure used by ViemAdapter constructor
 * which supports both synchronous and asynchronous wallet client getter functions
 * for flexible, lazy initialization patterns.
 *
 * @param options - The ViemAdapterOptions to validate
 * @throws KitError with INPUT_VALIDATION_FAILED code when schema validation fails
 * @example
 * ```typescript
 * import { validateViemAdapterOptions } from '@circle-fin/adapter-viem-v2/validation'
 * import { createPublicClient, createWalletClient, http } from 'viem'
 * import { mainnet } from 'viem/chains'
 *
 * // Synchronous getter pattern
 * const options1 = {
 *   getPublicClient: ({ chain }) => createPublicClient({ chain, transport: http() }),
 *   getWalletClient: () => createWalletClient({ chain: mainnet, transport: http() })
 * }
 *
 * // Asynchronous getter pattern
 * const options2 = {
 *   getPublicClient: ({ chain }) => createPublicClient({ chain, transport: http() }),
 *   getWalletClient: async () => createWalletClient({ chain: mainnet, transport: http() })
 * }
 *
 * validateViemAdapterOptions(options1) // throws KitError if invalid
 * validateViemAdapterOptions(options2) // throws KitError if invalid
 * ```
 */
function validateViemAdapterOptions(options) {
    // Validate basic structure with Zod schema
    validate(options, ViemAdapterOptionsSchema, 'ViemAdapterOptions');
}
/**
 * Validates CreateViemAdapterFromProviderParams configuration.
 *
 * This function validates the parameters used by createViemAdapterFromProvider
 * factory function.
 *
 * @param params - The CreateViemAdapterFromProviderParams to validate
 * @throws KitError with INPUT_VALIDATION_FAILED code when validation fails
 * @example
 * ```typescript
 * import { validateCreateAdapterFromProviderParams } from '@circle-fin/adapter-viem-v2/validation'
 * import { Blockchain, Ethereum } from '@core/chains'
 *
 * const params = {
 *   provider: window.ethereum,
 *   chain: Ethereum // or Blockchain.Ethereum or 'Ethereum'
 * }
 *
 * validateCreateAdapterFromProviderParams(params) // throws KitError if invalid
 * ```
 */
function validateCreateAdapterFromProviderParams(params) {
    validate(params, createAdapterFromProviderParamsSchema, 'CreateViemAdapterFromProviderParams');
}
/**
 * Validates adapter capabilities for ViemAdapter.
 *
 * This function ensures that the adapter capabilities meet the requirements for the
 * OperationContext pattern by validating the addressContext property and
 * ensuring the supportedChains property contains only EVM-compatible chains.
 *
 * @param capabilities - The adapter capabilities to validate
 * @throws KitError with INPUT_VALIDATION_FAILED code when capabilities validation fails
 *
 * @example
 * ```typescript
 * import { validateAdapterCapabilities } from '@circle-fin/adapter-viem-v2/validation'
 * import { Ethereum, Base } from '@core/chains'
 *
 * // Valid capabilities for user-controlled adapter
 * const userCapabilities = {
 *   addressContext: 'user-controlled',
 *   supportedChains: [Ethereum, Base]
 * }
 *
 * // Valid capabilities for developer-controlled adapter
 * const devCapabilities = {
 *   addressContext: 'developer-controlled',
 *   supportedChains: [Ethereum]
 * }
 *
 * validateAdapterCapabilities(userCapabilities) // passes validation
 * validateAdapterCapabilities(devCapabilities) // passes validation
 * ```
 */
function validateAdapterCapabilities(capabilities) {
    validate(capabilities, AdapterCapabilitiesSchema, 'AdapterCapabilities');
}

/**
 * A `Adapter` implementation using `viem` for Ethereum-compatible blockchain interactions.
 *
 * This class encapsulates `viem` specific logic, using `PublicClient` and `WalletClient`
 * for reading data and sending transactions. It provides comprehensive gas estimation,
 * contract call simulation, and transaction execution capabilities with full OperationContext support.
 *
 * @remarks
 * The constructor requires both configuration options and explicit capabilities to ensure
 * consistent behavior across all EVM adapters. The capabilities define address control patterns
 * and supported chains. Both synchronous and asynchronous wallet client getters are supported.
 *
 * @example
 * ```typescript
 * import { createPublicClient, createWalletClient, http } from 'viem';
 * import { privateKeyToAccount } from 'viem/accounts';
 * import { mainnet } from 'viem/chains';
 * import { ViemAdapter } from '@circle-fin/adapter-viem-v2';
 * import { Ethereum, Base, Polygon } from '@core/chains';
 *
 * // Zero-config factory approach (recommended)
 * const adapter = createViemAdapterFromPrivateKey({
 *   privateKey: '0x...'
 *   // Gets smart defaults: user-controlled + all EVM chains
 * })
 *
 * // OperationContext provides chain - no factory complexity!
 * const prepared = await adapter.prepare({
 *   address: '0x1234567890123456789012345678901234567890',
 *   abi: contractAbi,
 *   functionName: 'approve',
 *   args: ['0xspender', BigInt(1000)]
 * }, {
 *   chain: 'Base' // Chain specified here
 * });
 * ```
 */
class ViemAdapter extends EvmAdapter {
    /**
     * Configuration options for this ViemAdapter instance.
     */
    options;
    /**
     * Cached wallet clients per chain ID to prevent multiple initializations.
     */
    cachedWalletClients = new Map();
    /**
     * Promises for ongoing wallet client initialization per chain to prevent concurrent calls.
     */
    walletClientInitPromises = new Map();
    /**
     * Cached public clients.
     */
    cachedPublicClients = new Map();
    /**
     * Constructs a new `ViemAdapter` with getter-based wallet client configuration.
     *
     * This constructor creates an adapter using the OperationContext pattern, requiring
     * explicit capabilities configuration for type safety. Both synchronous and asynchronous
     * wallet client getters are supported for maximum flexibility in initialization patterns.
     *
     * @param options - Configuration options with getPublicClient and getWalletClient functions.
     * @param capabilities - Adapter capabilities defining address control and supported chains. Required for OperationContext pattern.
     * @throws Error when configuration validation fails.
     * @throws Error when capabilities.addressContext is not explicitly defined.
     * @throws Error when capabilities.addressContext has an invalid value.
     * @throws Error when capabilities.supportedChains contains non-EVM chains.
     *
     * @example
     * ```typescript
     * import { createPublicClient, createWalletClient, http } from 'viem';
     * import { privateKeyToAccount } from 'viem/accounts';
     * import { mainnet } from 'viem/chains';
     * import { ViemAdapter } from '@circle-fin/adapter-viem-v2';
     * import { Ethereum, Base } from '@core/chains';
     *
     * // Server-side adapter with private key account
     * const account = privateKeyToAccount('0x...');
     * const adapter = new ViemAdapter({
     *   getPublicClient: ({ chain }) => createPublicClient({
     *     chain,
     *     transport: http()
     *   }),
     *   getWalletClient: ({ chain }) => createWalletClient({
     *     account,
     *     chain,
     *     transport: http()
     *   })
     * }, {
     *   addressContext: 'developer-controlled',
     *   supportedChains: [Ethereum, Base]
     * });
     * ```
     *
     * @example
     * ```typescript
     * import { createPublicClient, createWalletClient, custom } from 'viem';
     * import { ViemAdapter } from '@circle-fin/adapter-viem-v2';
     * import { Ethereum } from '@core/chains';
     *
     * // Browser adapter with window.ethereum provider
     * const browserAdapter = new ViemAdapter({
     *   getPublicClient: ({ chain }) => createPublicClient({
     *     chain,
     *     transport: http()
     *   }),
     *   getWalletClient: ({ chain }) => createWalletClient({
     *     chain,
     *     transport: custom(window.ethereum)
     *   })
     * }, {
     *   addressContext: 'user-controlled',
     *   supportedChains: [Ethereum]
     * });
     * ```
     *
     * @example
     * ```typescript
     * import { createPublicClient, createWalletClient, http } from 'viem';
     * import { ViemAdapter } from '@circle-fin/adapter-viem-v2';
     * import { Ethereum, Base, Polygon } from '@core/chains';
     *
     * // Async wallet client initialization for complex setups
     * const asyncAdapter = new ViemAdapter({
     *   getPublicClient: ({ chain }) => createPublicClient({
     *     chain,
     *     transport: http()
     *   }),
     *   getWalletClient: async ({ chain }) => {
     *     // Complex async initialization (wallet connection, etc.)
     *     const wallet = await connectWallet();
     *     return createWalletClient({
     *       account: wallet.account,
     *       chain,
     *       transport: custom(wallet.provider)
     *     });
     *   }
     * }, {
     *   addressContext: 'user-controlled',
     *   supportedChains: [Ethereum, Base, Polygon]
     * });
     * ```
     *
     * @example
     * ```typescript
     * import { ViemAdapter } from '@circle-fin/adapter-viem-v2';
     * import { Ethereum } from '@core/chains';
     *
     * // Using the adapter with OperationContext pattern
     * const adapter = new ViemAdapter(options, capabilities);
     *
     * // Chain specified in OperationContext, not in adapter configuration
     * const prepared = await adapter.prepare({
     *   address: '0x1234567890123456789012345678901234567890',
     *   abi: contractAbi,
     *   functionName: 'transfer',
     *   args: ['0xrecipient', BigInt(1000)]
     * }, {
     *   chain: 'Ethereum' // Chain comes from context, not adapter
     * });
     *
     * const result = await prepared.execute();
     * console.log('Transaction hash:', result);
     * ```
     */
    constructor(options, capabilities) {
        super();
        // Validate options at runtime (basic structure validation)
        validateViemAdapterOptions(options);
        // Validate capabilities explicitly - required for OperationContext pattern
        validateAdapterCapabilities(capabilities);
        this.options = options;
        // Set capabilities - explicitly required to ensure consistent behavior
        // across all EVM adapters following the new OperationContext pattern
        this.capabilities = capabilities;
    }
    /**
     * Resets all cached state in the adapter, including Viem-specific caches.
     *
     * This method extends the base class resetState() to also clear Viem-specific
     * caches like public clients and cached wallet clients. It ensures a clean state when
     * the adapter needs to be reinitialized (e.g., after chain or account changes).
     *
     * @override
     * @remarks
     * For wallet clients initialized via getter functions, this will clear the cache
     * and the getter function will be called again on the next access.
     *
     * @example
     * ```typescript
     * // Called automatically during chain switches or account changes
     * adapter.resetState()
     *
     * // Or called manually to clear all caches
     * adapter.resetState()
     * ```
     */
    resetState() {
        // Clear Viem-specific caches
        this.cachedPublicClients.clear();
        // Clear wallet client caches
        this.cachedWalletClients.clear();
        this.walletClientInitPromises.clear();
    }
    /**
     * Ensures that the adapter is connected to the correct chain.
     * Switches the adapter to operate on the specified chain.
     *
     * This implementation handles chain switching for ViemAdapter. On the server side (Node.js),
     * it recreates the wallet client with the target chain. In the browser, it uses the
     * wallet's switchChain method. All validation is handled by the base class ensureChain method.
     *
     * @param chain - The target chain to switch to (already validated by base class).
     * @returns A promise that resolves when the chain switch is complete.
     * @throws When chain switching fails.
     */
    async switchToChain(chain) {
        // Validate chain type at runtime for additional safety
        if (chain.type !== 'evm') {
            throw new Error(`ViemAdapter can only switch to EVM chains. Received: ${String(chain.type)} (${chain.name})`);
        }
        // TypeScript now knows chain is EVMChainDefinition after the validation above
        try {
            // Check if we're on the server (Node.js environment)
            if (typeof window === 'undefined') {
                // Server-side: initialize wallet client for the target chain
                // This will create and cache a wallet client for the new chain
                await this.initializeWalletClient(chain);
            }
            else {
                // Browser: use the wallet's switchChain method
                const walletClient = await this.initializeWalletClient(chain);
                await walletClient.switchChain({
                    id: chain.chainId,
                });
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to switch to chain ${chain.name} (ID: ${String(chain.chainId)}): ${errorMessage}. ` +
                'Ensure the chain is supported by your wallet or provider.');
        }
    }
    /**
     * Parses and validates the ABI and function name.
     *
     * @internal
     * @param abiInput - Raw ABI input (string array or parsed ABI)
     * @param functionName - Name of the function to validate
     * @returns Parsed and validated ABI
     * @throws Error when ABI parsing fails or function is not found
     */
    parseAndValidateAbi(abiInput, functionName) {
        // Parse ABI from string array format, or use as-is if already parsed
        // Catch and re-throw ABI parsing errors with additional context
        let abi;
        try {
            abi =
                Array.isArray(abiInput) && typeof abiInput[0] === 'string'
                    ? parseAbi(abiInput)
                    : abiInput;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Invalid contract ABI: ${errorMessage}`);
        }
        // Validate that the function name exists in the ABI
        const isFunctionNameValid = abi.some((item) => item.type === 'function' && item.name === functionName);
        if (!isFunctionNameValid) {
            // Get all function names from the ABI for error message
            const availableFunctionNames = abi
                .filter((item) => item.type === 'function')
                .map((item) => item.name);
            throw new Error(`Function '${functionName}' not found in ABI. Available functions: ${availableFunctionNames.join(', ')}`);
        }
        return abi;
    }
    /**
     * Prepares a state-changing function call for gas estimation and execution.
     *
     * @internal
     * @param _walletClient - The wallet client for transaction signing (used only in execute method closure)
     * @param publicClient - The public client for simulation and estimation
     * @param address - Contract address
     * @param abi - Validated contract ABI
     * @param functionName - Function name to call
     * @param args - Function arguments
     * @param targetChain - The chain to execute on
     * @param resolvedAddress - The resolved address from OperationContext (may differ from wallet account)
     * @returns Prepared chain request for state-changing function
     */
    prepareStateChangingFunction(_walletClient, // Prefixed with underscore as it's used in execute method closure
    publicClient, address, abi, functionName, args, targetChain, resolvedAddress) {
        // For simulation and gas estimation, we use the resolved address from OperationContext.
        // For transaction execution, the effective account depends on the adapter type:
        // - User-controlled: uses the wallet's connected account
        // - Developer-controlled: uses resolvedAddress with wallet as signing service
        // The walletClient parameter is used by the execute method closure below.
        // Build base parameters for simulation, estimation and execution
        const baseParams = {
            abi,
            functionName,
            args,
        };
        const encodedParams = encodeFunctionData(baseParams);
        return {
            type: 'evm',
            /**
             * Estimates gas for the prepared function call.
             */
            estimate: async (overrides, fallback) => {
                let gas;
                const publicClient = await this.getPublicClient(targetChain);
                try {
                    gas = await publicClient.estimateGas({
                        account: resolvedAddress, // Use resolved address for gas estimation
                        to: address,
                        data: encodedParams,
                        ...overrides,
                    });
                }
                catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    if (fallback &&
                        errorMessage.toLocaleLowerCase().includes('execution reverted')) {
                        return fallback;
                    }
                    // Wrap gas estimation errors with structured error format
                    throw parseBlockchainError(error, {
                        chain: targetChain.name,
                        operation: 'estimateGas',
                    });
                }
                let gasPrice;
                try {
                    gasPrice = await this.fetchGasPrice(targetChain);
                }
                catch (error) {
                    // Wrap gas price errors with structured error format
                    throw parseBlockchainError(error, {
                        chain: targetChain.name,
                        operation: 'getGasPrice',
                    });
                }
                const fee = (gas * gasPrice).toString();
                return { gas, fee, gasPrice };
            },
            /**
             * Executes the prepared function call.
             */
            execute: async (overrides) => {
                // Pre-flight simulation to catch reverts before spending gas
                // Use resolvedAddress for simulation to ensure it matches the execution context
                try {
                    await publicClient.call({
                        account: resolvedAddress, // Use resolved address for simulation
                        to: address,
                        data: encodedParams,
                    });
                }
                catch (error) {
                    // Wrap simulation errors with structured error format
                    throw parseBlockchainError(error, {
                        chain: targetChain.name,
                        operation: 'simulation',
                    });
                }
                // Ensure the adapter is connected to the correct chain
                await this.ensureChain(targetChain);
                // Get the current wallet client (might have been updated by ensureChain)
                const currentWalletClient = await this.initializeWalletClient(targetChain);
                // Determine the effective account based on the adapter's address control mode
                const isDeveloperControlled = this.capabilities?.addressContext === 'developer-controlled';
                let effectiveAccount;
                if (isDeveloperControlled) {
                    // For developer-controlled adapters (Fireblocks, Circle Wallets), create a json-rpc
                    // account that represents the resolved address. The wallet client acts as a signing
                    // service that delegates actual signing to the transport (API provider).
                    effectiveAccount = {
                        address: resolvedAddress,
                        type: 'json-rpc',
                    };
                }
                else {
                    // For user-controlled adapters, use the wallet client's connected account
                    effectiveAccount = currentWalletClient.account;
                    if (!effectiveAccount) {
                        throw new Error('No wallet is connected. Please connect a wallet to sign and execute transactions.');
                    }
                }
                try {
                    return await currentWalletClient.sendTransaction({
                        to: address,
                        data: encodedParams,
                        account: effectiveAccount,
                        chain: await this.getViemChain(targetChain),
                        // Explicitly provide kzg to satisfy viem's SendTransactionParameters typing in non-strict mode
                        kzg: undefined,
                        ...overrides,
                    });
                }
                catch (error) {
                    // Wrap transaction execution errors with structured error format
                    throw parseBlockchainError(error, {
                        chain: targetChain.name,
                        operation: 'sendTransaction',
                    });
                }
            },
        };
    }
    /**
     * Prepares a function call for gas estimation and execution.
     *
     * @param params - Configuration options for the function call.
     * @param ctx - Required operation context specifying the chain and address for this operation.
     * @returns An object with `estimate` and `execute` methods.
     * @throws Error when WalletClient is not configured or no wallet is connected.
     * @throws Error when PublicClient is not configured.
     * @throws Error when required parameters (address, abi, functionName, args) are missing or invalid.
     * @throws Error when function call simulation fails.
     * @throws Error when OperationContext resolution fails.
     * @example
     * ```typescript
     * import { Ethereum, Base } from '@core/chains';
     *
     * const adapter = new ViemAdapter({
     *   getPublicClient: ({ chain }) => createPublicClient({ chain, transport: http() }),
     *   getWalletClient: ({ chain }) => createWalletClient({ account, chain, transport: http() })
     * }, {
     *   addressContext: 'user-controlled',
     *   supportedChains: [Ethereum]
     * });
     *
     * // OperationContext is required for all operations
     * const prepared = await adapter.prepare({
     *   address: '0x1234567890123456789012345678901234567890',
     *   abi: contractAbi,
     *   functionName: 'approve',
     *   args: ['0xspender', BigInt(1000)]
     * }, {
     *   chain: 'Base' // Chain specified in context
     * });
     *
     * const estimatedGas = await prepared.estimate();
     * console.log('Estimated Gas', estimatedGas);
     * ```
     */
    async prepare(params, ctx) {
        // Runtime validation for JavaScript consumers who lack TypeScript's compile-time checks
        assertEvmPreparedChainRequestParams(params);
        const { address, abi: abiInput, functionName, args } = params;
        // First, resolve the target chain from the operation context
        const targetChain = resolveChainIdentifier(ctx.chain);
        if (targetChain.type !== 'evm') {
            throw new Error(`Invalid chain type '${String(targetChain.type)}' for ViemAdapter. Expected 'evm' chain type.`);
        }
        // Parse and validate the ABI and function name
        const abi = this.parseAndValidateAbi(abiInput, functionName);
        // Check if the function is read-only (view or pure)
        // Read-only functions don't need chain switching or wallet client initialization
        const isReadOnly = isReadOnlyFunction(abi, functionName, false);
        const publicClient = await this.getPublicClient(targetChain);
        if (isReadOnly) {
            return this.handleReadOnlyFunction(publicClient, address, abi, functionName, args);
        }
        // For state-changing functions, ensure we're on the correct chain
        await this.ensureChain(targetChain);
        // Resolve the full operation context (address resolution happens here)
        const resolvedContext = await resolveOperationContext(this, ctx);
        if (!resolvedContext) {
            throw new Error('OperationContext resolution failed. Ensure the adapter has capabilities configured.');
        }
        const walletClient = await this.initializeWalletClient(targetChain);
        // For state-changing functions, delegate to the specialized method
        return this.prepareStateChangingFunction(walletClient, publicClient, address, abi, functionName, args, targetChain, resolvedContext.address);
    }
    /**
     * Handles read-only function calls with noop estimation.
     *
     * @param publicClient - The Viem public client configured for the target chain.
     * @param address - The contract address to call.
     * @param abi - The validated contract ABI.
     * @param functionName - The name of the function to call.
     * @param args - The function arguments.
     * @returns A prepared chain request for read-only function execution.
     */
    async handleReadOnlyFunction(publicClient, address, abi, functionName, args) {
        // For read-only functions, use readContract and noop estimation
        const noopRequest = await createNoopChainRequest();
        return {
            type: 'evm',
            estimate: noopRequest.estimate,
            execute: async () => {
                try {
                    const result = await publicClient.readContract({
                        address,
                        abi,
                        functionName,
                        args,
                    });
                    // For read-only functions, return the result as a string
                    if (typeof result === 'bigint') {
                        return result.toString();
                    }
                    if (typeof result === 'string' ||
                        typeof result === 'number' ||
                        typeof result === 'boolean') {
                        return String(result);
                    }
                    // For complex types, stringify them
                    return JSON.stringify(result);
                }
                catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    throw new Error(`Read contract failed: ${errorMessage}`);
                }
            },
        };
    }
    /**
     * Retrieves the connected wallet address.
     *
     * @param chain - The chain to use for address resolution.
     * @returns A promise that resolves to the connected wallet address.
     * @throws When the wallet has no addresses available.
     * @throws When no chain is provided (should not happen with OperationContext pattern).
     * @example
     * ```typescript
     * import { Ethereum } from '@core/chains';
     *
     * const adapter = new ViemAdapter({
     *   getPublicClient: ({ chain }) => createPublicClient({ chain, transport: http() }),
     *   getWalletClient: async ({ chain }) => createWalletClient({ account, chain, transport: http() })
     * }, {
     *   addressContext: 'user-controlled',
     *   supportedChains: [Ethereum]
     * });
     *
     * // Chain is provided by OperationContext resolution
     * const address = await adapter.getAddress(Ethereum);
     * console.log('Adapter Address', address);
     * ```
     */
    async getAddress(chain) {
        // Prevent calling getAddress on developer-controlled adapters
        if (this.capabilities?.addressContext === 'developer-controlled') {
            throw new Error('Cannot call getAddress() on developer-controlled adapters. Address must be provided explicitly in the operation context.');
        }
        // Chain parameter should now be provided by resolveOperationContext
        if (!chain) {
            throw new Error('Chain parameter is required for address resolution. This should be provided by the OperationContext pattern.');
        }
        const walletClient = await this.initializeWalletClient(chain);
        // Try account address first, fallback to getAddresses if needed
        const address = walletClient.account?.address ?? (await walletClient.getAddresses())[0];
        if (!address) {
            throw new Error('No addresses available in wallet');
        }
        return address;
    }
    /**
     * Gets the Viem Chain object for the given chain definition.
     *
     * @param chain - The chain definition to get the Viem Chain object for.
     * @returns The Viem Chain object for the given chain definition.
     * @example
     * ```typescript
     * import { Ethereum, EthereumSepolia } from '@core/chains';
     *
     * const adapter = new ViemAdapter({
     *   getPublicClient: ({ chain }) => createPublicClient({ chain, transport: http() }),
     *   getWalletClient: async ({ chain }) => createWalletClient({ account, chain, transport: http() })
     * }, {
     *   addressContext: 'user-controlled',
     *   supportedChains: [Ethereum]
     * });
     * const viemChain = await adapter.getViemChain(EthereumSepolia);
     * console.log('Viem Chain', viemChain);
     * ```
     */
    async getViemChain(chain) {
        // Add await to satisfy ESLint async requirement
        return await Promise.resolve(getViemChainByEnum(chain.chain));
    }
    /**
     * Gets the cached PublicClient or initializes it from options if not already cached.
     *
     * @param chain - The chain definition for which to get the PublicClient (required).
     * @returns The Viem PublicClient instance.
     * @remarks
     * This method ensures we only store one instance of the PublicClient per chain.
     * The chain parameter is required to prevent accidentally using the wrong chain,
     * which could lead to serious issues and real costs for users.
     * @example
     * ```typescript
     * const adapter = new ViemAdapter(options, capabilities);
     * const publicClient = await adapter.getPublicClient(Ethereum);
     * const blockNumber = await publicClient.getBlockNumber();
     * ```
     */
    async getPublicClient(chainDef) {
        const cachedClient = this.cachedPublicClients.get(chainDef.chainId);
        if (cachedClient) {
            // Add await to satisfy ESLint async requirement
            return await Promise.resolve(cachedClient);
        }
        const viemChain = getViemChainByEnum(chainDef.chain);
        const publicClient = this.options.getPublicClient({ chain: viemChain });
        this.cachedPublicClients.set(chainDef.chainId, publicClient);
        // Add await to satisfy ESLint async requirement
        return await Promise.resolve(publicClient);
    }
    /**
     * Wallet client initialization with proper caching and error handling.
     *
     * @param chain - The chain definition for the wallet client
     * @returns Promise resolving to initialized WalletClient
     * @throws Error when wallet client is not available or getter function fails.
     * @remarks
     * This method ensures we only initialize the WalletClient once per chain, even if it's provided as a getter function.
     * The getter function can return either a WalletClient directly (synchronous) or a Promise<WalletClient> (asynchronous).
     * Both patterns are normalized to Promise<WalletClient> internally for consistent handling.
     *
     * Wallet clients are cached per chain ID to enable seamless multi-chain operations within a single adapter instance.
     *
     * @example
     * ```typescript
     * // Get wallet client for specific chain (explicit and clear)
     * const walletClient = await adapter.initializeWalletClient(Base);
     *
     * // Cached calls return the same instance
     * const sameClient = await adapter.initializeWalletClient(Base); // Returns cached instance
     * ```
     */
    async initializeWalletClient(chain) {
        const chainId = chain.chainId;
        // Check cache first
        const cachedClient = this.cachedWalletClients.get(chainId);
        if (cachedClient) {
            return cachedClient;
        }
        // Check ongoing initialization
        const ongoingInit = this.walletClientInitPromises.get(chainId);
        if (ongoingInit) {
            return ongoingInit;
        }
        // Initialize with proper cleanup
        const initPromise = (async () => {
            try {
                const viemChain = getViemChainByEnum(chain.chain);
                const walletClient = await Promise.resolve(this.options.getWalletClient({ chain: viemChain }));
                // Cache success
                this.cachedWalletClients.set(chainId, walletClient);
                this.walletClientInitPromises.delete(chainId);
                return walletClient;
            }
            catch (error) {
                // Clear promise on error for retry capability
                this.walletClientInitPromises.delete(chainId);
                throw new Error(`Failed to initialize wallet client for chain ${chain.name}: ${error instanceof Error ? error.message : String(error)}`);
            }
        })();
        this.walletClientInitPromises.set(chainId, initPromise);
        return initPromise;
    }
    /**
     * Waits for a transaction to be mined and confirmed on the blockchain.
     *
     * This method polls the blockchain until the specified transaction is confirmed
     * with the required number of confirmations. It provides comprehensive transaction
     * details once the transaction is finalized.
     *
     * @param txHash - The hash of the transaction to wait for. Must be a valid 32-byte hex string prefixed with '0x'.
     * @param config - Optional configuration for waiting behavior including timeout and confirmations.
     * @returns Promise resolving to comprehensive transaction details including status, gas usage, and block information.
     * @throws Error when txHash is invalid (not a string, empty, or malformed hex).
     * @throws Error when config parameters are invalid (negative values).
     * @throws Error when transaction is not found or network issues occur.
     * @throws Error when timeout is exceeded before transaction confirmation.
     * @example
     * ```typescript
     * import { Ethereum } from '@core/chains';
     *
     * const adapter = new ViemAdapter({
     *   getPublicClient: ({ chain }) => createPublicClient({ chain, transport: http() }),
     *   getWalletClient: ({ chain }) => createWalletClient({ account, chain, transport: http() })
     * }, {
     *   addressContext: 'user-controlled',
     *   supportedChains: [Ethereum]
     * });
     *
     * // Wait with default settings
     * const result = await adapter.waitForTransaction('0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef');
     * console.log('Transaction status:', result.status);
     * console.log('Block number:', result.blockNumber);
     *
     * // Wait with custom configuration
     * const customResult = await adapter.waitForTransaction(
     *   '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
     *   { confirmations: 3, timeout: 60000 }
     * );
     * console.log('Gas used:', customResult.gasUsed.toString());
     * console.log('Block hash:', customResult.blockHash);
     * ```
     */
    async waitForTransaction(txHash, config, chain) {
        // Runtime validation for JavaScript consumers who lack TypeScript's compile-time checks
        assertEvmTransactionHash(txHash);
        const publicClient = await this.getPublicClient(chain);
        const receipt = await publicClient.waitForTransactionReceipt({
            hash: txHash,
            confirmations: config?.confirmations,
            timeout: config?.timeout,
        });
        return {
            txHash: receipt.transactionHash,
            status: receipt.status,
            cumulativeGasUsed: receipt.cumulativeGasUsed,
            gasUsed: receipt.gasUsed,
            blockNumber: receipt.blockNumber,
            blockHash: receipt.blockHash,
            transactionIndex: receipt.transactionIndex,
            effectiveGasPrice: receipt.effectiveGasPrice,
        };
    }
    /**
     * Fetches the current gas price from the network.
     *
     * @param chain - The chain definition to fetch gas price for.
     * @returns Promise resolving to the current gas price in wei
     * @throws Error when gas price retrieval fails
     */
    async fetchGasPrice(chain) {
        const publicClient = await this.getPublicClient(chain);
        return await publicClient.getGasPrice();
    }
    /**
     * Reads the native token balance (ETH, MATIC, etc.) for a given address.
     *
     * @param address - The wallet address to check the balance for.
     * @param chain - The chain definition to fetch the balance from.
     * @returns Promise resolving to the balance in wei as a bigint.
     * @throws Error when balance retrieval fails.
     *
     * @example
     * ```typescript
     * const balance = await adapter.readNativeBalance(
     *   '0x1234...',
     *   Ethereum
     * )
     * console.log('Balance:', balance.toString(), 'wei')
     * ```
     */
    async readNativeBalance(address, chain) {
        const publicClient = await this.getPublicClient(chain);
        try {
            return await publicClient.getBalance({
                address: address,
            });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new KitError({
                ...RpcError.ENDPOINT_ERROR,
                recoverability: 'RETRYABLE',
                message: `Failed to get native balance for ${address}: ${errorMessage}`,
                cause: {
                    trace: {
                        operation: 'readNativeBalance',
                        address,
                        chain: chain.name,
                    },
                },
            });
        }
    }
    /**
     * Signs EIP-712 typed data using a generic, type-safe interface.
     *
     * This method accepts strongly-typed EIP-712 data from any standard and converts
     * it to viem's expected format for signing. This provides end-to-end type safety
     * from standard definitions through to framework implementation.
     *
     * @typeParam Types - The EIP-712 types definition for the standard being signed
     * @typeParam Message - The message structure for the standard being signed
     * @param typedData - The EIP-712 typed data to sign with full type safety
     * @param ctx - Operation context specifying the chain for signing (required)
     * @returns Promise resolving to the signature as a hex string
     * @throws Error when the wallet client is not available or signing fails
     * @throws Error when OperationContext resolution fails
     *
     * @example
     * ```typescript
     * import { Ethereum } from '@core/chains';
     *
     * // OperationContext is required - chain must be specified
     * const signature = await adapter.signTypedData(typedData, {
     *   chain: 'Base' // Chain specified in context
     * });
     * ```
     */
    async signTypedData(typedData, ctx) {
        // Validate the typedData structure
        assertTypedData(typedData);
        // Get chain from required OperationContext
        const resolvedContext = await resolveOperationContext(this, ctx);
        if (!resolvedContext) {
            throw new Error('OperationContext resolution failed. Ensure the adapter has capabilities configured.');
        }
        const targetChain = resolvedContext.chain;
        if (targetChain.type !== 'evm') {
            throw new Error(`Invalid chain type '${String(targetChain.type)}' for ViemAdapter. Expected 'evm' chain type.`);
        }
        const walletClient = await this.initializeWalletClient(targetChain);
        // For API-driven providers (developer-controlled), we need to create an account
        // that represents the resolved address. For user-controlled, use wallet's account.
        const account = walletClient.account;
        const effectiveAccount = this.capabilities?.addressContext === 'developer-controlled'
            ? {
                address: resolvedContext.address,
                type: 'json-rpc',
                // For API-driven providers, the actual signing is delegated to the transport
            }
            : account; // For user-controlled, use the wallet's natural account
        // Ensure we have an account to sign with
        if (!effectiveAccount) {
            throw new Error('No wallet is connected. Please connect a wallet to sign typed data.');
        }
        const { domain, types, primaryType, message } = typedData;
        const params = {
            account: effectiveAccount, // Use the effective account (resolves address for developer-controlled)
            domain,
            types,
            primaryType,
            message,
        };
        return walletClient.signTypedData(params);
    }
    /**
     * Reads a contract function using Viem v2.
     *
     * @typeParam TReturnType - The expected return type of the contract function.
     * @param params - The parameters for the contract function read.
     * @returns A promise that resolves to the result of the contract function read.
     *
     * @example
     * ```typescript
     * const result = await adapter.readContract<bigint>({
     *   address: '0x1234...',
     *   abi: erc20Abi,
     *   functionName: 'balanceOf',
     *   args: ['0x1234...'],
     * })
     * console.log(result) // 1000000n (for 1 USDC with 6 decimals) - properly typed as bigint
     * ```
     *
     * @param params - The parameters for the contract function read.
     * @returns A promise that resolves to the result of the contract function read.
     */
    async readContract(params, chain) {
        const publicClient = await this.getPublicClient(chain);
        return (await publicClient.readContract(params));
    }
}

/**
 * Creates a ViemAdapter instance from a private key with automatic type inference.
 *
 * This function creates a ViemAdapter for server-side or programmatic use
 * by deriving an account from the provided private key. It automatically
 * infers the adapter capabilities from the provided configuration, ensuring
 * type safety without requiring explicit generic type arguments.
 *
 * @param params - Configuration parameters for creating the adapter
 * @returns A configured ViemAdapter instance with automatically inferred capabilities
 * @throws Error when validation fails or account derivation fails
 *
 * @example
 * ```typescript
 * // Default adapter (user-controlled)
 * const defaultAdapter = createViemAdapterFromPrivateKey({
 *   privateKey: '0x...'
 * })
 *
 * const defaultAdapter1 = createViemAdapterFromPrivateKey({
 *   privateKey: '1234...abcd', // Without prefix
 * })
 *
 * // Developer-controlled adapter (requires addresses)
 * const devAdapter = createViemAdapterFromPrivateKey({
 *   privateKey: '0x...',
 *   capabilities: { addressContext: 'developer-controlled' }
 * })
 *
 * const devAdapter1 = createViemAdapterFromPrivateKey({
 *   privateKey: '1234...abcd', // Without prefix
 *   capabilities: { addressContext: 'developer-controlled' }
 * })
 *
 * // User-controlled adapter (addresses forbidden)
 * const userAdapter = createViemAdapterFromPrivateKey({
 *   privateKey: '0x...',
 *   capabilities: { addressContext: 'user-controlled' }
 * })
 *
 * const userAdapter1 = createViemAdapterFromPrivateKey({
 *   privateKey: '1234...abcd', // Without prefix
 *   capabilities: { addressContext: 'user-controlled' }
 * })
 *
 * // Custom RPC endpoints for both public and wallet clients
 * const customRpcAdapter = createViemAdapterFromPrivateKey({
 *   privateKey: '0x...',
 *   getPublicClient: ({ chain }) => createPublicClient({
 *     chain,
 *     transport: http('https://custom-rpc.example.com')
 *   }),
 *   getWalletClient: ({ chain, account }) => createWalletClient({
 *     chain,
 *     account,
 *     transport: http('https://custom-rpc.example.com')
 *   })
 * })
 * ```
 */
function createViemAdapterFromPrivateKey(params) {
    // Parse and validate input parameters at runtime (normalizes the private key by adding '0x' prefix if missing)
    const { privateKey } = createAdapterFromPrivateKeyParamsSchema.parse(params);
    // Derive account from private key
    // Explicit type annotation ensures type safety in both strict and non-strict TypeScript modes
    let account;
    try {
        account = privateKeyToAccount(privateKey, { nonceManager });
    }
    catch (error) {
        throw new Error(`Failed to derive account from private key: ${error instanceof Error ? error.message : String(error)}. ` + 'Please ensure the private key is a valid 32-byte hex string.');
    }
    // Resolve capabilities with smart defaults
    const resolvedCapabilities = createAdapterCapabilities('evm', params.capabilities);
    // Validate that capabilities are appropriate for private key adapters
    // This is essential for JavaScript consumers who don't get TypeScript compilation errors
    if (resolvedCapabilities.addressContext === 'developer-controlled') {
        throw new Error('Private key adapters cannot use "developer-controlled" address context. ' +
            'Private key adapters derive addresses from the private key and should use ' +
            '"user-controlled" address context instead. This prevents address mismatches ' +
            'and ensures the adapter operates with the correct account.');
    }
    // Create and return the ViemAdapter with chain-aware getter for lazy wallet client initialization
    return new ViemAdapter({
        getWalletClient: ({ chain, }) => {
            try {
                // Use custom getWalletClient if provided, passing chain and derived account
                if (params.getWalletClient) {
                    return params.getWalletClient({ chain, account });
                }
                // Default: create wallet client with derived account and default transport
                return createWalletClient({
                    transport: http(),
                    account,
                    chain,
                });
            }
            catch (error) {
                throw new Error(`Failed to create wallet client: ${error instanceof Error ? error.message : String(error)}. ` +
                    'Please ensure the chain configuration is valid.');
            }
        },
        getPublicClient: params.getPublicClient ?? getDefaultPublicClient(new Map()),
    }, resolvedCapabilities);
}
/**
 * @deprecated Use {@link createViemAdapterFromPrivateKey} instead
 *
 * Creates a ViemAdapter instance from a private key with automatic type inference.
 *
 * This function creates a ViemAdapter for server-side or programmatic use
 * by deriving an account from the provided private key. It automatically
 * infers the adapter capabilities from the provided configuration, ensuring
 * type safety without requiring explicit generic type arguments.
 *
 * @param params - Configuration parameters for creating the adapter
 * @returns A configured ViemAdapter instance with automatically inferred capabilities
 * @throws Error when validation fails or account derivation fails
 */
const createAdapterFromPrivateKey = createViemAdapterFromPrivateKey;

/**
 * Creates a ViemAdapter instance from an EIP1193-compatible provider with automatic type inference.
 *
 * This function creates a ViemAdapter by connecting to an EIP1193 provider
 * (such as MetaMask, WalletConnect, or other browser wallets). It uses lazy
 * account derivation and automatically infers the adapter capabilities from
 * the provided configuration, ensuring type safety without requiring explicit
 * generic type arguments.
 *
 * @param params - Configuration parameters for creating the adapter
 * @returns Promise resolving to a configured ViemAdapter instance with automatically inferred capabilities
 * @throws Error when validation fails or provider operations fail
 *
 * @example
 * ```typescript
 * // Developer-controlled adapter (requires addresses)
 * const devAdapter = await createViemAdapterFromProvider({
 *   provider: window.ethereum,
 *   capabilities: { addressContext: 'developer-controlled' }
 * })
 *
 * // User-controlled adapter (addresses forbidden)
 * const userAdapter = await createViemAdapterFromProvider({
 *   provider: window.ethereum,
 *   capabilities: { addressContext: 'user-controlled' }
 * })
 *
 * // Default adapter (user-controlled)
 * const defaultAdapter = await createViemAdapterFromProvider({
 *   provider: window.ethereum
 * })
 * ```
 */
async function createViemAdapterFromProvider(params) {
    // Validate input parameters at runtime
    validateCreateAdapterFromProviderParams(params);
    // Resolve capabilities with smart defaults
    const resolvedCapabilities = createAdapterCapabilities('evm', params.capabilities);
    // Account cached within closure scope for lazy initialization
    let cachedAccount = null;
    // Create and return the ViemAdapter with lazy account derivation
    const adapter = new ViemAdapter({
        getPublicClient: params.getPublicClient ?? getDefaultPublicClient(new Map()),
        getWalletClient: async (walletParams) => {
            // Lazy account derivation with caching - only on first call
            if (!cachedAccount) {
                const tempWalletClient = createWalletClient({
                    transport: custom(params.provider),
                });
                // Request account access from provider
                let addresses;
                try {
                    addresses = await tempWalletClient.requestAddresses();
                }
                catch (error) {
                    throw new Error(`Failed to request addresses from provider: ${error instanceof Error ? error.message : String(error)}. ` +
                        'Please ensure the provider is connected and the user has granted access to accounts.');
                }
                const [address] = addresses;
                if (!address) {
                    throw new Error('No address found in provider response. ' +
                        'Please ensure the wallet is connected and has at least one account available.');
                }
                // Cache the account for subsequent calls
                cachedAccount = { address, type: 'json-rpc' };
            }
            // Return wallet client with cached account for target chain
            // No chain switching here - let the adapter handle chain management
            return createWalletClient({
                account: cachedAccount,
                chain: walletParams.chain,
                transport: custom(params.provider),
            });
        },
    }, resolvedCapabilities);
    // Return with Promise.resolve to satisfy async signature and linter
    return await Promise.resolve(adapter);
}
/**
 * @deprecated Use {@link createViemAdapterFromProvider} instead
 *
 * Creates a ViemAdapter instance from an EIP1193-compatible provider with automatic type inference.
 *
 * This function creates a ViemAdapter by connecting to an EIP1193 provider
 * (such as MetaMask, WalletConnect, or other browser wallets). It uses lazy
 * account derivation and automatically infers the adapter capabilities from
 * the provided configuration, ensuring type safety without requiring explicit
 * generic type arguments.
 *
 * @param params - Configuration parameters for creating the adapter
 * @returns Promise resolving to a configured ViemAdapter instance with automatically inferred capabilities
 * @throws Error when validation fails or provider operations fail
 */
const createAdapterFromProvider = createViemAdapterFromProvider;

export { Blockchain, ViemAdapter, buildEIP2612TypedData, computeDefaultDeadline, createAdapterFromPrivateKey, createAdapterFromProvider, createViemAdapterFromPrivateKey, createViemAdapterFromProvider, parseSignature, resolveChainIdentifier };
//# sourceMappingURL=index.mjs.map
