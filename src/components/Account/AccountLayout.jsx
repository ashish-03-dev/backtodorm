import React, { useState, useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useFirebase } from "../../context/FirebaseContext";

export default function AccountLayout() {
  const { logout, userData } = useFirebase();
  const location = useLocation();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState("");
  const [showContentOnMobile, setShowContentOnMobile] = useState(false);

  const isMobile = window.innerWidth < 768;

  useEffect(() => {
    if (!isMobile) return;
    setShowContentOnMobile(location.pathname !== "/account");
  }, [location.pathname, isMobile]);

  const handleLogout = async () => {
    setLoggingOut(true);
    setError("");
    try {
      await logout();
      setTimeout(() => {
        navigate("/");
      }, 1000);
    } catch (err) {
      setLoggingOut(false);
      setError(err.message || "Logout failed");
    }
  };

  const handleSectionClick = (path) => {
    navigate(path, { replace: true });
    if (isMobile) {
      setShowContentOnMobile(true);
    }
  };

  const isActive = (path) => {
    if (path === "/account/profile") {
      return !isMobile && (location.pathname === "/account" || location.pathname === "/account/profile");
    }
    return location.pathname === path;
  };

  const menuItems = [
    { label: "Profile Info", path: "/account/profile" },
    { label: "Saved Addresses", path: "/account/addresses" },
    { label: "Orders", path: "/account/orders" },
    { label: "Security", path: "/account/security" },
    { label: "Help Centre", path: "/account/help-centre" },
  ];

  return (
    <div className="bg-light p-3">
      <div className="d-flex gap-3" style={{ minHeight: "calc(100svh - 97px)" }}>
        {/* Sidebar */}
        {!showContentOnMobile && (
          <div
            className={`bg-light d-flex flex-column gap-3 ${isMobile ? "flex-grow-1" : ""}`}
            style={{
              position: "sticky",
              top: "calc(65px + 1rem)",
              minWidth: "300px",
              flexShrink: 0,
              maxHeight: "calc(100svh - 65px - 2rem)"
            }}
          >
            <div className="text-center p-4 bg-white shadow-sm">
              <h5 className="mb-0">My Account</h5>
            </div>

            <div className="p-4 bg-white d-flex flex-column justify-content-between flex-grow-1 shadow-sm">
              <ul className="nav flex-column gap-2">
                {menuItems.map(({ label, path }, index) => (
                  <li className="nav-item" key={index}>
                    <div
                      className={`nav-link d-flex justify-content-between px-3 py-2 rounded sidebar-item ${isActive(path)
                        ? "text-primary bg-light"
                        : "text-dark"
                        }`}
                      onClick={() => handleSectionClick(path)}
                    >
                      {label}
                      <i className="bi bi-chevron-right d-md-none"></i>
                    </div>
                  </li>
                ))}
              </ul>

              <button
                className="btn btn-danger w-100"
                disabled={loggingOut}
                onClick={handleLogout}
              >
                {loggingOut ? "Logging out..." : "Logout"}
              </button>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div
          className={`bg-white shadow-sm flex-grow-1 ${showContentOnMobile ? "d-block d-md-block" : "d-none d-md-block"
            }`}
          style={{ maxWidth: "100%" }}
        >
          {error && <div className="alert alert-danger">{error}</div>}
          <Outlet />
        </div>
      </div>
    </div>
  );
}
