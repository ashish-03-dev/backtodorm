import React, { useRef, useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { doc, onSnapshot, query, collection, where } from 'firebase/firestore';
import { useCartContext } from '../../context/CartContext';
import '../../styles/trendingPosters.css';
import { useFirebase } from '../../context/FirebaseContext';
import { BsChevronLeft, BsChevronRight } from 'react-icons/bs';

export default function SectionScroll({ sectionId, title }) {
  const { firestore } = useFirebase();
  const { addToCart } = useCartContext();
  const [posters, setPosters] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [allPosterIds, setAllPosterIds] = useState([]);
  const [loadedPosterIds, setLoadedPosterIds] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const scrollRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);
  const batchSize = 10; // Firestore 'in' query limit

  // Fetch a batch of posters
  const fetchPosterBatch = useCallback(
    (idsToFetch) => {
      if (!firestore || !idsToFetch.length) {
        setHasMore(false);
        return () => { };
      }

      const postersQuery = query(
        collection(firestore, 'posters'),
        where('__name__', 'in', idsToFetch),
        where('approved', '==', 'approved'),
        where('isActive', '==', true)
      );

      const unsubscribe = onSnapshot(
        postersQuery,
        (postersSnap) => {
          const fetchedPosters = postersSnap.docs.map((doc) => {
            const data = doc.data();
            const sizes = Array.isArray(data.sizes) ? data.sizes : [];
            const badges = Array.isArray(data.badges) ? data.badges : [];
            const minPriceSize = sizes.length
              ? sizes.reduce(
                (min, size) => (size.finalPrice < min.finalPrice ? size : min),
                sizes[0]
              )
              : { price: 0, finalPrice: 0, size: '' };

            return {
              id: doc.id,
              title: data.title || 'Untitled',
              image: data.imageUrl || '',
              price: minPriceSize.price || 0,
              finalPrice: minPriceSize.finalPrice || minPriceSize.price || 0,
              discount: minPriceSize.discount || data.discount || 0,
              sizes,
              badges,
              defaultSize: minPriceSize.size,
              seller: data.seller || null,
            };
          });

          setPosters((prev) => {
            const existingIds = new Set(prev.map((p) => p.id));
            const newPosters = fetchedPosters.filter((p) => !existingIds.has(p.id));
            return [...prev, ...newPosters];
          });

          setLoadedPosterIds((prev) => [...new Set([...prev, ...idsToFetch])]);
          setIsLoading(false);
        },
        (err) => {
          setError(`Failed to load posters: ${err.message}`);
          setIsLoading(false);
          setHasMore(false);
        }
      );

      return unsubscribe;
    },
    [firestore]
  );

  // Fetch section data and initialize poster IDs
  useEffect(() => {
    if (!firestore) {
      setError('Firestore is not available. Please try again later.');
      setIsLoading(false);
      return;
    }

    const sectionsRef = doc(firestore, 'homeSections', 'sections');
    const unsubscribeSection = onSnapshot(
      sectionsRef,
      (sectionSnap) => {
        if (!sectionSnap.exists()) {
          setError(`${title} data not found.`);
          setPosters([]);
          setIsLoading(false);
          setHasMore(false);
          return;
        }

        const sectionList = sectionSnap.data().sectionList || [];
        const section = sectionList.find((s) => s.id === sectionId);

        if (!section) {
          setError(`${title} not configured.`);
          setPosters([]);
          setIsLoading(false);
          setHasMore(false);
          return;
        }

        const posterIds = section.posterIds?.filter(
          (id) => typeof id === 'string' && id.trim() !== ''
        ) || [];

        if (!posterIds.length) {
          setPosters([]);
          setIsLoading(false);
          setHasMore(false);
          return;
        }

        setAllPosterIds(posterIds);
        const firstBatch = posterIds.slice(0, batchSize);
        setLoadedPosterIds(firstBatch);
        setHasMore(posterIds.length > batchSize);

        const unsubscribePosters = fetchPosterBatch(firstBatch);
        return () => unsubscribePosters();
      },
      (err) => {
        setError(`Failed to load ${title.toLowerCase()}: ${err.message}`);
        setIsLoading(false);
        setHasMore(false);
      }
    );

    return () => unsubscribeSection();
  }, [firestore, sectionId, title, fetchPosterBatch]);

  // Handle scroll to fetch more posters
  useEffect(() => {
    const container = scrollRef.current;
    if (!container || !hasMore) return;

    const handleScroll = () => {
      const { scrollLeft, scrollWidth, clientWidth } = container;
      const posterWidth = 200; // Approximate poster width in pixels
      const postersVisible = Math.ceil((scrollLeft + clientWidth) / posterWidth);
      const totalPosters = posters.length;
      const postersRemaining = totalPosters - postersVisible;

      if (postersRemaining <= 2 && hasMore && !isLoading) {
        const nextBatchStart = loadedPosterIds.length;
        const nextBatch = allPosterIds.slice(nextBatchStart, nextBatchStart + batchSize);

        if (nextBatch.length > 0) {
          setIsLoading(true);
          fetchPosterBatch(nextBatch);
          setHasMore(allPosterIds.length > nextBatchStart + batchSize);
        } else {
          setHasMore(false);
        }
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [hasMore, posters.length, loadedPosterIds.length, allPosterIds, fetchPosterBatch, isLoading]);

  const scroll = (direction) => {
    const container = scrollRef.current;
    if (container) {
      container.scrollBy({ left: direction === 'left' ? -300 : 300, behavior: 'smooth' });
    }
  };

  const handleAddToCart = (poster, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!poster.defaultSize) {
      alert('No size available for this poster.');
      return;
    }

    const cartItem = {
      posterId: poster.id,
      title: poster.title,
      size: poster.defaultSize,
      price: poster.price,
      finalPrice: poster.finalPrice,
      discount: poster.discount,
      seller: poster.seller,
      image: poster.image || 'https://via.placeholder.com/60',
    };

    addToCart(cartItem, false);
    console.log('Added to cart:', cartItem);
  };

  const SkeletonCard = () => (
    <div
      className="card border-0 rounded-0 flex-shrink-0 trending-cards"
      style={{ scrollSnapAlign: 'start' }}
    >
      <div
        className="skeleton-image bg-light"
        style={{
          aspectRatio: '4/5',
          width: '100%',
          backgroundColor: '#e0e0e0',
          animation: 'pulse 1.5s infinite',
        }}
      />
      <div className="pt-3 px-4 d-flex flex-column text-center">
        <div
          className="skeleton-text bg-light mb-1"
          style={{
            height: '1rem',
            width: '80%',
            margin: '0 auto',
            backgroundColor: '#e0e0e0',
            animation: 'pulse 1.5s infinite',
          }}
        />
        <div
          className="skeleton-text bg-light mb-2"
          style={{
            height: '1rem',
            width: '60%',
            margin: '0 auto',
            backgroundColor: '#e0e0e0',
            animation: 'pulse 1.5s infinite',
          }}
        />
        <div
          className="skeleton-button bg-light mt-auto"
          style={{
            height: '2.5rem',
            width: '100%',
            backgroundColor: '#e0e0e0',
            animation: 'pulse 1.5s infinite',
          }}
        />
      </div>
    </div>
  );

  return (
    <section
      className="py-4 py-md-5 px-3 position-relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <h2 className="fs-2 fw-bold mb-4 text-center">{title}</h2>

      {isHovered && posters.length > 0 && (
        <>
          <button
            onClick={() => scroll('left')}
            className="btn btn-light rounded-circle position-absolute top-50 start-0 translate-middle-y d-none d-md-flex align-items-center justify-content-center shadow-sm"
            style={{ width: '40px', height: '40px', zIndex: 10 }}
            aria-label="Scroll left"
          >
            <BsChevronLeft className="fs-5" />
          </button>
          <button
            onClick={() => scroll('right')}
            className="btn btn-light rounded-circle position-absolute top-50 end-0 translate-middle-y d-none d-md-flex align-items-center justify-content-center shadow-sm"
            style={{ width: '40px', height: '40px', zIndex: 10 }}
            aria-label="Scroll right"
          >
            <BsChevronRight className="fs-5" />
          </button>
        </>
      )}

      {isLoading && posters.length === 0 && (
        <div
          ref={scrollRef}
          className="d-flex overflow-auto gap-2 pb-2"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            scrollBehavior: 'smooth',
            scrollSnapType: 'x mandatory',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {Array(5)
            .fill()
            .map((_, index) => (
              <SkeletonCard key={index} />
            ))}
        </div>
      )}
      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      {!isLoading && !error && (
        <div
          ref={scrollRef}
          className="d-flex overflow-auto gap-2 pb-2"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            scrollBehavior: 'smooth',
            scrollSnapType: 'x mandatory',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {!posters.length && (
            <div className="text-center py-4 w-100">
              <p className="text-muted">No {title.toLowerCase()} available.</p>
            </div>
          )}
          {posters.map((item) => (
            <div
              key={item.id}
              className="flex-shrink-0 trending-cards"
              style={{ scrollSnapAlign: 'start' }}
            >
              <div
                className="card border-0 rounded-0 position-relative"
                style={{ width: '100%', minHeight: '350px' }}
              >
                <Link to={`/poster/${item.id}`} className="text-decoration-none text-dark">
                  <div className="position-relative">
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-100"
                      loading="lazy"
                      style={{
                        aspectRatio: '4/5',
                        objectFit: 'cover',
                        minHeight: '200px',
                      }}
                    />
                    {item.badges.length > 0 && (
                      <div
                        className="position-absolute top-0 start-0 p-2 d-none d-md-flex gap-1"
                        style={{ zIndex: 5 }}
                      >
                        {item.badges.map((badge, index) => (
                          <span
                            key={index}
                            className="badge bg-primary text-white"
                            style={{
                              fontSize: '0.75rem',
                              opacity: 0.9,
                            }}
                          >
                            {badge}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="pt-3 px-2 d-flex flex-column text-center">
                    <h6
                      className="card-title mb-1 text-truncate"
                      style={{
                        fontSize: '.92rem',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                      title={item.title}
                    >
                      {item.title}
                    </h6>
                    <p
                      className="mb-1 text-muted small"
                      style={{ minHeight: '1rem' }}
                    >
                      Size: {item.defaultSize || 'N/A'}
                    </p>
                    <div
                      className="price-text mb-2"
                      style={{
                        fontSize: window.innerWidth <= 576 ? '15px' : '17px',
                        minHeight: '1.5rem',
                      }}
                    >
                      {item.discount > 0 ? (
                        <div className="d-flex align-items-center justify-content-center flex-wrap">
                          <span className="text-danger fw-semibold me-2">
                            ↓ {item.discount}%
                          </span>
                          <h6 className="text-muted text-decoration-line-through mb-0 me-2">
                            ₹{item.price.toLocaleString('en-IN')}
                          </h6>
                          <h6 className="text-success mb-0" style={{ fontSize: '1rem' }}>
                            ₹{item.finalPrice.toLocaleString('en-IN')}
                          </h6>
                        </div>
                      ) : (
                        <h6 className="text-muted mb-0">
                          From <span className="fw-semibold">₹{item.finalPrice.toLocaleString('en-IN')}</span>
                        </h6>
                      )}
                    </div>
                  </div>
                </Link>
                <button
                  className="btn btn-dark mb-3"
                  onClick={(e) => {
                    console.log('button added');
                    handleAddToCart(item, e);
                  }}
                >
                  Add to Cart
                </button>
              </div>
            </div>
          ))}
          {isLoading && posters.length > 0 && (
            <div
              className="d-flex overflow-auto gap-2"
              style={{ scrollSnapAlign: 'start' }}
            >
              {Array(3)
                .fill()
                .map((_, index) => (
                  <SkeletonCard key={`loading-${index}`} />
                ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

SectionScroll.propTypes = {
  sectionId: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  firestore: PropTypes.object,
};