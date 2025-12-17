"use client";

import Link from "next/link";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-slate-950 text-white p-8 md:p-16">
      <div className="max-w-4xl mx-auto">
        <Link 
          href="/" 
          className="inline-block mb-6 text-gray-300 hover:text-white transition-colors"
        >
          ← Back
        </Link>
        <h1 className="text-4xl md:text-5xl font-bold mb-4">Terms of Service</h1>
        
        <div className="prose prose-invert max-w-none space-y-8">
          <p className="text-gray-300">
            <strong>Last Updated:</strong> December 16, 2025
          </p>

          <p className="text-gray-300">
            These Terms of Service ("Terms") govern your access to and use of the Chess Puzzles Mini App (the "App", "Service", "we", "our", or "us"). By accessing or using the App, you agree to be bound by these Terms. If you do not agree, you may not use the App.
          </p>

          <hr className="border-gray-700" />

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4">1. The Service</h2>
            <p className="text-gray-300">
              The App provides users with chess-related content, including but not limited to chess puzzles, interactive gameplay elements, statistics, and educational features. The Service is provided for personal, non-commercial use unless explicitly stated otherwise.
            </p>
            <p className="text-gray-300">
              We reserve the right to modify, suspend, or discontinue any part of the Service at any time, with or without notice.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4">2. Eligibility</h2>
            <p className="text-gray-300">
              You must be at least 13 years old (or the minimum age required in your jurisdiction) to use the App. By using the Service, you represent and warrant that you meet this requirement.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4">3. User Accounts</h2>
            <p className="text-gray-300">
              Some features may require you to create an account. You agree to provide accurate and complete information and to keep your account credentials secure. You are responsible for all activities that occur under your account.
            </p>
            <p className="text-gray-300">
              We reserve the right to suspend or terminate accounts that violate these Terms or engage in fraudulent, abusive, or harmful behavior.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4">4. Acceptable Use</h2>
            <p className="text-gray-300 mb-4">You agree not to:</p>
            <ul className="list-disc list-inside space-y-2 text-gray-300">
              <li>Use the App for any unlawful purpose.</li>
              <li>Attempt to exploit, reverse engineer, or interfere with the App's functionality.</li>
              <li>Use bots, scripts, or automated methods to access or manipulate puzzles, scores, or rankings.</li>
              <li>Harass, abuse, or harm other users.</li>
            </ul>
            <p className="text-gray-300 mt-4">
              Violation of these rules may result in account suspension or termination.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4">5. Intellectual Property</h2>
            <p className="text-gray-300">
              All content provided through the App, including puzzles, text, graphics, logos, and software, is owned by or licensed to us and is protected by intellectual property laws.
            </p>
            <p className="text-gray-300">
              You may not copy, distribute, modify, or create derivative works from the Service without prior written permission, except where explicitly allowed.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4">6. User Content</h2>
            <p className="text-gray-300">
              If the App allows you to submit content (such as comments or puzzle feedback), you retain ownership of your content but grant us a non-exclusive, worldwide, royalty-free license to use, display, and distribute it in connection with the Service.
            </p>
            <p className="text-gray-300">
              You represent that you have the rights necessary to submit such content and that it does not violate any laws or third-party rights.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4">7. Scores, Rankings, and Progress</h2>
            <p className="text-gray-300">
              Scores, rankings, streaks, and progress indicators are provided for entertainment and educational purposes only. We do not guarantee their accuracy or permanence. We reserve the right to reset or adjust these metrics at any time.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4">8. Third-Party Services</h2>
            <p className="text-gray-300">
              The App may include links to or integrations with third-party services. We are not responsible for the content, policies, or practices of any third-party services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4">9. Disclaimer of Warranties</h2>
            <p className="text-gray-300">
              The Service is provided on an "as is" and "as available" basis. We make no warranties, express or implied, regarding the reliability, accuracy, or availability of the App.
            </p>
            <p className="text-gray-300">
              To the maximum extent permitted by law, we disclaim all warranties, including fitness for a particular purpose and non-infringement.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4">10. Limitation of Liability</h2>
            <p className="text-gray-300">
              To the maximum extent permitted by law, we shall not be liable for any indirect, incidental, consequential, or punitive damages arising out of or related to your use of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4">11. Termination</h2>
            <p className="text-gray-300">
              We may suspend or terminate your access to the Service at any time, with or without notice, if you violate these Terms or if we discontinue the Service.
            </p>
            <p className="text-gray-300">
              Upon termination, your right to use the App will immediately cease.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4">12. Changes to These Terms</h2>
            <p className="text-gray-300">
              We may update these Terms from time to time. Continued use of the App after changes become effective constitutes acceptance of the updated Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4">13. Governing Law</h2>
            <p className="text-gray-300">
              These Terms shall be governed by and construed in accordance with the laws of the applicable jurisdiction, without regard to conflict of law principles.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4">14. Contact Information</h2>
            <p className="text-gray-300">
              If you have questions about these Terms, please contact us at:
            </p>
            <p className="text-gray-300 mt-2">
              <strong>Email:</strong> nwaforemmanuel005@gmail.com
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
