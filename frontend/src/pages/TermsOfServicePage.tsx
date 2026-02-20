import { Link } from 'react-router-dom';
import { usePageTitle } from '../hooks/usePageTitle';

export default function TermsOfServicePage() {
  usePageTitle('Terms of Service');

  return (
    <div className="legal-page">
      <div className="legal-container">
        <Link to="/" className="btn-back">
          ← Back to Home
        </Link>
        
        <div className="legal-content">
          <h1>Terms of Service</h1>
          <p className="last-updated">Last updated: February 20, 2026</p>

          <section>
            <h2>1. Acceptance of Terms</h2>
            <p>
              By accessing and using Mosaic ("the Service"), you accept and agree to be bound by the terms
              and provision of this agreement. If you do not agree to abide by the above, please do not use
              this service.
            </p>
          </section>

          <section>
            <h2>2. Use License</h2>
            <p>
              Permission is granted to temporarily use Mosaic for personal and commercial purposes. This
              is the grant of a license, not a transfer of title, and under this license you may not:
            </p>
            <ul>
              <li>Modify or copy the materials</li>
              <li>Use the materials for any commercial purpose or for any public display</li>
              <li>Attempt to reverse engineer any software contained in the Service</li>
              <li>Remove any copyright or other proprietary notations from the materials</li>
            </ul>
          </section>

          <section>
            <h2>3. User Accounts</h2>
            <p>
              You are responsible for maintaining the confidentiality of your account and password. You agree
              to accept responsibility for all activities that occur under your account or password.
            </p>
          </section>

          <section>
            <h2>4. User Content</h2>
            <p>
              You retain ownership of any content you submit, post, or display on or through the Service.
              By submitting content, you grant us a worldwide, non-exclusive, royalty-free license to use,
              reproduce, and distribute such content solely for the purpose of providing and improving the Service.
            </p>
          </section>

          <section>
            <h2>5. Privacy and Anonymity</h2>
            <p>
              Mosaic offers different levels of anonymity for feedback collection. While we strive to protect
              user privacy, you acknowledge that:
            </p>
            <ul>
              <li>Fully anonymous responses cannot be traced back to individual users</li>
              <li>Platform-tracked responses may be associated with user accounts</li>
              <li>Revealable responses may be disclosed under certain circumstances</li>
            </ul>
          </section>

          <section>
            <h2>6. Prohibited Uses</h2>
            <p>You may not use the Service:</p>
            <ul>
              <li>For any unlawful purpose or to solicit others to perform unlawful acts</li>
              <li>To violate any international, federal, provincial, or state regulations, rules, laws, or local ordinances</li>
              <li>To infringe upon or violate our intellectual property rights or the intellectual property rights of others</li>
              <li>To harass, abuse, insult, harm, defame, slander, disparage, intimidate, or discriminate</li>
              <li>To submit false or misleading information</li>
            </ul>
          </section>

          <section>
            <h2>7. Service Availability</h2>
            <p>
              We reserve the right to withdraw or amend the Service, and any service or material we provide,
              in our sole discretion without notice. We will not be liable if, for any reason, all or any part
              of the Service is unavailable at any time or for any period.
            </p>
          </section>

          <section>
            <h2>8. Limitation of Liability</h2>
            <p>
              In no event shall Mosaic, nor its directors, employees, partners, agents, suppliers, or affiliates,
              be liable for any indirect, incidental, special, consequential, or punitive damages, including
              without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting
              from your use of the Service.
            </p>
          </section>

          <section>
            <h2>9. Indemnification</h2>
            <p>
              You agree to defend, indemnify, and hold harmless Mosaic and its licensee and licensors, and
              their employees, contractors, agents, officers and directors, from and against any and all
              claims, damages, obligations, losses, liabilities, costs or debt, and expenses (including but
              not limited to attorney's fees).
            </p>
          </section>

          <section>
            <h2>10. Changes to Terms</h2>
            <p>
              We reserve the right, at our sole discretion, to modify or replace these Terms at any time.
              If a revision is material, we will provide at least 30 days notice prior to any new terms taking
              effect. What constitutes a material change will be determined at our sole discretion.
            </p>
          </section>

          <section>
            <h2>11. Contact Information</h2>
            <p>
              If you have any questions about these Terms of Service, please contact us through the Service
              or via the contact information provided on our website.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

