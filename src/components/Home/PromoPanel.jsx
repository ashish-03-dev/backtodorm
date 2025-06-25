import React from "react";
import { Container, Row, Col } from "react-bootstrap";

const PromoPanel = () => {
  return (
    <section className="py-5 border-bottom">
      <Container>
        <h2 className="fw-bold mb-5 text-center">Why Choose Back To Dorm?</h2>
        <Row className="text-center text-muted small">
          <Col md={3} className="mb-1">
            <h3 className="h5 fw-bold mb-2">Premium Quality & Unique Designs</h3>
            <p>
              Create premium quality posters with unique, user-uploaded designs. Express your creativity with prints crafted to stand out.
            </p>
          </Col>
          <Col md={3} className="mb-4">
            <h3 className="h5 fw-bold mb-2">Shipping & Returns</h3>
            <p>
              Fast shipping: 3–6 days for standard posters, 5–7 days for custom. Return defective items within 14 days.
            </p>
          </Col>
          <Col md={3} className="mb-4">
            <h3 className="h5 fw-bold mb-2">Secure Payments</h3>
            <p>
              Shop with confidence using our secure payment system powered by Stripe. All transactions are safe and reliable.
            </p>
          </Col>
          <Col md={3} className="mb-4">
            <h3 className="h5 fw-bold mb-2">Contact</h3>
            <p>
              Reach out with any questions or concerns at{" "}
              <a href="mailto:ashish03.dev@gmail.com" className="text-dark">
                ashish03.dev@gmail.com
              </a>.
            </p>
          </Col>
        </Row>
      </Container>
    </section>
  );
};

export default PromoPanel;