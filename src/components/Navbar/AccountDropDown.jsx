import React, { useState } from "react";

export default function AccountDropdown({ isLoggedIn, logout }) {
    const [showDropdown, setShowDropdown] = useState(false);

    const toggleDropdown = () => {
        setShowDropdown(prev => !prev);
    };

    return (
        <div className=""        >
            {/* Account Icon Button */}
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
                    onClick={toggleDropdown} // Clicking outside closes the dropdown
                ></div>
            )}

            {/* Dropdown menu */}
            <div className={`fullwidth-dropdown p-4 bg-white border-top shadow rounded-bottom ${showDropdown ? "show slide-down d-block" : "d-none"}`}>
                <div className="mb-2 fw-semibold text-secondary small">
                    My Account
                </div>

                {!isLoggedIn ? (
                    <>
                        <a href="/login" className="dropdown-item py-2 text-dark text-decoration-none d-flex align-items-center">
                            <i className="bi bi-box-arrow-in-right me-2"></i> Login
                        </a>
                    </>
                ) : (
                    <>
                        <a href="/account" className="dropdown-item py-2 text-dark text-decoration-none d-flex align-items-center">
                            <i className="bi bi-person-circle me-2"></i> Account
                        </a>
                        <a href="/account/orders" className="dropdown-item py-2 text-dark text-decoration-none d-flex align-items-center">
                            <i className="bi bi-box-seam me-2"></i> Orders
                        </a>
                        <a href="/wishlist" className="dropdown-item py-2 text-dark text-decoration-none d-flex align-items-center">
                            <i className="bi bi-heart me-2"></i> Wishlist
                        </a>

                        <div
                            style={{
                                height: "1px",
                                backgroundColor: "#dee2e6", // Bootstrap's $gray-300
                                margin: "0.5rem 0"
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
