'use client';

import { useWallet } from '@/app/hooks/useWallet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Wallet, ChevronDown, ExternalLink, LogOut, Network } from 'lucide-react';
import { useState } from 'react';

export default function WalletButton() {
    const {
        address,
        isConnected,
        balance,
        chainName,
        chainId,
        provider,
        connectWallet,
        disconnectWallet,
        switchChain,
        supportedChains,
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
        return <Wallet className="h-4 w-4" />;
    };

    if (!isWalletAvailable) {
        return (
            <>
                <Button onClick={() => setShowModal(true)} size="lg">
                    <Wallet className="mr-2 h-4 w-4" />
                    Connect Wallet
                </Button>

                <Dialog open={showModal} onOpenChange={setShowModal}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Connect Wallet</DialogTitle>
                            <DialogDescription>
                                You need a Web3 wallet to use this application
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-3">
                            <a
                                href="https://metamask.io/download/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 p-4 rounded-lg border border-border hover:bg-accent transition-colors"
                            >
                                <span className="text-3xl">🦊</span>
                                <div className="flex-1">
                                    <div className="font-semibold">MetaMask</div>
                                    <div className="text-sm text-muted-foreground">Desktop & Mobile</div>
                                </div>
                                <ExternalLink className="h-4 w-4 text-muted-foreground" />
                            </a>
                            <a
                                href="https://www.coinbase.com/wallet/downloads"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 p-4 rounded-lg border border-border hover:bg-accent transition-colors"
                            >
                                <span className="text-3xl">⚡</span>
                                <div className="flex-1">
                                    <div className="font-semibold">Coinbase Wallet</div>
                                    <div className="text-sm text-muted-foreground">All platforms</div>
                                </div>
                                <ExternalLink className="h-4 w-4 text-muted-foreground" />
                            </a>
                        </div>
                    </DialogContent>
                </Dialog>
            </>
        );
    }

    if (!isConnected) {
        return (
            <Button onClick={connectWallet} size="lg">
                <Wallet className="mr-2 h-4 w-4" />
                Connect Wallet
            </Button>
        );
    }

    return (
        <div className="flex items-center gap-3">
            <div className="hidden md:block text-right">
                <div className="text-xs text-muted-foreground">{chainName}</div>
                <div className="text-sm font-semibold">{balance} ETH</div>
            </div>

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="gap-2">
                        <span className="text-base">{getProviderIcon()}</span>
                        <span className="font-mono">{formatAddress(address!)}</span>
                        <Badge variant="success" className="ml-1 h-2 w-2 p-0 rounded-full" />
                        <ChevronDown className="h-4 w-4 opacity-50" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>Connected Wallet</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <div className="px-2 py-2 space-y-2">
                        <div>
                            <div className="text-xs text-muted-foreground">Address</div>
                            <div className="font-mono text-sm">{formatAddress(address!)}</div>
                        </div>
                        <div>
                            <div className="text-xs text-muted-foreground">Network</div>
                            <div className="text-sm">{chainName}</div>
                        </div>
                        <div>
                            <div className="text-xs text-muted-foreground">Balance</div>
                            <div className="text-sm font-semibold">{balance} ETH</div>
                        </div>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuSub>
                        <DropdownMenuSubTrigger>
                            <Network className="mr-2 h-4 w-4" />
                            Switch Network
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent>
                            {supportedChains.map((chain) => (
                                <DropdownMenuItem
                                    key={chain.chainIdHex}
                                    onClick={() => switchChain(chain.chainIdHex)}
                                    disabled={chainId === chain.chainId}
                                >
                                    {chain.name}
                                    {chainId === chain.chainId && ' ✓'}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuSubContent>
                    </DropdownMenuSub>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        onClick={disconnectWallet}
                        className="text-destructive focus:text-destructive"
                    >
                        <LogOut className="mr-2 h-4 w-4" />
                        Disconnect Wallet
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}
