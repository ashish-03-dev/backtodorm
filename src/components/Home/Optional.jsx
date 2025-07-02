import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { useFirebase } from '../../context/FirebaseContext';
import { BiChevronRight, BiChevronLeft } from 'react-icons/bi';

export default function YouMayAlsoLike() {
  const { firestore } = useFirebase();
  const [posters, setPosters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isHovered, setIsHovered] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!firestore) {
      setError('Firestore is not available.');
      setLoading(false);
      return;
    }

    const fetchPosters = async () => {
      try {
        const postersQuery = query(
          collection(firestore, 'posters'),
          where('isActive', '==', true),
          orderBy('createdAt', 'desc'),
          limit(6)
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

        setPosters(fetchedPosters);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching posters:', err);
        setError('Failed to load posters: ' + err.message);
        setLoading(false);
      }
    };

    fetchPosters();
  }, [firestore]);

  const scroll = (direction) => {
    const container = scrollRef.current;
    if (container) {
      container.scrollBy({ left: direction === 'left' ? -300 : 300, behavior: 'smooth' });
    }
  };

  const SkeletonCard = () => (
    <div
      className="border rounded shadow-sm w-100 bg-white overflow-hidden flex-shrink-0"
      style={{ width: '80%', maxWidth: '18rem', scrollSnapAlign: 'start' }}
    >
      <div
        className="bg-light"
        style={{
          width: '100%',
          aspectRatio: '4/5',
          backgroundColor: '#e0e0e0',
          animation: 'pulse 1.5s infinite',
        }}
      />
      <div className="p-3 text-center">
        <div
          className="bg-light mb-1"
          style={{
            height: '1rem',
            width: '80%',
            margin: '0 auto',
            backgroundColor: '#e0e0e0',
            animation: 'pulse 1.5s infinite',
          }}
        />
        <div
          className="bg-light mb-2"
          style={{
            height: '1rem',
            width: '60%',
            margin: '0 auto',
            backgroundColor: '#e0e0e0',
            animation: 'pulse 1.5s infinite',
          }}
        />
      </div>
    </div>
  );

  if (loading) {
    return (
      <section className="py-5 bg-light">
        <div className="container">
          <div
            className="d-flex overflow-auto gap-3 pb-2"
            style={{ scrollSnapType: 'x mandatory' }}
          >
            {Array(6)
              .fill()
              .map((_, index) => (
                <SkeletonCard key={index} />
              ))}
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="py-5 bg-light">
        <div className="container text-center">{error}</div>
      </section>
    );
  }

  return (
    <section
      className="py-5 bg-light position-relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="container">
        <h2 className="text-center fw-bold mb-4">You May Also Like</h2>
        {isHovered && posters.length > 0 && (
          <>
            <button
              onClick={() => scroll('left')}
              className="btn btn-light rounded-circle position-absolute top-50 start-0 translate-middle-y d-none d-md-flex align-items-center justify-content-center shadow-sm"
              style={{ width: '40px', height: '40px', zIndex: 10 }}
              aria-label="Scroll left"
            >
              <BiChevronLeft className="fs-5" />
            </button>
            <button
              onClick={() => scroll('right')}
              className="btn btn-light rounded-circle position-absolute top-50 end-0 translate-middle-y d-none d-md-flex align-items-center justify-content-center shadow-sm"
              style={{ width: '40px', height: '40px', zIndex: 10 }}
              aria-label="Scroll right"
            >
              <BiChevronRight className="fs-5" />
            </button>
          </>
        )}
        <div
          ref={scrollRef}
          className="d-flex overflow-auto gap-3 py-2"
          style={{
            scrollSnapType: 'x mandatory',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            scrollBehavior: 'smooth',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {posters.map((poster) => (
            <div
              key={poster.id}
              className="flex-shrink-0"
              style={{
                width: '80%',
                maxWidth: '18rem',
                scrollSnapAlign: 'start',
              }}
            >
              <div
                className="border rounded shadow-sm w-100 bg-white overflow-hidden"
                style={{
                  transition: 'transform 0.2s, box-shadow 0.3s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 0.75rem 1.5rem rgba(0,0,0,0.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = '';
                  e.currentTarget.style.boxShadow = '';
                }}
              >
                <Link
                  to={`/poster/${poster.id}`}
                  className="text-decoration-none text-dark"
                >
                  <img
                    src={poster.image}
                    alt={poster.title}
                    style={{
                      width: '100%',
                      aspectRatio: '4/5',
                      objectFit: 'cover',
                      display: 'block',
                      borderRadius: '0.5rem 0.5rem 0 0',
                    }}
                  />
                  <div className="p-3 text-center">
                    <h3 className="fs-6 fw-semibold mb-1 text-truncate">
                      {poster.title}
                    </h3>
                    <p className="mb-2" style={{ fontSize: '16px' }}>
                      From ₹{poster.price.toLocaleString('en-IN')}
                      {poster.discount > 0 && (
                        <span className="text-success ms-1">
                          ({poster.discount}% off)
                        </span>
                      )}
                    </p>
                  </div>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}