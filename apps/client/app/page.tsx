'use client';

import Link from 'next/link';
import SharedHeader from './components/SharedHeader';
import SharedFooter from './components/SharedFooter';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, Shield, Zap, Lock, BarChart3, Layers, Globe2, CheckCircle2 } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background dark">
      <SharedHeader />

      {/* Hero Section */}
      <section className="border-b">
        <div className="container mx-auto px-4 lg:px-8 py-20 lg:py-28">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <Badge variant="secondary" className="mb-4">
              Powered by CRE & CCTP
            </Badge>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
              Cross-Chain Settlement
              <br />
              <span className="text-muted-foreground">Made Simple</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Automated USDC deposits across DeFi pools and vaults with intelligent risk assessment
              and monitoring.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Button size="lg" className="text-base" asChild>
                <Link href="/settlements">
                  Risk Report
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="text-base" asChild>
                <a href="https://github.com/winverse2755/SettleKit/tree/main" target="_blank" rel="noopener noreferrer">
                  View Documentation
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="border-t bg-secondary/30 py-20">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Choose SettleKit</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Enterprise-grade features designed for professional DeFi operations
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {[
              {
                icon: Shield,
                title: 'Risk Management',
                desc: 'Advanced AI-powered risk assessment with real-time metrics and automated decision making'
              },
              {
                icon: Zap,
                title: 'Lightning Fast',
                desc: 'Optimized cross-chain transfers with minimal latency and maximum throughput'
              },
              {
                icon: Lock,
                title: 'Secure by Design',
                desc: 'Battle-tested smart contracts with comprehensive security audits and insurance coverage'
              },
              {
                icon: BarChart3,
                title: 'Real-Time Analytics',
                desc: 'Comprehensive dashboards with detailed metrics, logs, and performance insights'
              },
              {
                icon: Globe2,
                title: 'Multi-Chain Support',
                desc: 'Seamless integration across Base, Arc, and Unichain with more chains coming soon'
              },
              {
                icon: CheckCircle2,
                title: 'Automated Execution',
                desc: 'Set it and forget it - intelligent automation handles the entire liquidity provision flow'
              },
            ].map((feature, idx) => (
              <Card key={idx} className="border-border hover:border-primary/50 transition-colors">
                <CardContent className="pt-6">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="border-t py-20">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-lg text-muted-foreground">Simple, secure, and automated</p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="space-y-8">
              {[
                {
                  step: '01',
                  title: 'Connect Your Wallet',
                  desc: 'Connect your Web3 wallet and select your source chain'
                },
                {
                  step: '02',
                  title: 'Configure Parameters',
                  desc: 'Set transfer amount, risk tolerance, and execution preferences'
                },
                {
                  step: '03',
                  title: 'AI Risk Assessment',
                  desc: 'Our AI analyzes market conditions and provides risk recommendations'
                },
                {
                  step: '04',
                  title: 'Automated Execution',
                  desc: 'Funds are bridged via CCTP and liquidity is automatically provided'
                },
              ].map((step, idx) => (
                <div key={idx} className="flex gap-6 items-start">
                  <div className="flex-shrink-0 w-16 h-16 rounded-lg bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold">
                    {step.step}
                  </div>
                  <div className="flex-1 pt-2">
                    <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                    <p className="text-muted-foreground">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t bg-secondary/30 py-20">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h2 className="text-3xl md:text-5xl font-bold">
              Ready to Get Started?
            </h2>
            <p className="text-xl text-muted-foreground">
              Join users leveraging SettleKit for cross-chain liquidity
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Button size="lg" className="text-base" asChild>
                <Link href="/settlements">
                  Monitor Status
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="text-base" asChild>
                <a href="mailto:winverse2755@gmail.com">Contact</a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <SharedFooter />
    </div>
  );
}
