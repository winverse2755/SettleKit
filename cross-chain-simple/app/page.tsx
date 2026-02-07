'use client';

import { useState } from 'react';
import WalletButton from './components/WalletButton';
import TransferFlow from './components/TransferFlow';
import { useWallet } from './hooks/useWallet';

export default function HomePage() {
  const { address, isConnected } = useWallet();

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #111827 0%, #000 50%, #111827 100%)',
      color: 'white',
    }}>
      {/* Header */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'rgba(31, 41, 55, 0.9)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #374151',
      }}>
        <div style={{
          maxWidth: '80rem',
          margin: '0 auto',
          padding: '1rem',
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'start',
            justifyContent: 'space-between',
            gap: '1rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{
                fontSize: '1.875rem',
                fontWeight: 'bold',
                background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                CrossChain Liquidity
              </div>
            </div>
            <WalletButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{
        maxWidth: '80rem',
        margin: '0 auto',
        padding: '2rem 1rem',
      }}>
        <TransferFlow
          walletAddress={address}
          isConnected={isConnected}
        />
      </main>
    </div>
  );
}