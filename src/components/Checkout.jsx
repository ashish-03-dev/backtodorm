import React, { useState, useEffect } from 'react';
import { useCartContext } from '../context/CartContext';
import { useNavigate } from 'react-router-dom';
import { useFirebase } from '../context/FirebaseContext';
import { useAddress } from '../context/AddressContext';
import { httpsCallable } from 'firebase/functions';
import { Form, Button, Alert, ListGroup, Card, Modal, Spinner } from 'react-bootstrap';
import { BsTruck, BsTrash } from 'react-icons/bs';
import AddressForm from './Account/AddressForm'; // Adjust the path as needed

const AddressOverlay = ({ show, onHide, addresses, handleAddressSelect, setShowForm }) => {
  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Select Address</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <ListGroup variant="flush">
          {addresses.length === 0 && (
            <ListGroup.Item className="text-muted pb-4">
              No saved addresses found.
            </ListGroup.Item>
          )}
          {addresses.map((addr) => (
            <ListGroup.Item
              key={addr.id}
              action
              className="py-3"
              onClick={() => {
                handleAddressSelect(addr.id);
                onHide();
              }}
            >
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <div className="fw-semibold">
                    {addr.title || addr.name} <span className="ms-2 text-muted small">+91 {addr.phone}</span>
                  </div>
                  <div className="small text-muted">
                    {addr.address}, {addr.locality}, {addr.city}
                    {addr.landmark && `, ${addr.landmark}`}<br />
                    {addr.state} - {addr.pincode}
                  </div>
                </div>
              </div>
            </ListGroup.Item>
          ))}
          <ListGroup.Item
            action
            onClick={() => {
              setShowForm(true);
              onHide();
            }}
            className="text-primary text-center fw-semibold mt-3"
          >
            + Add New Address
          </ListGroup.Item>
        </ListGroup>
      </Modal.Body>
    </Modal>
  );
};

const Checkout = () => {
  const { user, firestore, userData, authLoading, loadingUserData, functions } = useFirebase();
  const { addresses, getAddressList, addAddress, loading: addressLoading } = useAddress();
  const { cartItems = [], buyNowItem, setCartItems, setBuyNowItem, removeFromCart, loading: cartLoading, deliveryCharge = 0, freeDeliveryThreshold = 0 } = useCartContext();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: '', name: userData?.name || '', phone: userData?.phone || '', address: '',
    locality: '', city: '', state: '', pincode: '', landmark: '',
  });
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);

  const items = buyNowItem ? [buyNowItem] : cartItems || [];
  const subtotal = items.length > 0
    ? items.reduce((sum, item) => {
      const price = item.type === 'collection'
        ? (item.posters || []).reduce((pSum, p) => pSum + (p.finalPrice || p.price || 0), 0) * (item.quantity || 1)
        : (item.finalPrice || item.price || 0) * (item.quantity || 1);
      const discount = item.type === 'collection' ? (item.collectionDiscount || 0) : 0;
      return sum + price * (1 - discount / 100);
    }, 0)
    : 0;

  const isFreeDelivery = subtotal >= freeDeliveryThreshold;
  const finalDeliveryCharge = items.length > 0 && !isFreeDelivery ? deliveryCharge : 0;
  const totalPrice = items.length > 0 ? (subtotal + finalDeliveryCharge).toFixed(2) : '0.00';

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    return () => document.body.removeChild(script);
  }, []);

  useEffect(() => {
    if (authLoading || loadingUserData || addressLoading || cartLoading || !user || !firestore) return;
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
  }, [user, authLoading, loadingUserData, addressLoading, cartLoading, firestore, getAddressList, selectedAddressId]);

  const handleAddressSelect = (id) => {
    setSelectedAddressId(id);
    const selected = addresses.find(addr => addr.id === id);
    if (selected) setFormData(selected);
    else setFormData({ title: '', name: userData?.name || '', phone: userData?.phone || '', address: '', locality: '', city: '', state: '', pincode: '', landmark: '' });
    setShowPayment(false);
  };

  const handleRemoveItem = (item) => {
    const isCollection = item.type === 'collection';
    const id = isCollection ? item.collectionId : item.posterId;
    const size = isCollection ? '' : item.size;
    const finish = item.finish || 'Gloss';

    removeFromCart(id, size, finish, isCollection);

    // If the removed item is the buyNowItem, clear it
    if (buyNowItem && buyNowItem.id === item.id) {
      setBuyNowItem(null);
    }
  };

  const handleProceedToPayment = (e) => {
    e.preventDefault();
    if (!user) return setError('You must be logged in.');
    if (!selectedAddressId || !formData.name) return setError('Please select or add an address.');
    if (!formData.phone || formData.phone.length < 10) return setError('Please provide a valid phone number.');
    if (items.length === 0) return setError('Your cart is empty.');
    setShowPayment(true);
  };

  const handlePayNow = async () => {
    if (!selectedAddressId || !formData.name) return setError('Please select an address.');
    if (!window.Razorpay) return setError('Payment gateway not loaded.');
    if (items.length === 0) return setError('Your cart is empty.');
    setPaymentProcessing(true);

    try {
      const createRazorpayOrder = httpsCallable(functions, 'createRazorpayOrder');
      const result = await createRazorpayOrder({
        subtotal: parseFloat(subtotal.toFixed(2)),
        deliveryCharge: parseFloat(finalDeliveryCharge.toFixed(2)),
        total: parseFloat(totalPrice),
        items: items.map(item => ({
          type: item.type || 'poster',
          finish: item.finish || 'Gloss', // Include finish for collections and standalone posters
          ...(item.type === 'collection' ? {
            collectionId: item.collectionId || 'unknown',
            quantity: item.quantity || 1,
            collectionDiscount: item.collectionDiscount || 0,
            posters: (item.posters || []).map(poster => ({
              posterId: poster.posterId || 'unknown',
              size: poster.size || 'N/A',
              price: poster.price || 0,
              finalPrice: poster.finalPrice || poster.price || 0,
              discount: poster.discount || 0,
              title: poster.title || 'Untitled',
              image: poster.image || 'https://via.placeholder.com/50',
              seller: poster.seller || 'Unknown',
            })),
          } : {
            posterId: item.posterId || 'unknown',
            size: item.size || 'N/A',
            quantity: item.quantity || 1,
            price: item.price || 0,
            finalPrice: item.finalPrice || item.price || 0,
            discount: item.discount || 0,
            title: item.title || 'Untitled',
            image: item.image || 'https://via.placeholder.com/50',
            seller: item.seller || 'Unknown',
            collectionId: item.collectionId || null,
            collectionDiscount: item.collectionDiscount || 0,
          }),
        })),
        shippingAddress: formData,
        isBuyNow: !!buyNowItem,
      });

      const { orderId, amount, currency } = result.data;

      const options = {
        key: process.env.REACT_APP_RAZORPAY_KEY_ID,
        amount: amount.toString(),
        currency: currency || 'INR',
        name: 'Back to Dorm',
        description: buyNowItem ? 'Buy Now Purchase' : 'Cart Purchase',
        image: 'https://res.cloudinary.com/dqu3mzqfj/image/upload/v1750098712/image3_qsn98g.webp',
        order_id: orderId,
        prefill: { name: formData.name, email: userData?.email || '', contact: formData.phone },
        notes: {
          address: `${formData.address}, ${formData.locality}, ${formData.city}, ${formData.state} - ${formData.pincode}`,
          userId: user.uid,
          subtotal: parseFloat(subtotal.toFixed(2)),
          deliveryCharge: parseFloat(finalDeliveryCharge.toFixed(2)),
          total: parseFloat(totalPrice),
        },
        theme: { color: '#3399cc' },
        handler: async (response) => {
          try {
            const verifyRazorpayPayment = httpsCallable(functions, 'verifyRazorpayPayment');
            const verifyResult = await verifyRazorpayPayment({
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            });

            if (verifyResult.data.success) {
              if (buyNowItem) setBuyNowItem(null);
              else {
                setCartItems([]);
                localStorage.removeItem('cartItems');
              }
              navigate('/account/orders', { state: { orderSuccess: true, orderId: verifyResult.data.orderId } });
            }
          } catch (err) {
            setError(`Payment verification failed: ${err.message}. Please check your order status.`);
          } finally {
            setPaymentProcessing(false);
            setShowPayment(false);
          }
        },
        modal: {
          ondismiss: () => {
            setPaymentProcessing(false);
            setShowPayment(false);
            setError('Payment was not completed. Please check your order status.');
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      setError(`Failed to create order: ${err.message}. Please try again.`);
      setPaymentProcessing(false);
    }
  };

  if (authLoading || loadingUserData || addressLoading || cartLoading) {
    return (
      <div className="text-center my-4">
        <Spinner animation="border" variant="primary" />
        <p>Loading checkout...</p>
      </div>
    );
  }

  if (!user) {
    return <Alert variant="danger" onClose={() => setError('')} dismissible>Please log in to access checkout.</Alert>;
  }

  return (
    <div className="container my-4" style={{ minHeight: "calc(100svh - 65px)" }}>
      <h2 className="mb-3">Checkout</h2>
      {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}
      <div className="row g-3">
        <div className="col-md-6">
          <Card>
            <Card.Body className="p-3">
              <h4 className="mb-2">Order Summary</h4>
              {items.length === 0 ? (
                <p className="text-muted">Your cart is empty.</p>
              ) : (
                <ListGroup variant="flush">
                  {items.map((item, index) => (
                    <ListGroup.Item key={`${item.posterId || item.collectionId}-${item.size || 'collection'}-${item.finish || 'Gloss'}-${index}`} className="py-2">
                      <div className="d-flex align-items-center">
                        <img
                          src={item.image || (item.posters && item.posters[0]?.image) || 'https://via.placeholder.com/50'}
                          alt={item.title || 'Untitled'}
                          style={{ width: '50px', height: '50px', objectFit: 'cover', marginRight: '10px' }}
                        />
                        <div className="flex-grow-1">
                          <h6>
                            {item.type === 'collection'
                              ? `Collection: ${item.collectionId || 'Untitled'} (Finish: ${item.finish || 'Gloss'})`
                              : `${item.title || 'Untitled'} (${item.size || 'N/A'}, Finish: ${item.finish || 'Gloss'})`}
                          </h6>
                          <p className="mb-0">Quantity: {item.quantity || 1}</p>
                          {item.type !== 'collection' && item.discount > 0 && <p className="mb-0 text-success">Discount: {item.discount}%</p>}
                          {item.type === 'collection' && item.collectionDiscount > 0 && <p className="mb-0 text-success">Collection Discount: {item.collectionDiscount}%</p>}
                        </div>
                        <div className="d-flex align-items-center">
                          <p className="me-3 mb-0">
                            ₹{(
                              item.type === 'collection'
                                ? (item.posters || []).reduce((sum, p) => sum + (p.finalPrice || p.price || 0), 0) * (item.quantity || 1) * (1 - (item.collectionDiscount || 0) / 100)
                                : (item.finalPrice || item.price || 0) * (item.quantity || 1)
                            ).toLocaleString('en-IN')}
                          </p>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => handleRemoveItem(item)}
                            className="d-flex align-items-center justify-content-center"
                            style={{ width: '30px', height: '30px', lineHeight: '1' }}
                            aria-label={`Remove ${item.title || item.collectionId || 'item'} from cart`}
                          >
                            <BsTrash className="fs-6" />
                          </Button>
                        </div>
                      </div>
                      {item.type === 'collection' && (
                        <ul className="mt-2 ps-3 small text-muted">
                          {(item.posters || []).map((poster, i) => (
                            <li key={i}>
                              {poster.title || 'Untitled'} ({poster.size || 'N/A'}) - ₹{(poster.finalPrice || poster.price || 0).toLocaleString('en-IN')}
                              {poster.discount > 0 && <span className="text-success ms-1">({poster.discount}% off)</span>}
                            </li>
                          ))}
                        </ul>
                      )}
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              )}
              <hr className="my-2" />
              {items.length > 0 ? (
                <div>
                  <div className="d-flex justify-content-between mb-2">
                    <span>Subtotal</span>
                    <span>₹{subtotal.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-2">
                    <span className="d-flex align-items-center">
                      <BsTruck className="me-2 text-primary" style={{ fontSize: '1rem' }} />
                      Delivery
                    </span>
                    <span>
                      {isFreeDelivery ? (
                        <>
                          <span className="text-decoration-line-through text-muted me-1">
                            ₹{deliveryCharge.toLocaleString('en-IN')}
                          </span>
                          <span className="text-success">Free</span>
                        </>
                      ) : (
                        `₹${finalDeliveryCharge.toLocaleString('en-IN')}`
                      )}
                    </span>
                  </div>
                  {!isFreeDelivery && freeDeliveryThreshold > 0 && (
                    <p className="text-muted small mt-1 text-start">
                      Add ₹{(freeDeliveryThreshold - subtotal).toLocaleString('en-IN')} more for free delivery!
                    </p>
                  )}
                  <div className="d-flex justify-content-between mt-2 pt-2 border-top">
                    <h5>Total</h5>
                    <h5>₹{totalPrice.toLocaleString('en-IN')}</h5>
                  </div>
                </div>
              ) : (
                <div className="d-flex justify-content-between">
                  <h5>Total</h5>
                  <h5>₹0.00</h5>
                </div>
              )}
            </Card.Body>
          </Card>
        </div>
        <div className="col-md-6">
          <Card className="mb-3">
            <Card.Body className="p-3">
              <h4 className="mb-4">Shipping Details</h4>
              <div className="d-flex justify-content-between align-items-center mb-2 p-2">
                <span>Select Address</span>
                <span
                  className="text-primary"
                  style={{ cursor: 'pointer' }}
                  onClick={() => { setShowOverlay(true); setShowPayment(false); }}
                >
                  {selectedAddressId ? 'Change' : 'Add'}
                </span>
              </div>
              {selectedAddressId && formData.name && (
                <Card className="p-2 border-0 mb-4">
                  <p className="mb-1"><strong>{formData.title || formData.name}</strong> {formData.phone}</p>
                  <p className="mb-1 text-muted">{formData.address}, {formData.locality}, {formData.city}{formData.landmark && `, ${formData.landmark}`}</p>
                  <p className="mb-0 text-muted">{formData.state} - {formData.pincode}</p>
                </Card>
              )}
              {!showPayment && (
                <Button
                  variant="primary"
                  className="w-100"
                  onClick={handleProceedToPayment}
                  disabled={submitting || items.length === 0 || (!selectedAddressId && !formData.name) || cartLoading}
                >
                  Proceed to Payment
                </Button>
              )}
            </Card.Body>
          </Card>
          {showPayment && (
            <div className="border rounded p-3 mb-3">
              <h4 className="mb-3">Payment Options</h4>

              <div className="rounded p-2 mb-3">
                <div className="d-flex justify-content-between mb-1">
                  <span>Subtotal</span>
                  <span>₹{subtotal.toLocaleString('en-IN')}</span>
                </div>
                <div className="d-flex justify-content-between mb-1">
                  <span>Delivery</span>
                  <span>
                    {isFreeDelivery ? (
                      <>
                        <span className="text-decoration-line-through text-muted me-1">
                          ₹{deliveryCharge.toLocaleString('en-IN')}
                        </span>
                        <span className="text-success">Free</span>
                      </>
                    ) : (
                      `₹${finalDeliveryCharge.toLocaleString('en-IN')}`
                    )}
                  </span>
                </div>
                <div className="d-flex justify-content-between mb-1">
                  <span>Total</span>
                  <span>₹{totalPrice.toLocaleString('en-IN')}</span>
                </div>
                <p className="text-muted mt-2 mb-0">Pay via Razorpay</p>
              </div>

              <button
                className="btn btn-success w-100"
                onClick={handlePayNow}
                disabled={paymentProcessing || items.length === 0 || cartLoading}
              >
                {paymentProcessing ? (
                  <>
                    <span
                      className="spinner-border spinner-border-sm me-2"
                      role="status"
                      aria-hidden="true"
                    ></span>
                    Processing...
                  </>
                ) : (
                  'Pay Now'
                )}
              </button>
            </div>

          )}
          <AddressOverlay
            show={showOverlay}
            onHide={() => setShowOverlay(false)}
            addresses={addresses}
            handleAddressSelect={handleAddressSelect}
            setShowForm={() => { setShowForm(true); setShowOverlay(false); }}
          />
          {showForm && (
            <Modal size="lg" show={showForm} onHide={() => setShowForm(false)} centered>
              <Modal.Body className="p-0">
                <AddressForm
                  fetchAddresses={getAddressList}
                  addAddress={addAddress}
                  setShowForm={setShowForm}
                  initialData={null} // or pass a specific address if editing
                  isEditMode={false}
                  onSubmit={(newAddress) => {
                    setFormData(newAddress);
                    setSelectedAddressId(newAddress.id);
                    setShowOverlay(false);
                  }}
                  onCancel={() => {
                    setShowForm(false);
                    setShowOverlay(false);
                  }}
                />
              </Modal.Body>
            </Modal>
          )}
        </div>
      </div>
    </div>
  );
};

export default Checkout;