import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, orderBy, limit, startAfter, getDocs } from 'firebase/firestore';
import { useFirebase } from '../../context/FirebaseContext';
import { useCartContext } from '../../context/CartContext';

export default function AllPosters() {
  const { firestore } = useFirebase();
  const { addToCart } = useCartContext();
  const [posters, setPosters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const observerRef = useRef(null);
  const loadMoreRef = useRef(null);

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
        const lowestPrice = sizes.length > 0
          ? Math.min(...sizes.map(s => s.finalPrice || s.price || 0))
          : 0;

        return {
          id: doc.id,
          title: data.title || 'Untitled',
          image: data.imageUrl || 'https://via.placeholder.com/300',
          sizes: sizes,
          price: lowestPrice,
          discount: data.discount || 0,
          seller: data.seller || 'Unknown',
        };
      });

      setPosters(prev => startAfterDoc ? [...prev, ...fetchedPosters] : fetchedPosters);
      setLastDoc(querySnapshot.docs[querySnapshot.docs.length - 1]);
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
    fetchPosters();
  }, [firestore]);

  useEffect(() => {
    if (!hasMore || loading || loadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setLoadingMore(true);
          fetchPosters(lastDoc);
        }
      },
      { threshold: 0.1, rootMargin: '800px' } // Trigger when 800px from bottom
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => {
      if (loadMoreRef.current) {
        observer.unobserve(loadMoreRef.current);
      }
    };
  }, [hasMore, loading, loadingMore, lastDoc]);

  const handleAddToCart = (poster) => {
    if (!poster.sizes || poster.sizes.length === 0) {
      alert('No sizes available for this poster.');
      return;
    }

    const defaultSize = poster.sizes[0].size;
    const selectedSizeObj = poster.sizes[0] || {};
    const displayPrice = selectedSizeObj.finalPrice || selectedSizeObj.price || 0;

    const cartItem = {
      posterId: poster.id,
      title: poster.title,
      size: defaultSize,
      price: displayPrice,
      image: poster.image,
      seller: poster.seller,
    };

    try {
      addToCart(cartItem);
    } catch (err) {
      console.error('Error adding to cart:', err);
      alert('Failed to add to cart.');
    }
  };

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
          <div className="bg-gray-200 h-8 w-full rounded animate-pulse" />
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
            {Array(POSTERS_PER_PAGE).fill().map((_, index) => (
              <SkeletonCard key={index} />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="bg-white py-5">
        <div className="container text-center">{error}</div>
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
                  />
                  <div className="p-3 text-center">
                    <h3 className="fs-6 fw-semibold mb-1 text-truncate">
                      {poster.title}
                    </h3>
                    <p className="mb-1" style={{ fontSize: '16px' }}>
                      From ₹{poster.price.toLocaleString('en-IN')}
                      {poster.discount > 0 && (
                        <span className="text-success ms-1">
                          ({poster.discount}% off)
                        </span>
                      )}
                    </p>
                  </div>
                </Link>
                <div className="px-3 pb-3 text-center">
                  <button
                    onClick={() => handleAddToCart(poster)}
                    className="btn btn-dark btn-sm rounded-pill px-4"
                    aria-label={`Add ${poster.title} to cart`}
                  >
                    Add to Cart
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        {loadingMore && (
          <div className="row g-4 mt-4">
            {Array(POSTERS_PER_PAGE).fill().map((_, index) => (
              <SkeletonCard key={`loading-${index}`} />
            ))}
          </div>
        )}
        {hasMore && (
          <div ref={loadMoreRef} className="h-1 mt-4" />
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