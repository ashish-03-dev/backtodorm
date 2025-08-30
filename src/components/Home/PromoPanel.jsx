import React from "react";
import { Container, Row, Col } from "react-bootstrap";

const PromoPanel = () => {
  return (
    <section className="py-5 border-bottom">
      <Container>
        <h2 className="fw-bold mb-5 text-center">Why Shop at Back To Dorm?</h2>

        {/* Section 1: What We Offer */}
        <section className="mb-5">
          <Row className="justify-content-center">
            <Col md={10} lg={8}>
              <h3 className="h4 fw-bold text-center mb-4">🎨 What We Offer</h3>
              <Row className="text-muted small">
                <Col md={6} className="mb-4">
                  <ul>
                    <li>Premium-quality prints with vibrant colors and crisp detail</li>
                    <li>Curated collections: Aesthetic, Pop Culture, Minimalist & more</li>
                    <li>Custom uploads — turn your designs into posters</li>
                  </ul>
                </Col>
                <Col md={6} className="mb-4">
                  <ul>
                    <li>Designed for dorm rooms, study corners, and workspaces</li>
                    <li>Support independent creators and student artists</li>
                    <li>New drops every month to refresh your walls</li>
                  </ul>
                </Col>
              </Row>
            </Col>
          </Row>
        </section>

        {/* Section 2: Shipping & Returns */}
        <section className="mb-5">
          <Row className="justify-content-center">
            <Col md={10} lg={8}>
              <h3 className="h4 fw-bold text-center mb-4">🚚 Shipping & Returns</h3>
              <Row className="text-muted small">
                <Col md={6} className="mb-4">
                  <ul>
                    <li>Standard posters: Delivered in 3–6 business days</li>
                    <li>Custom prints: 5–7 business days</li>
                    <li>Rolled and packed in eco-friendly packaging</li>
                  </ul>
                </Col>
                <Col md={6} className="mb-4">
                  <ul>
                    <li>Returns accepted within 14 days for damaged items</li>
                    <li>Quick refund or replacement process</li>
                    <li>Dedicated support for every order</li>
                  </ul>
                </Col>
              </Row>
            </Col>
          </Row>
        </section>

        {/* Section 3: Payments & Pricing */}
        <section className="mb-5">
          <Row className="justify-content-center">
            <Col md={10} lg={8}>
              <h3 className="h4 fw-bold text-center mb-4">💳 Payments & Pricing</h3>
              <Row className="text-muted small">
                <Col md={6} className="mb-4">
                  <ul>
                    <li>RazorPay-powered secure checkout</li>
                    <li>Supports UPI, cards, and wallets</li>
                    <li>Encrypted and privacy-first payment handling</li>
                  </ul>
                </Col>
                <Col md={6} className="mb-4">
                  <ul>
                    <li>Affordable pricing perfect for students</li>
                    <li>No hidden charges or surprise fees</li>
                    <li>Bulk discounts available for dorm groups</li>
                  </ul>
                </Col>
              </Row>
            </Col>
          </Row>
        </section>

        {/* Section 4: Support */}
       <section id="contact">
          <Row className="justify-content-center">
            <Col md={10} lg={6}>
              <h3 className="h4 fw-bold text-center mb-4">📩 Support & Assistance</h3>
              <ul className="list-unstyled text-center text-muted small">
                <li>Need help with your order?</li>
                <li>
                  Contact us at{" "}
                  <a href="mailto:ashish03.dev@gmail.com" className="text-dark fw-bold">
                    ashish03.dev@gmail.com
                  </a>
                </li>
                <li>We respond within 24 hours — every day of the week</li>
              </ul>
            </Col>
          </Row>
        </section>
      </Container>
    </section>
  );
};

export default PromoPanel;
