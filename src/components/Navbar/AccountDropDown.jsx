import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFirebase } from "../../context/FirebaseContext";

export default function AccountDropdown({ isLoggedIn, logout }) {
  const { userData } = useFirebase();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);

  const toggleDropdown = () => {
    setShowDropdown((prev) => !prev);
  };

  const handleNavigation = (path) => {
    navigate(path);
    setShowDropdown(false);
  };

  return (
    <div className="">
      <button
        className="btn border py-auto d-flex align-items-center px-2 mx-1 mx-md-2 bg-light"
        onClick={toggleDropdown}
        style={{ height: "35px", cursor: "pointer" }}
      >
        <i className="bi bi-person fs-4"></i>
      </button>

      {showDropdown && (
        <div
          className="dropdown-overlay"
          onClick={toggleDropdown}
        ></div>
      )}

      <div className={`fullwidth-dropdown p-4 bg-white border-top shadow rounded-bottom ${showDropdown ? "show slide-down d-block" : "d-none"}`}>
        <div className="mb-2 fw-semibold text-secondary small">
          My Account
        </div>

        {!isLoggedIn ? (
          <div
            className="dropdown-item py-2 text-dark text-decoration-none d-flex align-items-center"
            onClick={() => handleNavigation("/login")}
            style={{ cursor: "pointer" }}
          >
            <i className="bi bi-box-arrow-in-right me-2"></i> Login
          </div>
        ) : (
          <>
            <div
              className="dropdown-item py-2 text-dark text-decoration-none d-flex align-items-center"
              onClick={() => handleNavigation("/account")}
              style={{ cursor: "pointer" }}
            >
              <i className="bi bi-person-circle me-2"></i> Account
            </div>
            <div
              className="dropdown-item py-2 text-dark text-decoration-none d-flex align-items-center"
              onClick={() => handleNavigation("/account/orders")}
              style={{ cursor: "pointer" }}
            >
              <i className="bi bi-box-seam me-2"></i> Orders
            </div>
            <div
              className="dropdown-item py-2 text-dark text-decoration-none d-flex align-items-center"
              onClick={() => handleNavigation("/wishlist")}
              style={{ cursor: "pointer" }}
            >
              <i className="bi bi-heart me-2"></i> Wishlist
            </div>
            {userData?.isSeller ? (
              <div
                className="dropdown-item py-2 text-dark text-decoration-none d-flex align-items-center"
                onClick={() => handleNavigation("/seller")}
                style={{ cursor: "pointer" }}
              >
                <i className="bi bi-shop me-2"></i> Seller Dashboard
              </div>
            ) : (
              <div
                className="dropdown-item py-2 text-dark text-decoration-none d-flex align-items-center"
                onClick={() => handleNavigation("/account/become-seller")}
                style={{ cursor: "pointer" }}
              >
                <i className="bi bi-briefcase me-2"></i> Sell Your Design
              </div>
            )}

            <div
              style={{
                height: "1px",
                backgroundColor: "#dee2e6",
                margin: "0.5rem 0",
              }}
            ></div>

            <button
              className="dropdown-item py-2 text-danger d-flex align-items-center"
              onClick={logout}
              style={{
                border: "none",
                background: "none",
                padding: 0,
                width: "100%",
                textAlign: "left",
              }}
            >
              <i className="bi bi-box-arrow-right me-2"></i> Logout
            </button>
          </>
        )}
      </div>
    </div>
  );
}