import React, { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import bestsellers from '../data/bestsellers';
import '../styles/trendingPosters.css';

export default function Trending() {
  const items = [
    {
      id: "anime-hero-collage",
      title: "Anime Hero Collage",
      image: "/images/bestsellers/image1.png",
      price: 249,
      sizes: ["A4", "A3"]
    },
    {
      id: "classic-car-sideview",
      title: "Classic Car Sideview",
      image: "/images/bestsellers/image2.png",

      price: 199,
      sizes: ["Multi-Part"]
    },
    {
      id: "minimal-plant-study",
      title: "Minimal Plant Study",
      image: "/images/bestsellers/image3.png",

      price: 149,
      sizes: ["A4", "A3"]
    },
    {
      id: "nature-landscapes",
      title: "Nature Landscapes",
      image: "/images/bestsellers/image4.png",

      price: 299,
      sizes: ["A3", "A2"]
    },
    {
      id: "inspirational-quotes-pack",
      title: "Inspirational Quotes Pack",
      image: "/images/bestsellers/image5.png",

      price: 199,
      sizes: ["A4"]
    },
    {
      id: "anime-classics-collection",
      title: "Anime Classics Collection",
      image: "/images/bestsellers/image6.png",

      price: 399,
      sizes: ["A2"]
    },
    {
      id: "poster-mega-pack",
      title: "50 Poster Mega Pack",
      image: "/images/bestsellers/image7.png",

      price: 999,
      sizes: ["Multi-Part"]
    },
    {
      id: "ultimate-anime-pack",
      title: "Ultimate Anime Pack",
      image: "/images/bestsellers/image8.png",

      price: 699,
      sizes: ["A4", "A3"]
    },
    {
      id: "aesthetic-wall-collection",
      title: "Aesthetic Wall Collection",
      image: "/images/bestsellers/image9.png",

      price: 299,
      sizes: ["A4", "A3", "A2"]
    }
  ];


  const scrollRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);

  const scroll = (direction) => {
    const container = scrollRef.current;
    if (direction === "left") {
      container.scrollBy({ left: -300, behavior: "smooth" });
    } else {
      container.scrollBy({ left: 300, behavior: "smooth" });
    }
  };

  return (
    <section
      className="py-4 py-md-5 px-3 position-relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <h2 className="fs-2 fw-bold mb-4">Trending Posters</h2>

      {/* Scroll Buttons */}
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

      {/* Scrollable Poster List */}
      <div
        ref={scrollRef}
        className="d-flex overflow-auto gap-3 pb-2"
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          scrollBehavior: "smooth",
          scrollSnapType: "x mandatory",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {items.map((item, index) => (
          <Link
            to={`/product/${item.id}`}
            key={index}
            className="text-decoration-none text-dark flex-shrink-0 trending-cards"
            style={{scrollSnapAlign: "start" }}
          >
            <div
              className="card shadow-sm border-0  position-relative"
              style={{ width: "100%" }}
            >
              {/* Size Badges */}
              <div className="position-absolute top-0 start-0 m-2 d-flex flex-wrap gap-1 size-badges">
                {item.sizes?.map((size, i) => (
                  <span
                    key={i}
                    className="badge bg-light border text-muted small fw-normal"
                  >
                    {size}
                  </span>
                ))}
              </div>

              <img
                src={item.image}
                alt={item.title}
                className="w-100"
                style={{
                  height: "20rem",
                  objectFit: "cover",
                  borderRadius: ".375rem",
                }}
              />
              <div className="card-body p-2 fs-5 fw-medium">
                <h6 className="card-title text-truncate mb-1">{item.title}</h6>
                <p className="text-muted small mb-0">From ₹{item.price}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
