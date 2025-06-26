import React, { useEffect } from "react";
import { useFirebase } from "../context/FirebaseContext";
import { collection, query, where, getDocs, getDoc, doc } from "firebase/firestore";
import { Link, useNavigate } from "react-router-dom";
import { useSearch } from "../context/SearchContext";

export default function SearchPage() {
  const { firestore } = useFirebase();
  const navigate = useNavigate();
  const { searchState, updateSearchState } = useSearch();
  const { queryString, results, loading, imagesLoading, error } = searchState;

  const normalizeSearchTerm = (term) => {
    if (!term || typeof term !== "string") return [];
    const lower = term.toLowerCase().trim();
    const title = lower
      .split(/\s+|-/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
    const hyphenated = lower.replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    return [...new Set([lower, title, hyphenated])].filter(Boolean);
  };

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
      const searchTerms = normalizeSearchTerm(queryString);

      if (!searchTerms.length) {
        throw new Error("Invalid search term after normalization");
      }

      for (const searchTerm of searchTerms) {
        try {
          // Search by keywords
          const keywordQuery = query(
            postersRef,
            where("keywords", "array-contains", searchTerm),
            where("approved", "==", "approved"),
            where("isActive", "==", true)
          );
          const keywordSnapshot = await getDocs(keywordQuery);
          console.log(`Keyword query results for ${searchTerm}:`, keywordSnapshot.docs.length);
          keywordSnapshot.forEach((doc) => posterIds.add(doc.id));
        } catch (err) {
          console.warn(`Keyword query failed for ${searchTerm}:`, err.message);
        }

        // Search by tags (use hyphenated form)
        if (searchTerm === searchTerms[2]) {
          try {
            const tagQuery = query(
              postersRef,
              where("tags", "array-contains", searchTerm),
              where("approved", "==", "approved"),
              where("isActive", "==", true)
            );
            const tagSnapshot = await getDocs(tagQuery);
            console.log(`Tag query results for ${searchTerm}:`, tagSnapshot.docs.length);
            tagSnapshot.forEach((doc) => posterIds.add(doc.id));
          } catch (err) {
            console.warn(`Tag query failed for ${searchTerm}:`, err.message);
          }
        }

        // Search by collections
        try {
          const collectionQuery = query(
            postersRef,
            where("collections", "array-contains", searchTerm.toLowerCase()),
            where("approved", "==", "approved"),
            where("isActive", "==", true)
          );
          const collectionSnapshot = await getDocs(collectionQuery);
          console.log(`Collections field query results for ${searchTerm}:`, collectionSnapshot.docs.length);
          collectionSnapshot.forEach((doc) => posterIds.add(doc.id));
        } catch (err) {
          console.warn(`Collection query failed for ${searchTerm}:`, err.message);
        }
      }

      // Search by collection document IDs
      const collectionsRef = collection(firestore, "collections");
      for (const searchTerm of searchTerms) {
        const normalizedCollectionId = searchTerm.toLowerCase().replace(/\s+/g, "-");
        try {
          const collectionsQuery = query(
            collectionsRef,
            where("__name__", ">=", normalizedCollectionId),
            where("__name__", "<=", normalizedCollectionId + "\uf8ff")
          );
          const collectionsSnapshot = await getDocs(collectionsQuery);
          console.log(`Collections ID query results for ${searchTerm}:`, collectionsSnapshot.docs.length);
          collectionsSnapshot.forEach((doc) => {
            const collectionData = doc.data();
            const posterIdsArray = collectionData.posterIds || [];
            posterIdsArray.forEach((id) => {
              if (id && typeof id === "string") {
                posterIds.add(id);
              }
            });
          });
        } catch (err) {
          console.warn(`Collections ID query failed for ${searchTerm}:`, err.message);
        }
      }

      console.log("Total unique poster IDs:", posterIds.size);
      if (posterIds.size === 0) {
        console.warn("No poster IDs found from any query.");
      }

      const searchResults = [];
      for (const posterId of posterIds) {
        try {
          const posterRef = doc(firestore, "posters", posterId);
          const docSnap = await getDoc(posterRef);
          if (docSnap.exists()) {
            const posterData = docSnap.data();
            if (posterData.approved !== "approved" || !posterData.isActive) {
              continue;
            }
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
              console.warn(`Error fetching seller name for poster ${posterId}:`, err.message);
            }

            const cheapestSize = posterData.sizes.reduce((best, size) => {
              const final = size.finalPrice ?? size.price ?? Infinity;
              return final < (best.finalPrice ?? Infinity) ? size : best;
            }, {});

            const cheapestPrice = cheapestSize.finalPrice ?? cheapestSize.price ?? 0;
            const originalPrice = cheapestSize.price ?? 0;
            const discount = cheapestSize.discount ?? posterData.discount ?? 0;


            searchResults.push({
              ...poster,
              sellerName,
              cheapestPrice,
              originalPrice,
              discount
            });

            console.log(`Poster ${posterId} included:`, {
              approved: posterData.approved,
              isActive: posterData.isActive,
              sizes: posterData.sizes,
            });
          }
        } catch (err) {
          console.warn(`Error processing poster ${posterId}:`, err.message);
        }
      }

      console.log("Final search results:", searchResults.length);
      updateSearchState({ results: searchResults, imagesLoading: true });
    } catch (err) {
      console.error("Search failed:", err);
      updateSearchState({
        error: `Failed to fetch search results: ${err.message}`,
        imagesLoading: false,
      });
    } finally {
      updateSearchState({ loading: false });
    }
  };

  useEffect(() => {
    if (imagesLoading && results.length > 0) {
      const timer = setTimeout(() => {
        updateSearchState({ imagesLoading: false });
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [imagesLoading, results, updateSearchState]);

  const handleViewPoster = (posterId) => {
    navigate(`/poster/${posterId}`);
  };

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
    <div className="container py-4" style={{ minHeight: "calc(100svh - 65px)" }}>
      <h2>Search Posters</h2>
      <form onSubmit={handleSearch} className="mb-4">
        <div className="input-group mb-3">
          <input
            type="text"
            className="form-control"
            placeholder="Search posters by title, tags, style, or collection (e.g., k-pop, Minimalist)..."
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
              <Link to={`/poster/${poster.id}`} className="text-decoration-none text-dark">
                <div className="card h-100 shadow-sm">
                  <img
                    src={poster.imageUrl}
                    className="card-img-top"
                    alt={poster.title}
                    style={{ height: "300px", objectFit: "cover" }}
                  />
                  <div className="card-body d-flex flex-column">
                    <h6
                      className="card-title text-truncate mb-1"
                      style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}
                      title={poster.title}
                    >
                      {poster.title}
                    </h6>
                    <p className="card-text text-muted mb-2">By {poster.sellerName}</p>
                    {poster.discount > 0 && poster.originalPrice > poster.cheapestPrice ? (
                      <div className="d-flex align-items-center">
                        <span className="text-danger fw-semibold me-2">
                          ↓ {poster.discount}% OFF
                        </span>
                        <h6 className="text-muted text-decoration-line-through mb-0 me-2">
                          ₹{poster.originalPrice.toLocaleString('en-IN')}
                        </h6>
                        <h6 className="text-success fw-semibold mb-0">
                          ₹{poster.cheapestPrice.toLocaleString('en-IN')}
                        </h6>
                      </div>
                    ) : (
                      <h6 className="text-muted fw-semibold mb-0">
                        ₹{poster.cheapestPrice.toLocaleString('en-IN')}
                      </h6>
                    )}
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}