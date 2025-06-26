import React, { useState } from "react";
import NavLinks from "./Navlinks";
import AccountDropdown from "./AccountDropDown";
import CartSidebar from "./CartSidebar";
import MobileSidebar from './MobileSidebar';
import "bootstrap/dist/css/bootstrap.min.css";
import { useFirebase } from "../../context/FirebaseContext";
import { useNavigate } from "react-router-dom";
import { useCartContext } from "../../context/CartContext";

export default function NavbarComponent() {
  const { cartItems } = useCartContext();
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
        <nav className="col-md-3 d-flex flex-grow-1 align-items-center">
          <button
            className="btn btn-outline-dark d-lg-none me-3"
            onClick={() => setShowSidebar(true)}
            aria-label="Open Shop Categories"
          >
            <i className="fas fa-bars fs-6"></i>
          </button>
          <a className="navbar-brand fw-bold fs-4 mb-0 ms-md-4" href="/">
            <img
              src="/android-chrome-192x192.png"
              alt="backtodorm logo"
              style={{ width: "50px", marginRight: "10px" }}
            />
            B. T. D.
          </a>
        </nav>

        <NavLinks />

        <div className="col-md-3 h-100 d-flex align-items-center flex-grow-1 justify-content-end position-relative" style={{ maxWidth: "50%" }}>
          <button
            className="btn px-3 mx-1 mx-md-2 align-items-center"
            type="button"
            onClick={() => navigate("/search")}
            style={{ height: "35px", padding: "0 8px", lineHeight: '1' }}
            aria-label="Search Posters"
          >
            <i className="bi bi-search fs-6"></i>
          </button>

          <AccountDropdown isLoggedIn={isLoggedIn} logout={logout} />

          <button
            className="btn position-relative mx-1 mx-md-2 px-3 d-flex align-items-center justify-content-center"
            type="button"
            onClick={() => setShowCart(true)}
            style={{ height: "35px" }}
          >
            <i className="bi bi-cart fs-5"></i>
            {cartItems.length > 0 && (
              <span
                className="position-absolute bg-primary text-white d-flex align-items-center justify-content-center"
                style={{
                  top: '5px',
                  right: '0px',
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  fontSize: '0.6rem',
                  transform: 'translate(50%, -50%)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                }}
                title={`${cartItems.length} items in cart`}
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
        show={showCart}
        onClose={() => setShowCart(false)}
      />
    </>
  );
}