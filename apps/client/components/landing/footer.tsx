'use client';

import Link from 'next/link';
import { Layers, Twitter, MessageCircle, Github } from 'lucide-react';

const PRODUCT_LINKS = [
  { href: '#features', label: 'Features' },
  { href: 'https://github.com/winverse2755/SettleKit/tree/main', label: 'Docs', external: true },
  { href: '/settlements', label: 'Status' },
];

const COMPANY_LINKS = [
  { href: '#', label: 'About' },
  { href: 'mailto:winverse2755@gmail.com', label: 'Contact', external: true },
];

const LEGAL_LINKS = [
  { href: '#', label: 'Terms' },
  { href: '#', label: 'Privacy' },
];

const SOCIAL = [
  { href: 'https://twitter.com', icon: Twitter, label: 'Twitter' },
  { href: 'https://discord.com', icon: MessageCircle, label: 'Discord' },
  { href: 'https://github.com/winverse2755/SettleKit', icon: Github, label: 'GitHub' },
];

function LinkItem({
  href,
  label,
  external,
}: {
  href: string;
  label: string;
  external?: boolean;
}) {
  const className = 'text-sm text-muted-foreground hover:text-foreground transition-colors';
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {label}
      </a>
    );
  }
  return (
    <Link href={href} className={className}>
      {label}
    </Link>
  );
}

export function Footer() {
  return (
    <footer className="bg-[#080612] border-t border-border/50 py-16">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary">
              <Layers className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-foreground">SettleKit</span>
          </Link>

          <div className="flex flex-wrap justify-center gap-x-12 gap-y-4">
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">
                Product
              </p>
              {PRODUCT_LINKS.map((link) => (
                <LinkItem key={link.label} href={link.href} label={link.label} external={link.external} />
              ))}
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">
                Company
              </p>
              {COMPANY_LINKS.map((link) => (
                <LinkItem key={link.label} href={link.href} label={link.label} external={link.external} />
              ))}
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">
                Legal
              </p>
              {LEGAL_LINKS.map((link) => (
                <LinkItem key={link.label} href={link.href} label={link.label} />
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {SOCIAL.map(({ href, icon: Icon, label }) => (
              <a
                key={href}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label={label}
              >
                <Icon className="h-5 w-5" />
              </a>
            ))}
          </div>
        </div>

        <p className="mt-12 text-center text-sm text-foreground-faint">
          © 2026 SettleKit. Built with CRE & CCTP.
        </p>
      </div>
    </footer>
  );
}
