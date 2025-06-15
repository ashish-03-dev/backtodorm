import React, { useState } from "react";
import { Link } from "react-router-dom";
import "../../styles/MobileSidebar.css";
import categoryMenu from "../../data/categoryMenu";
import collectionsMenu from "../../data/collectionsMenu";

export default function MobileSidebar({ show, onClose }) {
  const [openCategory, setOpenCategory] = useState(null);

  const toggleCategory = (index) => {
    setOpenCategory(openCategory === index ? null : index);
  };

  return (
    <>
      {/* Overlay */}
      <div
        className={`sidebar-overlay ${show ? "show" : ""}`}
        onClick={onClose}
      ></div>

      {/* Sidebar */}
      <div className={`mobile-sidebar ${show ? "open" : ""}`}>
        <div className="bg-secondary text-white d-flex align-items-center justify-content-between px-3" style={{ height: "65px" }}>
          <div className="d-flex align-items-center gap-2">
            <i className="bi bi-person-circle fs-4 me-2"></i>
            <span className="fw-semibold">ASHISH KUMAR</span>
          </div>
          <button className="btn btn-close btn-sm btn-close-white" onClick={onClose}></button>
        </div>

        <ul className="list-unstyled m-0 p-0">

          {/* Home */}
          <li className="px-3 py-3 border-bottom">
            <Link to="/" onClick={onClose} className="d-flex align-items-center text-decoration-none text-dark">
              <i className="bi bi-house-door me-3"></i> <span>Home</span>
            </Link>
          </li>

          {/* Shop Categories (Collapsible) */}
          <li className="border-bottom">
            <button
              className="btn w-100 px-3 py-3 d-flex align-items-center justify-content-between text-start bg-light fw-semibold "
              onClick={() => toggleCategory("shop")}
            >
              <span><i className="bi bi-grid me-3"></i> Shop Categories</span>
              <i className={`bi ${openCategory === "shop" ? "bi-chevron-up" : "bi-chevron-down"}`}></i>
            </button>
            {openCategory === "shop" && (
              <div className="px-5 mt-3">
                {categoryMenu.map((section, index) => (
                  <div key={index} className="mb-3">
                    <div className="fw-bold text-dark small mb-1">{section.title}</div>
                    <ul className="list-unstyled m-0">
                      {section.items.map((item, i) => (
                        <li key={i}>
                          <Link
                            to={item.link}
                            onClick={onClose}
                            className="d-block py-1 ps-1 text-decoration-none text-dark small"
                          >
                            {item.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </li>

          {/* Collections (Also Collapsible) */}
          <li className="border-bottom">
            <button
              className="btn w-100 px-3 py-3 d-flex align-items-center justify-content-between text-start bg-light fw-semibold"
              onClick={() => toggleCategory("collections")}
            >
              <span><i className="bi bi-collection me-3"></i> Collections</span>
              <i className={`bi ${openCategory === "collections" ? "bi-chevron-up" : "bi-chevron-down"}`}></i>
            </button>
            {openCategory === "collections" && (
              <div className="px-5 mt-3">
                {collectionsMenu.map((section, index) => (
                  <div key={index} className="mb-3">
                    <div className="fw-bold text-dark small mb-1">{section.title}</div>
                    <ul className="list-unstyled m-0">
                      {section.items.map((item, i) => (
                        <li key={i}>
                          <Link
                            to={item.link}
                            onClick={onClose}
                            className="d-block py-1 ps-1 text-decoration-none text-dark small"
                          >
                            {item.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </li>

          {/* Custom Poster */}
          <li className="px-3 py-3 border-bottom">
            <Link
              to="/custom"
              onClick={onClose}
              className="d-flex align-items-center text-decoration-none text-dark"
            >
              <i className="bi bi-pencil-square me-3"></i> <span>Custom Poster</span>
            </Link>
          </li>

          {/* Product Request */}
          <li className="px-3 py-3 border-bottom">
            <Link
              to="/products"
              onClick={onClose}
              className="d-flex align-items-center text-decoration-none text-dark"
            >
              <i className="bi bi-box2-heart me-3"></i> <span>Products</span>
            </Link>
          </li>

          {/* Account Section Items */}
          <li className="px-3 py-2 border-bottom">
            <Link
              to="/account"
              onClick={onClose}
              className="d-flex align-items-center text-decoration-none text-dark py-3"
            >
              <i className="bi bi-person-badge me-3"></i>
              <span>My Account</span>
            </Link>
            <Link
              to="/account/orders"
              onClick={onClose}
              className="d-flex align-items-center text-decoration-none text-dark py-3"
            >
              <i className="bi bi-bag-check me-3"></i>
              <span>My Orders</span>
            </Link>
            <Link
              to="/checkout"
              onClick={onClose}
              className="d-flex align-items-center text-decoration-none text-dark py-3"
            >
              <i className="bi bi-cart3 me-3"></i>
              <span>My Cart</span>
            </Link>
            <Link
              to="/wishlist"
              onClick={onClose}
              className="d-flex align-items-center text-decoration-none text-dark py-3"
            >
              <i className="bi bi-heart me-3"></i>
              <span>My Wishlist</span>
            </Link>
          </li>

        </ul>
      </div>
    </>
  );
}
