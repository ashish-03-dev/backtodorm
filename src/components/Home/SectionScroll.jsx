import React, { useRef, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { doc, onSnapshot, query, collection, where } from 'firebase/firestore';
import '../../styles/trendingPosters.css';

export default function SectionScroll({ sectionId, title, firestore }) {
  const [posters, setPosters] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);

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
          return;
        }

        const sectionList = sectionSnap.data().sectionList || [];
        const section = sectionList.find((s) => s.id === sectionId);

        if (!section) {
          setError(`${title} not configured.`);
          setPosters([]);
          setIsLoading(false);
          return;
        }

        const posterIds = section.posterIds?.slice(0, 10) || [];
        if (!posterIds.length) {
          setPosters([]);
          setIsLoading(false);
          return;
        }

        const postersQuery = query(
          collection(firestore, 'posters'),
          where('__name__', 'in', posterIds),
          where('approved', '==', 'approved'),
          where('isActive', '==', true)
        );

        const unsubscribePosters = onSnapshot(
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
                : { price: 0, finalPrice: 0 };

              return {
                id: doc.id,
                title: data.title || 'Untitled',
                image: data.imageUrl || '',
                price: minPriceSize.finalPrice || 0,
                originalPrice: minPriceSize.price || 0,
                discount:
                  sizes.length && minPriceSize.finalPrice < minPriceSize.price
                    ? Math.round((1 - minPriceSize.finalPrice / minPriceSize.price) * 100)
                    : 0,
                sizes,
                badges,
              };
            });
            setPosters(fetchedPosters);
            setIsLoading(false);
          },
          (err) => {
            setError(`Failed to load posters: ${err.message}`);
            setIsLoading(false);
          }
        );

        return () => unsubscribePosters();
      },
      (err) => {
        setError(`Failed to load ${title.toLowerCase()}: ${err.message}`);
        setIsLoading(false);
      }
    );

    return () => unsubscribeSection();
  }, [firestore, sectionId, title]);

  const scroll = (direction) => {
    const container = scrollRef.current;
    if (container) {
      container.scrollBy({ left: direction === 'left' ? -300 : 300, behavior: 'smooth' });
    }
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
      <h2 className="fs-2 fw-bold mb-4">{title}</h2>

      {isHovered && posters.length > 0 && (
        <>
          <button
            onClick={() => scroll('left')}
            className="btn btn-light rounded-circle position-absolute top-50 start-0 translate-middle-y d-none d-md-flex align-items-center justify-content-center shadow-sm"
            style={{ width: '40px', height: '40px', zIndex: 10 }}
            aria-label="Scroll left"
          >
            <i className="bi bi-chevron-left fs-5" />
          </button>
          <button
            onClick={() => scroll('right')}
            className="btn btn-light rounded-circle position-absolute top-50 end-0 translate-middle-y d-none d-md-flex align-items-center justify-content-center shadow-sm"
            style={{ width: '40px', height: '40px', zIndex: 10 }}
            aria-label="Scroll right"
          >
            <i className="bi bi-chevron-right fs-5" />
          </button>
        </>
      )}

      {isLoading && (
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
            <Link
              to={`/poster/${item.id}`}
              key={item.id}
              className="text-decoration-none text-dark flex-shrink-0 trending-cards"
              style={{ scrollSnapAlign: 'start' }}
            >
              <div
                className="card border-0 rounded-0 position-relative"
                style={{ width: '100%', minHeight: '350px' }}
              >
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
                <div className="py-3 d-flex flex-column text-center">
                  <h6
                    className="card-title mb-1 px-2 text-center text-truncate-2-lines"
                    style={{ fontSize: '.92rem', minHeight: '2.2rem' }}
                    title={item.title}
                  >
                    {item.title}
                  </h6>
                  <p
                    className="price-text mb-2"
                    style={{
                      fontSize: window.innerWidth <= 576 ? '15px' : '17px',
                      minHeight: '1.5rem',
                    }}
                  >
                    {item.discount > 0 ? (
                      <>
                        <span className="text-muted text-decoration-line-through me-2">
                          ₹{item.originalPrice}
                        </span>
                        <span>From ₹{item.price}</span>
                      </>
                    ) : (
                      <span>From ₹{item.price}</span>
                    )}
                  </p>
                  <button className="btn btn-dark">Add to Cart</button>
                </div>
              </div>
            </Link>
          ))}
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