import React, { useEffect, useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { useFirebase } from '../../context/FirebaseContext';
import '../../styles/CategoryScroll.css';

export default function ShopByCollection() {
  const { firestore } = useFirebase();
  const [isHovered, setIsHovered] = useState(false);
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const scrollRef = useRef();

  useEffect(() => {
    if (!firestore) {
      setError('Firestore is not available. Please try again later.');
      setLoading(false);
      return;
    }

    const collectionsRef = collection(firestore, 'homeSections/homeCollections/collectionItems');
    const unsubscribeCollections = onSnapshot(
      collectionsRef,
      async (snapshot) => {
        try {
          const collectionData = await Promise.all(
            snapshot.docs.map(async (collectionDoc) => {
              const data = collectionDoc.data();
              const imageIds = data.imageIds?.slice(0, 3) || []; // Limit to 3 images
              if (!imageIds.length) return null;

              const postersQuery = query(
                collection(firestore, 'posters'),
                where('__name__', 'in', imageIds)
              );
              return new Promise((resolve) => {
                onSnapshot(postersQuery, (postersSnap) => {
                  const imageUrls = postersSnap.docs
                    .map((doc) => doc.data().imageUrl)
                    .filter((url) => url);
                  resolve({
                    id: collectionDoc.id,
                    title: data.name || 'Unnamed Collection',
                    link: `/collections/${collectionDoc.id}`,
                    images: imageUrls,
                  });
                }, (err) => {
                  resolve(null); // Skip collection on poster fetch error
                });
              });
            })
          );
          setCollections(collectionData.filter((col) => col && col.images.length > 0));
          setLoading(false);
        } catch (err) {
          setError(`Failed to load collections: ${err.message}`);
          setLoading(false);
        }
      },
      (err) => {
        setError(`Failed to load collections: ${err.message}`);
        setLoading(false);
      }
    );

    return () => unsubscribeCollections();
  }, [firestore]);

  const SkeletonCard = () => (
    <div
      className="card shadow-sm flex-shrink-0 border-0 rounded-1 category-card"
      style={{ scrollSnapAlign: 'start' }}
    >
      <div
        className="skeleton-image bg-light"
        style={{
          height: '17rem',
          width: '100%',
          backgroundColor: '#e0e0e0',
          animation: 'pulse 1.5s infinite',
        }}
      />
      <div
        className="card-body d-flex justify-content-center align-items-center"
        style={{ flexGrow: 1, minHeight: 0 }}
      >
        <div
          className="skeleton-text bg-light"
          style={{
            height: '1rem',
            width: '80%',
            backgroundColor: '#e0e0e0',
            animation: 'pulse 1.5s infinite',
          }}
        />
      </div>
    </div>
  );

  return (
    <section
      className="pt-5 pb-4 py-md-5 px-3 position-relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <h2 className="fs-2 fw-bold mb-4 text-center">Shop by Collection</h2>

      {isHovered && collections.length > 0 && (
        <>
          <button
            onClick={() => scrollRef.current?.scrollBy({ left: -300, behavior: 'smooth' })}
            className="btn btn-light rounded-circle position-absolute top-50 start-0 translate-middle-y d-none d-md-flex align-items-center justify-content-center shadow-sm"
            style={{ width: '40px', height: '40px', zIndex: 10 }}
            aria-label="Scroll left"
          >
            <i className="bi bi-chevron-left fs-5" />
          </button>
          <button
            onClick={() => scrollRef.current?.scrollBy({ left: 300, behavior: 'smooth' })}
            className="btn btn-light rounded-circle position-absolute top-50 end-0 translate-middle-y d-none d-md-flex align-items-center justify-content-center shadow-sm"
            style={{ width: '40px', height: '40px', zIndex: 10 }}
            aria-label="Scroll right"
          >
            <i className="bi bi-chevron-right fs-5" />
          </button>
        </>
      )}

      {loading && (
        <div
          ref={scrollRef}
          className="d-flex overflow-auto pb-2 gap-2 gap-md-3"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            scrollSnapType: 'x mandatory',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {Array(5)
            .fill()
            .map((_, index) => (
              <SkeletonCard key={index} />
            ))}
          <div style={{ width: '1rem', flexShrink: 0 }} />
        </div>
      )}

      {error && (
        <div className="alert alert-danger text-center py-5" role="alert">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div
          ref={scrollRef}
          className="d-flex overflow-auto pb-2 gap-2 gap-md-3"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            scrollSnapType: 'x mandatory',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {collections.length === 0 && (
            <div className="text-center py-5 w-100">
              <p className="text-muted">No collections available.</p>
            </div>
          )}
          {collections.map((col) => (
            <SlidingCard
              key={col.id}
              title={col.title}
              link={col.link}
              images={col.images}
            />
          ))}
          <div style={{ width: '1rem', flexShrink: 0 }} />
        </div>
      )}
    </section>
  );
}

function SlidingCard({ title, link, images }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % images.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [images.length]);

  return (
    <Link
      to={link}
      className="text-decoration-none text-dark"
      style={{ scrollSnapAlign: 'start' }}
    >
      <div
        className="card shadow-sm flex-shrink-0 border-0 rounded-1 d-flex flex-column category-card"
        style={{ overflow: 'hidden' }}
      >
        <div
          className="d-flex"
          style={{
            width: `${images.length * 100}%`,
            transform: `translateX(-${index * (100 / images.length)}%)`,
            transition: 'transform 0.6s ease-in-out',
          }}
        >
          {images.map((src, i) => (
            <img
              key={i}
              src={src}
              alt={`${title} image ${i + 1}`}
              style={{
                height: '17rem',
                objectFit: 'cover',
                flex: `0 0 ${100 / images.length}%`,
              }}
            />
          ))}
        </div>
        <div
          className="card-body d-flex justify-content-center align-items-center"
          style={{ flexGrow: 1, minHeight: 0 }}
        >
          <h6 className="mb-0 fw-semibold fs-6 text-center">{title}</h6>
        </div>
      </div>
    </Link>
  );
}

ShopByCollection.propTypes = {
  firestore: PropTypes.object,
};

SlidingCard.propTypes = {
  title: PropTypes.string.isRequired,
  link: PropTypes.string.isRequired,
  images: PropTypes.arrayOf(PropTypes.string).isRequired,
};