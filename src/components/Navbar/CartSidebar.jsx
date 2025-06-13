import React from 'react';
import '../../styles/CartSidebar.css';
import { Link } from 'react-router-dom';

export default function CartSidebar({ cartItems }) {
  return (
    <div
      className="offcanvas offcanvas-end custom-cart-offcanvas"
      tabIndex="-1"
      id="cartOffcanvas"
      aria-labelledby="cartOffcanvasLabel"
    >
      <div className="offcanvas-header">
        <h5 className="offcanvas-title" id="cartOffcanvasLabel">Your Cart</h5>
        <button
          type="button"
          className="btn-close"
          data-bs-dismiss="offcanvas"
          aria-label="Close"
        ></button>
      </div>

      <div className="offcanvas-body">
        {cartItems.length === 0 ? (
          <p>No items in cart yet.</p>
        ) : (
          cartItems.map((item, index) => (
            <div key={index} className="mb-2 border-bottom pb-2">
              <img
                src={item.image}
                alt={item.title}
                style={{ width: "60px", height: "60px", objectFit: "cover" }}
                className="me-3 rounded"
              />
              <h6 className="mb-1">{item.title}</h6>
              <p className="mb-0 text-muted">{item.price}</p>
            </div>
          ))
        )}

        {/* Checkout Section */}
        <div className="border-top pt-3">
          <h6 className="fw-semibold">Total: ₹{cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0)}</h6>
          <Link to="/checkout" className="btn btn-dark w-100 mt-3">
            <i className="bi bi-cart-check me-2"></i> Go to Checkout
          </Link>
        </div>

      </div>
    </div>
  );
}
