import React from 'react';

export default function CartSidebar({ cartItems }) {
  return (
    <div
      className="offcanvas offcanvas-end"
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
              <h6 className="mb-1">{item.title}</h6>
              <p className="mb-0 text-muted">{item.price}</p>
            </div>
          ))
        )}
        <button className="btn btn-dark w-100 mt-3">Go to Checkout</button>
      </div>
    </div>
  );
}
