import React, { useState } from 'react';
import { Modal, Form, Button, ListGroup } from 'react-bootstrap';

const SupplierModal = ({ show, onHide, supplierData, setSupplierData, submitting, handleSendToSupplier }) => {
  const [copiedFields, setCopiedFields] = useState({});

  const copyToClipboard = async (text, field) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedFields((prev) => ({ ...prev, [field]: true }));
      setTimeout(() => setCopiedFields((prev) => ({ ...prev, [field]: false })), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleAddressChange = (field, value) => {
    setSupplierData((prev) => ({
      ...prev,
      address: { ...prev.address, [field]: value }
    }));
  };

  const addressFields = [
    { key: 'name', label: 'Name', required: true },
    { key: 'address', label: 'Address', required: true },
    { key: 'locality', label: 'Locality', required: true },
    { key: 'city', label: 'City', required: true },
    { key: 'state', label: 'State', required: true },
    { key: 'pincode', label: 'Pincode', required: true },
    { key: 'landmark', label: 'Landmark (optional)', required: false },
  ];

  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Send Order to Supplier</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form onSubmit={handleSendToSupplier}>
          <Form.Group className="mb-3">
            <Form.Label>Items</Form.Label>
            <ListGroup>
              {supplierData.items.map((item, index) => (
                <ListGroup.Item key={index}>
                  {item.type === 'poster' ? (
                    <span>{item.posterTitle} ({item.size}) × {item.quantity}</span>
                  ) : (
                    <span>
                      Collection: {item.collectionTitle} × {item.quantity}
                      <ul className="ms-3">
                        {item.posters.map((poster, i) => (
                          <li key={i}>{poster.title} ({poster.size})</li>
                        ))}
                      </ul>
                    </span>
                  )}
                </ListGroup.Item>
              ))}
            </ListGroup>
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Shipping Address</Form.Label>
            {addressFields.map(({ key, label, required }) => (
              <div key={key} className="mb-2 d-flex align-items-center">
                <Form.Control
                  value={supplierData.address[key]}
                  onChange={(e) => handleAddressChange(key, e.target.value)}
                  placeholder={label}
                  required={required}
                  disabled={submitting}
                  className="me-2"
                />
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={() => copyToClipboard(supplierData.address[key], key)}
                  disabled={submitting || !supplierData.address[key]}
                >
                  {copiedFields[key] ? 'Copied' : 'Copy'}
                </Button>
              </div>
            ))}
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Supplier Name</Form.Label>
            <Form.Control
              value={supplierData.supplierName}
              onChange={(e) => setSupplierData((prev) => ({ ...prev, supplierName: e.target.value }))}
              required
              disabled={submitting}
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Supplier Order ID</Form.Label>
            <Form.Control
              value={supplierData.supplierOrderId}
              onChange={(e) => setSupplierData((prev) => ({ ...prev, supplierOrderId: e.target.value }))}
              required
              disabled={submitting}
            />
          </Form.Group>
          <Button type="submit" variant="success" disabled={submitting}>
            {submitting ? 'Sending...' : 'Mark as Sent'}
          </Button>
        </Form>
      </Modal.Body>
    </Modal>
  );
};

export default SupplierModal;