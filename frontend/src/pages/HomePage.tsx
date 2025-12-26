import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LockIcon, RobotIcon, LightningIcon, ChartIcon } from '../components/icons';

export default function HomePage() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="home-page">
      <section className="hero">
        <h1>Mosaic</h1>
        <p className="tagline">Anonymous feedback with AI-powered insights</p>
        <p className="description">
          Collect honest, anonymous feedback from your team or community,
          then unlock powerful insights with AI-driven analysis.
        </p>
        <div className="cta-buttons">
          {isAuthenticated ? (
            <Link to="/dashboard" className="btn btn-primary btn-large">
              Go to Dashboard
            </Link>
          ) : (
            <>
              <Link to="/register" className="btn btn-primary btn-large">
                Get Started
              </Link>
              <Link to="/login" className="btn btn-secondary btn-large">
                Login
              </Link>
            </>
          )}
        </div>
      </section>

      <section className="features">
        <h2>Key Features</h2>
        <div className="feature-grid">
          <div className="feature-card">
            <h3>
              <LockIcon size={20} className="feature-icon" />
              Three Anonymity Levels
            </h3>
            <p>
              Choose from fully anonymous, platform-tracked, or revealable responses
              based on your needs.
            </p>
          </div>
          <div className="feature-card">
            <h3>
              <RobotIcon size={20} className="feature-icon" />
              AI-Powered Analysis
            </h3>
            <p>
              Automatically cluster similar responses and extract themes using advanced
              machine learning and LLMs.
            </p>
          </div>
          <div className="feature-card">
            <h3>
              <LightningIcon size={20} className="feature-icon" />
              Real-Time Collection
            </h3>
            <p>
              Share invite codes and collect responses instantly with flexible time
              windows.
            </p>
          </div>
          <div className="feature-card">
            <h3>
              <ChartIcon size={20} className="feature-icon" />
              Rich Insights
            </h3>
            <p>
              Get comprehensive summaries, sentiment analysis, and actionable themes
              from your feedback.
            </p>
          </div>
        </div>
      </section>

      <footer className="home-footer">
        <div className="footer-content">
          <Link to="/terms">Terms of Service</Link>
          <span className="footer-separator">•</span>
          <Link to="/privacy">Privacy Policy</Link>
        </div>
      </footer>
    </div>
  );
}
