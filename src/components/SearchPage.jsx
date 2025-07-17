import React, { useState } from "react";
import { useFirebase } from "../context/FirebaseContext";
import { collection, query, where, getDocs, getDoc, doc } from "firebase/firestore";
import { Link } from "react-router-dom";
import { useSearch } from "../context/SearchContext";
import { BsSearch } from 'react-icons/bs';

export default function SearchPage() {
  const { firestore } = useFirebase();
  const { searchState, updateSearchState } = useSearch();
  const {
    queryString,
    results,
    loading,
    error,
    hasSearched,
    hasMore,
    allPosterIds,
    page,
    totalResults,
  } = searchState;
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
        return Array.from(posterIds);
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
    if (!queryString.trim()) {
      updateSearchState({ error: "Please enter a search term.", results: [], loading: false });
      updateSearchState({
        hasSearched: false,
        totalResults: 0,
        allPosterIds: [],
        page: 0,
        hasMore: true,
      });
      return;
    }

    updateSearchState({ hasSearched: true });
    updateSearchState({
      loading: !isLoadMore,
      error: "",
      results: isLoadMore ? results : []
    });
    setIsFetchingMore(isLoadMore);

    try {
      const searchKey = normalizeSearchTerm(queryString);
      let uniquePosterIds = [];
      let posterIdsToFetch = [];

      if (!isLoadMore) {
        const posterIds = await fetchPosterIds(searchKey);
        uniquePosterIds = posterIds;
        const hasMorePages = uniquePosterIds.length > ITEMS_PER_PAGE;

        updateSearchState({
          page: 0,
          allPosterIds: uniquePosterIds,
          totalResults: uniquePosterIds.length,
          hasMore: hasMorePages,
        });

        if (uniquePosterIds.length === 0) {
          updateSearchState({ results: [], loading: false });
          return;
        }

        posterIdsToFetch = uniquePosterIds.slice(0, ITEMS_PER_PAGE);
      } else {
        const startIndex = page * ITEMS_PER_PAGE;
        posterIdsToFetch = allPosterIds.slice(startIndex, startIndex + ITEMS_PER_PAGE);
        if (posterIdsToFetch.length === 0) {
          updateSearchState({ hasMore: false });
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
              discount
            });
          }
        } catch (err) {
          // Handle or log error if needed
        }
      }

      updateSearchState({
        results: isLoadMore ? [...results, ...searchResults] : searchResults,
        loading: false,
      });

      const totalPosters = isLoadMore ? allPosterIds.length : uniquePosterIds.length;
      const nextPage = isLoadMore ? page + 1 : 1;
      updateSearchState({
        page: nextPage,
        hasMore: totalPosters > nextPage * ITEMS_PER_PAGE,
      });

    } catch (err) {
      updateSearchState({
        error: `Failed to fetch search results: ${err.message}`,
        loading: false,
        results: isLoadMore ? results : [],
        hasMore: false,
      });
    } finally {
      setIsFetchingMore(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    window.scrollTo({ top: 0 });

    updateSearchState({
      queryString: queryString.trim(),
      results: [],
      error: "",
      loading: false,
      allPosterIds: [],
      page: 0,
      hasMore: true,
      hasSearched: false,
      totalResults: 0,
    });

    setTimeout(() => {
      fetchPosters(false);
    }, 0);
  };

  const handleLoadMore = () => {
    if (!isFetchingMore && hasMore && hasSearched) {
      fetchPosters(true);
    }
  };

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
                updateSearchState({
                  hasSearched: false,
                  results: [],
                  allPosterIds: [],
                  page: 0,
                  hasMore: true,
                  totalResults: 0,
                });
                setIsFetchingMore(false);
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
      {hasSearched && hasMore && !isFetchingMore && !loading && (
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