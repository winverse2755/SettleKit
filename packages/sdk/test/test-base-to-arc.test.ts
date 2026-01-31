import {
    createPublicClient,
    createWalletClient,
    http,
    parseUnits,
    keccak256,
    decodeEventLog,
    encodeFunctionData,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import fetch from 'node-fetch';
import 'dotenv/config';

// -------------------- ENV --------------------
const {
    BASE_RPC,
    ARC_RPC,
    PRIVATE_KEY,
    USDC_BASE,
    TOKEN_MESSENGER_BASE,
    MESSAGE_TRANSMITTER_ARC,
    ARC_DOMAIN,
    // CIRCLE_API_KEY
} = process.env as Record<string, string>;

// -------------------- HELPERS --------------------
function asHex(value: string): `0x${string}` {
    if (!value.startsWith('0x')) throw new Error(`Invalid hex string: ${value}`);
    return value as `0x${string}`;
}

async function waitForAttestation(message: `0x${string}`): Promise<`0x${string}`> {
    const hash = keccak256(message);
    console.log('⏳ Waiting attestation from Circle...', hash);

    while (true) {
        try {
            const res = await fetch(
                `https://iris-api-sandbox.circle.com/attestations/${hash}`
            );

            if (!res.ok) {
                console.log(`⚠️ API responde con status: ${res.status}. Reintentando...`);
                await new Promise(r => setTimeout(r, 10000));
                continue;
            }

            const json = (await res.json()) as {
                status: 'pending' | 'complete';
                attestation?: string;
            };

            if (json.status === 'complete' && json.attestation) {
                console.log('✅ Attestation received');
                return asHex(json.attestation);
            }

            // Logs every 30s. while waiting confirmation.
            console.log(`Status: ${json.status}... (esperando 30s)`);

        } catch (error) {
            console.error('❌ Error en el fetch de attestation:', error);
        }

        await new Promise(r => setTimeout(r, 30000));
    }
}

// -------------------- ABIS INLINE --------------------
const TOKEN_MESSENGER_ABI = [
    {
        name: 'depositForBurn',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'amount', type: 'uint256' },
            { name: 'destinationDomain', type: 'uint32' },
            { name: 'mintRecipient', type: 'bytes32' },
            { name: 'burnToken', type: 'address' }
        ],
        outputs: [{ name: 'nonce', type: 'uint64' }]
    },
    {
        type: 'event',
        name: 'MessageSent',
        inputs: [
            { indexed: false, name: 'message', type: 'bytes' }
        ]
    }
] as const;

const MESSAGE_TRANSMITTER_ABI = [
    {
        name: 'receiveMessage',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'message', type: 'bytes' },
            { name: 'attestation', type: 'bytes' }
        ],
        outputs: []
    }
] as const;

const ERC20_ABI = [
    {
        name: 'approve',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'spender', type: 'address' },
            { name: 'amount', type: 'uint256' }
        ],
        outputs: [{ name: '', type: 'bool' }]
    },
    {
        name: 'balanceOf',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'account', type: 'address' }],
        outputs: [{ name: '', type: 'uint256' }]
    },
    {
        name: 'decimals',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'uint8' }]
    }
] as const;

// -------------------- CHAIN CONFIGS --------------------
const BASE_CHAIN = {
    id: 84532,
    name: 'Base Testnet',
    network: 'base-testnet',
    nativeCurrency: {
        decimals: 18,
        name: 'Ethereum',
        symbol: 'ETH',
    },
    rpcUrls: {
        default: {
            http: [BASE_RPC],
        },
    },
} as const;

const ARC_CHAIN = {
    id: 5042002,
    name: 'Arc Testnet',
    network: 'arc-testnet',
    nativeCurrency: {
        decimals: 18,
        name: 'Ethereum',
        symbol: 'ETH',
    },
    rpcUrls: {
        default: {
            http: [ARC_RPC],
        },
    },
} as const;

// -------------------- CLIENTS --------------------
const account = privateKeyToAccount(asHex(PRIVATE_KEY));

// Public clients
const baseClient = createPublicClient({
    chain: BASE_CHAIN,
    transport: http()
});

const arcClient = createPublicClient({
    chain: ARC_CHAIN,
    transport: http()
});

// Wallet clients
const baseWallet = createWalletClient({
    account,
    chain: BASE_CHAIN,
    transport: http()
});

const arcWallet = createWalletClient({
    account,
    chain: ARC_CHAIN,
    transport: http()
});

// -------------------- FUNCIONES AUXILIARES --------------------
async function checkBalance(): Promise<void> {
    console.log('💰 Checking balances...');

    // Check USDC balance
    const usdcBalance = await baseClient.readContract({
        address: asHex(USDC_BASE),
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [account.address]
    });

    const decimals = await baseClient.readContract({
        address: asHex(USDC_BASE),
        abi: ERC20_ABI,
        functionName: 'decimals',
        args: []
    });

    // Convertir bigint a number para la división
    const usdcAmount = Number(usdcBalance) / Math.pow(10, Number(decimals));
    console.log(`USDC Balance: ${usdcAmount} USDC`);

    // Check ETH balance for gas
    const ethBalance = await baseClient.getBalance({ address: account.address });
    const ethAmount = Number(ethBalance) / 1e18;
    console.log(`ETH Balance: ${ethAmount} ETH`);
}

async function approveUSDC(amount: bigint): Promise<void> {
    console.log('🔐 Approving USDC for TokenMessenger...');

    const approveData = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [asHex(TOKEN_MESSENGER_BASE), amount]
    });

    const approveHash = await baseWallet.sendTransaction({
        to: asHex(USDC_BASE),
        data: approveData,
    });

    console.log('Approval tx hash:', approveHash);

    // Wait for confirmation
    await baseClient.waitForTransactionReceipt({ hash: approveHash });
    console.log('✅ USDC approved successfully');
}

async function main() {
    try {
        // 1. Check balances first
        await checkBalance();

        const amount = parseUnits('1', 6); // 1 USDC (6 decimals)
        console.log(`📊 Amount to transfer: ${amount.toString()} (${Number(amount) / 1e6} USDC)`);

        // 2. Approve USDC spending
        await approveUSDC(amount);

        console.log('🔥 Burning USDC on Base...');

        // 3. Encode the burn tx
        const mintRecipientBytes = `0x${account.address.slice(2).padStart(64, '0')}`;

        console.log('Mint recipient (bytes32):', mintRecipientBytes);
        console.log('Destination domain:', ARC_DOMAIN);
        console.log('Burn token:', USDC_BASE);

        const burnTxData = encodeFunctionData({
            abi: TOKEN_MESSENGER_ABI,
            functionName: 'depositForBurn',
            args: [
                amount,
                Number(ARC_DOMAIN),
                mintRecipientBytes as `0x${string}`,
                asHex(USDC_BASE)
            ]
        });

        console.log('Transaction data:', burnTxData);

        // 4. Estimate gas first
        try {
            const gasEstimate = await baseClient.estimateGas({
                account: account.address,
                to: asHex(TOKEN_MESSENGER_BASE),
                data: burnTxData,
            });
            console.log(`Estimated gas: ${gasEstimate.toString()}`);
        } catch (error: any) {
            console.error('❌ Gas estimation failed:', error.shortMessage || error.message);
            // Continue anyway, might be estimation issue
        }

        // 5. Send burn transaction
        const burnTxHash = await baseWallet.sendTransaction({
            to: asHex(TOKEN_MESSENGER_BASE),
            data: burnTxData,
            // Optional: set gas limit if estimation fails
            // gas: 300000n,
        });

        console.log('Base burn tx hash:', burnTxHash);

        // 6. Wait for receipt
        const receipt = await baseClient.waitForTransactionReceipt({ hash: burnTxHash });
        console.log('✅ Burn transaction confirmed. Status:', receipt.status);

        if (receipt.status !== 'success') {
            throw new Error('Burn transaction failed');
        }

        // 7. Extract message from logs
        let messageBytes: `0x${string}` | undefined;
        for (const log of receipt.logs) {
            try {
                const decoded = decodeEventLog({
                    abi: TOKEN_MESSENGER_ABI,
                    data: log.data,
                    topics: log.topics
                });
                if (decoded.eventName === 'MessageSent') {
                    messageBytes = decoded.args.message;
                    console.log('Found MessageSent event');
                    break;
                }
            } catch (e) {
                // void
            }
        }

        if (!messageBytes) {
            console.log('No MessageSent event found. Checking all logs:');
            receipt.logs.forEach((log, i) => {
                console.log(`Log ${i}: address=${log.address}, topics=${log.topics}, data=${log.data}`);
            });
            throw new Error('MessageSent event not found');
        }

        const messageHash = keccak256(messageBytes);
        console.log('📨 Message bytes extracted. Hash:', messageHash);

        // 8. Wait for Circle attestation
        const attestation = await waitForAttestation(messageBytes);

        console.log('🪙 Minting USDC on Arc...');

        // 9. Encode mint tx
        const mintTxData = encodeFunctionData({
            abi: MESSAGE_TRANSMITTER_ABI,
            functionName: 'receiveMessage',
            args: [messageBytes, attestation]
        });

        // 10. Send mint transaction
        const mintTxHash = await arcWallet.sendTransaction({
            to: asHex(MESSAGE_TRANSMITTER_ARC),
            data: mintTxData,
        });

        // 11. Wait for receipt
        const mintReceipt = await arcClient.waitForTransactionReceipt({ hash: mintTxHash });
        console.log('✅ Mint transaction confirmed. Status:', mintReceipt.status);

        console.log('🎉 USDC Transfer COMPLETE!');
        console.log({
            baseBurnTx: burnTxHash,
            messageHash: messageHash,
            arcMintTx: mintTxHash
        });

    } catch (error: any) {
        console.error('❌ Error:', error.message);
        console.error('Stack:', error.stack);

        // Additional debug info
        if (error.cause) {
            console.error('Caused by:', error.cause.message);
        }

        process.exit(1);
    }
}

main();