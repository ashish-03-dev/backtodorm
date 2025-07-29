import React from 'react';
import { Offcanvas, Button, ListGroup, Image, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useCartContext } from '../../context/CartContext';
import { BsDash, BsPlus, BsTrash, BsTruck, BsCartCheck } from 'react-icons/bs';
import '../../styles/CartSidebar.css';

export default function CartSidebar({ show, onClose }) {
  const { cartItems = [], removeFromCart, updateQuantity, deliveryCharge = 0, freeDeliveryThreshold = 0, loading } = useCartContext();
  const navigate = useNavigate();

  const handleGoToCheckout = () => {
    onClose();
    navigate('/checkout');
  };

  // Group items by collectionId and finish for collections, or posterId, size, and finish for individual posters
  const groupedByCollection = (cartItems || []).reduce((acc, item) => {
    const key = item.type === 'collection'
      ? `collection-${item.collectionId}-${item.finish || 'Gloss'}`
      : `individual-${item.posterId || item.id}-${item.size}-${item.finish || 'Gloss'}`;
    if (!acc[key]) {
      acc[key] = {
        items: [],
        collectionDiscount: item.type === 'collection' ? item.collectionDiscount || 0 : 0,
        type: item.type,
        collectionId: item.type === 'collection' ? item.collectionId : null,
        finish: item.type === 'collection' ? item.finish || 'Gloss' : null,
      };
    }
    acc[key].items.push(item);
    return acc;
  }, {});

  // Calculate total using finalPrice directly, without reapplying discount
  const totalPrice = Object.values(groupedByCollection).reduce((acc, group) => {
    const groupTotal = group.items.reduce((sum, item) => {
      if (item.type === 'collection') {
        // Sum finalPrice of posters in collection, apply collection-level discount
        const collectionSum = (item.posters || []).reduce((pSum, p) => pSum + (p.finalPrice || p.price || 0), 0);
        return sum + collectionSum * (item.quantity || 1) * (1 - group.collectionDiscount / 100);
      }
      // Use finalPrice for individual posters
      return sum + (item.finalPrice || item.price || 0) * (item.quantity || 1);
    }, 0);
    return acc + groupTotal;
  }, 0);

  const isFreeDelivery = totalPrice >= freeDeliveryThreshold;
  const finalDeliveryCharge = isFreeDelivery ? 0 : deliveryCharge;
  const totalWithDelivery = cartItems.length > 0 ? (totalPrice + finalDeliveryCharge).toFixed(2) : '0.00';

  const handleUpdateQuantity = (id, size, finish, newQuantity, isCollection = false) => {
    if (newQuantity < 1) return;
    updateQuantity(id, size, finish, newQuantity, isCollection);
  };

  const handleRemoveFromCart = (id, size, finish, isCollection = false) => {
    if (!id) {
      console.error('Invalid ID:', id);
      return;
    }
    removeFromCart(id, size, finish, isCollection);
  };

  if (loading) {
    return (
      <Offcanvas
        show={show}
        onHide={onClose}
        placement="end"
        name="cart"
        className={`cart-sidebar ${show ? 'open' : ''}`}
        style={{ width: window.innerWidth <= 768 ? '320px' : '400px' }}
      >
        <Offcanvas.Header closeButton>
          <Offcanvas.Title>Your Cart</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body className="p-3 d-flex justify-content-center align-items-center">
          <Spinner animation="border" variant="primary" />
          <span className="ms-2">Loading cart...</span>
        </Offcanvas.Body>
      </Offcanvas>
    );
  }

  return (
    <>
      <div className={`cart-sidebar-overlay ${show ? 'show' : ''}`} onClick={onClose}></div>
      <Offcanvas
        show={show}
        onHide={onClose}
        placement="end"
        name="cart"
        className={`cart-sidebar ${show ? 'open' : ''}`}
        style={{ width: window.innerWidth <= 768 ? '320px' : '400px' }}
      >
        <Offcanvas.Header closeButton>
          <Offcanvas.Title>Your Cart ({cartItems.length} items)</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body
          className="p-3 flex-grow-1"
          style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 200px)' }}
        >
          {cartItems.length === 0 ? (
            <p className="text-center text-muted">No items in cart yet.</p>
          ) : (
            <ListGroup variant="flush">
              {Object.entries(groupedByCollection).map(([groupId, group]) => (
                <React.Fragment key={groupId}>
                  {group.items.map((item, index) => (
                    <ListGroup.Item
                      key={`${groupId}-${index}`}
                      className="d-flex align-items-start mb-3 border-bottom pb-2"
                    >
                      {item.type === 'collection' ? (
                        <>
                          <Image
                            src={item.posters[0]?.image}
                            alt="Collection thumbnail"
                            title="Collection image"
                            style={{ width: '60px', aspectRatio: '4/5', objectFit: 'cover' }}
                            className="me-3 rounded flex-shrink-0"
                          />
                          <div className="flex-grow-1">
                            <h6 className="mb-1">Collection: {item.collectionId} (Finish: {item.finish || 'Gloss'})</h6>
                            <ul className="mb-2 ps-3">
                              {item.posters.map((poster, i) => (
                                <li key={i} className="text-muted small">
                                  {poster.title || 'Untitled'} ({poster.size || 'N/A'}) -{' '}
                                  {poster.discount > 0 ? (
                                    <>
                                      <span className="text-danger me-1">↓ {poster.discount}%</span>
                                      <span className="text-decoration-line-through me-1">
                                        ₹{(poster.price || 0).toLocaleString('en-IN')}
                                      </span>
                                      <span className="text-success me-1">
                                        ₹{(poster.finalPrice || 0).toLocaleString('en-IN')}
                                      </span>
                                    </>
                                  ) : (
                                    <span>
                                      ₹{(poster.price || 0).toLocaleString('en-IN')}
                                    </span>
                                  )}
                                </li>
                              ))}
                            </ul>
                            <p className="mb-2 d-flex align-items-center flex-wrap">
                              {group.collectionDiscount > 0 ? (
                                <>
                                  <span className="text-danger fw-semibold me-2">
                                    ↓ {group.collectionDiscount}%
                                  </span>
                                  <span className="text-muted text-decoration-line-through me-2">
                                    ₹{(
                                      (item.posters || []).reduce((sum, p) => sum + (p.price || 0), 0) *
                                      (item.quantity || 1)
                                    ).toLocaleString('en-IN')}
                                  </span>
                                  <span className="text-success fw-semibold">
                                    ₹{(
                                      (item.posters || []).reduce((sum, p) => sum + (p.finalPrice || p.price || 0), 0) *
                                      (item.quantity || 1) *
                                      (1 - group.collectionDiscount / 100)
                                    ).toLocaleString('en-IN')}
                                  </span>
                                </>
                              ) : (
                                <span className="text-muted fw-semibold">
                                  ₹{(
                                    (item.posters || []).reduce((sum, p) => sum + (p.price || 0), 0) *
                                    (item.quantity || 1)
                                  ).toLocaleString('en-IN')}
                                </span>
                              )}
                            </p>
                            <div className="d-flex align-items-center gap-2">
                              <Button
                                variant="outline-secondary"
                                size="sm"
                                onClick={() =>
                                  handleUpdateQuantity(item.collectionId, '', item.finish || 'Gloss', item.quantity - 1, true)
                                }
                                disabled={item.quantity <= 1}
                                className="d-flex align-items-center justify-content-center"
                                style={{ width: '30px', height: '30px', lineHeight: '1' }}
                                aria-label={`Decrease quantity of collection ${item.collectionId}`}
                              >
                                <BsDash className="fs-6" />
                              </Button>
                              <span className="mx-2">{item.quantity || 1}</span>
                              <Button
                                variant="outline-secondary"
                                size="sm"
                                onClick={() =>
                                  handleUpdateQuantity(item.collectionId, '', item.finish || 'Gloss', item.quantity + 1, true)
                                }
                                className="d-flex align-items-center justify-content-center"
                                style={{ width: '30px', height: '30px', lineHeight: '1' }}
                                aria-label={`Increase quantity of collection ${item.collectionId}`}
                              >
                                <BsPlus className="fs-6" />
                              </Button>
                            </div>
                          </div>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => handleRemoveFromCart(item.collectionId, '', item.finish || 'Gloss', true)}
                            className="ms-3 d-flex align-items-center justify-content-center flex-shrink-0"
                            style={{ width: '30px', height: '30px', lineHeight: '1' }}
                            aria-label={`Remove collection ${item.collectionId} from cart`}
                          >
                            <BsTrash className="fs-6" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Image
                            src={item.image || 'https://via.placeholder.com/60'}
                            alt={item.title || 'Cart item'}
                            style={{ width: '60px', aspectRatio: '4/5', objectFit: 'cover' }}
                            className="me-3 rounded flex-shrink-0"
                            title={item.title || 'Untitled'}
                          />
                          <div
                            className="flex-grow-1"
                            style={{ maxWidth: 'calc(100% - 100px)' }}
                          >
                            <h6
                              className="mb-1"
                              title={item.title || 'Untitled'}
                              style={{ maxWidth: '100%', overflow: 'hidden' }}
                            >
                              {item.title || 'Untitled'} ({item.size || 'N/A'}, Finish: {item.finish || 'Gloss'})
                            </h6>
                            <p className="mb-2 d-flex align-items-center">
                              {item.discount > 0 ? (
                                <>
                                  <span className="text-danger fw-semibold">↓ {item.discount}%</span>
                                  <span className="text-muted text-decoration-line-through me-2">
                                    ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                                  </span>
                                  <span className="text-success fw-semibold me-2">
                                    ₹{(item.finalPrice * item.quantity).toLocaleString('en-IN')}
                                  </span>
                                </>
                              ) : (
                                <span className="text-muted fw-semibold">
                                  ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                                </span>
                              )}
                            </p>
                            <div className="d-flex align-items-center gap-2">
                              <Button
                                variant="outline-secondary"
                                size="sm"
                                onClick={() =>
                                  handleUpdateQuantity(item.posterId, item.size, item.finish || 'Gloss', item.quantity - 1, false)
                                }
                                disabled={item.quantity <= 1}
                                className="d-flex align-items-center justify-content-center"
                                style={{ width: '30px', height: '30px', lineHeight: '1' }}
                                aria-label={`Decrease quantity of ${item.title || 'item'}`}
                              >
                                <BsDash className="fs-6" />
                              </Button>
                              <span className="mx-2">{item.quantity || 1}</span>
                              <Button
                                variant="outline-secondary"
                                size="sm"
                                onClick={() =>
                                  handleUpdateQuantity(item.posterId, item.size, item.finish || 'Gloss', item.quantity + 1, false)
                                }
                                className="d-flex align-items-center justify-content-center"
                                style={{ width: '30px', height: '30px', lineHeight: '1' }}
                                aria-label={`Increase quantity of ${item.title || 'item'}`}
                              >
                                <BsPlus className="fs-6" />
                              </Button>
                            </div>
                          </div>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() =>
                              handleRemoveFromCart(item.posterId, item.size, item.finish || 'Gloss', false)
                            }
                            className="ms-3 d-flex align-items-center justify-content-center flex-shrink-0"
                            style={{ width: '30px', height: '30px', lineHeight: '1' }}
                            aria-label={`Remove ${item.title || 'item'} from cart`}
                            title="Remove item"
                          >
                            <BsTrash className="fs-6" />
                          </Button>
                        </>
                      )}
                    </ListGroup.Item>
                  ))}
                </React.Fragment>
              ))}
            </ListGroup>
          )}
        </Offcanvas.Body>
        <div className="p-3 border-top">
          <div className="mb-3">
            {cartItems.length > 0 ? (
              <>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span>Subtotal</span>
                  <span>₹{totalPrice.toLocaleString('en-IN')}</span>
                </div>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="d-flex align-items-center">
                    <BsTruck className="me-2 text-primary" style={{ fontSize: '1rem' }} />
                    Delivery
                  </span>
                  {isFreeDelivery ? (
                    <span>
                      <span className="text-decoration-line-through text-muted me-1">
                        ₹{deliveryCharge.toLocaleString('en-IN')}
                      </span>
                      <span className="text-success">Free</span>
                    </span>
                  ) : (
                    <span>₹{deliveryCharge.toLocaleString('en-IN')}</span>
                  )}
                </div>
                {!isFreeDelivery && freeDeliveryThreshold > 0 && (
                  <p className="text-muted small mt-1">
                    Add ₹{(freeDeliveryThreshold - totalPrice).toLocaleString('en-IN')} more for free delivery!
                  </p>
                )}
                <div className="d-flex justify-content-between align-items-center mt-2 pt-2 border-top">
                  <strong>Total</strong>
                  <strong>₹{totalWithDelivery.toLocaleString('en-IN')}</strong>
                </div>
              </>
            ) : (
              <div className="d-flex justify-content-between align-items-center">
                <strong>Total</strong>
                <strong>₹0.00</strong>
              </div>
            )}
          </div>
          <Button
            onClick={handleGoToCheckout}
            variant="dark"
            className="w-100 d-flex align-items-center justify-content-center"
            disabled={cartItems.length === 0 || loading}
            style={{ height: '40px', lineHeight: '1' }}
          >
            <BsCartCheck className="me-2 fs-6" /> Go to Checkout
          </Button>
        </div>
      </Offcanvas>
    </>
  );
}