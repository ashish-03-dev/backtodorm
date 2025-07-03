import React, { useRef, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { collection, getDocs, query, limit } from "firebase/firestore";
import { useFirebase } from "../../context/FirebaseContext";
import { BsChevronLeft, BsChevronRight } from "react-icons/bs";

export default function HorizontalCollectionScroll() {
  const { firestore } = useFirebase();
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);

  const ensureString = (value) => (typeof value === "string" ? value : "");

  useEffect(() => {
    const fetchCollections = async () => {
      if (!firestore) {
        setError("Invalid Firestore instance");
        setLoading(false);
        return;
      }

      try {
        const collectionsRef = collection(firestore, "standaloneCollections");
        const q = query(collectionsRef, limit(8));
        const snapshot = await getDocs(q);

        const fetchedCollections = snapshot.docs.map((doc) => ({
          id: doc.id,
          title: ensureString(doc.data().title),
          description: ensureString(doc.data().description),
          imageUrl: ensureString(doc.data().imageUrl),
          discount: Number.isFinite(doc.data().discount) ? doc.data().discount : 0,
          posters: Array.isArray(doc.data().posters) ? doc.data().posters : [],
        }));

        setCollections(fetchedCollections);
        setLoading(false);
      } catch (err) {
        setError("Failed to load collections: " + err.message);
        setLoading(false);
      }
    };

    fetchCollections();
  }, [firestore]);

  const scroll = (direction) => {
    const container = scrollRef.current;
    if (container) {
      const scrollAmount = 320;
      container.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  return (
    <section
      className="py-4 py-md-5 px-3 position-relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <h2 className="fs-2 fw-bold mb-4 text-center">Collection Packs</h2>

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
        {loading ? (
          <div className="w-100 text-center py-4">Loading collections...</div>
        ) : error ? (
          <div className="w-100 text-center text-danger py-4">{error}</div>
        ) : (
          <>
            {isHovered && (
              <>
                <button
                  onClick={() => scroll("left")}
                  className="btn btn-light rounded-circle position-absolute top-50 start-0 translate-middle-y d-none d-md-flex align-items-center justify-content-center shadow"
                  style={{ width: "40px", height: "40px", zIndex: 10 }}
                  aria-label="Scroll left"
                >
                  <BsChevronLeft className="fs-5" />
                </button>
                <button
                  onClick={() => scroll("right")}
                  className="btn btn-light rounded-circle position-absolute top-50 end-0 translate-middle-y d-none d-md-flex align-items-center justify-content-center shadow"
                  style={{ width: "40px", height: "40px", zIndex: 10 }}
                  aria-label="Scroll right"
                >
                  <BsChevronRight className="fs-5" />
                </button>
              </>
            )}
            {collections.map((col) => (
              <Link
                to={`/collection/${col.id}`}
                key={col.id}
                className="text-decoration-none text-dark flex-shrink-0 collection-cards"
                style={{ scrollSnapAlign: "start" }}
              >
                <div className="card border h-100">
                  <img
                    src={col.imageUrl}
                    alt={col.title}
                    className="w-100"
                    style={{
                      aspectRatio: "20/23",
                      objectFit: "cover",
                      borderTopLeftRadius: "0.5rem",
                      borderTopRightRadius: "0.5rem",
                    }}
                  />
                  <div className="card-body d-flex flex-column justify-content-between">
                    <div>
                      <h5 className="card-title fw-semibold mb-1">{col.title}</h5>
                      <p className="card-text text-muted small mb-2">{col.description}</p>
                    </div>
                    <div>
                      <span className="btn btn-sm btn-outline-dark rounded-pill">View Collection</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </>
        )}
      </div>
      <div className="text-center mt-4">
        <Link to="/collections-packs" className="btn btn-outline-dark">
          View All
        </Link>
      </div>
    </section>
  );
}