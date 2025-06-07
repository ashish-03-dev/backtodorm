import React, { useRef, useState } from "react";

const reviews = [
  { name: "Amit", comment: "Amazing quality!" },
  { name: "Sana", comment: "Loved the designs!" },
  { name: "Ravi", comment: "Quick delivery and great service." },
  { name: "Neha", comment: "Excellent prints and colors." },
  { name: "Rahul", comment: "Fast delivery and responsive support." },
  { name: "Priya", comment: "Will order again for sure!" },
];

export default function CustomerReviews() {
  const scrollRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);

  const scroll = (direction) => {
    const container = scrollRef.current;
    const scrollAmount = container.offsetWidth * 0.9; // scroll almost full container width

    if (direction === "left") {
      container.scrollBy({ left: -scrollAmount, behavior: "smooth" });
    } else {
      container.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  return (
    <section
      className="py-5 px-3 bg-white position-relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <h2 className="fs-2 fw-bold mb-4 text-center">What Our Customers Say</h2>

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

      {/* Scrollable Review List */}
      <div
        ref={scrollRef}
        className="d-flex overflow-auto gap-3"
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          scrollBehavior: "smooth",
          paddingBottom: "0.5rem",
        }}
      >
        {reviews.map((r, i) => (
          <div
            key={i}
            className="bg-white p-4 border rounded shadow-sm flex-shrink-0"
            style={{ minWidth: "280px", maxWidth: "280px" }}
          >
            <p className="fst-italic mb-2">“{r.comment}”</p>
            <p className="fw-semibold text-end">- {r.name}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
