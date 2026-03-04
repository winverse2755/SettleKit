'use client';

import Link from 'next/link';
import WalletButton from './WalletButton';
import { Layers } from 'lucide-react';

export default function SharedHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary">
              <Layers className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">SettleKit</h1>
              <p className="text-xs text-muted-foreground">Agentic Cross-Chain Settlement</p>
            </div>
          </Link>
          <WalletButton />
        </div>
      </div>
    </header>
  );
}
