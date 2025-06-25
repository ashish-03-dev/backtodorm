import React, { useState, useEffect } from "react";
import { Spinner, Alert } from "react-bootstrap";
import { useFirebase } from "../context/FirebaseContext";
import { doc, getDoc } from "firebase/firestore";
import ReactMarkdown from "react-markdown";

// Default Terms and Conditions (same as in SiteSettings)
const defaultTerms = `
# Acceptance of Terms
Welcome to PosterPal ("Service"), a platform for purchasing and customizing posters. By accessing or signing in to our Service via phone number or Google account, you agree to these Terms and Conditions ("Terms") and our Privacy Policy. If you do not agree, please do not use the Service.

# Eligibility
- You must be at least 13 years old to use the Service. Users under 18 require parental consent.
- You agree to provide accurate information (e.g., phone number, email) during sign-in.
- You may not use the Service if prohibited by applicable laws.

# User Accounts
- **Sign-In**: Sign in using a phone number (via OTP) or Google account, powered by Firebase Authentication.
- **Profile Creation**: Upon first sign-in, we create a user profile in our database with your unique ID, name, email, phone, and account status (e.g., admin or seller flags).
- **Security**: You are responsible for keeping your account credentials secure and for all activities under your account. Contact support@posterpal.com for unauthorized access issues.
- **Admin Role**: A designated administrator (set server-side) has elevated access to manage users and orders. Admin status cannot be modified by users.

# Poster Purchases
- **Browsing and Buying**: Browse and purchase posters (e.g., art prints, canvas) via our platform. Prices and shipping costs are shown at checkout.
- **Custom Posters**: Upload images for personalized posters, subject to our content guidelines.
- **Payment**: Payments are processed securely via Stripe. You agree to pay all fees, taxes, and shipping costs.
- **Delivery**: Standard posters ship in 3–6 business days; custom posters take 5–7 days. Tracking is provided via email.
- **Returns**: Return defective or damaged posters within 14 days for a refund or replacement. Custom posters are non-returnable unless defective. Contact support@posterpal.com.

# User Content
- You may upload images for custom posters. You warrant that you own or have rights to use the content, and it is not illegal or offensive.
- We may reject or remove content violating these Terms (e.g., copyrighted material without permission).
- You grant us a non-exclusive, royalty-free license to use your uploaded content solely to fulfill your order.

# Prohibited Conduct
- Do not use the Service for unlawful purposes or to harm others.
- Do not attempt to modify restricted data (e.g., admin status) or disrupt the Service.
- Do not post false reviews or engage in fraudulent transactions.

# Intellectual Property
- Our posters, designs, and logos are protected by copyright and trademark laws.
- Report infringement claims to support@posterpal.com.

# Limitation of Liability
To the fullest extent permitted by law, PosterPal is not liable for indirect, incidental, or consequential damages (e.g., printing errors, delivery delays). Our liability is limited to the amount paid for the affected order.

# Termination
You may stop using the Service at any time. We may suspend or terminate your access for violating these Terms. To delete your account, contact support@posterpal.com.

# Governing Law
These Terms are governed by the laws of California, USA. Disputes will be resolved through negotiation or arbitration per American Arbitration Association rules.

# Contact Us
Email: support@posterpal.com
Address: [Your Business Address]
`;

const Terms = () => {
  const { firestore, error: firebaseError } = useFirebase();
  const [terms, setTerms] = useState(defaultTerms);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch terms from Firestore
  const fetchTerms = async () => {
    if (!firestore) {
      setError("Firestore instance unavailable");
      setLoading(false);
      return;
    }
    try {
      const settingsDocRef = doc(firestore, "siteSettings", "general");
      const settingsDoc = await getDoc(settingsDocRef);
      if (settingsDoc.exists()) {
        const data = settingsDoc.data();
        setTerms(data.policies?.terms || defaultTerms);
      }
      setLoading(false);
    } catch (err) {
      setError(`Failed to fetch terms: ${err.message}`);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTerms();
  }, [firestore]);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "100vh" }}>
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  if (firebaseError || error) {
    return (
      <div className="container mt-4">
        <Alert variant="danger">{firebaseError || error}</Alert>
      </div>
    );
  }

  return (
    <div className="d-flex align-items-center justify-content-center min-vh-100 py-5 bg-light">
      <div className="card shadow-sm p-4" style={{ maxWidth: "800px", width: "100%" }}>
        <div className="card-body">
          <h1 className="card-title text-center fw-bold mb-4">Terms and Conditions</h1>
          <div className="text-muted text-center mb-4">Last Updated: June 25, 2025</div>
          <div className="terms-content">
            <ReactMarkdown>{terms}</ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Terms;