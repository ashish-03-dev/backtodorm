import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import '../styles/CategoryGrid.css';

const categoryCards = [
  {
    title: "Pop Culture",
    link: "/collections/pop-culture",
    images: [
      "/images/trending/image1.png",
      "/images/trending/image2.png",
      "/images/trending/image3.png",
    ],
  },
  {
    title: "Nature & Cosmos",
    link: "/collections/nature",
    images: [
      "/images/trending/image4.png",
      "/images/trending/image5.png",
      "/images/trending/image6.png",
      "/images/trending/image7.png",
      "/images/trending/image8.png",
      "/images/trending/image9.png",
    ],
  },
  {
    title: "Styles & Aesthetic",
    link: "/collections/style",
    images: [
      "/images/trending/image7.png",
      "/images/trending/image8.png",
      "/images/trending/image9.png",
    ],
  },
  {
    title: "Pop Culture",
    link: "/collections/pop-culture",
    images: [
      "/images/trending/image10.png",
      "/images/trending/image11.png",
      "/images/trending/image12.png",
    ],
  },
  {
    title: "Nature & Cosmos",
    link: "/collections/nature",
    images: [
      "/images/trending/image5.png",
      "/images/trending/image6.png",
      "/images/trending/image7.png",
      "/images/trending/image8.png",
      "/images/trending/image9.png",
    ],
  },
  {
    title: "Styles & Aesthetic",
    link: "/collections/style",
    images: [
      "/images/trending/image10.png",
      "/images/trending/image11.png",
      "/images/trending/image12.png",
    ],
  },
];

export default function ShopByCategory() {
  const [isHovered, setIsHovered] = useState(false);
  const scrollRef = useRef();

  return (
    <section
      className="pt-5 pb-4 py-md-5 px-3 position-relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <h2 className="fs-2 fw-bold mb-4 text-center">Shop by Category</h2>

      {isHovered && (
        <>
          <button
            onClick={() => scrollRef.current.scrollBy({ left: -300, behavior: "smooth" })}
            className="btn btn-light rounded-circle position-absolute top-50 start-0 translate-middle-y d-none d-md-flex align-items-center justify-content-center shadow-sm"
            style={{ width: 40, height: 40, zIndex: 10 }}
          >
            <i className="bi bi-chevron-left fs-5"></i>
          </button>

          <button
            onClick={() => scrollRef.current.scrollBy({ left: 300, behavior: "smooth" })}
            className="btn btn-light rounded-circle position-absolute top-50 end-0 translate-middle-y d-none d-md-flex align-items-center justify-content-center shadow-sm"
            style={{ width: 40, height: 40, zIndex: 10 }}
          >
            <i className="bi bi-chevron-right fs-5"></i>
          </button>
        </>
      )}

      <div
        ref={scrollRef}
        className="d-flex overflow-auto pb-2 container-category"
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          scrollSnapType: "x mandatory",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {categoryCards.map((cat, index) => (
          <SlidingCard
            key={index}
            title={cat.title}
            link={cat.link}
            images={cat.images} // Each should be an array of image URLs
          />
        ))}
        <div style={{ width: "1rem", flexShrink: 0 }}></div>
      </div>
    </section>
  );
}

function SlidingCard({ title, link, images }) {

  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % images.length);
    }, 3000); // adjust timing as needed
    return () => clearInterval(interval);
  }, [images.length]);

  return (
    <Link to={link} className="text-decoration-none text-dark" style={{ scrollSnapAlign: "start" }}>
      <div className="card shadow-sm flex-shrink-0 border-0 rounded-1 category-card d-flex-flex-column" style={{ overflow: "hidden" }}>
        <div
          className="d-flex"
          style={{
            width: `${images.length * 100}%`,
            transform: `translateX(-${index * (100 / images.length)}%)`,
            transition: "transform 0.6s ease-in-out",
          }}
        >
          {images.map((src, i) => (
            <img
              key={i}
              src={src}
              alt={`${title} ${i}`}
              className="w-100"
              style={{
                height: "17rem",
                objectFit: "cover",
                flex: `0 0 ${100 / images.length}%`,
              }}
            />
          ))}
        </div>
        <div className="card-body d-flex justify-content-center align-items-center" style={{ flexGrow: 1, minHeight: 0 }}>
          <h6 className="mb-0 fw-semibold fs-6 text-center">{title}</h6>
        </div>
      </div>
    </Link>
  );
}
