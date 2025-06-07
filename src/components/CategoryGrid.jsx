import React, { useRef, useState } from "react";
import { Link } from "react-router-dom";

const categories = [
  {
    name: "Aesthetic",
    image: "/images/categories/minimal.png",
    link: "/collections/aesthetic",
  },
  {
    name: "Mindset",
    image: "/images/categories/quotes.png",
    link: "/collections/mindset",
  },
  {
    name: "Pop Culture",
    image: "/images/categories/music.png",
    link: "/collections/pop-culture",
  },
  {
    name: "Nature",
    image: "/images/categories/nature.png",
    link: "/collections/nature",
  },
  {
    name: "Interests",
    image: "/images/categories/cars.png",
    link: "/collections/interests",
  },
  {
    name: "Typographic",
    image: "/images/categories/typographic.png",
    link: "/collections/typographic",
  },
];


export default function CategoryScroll() {
  const scrollRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);

const scroll = (direction) => {
  const container = scrollRef.current;
  if (!container) return;
  const scrollAmount = 320;
  container.scrollBy({ left: direction === "left" ? -scrollAmount : scrollAmount, behavior: "smooth" });
};


  return (
    <section
      className="py-5 px-3 position-relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <h2 className="fs-2 fw-bold mb-4 text-center">Shop by Category</h2>

      {isHovered && (
        <>
          <button
            onClick={() => scroll("left")}
            className="btn btn-light rounded-circle position-absolute top-50 start-0 translate-middle-y d-none d-md-flex align-items-center justify-content-center shadow-sm"
            style={{ width: "40px", height: "40px", zIndex: 10 }}
          >
            <i className="bi bi-chevron-left fs-5"></i>
          </button>

          <button
            onClick={() => scroll("right")}
            className="btn btn-light rounded-circle position-absolute top-50 end-0 translate-middle-y d-none d-md-flex align-items-center justify-content-center shadow-sm"
            style={{ width: "40px", height: "40px", zIndex: 10 }}
          >
            <i className="bi bi-chevron-right fs-5"></i>
          </button>
        </>
      )}

      <div
        ref={scrollRef}
        className="d-flex overflow-auto gap-4 pb-2"
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          scrollSnapType: "x mandatory",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {categories.map((cat, index) => (
          <Link
            to={cat.link}
            key={index}
            tabIndex={0}
            className="text-decoration-none text-dark"
            style={{ scrollSnapAlign: "start" }}
          >
            <div
              className="card shadow-sm flex-shrink-0 border-0"
              style={{ width: "15rem", height: "21rem" }}
            >
              <img
                src={cat.image}
                alt={cat.name}
                // loading="lazy"
                className="w-100"
                style={{
                  height: "17rem",
                  objectFit: "cover",
                  borderTopLeftRadius: "0.375rem",
                  borderTopRightRadius: "0.375rem",
                }}
              />
              <div className="card-body text-center">
                <h6 className="mb-0 fw-semibold fs-6">{cat.name}</h6>
              </div>
            </div>
          </Link>
        ))}
        <div style={{ width: "0.75rem", flexShrink: 0 }}></div>
      </div>
    </section>
  );
}