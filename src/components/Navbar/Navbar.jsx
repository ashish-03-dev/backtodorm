import React, { useState } from "react";
import NavLinks from "./Navlinks";
import AccountDropdown from "./AccountDropDown";
import CartSidebar from "./CartSidebar";
import MobileSidebar from './MobileSidebar';
import "bootstrap/dist/css/bootstrap.min.css";

export default function NavbarComponent({ cartItems }) {
  // const isLoggedIn = false;
  const isLoggedIn = true;
  const [showSidebar, setShowSidebar] = useState(false);

  return (
    <>
      <nav className="d-flex sticky-top w-100 px-3 px-md-5 justify-content-between align-items-center bg-white shadow-sm" role="banner" style={{ height: "65px" }}>

        <nav className="col-md-3 d-flex align-items-center">
          <button
            className="btn btn-outline-dark d-lg-none me-3"
            onClick={() => setShowSidebar(true)}
            aria-label="Open Shop Categories"
          >
            {/* <i className="bi bi-list fs-4"></i> */}
            <i className="fas fa-bars"></i> {/* Bootstrap hamburger icon */}
          </button>
          <a className="navbar-brand fw-bold fs-4 mb-0 ms-md-4" href="/">BackToDorm</a>
        </nav>

        <NavLinks />

        <div className="col-md-3 h-100 d-flex align-items-center justify-content-center position-relative">
          <AccountDropdown isLoggedIn={isLoggedIn} />

          <button
            className="btn bg-light position-relative px-3 mx-1 mx-md-2 border"
            type="button"
            data-bs-toggle="offcanvas"
            data-bs-target="#cartOffcanvas"
            aria-controls="cartOffcanvas"
            aria-label="Open Cart"
          >
            🛒 Cart
            {cartItems.length > 0 && (
              <span
                className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-primary"
                style={{ fontSize: "0.65rem" }}
              >
                {cartItems.length}
                <span className="visually-hidden">items in cart</span>
              </span>
            )}
          </button>
        </div>

      </nav>

      <MobileSidebar show={showSidebar} onClose={() => setShowSidebar(false)} />
      <CartSidebar cartItems={cartItems} />
    </>
  );
}
