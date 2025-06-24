import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { useFirebase } from '../context/FirebaseContext';
import { useAddress } from '../context/AddressContext';
import { collection, addDoc, doc, deleteDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { Form, Button, Alert, ListGroup, Card, FormSelect, Spinner } from 'react-bootstrap';

const AddressForm = ({ setShowForm, getAddressList, addAddress, setFormData }) => {
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
      const updatedList = await getAddressList();
      setFormData(updatedList[0] || newAddress);
      setShowForm(false);
      setError('');
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
};

const Checkout = () => {
  const { user, firestore, userData, authLoading, loadingUserData, functions } = useFirebase();
  const { addresses, getAddressList, addAddress, loading: addressLoading, error: addressError } = useAddress();
  const { cartItems, buyNowItem, setCartItems, setBuyNowItem } = useOutletContext();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: '',
    name: userData?.name || '',
    phone: userData?.phone || '',
    address: '',
    locality: '',
    city: '',
    state: '',
    pincode: '',
    landmark: '',
    type: 'Home',
  });
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);

  const items = buyNowItem ? [buyNowItem] : cartItems || [];
  const groupedByCollection = items.reduce((acc, item) => {
    const key = item.collectionId ? `collection-${item.collectionId}` : `individual-${item.posterId || item.id}-${item.selectedSize}`;
    if (!acc[key]) {
      acc[key] = { items: [], discount: item.collectionDiscount || 0, type: item.type || 'poster' };
    }
    acc[key].items.push(item);
    return acc;
  }, {});
  const totalPrice = Object.values(groupedByCollection)
    .reduce((acc, group) => {
      const groupTotal = group.items.reduce((sum, item) => {
        if (group.type === 'collection') {
          return sum + (item.posters || []).reduce((pSum, p) => pSum + (p.price || 0), 0) * (item.quantity || 1);
        }
        return sum + (item.price || 0) * (item.quantity || 1);
      }, 0);
      return acc + groupTotal * (1 - group.discount / 100);
    }, 0)
    .toFixed(2);

  // Load Razorpay script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => console.log('Razorpay script loaded successfully');
    script.onerror = () => setError('Failed to load Razorpay script. Please try again.');
    document.body.appendChild(script);
    return () => document.body.removeChild(script);
  }, []);

  // Handle authentication and initial address fetch
  useEffect(() => {
    if (authLoading || loadingUserData || addressLoading) return;
    if (!user) {
      navigate('/login');
      return;
    }
    if (!firestore) {
      setError('Firestore is not available. Please try again later.');
      return;
    }

    const fetchAddresses = async () => {
      try {
        const addressList = await getAddressList();
        if (addressList.length > 0 && !selectedAddressId) {
          setSelectedAddressId(addressList[0].id);
          setFormData(addressList[0]);
        }
      } catch (err) {
        setError(`Failed to load addresses: ${err.message}`);
      }
    };
    fetchAddresses();
  }, [user, authLoading, loadingUserData, addressLoading, firestore, navigate, getAddressList, selectedAddressId]);

  // Handle Razorpay payment
  useEffect(() => {
    if (!showPayment || !window.Razorpay || paymentProcessing) return;

    const createOrder = async () => {
      setPaymentProcessing(true);
      try {
        if (!process.env.REACT_APP_RAZORPAY_KEY_ID) {
          throw new Error('Razorpay key is not configured.');
        }
        console.log('Calling createRazorpayOrder with:', {
          amount: parseFloat(totalPrice),
          itemsCount: items.length,
          shippingAddressKeys: Object.keys(formData),
          isBuyNow: !!buyNowItem,
          userId: user?.uid,
        });
        const createRazorpayOrder = httpsCallable(functions, 'createRazorpayOrder');
        const result = await createRazorpayOrder({
          amount: parseFloat(totalPrice),
          items: items.map((item) => ({
            type: item.type || 'poster',
            ...(item.type === 'collection'
              ? {
                  collectionId: item.collectionId || 'unknown',
                  quantity: item.quantity || 1,
                  collectionDiscount: item.collectionDiscount || 0,
                  posters: (item.posters || []).map((poster) => ({
                    posterId: poster.posterId || 'unknown',
                    size: poster.size || 'N/A',
                    price: poster.price || 0,
                    title: poster.title || 'Untitled',
                    image: poster.image || 'https://via.placeholder.com/50',
                    seller: poster.seller || null,
                  })),
                }
              : {
                  posterId: item.posterId || 'unknown',
                  size: item.selectedSize || 'N/A',
                  quantity: item.quantity || 1,
                  price: item.price || 0,
                  title: item.title || 'Untitled',
                  image: item.image || 'https://via.placeholder.com/50',
                  seller: item.seller || null,
                  collectionId: item.collectionId || null,
                  collectionDiscount: item.collectionDiscount || 0,
                }),
          })),
          shippingAddress: formData,
          isBuyNow: !!buyNowItem,
        });
        console.log('createRazorpayOrder response:', result.data);

        const { orderId, amount, currency } = result.data;

        const options = {
          key: process.env.REACT_APP_RAZORPAY_KEY_ID,
          amount: amount.toString(),
          currency: currency || 'INR',
          name: 'Back to Dorm',
          description: buyNowItem ? 'Buy Now Purchase' : 'Cart Purchase',
          image: 'https://res.cloudinary.com/dqu3mzqfj/image/upload/v1750098712/image3_qsn98g.webp',
          order_id: orderId,
          prefill: {
            name: formData.name || userData?.name || '',
            email: userData?.email || '',
            contact: formData.phone || userData?.phone || '',
          },
          notes: {
            address: `${formData.address}, ${formData.locality}, ${formData.city}, ${formData.state} - ${formData.pincode}`,
            userId: user.uid,
          },
          theme: {
            color: '#3399cc',
          },
          handler: async (response) => {
            try {
              console.log('Verifying payment:', {
                orderId: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
              });
              const verifyRazorpayPayment = httpsCallable(functions, 'verifyRazorpayPayment');
              const verifyResult = await verifyRazorpayPayment({
                orderId: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
              });
              console.log('verifyRazorpayPayment result:', verifyResult.data);

              const orderData = {
                customerId: user.uid,
                items: items.map((item) => ({
                  type: item.type || 'poster',
                  ...(item.type === 'collection'
                    ? {
                        collectionId: item.collectionId || 'unknown',
                        quantity: item.quantity || 1,
                        collectionDiscount: item.collectionDiscount || 0,
                        posters: (item.posters || []).map((poster) => ({
                          posterId: poster.posterId || 'unknown',
                          size: poster.size || 'N/A',
                          price: poster.price || 0,
                          title: poster.title || 'Untitled',
                          image: poster.image || 'https://via.placeholder.com/50',
                          seller: poster.seller || null,
                        })),
                      }
                    : {
                        posterId: item.posterId || 'unknown',
                        size: item.selectedSize || 'N/A',
                        quantity: item.quantity || 1,
                        price: item.price || 0,
                        title: item.title || 'Untitled',
                        image: item.image || 'https://via.placeholder.com/50',
                        seller: item.seller || null,
                        collectionId: item.collectionId || null,
                        collectionDiscount: item.collectionDiscount || 0,
                      }),
                })),
                totalPrice: parseFloat(totalPrice),
                orderDate: new Date().toISOString(),
                status: 'Pending',
                paymentStatus: 'Completed',
                paymentMethod: 'Razorpay',
                shippingAddress: formData,
                sentToSupplier: false,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
              };

              const orderRef = await addDoc(collection(firestore, 'orders'), orderData);
              await addDoc(collection(firestore, `userOrders/${user.uid}/orders`), {
                orderId: orderRef.id,
                orderDate: orderData.orderDate,
                status: orderData.status,
                totalPrice: orderData.totalPrice,
              });

              if (buyNowItem) {
                setBuyNowItem(null);
              } else {
                await Promise.all(
                  cartItems.map((item) => deleteDoc(doc(firestore, `users/${user.uid}/cart`, item.id)))
                );
                setCartItems([]);
                localStorage.removeItem('cartItems');
              }

              console.log('Order created successfully:', orderRef.id);
              navigate('/account/orders', { state: { orderSuccess: true } });
            } catch (err) {
              setError(`Payment verification failed: ${err.message}`);
              console.error('Payment verification error:', err);
            } finally {
              setPaymentProcessing(false);
            }
          },
          modal: {
            ondismiss: () => {
              console.log('Razorpay modal dismissed');
              setPaymentProcessing(false);
              setShowPayment(false);
            },
          },
        };

        console.log('Opening Razorpay with options:', {
          key: options.key,
          amount: options.amount,
          currency: options.currency,
          order_id: options.order_id,
          userId: user.uid,
        });
        const rzp = new window.Razorpay(options);
        rzp.open();
      } catch (err) {
        setError(`Failed to create order: ${err.message}`);
        console.error('Order creation error:', err);
        setPaymentProcessing(false);
      }
    };

    createOrder();
  }, [showPayment, user, firestore, functions, totalPrice, items, buyNowItem, formData, userData, navigate, setCartItems, setBuyNowItem]);

  const handleAddressSelect = (id) => {
    setSelectedAddressId(id);
    const selected = addresses.find((addr) => addr.id === id);
    console.log('Selected address:', selected); // Debug log
    if (selected) {
      setFormData(selected);
    } else {
      setFormData({
        title: '',
        name: userData?.name || '',
        phone: userData?.phone || '',
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
    if (!formData.phone || formData.phone.length < 10) {
      setError('Please provide a valid phone number.');
      return;
    }
    console.log('Proceeding to payment with address:', formData);
    setShowPayment(true);
  };

  if (authLoading || loadingUserData || addressLoading) {
    return (
      <div className="text-center my-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-2">Loading...</p>
      </div>
    );
  }

  if (addressError && !user) {
    return <Alert variant="danger" dismissible onClose={() => setError('')}>Please log in to access checkout.</Alert>;
  }

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
                    {group.type === 'collection' && (
                      <div className="mb-2">
                        <h6 className="fw-semibold">Collection Pack (Discount: {group.discount}%)</h6>
                      </div>
                    )}
                    {group.items.map((item, index) => (
                      <ListGroup.Item key={`${item.posterId || item.collectionId}-${item.selectedSize || 'collection'}-${index}`}>
                        <div className="d-flex align-items-center">
                          <img
                            src={item.image || (item.posters && item.posters[0]?.image) || 'https://via.placeholder.com/50'}
                            alt={`${item.title || 'Untitled'} (${item.selectedSize || 'Collection'})`}
                            style={{ width: '50px', height: '50px', objectFit: 'cover', marginRight: '10px' }}
                          />
                          <div className="flex-grow-1">
                            <h6>
                              {item.type === 'collection'
                                ? `Collection: ${item.collectionId || 'Untitled'}`
                                : `${item.title || 'Untitled'} (${item.selectedSize || 'N/A'})`}
                            </h6>
                            <p className="mb-0">Quantity: {item.quantity || 1}</p>
                            {group.discount > 0 && <p className="mb-0 text-success">Discount: {group.discount}%</p>}
                          </div>
                          <p>
                            ₹{(
                              (item.type === 'collection'
                                ? (item.posters || []).reduce((sum, p) => sum + (p.price || 0), 0) * (item.quantity || 1)
                                : (item.price || 0) * (item.quantity || 1)) * (1 - group.discount / 100)
                            ).toLocaleString('en-IN')}
                          </p>
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
              {user && !showPayment ? (
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
                      getAddressList={getAddressList}
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
              ) : user && showPayment ? (
                <>
                  <h4 className="mb-3">Payment Options</h4>
                  <Card className="p-3 mb-3">
                    <p className="mb-0">Total Amount: ₹{totalPrice.toLocaleString('en-IN')}</p>
                    <p className="text-muted">Pay via Razorpay</p>
                  </Card>
                  <Button
                    variant="success"
                    className="w-100"
                    disabled={paymentProcessing}
                    style={{ display: 'none' }}
                    id="rzp-button"
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
              ) : (
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
};

export default Checkout;