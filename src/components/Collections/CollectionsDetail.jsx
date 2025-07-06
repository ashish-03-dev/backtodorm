import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useFirebase } from '../../context/FirebaseContext';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

export default function CollectionDetail({ addToCart }) {
  const { firestore } = useFirebase();
  const { collectionId } = useParams();
  const [posters, setPosters] = useState([]);
  const [filteredPosters, setFilteredPosters] = useState([]);
  const [displayedPosters, setDisplayedPosters] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [collectionName, setCollectionName] = useState(null);
  const [sizeFilter, setSizeFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('asc');
  const [hasMore, setHasMore] = useState(true);
  const [pageSize] = useState(8);
  const observer = useRef(null);

  // Fetch collection and posters
  useEffect(() => {
    const fetchCollectionAndPosters = async () => {
      if (!firestore) {
        setError('Failed to connect to database.');
        setIsLoading(false);
        return;
      }

      try {
        // Fetch the collection document
        const collectionRef = doc(firestore, 'collections', collectionId);
        const collectionDoc = await getDoc(collectionRef);

        let collectionLabel = collectionId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        let posterIds = [];

        if (collectionDoc.exists()) {
          const data = collectionDoc.data();
          collectionLabel = data.name || collectionLabel;
          posterIds = data.posterIds || []; // Array of poster IDs
        }

        setCollectionName(collectionLabel);
        // Fetch only the posters listed in the collection
        const fetchedPosters = [];
        for (const posterId of posterIds) {
          const posterRef = doc(firestore, 'posters', posterId);
          const posterDoc = await getDoc(posterRef);
          if (posterDoc.exists()) {
            const data = posterDoc.data();
            fetchedPosters.push({
              id: posterDoc.id,
              title: data.title || 'Untitled Poster',
              img: data.imageUrl,
              sizes: data.sizes || [],
              price: data.sizes?.[0]?.price || 0,
              discount: data.discount || 0,
              finalPrice: data.sizes?.[0]?.finalPrice || data.sizes?.[0]?.price || 0,
            });
          }
        }
        setPosters(fetchedPosters);
        setFilteredPosters(fetchedPosters);
        setDisplayedPosters(fetchedPosters.slice(0, pageSize));
        setHasMore(fetchedPosters.length > pageSize);
      } catch (err) {
        console.error('Failed to fetch posters:', err);
        setError('Failed to load posters. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCollectionAndPosters();
  }, [firestore, collectionId]);

  // Handle filtering and sorting
  useEffect(() => {
    let updatedPosters = [...posters];

    // Filter by size
    if (sizeFilter !== 'all') {
      updatedPosters = updatedPosters.filter(poster =>
        poster.sizes.some(size => size.size === sizeFilter)
      );
    }

    // Sort by price
    updatedPosters.sort((a, b) => {
      const priceA = a.finalPrice || a.price;
      const priceB = b.finalPrice || b.price;
      return sortOrder === 'asc' ? priceA - priceB : priceB - priceA;
    });

    setFilteredPosters(updatedPosters);
    setDisplayedPosters(updatedPosters.slice(0, pageSize));
    setHasMore(updatedPosters.length > pageSize);
  }, [sizeFilter, sortOrder, posters, pageSize]);

  // Infinite scroll logic
  const lastPosterElementRef = useCallback(
    (node) => {
      if (isLoading) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setDisplayedPosters((prev) => {
            const newCount = prev.length + pageSize;
            return filteredPosters.slice(0, newCount);
          });
          setHasMore(filteredPosters.length > displayedPosters.length + pageSize);
        }
      });
      if (node) observer.current.observe(node);
    },
    [isLoading, hasMore, filteredPosters, pageSize, displayedPosters.length]
  );

  if (isLoading) {
    return (
      <div className="container py-5">
        <h2 className="mb-4 text-capitalize">{collectionName || collectionId?.replace('-', ' ') || 'Collection'}</h2>
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-5">
        <h2 className="mb-4 text-capitalize">{collectionName || collectionId?.replace('-', ' ') || 'Collection'}</h2>
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="container py-5">
      <h2 className="mb-4 text-capitalize">{collectionName || collectionId?.replace('-', ' ') || 'Collection'}</h2>

      {/* Filters and Sorting */}
      <div className="mb-4 d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
        <div className="d-flex gap-2">
          <select
            className="form-select"
            value={sizeFilter}
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
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
          >
            <option value="asc">Price: Low to High</option>
            <option value="desc">Price: High to Low</option>
          </select>
        </div>
        <p className="text-muted mb-0">{filteredPosters.length} posters found</p>
      </div>

      {/* Posters Grid */}
      <div className="row row-cols-2 row-cols-sm-3 row-cols-lg-4 g-4">
        {displayedPosters.length === 0 ? (
          <p className="col-12">No posters found for selected filters.</p>
        ) : (
          displayedPosters.map((poster, index) => {
            const isLastRow = index >= displayedPosters.length - 4; // Assuming 4 posters per row on lg screens
            return (
              <div
                key={poster.id}
                ref={isLastRow && hasMore ? lastPosterElementRef : null}
                className="col"
              >
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
            );
          })
        )}
      </div>

      {/* Loading Indicator for Infinite Scroll */}
      {hasMore && (
        <div className="text-center mt-4">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading more...</span>
          </div>
        </div>
      )}
    </div>
  );
}