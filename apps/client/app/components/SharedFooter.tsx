'use client';

import Link from 'next/link';
import { Layers } from 'lucide-react';

export default function SharedFooter() {
  return (
    <footer className="border-t py-12">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary">
              <Layers className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold">SettleKit</span>
          </Link>
          <div className="text-sm text-muted-foreground">
            © 2026 SettleKit. Built with CRE & CCTP.
          </div>
        </div>
      </div>
    </footer>
  );
}
