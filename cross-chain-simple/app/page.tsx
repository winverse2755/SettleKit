'use client';

import { Container, Row, Col, Card, Alert, Badge } from 'react-bootstrap';
import WalletButton from './components/WalletButton';
import TransferFlow from './components/TransferFlow';
import { useWallet } from './hooks/useWallet';

export default function HomePage() {
  const { address, isConnected } = useWallet();

  return (
    <div className="bg-dark text-white min-vh-100">
      {/* Header */}
      <nav className="navbar navbar-dark bg-dark border-bottom border-secondary sticky-top">
        <Container fluid="xl">
          <div className="d-flex justify-content-between align-items-center w-100">
            <div className="d-flex align-items-center">
              <span className="navbar-brand mb-0 h1 text-gradient">
                CrossChain Liquidity
              </span>
              <Badge bg="primary" className="ms-2">v1.0</Badge>
            </div>
            <WalletButton />
          </div>
        </Container>
      </nav>

      {/* Main Content */}
      <Container fluid="xl" className="py-4">
        {/* Hero Section */}
        <Row className="mb-5 text-center">
          <Col>
            <h1 className="display-4 fw-bold mb-3 text-gradient">
              Cross-Chain Liquidity Orchestration
            </h1>
            <p className="lead text-muted">
              Automated cross-chain USDC transfer via CCTP with intelligent risk assessment
              and Uniswap v4 liquidity provision.
            </p>
          </Col>
        </Row>

        {/* Main Flow */}
        <Row className="mb-5">
          <Col>
            <TransferFlow
              walletAddress={address}
              isConnected={isConnected}
            />
          </Col>
        </Row>

        {/* Info Section */}
        <Row>
          <Col>
            <Card className="bg-dark border-secondary">
              <Card.Body>
                <Card.Title className="h4 mb-4">Flow Overview</Card.Title>
                <Row>
                  {[
                    { icon: '🔗', title: 'Connect Wallet', desc: 'Connect your Web3 wallet' },
                    { icon: '⚙️', title: 'Configure Transfer', desc: 'Set amount and risk parameters' },
                    { icon: '🌉', title: 'CCTP Bridge', desc: 'Base → Arc → Unichain via CCTP' },
                    { icon: '💧', title: 'Auto Liquidity', desc: 'Add to Uniswap v4 pool' },
                  ].map((step, idx) => (
                    <Col md={3} key={idx} className="text-center mb-3">
                      <div className="display-4 mb-2">{step.icon}</div>
                      <h5 className="h5">{step.title}</h5>
                      <p className="text-muted small">{step.desc}</p>
                    </Col>
                  ))}
                </Row>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>

      {/* Footer */}
      <footer className="mt-5 py-3 border-top border-secondary">
        <Container fluid="xl" className="text-center text-muted">
          <small>Built for Hackathon • Powered by CCTP & Uniswap v4</small>
        </Container>
      </footer>

      <style jsx>{`
        .text-gradient {
          background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        .navbar-brand {
          font-size: 1.8rem;
        }
      `}</style>
    </div>
  );
}