import React, { useState } from "react";
import { Link } from "react-router-dom";
import "../../styles/MobileSidebar.css";

const categoryMenu = [
  {
    title: "Shop by Theme",
    items: [
      { name: "Minimal", link: "/collections/theme/minimal" },
      { name: "Abstract", link: "/collections/theme/abstract" },
      { name: "Motivational", link: "/collections/theme/motivational" },
      { name: "Quotes", link: "/collections/theme/quotes" },
    ],
  },
  {
    title: "Aesthetic Vibes",
    items: [
      { name: "Retro & Vintage", link: "/collections/style/retro-vintage" },
      { name: "Pastel", link: "/collections/style/pastel" },
      { name: "Boho & Abstract", link: "/collections/style/boho-abstract" },
    ],
  },
  {
    title: "Motivation & Quotes",
    items: [
      { name: "Quotes", link: "/collections/theme/quotes" },
      { name: "Productivity", link: "/collections/theme/productivity" },
      { name: "Spiritual", link: "/collections/theme/spiritual" },
    ],
  },
  {
    title: "Pop Culture",
    items: [
      { name: "Anime", link: "/collections/pop-culture/anime" },
      { name: "Superheroes", link: "/collections/pop-culture/superheroes" },
      { name: "Gaming", link: "/collections/pop-culture/gaming" },
      { name: "Movies", link: "/collections/pop-culture/movies" },
      { name: "TV Series", link: "/collections/pop-culture/tv-series" },
    ],
  },
  {
    title: "Nature & Cosmos",
    items: [
      { name: "Mountains & Forests", link: "/collections/nature/mountains-forests" },
      { name: "Sunset & Ocean", link: "/collections/nature/sunset-ocean" },
      { name: "Space & Galaxy", link: "/collections/nature/space" },
    ],
  },
  {
    title: "Niche",
    items: [
      { name: "Cars", link: "/collections/niche/cars" },
      { name: "Music", link: "/collections/niche/music" },
      { name: "Travel", link: "/collections/niche/travel" },
      { name: "Cityscapes", link: "/collections/niche/cityscapes" },
    ],
  },
];

const collectionsMenu = [
  { name: "Anime Poster Pack", link: "/collection/anime-poster-pack" },
  { name: "Inspirational Quotes Set", link: "/collection/inspirational-quotes-pack" },
  { name: "Retro Aesthetic Pack", link: "/collection/retro-aesthetic-pack" },
  { name: "Productivity Combo", link: "/collection/productivity-poster-bundle" },
];

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
