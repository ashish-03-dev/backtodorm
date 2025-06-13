import { useState } from "react";

export default function Checkout({ cartItems = [] }) {
  const [user, setUser] = useState({
    name: "",
    email: "",
    address: "",
  });

  const totalAmount = cartItems.reduce((sum, item) => sum + item.price, 0);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setUser({ ...user, [name]: value });
  };

  const handlePlaceOrder = () => {
    alert("Order Placed!");
    // TODO: integrate with Razorpay/Firebase
  };

  return (
    <div className="container py-5">
      <h2 className="fw-bold mb-4">Checkout</h2>

      <div className="row">
        {/* Cart Summary */}
        <div className="col-md-6 mb-4">
          <h5 className="fw-semibold mb-3">Your Posters</h5>
          {cartItems.length === 0 ? (
            <p className="text-muted">Your cart is empty.</p>
          ) : (
            <ul className="list-group">
              {cartItems.map((item) => (
                <li key={item.id} className="list-group-item d-flex justify-content-between align-items-center">
                  <span>{item.title}</span>
                  <span>₹{item.price}</span>
                </li>
              ))}
              <li className="list-group-item d-flex justify-content-between">
                <strong>Total</strong>
                <strong>₹{totalAmount}</strong>
              </li>
            </ul>
          )}
        </div>

        {/* Shipping Info */}
        <div className="col-md-6">
          <h5 className="fw-semibold mb-3">Shipping Info</h5>
          <form>
            <div className="mb-3">
              <label className="form-label">Full Name</label>
              <input type="text" name="name" className="form-control" onChange={handleInputChange} required />
            </div>

            <div className="mb-3">
              <label className="form-label">Email</label>
              <input type="email" name="email" className="form-control" onChange={handleInputChange} required />
            </div>

            <div className="mb-3">
              <label className="form-label">Shipping Address</label>
              <textarea name="address" className="form-control" rows="3" onChange={handleInputChange} required />
            </div>

            <button
              type="button"
              className="btn btn-dark w-100 mt-3"
              onClick={handlePlaceOrder}
              disabled={!user.name || !user.email || !user.address || cartItems.length === 0}
            >
              Place Order
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
