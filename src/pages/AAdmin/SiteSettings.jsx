import React, { useState } from "react";
import {
  Tabs,
  Tab,
  Form,
  Button,
  Row,
  Col,
  Image,
  Alert,
} from "react-bootstrap";

const SiteSettings = () => {
  const [paymentInfo, setPaymentInfo] = useState({
    gatewayName: "Razorpay",
    apiKey: "",
    secret: "",
  });

  const [deliveryCharge, setDeliveryCharge] = useState(50);
  const [adminCreds, setAdminCreds] = useState({
    username: "admin",
    password: "",
  });

  const [branding, setBranding] = useState({
    siteName: "Back To Dorm",
    logo: null,
    logoPreview: null,
  });

  const [policies, setPolicies] = useState({
    terms: "",
    refund: "",
    privacy: "",
  });

  const [saved, setSaved] = useState(false);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    setBranding((prev) => ({
      ...prev,
      logo: file,
      logoPreview: URL.createObjectURL(file),
    }));
  };

  const handleSave = () => {
    // You can save all data to Firestore here
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="container mt-4">
      <h2 className="mb-3">⚙️ Site Settings</h2>
      {saved && <Alert variant="success">Settings saved!</Alert>}
      <Tabs defaultActiveKey="payment" className="mb-3">
        <Tab eventKey="payment" title="💳 Payment Gateway">
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Gateway Name</Form.Label>
              <Form.Control
                value={paymentInfo.gatewayName}
                onChange={(e) =>
                  setPaymentInfo({ ...paymentInfo, gatewayName: e.target.value })
                }
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>API Key</Form.Label>
              <Form.Control
                value={paymentInfo.apiKey}
                onChange={(e) =>
                  setPaymentInfo({ ...paymentInfo, apiKey: e.target.value })
                }
              />
            </Form.Group>
            <Form.Group>
              <Form.Label>Secret</Form.Label>
              <Form.Control
                type="password"
                value={paymentInfo.secret}
                onChange={(e) =>
                  setPaymentInfo({ ...paymentInfo, secret: e.target.value })
                }
              />
            </Form.Group>
          </Form>
        </Tab>

        <Tab eventKey="delivery" title="🚚 Delivery Charge">
          <Form.Group className="mb-3 mt-3" as={Row}>
            <Form.Label column sm={3}>
              Flat Delivery Charge (₹)
            </Form.Label>
            <Col sm={4}>
              <Form.Control
                type="number"
                value={deliveryCharge}
                onChange={(e) => setDeliveryCharge(Number(e.target.value))}
              />
            </Col>
          </Form.Group>
        </Tab>

        <Tab eventKey="admin" title="👤 Admin Credentials">
          <Form className="mt-3">
            <Form.Group className="mb-3">
              <Form.Label>Username</Form.Label>
              <Form.Control
                value={adminCreds.username}
                onChange={(e) =>
                  setAdminCreds({ ...adminCreds, username: e.target.value })
                }
              />
            </Form.Group>
            <Form.Group>
              <Form.Label>Password</Form.Label>
              <Form.Control
                type="password"
                value={adminCreds.password}
                onChange={(e) =>
                  setAdminCreds({ ...adminCreds, password: e.target.value })
                }
              />
            </Form.Group>
          </Form>
        </Tab>

        <Tab eventKey="branding" title="🎨 Branding">
          <Form className="mt-3">
            <Form.Group className="mb-3">
              <Form.Label>Site Name</Form.Label>
              <Form.Control
                value={branding.siteName}
                onChange={(e) =>
                  setBranding({ ...branding, siteName: e.target.value })
                }
              />
            </Form.Group>
            <Form.Group>
              <Form.Label>Upload Logo</Form.Label>
              <Form.Control type="file" onChange={handleImageUpload} />
              {branding.logoPreview && (
                <div className="mt-3">
                  <Image
                    src={branding.logoPreview}
                    alt="Logo Preview"
                    height={100}
                  />
                </div>
              )}
            </Form.Group>
          </Form>
        </Tab>

        <Tab eventKey="policies" title="📃 Policies">
          <Form className="mt-3">
            <Form.Group className="mb-3">
              <Form.Label>Terms & Conditions</Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                value={policies.terms}
                onChange={(e) =>
                  setPolicies({ ...policies, terms: e.target.value })
                }
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Refund Policy</Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                value={policies.refund}
                onChange={(e) =>
                  setPolicies({ ...policies, refund: e.target.value })
                }
              />
            </Form.Group>
            <Form.Group>
              <Form.Label>Privacy Policy</Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                value={policies.privacy}
                onChange={(e) =>
                  setPolicies({ ...policies, privacy: e.target.value })
                }
              />
            </Form.Group>
          </Form>
        </Tab>
      </Tabs>

      <Button className="mt-3" onClick={handleSave}>
        💾 Save Settings
      </Button>
    </div>
  );
};

export default SiteSettings;
