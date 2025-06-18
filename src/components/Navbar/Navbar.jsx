import React, { useState } from "react";
import NavLinks from "./Navlinks";
import AccountDropdown from "./AccountDropDown";
import CartSidebar from "./CartSidebar";
import MobileSidebar from './MobileSidebar';
import "bootstrap/dist/css/bootstrap.min.css";
import { useFirebase } from "../../context/FirebaseContext";
import { useNavigate } from "react-router-dom";

export default function NavbarComponent({ cartItems = [], removeFromCart, updateQuantity }) {
  const { user, logout } = useFirebase();
  const isLoggedIn = !!user;
  const [showSidebar, setShowSidebar] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const navigate = useNavigate();

  return (
    <>
      <nav
        className="d-flex sticky-top w-100 px-3 px-md-5 justify-content-between align-items-center bg-white shadow-sm"
        role="banner"
        style={{ height: "65px" }}
      >
        <nav className="col-md-3 d-flex align-items-center">
          <button
            className="btn btn-outline-dark d-lg-none me-3"
            onClick={() => setShowSidebar(true)}
            aria-label="Open Shop Categories"
          >
            <i className="fas fa-bars"></i>
          </button>
          <a className="navbar-brand fw-bold fs-4 mb-0 ms-md-4" href="/">
            BackToDorm
          </a>
        </nav>

        <NavLinks />

        <div className="col-md-3 h-100 d-flex align-items-center justify-content-end position-relative">
          <button
            className="btn bg-light mx-1 mx-md-2 border"
            type="button"
            onClick={() => navigate("/search")}
            style={{ height: "35px", padding: "0 10px" }}
            aria-label="Search Posters"
          >
            <i className="bi bi-search fs-5"></i>
          </button>

          <AccountDropdown isLoggedIn={isLoggedIn} logout={logout} />

          <button
            className="btn bg-light position-relative mx-1 mx-md-2 border"
            type="button"
            onClick={() => setShowCart(true)}
            style={{ height: "35px" }}
          >
            🛒 Cart
            {cartItems.length > 0 && (
              <span
                className="position-absolute top-0 start-100 translate-middle bg-primary text-white d-flex align-items-center justify-content-center"
                style={{
                  width: "18px",
                  height: "18px",
                  borderRadius: "50%",
                  fontSize: "0.65rem",
                }}
              >
                {cartItems.length}
                <span className="visually-hidden">items in cart</span>
              </span>
            )}
          </button>
        </div>
      </nav>

      <MobileSidebar show={showSidebar} onClose={() => setShowSidebar(false)} />
      <CartSidebar
        cartItems={cartItems}
        show={showCart}
        onClose={() => setShowCart(false)}
        removeFromCart={removeFromCart}
        updateQuantity={updateQuantity}
      />
    </>
  );
}