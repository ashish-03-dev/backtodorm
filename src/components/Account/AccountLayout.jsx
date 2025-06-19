import React, { useState, useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import '../../styles/AccountLayout.css';
import { useFirebase } from "../../context/FirebaseContext";

export default function AccountLayout() {
  const { logout, user, userData, loadingUserData } = useFirebase();
  const location = useLocation();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState("");
  const [showSidebar, setShowSidebar] = useState(false);
  const [showContentOnMobile, setShowContentOnMobile] = useState(false);

  const isMobile = window.innerWidth < 768;

  // Redirect unauthenticated users to login or show loading state
  useEffect(() => {
    if (loadingUserData) return; // Wait for Firebase to resolve auth state
    if (!user) {
      navigate("/login", { replace: true });
    }
  }, [user, loadingUserData, navigate]);

  // Detect when to show sidebar or content on mobile based on current route
  useEffect(() => {
    if (!isMobile) return;

    const baseRoutes = ["/account"];
    const isBaseRoute = baseRoutes.includes(location.pathname);

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
    navigate(path);
    if (isMobile) {
      setShowContentOnMobile(true);
    }
  };

  const isActive = (path) => location.pathname === path;

  // Show loading indicator while Firebase resolves auth state
  if (loadingUserData) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "100vh" }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  // Render nothing until user is confirmed (handled by useEffect redirect)
  if (!user) return null;

  return (
    <>
      {showSidebar && (
        <div
          className="account-overlay d-md-none"
          onClick={() => setShowSidebar(false)}
        ></div>
      )}

      <div className="bg-light p-3">
        <div className="container d-flex gap-3" style={{ minHeight: "calc(100svh - 97px)" }}>
          {/* Sidebar */}
          {!showContentOnMobile && (
            <div
              className={`account-sidebar bg-light d-flex flex-column gap-3 ${showSidebar ? "show" : ""}`}
              style={{ minWidth: "300px", flexShrink: 0 }}
            >
              <div className="text-center p-4 bg-white shadow-sm">
                <h5 className="mb-0">My Account</h5>
              </div>

              <div className="p-4 bg-white d-flex flex-column justify-content-between flex-grow-1 shadow-sm">
                <ul className="nav flex-column gap-2">
                  <li className="nav-item">
                    <div
                      className={`nav-link d-flex justify-content-between px-3 py-2 rounded ${
                        !isMobile && (isActive("/account") || isActive("/account/profile"))
                          ? "fw-bold text-primary bg-light border"
                          : "text-dark"
                      } sidebar-item`}
                      onClick={() => handleSectionClick("/account/profile")}
                    >
                      Profile Info
                      <i className="bi bi-chevron-right d-md-none"></i>
                    </div>
                  </li>
                  <li className="nav-item">
                    <div
                      className={`nav-link d-flex justify-content-between px-3 py-2 rounded ${
                        isActive("/account/addresses") ? "fw-bold text-primary bg-light border" : "text-dark"
                      } sidebar-item`}
                      onClick={() => handleSectionClick("/account/addresses")}
                    >
                      Saved Addresses
                      <i className="bi bi-chevron-right d-md-none"></i>
                    </div>
                  </li>
                  <li className="nav-item">
                    <div
                      className={`nav-link d-flex justify-content-between px-3 py-2 rounded ${
                        isActive("/account/orders") ? "fw-bold text-primary bg-light border" : "text-dark"
                      } sidebar-item`}
                      onClick={() => handleSectionClick("/account/orders")}
                    >
                      Orders
                      <i className="bi bi-chevron-right d-md-none"></i>
                    </div>
                  </li>
                  <li className="nav-item">
                    <div
                      className={`nav-link d-flex justify-content-between px-3 py-2 rounded ${
                        isActive("/account/security") ? "fw-bold text-primary bg-light border" : "text-dark"
                      } sidebar-item`}
                      onClick={() => handleSectionClick("/account/security")}
                    >
                      Security
                      <i className="bi bi-chevron-right d-md-none"></i>
                    </div>
                  </li>
                  {userData?.isSeller ? (
                    <li className="nav-item">
                      <div
                        className={`nav-link d-flex justify-content-between px-3 py-2 rounded ${
                          isActive("/seller") ? "fw-bold text-primary bg-light border" : "text-dark"
                        } sidebar-item`}
                        onClick={() => handleSectionClick("/seller")}
                      >
                        Seller Dashboard
                        <i className="bi bi-chevron-right d-md-none"></i>
                      </div>
                    </li>
                  ) : (
                    <li className="nav-item">
                      <div
                        className={`nav-link d-flex justify-content-between px-3 py-2 rounded ${
                          isActive("/account/become-seller") ? "fw-bold text-primary bg-light border" : "text-dark"
                        } sidebar-item`}
                        onClick={() => handleSectionClick("/account/become-seller")}
                      >
                        Become a Seller
                        <i className="bi bi-chevron-right d-md-none"></i>
                      </div>
                    </li>
                  )}
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
            className={`bg-white shadow-sm p-4 p-md-5 flex-grow-1 ${
              showContentOnMobile ? "d-block d-md-block" : "d-none d-md-block"
            }`}
            style={{ maxWidth: "100%", overflow: "auto" }}
          >
            {error && <div className="alert alert-danger">{error}</div>}
            <Outlet />
          </div>
        </div>
      </div>
    </>
  );
}