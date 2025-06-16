import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import '../../styles/CategoryScroll.css';
import { useFirebase } from "../../context/FirebaseContext"; // Adjust path as needed
import { collection, onSnapshot, doc, getDoc } from "firebase/firestore";

// Utility function to capitalize the first letter of each word
const capitalizeTitle = (str) => {
  return str
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

export default function ShopByCategory() {
  const { firestore } = useFirebase();
  const [isHovered, setIsHovered] = useState(false);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const scrollRef = useRef();

  useEffect(() => {
    if (!firestore) {
      setError("Firestore is not available.");
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      collection(firestore, "homeSections", "categories", "homecategories"),
      async (snapshot) => {
        try {
          const categoryData = await Promise.all(
            snapshot.docs.map(async (categoryDoc) => {
              const data = categoryDoc.data();
              // Fetch poster URLs from the posters collection using imageIds
              const posterPromises = (data.imageIds || []).map(async (posterId) => {
                const posterRef = doc(firestore, "posters", posterId);
                const posterDoc = await getDoc(posterRef);
                return posterDoc.exists() ? posterDoc.data().imageUrl : null; // Assuming imageUrl field in poster
              });
              const imageUrls = (await Promise.all(posterPromises)).filter(url => url);
              
              return {
                id: categoryDoc.id,
                title: capitalizeTitle(data.title || categoryDoc.id), // Capitalize title
                link: data.link || `/category/${categoryDoc.id}`, // Fallback link
                images: imageUrls
              };
            })
          );
          setCategories(categoryData.filter(cat => cat.images.length > 0)); // Only include categories with images
          setLoading(false);
        } catch (err) {
          console.error("Error fetching categories:", err);
          setError("Failed to load categories.");
          setLoading(false);
        }
      },
      (error) => {
        console.error("Firestore snapshot error:", error);
        setError("Failed to load categories.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [firestore]);

  if (loading) {
    return <div className="text-center py-5">Loading...</div>;
  }

  if (error) {
    return <div className="text-center py-5 text-danger">{error}</div>;
  }

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
        className="d-flex overflow-auto pb-2 gap-2 gap-md-3 "
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          scrollSnapType: "x mandatory",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {categories.map((cat, index) => (
          <SlidingCard
            key={cat.id}
            title={cat.title}
            link={cat.link}
            images={cat.images}
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
    }, 3000);
    return () => clearInterval(interval);
  }, [images.length]);

  return (
    <Link to={link} className="text-decoration-none text-dark" style={{ scrollSnapAlign: "start" }}>
      <div className="card shadow-sm flex-shrink-0 border-0 rounded-1 d-flex-flex-column category-card" style={{ overflow: "hidden" }}>
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
              style={{
                height: "17rem",
                objectFit: "cover",
                flex: `0 0 ${100 / images.length}%`,
              }}
            />
          ))}
        </div>
        <div className="card-body d-flex justify-content-center align-items-center" style={{ flexGrow: 1, minHeight: 0 }}>
          <h6 className="mb-0 fw-semibold fs-6 text-center">{title}</h6> {/* Title is already capitalized */}
        </div>
      </div>
    </Link>
  );
}