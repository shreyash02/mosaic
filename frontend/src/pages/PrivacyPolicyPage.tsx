import { Link } from 'react-router-dom';

export default function PrivacyPolicyPage() {
  return (
    <div className="legal-page">
      <div className="legal-container">
        <Link to="/" className="btn-back">
          ← Back to Home
        </Link>
        
        <div className="legal-content">
          <h1>Privacy Policy</h1>
          <p className="last-updated">Last updated: {new Date().toLocaleDateString()}</p>

          <section>
            <h2>1. Introduction</h2>
            <p>
              Mosaic ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy
              explains how we collect, use, disclose, and safeguard your information when you use our
              platform for anonymous opinions or responses to questions/polls.
            </p>
          </section>

          <section>
            <h2>2. Information We Collect</h2>
            <h3>2.1 Account Information</h3>
            <p>When you create an account, we collect:</p>
            <ul>
              <li>Email address</li>
              <li>Full name</li>
              <li>Password (stored securely using industry-standard hashing)</li>
              <li>Organization affiliation (if applicable)</li>
            </ul>

            <h3>2.2 Feedback Responses</h3>
            <p>
              We collect feedback responses submitted through the Service. The level of anonymity associated
              with each response depends on the anonymity level selected by the conversation creator:
            </p>
            <ul>
              <li><strong>Fully Anonymous:</strong> Responses are not linked to any user account or identifiable information</li>
              <li><strong>Platform-Tracked:</strong> Responses may be associated with user accounts but are not disclosed to conversation creators</li>
              <li><strong>Revealable:</strong> Responses may be associated with user accounts and may be disclosed under certain circumstances</li>
            </ul>

            <h3>2.3 Usage Data</h3>
            <p>
              We automatically collect information about how you interact with the Service, including:
            </p>
            <ul>
              <li>IP address</li>
              <li>Browser type and version</li>
              <li>Pages visited and time spent on pages</li>
              <li>Date and time of access</li>
            </ul>
          </section>

          <section>
            <h2>3. How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul>
              <li>Provide, maintain, and improve the Service</li>
              <li>Process and manage your account</li>
              <li>Enable feedback collection and analysis</li>
              <li>Generate AI-powered insights and analysis</li>
              <li>Send you service-related communications</li>
              <li>Detect, prevent, and address technical issues</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2>4. Data Sharing and Disclosure</h2>
            <p>We do not sell your personal information. We may share your information only in the following circumstances:</p>
            
            <h3>4.1 Service Providers</h3>
            <p>
              We may share information with third-party service providers who perform services on our behalf,
              such as hosting, analytics, and AI processing. These providers are contractually obligated to
              protect your information.
            </p>

            <h3>4.2 Legal Requirements</h3>
            <p>
              We may disclose your information if required by law or in response to valid requests by public
              authorities (e.g., a court or government agency).
            </p>

            <h3>4.3 Business Transfers</h3>
            <p>
              In the event of a merger, acquisition, or sale of assets, your information may be transferred
              as part of that transaction.
            </p>
          </section>

          <section>
            <h2>5. Anonymity Levels</h2>
            <p>
              Mosaic offers three levels of anonymity for feedback responses. The level selected by the
              conversation creator determines how responses are handled:
            </p>
            <ul>
              <li>
                <strong>Fully Anonymous:</strong> Responses are completely anonymized and cannot be traced
                back to individual users. We do not store any identifying information with these responses.
              </li>
              <li>
                <strong>Platform-Tracked:</strong> Responses may be associated with user accounts for
                platform analytics purposes, but this information is not disclosed to conversation creators
                or other users.
              </li>
              <li>
                <strong>Revealable:</strong> Responses may be associated with user accounts, and this
                association may be disclosed to conversation creators or administrators under certain
                circumstances as specified in the conversation settings.
              </li>
            </ul>
          </section>

          <section>
            <h2>6. Data Security</h2>
            <p>
              We implement appropriate technical and organizational security measures to protect your
              information against unauthorized access, alteration, disclosure, or destruction. However, no
              method of transmission over the Internet or electronic storage is 100% secure, and we cannot
              guarantee absolute security.
            </p>
          </section>

          <section>
            <h2>7. Data Retention</h2>
            <p>
              We retain your personal information for as long as necessary to provide the Service and
              fulfill the purposes outlined in this Privacy Policy, unless a longer retention period is
              required or permitted by law.
            </p>
          </section>

          <section>
            <h2>8. Your Rights</h2>
            <p>Depending on your location, you may have the following rights regarding your personal information:</p>
            <ul>
              <li><strong>Access:</strong> Request access to your personal information</li>
              <li><strong>Correction:</strong> Request correction of inaccurate information</li>
              <li><strong>Deletion:</strong> Request deletion of your personal information</li>
              <li><strong>Portability:</strong> Request transfer of your data to another service</li>
              <li><strong>Objection:</strong> Object to processing of your personal information</li>
            </ul>
            <p>
              To exercise these rights, please contact us through the Service or using the contact
              information provided on our website.
            </p>
          </section>

          <section>
            <h2>9. Cookies and Tracking Technologies</h2>
            <p>
              We use cookies and similar tracking technologies to track activity on our Service and hold
              certain information. You can instruct your browser to refuse all cookies or to indicate when
              a cookie is being sent.
            </p>
          </section>

          <section>
            <h2>10. Children's Privacy</h2>
            <p>
              Our Service is not intended for children under the age of 13. We do not knowingly collect
              personal information from children under 13. If you are a parent or guardian and believe your
              child has provided us with personal information, please contact us.
            </p>
          </section>

          <section>
            <h2>11. International Data Transfers</h2>
            <p>
              Your information may be transferred to and maintained on computers located outside of your
              state, province, country, or other governmental jurisdiction where data protection laws may
              differ from those in your jurisdiction.
            </p>
          </section>

          <section>
            <h2>12. Changes to This Privacy Policy</h2>
            <p>
              We may update our Privacy Policy from time to time. We will notify you of any changes by
              posting the new Privacy Policy on this page and updating the "Last updated" date. You are
              advised to review this Privacy Policy periodically for any changes.
            </p>
          </section>

          <section>
            <h2>13. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us through the Service
              or via the contact information provided on our website.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

