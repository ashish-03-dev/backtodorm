import React from 'react';
import { Offcanvas, Button, ListGroup, Image } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import '../../styles/CartSidebar.css';

export default function CartSidebar({ cartItems, show, onClose, removeFromCart, updateQuantity }) {
  const navigate = useNavigate();

  const handleGoToCheckout = () => {
    onClose();
    navigate('/checkout');
  };

  const totalPrice = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);

  const handleUpdateQuantity = (posterId, selectedSize, newQuantity) => {
    if (typeof updateQuantity !== 'function') {
      console.error('updateQuantity is not a function');
      return;
    }
    updateQuantity(posterId, selectedSize, newQuantity);
  };

  const handleRemoveFromCart = (posterId, selectedSize) => {
    if (typeof removeFromCart !== 'function') {
      console.error('removeFromCart is not a function');
      return;
    }
    removeFromCart(posterId, selectedSize);
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
              {cartItems.map((item) => (
                <ListGroup.Item
                  key={`${item.posterId}-${item.selectedSize}`}
                  className="d-flex align-items-center mb-3 border-bottom pb-2"
                >
                  {item.image && (
                    <Image
                      src={item.image || 'https://via.placeholder.com/60'}
                      alt={item.title}
                      style={{ width: '60px', aspectRatio: '4/5', objectFit: 'cover' }}
                      className="me-3 rounded"
                    />
                  )}
                  <div className="flex-grow-1">
                    <h6 className="mb-1">{item.title}</h6>
                    <p className="mb-1 text-muted">Size: {item.selectedSize}</p>
                    <p className="mb-1">₹{item.price} x {item.quantity}</p>
                    <div className="d-flex align-items-center">
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        onClick={() => handleUpdateQuantity(item.posterId, item.selectedSize, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                      >
                        -
                      </Button>
                      <span className="mx-2">{item.quantity}</span>
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        onClick={() => handleUpdateQuantity(item.posterId, item.selectedSize, item.quantity + 1)}
                      >
                        +
                      </Button>
                    </div>
                  </div>
                  <Button
                    variant="outline-danger"
                    size="sm"
                    onClick={() => handleRemoveFromCart(item.posterId, item.selectedSize)}
                    className="ms-3"
                  >
                    Remove
                  </Button>
                </ListGroup.Item>
              ))}
            </ListGroup>
          )}
        </Offcanvas.Body>
        <div className="p-3 border-top">
          <h6 className="fw-semibold">Total: ₹{totalPrice}</h6>
          <Button
            onClick={handleGoToCheckout}
            className="btn btn-dark w-100 mt-3"
            disabled={cartItems.length === 0}
          >
            <i className="bi bi-cart-check me-2"></i> Go to Checkout
          </Button>
        </div>
      </Offcanvas>
    </>
  );
}