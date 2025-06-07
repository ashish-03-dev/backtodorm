import React, { useRef, useState } from "react";
import { Link } from "react-router-dom";

export default function HorizontalCollectionScroll({ title}) {
  
const collections = [
  {
    id: "nature-landscapes",
    title: "Nature Landscapes",
    image: "/images/collections/cars.png",
    description: "Serene and beautiful views of nature to bring peace to your space.",
  },
  {
    id: "inspirational-quotes-pack",
    title: "Inspirational Quotes Pack",
    image: "/images/collections/motivate.png",
    description: "Motivational and thoughtful quotes for daily positivity.",
  },
  {
    id: "anime-classics-collection",
    title: "Anime Classics Collection",
    image: "/images/collections/anime-classics.jpg",
    description: "Iconic scenes from legendary anime like Naruto, DBZ, and One Piece.",
  },
  {
    id: "poster-packs",
    title: "50 Poster Mega Pack",
    image: "/images/collections/poster-pack.jpg",
    description: "A giant pack of 50 assorted posters at a value price.",
  },
  {
    id: "ultimate-anime-pack",
    title: "Ultimate Anime Pack",
    image: "/images/collections/ultimate-anime.jpg",
    description: "Top trending anime posters in one exclusive bundle.",
  },
  {
    id: "aesthetic-wall-collection",
    title: "Aesthetic Wall Collection",
    image: "/images/collections/aesthetic.jpg",
    description: "Pastel tones and soft visuals for a clean aesthetic vibe.",
  },
];


const scrollRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);

  const scroll = (direction) => {
    const container = scrollRef.current;
    const scrollAmount = 320; // You can tweak this for better snapping
    container.scrollBy({ left: direction === "left" ? -scrollAmount : scrollAmount, behavior: "smooth" });
  };

  return (
    <section
      className="py-5 px-3 position-relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <h2 className="fs-2 fw-bold mb-4">{title}</h2>

      {/* Scroll Buttons */}
      {isHovered && (
        <>
          <button
            onClick={() => scroll("left")}
            className="btn btn-light rounded-circle position-absolute top-50 start-0 translate-middle-y d-none d-md-flex align-items-center justify-content-center shadow"
            style={{ width: "40px", height: "40px", zIndex: 10 }}
            aria-label="Scroll left"
          >
            <i className="bi bi-chevron-left fs-5"></i>
          </button>

          <button
            onClick={() => scroll("right")}
            className="btn btn-light rounded-circle position-absolute top-50 end-0 translate-middle-y d-none d-md-flex align-items-center justify-content-center shadow"
            style={{ width: "40px", height: "40px", zIndex: 10 }}
            aria-label="Scroll right"
          >
            <i className="bi bi-chevron-right fs-5"></i>
          </button>
        </>
      )}

      {/* Scrollable Collections */}
      <div
        ref={scrollRef}
        className="d-flex overflow-auto gap-4 pb-2"
        style={{
          scrollSnapType: "x mandatory",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        {collections.map((col, index) => (
          <Link
            to={`/collection/${col.id}`}
            key={index}
            className="text-decoration-none text-dark flex-shrink-0"
            style={{ width: "18rem", scrollSnapAlign: "start" }}
          >
            <div className="card border-0 shadow-sm h-100">
              <img
                src={col.image}
                alt={col.title}
                className="w-100"
                style={{
                  height: "14rem",
                  objectFit: "cover",
                  borderTopLeftRadius: "0.5rem",
                  borderTopRightRadius: "0.5rem",
                }}
              />
              <div className="card-body">
                <h5 className="card-title fw-semibold mb-1">{col.title}</h5>
                <p className="card-text text-muted small mb-2">{col.description}</p>
                <span className="btn btn-sm btn-outline-dark rounded-pill">View Collection</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
