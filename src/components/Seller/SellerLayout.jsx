import React, { useState, useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useFirebase } from "../../context/FirebaseContext";

export default function SellerLayout() {
  const { userData } = useFirebase();
  const location = useLocation();
  const navigate = useNavigate();
  const [showContentOnMobile, setShowContentOnMobile] = useState(false);

  const isMobile = window.innerWidth < 768;

  useEffect(() => {
    if (!userData?.isSeller) {
      navigate("/account/become-seller", { replace: true });
    }
  }, [userData, navigate]);

  useEffect(() => {
    if (!isMobile) return;
    setShowContentOnMobile(location.pathname !== "/seller");
  }, [location.pathname, isMobile]);

  const handleSectionClick = (path) => {
    navigate(path);
    if (isMobile) {
      setShowContentOnMobile(true);
    }
  };

  const isActive = (path) => location.pathname === path;

  return (
    <>
      <div className="bg-light p-3">
        <div className="d-flex gap-3" style={{ minHeight: "calc(100svh - 97px)" }}>
          {!showContentOnMobile && (
            <div
              className="bg-light d-flex flex-column gap-3"
              style={{ minWidth: "300px", flexShrink: 0 }}
            >
              <div className="text-center p-4 bg-white shadow-sm">
                <h5 className="mb-0">Seller Dashboard</h5>
              </div>
              <div className="p-4 bg-white d-flex flex-column justify-content-between flex-grow-1 shadow-sm">
                <ul className="nav flex-column gap-2">
                  <li className="nav-item">
                    <div
                      className={`nav-link d-flex justify-content-between px-3 py-2 rounded ${!isMobile && (isActive("/seller") || isActive("/seller/dashboard"))
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
                      className={`nav-link d-flex justify-content-between px-3 py-2 rounded ${isActive("/seller/products") ? "fw-bold text-primary bg-light border" : "text-dark"
                        } sidebar-item`}
                      onClick={() => handleSectionClick("/seller/products")}
                    >
                      <span><i className="bi bi-image me-2"></i>My Products</span>
                      <i className="bi bi-chevron-right d-md-none"></i>
                    </div>
                  </li>
                  <li className="nav-item">
                    <div
                      className={`nav-link d-flex justify-content-between px-3 py-2 rounded ${isActive("/seller/sales") ? "fw-bold text-primary bg-light border" : "text-dark"
                        } sidebar-item`}
                      onClick={() => handleSectionClick("/seller/sales")}
                    >
                      <span><i className="bi bi-cart-check me-2"></i>Sales History</span>
                      <i className="bi bi-chevron-right d-md-none"></i>
                    </div>
                  </li>
                  <li className="nav-item">
                    <div
                      className={`nav-link d-flex justify-content-between px-3 py-2 rounded ${isActive("/seller/payouts") ? "fw-bold text-primary bg-light border" : "text-dark"
                        } sidebar-item`}
                      onClick={() => handleSectionClick("/seller/payouts")}
                    >
                      <span><i className="bi bi-wallet2 me-2"></i>Payouts</span>
                      <i className="bi bi-chevron-right d-md-none"></i>
                    </div>
                  </li>
                  <li className="nav-item">
                    <div
                      className={`nav-link d-flex justify-content-between px-3 py-2 rounded ${isActive("/seller/settings") ? "fw-bold text-primary bg-light border" : "text-dark"
                        } sidebar-item`}
                      onClick={() => handleSectionClick("/seller/settings")}
                    >
                      <span><i className="bi bi-gear me-2"></i>Settings</span>
                      <i className="bi bi-chevron-right d-md-none"></i>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          )}
          <div
            className={`bg-white shadow-sm flex-grow-1 ${showContentOnMobile ? "d-block d-md-block" : "d-none d-md-block"
              }`}
            style={{ maxWidth: "100%", overflow: "auto" }}
          >
            <Outlet />
          </div>
        </div>
      </div>
    </>
  );
}