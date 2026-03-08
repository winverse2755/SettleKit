'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Layers, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import WalletButton from '@/app/components/WalletButton';

const NAV_LINKS = [
  { href: '#features', label: 'Features' },
  { href: '#how-it-works', label: 'How It Works' },
  { href: 'https://github.com/winverse2755/SettleKit/tree/main', label: 'Docs', external: true },
  { href: '/settlements', label: 'Status' },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  return (
    <header
      className={cn(
        'sticky top-0 z-50 w-full h-[72px] transition-[background,backdrop-filter] duration-300',
        scrolled
          ? 'bg-[rgba(13,11,26,0.8)] backdrop-blur-[16px] border-b border-border/50'
          : 'bg-transparent border-b border-transparent'
      )}
    >
      <div className="container mx-auto px-4 lg:px-8 h-full">
        <div className="flex h-full items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-3 hover:opacity-90 transition-opacity"
          >
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary">
              <Layers className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">SettleKit</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">
                Agentic Cross-Chain Settlement
              </p>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) =>
              link.external ? (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 text-sm font-medium text-foreground/90 hover:text-foreground transition-colors relative after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2 after:h-0.5 after:bg-primary after:scale-x-0 hover:after:scale-x-100 after:origin-center after:transition-transform after:duration-200"
                >
                  {link.label}
                </a>
              ) : (
                <Link
                  key={link.label}
                  href={link.href}
                  className="px-4 py-2 text-sm font-medium text-foreground/90 hover:text-foreground transition-colors relative after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2 after:h-0.5 after:bg-primary after:scale-x-0 hover:after:scale-x-100 after:origin-center after:transition-transform after:duration-200"
                  onClick={closeMobile}
                >
                  {link.label}
                </Link>
              )
            )}
          </nav>

          <div className="flex items-center gap-3">
            <WalletButton />
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileOpen((o) => !o)}
              aria-label="Toggle menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden absolute top-[72px] left-0 right-0 bg-background/95 backdrop-blur-xl border-b border-border py-4 px-4 flex flex-col gap-1">
          {NAV_LINKS.map((link) =>
            link.external ? (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-3 rounded-lg text-sm font-medium hover:bg-muted transition-colors"
                onClick={closeMobile}
              >
                {link.label}
              </a>
            ) : (
              <Link
                key={link.label}
                href={link.href}
                className="px-4 py-3 rounded-lg text-sm font-medium hover:bg-muted transition-colors"
                onClick={closeMobile}
              >
                {link.label}
              </Link>
            )
          )}
        </div>
      )}
    </header>
  );
}
