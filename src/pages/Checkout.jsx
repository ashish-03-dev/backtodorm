import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { useFirebase } from '../context/FirebaseContext';
import { useAddress } from '../context/AddressContext';
import { collection, addDoc, doc, deleteDoc } from 'firebase/firestore';
import { Form, Button, Alert, ListGroup, Card, FormSelect } from 'react-bootstrap';

function AddressForm({ setShowForm, fetchAddresses, addAddress, setFormData }) {
  const [newAddress, setNewAddress] = useState({
    title: '',
    name: '',
    phone: '',
    address: '',
    locality: '',
    city: '',
    state: '',
    pincode: '',
    landmark: '',
    type: 'Home',
  });
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newAddress.name || !newAddress.phone || !newAddress.address || !newAddress.locality || !newAddress.city || !newAddress.state || !newAddress.pincode) {
      setError('Please fill in all required fields.');
      return;
    }
    try {
      await addAddress(newAddress);
      await fetchAddresses();
      setFormData(newAddress);
      setShowForm(false);
    } catch (err) {
      setError(`Failed to add address: ${err.message}`);
    }
  };

  return (
    <Card className="mb-4">
      <Card.Body>
        <h5>Add New Address</h5>
        {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>Title</Form.Label>
            <Form.Control
              type="text"
              placeholder="E.g., Home, Office"
              value={newAddress.title}
              onChange={(e) => setNewAddress({ ...newAddress, title: e.target.value })}
              required
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Full Name *</Form.Label>
            <Form.Control
              type="text"
              value={newAddress.name}
              onChange={(e) => setNewAddress({ ...newAddress, name: e.target.value })}
              required
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Phone Number *</Form.Label>
            <Form.Control
              type="tel"
              value={newAddress.phone}
              onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })}
              required
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Address Line *</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              value={newAddress.address}
              onChange={(e) => setNewAddress({ ...newAddress, address: e.target.value })}
              required
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Locality *</Form.Label>
            <Form.Control
              type="text"
              value={newAddress.locality}
              onChange={(e) => setNewAddress({ ...newAddress, locality: e.target.value })}
              required
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>City *</Form.Label>
            <Form.Control
              type="text"
              value={newAddress.city}
              onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
              required
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>State *</Form.Label>
            <Form.Control
              type="text"
              value={newAddress.state}
              onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })}
              required
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Pincode *</Form.Label>
            <Form.Control
              type="text"
              value={newAddress.pincode}
              onChange={(e) => setNewAddress({ ...newAddress, pincode: e.target.value })}
              required
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Landmark (Optional)</Form.Label>
            <Form.Control
              type="text"
              value={newAddress.landmark}
              onChange={(e) => setNewAddress({ ...newAddress, landmark: e.target.value })}
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Address Type</Form.Label>
            <div>
              <Form.Check
                inline
                label="Home"
                type="radio"
                name="type"
                value="Home"
                checked={newAddress.type === 'Home'}
                onChange={(e) => setNewAddress({ ...newAddress, type: e.target.value })}
              />
              <Form.Check
                inline
                label="Work"
                type="radio"
                name="type"
                value="Work"
                checked={newAddress.type === 'Work'}
                onChange={(e) => setNewAddress({ ...newAddress, type: e.target.value })}
              />
            </div>
          </Form.Group>
          <Button type="submit" variant="primary" className="me-2">
            Save Address
          </Button>
          <Button variant="outline-secondary" onClick={() => setShowForm(false)}>
            Cancel
          </Button>
        </Form>
      </Card.Body>
    </Card>
  );
}

export default function Checkout() {
  const { user, firestore, userData } = useFirebase();
  const { cartItems, buyNowItem, setCartItems, setBuyNowItem } = useOutletContext();
  const { getAddressList, addAddress } = useAddress();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    name: userData?.name || '',
    phone: '',
    address: '',
    locality: '',
    city: '',
    state: '',
    pincode: '',
    landmark: '',
    type: 'Home',
  });
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);

  const items = buyNowItem ? [buyNowItem] : cartItems;
  const groupedByCollection = items.reduce((acc, item) => {
    const key = item.collectionId || 'individual';
    if (!acc[key]) {
      acc[key] = { items: [], discount: item.collectionDiscount || 0 };
    }
    acc[key].items.push(item);
    return acc;
  }, {});
  const totalPrice = Object.values(groupedByCollection).reduce((acc, group) => {
    const groupTotal = group.items.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 0), 0);
    return acc + groupTotal * (1 - group.discount / 100);
  }, 0).toFixed(2);

  useEffect(() => {
    if (user) {
      fetchAddresses();
    }
  }, [user]);

  const fetchAddresses = async () => {
    try {
      const addressList = await getAddressList();
      setAddresses(addressList);
      if (addressList.length > 0 && !selectedAddressId) {
        setSelectedAddressId(addressList[0].id);
        setFormData(addressList[0]);
      }
    } catch (err) {
      setError(`Failed to load addresses: ${err.message}`);
    }
  };

  const handleAddressSelect = (id) => {
    setSelectedAddressId(id);
    const selected = addresses.find((addr) => addr.id === id);
    if (selected) {
      setFormData(selected);
    } else {
      setFormData({
        title: '',
        name: userData?.name || '',
        phone: '',
        address: '',
        locality: '',
        city: '',
        state: '',
        pincode: '',
        landmark: '',
        type: 'Home',
      });
    }
  };

  const handleProceedToPayment = (e) => {
    e.preventDefault();
    if (!user) {
      setError('You must be logged in to proceed.');
      return;
    }
    if (!selectedAddressId && !formData.name) {
      setError('Please select an address or add a new one.');
      return;
    }
    setShowPayment(true);
  };

  const handlePayment = async () => {
    if (!user) {
      setError('You must be logged in to place an order.');
      return;
    }
    setPaymentProcessing(true);
    setError('');

    try {
      // Simulate payment
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Save orders to Firestore
      for (const item of items) {
        await addDoc(collection(firestore, 'orders'), {
          customerId: user.uid,
          sellerId: item.seller || 'Unknown',
          posterId: item.posterId,
          status: 'Pending',
          totalPrice: item.price * item.quantity * (1 - (item.collectionDiscount || 0) / 100),
          orderDate: new Date().toISOString(),
          quantity: item.quantity,
          sentToSupplier: false,
          supplierInfo: null,
          size: item.selectedSize,
          shippingAddress: formData,
          paymentStatus: 'Completed',
          paymentMethod: 'Razorpay',
          collectionId: item.collectionId || null,
          collectionDiscount: item.collectionDiscount || 0,
        });
      }

      // Clear cart
      if (buyNowItem) {
        setBuyNowItem(null);
      } else {
        setCartItems([]);
        localStorage.removeItem('cartItems');
        if (user && firestore) {
          for (const item of cartItems) {
            const cartItemId = `${item.posterId}-${item.selectedSize}`;
            await deleteDoc(doc(firestore, `users/${user.uid}/cart`, cartItemId));
          }
        }
      }
      navigate('/account/orders', { state: { orderSuccess: true } });
    } catch (err) {
      setError(`Payment failed: ${err.message}`);
      setPaymentProcessing(false);
    }
  };

  return (
    <div className="container my-5" style={{ minHeight: 'calc(100svh - 65px)' }}>
      <h2 className="mb-4">Checkout</h2>
      {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}

      <div className="row g-4">
        <div className="col-md-6">
          <Card>
            <Card.Body>
              <h4 className="mb-3">Order Summary</h4>
              <ListGroup variant="flush">
                {Object.entries(groupedByCollection).map(([groupId, group]) => (
                  <React.Fragment key={groupId}>
                    {groupId !== 'individual' && (
                      <div className="mb-2">
                        <h6 className="fw-semibold">Collection Pack (Discount: {group.discount}%)</h6>
                      </div>
                    )}
                    {group.items.map((item, index) => (
                      <ListGroup.Item key={`${item.posterId}-${item.selectedSize}-${index}`}>
                        <div className="d-flex align-items-center">
                          <img
                            src={item.image || 'https://via.placeholder.com/50'}
                            alt={`${item.title} (${item.selectedSize})`}
                            style={{ width: '50px', height: '50px', objectFit: 'cover', marginRight: '10px' }}
                          />
                          <div className="flex-grow-1">
                            <h6>{item.title} ({item.selectedSize})</h6>
                            <p className="mb-0">Quantity: {item.quantity}</p>
                            {item.collectionDiscount > 0 && (
                              <p className="mb-0 text-success">Discount: {item.collectionDiscount}%</p>
                            )}
                          </div>
                          <p>₹{(item.price * item.quantity * (1 - (item.collectionDiscount || 0) / 100)).toLocaleString('en-IN')}</p>
                        </div>
                      </ListGroup.Item>
                    ))}
                  </React.Fragment>
                ))}
              </ListGroup>
              <hr />
              <div className="d-flex justify-content-between">
                <h5>Total</h5>
                <h5>₹{totalPrice.toLocaleString('en-IN')}</h5>
              </div>
            </Card.Body>
          </Card>
        </div>

        <div className="col-md-6">
          <Card>
            <Card.Body>
              <h4 className="mb-3">Shipping Details</h4>
              {user && !showPayment && (
                <>
                  <Form.Group className="mb-3">
                    <Form.Label>Select Saved Address</Form.Label>
                    <FormSelect
                      value={selectedAddressId}
                      onChange={(e) => handleAddressSelect(e.target.value)}
                      disabled={submitting || showForm}
                    >
                      <option value="">Select an address</option>
                      {addresses.map((addr) => (
                        <option key={addr.id} value={addr.id}>
                          {addr.title || addr.name} - {addr.address}, {addr.city}
                        </option>
                      ))}
                    </FormSelect>
                  </Form.Group>
                  {!showForm && (
                    <Button
                      variant="outline-primary"
                      className="mb-3"
                      onClick={() => setShowForm(true)}
                      disabled={submitting}
                    >
                      Add New Address
                    </Button>
                  )}
                  {showForm && (
                    <AddressForm
                      setShowForm={setShowForm}
                      fetchAddresses={fetchAddresses}
                      addAddress={addAddress}
                      setFormData={setFormData}
                    />
                  )}
                  {(selectedAddressId || formData.name) && (
                    <Form.Group className="mb-3">
                      <Form.Label>Selected Address Details</Form.Label>
                      <Card className="p-3">
                        <p className="mb-1">
                          <strong>{formData.title || formData.name}</strong>
                          {formData.phone && <span className="ms-2">{formData.phone}</span>}
                        </p>
                        <p className="mb-1 text-muted">
                          {formData.address}, {formData.locality}, {formData.city}
                          {formData.landmark && `, Landmark: ${formData.landmark}`}
                        </p>
                        <p className="mb-0 text-muted">
                          {formData.state} - {formData.pincode}
                        </p>
                        {formData.type && <p className="mb-0 text-muted">Type: {formData.type}</p>}
                      </Card>
                    </Form.Group>
                  )}
                  <Form onSubmit={handleProceedToPayment}>
                    <Button
                      type="submit"
                      variant="primary"
                      className="w-100"
                      disabled={submitting || items.length === 0 || (!selectedAddressId && !formData.name)}
                    >
                      Proceed to Payment
                    </Button>
                  </Form>
                </>
              )}
              {user && showPayment && (
                <>
                  <h4 className="mb-3">Payment Options</h4>
                  <Card className="p-3 mb-3">
                    <p className="mb-0">Total Amount: ₹{totalPrice.toLocaleString('en-IN')}</p>
                    <p className="text-muted">Pay via Razorpay (coming soon)</p>
                  </Card>
                  <Button
                    variant="success"
                    className="w-100"
                    onClick={handlePayment}
                    disabled={paymentProcessing}
                  >
                    {paymentProcessing ? 'Processing Payment...' : 'Pay Now'}
                  </Button>
                  <Button
                    variant="outline-secondary"
                    className="w-100 mt-2"
                    onClick={() => setShowPayment(false)}
                    disabled={paymentProcessing}
                  >
                    Back to Shipping
                  </Button>
                </>
              )}
              {!user && (
                <Alert variant="warning">
                  Please <a href="/login">log in</a> to proceed with checkout.
                </Alert>
              )}
            </Card.Body>
          </Card>
        </div>
      </div>
    </div>
  );
}