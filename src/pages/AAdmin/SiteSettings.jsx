import React, { useState, useEffect } from "react";
import { Tabs, Tab, Form, Button, Row, Col, Alert, Spinner } from "react-bootstrap";
import { useFirebase } from "../../context/FirebaseContext";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

// Default Terms and Privacy Policy
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
const SiteSettings = () => {
  const { firestore, error: firebaseError } = useFirebase();
  const [deliveryCharge, setDeliveryCharge] = useState(50);
  const [freeDeliveryThreshold, setFreeDeliveryThreshold] = useState(0); // New state for free delivery threshold
  const [policies, setPolicies] = useState({ terms: defaultTerms, privacy: defaultPrivacy, refund: "" });
  const [saved, setSaved] = useState({ delivery: false, policies: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch settings from Firestore
  const fetchSettings = async () => {
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
        setDeliveryCharge(data.deliveryCharge ?? 50);
        setFreeDeliveryThreshold(data.freeDeliveryThreshold ?? 0); // Fetch free delivery threshold
        setPolicies({
          terms: data.policies?.terms || defaultTerms,
          privacy: data.policies?.privacy || defaultPrivacy,
          refund: data.policies?.refund || "",
        });
      }
      setLoading(false);
    } catch (err) {
      setError(`Failed to fetch settings: ${err.message}`);
      setLoading(false);
    }
  };

  // Handle delivery charge input change
  const handleDeliveryChargeChange = (e) => {
    const value = e.target.value;
    setDeliveryCharge(value === "" ? null : Number(value));
  };

  // Handle free delivery threshold input change
  const handleFreeDeliveryThresholdChange = (e) => {
    const value = e.target.value;
    setFreeDeliveryThreshold(value === "" ? null : Number(value));
  };

  // Save delivery settings to Firestore
  const saveDeliveryCharge = async () => {
    if (!firestore) {
      setError("Firestore instance unavailable");
      return;
    }
    try {
      const settingsDocRef = doc(firestore, "siteSettings", "general");
      await setDoc(
        settingsDocRef,
        {
          deliveryCharge: deliveryCharge ?? 0,
          freeDeliveryThreshold: freeDeliveryThreshold ?? 0, // Save free delivery threshold
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      setSaved((prev) => ({ ...prev, delivery: true }));
      setTimeout(() => setSaved((prev) => ({ ...prev, delivery: false })), 3000);
      await fetchSettings();
    } catch (err) {
      setError(`Failed to save delivery settings: ${err.message}`);
    }
  };

  // Save policies to Firestore (unchanged)
  const savePolicies = async () => {
    if (!firestore) {
      setError("Firestore instance unavailable");
      return;
    }
    try {
      const settingsDocRef = doc(firestore, "siteSettings", "general");
      await setDoc(
        settingsDocRef,
        { policies, updatedAt: serverTimestamp() },
        { merge: true }
      );
      setSaved((prev) => ({ ...prev, policies: true }));
      setTimeout(() => setSaved((prev) => ({ ...prev, policies: false })), 3000);
      await fetchSettings();
    } catch (err) {
      setError(`Failed to save policies: ${err.message}`);
    }
  };

  // Fetch settings on component mount
  useEffect(() => {
    fetchSettings();
  }, [firestore]);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "100vh" }}>
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  if (firebaseError) {
    return (
      <div className="container mt-4">
        <Alert variant="danger">{firebaseError}</Alert>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <h2 className="mb-3">⚙️ Site Settings</h2>
      {error && (
        <Alert variant="danger" onClose={() => setError("")} dismissible>
          {error}
        </Alert>
      )}
      <Tabs defaultActiveKey="delivery" className="mb-3">
        <Tab eventKey="delivery" title="🚚 Delivery Charge">
          {saved.delivery && (
            <Alert
              variant="success"
              onClose={() => setSaved((prev) => ({ ...prev, delivery: false }))}
              dismissible
            >
              Delivery settings saved!
            </Alert>
          )}
          <Form className="mt-3">
            <Form.Group as={Row} className="mb-3">
              <Form.Label column sm={3}>
                Flat Delivery Charge (₹)
              </Form.Label>
              <Col sm={4}>
                <Form.Control
                  type="number"
                  value={deliveryCharge ?? ""}
                  onChange={handleDeliveryChargeChange}
                  min={0}
                  placeholder="Enter delivery charge"
                />
              </Col>
            </Form.Group>
            <Form.Group as={Row} className="mb-3">
              <Form.Label column sm={3}>
                Free Delivery Above (₹)
              </Form.Label>
              <Col sm={4}>
                <Form.Control
                  type="number"
                  value={freeDeliveryThreshold ?? ""}
                  onChange={handleFreeDeliveryThresholdChange}
                  min={0}
                  placeholder="Enter free delivery threshold (0 to disable)"
                />
              </Col>
            </Form.Group>
            <Button onClick={saveDeliveryCharge}>Save</Button>
          </Form>
        </Tab>
        <Tab eventKey="policies" title="📃 Policies">
          {saved.policies && (
            <Alert
              variant="success"
              onClose={() => setSaved((prev) => ({ ...prev, policies: false }))}
              dismissible
            >
              Policies saved!
            </Alert>
          )}
          <Form className="mt-3">
            <Form.Group className="mb-3">
              <Form.Label>Terms & Conditions</Form.Label>
              <Form.Control
                as="textarea"
                rows={10}
                value={policies.terms}
                onChange={(e) => setPolicies({ ...policies, terms: e.target.value })}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Privacy Policy</Form.Label>
              <Form.Control
                as="textarea"
                rows={10}
                value={policies.privacy}
                onChange={(e) => setPolicies({ ...policies, privacy: e.target.value })}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Refund Policy</Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                value={policies.refund}
                onChange={(e) => setPolicies({ ...policies, refund: e.target.value })}
              />
            </Form.Group>
            <Button onClick={savePolicies}>💾 Save Policies</Button>
          </Form>
        </Tab>
      </Tabs>
    </div>
  );
};

export default SiteSettings;