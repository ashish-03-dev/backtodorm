import React, { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import trending from '../../data/trending';

export default function Trending() {

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
        className="d-flex overflow-auto gap-2 pb-2"
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          scrollBehavior: "smooth",
          scrollSnapType: "x mandatory",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {trending.map((item, index) => (
          <Link
            to={`/poster/${item.id}`}
            key={index}
            className="text-decoration-none text-dark flex-shrink-0 trending-cards"
            style={{ scrollSnapAlign: "start" }}
          >
            <div
              className="card border-0 rounded-0 position-relative"
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
                  aspectRatio: '4/5',
                  objectFit: "cover",
                }}
              />
              <div className="pt-3 px-4 d-flex flex-column text-center">
                <h6 className="card-title mb-1 text-center" style={{ fontSize: ".92rem" }}>{item.title}</h6>
                <p className="" style={{ fontSize: "17px" }} >From ₹{item.price}</p>
              </div>
              <button
                // onClick={() => addToCart(item)}
                className="btn btn-dark mt-auto"
              >
                Add to Cart
              </button>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
