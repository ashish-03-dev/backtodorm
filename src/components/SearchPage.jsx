import React, { useEffect } from "react";
import { useFirebase } from "../context/FirebaseContext";
import { collection, query, where, getDocs, getDoc, doc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { useSearch } from "../context/SearchContext";

export default function SearchPage() {
  const { firestore } = useFirebase();
  const navigate = useNavigate();
  const { searchState, updateSearchState } = useSearch();
  const { queryString, results, loading, imagesLoading, error } = searchState;

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!queryString.trim()) {
      updateSearchState({ error: "Please enter a search term." });
      return;
    }

    updateSearchState({ loading: true, error: "" });
    try {
      const postersRef = collection(firestore, "posters");
      let posterIds = new Set();
      const searchTerm = queryString.toLowerCase().trim();

      // Search by keywords
      const keywordQuery = query(
        postersRef,
        where("keywords", "array-contains", searchTerm),
        where("approved", "==", "approved"),
        where("isActive", "==", true)
      );
      const keywordSnapshot = await getDocs(keywordQuery);
      console.log("Keyword query results:", keywordSnapshot.docs.length);
      keywordSnapshot.forEach((doc) => posterIds.add(doc.id));

      // Search by collections field in posters
      const collectionQuery = query(
        postersRef,
        where("collections", "array-contains", searchTerm),
        where("approved", "==", "approved"),
        where("isActive", "==", true)
      );
      const collectionSnapshot = await getDocs(collectionQuery);
      console.log("Collections field query results:", collectionSnapshot.docs.length);
      collectionSnapshot.forEach((doc) => posterIds.add(doc.id));

      // Search by collection document IDs in collections collection
      const collectionsRef = collection(firestore, "collections");
      const collectionsQuery = query(
        collectionsRef,
        where("__name__", ">=", searchTerm),
        where("__name__", "<=", searchTerm + "\uf8ff")
      );
      const collectionsSnapshot = await getDocs(collectionsQuery);
      console.log("Collections ID query results:", collectionsSnapshot.docs.length);
      collectionsSnapshot.forEach((doc) => {
        const collectionData = doc.data();
        console.log(`Collection document (ID: ${doc.id}):`, collectionData);
        const posterIdsArray = collectionData.posterIds || [];
        console.log(`Collection ${collectionData.name} posterIds:`, posterIdsArray);
        if (posterIdsArray.length === 0) {
          console.warn(`No posterIds found in collection ${collectionData.name} (ID: ${doc.id})`);
        }
        posterIdsArray.forEach((id) => {
          if (id && typeof id === "string") {
            posterIds.add(id);
          } else {
            console.warn(`Invalid posterId in ${collectionData.name} (ID: ${doc.id}):`, id);
          }
        });
      });

      console.log("Total unique poster IDs:", posterIds.size);
      if (posterIds.size === 0) {
        console.warn("No poster IDs found from any query.");
      }

      const searchResults = [];
      for (const posterId of posterIds) {
        const posterRef = doc(firestore, "posters", posterId);
        const docSnap = await getDoc(posterRef);
        if (docSnap.exists()) {
          const posterData = docSnap.data();
          // TODO: Revert to `if (posterData.approved === "approved" && posterData.isActive)` in production
          if (true) {
            // Validate sizes field
            if (!Array.isArray(posterData.sizes) || posterData.sizes.length === 0) {
              console.warn(`Poster ${posterId} has invalid sizes:`, posterData.sizes);
              continue;
            }

            const poster = { id: docSnap.id, ...posterData };
            let sellerName = "Unknown";
            try {
              const userDoc = await getDoc(doc(firestore, "users", poster.seller));
              if (userDoc.exists()) {
                sellerName = userDoc.data().name || "Unknown User";
              }
            } catch (err) {
              console.error(`Error fetching seller name for poster ${posterId}:`, err);
            }

            const cheapestPrice = posterData.sizes.reduce((min, size) => {
              return Math.min(min, size.finalPrice || size.price);
            }, Infinity);

            searchResults.push({ ...poster, sellerName, cheapestPrice });
            console.log(`Poster ${posterId} included:`, { approved: posterData.approved, isActive: posterData.isActive, sizes: posterData.sizes });
          } else {
            console.log(
              `Poster ${posterId} skipped: approved=${posterData.approved}, isActive=${posterData.isActive}`
            );
          }
        } else {
          console.log(`Poster ${posterId} does not exist`);
        }
      }

      console.log("Final search results:", searchResults.length);
      updateSearchState({ results: searchResults, imagesLoading: true });
    } catch (err) {
      updateSearchState({ error: "Failed to fetch search results.", imagesLoading: false });
      console.error("Error searching posters:", err);
    }
    updateSearchState({ loading: false });
  };

  // Simulate image loading completion
  useEffect(() => {
    if (imagesLoading && results.length > 0) {
      const timer = setTimeout(() => {
        updateSearchState({ imagesLoading: false });
      }, 1000); // 1 second delay
      return () => clearTimeout(timer);
    }
  }, [imagesLoading, results]);

  const handleViewPoster = (posterId) => {
    navigate(`/poster/${posterId}`);
  };

  // Skeleton component for loading state using Bootstrap
  const PosterSkeleton = () => (
    <div className="col-6 col-md-3 mb-4">
      <div className="card h-100 shadow-sm">
        <div className="placeholder-glow">
          <div className="placeholder" style={{ height: "300px" }}></div>
        </div>
        <div className="card-body d-flex flex-column">
          <div className="placeholder-glow mb-2">
            <div className="placeholder col-6"></div>
          </div>
          <div className="placeholder-glow mb-2">
            <div className="placeholder col-4"></div>
          </div>
          <div className="placeholder-glow mb-4">
            <div className="placeholder col-3"></div>
          </div>
          <div className="placeholder-glow mt-auto">
            <div className="placeholder col-5"></div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="container py-4"  style={{minHeight:"calc(100svh - 65px)"}}>
      <h2>Search Posters</h2>
      <form onSubmit={handleSearch} className="mb-4">
        <div className="input-group mb-3">
          <input
            type="text"
            className="form-control"
            placeholder="Search posters by title, tags, style, or collection (e.g., movies, cars)..."
            value={queryString}
            onChange={(e) => updateSearchState({ queryString: e.target.value })}
            aria-label="Search posters"
          />
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                Searching...
              </>
            ) : (
              <>
                <i className="bi bi-search me-1"></i> Search
              </>
            )}
          </button>
        </div>
        {error && <div className="alert alert-danger">{error}</div>}
      </form>

      {imagesLoading ? (
        <div className="row">
          {[...Array(6)].map((_, index) => (
            <PosterSkeleton key={index} />
          ))}
        </div>
      ) : loading ? (
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : results.length === 0 && queryString.trim() && !loading ? (
        <p className="text-muted">No posters found. Try a different search term.</p>
      ) : (
        <div className="row">
          {results.map((poster) => (
            <div key={poster.id} className="col-6 col-md-3 mb-4">
              <div className="card h-100 shadow-sm">
                <img
                  src={poster.imageUrl}
                  className="card-img-top"
                  alt={poster.title}
                  style={{ height: "300px", objectFit: "cover" }}
                />
                <div className="card-body d-flex flex-column">
                  <h6 className="card-title">{poster.title}</h6>
                  <p className="card-text text-muted">By {poster.sellerName}</p>
                  <p className="card-text fw-semibold">
                    ${poster.cheapestPrice.toFixed(2)}
                    {poster.discount > 0 && (
                      <span className="text-success ms-2">({poster.discount}% off)</span>
                    )}
                  </p>
                  <button
                    className="btn btn-outline-primary mt-auto"
                    onClick={() => handleViewPoster(poster.id)}
                  >
                    View Poster
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}