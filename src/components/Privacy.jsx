import React, { useState, useEffect } from "react";
import { Spinner, Alert } from "react-bootstrap";
import { useFirebase } from "../context/FirebaseContext";
import { doc, getDoc } from "firebase/firestore";
import ReactMarkdown from "react-markdown";

// Default Privacy Policy
const defaultPrivacy = `
# Privacy Policy

**Last Updated: June 25, 2025**

PosterPal ("we," "us," or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our website and services ("Service") at PosterPal, including browsing, purchasing posters, and uploading custom designs. By using our Service, you agree to the terms of this Privacy Policy.

## 1. Information We Collect

### Personal Information
We collect personal information you provide directly, such as:
- **Name, email, and phone number**: When you sign in via phone number (OTP) or Google account using Firebase Authentication.
- **Payment information**: Processed securely via Stripe for poster purchases (we do not store payment details).
- **User-uploaded content**: Images you upload for custom posters.

### Non-Personal Information
We may collect non-personal information automatically, including:
- **Device information**: IP address, browser type, and operating system.
- **Usage data**: Pages visited, time spent, and interactions with the Service.

## 2. How We Use Your Information

We use your information to:
- Provide and improve the Service (e.g., process orders, create user profiles).
- Personalize your experience (e.g., recommend posters).
- Communicate with you (e.g., order confirmations, support at support@posterpal.com).
- Ensure security and prevent fraud.
- Comply with legal obligations.

## 3. How We Share Your Information

We do not sell your personal information. We may share it with:
- **Service providers**: Stripe for payments, Firebase for authentication, and shipping partners for order fulfillment.
- **Legal authorities**: When required by law or to protect our rights.
- **Business transfers**: In case of a merger or acquisition.

## 4. Your Rights and Choices

You may:
- **Access or update** your account information by contacting support@posterpal.com.
- **Delete your account** by emailing support@posterpal.com (subject to legal retention requirements).
- **Opt-out** of promotional emails via the unsubscribe link.

## 5. Data Security

We use industry-standard measures (e.g., encryption, Firebase security rules) to protect your data. However, no system is completely secure, and you use the Service at your own risk.

## 6. Cookies and Tracking

We may use cookies to enhance your experience (e.g., remembering preferences). You can disable cookies in your browser settings, but some features may not function properly.

## 7. Children's Privacy

Our Service is not intended for users under 13. Users under 18 require parental consent, as per our Terms and Conditions.

## 8. International Users

Our Service is operated from [Your Jurisdiction, e.g., California, USA]. By using the Service, you consent to your data being processed in this jurisdiction.

## 9. Changes to This Policy

We may update this Privacy Policy periodically. Changes will be posted on this page with an updated "Last Updated" date.

## 10. Contact Us

For questions or concerns, contact us at:
- **Email**: support@posterpal.com
- **Address**: [Your Business Address]
`;

const Privacy = () => {
  const { firestore, error: firebaseError } = useFirebase();
  const [privacy, setPrivacy] = useState(defaultPrivacy);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch privacy policy from Firestore
  const fetchPrivacy = async () => {
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
        setPrivacy(data.policies?.privacy || defaultPrivacy);
      }
      setLoading(false);
    } catch (err) {
      setError(`Failed to fetch privacy policy: ${err.message}`);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrivacy();
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
          <h1 className="card-title text-center fw-bold mb-4">Privacy Policy</h1>
          <div className="text-muted text-center mb-4">Last Updated: June 25, 2025</div>
          <div className="terms-content">
            <ReactMarkdown>{privacy}</ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Privacy;