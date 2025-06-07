import React, { useState } from "react";

export default function AccountDropdown({ isLoggedIn }) {
    const [showDropdown, setShowDropdown] = useState(false);
    const [dropdownClicked, setDropdownClicked] = useState(false);

    const handleMouseEnter = () => {
        if (!dropdownClicked) {
            setShowDropdown(true);
        }
    };

    const handleMouseLeave = () => {
        if (!dropdownClicked) {
            setShowDropdown(false);
        }
    };

    const toggleDropdown = () => {
        if (dropdownClicked) {
            setDropdownClicked(false);
            setShowDropdown(false);
        } else {
            setDropdownClicked(true);
            setShowDropdown(true);
        }
    };

    return (
        <div
            className="h-100 d-flex align-items-center"
            onMouseLeave={handleMouseLeave}
        >
            {/* Account Icon Button */}
            <button
                className="btn border p-0 d-flex align-items-center px-3 mx-2"
                onClick={toggleDropdown}
                onMouseEnter={handleMouseEnter}
                style={{ cursor: "pointer", backdropFilter: "blur(10px)" }}
            >
                <i className="bi bi-person fs-4"></i>
            </button>

            {/* Dropdown menu */}
            <div
                className={`fullwidth-dropdown p-4 bg-white shadow-sm rounded-bottom position-absolute end-0 ${showDropdown ? "show slide-down d-block" : "d-none"}`}
                style={{
                    width: "100%",   // approx width of col-md-3 (or use 360px for col-md-4 etc.)
                    top: "100%",
                    // left:-30,
                    zIndex: 1050
                }}
            >

                <div className="mb-2 fw-semibold text-secondary px-1 small">
                    My Account
                </div>

                {!isLoggedIn ? (
                    <>
                        <a href="/login" className="dropdown-item py-2 text-dark text-decoration-none d-flex align-items-center">
                            <i className="bi bi-box-arrow-in-right me-2"></i> Login / Signup
                        </a>
                    </>
                ) : (
                    <>
                        <a href="/profile" className="dropdown-item py-2 text-dark text-decoration-none d-flex align-items-center">
                            <i className="bi bi-person-circle me-2"></i> Profile
                        </a>
                        <a href="/orders" className="dropdown-item py-2 text-dark text-decoration-none d-flex align-items-center">
                            <i className="bi bi-box-seam me-2"></i> Orders
                        </a>
                        <a href="/wishlist" className="dropdown-item py-2 text-dark text-decoration-none d-flex align-items-center">
                            <i className="bi bi-heart me-2"></i> Wishlist
                        </a>
                        <div className="dropdown-divider"></div>
                        <button
                            className="dropdown-item py-2 text-danger d-flex align-items-center"
                            onClick={() => alert("Logout clicked!")}
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
