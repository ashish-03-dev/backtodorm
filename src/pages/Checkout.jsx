import React, { useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { useFirebase } from '../context/FirebaseContext';
import { collection, addDoc, doc, deleteDoc } from 'firebase/firestore';
import { Form, Button, Alert, ListGroup, Card } from 'react-bootstrap';

export default function Checkout() {
  const { user, firestore, userData } = useFirebase();
  const { cartItems, buyNowItem, setCartItems, setBuyNowItem } = useOutletContext();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: userData?.name || '',
    address: userData?.address || '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const items = buyNowItem ? [buyNowItem] : cartItems;
  const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      setError('You must be logged in to place an order.');
      return;
    }
    setSubmitting(true);
    setError('');

    try {
      for (const item of items) {
        await addDoc(collection(firestore, 'orders'), {
          customerId: user.uid,
          sellerId: item.seller,
          posterId: item.posterId,
          status: 'Pending',
          totalPrice: item.price * item.quantity,
          orderDate: new Date().toISOString(),
          quantity: item.quantity,
          sentToSupplier: false,
          supplierInfo: null,
          size: item.selectedSize,
        });
      }
      // Clear cart
      if (buyNowItem) {
        setBuyNowItem(null);
      } else {
        setCartItems([]);
        localStorage.removeItem('cartItems');
        if (user && firestore) {
          // Delete all cart items in Firestore
          for (const item of cartItems) {
            const cartItemId = `${item.posterId}-${item.selectedSize}`;
            await deleteDoc(doc(firestore, `users/${user.uid}/cart`, cartItemId));
          }
        }
      }
      navigate('/account/orders', { state: { orderSuccess: true } });
    } catch (err) {
      setError(`Failed to place order: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container my-5" style={{minHeight:"calc(100svh - 65px)"}}>
      <h2 className="mb-4">Checkout</h2>
      {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}

      <div className="row g-4">
        <div className="col-md-6">
          <Card>
            <Card.Body>
              <h4 className="mb-3">Order Summary</h4>
              <ListGroup variant="flush">
                {items.map((item, index) => (
                  <ListGroup.Item key={`${item.posterId}-${item.selectedSize}-${index}`}>
                    <div className="d-flex justify-content-between">
                      <div>
                        <h6>{item.title} ({item.selectedSize})</h6>
                        <p className="mb-0">Quantity: {item.quantity}</p>
                      </div>
                      <p>₹{item.price * item.quantity}</p>
                    </div>
                  </ListGroup.Item>
                ))}
              </ListGroup>
              <hr />
              <div className="d-flex justify-content-between">
                <h5>Total</h5>
                <h5>₹{totalPrice}</h5>
              </div>
            </Card.Body>
          </Card>
        </div>

        <div className="col-md-6">
          <Card>
            <Card.Body>
              <h4 className="mb-3">Shipping Details</h4>
              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3">
                  <Form.Label>Full Name</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    disabled={submitting}
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Address</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    required
                    disabled={submitting}
                  />
                </Form.Group>
                <Button
                  type="submit"
                  variant="primary"
                  className="w-100"
                  disabled={submitting || items.length === 0}
                >
                  {submitting ? 'Placing Order...' : 'Place Order'}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </div>
      </div>
    </div>
  );
}