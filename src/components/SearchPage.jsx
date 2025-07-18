import React, { useEffect, useState } from "react";
import { collection, query, where, getDocs, getDoc, doc } from "firebase/firestore";
import { useFirebase } from "../context/FirebaseContext";
import { Link, useLocation } from "react-router-dom";
import { BsSearch } from "react-icons/bs";
import { useSearch } from "../context/SearchContext";

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
  const { searchState, updateSearchState } = useSearch();
  const [localState, setLocalState] = useState({ ...staticState });
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  const ITEMS_PER_PAGE = 12;

  // Sync staticState and localState with searchState when it changes
  useEffect(() => {
    const isResetState =
      searchState.queryString === "" &&
      searchState.results.length === 0 &&
      !searchState.hasSearched &&
      searchState.page === 0;

    if (isResetState && (
      localState.queryString !== "" ||
      localState.results.length !== 0 ||
      localState.hasSearched ||
      localState.page !== 0
    )) {
      resetStaticState();
      setLocalState({ ...staticState });
    } else if (
      localState.queryString !== searchState.queryString ||
      localState.results !== searchState.results ||
      localState.loading !== searchState.loading ||
      localState.error !== searchState.error ||
      localState.hasSearched !== searchState.hasSearched ||
      localState.allPosterIds !== searchState.allPosterIds ||
      localState.page !== searchState.page ||
      localState.hasMore !== searchState.hasMore ||
      localState.totalResults !== searchState.totalResults
    ) {
      updateStaticState({
        queryString: searchState.queryString,
        results: searchState.results,
        loading: searchState.loading,
        error: searchState.error,
        hasSearched: searchState.hasSearched,
        allPosterIds: searchState.allPosterIds,
        page: searchState.page,
        hasMore: searchState.hasMore,
        totalResults: searchState.totalResults,
        scrollPosition: staticState.scrollPosition,
      });
      setLocalState({ ...staticState });
    }
  }, [
    searchState.queryString,
    searchState.results,
    searchState.loading,
    searchState.error,
    searchState.hasSearched,
    searchState.allPosterIds,
    searchState.page,
    searchState.hasMore,
    searchState.totalResults,
  ]);

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
      updateSearchState({
        error: "Firestore is not available.",
        loading: false,
        hasSearched: false,
        results: [],
        totalResults: 0,
        allPosterIds: [],
        page: 0,
        hasMore: false,
      });
      updateStaticState({ ...searchState });
      setLocalState({ ...staticState });
      return;
    }

    if (!searchState.queryString.trim()) {
      updateSearchState({
        error: "Please enter a search term.",
        results: [],
        loading: false,
        hasSearched: false,
        totalResults: 0,
        allPosterIds: [],
        page: 0,
        hasMore: false,
      });
      updateStaticState({ ...searchState });
      setLocalState({ ...staticState });
      return;
    }

    updateSearchState({
      hasSearched: true,
      loading: !isLoadMore,
      error: "",
      results: isLoadMore ? searchState.results : [],
    });
    updateStaticState({ ...searchState });
    setLocalState({ ...staticState });
    setIsFetchingMore(isLoadMore);

    try {
      const searchKey = normalizeSearchTerm(searchState.queryString);
      let uniquePosterIds = [];
      let posterIdsToFetch = [];

      if (!isLoadMore) {
        uniquePosterIds = await fetchPosterIds(searchKey);
        updateSearchState({
          page: 0,
          allPosterIds: uniquePosterIds,
          totalResults: uniquePosterIds.length,
          hasMore: uniquePosterIds.length > ITEMS_PER_PAGE,
        });
        updateStaticState({ ...searchState });
        setLocalState({ ...staticState });

        if (uniquePosterIds.length === 0) {
          updateSearchState({ results: [], loading: false, hasMore: false });
          updateStaticState({ ...searchState });
          setLocalState({ ...staticState });
          return;
        }

        posterIdsToFetch = uniquePosterIds.slice(0, ITEMS_PER_PAGE);
      } else {
        const startIndex = searchState.page * ITEMS_PER_PAGE;
        posterIdsToFetch = searchState.allPosterIds.slice(startIndex, startIndex + ITEMS_PER_PAGE);
        if (posterIdsToFetch.length === 0) {
          updateSearchState({ hasMore: false });
          updateStaticState({ ...searchState });
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

      const newResults = isLoadMore ? [...searchState.results, ...searchResults] : searchResults;
      const newPage = isLoadMore ? searchState.page + 1 : 1;
      const hasMore = searchState.allPosterIds.length > newPage * ITEMS_PER_PAGE;

      updateSearchState({
        results: newResults,
        loading: false,
        page: newPage,
        hasMore,
      });
      updateStaticState({ ...searchState });
      setLocalState({ ...staticState });
    } catch (err) {
      console.error("Error fetching search results:", err);
      updateSearchState({
        error: `Failed to fetch search results: ${err.message}`,
        loading: false,
        results: isLoadMore ? searchState.results : [],
        hasMore: false,
      });
      updateStaticState({ ...searchState });
      setLocalState({ ...staticState });
    } finally {
      setIsFetchingMore(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    updateSearchState({ queryString: searchState.queryString.trim(), hasSearched: true });
    await fetchPosters(false);
    window.scrollTo({ top: 0 });
  };

  const handleLoadMore = () => {
    if (!isFetchingMore && searchState.hasMore && searchState.hasSearched) {
      fetchPosters(true);
    }
  };

  useEffect(() => {
    if (location.pathname !== "/search") return;

    if (searchState.hasSearched && searchState.queryString) {
      if (searchState.results.length > 0) {
        // Delay scroll until DOM has rendered
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            window.scrollTo({
              top: staticState.scrollPosition,
              behavior: "instant", // prevent animation
            });
          });
        });
      } else if (searchState.allPosterIds.length > 0) {
        fetchPosters(false);
      }
    }
  }, [
    location.pathname,
    searchState.hasSearched,
    searchState.queryString,
    searchState.results.length,
    searchState.allPosterIds.length,
  ]);
  
  useEffect(() => {
    const handleScroll = () => {
      updateStaticState({ scrollPosition: window.scrollY });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="container py-4" style={{ minHeight: "calc(100svh - 65px)" }}>
      <h2 className="mb-4">Search Posters</h2>
      <form onSubmit={handleSearch} className="mb-4">
        <div className="input-group mb-3">
          <input
            type="text"
            className="form-control"
            placeholder="Search here"
            value={searchState.queryString}
            onChange={(e) => {
              updateSearchState({ queryString: e.target.value });
              if (!e.target.value.trim()) {
                updateSearchState({
                  hasSearched: false,
                  results: [],
                  allPosterIds: [],
                  page: 0,
                  hasMore: true,
                  totalResults: 0,
                });
              }
            }}
            aria-label="Search posters"
          />
          <button
            type="submit"
            className="btn btn-primary"
            disabled={searchState.loading || isFetchingMore}
          >
            {(searchState.loading || isFetchingMore) ? (
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
        {searchState.error && <div className="alert alert-danger">{searchState.error}</div>}
        {searchState.hasSearched && !searchState.loading && (
          <p className="text-muted mb-3">
            {searchState.totalResults} {searchState.totalResults === 1 ? "result" : "results"} found
          </p>
        )}
      </form>
      {(searchState.loading && !isFetchingMore) ? (
        <div className="text-muted">Searching...</div>
      ) : (
        <div className="row">
          {searchState.results.map((poster) => (
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
      {searchState.hasSearched && searchState.hasMore && !isFetchingMore && !searchState.loading && (
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