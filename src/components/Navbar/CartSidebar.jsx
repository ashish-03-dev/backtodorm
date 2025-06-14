import { useRef, useEffect } from 'react';
import '../../styles/CartSidebar.css';
import { Link, useNavigate } from 'react-router-dom';

export default function CartSidebar({ cartItems, show, onClose }) {
  const navigate = useNavigate();

  const handleGoToCheckout = () => {
    onClose();
    navigate("/checkout");
  };

  return (
    <>
      {/* Overlay */}
      < div className={`cart-sidebar-overlay ${show ? "show" : ""}`} onClick={onClose} ></div >

      <div className={`cart-sidebar ${show ? "open" : ""}`}>
        {/* Header */}
        <div className="d-flex justify-content-between align-items-center p-3 border-bottom">
          <h5 className="mb-0">Your Cart</h5>
          <button className="btn-close" onClick={onClose}></button>
        </div>

        {/* Body */}
        <div className="p-3 flex-grow-1 overflow-auto">
          {cartItems.length === 0 ? (
            <p>No items in cart yet.</p>
          ) : (
            cartItems.map((item, index) => (
              <div key={index} className="d-flex mb-3 border-bottom pb-2">
                <img
                  src={item.image}
                  alt={item.title}
                  style={{ width: "60px", aspectRatio:"4/5", objectFit: "cover" }}
                  className="me-3 rounded"
                />
                <div>
                  <h6 className="mb-1">{item.title}</h6>
                  <p className="mb-0 text-muted">₹{item.price}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-top">
          <h6 className="fw-semibold">
            Total: ₹{cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0)}
          </h6>
          <button onClick={handleGoToCheckout} className="btn btn-dark w-100 mt-3">
            <i className="bi bi-cart-check me-2"></i> Go to Checkout
          </button>
        </div>
      </div>
    </>
  );
}
