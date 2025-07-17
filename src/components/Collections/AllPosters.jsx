import React, { createContext, useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, orderBy, limit, startAfter, getDocs } from 'firebase/firestore';
import { useFirebase } from '../../context/FirebaseContext'; // Adjust path as needed

// Create Context
const AllPostersContext = createContext();

export const useAllPosters = () => useContext(AllPostersContext);

export const AllPostersProvider = ({ children }) => {
  const { firestore } = useFirebase();
  const [posters, setPosters] = useState([]);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [scrollPosition, setScrollPosition] = useState(0);

  const POSTERS_PER_PAGE = 12;

  const fetchPosters = async (startAfterDoc = null) => {
    if (!firestore) {
      setError('Firestore is not available.');
      setLoading(false);
      return;
    }

    try {
      const postersQuery = query(
        collection(firestore, 'posters'),
        where('isActive', '==', true),
        orderBy('createdAt', 'desc'),
        limit(POSTERS_PER_PAGE),
        ...(startAfterDoc ? [startAfter(startAfterDoc)] : [])
      );

      const querySnapshot = await getDocs(postersQuery);
      const fetchedPosters = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        const sizes = Array.isArray(data.sizes) ? data.sizes : [];

        let price = 0;
        let finalPrice = 0;

        if (sizes.length > 0) {
          const sorted = sizes
            .map(s => ({
              price: s.price || 0,
              finalPrice: s.finalPrice !== undefined ? s.finalPrice : s.price || 0,
            }))
            .sort((a, b) => a.finalPrice - b.finalPrice);

          price = sorted[0].price;
          finalPrice = sorted[0].finalPrice;
        }

        return {
          id: doc.id,
          title: data.title || 'Untitled',
          image: data.imageUrl || 'https://via.placeholder.com/400x500', // Fallback image
          sizes,
          price,
          finalPrice,
          discount: data.discount || 0,
          seller: data.seller || 'Unknown',
        };
      });

      setPosters(prev => startAfterDoc ? [...prev, ...fetchedPosters] : fetchedPosters);
      setLastDoc(querySnapshot.docs[querySnapshot.docs.length - 1] || null);
      setHasMore(querySnapshot.docs.length === POSTERS_PER_PAGE);
      setLoading(false);
      setLoadingMore(false);
    } catch (err) {
      console.error('Error fetching posters:', err);
      setError('Failed to load posters: ' + err.message);
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (posters.length === 0 && !error) {
      fetchPosters();
    } else if (posters.length > 0) {
      window.scrollTo({ top: scrollPosition, behavior: 'instant' });
    }
  }, [firestore, posters.length, error]);

  useEffect(() => {
    const handleScroll = () => {
      setScrollPosition(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLoadMore = () => {
    if (!hasMore || loading || loadingMore) return;
    setLoadingMore(true);
    fetchPosters(lastDoc);
  };

  const resetState = () => {
    setPosters([]);
    setLastDoc(null);
    setHasMore(true);
    setLoading(true);
    setError(null);
    setScrollPosition(0);
    fetchPosters();
  };

  const value = {
    posters,
    loading,
    loadingMore,
    error,
    hasMore,
    handleLoadMore,
    resetState,
  };

  return (
    <AllPostersContext.Provider value={value}>
      {children}
    </AllPostersContext.Provider>
  );
};

export default function AllPosters() {
  const { posters, loading, loadingMore, error, hasMore, handleLoadMore, resetState } = useAllPosters(); // Destructure resetState here

  const SkeletonCard = () => (
    <div className="col-6 col-md-4 col-lg-3 d-flex align-items-stretch">
      <div className="border rounded shadow-sm w-100 bg-white overflow-hidden d-flex flex-column">
        <div
          className="bg-gray-200 animate-pulse"
          style={{ aspectRatio: '4/5', width: '100%' }}
        />
        <div className="p-3 text-center">
          <div className="bg-gray-200 h-4 w-3/4 mx-auto mb-2 animate-pulse" />
          <div className="bg-gray-200 h-4 w-1/2 mx-auto mb-2 animate-pulse" />
        </div>
      </div>
    </div>
  );

  if (loading && posters.length === 0) {
    return (
      <section className="bg-white py-5">
        <div className="container">
          <h2 className="fs-2 fw-bold mb-4 text-center">All Posters</h2>
          <div className="row g-4">
            {Array(12).fill().map((_, index) => (
              <SkeletonCard key={`skeleton-${index}`} />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="bg-white py-5">
        <div className="container text-center">
          <p>{error}</p>
          <button
            className="btn btn-primary mt-3"
            onClick={resetState} // Use the destructured resetState
          >
            Try Again
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-white py-5">
      <div className="container">
        <h2 className="fs-2 fw-bold mb-4 text-center">All Posters</h2>
        <div className="row g-4">
          {posters.map((poster) => (
            <div
              key={poster.id}
              className="col-6 col-md-4 col-lg-3 d-flex align-items-stretch"
            >
              <div
                className="border rounded shadow-sm w-100 bg-white overflow-hidden d-flex flex-column"
                style={{
                  transition: 'transform 0.2s, box-shadow 0.3s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow =
                    '0 0.75rem 1.5rem rgba(0,0,0,0.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = '';
                  e.currentTarget.style.boxShadow = '';
                }}
              >
                <Link
                  to={`/poster/${poster.id}`}
                  className="text-decoration-none text-dark flex-grow-1"
                >
                  <img
                    src={poster.image}
                    alt={poster.title}
                    className="w-100"
                    loading="lazy"
                    style={{
                      aspectRatio: '4/5',
                      objectFit: 'cover',
                    }}
                    onError={(e) => {
                      e.target.src = 'https://via.placeholder.com/400x500';
                    }}
                  />
                  <div className="p-3 text-center">
                    <h3 className="fs-6 fw-semibold mb-1 text-truncate">
                      {poster.title}
                    </h3>
                    <p className="mb-1" style={{ fontSize: '16px' }}>
                      {poster.discount > 0 && poster.finalPrice < poster.price ? (
                        <>
                          <span className="text-danger fw-semibold me-2">↓ {poster.discount}%</span>
                          <span className="text-muted text-decoration-line-through me-2">
                            ₹{poster.price.toLocaleString('en-IN')}
                          </span>
                          <span className="text-success fw-semibold">
                            ₹{poster.finalPrice.toLocaleString('en-IN')}
                          </span>
                        </>
                      ) : (
                        <span className="text-muted fw-semibold">
                          From ₹{poster.price.toLocaleString('en-IN')}
                        </span>
                      )}
                    </p>
                  </div>
                </Link>
              </div>
            </div>
          ))}
        </div>
        {loadingMore && (
          <div className="row g-4 mt-4">
            {Array(12).fill().map((_, index) => (
              <SkeletonCard key={`loading-${index}`} />
            ))}
          </div>
        )}
        {hasMore && (
          <div className="text-center mt-5">
            <button
              className="btn btn-primary"
              onClick={handleLoadMore}
              disabled={loadingMore}
            >
              {loadingMore ? 'Loading...' : 'Load More'}
            </button>
          </div>
        )}
        {!hasMore && posters.length > 0 && (
          <div className="text-center mt-5">
            <p className="text-muted">No more posters to load.</p>
          </div>
        )}
      </div>
    </section>
  );
}