import React from 'react';
import { Offcanvas, Button, ListGroup, Image } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import '../../styles/CartSidebar.css';

export default function CartSidebar({ cartItems = [], show, onClose, removeFromCart, updateQuantity }) {
  const navigate = useNavigate();

  const handleGoToCheckout = () => {
    onClose();
    navigate('/checkout');
  };

  // Group items by collectionId to calculate discounted totals
  const groupedByCollection = cartItems.reduce((acc, item) => {
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

  const handleUpdateQuantity = (posterId, selectedSize, newQuantity) => {
    if (newQuantity < 1) return;
    updateQuantity(posterId, selectedSize || '', newQuantity);
  };

  const handleRemoveFromCart = (posterId, selectedSize) => {
    if (!posterId) {
      console.error('Invalid posterId:', posterId);
      return;
    }
    removeFromCart(posterId, selectedSize || '');
  };

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
        <Offcanvas.Body className="p-3 flex-grow-1 overflow-auto">
          {cartItems.length === 0 ? (
            <p className="text-center text-muted">No items in cart yet.</p>
          ) : (
            <ListGroup variant="flush">
              {Object.entries(groupedByCollection).map(([groupId, group]) => (
                <React.Fragment key={groupId}>
                  {groupId !== 'individual' && (
                    <div className="mb-2">
                      <h6 className="fw-semibold">Collection Pack (Discount: {group.discount}%)</h6>
                    </div>
                  )}
                  {group.items.map((item) => (
                    <ListGroup.Item
                      key={`${item.posterId}-${item.selectedSize || 'none'}`}
                      className="d-flex align-items-start mb-3 border-bottom pb-2"
                    >
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
                          className="mb-1 text-truncate"
                          title={item.title || 'Untitled'}
                          style={{ maxWidth: '100%', overflow: 'hidden' }}
                        >
                          {item.title || 'Untitled'} ({item.selectedSize || 'N/A'})
                        </h6>
                        {item.seller && <p className="mb-1 text-muted small">By: {item.seller}</p>}
                        <p className="mb-2">
                          ₹{((item.price || 0) * (item.quantity || 0) * (1 - (item.collectionDiscount || 0) / 100)).toLocaleString('en-IN')} 
                          {item.collectionDiscount > 0 && <span className="text-success ms-1">({item.collectionDiscount}% off)</span>}
                        </p>
                        <div className="d-flex align-items-center gap-2">
                          <Button
                            variant="outline-secondary"
                            size="sm"
                            onClick={() => handleUpdateQuantity(item.posterId, item.selectedSize, item.quantity - 1)}
                            disabled={item.quantity <= 1}
                            className="d-flex align-items-center justify-content-center"
                            style={{ width: '30px', height: '30px', lineHeight: '1' }}
                            aria-label={`Decrease quantity of ${item.title || 'item'}`}
                          >
                            <i className="bi bi-dash fs-6"></i>
                          </Button>
                          <span className="mx-2">{item.quantity || 0}</span>
                          <Button
                            variant="outline-secondary"
                            size="sm"
                            onClick={() => handleUpdateQuantity(item.posterId, item.selectedSize, item.quantity + 1)}
                            className="d-flex align-items-center justify-content-center"
                            style={{ width: '30px', height: '30px', lineHeight: '1' }}
                            aria-label={`Increase quantity of ${item.title || 'item'}`}
                          >
                            <i className="bi bi-plus fs-6"></i>
                          </Button>
                        </div>
                      </div>
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => handleRemoveFromCart(item.posterId, item.selectedSize)}
                        className="ms-3 d-flex align-items-center justify-content-center flex-shrink-0"
                        style={{ width: '30px', height: '30px', lineHeight: '1' }}
                        aria-label={`Remove ${item.title || 'item'} from cart`}
                        title="Remove item"
                      >
                        <i className="bi bi-trash fs-6"></i>
                      </Button>
                    </ListGroup.Item>
                  ))}
                </React.Fragment>
              ))}
            </ListGroup>
          )}
        </Offcanvas.Body>
        <div className="p-3 border-top">
          <h6 className="fw-semibold mb-3">Total: ₹{totalPrice.toLocaleString('en-IN')}</h6>
          <Button
            onClick={handleGoToCheckout}
            variant="dark"
            className="w-100 d-flex align-items-center justify-content-center"
            disabled={cartItems.length === 0}
            style={{ height: '40px', lineHeight: '1' }}
          >
            <i className="bi bi-cart-check me-2 fs-6"></i> Go to Checkout
          </Button>
        </div>
      </Offcanvas>
    </>
  );
}