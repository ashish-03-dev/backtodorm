import React, { useState, useEffect } from 'react';
import { Modal, Form, Button, ListGroup, Image } from 'react-bootstrap';
import { useFirebase } from '../../../context/FirebaseContext';
import { doc, getDoc } from 'firebase/firestore';

const SupplierModal = ({ show, onHide, supplierData, setSupplierData, submitting, handleSendToSupplier }) => {
  const { firestore } = useFirebase();
  const [copiedFields, setCopiedFields] = useState({});
  const [posterImages, setPosterImages] = useState({}); // Store poster images by posterId

  // Fetch original poster images when supplierData.items changes
  useEffect(() => {
    const fetchPosterImages = async () => {
      if (!firestore || !supplierData.items) return;

      const newPosterImages = {};
      for (const item of supplierData.items) {
        if (item.type === 'poster' && item.posterId) {
          try {
            const posterDoc = await getDoc(doc(firestore, 'originalPoster', item.posterId));
            if (posterDoc.exists() && posterDoc.data().imageUrl) {
              newPosterImages[item.posterId] = posterDoc.data().imageUrl;
            } else {
              newPosterImages[item.posterId] = null; // No image found
            }
          } catch (err) {
            console.error(`Failed to fetch image for poster ${item.posterId}:`, err);
            newPosterImages[item.posterId] = null;
          }
        } else if (item.type === 'collection' && item.posters) {
          for (const poster of item.posters) {
            if (poster.posterId) {
              try {
                const posterDoc = await getDoc(doc(firestore, 'originalPoster', poster.posterId));
                if (posterDoc.exists() && posterDoc.data().imageUrl) {
                  newPosterImages[poster.posterId] = posterDoc.data().imageUrl;
                } else {
                  newPosterImages[poster.posterId] = null;
                }
              } catch (err) {
                console.error(`Failed to fetch image for poster ${poster.posterId}:`, err);
                newPosterImages[poster.posterId] = null;
              }
            }
          }
        }
      }
      setPosterImages(newPosterImages);
    };

    fetchPosterImages();
  }, [firestore, supplierData.items]);

  const copyToClipboard = async (text, field) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedFields((prev) => ({ ...prev, [field]: true }));
      setTimeout(() => setCopiedFields((prev) => ({ ...prev, [field]: false })), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleImageDragStart = (e, imageUrl) => {
    e.dataTransfer.setData('text/plain', imageUrl); // Set image URL for drag-and-drop
  };

  const addressFields = [
    { key: 'name', label: 'Name' },
    { key: 'address', label: 'Address' },
    { key: 'locality', label: 'Locality' },
    { key: 'city', label: 'City' },
    { key: 'state', label: 'State' },
    { key: 'pincode', label: 'Pincode' },
    { key: 'landmark', label: 'Landmark' },
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
                    <div className="d-flex align-items-center">
                      {posterImages[item.posterId] ? (
                        <Image
                          src={posterImages[item.posterId]}
                          alt={item.posterTitle}
                          thumbnail
                          style={{ width: '50px', height: '50px', marginRight: '10px', cursor: 'pointer' }}
                          onClick={() => copyToClipboard(posterImages[item.posterId], `image_${item.posterId}`)}
                          onDragStart={(e) => handleImageDragStart(e, posterImages[item.posterId])}
                          title="Click to copy image URL or drag to vendor website"
                        />
                      ) : (
                        <span className="me-2">No image</span>
                      )}
                      <span>{item.posterTitle} ({item.size}) × {item.quantity}</span>
                      {copiedFields[`image_${item.posterId}`] && (
                        <span className="ms-2 text-success">Copied!</span>
                      )}
                    </div>
                  ) : (
                    <div>
                      <span>Collection: {item.collectionTitle} × {item.quantity}</span>
                      <ul className="ms-3">
                        {item.posters.map((poster, i) => (
                          <li key={i} className="d-flex align-items-center">
                            {posterImages[poster.posterId] ? (
                              <Image
                                src={posterImages[poster.posterId]}
                                alt={poster.title}
                                thumbnail
                                style={{ width: '50px', height: '50px', marginRight: '10px', cursor: 'pointer' }}
                                onClick={() => copyToClipboard(posterImages[poster.posterId], `image_${poster.posterId}`)}
                                onDragStart={(e) => handleImageDragStart(e, posterImages[poster.posterId])}
                                title="Click to copy image URL or drag to vendor website"
                              />
                            ) : (
                              <span className="me-2">No image</span>
                            )}
                            <span>{poster.title} ({poster.size})</span>
                            {copiedFields[`image_${poster.posterId}`] && (
                              <span className="ms-2 text-success">Copied!</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </ListGroup.Item>
              ))}
            </ListGroup>
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Shipping Address</Form.Label>
            {addressFields.map(({ key, label }) => (
              <div key={key} className="mb-2 d-flex align-items-center">
                <Form.Control
                  value={supplierData.address[key] || ''}
                  placeholder={label}
                  disabled
                  className="me-2"
                />
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={() => copyToClipboard(supplierData.address[key] || '', key)}
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