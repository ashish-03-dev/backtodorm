import React, { useRef, useState } from "react";
import { Link } from "react-router-dom";

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
      { name: "Retro & Vintage", link: "/collections/retro-vintage" },
      { name: "Pastel", link: "/collections/pastel" },
      { name: "Boho & Abstract", link: "/collections/boho-abstract" },
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
      { name: "Anime", link: "/collections/anime" },
      { name: "Superheroes", link: "/collections/superheroes" },
      { name: "Gaming", link: "/collections/gaming" },
      { name: "Movies", link: "/collections/movies" },
      { name: "TV Series", link: "/collections/tv-series" },
    ],
  },
  {
    title: "Nature & Cosmos",
    items: [
      { name: "Mountains & Forests", link: "/collections/mountains-forests" },
      { name: "Sunset & Ocean", link: "/collections/sunset-ocean" },
      { name: "Space & Galaxy", link: "/collections/space" },
    ],
  },
  {
    title: "Niche",
    items: [
      { name: "Cars", link: "/collections/cars" },
      { name: "Music", link: "/collections/music" },
      { name: "Travel", link: "/collections/travel" },
      { name: "Cityscapes", link: "/collections/cityscapes" },
    ],
  },
];

export default function Subcategory() {
  return (
    <section className="container py-5 ">
      {categoryMenu.map((category, catIndex) => (
        <div key={catIndex} className="mb-5">
          <h3 className="fs-4 fw-bold mb-3">{category.title}</h3>
          <div
            className="d-flex overflow-auto gap-4 pb-2"
            style={{
              scrollbarWidth: "none",
              msOverflowStyle: "none",
              scrollSnapType: "x mandatory",
              WebkitOverflowScrolling: "touch",
            }}
          >
            {category.items.map((item, index) => (
              <Link
                key={index}
                to={item.link}
                className="text-decoration-none text-dark"
                style={{ scrollSnapAlign: "start" }}
              >
                <div
                  className="card shadow-sm flex-shrink-0 border-0"
                  style={{ width: "14rem", height: "19rem" }}
                >
                  <div
                    className="bg-light w-100 d-flex align-items-center justify-content-center"
                    style={{
                      height: "15rem",
                      borderTopLeftRadius: "0.375rem",
                      borderTopRightRadius: "0.375rem",
                    }}
                  >
                    {/* Placeholder Image or Icon - you can replace this with actual images */}
                    <span className="fs-1 text-muted">{item.name[0]}</span>
                  </div>
                  <div className="card-body text-center">
                    <h6 className="mb-0 fw-semibold fs-6">{item.name}</h6>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
