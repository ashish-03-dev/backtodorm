import React, { useState } from "react";
import { Link } from "react-router-dom";
import "../../styles/MobileSidebar.css";
import categoryMenu from "../../data/categoryMenu";
import collectionsMenu from '../../data/collectionsMenu';

export default function MobileSidebar({ show, onClose }) {
  const [openCategory, setOpenCategory] = useState(null);
  const [collectionsOpen, setCollectionsOpen] = useState(false);

  const toggleCategory = (index) => {
    setOpenCategory(openCategory === index ? null : index);
  };

  const toggleCollections = () => {
    setCollectionsOpen(!collectionsOpen);
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
        <button className="btn btn-close mb-4" onClick={onClose}></button>
        <h5 className="fw-bold mb-3">Shop Categories</h5>

        {/* Category Sections */}
        {categoryMenu.map((section, index) => (
          <div key={index} className="mb-3">
            <button
              className="btn btn-sm w-100 text-start fw-semibold bg-light"
              onClick={() => toggleCategory(index)}
              aria-expanded={openCategory === index}
            >
              {section.title}
            </button>
            {openCategory === index && (
              <ul className="list-unstyled ps-3 mt-2">
                {section.items.map((item, i) => (
                  <li key={i}>
                    <Link
                      to={item.link}
                      onClick={onClose}
                      className="d-block py-1 text-decoration-none text-dark sidebar-link"
                    >
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}

        {/* Collections Section */}
        <hr />
        <h5 className="fw-bold mb-3">Collections</h5>
        <div className="mb-3">
          <button
            className="btn btn-sm w-100 text-start fw-semibold bg-light"
            onClick={toggleCollections}
            aria-expanded={collectionsOpen}
          >
            Curated Packs & Sets
          </button>
          {collectionsOpen && (
            <ul className="list-unstyled ps-3 mt-2">
              {collectionsMenu.map((item, i) => (
                <li key={i}>
                  <Link
                    to={item.link}
                    onClick={onClose}
                    className="d-block py-1 text-decoration-none text-dark sidebar-link"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
