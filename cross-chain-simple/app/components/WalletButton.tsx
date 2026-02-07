'use client';

import { useWallet } from '@/app/hooks/useWallet';
import { useState } from 'react';

export default function WalletButton() {
    const {
        address,
        isConnected,
        balance,
        chainName,
        provider,
        connectWallet,
        disconnectWallet,
        isWalletAvailable
    } = useWallet();

    const [showProviderMenu, setShowProviderMenu] = useState(false);

    const formatAddress = (addr: string) => {
        return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    };

    const handleConnect = async () => {
        await connectWallet();
        setShowProviderMenu(false);
    };

    // Estilos inline
    const styles = {
        button: {
            padding: '0.75rem 1.5rem',
            background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '0.5rem',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
        } as React.CSSProperties,
        buttonHover: {
            background: 'linear-gradient(135deg, #4338ca 0%, #6d28d9 100%)',
        },
        walletInfo: {
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
        } as React.CSSProperties,
        addressBadge: {
            background: '#1f2937',
            padding: '0.5rem 1rem',
            borderRadius: '0.5rem',
        } as React.CSSProperties,
        disconnectButton: {
            padding: '0.5rem 1rem',
            background: '#dc2626',
            color: 'white',
            border: 'none',
            borderRadius: '0.5rem',
            cursor: 'pointer',
        } as React.CSSProperties,
        menu: {
            position: 'absolute' as const,
            right: 0,
            top: '100%',
            marginTop: '0.5rem',
            width: '16rem',
            background: '#1f2937',
            border: '1px solid #374151',
            borderRadius: '0.5rem',
            boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
            zIndex: 50,
        } as React.CSSProperties,
    };

    if (!isWalletAvailable) {
        return (
            <div style={{ position: 'relative' }}>
                <button
                    onClick={() => setShowProviderMenu(!showProviderMenu)}
                    style={styles.button}
                    onMouseEnter={(e) => Object.assign(e.currentTarget.style, styles.buttonHover)}
                    onMouseLeave={(e) => Object.assign(e.currentTarget.style, styles.button)}
                >
                    Install Wallet
                </button>

                {showProviderMenu && (
                    <>
                        <div
                            style={{
                                position: 'fixed',
                                inset: 0,
                                zIndex: 40,
                            }}
                            onClick={() => setShowProviderMenu(false)}
                        />
                        <div style={styles.menu}>
                            <div style={{ padding: '1rem' }}>
                                <h3 style={{ fontWeight: '500', color: 'white', marginBottom: '0.5rem' }}>
                                    Choose a Wallet
                                </h3>
                                <p style={{ fontSize: '0.875rem', color: '#9ca3af', marginBottom: '1rem' }}>
                                    You need to install a wallet to continue
                                </p>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <a
                                        href="https://metamask.io/download/"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.75rem',
                                            padding: '0.75rem',
                                            borderRadius: '0.5rem',
                                            color: 'white',
                                            textDecoration: 'none',
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = '#374151'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <div style={{
                                            width: '2rem',
                                            height: '2rem',
                                            background: '#f97316',
                                            borderRadius: '0.5rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}>
                                            <span style={{ fontSize: '0.875rem', fontWeight: 'bold' }}>🦊</span>
                                        </div>
                                        <div style={{ textAlign: 'left' }}>
                                            <div style={{ fontWeight: '500', color: 'white' }}>MetaMask</div>
                                            <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Desktop & Mobile</div>
                                        </div>
                                    </a>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        );
    }

    if (!isConnected) {
        return (
            <button
                onClick={handleConnect}
                style={styles.button}
                onMouseEnter={(e) => Object.assign(e.currentTarget.style, styles.buttonHover)}
                onMouseLeave={(e) => Object.assign(e.currentTarget.style, styles.button)}
            >
                Connect Wallet
            </button>
        );
    }

    return (
        <div style={styles.walletInfo}>
            <div style={{ textAlign: 'right', display: 'none' }}>
                <div style={{ fontSize: '0.875rem', color: '#9ca3af' }}>{chainName}</div>
                <div style={{ fontWeight: '500' }}>{balance} ETH</div>
            </div>

            <div style={styles.addressBadge}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {provider === 'MetaMask' && (
                        <span style={{ color: '#f97316' }} title="MetaMask">🦊</span>
                    )}
                    <span style={{ fontWeight: '500' }}>{formatAddress(address!)}</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{provider}</div>
            </div>

            <button
                onClick={disconnectWallet}
                style={styles.disconnectButton}
                onMouseEnter={(e) => e.currentTarget.style.background = '#b91c1c'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#dc2626'}
                title="Disconnect"
            >
                Disconnect
            </button>
        </div>
    );
}