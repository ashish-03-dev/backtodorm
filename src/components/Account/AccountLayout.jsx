import React, { useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import '../../styles/AccountLayout.css';
import { useFirebase } from "../../context/FirebaseContext";

export default function AccountLayout() {
  const { logout } = useFirebase();
  const location = useLocation();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(null);
  const [error, setError] = useState("");
  const [showSidebar, setShowSidebar] = useState(false);

  const toggleSidebar = () => setShowSidebar(!showSidebar);
  const closeSidebar = () => setShowSidebar(false);

  const isActive = (path) =>
    location.pathname === path;

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
      setError(err);
    }
  }
  return (
    <>
      {/* Overlay for mobile */}
      {showSidebar && <div className="account-overlay d-md-none" onClick={closeSidebar}></div>}
      <div className="bg-light p-3">
        <div className="container d-flex flex-row gap-3" style={{ minHeight: "calc(100svh - 97px)" }}>
          {/* Sidebar */}
          <div className={`account-sidebar bg-light d-flex flex-column gap-3 ${showSidebar ? "show" : ""}`}>
            <div className="text-center p-4 bg-white shadow-sm">
              <h5 className="mb-0">My Account</h5>
            </div>

            <div className="p-4 bg-white d-flex flex-column justify-content-between flex-grow-1 shadow-sm">
              <ul className="nav flex-column gap-2">
                <li className="nav-item">
                  <Link
                    to="/profile"
                    className={`nav-link d-flex justify-content-between px-0 ${isActive("/profile") ? "fw-bold text-primary" : "text-dark"}`}
                    onClick={closeSidebar}
                  >
                    Profile Info
                    <i className="bi bi-chevron-right d-md-none"></i>
                  </Link>
                </li>
                <li className="nav-item">
                  <Link
                    to="addresses"
                    className={`nav-link d-flex justify-content-between  px-0 ${isActive("/profile/addresses") ? "fw-bold text-primary" : "text-dark"}`}
                    onClick={closeSidebar}
                  >
                    Saved Addresses
                    <i className="bi bi-chevron-right d-md-none"></i>
                  </Link>
                </li>
                <li className="nav-item">
                  <Link
                    to="security"
                    className={`nav-link d-flex justify-content-between  px-0 ${isActive("/profile/security") ? "fw-bold text-primary" : "text-dark"}`}
                    onClick={closeSidebar}
                  >
                    Security
                    <i className="bi bi-chevron-right d-md-none"></i>
                  </Link>
                </li>
                <li className="nav-item">
                  <Link
                    to="/orders"
                    className={`nav-link d-flex justify-content-between px-0 ${isActive("/orders") ? "fw-bold text-primary" : "text-dark"}`}
                    onClick={closeSidebar}
                  >
                    Orders
                    <i className="bi bi-chevron-right d-md-none"></i>
                  </Link>
                </li>
              </ul>

              <button className="btn btn-danger w-100" disabled={loggingOut}
                onClick={handleLogout}>
                {loggingOut ? "Logging out..." : "Logout"}
              </button>

            </div>

          </div>

          <div className="d-none d-md-block flex-grow-1 p-5 bg-white shadow-sm">
            <Outlet />
          </div>
        </div>

      </div>
    </>
  );
}
