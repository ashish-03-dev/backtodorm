import React, { useState, useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useFirebase } from "../../context/FirebaseContext";
import { doc, onSnapshot } from "firebase/firestore";
import { Spinner, Alert } from "react-bootstrap";

export default function SellerLayout() {
  const { firestore, user, userData } = useFirebase();
  const location = useLocation();
  const navigate = useNavigate();
  const [sellerData, setSellerData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showContentOnMobile, setShowContentOnMobile] = useState(false);
  const isMobile = window.innerWidth < 768;

  useEffect(() => {
    // Fetch seller document
    const sellerDocRef = doc(firestore, "sellers", userData?.sellerUsername);
    const unsubscribe = onSnapshot(
      sellerDocRef,
      (doc) => {
        if (doc.exists()) {
          setSellerData({
            approvedPosters: doc.data().approvedPosters || [],
            tempPosters: doc.data().tempPosters || [],
          });
        } else {
          setError("Seller profile not found.");
          navigate("/account/become-seller", { replace: true });
        }
        setLoading(false);
      },
      (err) => {
        setError(`Failed to fetch seller data: ${err.message}`);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [firestore, user, navigate]);

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

  const isActive = (path) => {
    if (path === "/seller/dashboard") {
      return !isMobile && (location.pathname === "/seller" || location.pathname === "/seller/dashboard");
    }
    return location.pathname === path;
  };

  const navItems = [
    { path: "/seller/dashboard", label: "Dashboard", icon: "bi-house" },
    { path: "/seller/sell-poster", label: "Sell Your Poster", icon: "bi-upload" },
    { path: "/seller/products", label: "My Products", icon: "bi-image" },
    { path: "/seller/payouts", label: "Payouts", icon: "bi-wallet2" },
  ];

  if (error) {
    return (
      <div className="p-4 p-md-5">
        <Alert variant="danger" onClose={() => setError("")} dismissible>
          {error}
        </Alert>
      </div>
    );
  }

  return (
    <div className="bg-light p-3">
      <div className="d-flex gap-3" style={{ height: "calc(100svh - 97px)" }}>
        {!showContentOnMobile && (
          <div
            className={`bg-light d-flex flex-column gap-3 ${isMobile ? "flex-grow-1" : ""}`}
            style={{ minWidth: "300px", flexShrink: 0 }}
          >
            <div className="text-center p-4 bg-white shadow-sm">
              <h5 className="mb-0">Seller Dashboard</h5>
            </div>
            <div className="p-4 bg-white d-flex flex-column justify-content-between flex-grow-1 shadow-sm">
              <ul className="nav flex-column gap-2">
                {navItems.map(({ path, label, icon }) => (
                  <li className="nav-item" key={path}>
                    <div
                      className={`nav-link d-flex justify-content-between px-3 py-2 rounded sidebar-item ${
                        isActive(path) ? "text-primary bg-light" : "text-dark"
                      }`}
                      onClick={() => handleSectionClick(path)}
                    >
                      <span>
                        <i className={`bi ${icon} me-2`}></i>
                        {label}
                      </span>
                      <i className="bi bi-chevron-right d-md-none"></i>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
        <div
          className={`bg-white shadow-sm flex-grow-1 overflow-auto ${
            showContentOnMobile ? "d-block d-md-block" : "d-none d-md-block"
          }`}
          style={{ maxWidth: "100%", overflow: "auto" }}
        >
          <Outlet context={{ sellerData }} />
        </div>
      </div>
    </div>
  );
}