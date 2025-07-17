import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { useFirebase } from './FirebaseContext';
import { doc, getDoc } from 'firebase/firestore';

// In-memory cache to store fetched collections
const cache = new Map();

export const CollectionDetailContext = createContext();

export const useCollectionDetail = () => useContext(CollectionDetailContext);

export const CollectionDetailProvider = ({ children }) => {
  const { collectionId } = useParams();
  const { pathname } = useLocation();
  const { firestore } = useFirebase();

  const [posters, setPosters] = useState([]);
  const [filteredPosters, setFilteredPosters] = useState([]);
  const [displayedPosters, setDisplayedPosters] = useState([]);
  const [collectionName, setCollectionName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sizeFilter, setSizeFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('asc');
  const [hasMore, setHasMore] = useState(true);

  const PAGE_SIZE = 8;

  const fetchData = useCallback(async () => {
    if (!firestore || !collectionId) {
      console.warn('Missing firestore or collectionId:', { firestore, collectionId });
      setError('Database or collection ID not available.');
      setIsLoading(false);
      return;
    }

    // Check cache first
    if (cache.has(collectionId)) {
      const cachedData = cache.get(collectionId);
      setCollectionName(cachedData.collectionName);
      setPosters(cachedData.posters);
      setFilteredPosters(cachedData.posters);
      // Restore displayedPosters from cache, or default to initial PAGE_SIZE
      setDisplayedPosters(cachedData.displayedPosters || cachedData.posters.slice(0, PAGE_SIZE));
      setHasMore(cachedData.posters.length > (cachedData.displayedPosters?.length || PAGE_SIZE));
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
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
        displayedPosters: fetched.slice(0, PAGE_SIZE), // Initial cache
      });

      setCollectionName(label);
      setPosters(fetched);
      setFilteredPosters(fetched);
      setDisplayedPosters(fetched.slice(0, PAGE_SIZE));
      setHasMore(fetched.length > PAGE_SIZE);
    } catch (err) {
      setError(`Failed to load posters: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [firestore, collectionId]);

  useEffect(() => {
    fetchData();
  }, [fetchData, pathname]);

  useEffect(() => {
    let updated = [...posters];

    if (sizeFilter !== 'all') {
      updated = updated.filter((p) => p.sizes.some((size) => size.size === sizeFilter));
    }

    updated.sort((a, b) => {
      const aP = a.finalPrice || a.price;
      const bP = b.finalPrice || b.price;
      return sortOrder === 'asc' ? aP - bP : bP - aP;
    });

    setFilteredPosters(updated);
    // Restore displayedPosters based on previous length if available in cache
    const cachedData = cache.get(collectionId);
    const prevDisplayedCount = cachedData?.displayedPosters?.length || PAGE_SIZE;
    setDisplayedPosters(updated.slice(0, prevDisplayedCount));
    setHasMore(updated.length > prevDisplayedCount);
  }, [sizeFilter, sortOrder, posters, collectionId]);

  const handleLoadMore = useCallback(() => {
    const next = filteredPosters.slice(0, displayedPosters.length + PAGE_SIZE);
    setDisplayedPosters(next);
    setHasMore(filteredPosters.length > next.length);
    // Update cache with new displayedPosters
    cache.set(collectionId, {
      ...cache.get(collectionId),
      displayedPosters: next,
    });
  }, [filteredPosters, displayedPosters, collectionId]);

  const contextValue = useMemo(
    () => ({
      posters: displayedPosters,
      filteredPosters,
      collectionName,
      isLoading,
      error,
      sizeFilter,
      sortOrder,
      setSizeFilter,
      setSortOrder,
      hasMore,
      handleLoadMore,
    }),
    [
      displayedPosters,
      filteredPosters,
      collectionName,
      isLoading,
      error,
      sizeFilter,
      sortOrder,
      hasMore,
      handleLoadMore,
    ]
  );

  return (
    <CollectionDetailContext.Provider value={contextValue}>
      {children}
    </CollectionDetailContext.Provider>
  );
};