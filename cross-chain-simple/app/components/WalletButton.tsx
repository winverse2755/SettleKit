'use client';

import { useWallet } from '@/app/hooks/useWallet';
import { Button, Dropdown, Badge, Modal } from 'react-bootstrap';
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

    const [showModal, setShowModal] = useState(false);

    const formatAddress = (addr: string) => {
        return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    };

    const handleConnect = async () => {
        await connectWallet();
        setShowModal(false);
    };

    const getProviderIcon = () => {
        if (provider === 'MetaMask') return '🦊';
        if (provider === 'Coinbase Wallet') return '⚡';
        return '👛';
    };

    if (!isWalletAvailable) {
        return (
            <>
                <Button
                    variant="primary"
                    onClick={() => setShowModal(true)}
                    className="px-4 py-2"
                >
                    Install Wallet
                </Button>

                <Modal show={showModal} onHide={() => setShowModal(false)} centered>
                    <Modal.Header closeButton className="bg-dark border-secondary">
                        <Modal.Title>Install Wallet</Modal.Title>
                    </Modal.Header>
                    <Modal.Body className="bg-dark">
                        <p className="text-muted mb-3">
                            You need a Web3 wallet to use this application
                        </p>
                        <div className="d-grid gap-2">
                            <a
                                href="https://metamask.io/download/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-outline-primary d-flex align-items-center justify-content-center gap-2 py-3"
                            >
                                <span className="fs-4">🦊</span>
                                <div className="text-start">
                                    <div className="fw-bold">MetaMask</div>
                                    <small className="text-muted">Desktop & Mobile</small>
                                </div>
                            </a>
                            <a
                                href="https://www.coinbase.com/wallet/downloads"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-outline-primary d-flex align-items-center justify-content-center gap-2 py-3"
                            >
                                <span className="fs-4">⚡</span>
                                <div className="text-start">
                                    <div className="fw-bold">Coinbase Wallet</div>
                                    <small className="text-muted">All platforms</small>
                                </div>
                            </a>
                        </div>
                    </Modal.Body>
                </Modal>
            </>
        );
    }

    if (!isConnected) {
        return (
            <Button
                variant="primary"
                onClick={connectWallet}
                className="px-4 py-2"
            >
                Connect Wallet
            </Button>
        );
    }

    return (
        <div className="d-flex align-items-center gap-3">
            {/* Network & Balance - Solo desktop */}
            <div className="d-none d-md-block text-end">
                <div className="text-muted small">{chainName}</div>
                <div className="fw-bold">{balance} ETH</div>
            </div>

            {/* Wallet Address */}
            <Dropdown>
                <Dropdown.Toggle variant="dark" className="d-flex align-items-center gap-2">
                    <span>{getProviderIcon()}</span>
                    <span className="fw-medium">{formatAddress(address!)}</span>
                    <Badge bg="success" className="ms-1">•</Badge>
                </Dropdown.Toggle>

                <Dropdown.Menu className="bg-dark border-secondary">
                    <Dropdown.Header className="text-muted">Connected Wallet</Dropdown.Header>
                    <Dropdown.ItemText className="text-white">
                        <div className="small text-muted">Address</div>
                        <div className="font-monospace">{address}</div>
                    </Dropdown.ItemText>
                    <Dropdown.ItemText className="text-white">
                        <div className="small text-muted">Network</div>
                        <div>{chainName}</div>
                    </Dropdown.ItemText>
                    <Dropdown.ItemText className="text-white">
                        <div className="small text-muted">Balance</div>
                        <div>{balance} ETH</div>
                    </Dropdown.ItemText>
                    <Dropdown.Divider className="border-secondary" />
                    <Dropdown.Item
                        onClick={disconnectWallet}
                        className="text-danger"
                    >
                        Disconnect Wallet
                    </Dropdown.Item>
                </Dropdown.Menu>
            </Dropdown>
        </div>
    );
}