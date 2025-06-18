import React, { useState, useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
// import '../../styles/SellerLayout.css';
import { useFirebase } from "../../context/FirebaseContext";

export default function SellerLayout() {
  const { logout, user, userData, loadingUserData } = useFirebase();
  const location = useLocation();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState("");
  const [showSidebar, setShowSidebar] = useState(false);
  const [showContentOnMobile, setShowContentOnMobile] = useState(false);

  const isMobile = window.innerWidth < 768;

  useEffect(() => {
    if (loadingUserData) return;
    if (!user) {
      navigate("/login", { replace: true });
    } else if (!userData?.isSeller) {
      navigate("/", { replace: true });
    }
  }, [user, userData, loadingUserData, navigate]);

  useEffect(() => {
    if (!isMobile) return;
    const baseRoutes = ["/seller"];
    const isBaseRoute = baseRoutes.includes(location.pathname);
    setShowContentOnMobile(location.pathname !== "/seller");
  }, [location.pathname, isMobile]);

  const handleLogout = async () => {
    setLoggingOut(true);
    setError("");
    try {
      await logout();
      setTimeout(() => navigate("/"), 1000);
    } catch (err) {
      setLoggingOut(false);
      setError(err.message || "Logout failed");
    }
  };

  const handleSectionClick = (path) => {
    navigate(path);
    if (isMobile) {
      setShowContentOnMobile(true);
      setShowSidebar(false);
    }
  };

  const isActive = (path) => location.pathname === path;

  if (loadingUserData) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "100vh" }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (!user || !userData?.isSeller) return null;

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
          {!showContentOnMobile && (
            <div
              className={`account-sidebar bg-light d-flex flex-column gap-3 ${showSidebar ? "show" : ""}`}
              style={{ minWidth: "300px", flexShrink: 0 }}
            >
              <div className="text-center p-4 bg-white shadow-sm">
                <h5 className="mb-0">Seller Dashboard</h5>
              </div>
              <div className="p-4 bg-white d-flex flex-column justify-content-between flex-grow-1 shadow-sm">
                <ul className="nav flex-column gap-2">
                  <li className="nav-item">
                    <div
                      className={`nav-link d-flex justify-content-between px-3 py-2 rounded ${
                        !isMobile && (isActive("/seller") || isActive("/seller/dashboard"))
                          ? "fw-bold text-primary bg-light border"
                          : "text-dark"
                      } sidebar-item`}
                      onClick={() => handleSectionClick("/seller/dashboard")}
                    >
                      <span><i className="bi bi-house me-2"></i>Dashboard</span>
                      <i className="bi bi-chevron-right d-md-none"></i>
                    </div>
                  </li>
                  <li className="nav-item">
                    <div
                      className={`nav-link d-flex justify-content-between px-3 py-2 rounded ${
                        isActive("/seller/products") ? "fw-bold text-primary bg-light border" : "text-dark"
                      } sidebar-item`}
                      onClick={() => handleSectionClick("/seller/products")}
                    >
                      <span><i className="bi bi-image me-2"></i>My Products</span>
                      <i className="bi bi-chevron-right d-md-none"></i>
                    </div>
                  </li>
                  <li className="nav-item">
                    <div
                      className={`nav-link d-flex justify-content-between px-3 py-2 rounded ${
                        isActive("/seller/sales") ? "fw-bold text-primary bg-light border" : "text-dark"
                      } sidebar-item`}
                      onClick={() => handleSectionClick("/seller/sales")}
                    >
                      <span><i className="bi bi-cart-check me-2"></i>Sales History</span>
                      <i className="bi bi-chevron-right d-md-none"></i>
                    </div>
                  </li>
                  <li className="nav-item">
                    <div
                      className={`nav-link d-flex justify-content-between px-3 py-2 rounded ${
                        isActive("/seller/payouts") ? "fw-bold text-primary bg-light border" : "text-dark"
                      } sidebar-item`}
                      onClick={() => handleSectionClick("/seller/payouts")}
                    >
                      <span><i className="bi bi-wallet2 me-2"></i>Payouts</span>
                      <i className="bi bi-chevron-right d-md-none"></i>
                    </div>
                  </li>
                  <li className="nav-item">
                    <div
                      className={`nav-link d-flex justify-content-between px-3 py-2 rounded ${
                        isActive("/seller/settings") ? "fw-bold text-primary bg-light border" : "text-dark"
                      } sidebar-item`}
                      onClick={() => handleSectionClick("/seller/settings")}
                    >
                      <span><i className="bi bi-gear me-2"></i>Settings</span>
                      <i className="bi bi-chevron-right d-md-none"></i>
                    </div>
                  </li>
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