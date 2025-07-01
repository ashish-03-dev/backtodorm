import React, { useRef, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { useFirebase } from "../../context/FirebaseContext"; // Adjust path as needed
import { BsChevronLeft, BsChevronRight } from 'react-icons/bs';
 
export default function HorizontalCollectionScroll({ title }) {
  const { firestore } = useFirebase();
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);

  // Helper to ensure string or empty string
  const ensureString = (value) => (typeof value === "string" ? value : "");

  useEffect(() => {
    const fetchCollections = async () => {
      if (!firestore) {
        setError("Invalid Firestore instance");
        setLoading(false);
        return;
      }

      try {
        // Fetch standaloneCollections
        const collectionsRef = collection(firestore, "standaloneCollections");
        const snapshot = await getDocs(collectionsRef);
        const fetchedCollections = snapshot.docs.map((doc) => ({
          id: doc.id,
          title: ensureString(doc.data().title),
          description: ensureString(doc.data().description),
          image: ensureString(doc.data().image), // posterId or legacy URL
          discount: Number.isFinite(doc.data().discount) ? doc.data().discount : 20,
          posters: Array.isArray(doc.data().posters) ? doc.data().posters : [],
        }));

        // Collect unique posterIds from image fields
        const posterIds = [...new Set(fetchedCollections.map((col) => col.image).filter((id) => id && /^[a-zA-Z0-9_-]+$/.test(id)))];
        const posterImages = {};

        // Fetch poster image URLs
        if (posterIds.length) {
          await Promise.all(
            posterIds.map(async (posterId) => {
              try {
                const posterRef = doc(firestore, "posters", posterId);
                const posterSnap = await getDoc(posterRef);
                if (posterSnap.exists() && posterSnap.data().imageUrl) {
                  posterImages[posterId] = ensureString(posterSnap.data().imageUrl);
                } else {
                  posterImages[posterId] = "https://via.placeholder.com/150"; // Placeholder
                }
              } catch (err) {
                console.warn(`Failed to fetch poster ${posterId}: ${err.message}`);
                posterImages[posterId] = "https://via.placeholder.com/150"; // Placeholder
              }
            })
          );
        }

        // Map collections with image URLs
        const collectionsWithImages = fetchedCollections.map((col) => {
          let imageUrl = "https://via.placeholder.com/150"; // Default placeholder
          if (col.image) {
            if (/^[a-zA-Z0-9_-]+$/.test(col.image)) {
              // posterId
              imageUrl = posterImages[col.image] || imageUrl;
            } else if (col.image.startsWith("http")) {
              // Legacy URL
              imageUrl = col.image;
            }
          }
          return { ...col, imageUrl };
        });

        setCollections(collectionsWithImages);
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
    const scrollAmount = 320;
    container.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  if (loading) {
    return <div>Loading collections...</div>;
  }

  if (error) {
    return <div className="text-danger">{error}</div>;
  }

  return (
    <section
      className="py-4 py-md-5 px-3 position-relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <h2 className="fs-2 fw-bold mb-4">{title}</h2>

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
                onError={(e) => {
                  e.target.src = "https://via.placeholder.com/150"; // Fallback on load error
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
      </div>
    </section>
  );
}