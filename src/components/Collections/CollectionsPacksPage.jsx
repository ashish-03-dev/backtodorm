import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { useFirebase } from "../../context/FirebaseContext";
import { Link, useLocation } from "react-router-dom";

// Module-level state to persist across navigation
const staticState = {
  collections: [],
  loading: true,
  error: null,
  scrollPosition: 0,
};

// Helper to update and retrieve static state
const updateStaticState = (newState) => {
  Object.assign(staticState, newState);
};

// Reset state function
const resetStaticState = () => {
  updateStaticState({
    collections: [],
    loading: true,
    error: null,
    scrollPosition: 0,
  });
};

export default function CollectionsPacksPage() {
  const { firestore } = useFirebase();
  const location = useLocation(); // To detect navigation changes
  const [localState, setLocalState] = useState({ ...staticState });

  const ensureString = (value) => (typeof value === "string" ? value : "");

  const fetchCollections = async () => {
    if (!firestore) {
      updateStaticState({ error: "Firestore is not available.", loading: false });
      setLocalState({ ...staticState });
      return;
    }

    try {
      const collectionsRef = collection(firestore, "standaloneCollections");
      const snapshot = await getDocs(collectionsRef);
      const fetched = snapshot.docs.map((doc) => ({
        id: doc.id,
        title: ensureString(doc.data().title),
        description: ensureString(doc.data().description),
        imageUrl: ensureString(doc.data().imageUrl),
        discount: Number.isFinite(doc.data().discount) ? doc.data().discount : 0,
      }));
      updateStaticState({ collections: fetched, loading: false });
      setLocalState({ ...staticState });
    } catch (err) {
      console.error("Error fetching collections:", err);
      updateStaticState({ error: "Failed to load collections: " + err.message, loading: false });
      setLocalState({ ...staticState });
    }
  };

  useEffect(() => {
    // Restore state and scroll position when navigating back
    if (staticState.collections.length > 0) {
      setLocalState({ ...staticState });
      window.scrollTo({ top: staticState.scrollPosition, behavior: "instant" });
    } else if (!staticState.error) {
      resetStaticState();
      setLocalState({ ...staticState });
      fetchCollections();
    }
  }, [firestore, location]); // Trigger on location change

  useEffect(() => {
    const handleScroll = () => {
      updateStaticState({ scrollPosition: window.scrollY });
      setLocalState((prev) => ({ ...prev, scrollPosition: window.scrollY }));
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const resetState = () => {
    resetStaticState();
    setLocalState({ ...staticState });
    fetchCollections();
  };

  if (localState.loading && localState.collections.length === 0) {
    return <div className="container py-5 text-center">Loading...</div>;
  }

  if (localState.error) {
    return (
      <div className="container py-5 text-center">
        <p className="text-danger">{localState.error}</p>
        <button className="btn btn-primary mt-3" onClick={resetState}>
          Try Again
        </button>
      </div>
    );
  }

  return (
    <section className="container py-5">
      <h1 className="fw-bold mb-4 text-center">All Collections</h1>
      <div className="row g-4">
        {localState.collections.map((col) => (
          <div key={col.id} className="col-6 col-md-4 col-lg-3">
            <Link to={`/collection/${col.id}`} className="text-decoration-none text-dark">
              <div className="card h-100 border">
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
                    <p className="card-text text-muted small">{col.description}</p>
                  </div>
                  <div>
                    <span className="btn btn-sm btn-outline-dark rounded-pill">View Collection</span>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}