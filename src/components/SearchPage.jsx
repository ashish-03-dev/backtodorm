import React, { useState, useEffect } from "react";
import { useFirebase } from "../context/FirebaseContext";
import { collection, query, where, getDocs, getDoc, doc } from "firebase/firestore";
import { Link, useNavigate } from "react-router-dom";
import { useSearch } from "../context/SearchContext";
import { BsSearch } from 'react-icons/bs';

export default function SearchPage() {
  const { firestore } = useFirebase();
  const navigate = useNavigate();
  const { searchState, updateSearchState } = useSearch();
  const { queryString, results, loading, error } = searchState;
  const [hasSearched, setHasSearched] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [totalResults, setTotalResults] = useState(0);
  const [page, setPage] = useState(0);
  const [allPosterIds, setAllPosterIds] = useState([]);

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

    // Fetch posters by keywords
    try {
      const postersRef = collection(firestore, "posters");
      const keywordQuery = query(
        postersRef,
        where("keywords", "array-contains", searchKey),
        where("approved", "==", "approved"),
        where("isActive", "==", true)
      );
      const keywordSnapshot = await getDocs(keywordQuery);
      keywordSnapshot.forEach((doc) => posterIds.add(doc.id));
    } catch (err) {
      // Handle error silently or log only critical errors if needed
    }

    // Fetch posterIds from collections
    try {
      const collectionDocSnap = await getDoc(doc(firestore, "collections", searchKey));
      if (collectionDocSnap.exists()) {
        const collectionData = collectionDocSnap.data();
        const posterIdsArray = collectionData.posterIds || [];
        posterIdsArray.forEach((id) => typeof id === "string" && posterIds.add(id));
      }
    } catch (err) {
      // Handle error silently or log only critical errors if needed
    }

    return Array.from(posterIds);
  };

  const fetchPosters = async (isLoadMore = false) => {
    if (!queryString.trim()) {
      updateSearchState({ error: "Please enter a search term.", results: [], loading: false });
      setHasSearched(false);
      setTotalResults(0);
      setAllPosterIds([]);
      setPage(0);
      setHasMore(true);
      return;
    }

    setHasSearched(true);
    updateSearchState({
      loading: !isLoadMore,
      error: "",
      results: isLoadMore ? results : []
    });
    setIsFetchingMore(isLoadMore);

    try {
      const searchKey = normalizeSearchTerm(queryString);
      let uniquePosterIds = [];

      // Fetch all poster IDs on initial search
      let posterIdsToFetch = [];
      if (!isLoadMore) {
        const posterIds = await fetchPosterIds(searchKey);
        uniquePosterIds = posterIds;
        const hasMorePages = uniquePosterIds.length > ITEMS_PER_PAGE;

        setAllPosterIds(uniquePosterIds);
        setTotalResults(uniquePosterIds.length);
        setPage(0);
        setHasMore(hasMorePages);

        if (uniquePosterIds.length === 0) {
          updateSearchState({ results: [], loading: false });
          return;
        }

        posterIdsToFetch = uniquePosterIds.slice(0, ITEMS_PER_PAGE);
      } else {
        const startIndex = page * ITEMS_PER_PAGE;
        posterIdsToFetch = allPosterIds.slice(startIndex, startIndex + ITEMS_PER_PAGE);
        if (posterIdsToFetch.length === 0) {
          setHasMore(false);
          updateSearchState({ results, loading: false });
          return;
        }
      }

      // Fetch poster data for the current page
      const searchResults = [];
      for (const posterId of posterIdsToFetch) {
        try {
          const posterRef = doc(firestore, "posters", posterId);
          const docSnap = await getDoc(posterRef);
          if (docSnap.exists()) {
            const posterData = docSnap.data();
            if (!posterData.isActive) {
              continue;
            }
            if (!Array.isArray(posterData.sizes) || posterData.sizes.length === 0) {
              continue;
            }

            const poster = { id: docSnap.id, ...posterData };

            const cheapestSize = posterData.sizes.reduce((best, size) => {
              const final = size.finalPrice ?? size.price ?? Infinity;
              return final < (best.finalPrice ?? Infinity) ? size : best;
            }, {});

            const cheapestPrice = cheapestSize.finalPrice ?? cheapestSize.price ?? 0;
            const originalPrice = cheapestSize.price ?? 0;
            const discount = cheapestSize.discount ?? posterData.discount ?? 0;

            searchResults.push({
              ...poster,
              cheapestPrice,
              originalPrice,
              discount,
            });
          }
        } catch (err) {
          // Handle error silently or log only critical errors if needed
        }
      }

      updateSearchState({
        results: isLoadMore ? [...results, ...searchResults] : searchResults,
        loading: false,
      });
      const newPage = page + 1;
      setPage(newPage);

      // Use already-known array instead of possibly stale state
      const posterCount = isLoadMore ? allPosterIds.length : uniquePosterIds.length;
      setHasMore(posterCount > newPage * ITEMS_PER_PAGE);

    } catch (err) {
      updateSearchState({
        error: `Failed to fetch search results: ${err.message}`,
        loading: false,
        results: isLoadMore ? results : [],
      });
      setHasMore(false);
    } finally {
      setIsFetchingMore(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    // Reset all states for a fresh search
    setAllPosterIds([]);
    setPage(0);
    setHasMore(true);
    setHasSearched(false);
    setTotalResults(0);
    updateSearchState({ results: [], error: "", loading: true });
    await fetchPosters(false);
  };

  const handleViewPoster = (posterId) => {
    navigate(`/poster/${posterId}`);
  };

  useEffect(() => {
    const handleScroll = () => {
      if (isFetchingMore || !hasMore || !hasSearched) return;

      const posterItems = document.querySelectorAll(".row > div");
      const lastItem = posterItems[posterItems.length - 1];
      if (!lastItem) return;

      const rect = lastItem.getBoundingClientRect();
      const isVisible = rect.top <= window.innerHeight;

      if (isVisible) {
        fetchPosters(true);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isFetchingMore, hasMore, hasSearched, results.length]);

  return (
    <div className="container py-4" style={{ minHeight: "calc(100svh - 65px)" }}>
      <h2 className="mb-4">Search Posters</h2>
      <form onSubmit={handleSearch} className="mb-4">
        <div className="input-group mb-3">
          <input
            type="text"
            className="form-control"
            placeholder="Search here"
            value={queryString}
            onChange={(e) => {
              updateSearchState({ queryString: e.target.value });
              if (!e.target.value.trim()) {
                setHasSearched(false);
                updateSearchState({ results: [], error: "", loading: false });
                setAllPosterIds([]);
                setPage(0);
                setHasMore(true);
                setTotalResults(0);
              }
            }}
            aria-label="Search posters"
          />
          <button type="submit" className="btn btn-primary" disabled={loading || isFetchingMore}>
            {(loading || isFetchingMore) ? (
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
        {error && <div className="alert alert-danger">{error}</div>}
        {hasSearched && !loading && (
          <p className="text-muted mb-3">
            {totalResults} {totalResults === 1 ? "result" : "results"} found
          </p>
        )}
      </form>
      {(loading && !isFetchingMore) ? (
        <div className="text-muted ">Searching...</div>
      ) : (
        <div className="row">
          {results.map((poster) => (
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