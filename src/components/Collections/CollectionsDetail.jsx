import React, { useEffect, useState, useCallback } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { useFirebase } from '../../context/FirebaseContext'; // Adjust path as needed

// In-memory cache to store fetched collections
const cache = new Map();

// Module-level state to persist across navigation
const staticState = {
  posters: [],
  filteredPosters: [], 
  displayedPosters: [],
  collectionName: '',
  isLoading: true,
  error: null,
  sizeFilter: 'all',
  sortOrder: 'asc',
  hasMore: true,
  scrollPosition: 0,
  currentCollectionId: null, // Track current collectionId
};

// Helper to update and retrieve static state
const updateStaticState = (newState) => {
  Object.assign(staticState, newState);
};

// Reset state function
const resetStaticState = () => {
  updateStaticState({
    posters: [],
    filteredPosters: [],
    displayedPosters: [],
    collectionName: '',
    isLoading: true,
    error: null,
    sizeFilter: 'all',
    sortOrder: 'asc',
    hasMore: true,
    scrollPosition: 0,
    currentCollectionId: null,
  });
};

export default function CollectionDetail() {
  const { firestore } = useFirebase();
  const { collectionId } = useParams(); // Get collectionId from URL
  const location = useLocation(); // To detect navigation changes
  const [localState, setLocalState] = useState({ ...staticState });

  const PAGE_SIZE = 8;

  const fetchData = useCallback(async () => {
    if (!firestore || !collectionId) {
      updateStaticState({ error: 'Database or collection ID not available.', isLoading: false });
      setLocalState({ ...staticState });
      return;
    }

    // Check cache for the current collectionId
    if (cache.has(collectionId)) {
      const cachedData = cache.get(collectionId);
      updateStaticState({
        collectionName: cachedData.collectionName,
        posters: cachedData.posters,
        filteredPosters: cachedData.posters,
        displayedPosters: cachedData.displayedPosters || cachedData.posters.slice(0, PAGE_SIZE),
        hasMore: cachedData.posters.length > (cachedData.displayedPosters?.length || PAGE_SIZE),
        isLoading: false,
        currentCollectionId: collectionId,
      });
      setLocalState({ ...staticState });
      return;
    }

    updateStaticState({ isLoading: true });
    setLocalState({ ...staticState });

    try {
      const colRef = doc(firestore, 'collections', collectionId);
      const colSnap = await getDoc(colRef);

      let posterIds = [];
      let label = collectionId.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

      if (colSnap.exists()) {
        const data = colSnap.data();
        posterIds = data.posterIds || [];
        label = data.name || label;
      } else {
        throw new Error('Collection not found');
      }

      const fetched = [];
      for (const posterId of posterIds) {
        const snap = await getDoc(doc(firestore, 'posters', posterId));
        if (snap.exists()) {
          const data = snap.data();
          const sizes = data.sizes || [];
          const base = sizes[0] || {};
          fetched.push({
            id: snap.id,
            title: data.title || 'Untitled Poster',
            img: data.imageUrl || 'https://via.placeholder.com/400x500',
            sizes,
            price: base.price || 0,
            discount: data.discount || 0,
            finalPrice: base.finalPrice ?? base.price ?? 0,
          });
        }
      }

      // Store in cache
      cache.set(collectionId, {
        collectionName: label,
        posters: fetched,
        displayedPosters: fetched.slice(0, PAGE_SIZE),
      });

      updateStaticState({
        collectionName: label,
        posters: fetched,
        filteredPosters: fetched,
        displayedPosters: fetched.slice(0, PAGE_SIZE),
        hasMore: fetched.length > PAGE_SIZE,
        isLoading: false,
        currentCollectionId: collectionId,
      });
      setLocalState({ ...staticState });
    } catch (err) {
      console.error('Error fetching posters:', err);
      updateStaticState({ error: `Failed to load posters: ${err.message}`, isLoading: false });
      setLocalState({ ...staticState });
    }
  }, [firestore, collectionId]);

  const applyFilters = useCallback(() => {
    let updated = [...staticState.posters];

    if (staticState.sizeFilter !== 'all') {
      updated = updated.filter((p) => p.sizes.some((size) => size.size === staticState.sizeFilter));
    }

    updated.sort((a, b) => {
      const aP = a.finalPrice || a.price;
      const bP = b.finalPrice || b.price;
      return staticState.sortOrder === 'asc' ? aP - bP : bP - aP;
    });

    const prevDisplayedCount = cache.get(collectionId)?.displayedPosters?.length || PAGE_SIZE;
    updateStaticState({
      filteredPosters: updated,
      displayedPosters: updated.slice(0, prevDisplayedCount),
      hasMore: updated.length > prevDisplayedCount,
    });
    setLocalState({ ...staticState });
  }, [collectionId]);

  const setSizeFilter = (value) => {
    updateStaticState({ sizeFilter: value });
    setLocalState({ ...staticState });
    applyFilters();
  };

  const setSortOrder = (value) => {
    updateStaticState({ sortOrder: value });
    setLocalState({ ...staticState });
    applyFilters();
  };

  const handleLoadMore = useCallback(() => {
    const next = staticState.filteredPosters.slice(0, staticState.displayedPosters.length + PAGE_SIZE);
    updateStaticState({
      displayedPosters: next,
      hasMore: staticState.filteredPosters.length > next.length,
    });
    setLocalState({ ...staticState });
    // Update cache with new displayedPosters
    cache.set(collectionId, {
      ...cache.get(collectionId),
      displayedPosters: next,
    });
  }, [collectionId]);

  useEffect(() => {
    // Reset state if collectionId changes
    if (staticState.currentCollectionId !== collectionId) {
      resetStaticState();
      updateStaticState({ currentCollectionId: collectionId });
      setLocalState({ ...staticState });
      fetchData();
    } else if (staticState.posters.length > 0) {
      // Restore state and scroll position for same collectionId
      setLocalState({ ...staticState });
      window.scrollTo({ top: staticState.scrollPosition, behavior: 'instant' });
    } else if (!staticState.error) {
      fetchData();
    }
  }, [fetchData, location, collectionId]);

  useEffect(() => {
    const handleScroll = () => {
      updateStaticState({ scrollPosition: window.scrollY });
      setLocalState(prev => ({ ...prev, scrollPosition: window.scrollY }));
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (localState.isLoading && localState.posters.length === 0) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (localState.error) {
    return (
      <div className="container py-5">
        <h2 className="mb-4 text-capitalize">{localState.collectionName}</h2>
        <div className="alert alert-danger">{localState.error}</div>
      </div>
    );
  }

  return (
    <div className="container py-5">
      <h2 className="mb-4 text-capitalize">{localState.collectionName}</h2>

      {/* Filters */}
      <div className="mb-4 d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
        <div className="d-flex gap-2">
          <select
            className="form-select"
            value={localState.sizeFilter}
            onChange={(e) => setSizeFilter(e.target.value)}
          >
            <option value="all">All Sizes</option>
            <option value="A4">A4</option>
            <option value="A3">A3</option>
            <option value="A3x3">A3 x 3</option>
            <option value="A4x5">A4 x 5</option>
          </select>
          <select
            className="form-select"
            value={localState.sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
          >
            <option value="asc">Price: Low to High</option>
            <option value="desc">Price: High to Low</option>
          </select>
        </div>
        <p className="text-muted mb-0">{localState.filteredPosters.length} posters found</p>
      </div>

      {/* Posters */}
      <div className="row row-cols-2 row-cols-sm-3 row-cols-lg-4 g-4">
        {localState.displayedPosters.length === 0 ? (
          <p className="col-12">No posters found for selected filters.</p>
        ) : (
          localState.displayedPosters.map((poster) => (
            <div key={poster.id} className="col">
              <Link to={`/poster/${poster.id}`} className="text-decoration-none text-dark">
                <div className="card h-100 shadow-sm border-0">
                  <img
                    src={poster.img}
                    alt={poster.title}
                    className="card-img-top"
                    style={{ aspectRatio: '20/23', objectFit: 'cover' }}
                  />
                  <div className="card-body text-center">
                    <h6 className="card-title fw-semibold text-truncate mb-2">{poster.title}</h6>
                    <p className="card-text fw-semibold mb-0" style={{ fontSize: '16px' }}>
                      {poster.discount > 0 ? (
                        <>
                          <span className="text-danger me-2">({poster.discount}% off)</span>
                          <span className="text-decoration-line-through text-muted me-1">
                            ₹{poster.price.toLocaleString('en-IN')}
                          </span>
                          <span className="text-success fw-semibold">
                            ₹{poster.finalPrice.toLocaleString('en-IN')}
                          </span>
                        </>
                      ) : (
                        <>From ₹{poster.finalPrice.toLocaleString('en-IN')}</>
                      )}
                    </p>
                  </div>
                </div>
              </Link>
            </div>
          ))
        )}
      </div>

      {/* Load More */}
      {localState.hasMore && (
        <div className="text-center mt-4">
          <button
            className="btn btn-primary"
            onClick={handleLoadMore}
            disabled={localState.isLoading}
          >
            {localState.isLoading ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}
    </div>
  );
}