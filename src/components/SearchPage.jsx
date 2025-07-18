import React, { useEffect, useState } from "react";
import { collection, query, where, getDocs, getDoc, doc } from "firebase/firestore";
import { useFirebase } from "../context/FirebaseContext";
import { Link, useLocation } from "react-router-dom";
import { BsSearch } from 'react-icons/bs';

// Module-level state to persist across navigation
const staticState = {
  queryString: "",
  results: [],
  loading: false,
  error: "",
  hasSearched: false,
  hasMore: true,
  allPosterIds: [],
  page: 0,
  totalResults: 0,
  scrollPosition: 0,
};

// Helper to update and retrieve static state
const updateStaticState = (newState) => {
  Object.assign(staticState, newState);
};

// Reset state function
const resetStaticState = () => {
  updateStaticState({
    queryString: "",
    results: [],
    loading: false,
    error: "",
    hasSearched: false,
    hasMore: true,
    allPosterIds: [],
    page: 0,
    totalResults: 0,
    scrollPosition: 0,
  });
};

export default function SearchPage() {
  const { firestore } = useFirebase();
  const location = useLocation();
  const [localState, setLocalState] = useState({ ...staticState });
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  const ITEMS_PER_PAGE = 12;

  const normalizeSearchTerm = (term) => {
    if (!term || typeof term !== "string") return "";
    return term
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/^-+|-+$/g, "");
  };

  const fetchPosterIds = async (searchKey) => {
    const posterIds = new Set();

    try {
      const collectionDocSnap = await getDoc(doc(firestore, "collections", searchKey));
      if (collectionDocSnap.exists()) {
        const collectionData = collectionDocSnap.data();
        const posterIdsArray = collectionData.posterIds || [];
        posterIdsArray.forEach((id) => typeof id === "string" && posterIds.add(id));
      }
    } catch (err) {
      console.error("Error fetching from collections:", err);
    }

    try {
      const postersRef = collection(firestore, "posters");
      const keywordQuery = query(
        postersRef,
        where("keywords", "array-contains", searchKey),
        where("isActive", "==", true)
      );
      const keywordSnapshot = await getDocs(keywordQuery);
      keywordSnapshot.forEach((doc) => posterIds.add(doc.id));
    } catch (err) {
      console.error("Error fetching from posters by keywords:", err);
    }
    return Array.from(posterIds);
  };

  const fetchPosters = async (isLoadMore = false) => {
    if (!firestore) {
      updateStaticState({
        error: "Firestore is not available.",
        loading: false,
        hasSearched: false,
        results: [],
        totalResults: 0,
        allPosterIds: [],
        page: 0,
        hasMore: false,
      });
      setLocalState({ ...staticState });
      return;
    }

    if (!localState.queryString.trim()) {
      updateStaticState({
        error: "Please enter a search term.",
        results: [],
        loading: false,
        hasSearched: false,
        totalResults: 0,
        allPosterIds: [],
        page: 0,
        hasMore: false,
      });
      setLocalState({ ...staticState });
      return;
    }

    updateStaticState({
      hasSearched: true,
      loading: !isLoadMore,
      error: "",
      results: isLoadMore ? localState.results : [],
    });
    setLocalState({ ...staticState });
    setIsFetchingMore(isLoadMore);

    try {
      const searchKey = normalizeSearchTerm(localState.queryString);
      let uniquePosterIds = [];
      let posterIdsToFetch = [];

      if (!isLoadMore) {
        uniquePosterIds = await fetchPosterIds(searchKey);
        updateStaticState({
          page: 0,
          allPosterIds: uniquePosterIds,
          totalResults: uniquePosterIds.length,
          hasMore: uniquePosterIds.length > ITEMS_PER_PAGE,
        });
        setLocalState({ ...staticState });

        if (uniquePosterIds.length === 0) {
          updateStaticState({ results: [], loading: false, hasMore: false });
          setLocalState({ ...staticState });
          return;
        }

        posterIdsToFetch = uniquePosterIds.slice(0, ITEMS_PER_PAGE);
      } else {
        const startIndex = staticState.page * ITEMS_PER_PAGE;
        posterIdsToFetch = staticState.allPosterIds.slice(startIndex, startIndex + ITEMS_PER_PAGE);
        if (posterIdsToFetch.length === 0) {
          updateStaticState({ hasMore: false });
          setLocalState({ ...staticState });
          return;
        }
      }

      const searchResults = [];
      for (const posterId of posterIdsToFetch) {
        try {
          const posterRef = doc(firestore, "posters", posterId);
          const docSnap = await getDoc(posterRef);
          if (docSnap.exists()) {
            const posterData = docSnap.data();
            if (!posterData.isActive || !Array.isArray(posterData.sizes) || posterData.sizes.length === 0) continue;

            const cheapestSize = posterData.sizes.reduce((best, size) => {
              const final = size.finalPrice ?? size.price ?? Infinity;
              return final < (best.finalPrice ?? Infinity) ? size : best;
            }, {});
            const cheapestPrice = cheapestSize.finalPrice ?? cheapestSize.price ?? 0;
            const originalPrice = cheapestSize.price ?? 0;
            const discount = cheapestSize.discount ?? posterData.discount ?? 0;

            searchResults.push({
              id: docSnap.id,
              ...posterData,
              cheapestPrice,
              originalPrice,
              discount,
            });
          }
        } catch (err) {
          console.warn(`Error fetching poster ${posterId}:`, err);
        }
      }

      const newResults = isLoadMore ? [...localState.results, ...searchResults] : searchResults;
      const newPage = isLoadMore ? localState.page + 1 : 1;
      const hasMore = staticState.allPosterIds.length > newPage * ITEMS_PER_PAGE;

      updateStaticState({
        results: newResults,
        loading: false,
        page: newPage,
        hasMore,
      });
      setLocalState({ ...staticState });

      // Debug log to verify state
      console.log("fetchPosters state:", {
        isLoadMore,
        allPosterIdsLength: localState.allPosterIds.length,
        page: newPage,
        hasMore,
        resultsLength: newResults.length,
      });
    } catch (err) {
      console.error("Error fetching search results:", err);
      updateStaticState({
        error: `Failed to fetch search results: ${err.message}`,
        loading: false,
        results: isLoadMore ? localState.results : [],
        hasMore: false,
      });
      setLocalState({ ...staticState });
    } finally {
      setIsFetchingMore(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    window.scrollTo({ top: 0 });

    resetStaticState();
    updateStaticState({ queryString: localState.queryString.trim(), hasSearched: true });
    setLocalState({ ...staticState });

    await fetchPosters(false);
  };

  const handleLoadMore = () => {
    if (!isFetchingMore && localState.hasMore && localState.hasSearched) {
      fetchPosters(true);
    }
  };

  useEffect(() => {
    if (staticState.hasSearched && staticState.queryString) {
      setLocalState({ ...staticState });

      // Only fetch if data was cleared
      if (
        staticState.results.length === 0 &&
        staticState.allPosterIds.length > 0
      ) {
        fetchPosters(false);
      }
    } else {
      resetStaticState();
      setLocalState({ ...staticState });
    }
  }, [location]);


  useEffect(() => {
    const handleScroll = () => {
      updateStaticState({ scrollPosition: window.scrollY });
      setLocalState((prev) => ({ ...prev, scrollPosition: window.scrollY }));
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!localState.loading && localState.results.length > 0) {
      setTimeout(() => {
        window.scrollTo({
          top: staticState.scrollPosition,
          behavior: "instant", // optional: you can also use "auto"
        });
      }, 0);
    }
  }, [localState.loading, localState.results.length]);


  return (
    <div className="container py-4" style={{ minHeight: "calc(100svh - 65px)" }}>
      <h2 className="mb-4">Search Posters</h2>
      <form onSubmit={handleSearch} className="mb-4">
        <div className="input-group mb-3">
          <input
            type="text"
            className="form-control"
            placeholder="Search here"
            value={localState.queryString}
            onChange={(e) => {
              updateStaticState({ queryString: e.target.value });
              setLocalState({ ...staticState });
              if (!e.target.value.trim()) {
                updateStaticState({
                  hasSearched: false,
                  results: [],
                  allPosterIds: [],
                  page: 0,
                  hasMore: true,
                  totalResults: 0,
                });
                setLocalState({ ...staticState });
                setIsFetchingMore(false);
              }
            }}
            aria-label="Search posters"
          />
          <button
            type="submit"
            className="btn btn-primary"
            disabled={localState.loading || isFetchingMore}
          >
            {(localState.loading || isFetchingMore) ? (
              <>
                <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                {isFetchingMore ? "Loading more..." : "Searching..."}
              </>
            ) : (
              <>
                <BsSearch className="me-1" /> Search
              </>
            )}
          </button>
        </div>
        {localState.error && <div className="alert alert-danger">{localState.error}</div>}
        {localState.hasSearched && !localState.loading && (
          <p className="text-muted mb-3">
            {localState.totalResults} {localState.totalResults === 1 ? "result" : "results"} found
          </p>
        )}
      </form>
      {(localState.loading && !isFetchingMore) ? (
        <div className="text-muted">Searching...</div>
      ) : (
        <div className="row">
          {localState.results.map((poster) => (
            <div key={poster.id} className="col-6 col-md-3 mb-4">
              <Link to={`/poster/${poster.id}`} className="text-decoration-none text-dark">
                <div className="h-100 shadow-sm rounded-1">
                  <img
                    src={poster.imageUrl}
                    className="card-img-top rounded-top-1"
                    alt={poster.title}
                    style={{ aspectRatio: "3/4", objectFit: "cover" }}
                  />
                  <div className="p-3 d-flex flex-column" style={{ minHeight: "0" }}>
                    <h6
                      className="text-truncate mb-2"
                      style={{ overflow: "hidden", whiteSpace: "nowrap" }}
                      title={poster.title}
                    >
                      {poster.title}
                    </h6>
                    {poster.discount > 0 && poster.originalPrice > poster.cheapestPrice ? (
                      <div className="d-flex align-items-center">
                        <span className="text-danger fw-semibold me-2">
                          ↓ {poster.discount}% OFF
                        </span>
                        <h6 className="text-muted text-decoration-line-through mb-0 me-2">
                          ₹{poster.originalPrice.toLocaleString("en-IN")}
                        </h6>
                        <h6 className="text-success fw-semibold mb-0">
                          ₹{poster.cheapestPrice.toLocaleString("en-IN")}
                        </h6>
                      </div>
                    ) : (
                      <h6 className="text-muted fw-semibold mb-0">
                        ₹{poster.cheapestPrice.toLocaleString("en-IN")}
                      </h6>
                    )}
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}
      {localState.hasSearched && localState.hasMore && !isFetchingMore && !localState.loading && (
        <div className="text-center my-4">
          <button
            className="btn btn-primary"
            onClick={handleLoadMore}
            disabled={isFetchingMore}
          >
            Load More
          </button>
        </div>
      )}
      {isFetchingMore && (
        <div className="text-center my-4">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading more...</span>
          </div>
        </div>
      )}
    </div>
  );
}