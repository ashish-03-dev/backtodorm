import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Spinner, Alert, Nav } from "react-bootstrap";
import ReactMarkdown from "react-markdown";

// Default Terms and Conditions
const defaultTerms = `
# Acceptance of Terms
Welcome to BackToDorm ("Service"), a platform for purchasing and customizing posters. By accessing or signing in to our Service via phone number or Google account, you agree to these Terms and Conditions ("Terms") and our Privacy Policy. If you do not agree, please do not use the Service.

# Eligibility
- You must be at least 13 years old to use the Service. Users under 18 require parental consent.
- You agree to provide accurate information (e.g., phone number, email) during sign-in.
- You may not use the Service if prohibited by applicable laws.

# User Accounts
- **Sign-In**: Sign in using a phone number (via OTP) or Google account, powered by Firebase Authentication.
- **Profile Creation**: Upon first sign-in, we create a user profile in our database with your unique ID, name, email, phone, and account status (e.g., admin or seller flags).
- **Security**: You are responsible for keeping your account credentials secure and for all activities under your account. Contact ashish03.dev@gmail.com for unauthorized access issues.
- **Admin Role**: A designated administrator (set server-side) has elevated access to manage users and orders. Admin status cannot be modified by users.

# Poster Purchases
- **Browsing and Buying**: Browse and purchase posters via our platform. Prices and shipping costs are shown at checkout.
- **Custom Posters**: Upload images for personalized posters, subject to our content guidelines.
- **Payment**: Payments are processed securely via RazorPay. You agree to pay all fees, taxes, and shipping costs.
- **Delivery**: Standard posters ship in 3–6 business days; custom posters take 5–7 days. Tracking is provided via email.
- **Returns**: Return defective or damaged posters within 7 days for a replacement. Custom posters are non-returnable unless defective. Contact ashish03.dev@gmail.com.

# User Content
- You may upload images for custom posters. You warrant that you own or have rights to use the content, and it is not illegal or offensive.
- We may reject or remove content violating these Terms (e.g., copyrighted material without permission).
- You grant us a non-exclusive, royalty-free license to use your uploaded content solely to fulfill your order.

# Prohibited Conduct
- Do not use the Service for unlawful purposes or to harm others.
- Do not attempt to modify restricted data (e.g., user status) or disrupt the Service.
- Do not post false reviews or engage in fraudulent transactions.

# Intellectual Property
- Our posters, designs, and logos are protected by copyright and trademark laws.
- Report infringement claims to ashish03.dev@gmail.com.

# Limitation of Liability
To the fullest extent permitted by law, BackToDorm is not liable for indirect, incidental, or consequential damages (e.g., printing errors, delivery delays). Our liability is limited to the amount paid for the affected order.

# Termination
You may stop using the Service at any time. We may suspend or terminate your access for violating these Terms. To delete your account, contact ashish03.dev@gmail.com.

# Governing Law
These Terms are governed by the laws of India. Disputes will be resolved through negotiation or arbitration per Indian Arbitration Association rules.

# Contact Us
Email: ashish03.dev@gmail.com
`;

// Default Privacy Policy
const defaultPrivacy = `
# Privacy Policy

**Last Updated: June 25, 2025**

BackToDorm ("we," "us," or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our website and services ("Service") at BackToDorm, including browsing, purchasing posters, and uploading custom designs. By using our Service, you agree to the terms of this Privacy Policy.

## 1. Information We Collect

### Personal Information
We collect personal information you provide directly, such as:
- **Name, email, and phone number**: When you sign in via phone number (OTP) or Google account using Firebase Authentication.
- **Payment information**: Processed securely via RazorPay for poster purchases (we do not store payment details).
- **User-uploaded content**: Images you upload for custom posters.

### Non-Personal Information
We may collect non-personal information automatically, including:
- **Device information**: IP address, browser type, and operating system.
- **Usage data**: Pages visited, time spent, and interactions with the Service.

## 2. How We Use Your Information

We use your information to:
- Provide and improve the Service (e.g., process orders, create user profiles).
- Personalize your experience (e.g., recommend posters).
- Communicate with you (e.g., order confirmations, support at ashish03.dev@gmail.com).
- Ensure security and prevent fraud.
- Comply with legal obligations.

## 3. How We Share Your Information

We do not sell your personal information. We may share it with:
- **Service providers**: RazorPay for payments, Firebase for authentication, and shipping partners for order fulfillment.
- **Legal authorities**: When required by law or to protect our rights.
- **Business transfers**: In case of a merger or acquisition.

## 4. Your Rights and Choices

You may:
- **Access or update** your account information by contacting support@posterpal.com.
- **Delete your account** by emailing ashish03.dev@gmail.com (subject to legal retention requirements).
- **Opt-out** of promotional emails via the unsubscribe link.

## 5. Data Security

We use industry-standard measures (e.g., encryption, Firebase security rules) to protect your data. However, no system is completely secure, and you use the Service at your own risk.

## 6. Cookies and Tracking

We may use cookies to enhance your experience (e.g., remembering preferences). You can disable cookies in your browser settings, but some features may not function properly.

## 7. Children's Privacy

Our Service is not intended for users under 13. Users under 18 require parental consent, as per our Terms and Conditions.

## 8. International Users

Our Service is operated from UttarPradesh, India. By using the Service, you consent to your data being processed in this jurisdiction.

## 9. Changes to This Policy

We may update this Privacy Policy periodically. Changes will be posted on this page with an updated "Last Updated" date.

## 10. Contact Us

For questions or concerns, contact us at:
- **Email**: ashish03.dev@gmail.com
`;

// Default Return Policy
const defaultReturn = `
# Return Policy

**Last Updated: June 25, 2025**

PosterPal ("we," "us," or "our") is committed to ensuring your satisfaction with our products. This Return Policy outlines the conditions under which you may return defective products purchased through our website and services ("Service") at BackToDorm. Please review this policy carefully before making a purchase.

## 1. Eligibility for Returns

You may return products under the following conditions:
- **Defective or Damaged Products**: Standard or custom posters that arrive damaged, misprinted, or otherwise defective are eligible for a refund or replacement.
- **Timeframe**: Returns must be initiated within 14 days of receiving your order.
- **Non-Returnable Items**: Custom posters are non-returnable unless defective, damaged, or misprinted. Non-defective standard posters are not eligible for return due to change of mind.

## 2. Return Process

To initiate a return:
- **Contact Us**: Email ashish03.dev@gmail.com with your order number, a description of the issue, and photos of the defective or damaged product.
- **Return Approval**: We will review your request and provide a return authorization within 2–3 business days.
- **Shipping**: You may be required to ship the defective product back to us using a provided prepaid shipping label. Do not return products without prior authorization.

## 3. Refunds and Replacements

- **Refunds**: If approved, refunds will be processed to your original payment method within 5–7 business days after we receive the returned product. Refunds include the cost of the product and any applicable taxes, but exclude original shipping fees unless the defect was our error.
- **Replacements**: For defective products, we may offer a replacement at no additional cost, shipped within 5–7 business days of approval.
- **Custom Posters**: Defective custom posters will be replaced with an identical reprint unless otherwise agreed.

## 4. Non-Defective Returns

We do not accept returns for non-defective products due to change of mind, incorrect sizing, or other personal preferences. Please review product descriptions, dimensions, and previews carefully before ordering.

## 5. Shipping Issues

- **Lost or Undelivered Orders**: If your order is lost or not delivered within the estimated delivery window (3–6 business days for standard posters, 5–7 days for custom posters), contact ashish03.dev@gmail.com. We will investigate and provide a resolution, which may include a refund or replacement.
- **Damaged During Shipping**: If a product arrives damaged, follow the return process outlined above.

## 6. Contact Us

For questions or to initiate a return, contact us at:
- **Email**: ashish03.dev@gmail.com
`;

const Policies = () => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("terms");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Determine active tab based on URL path
    const path = location.pathname.toLowerCase();
    if (path.includes("/privacy-policy")) {
      setActiveTab("privacy");
    } else if (path.includes("/return-policy")) {
      setActiveTab("return");
    } else {
      setActiveTab("terms"); // Default to terms
    }
    setLoading(false);
  }, [location]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    // Update URL without reloading
    window.history.pushState(null, "", `/${tab.replace(" ", "-")}`);
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "100vh" }}>
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  const policyContent = {
    terms: { title: "Terms and Conditions", content: defaultTerms },
    privacy: { title: "Privacy Policy", content: defaultPrivacy },
    return: { title: "Return Policy", content: defaultReturn },
  };

  return (
    <div className="d-flex align-items-center justify-content-center min-vh-100 py-5 bg-light">
      <div className="card shadow-sm p-4" style={{ maxWidth: "800px", width: "100%" }}>
        <Nav
          variant="tabs"
          activeKey={activeTab}
          onSelect={(selectedKey) => handleTabChange(selectedKey)}
          className="mb-4"
        >
          <Nav.Item>
            <Nav.Link eventKey="terms">Terms and Conditions</Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="privacy">Privacy Policy</Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="return">Return Policy</Nav.Link>
          </Nav.Item>
        </Nav>
        <div className="card-body">
          <h1 className="card-title text-center fw-bold mb-4">{policyContent[activeTab].title}</h1>
          <div className="text-muted text-center mb-4">Last Updated: June 25, 2025</div>
          <div className="terms-content">
            <ReactMarkdown>{policyContent[activeTab].content}</ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Policies;