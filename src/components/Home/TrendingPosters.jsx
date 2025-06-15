import React, { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { doc, getDoc, getDocs, query, collection, where } from "firebase/firestore";
import { useFirebase } from '../../context/FirebaseContext';
import '../../styles/trendingPosters.css';

async function fetchTrendingPosters(firestore) {
  try {
    const sectionSnap = await getDoc(doc(firestore, "homeSections", "trending"));
    if (!sectionSnap.exists()) {
      console.error("Trending section document does not exist");
      return [];
    }
    const section = sectionSnap.data();
    if (!section.posterIds?.length) {
      console.warn("No poster IDs found in trending section");
      return [];
    }

    const posterIds = section.posterIds.slice(0, 10);
    if (posterIds.length === 0) return [];

    const postersQuery = query(
      collection(firestore, "posters"),
      where("id", "in", posterIds),
      // where("__name__", "in", posterIds),
      // where("approved", "==", "approved"),
      where("isActive", "==", true)
    );

    const postersSnap = await getDocs(postersQuery);
    return postersSnap.docs.map((doc) => ({
      id: doc.id,
      title: doc.data().title,
      image: doc.data().imageUrl,
      price: doc.data().finalPrice,
      sizes: doc.data().sizes || [],
      originalPrice: doc.data().price,
      discount: doc.data().discount
    }));
  } catch (error) {
    console.error("Error fetching trending posters:", error);
    return [];
  }
}

export default function Trending() {
  const { firestore } = useFirebase();
  const [posters, setPosters] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    async function loadPosters() {
      setIsLoading(true);
      setError(null);
      const fetchedPosters = await fetchTrendingPosters(firestore);
      setPosters(fetchedPosters);
      setIsLoading(false);
    }
    loadPosters();
  }, [firestore]);

  const scroll = (direction) => {
    const container = scrollRef.current;
    if (direction === "left") {
      container.scrollBy({ left: -300, behavior: "smooth" });
    } else {
      container.scrollBy({ left: 300, behavior: "smooth" });
    }
  };

  // Skeleton Card Component
  const SkeletonCard = () => (
    <div
      className="card border-0 rounded-0 flex-shrink-0 trending-cards"
      style={{ scrollSnapAlign: "start" }}
    >
      <div
        className="skeleton-image bg-light"
        style={{
          aspectRatio: '4/5',
          width: '100%',
          backgroundColor: '#e0e0e0',
          animation: 'pulse 1.5s infinite',
        }}
      ></div>
      <div className="pt-3 px-4 d-flex flex-column text-center">
        <div
          className="skeleton-text bg-light mb-1"
          style={{
            height: '1rem',
            width: '80%',
            margin: '0 auto',
            backgroundColor: '#e0e0e0',
            animation: 'pulse 1.5s infinite',
          }}
        ></div>
        <div
          className="skeleton-text bg-light mb-2"
          style={{
            height: '1rem',
            width: '60%',
            margin: '0 auto',
            backgroundColor: '#e0e0e0',
            animation: 'pulse 1.5s infinite',
          }}
        ></div>
        <div
          className="skeleton-button bg-light mt-auto"
          style={{
            height: '2.5rem',
            width: '100%',
            backgroundColor: '#e0e0e0',
            animation: 'pulse 1.5s infinite',
          }}
        ></div>
      </div>
    </div>
  );

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
            aria-label="Scroll left"
          >
            <i className="bi bi-chevron-left fs-5"></i>
          </button>
          <button
            onClick={() => scroll("right")}
            className="btn btn-light rounded-circle position-absolute top-50 end-0 translate-middle-y d-none d-md-flex align-items-center justify-content-center shadow-sm"
            style={{ width: "40px", height: "40px", zIndex: 10 }}
            aria-label="Scroll right"
          >
            <i className="bi bi-chevron-right fs-5"></i>
          </button>
        </>
      )}

      {/* Loading State */}
      {isLoading && (
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
          {Array(5).fill().map((_, index) => (
            <SkeletonCard key={index} />
          ))}
        </div>
      )}
      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      {/* Scrollable Poster List */}
      {!isLoading && !error && (
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
          {posters.length === 0 && (
            <div className="text-center py-4 w-100">
              <p className="text-muted">No trending posters available.</p>
            </div>
          )}
          {posters.map((item) => (
            <Link
              to={`/poster/${item.id}`}
              key={item.id}
              className="text-decoration-none text-dark flex-shrink-0 trending-cards"
              style={{ scrollSnapAlign: "start" }}
            >
              <div
                className="card border-0 rounded-0 position-relative"
                style={{ width: "100%", minHeight: "350px" }}
              >
                {/* Size Badges */}
                <div className="position-absolute top-0 start-0 m-2 d-flex flex-wrap gap-1 size-badges">
                  {item.sizes.map((size, i) => (
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
                  loading="lazy"
                  style={{
                    aspectRatio: '4/5',
                    objectFit: "cover",
                    minHeight: "200px",
                  }}
                />
                <div className="pt-3 px-2 d-flex flex-column text-center">
                  <h6
                    className="card-title mb-1 text-center text-truncate-2-lines"
                    style={{ fontSize: ".92rem" }}
                    title={item.title}
                  >
                    {item.title}
                  </h6>
                  <p className="mb-2" style={{ fontSize: "17px" }}>
                    {item.discount > 0 ? (
                      <>
                        <span className="text-muted text-decoration-line-through me-2">
                          From ₹{item.originalPrice}
                        </span>
                        <span>From ₹{item.price}</span>
                      </>
                    ) : (
                      <span>From ₹{item.price}</span>
                    )}
                  </p>
                </div>
                <button
                  className="btn btn-dark mt-auto"
                >
                  Add to Cart
                </button>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}