import React, { useRef, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { collection, getDoc, getDocs, doc, where, query } from 'firebase/firestore';
import { useCartContext } from '../../context/CartContext';
import { useSectionContext } from '../../context/SectionScrollContext';
import { useFirebase } from '../../context/FirebaseContext';
import { BsChevronLeft, BsChevronRight } from 'react-icons/bs';
import '../../styles/trendingPosters.css';

export default function SectionScroll({ sectionId, title }) {
  const { firestore } = useFirebase();
  const { addToCart } = useCartContext();
  const { getCachedPosters, cachePosters } = useSectionContext();
  const [posters, setPosters] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [posterIds, setPosterIds] = useState([]);
  const scrollRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);
  const [selectedVariantMap, setSelectedVariantMap] = useState({});

  // Handle variant selection
  const handleVariantChange = (posterId, value) => {
    setSelectedVariantMap((prev) => ({ ...prev, [posterId]: value }));
  };

  // Fetch all posters at once
  useEffect(() => {
    if (!firestore) {
      setError('Firestore is not available.');
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      // Check cache first
      const cachedData = getCachedPosters(sectionId);
      if (cachedData) {
        setPosters(cachedData.posters);
        setPosterIds(cachedData.posterIds);
        setIsLoading(false);
        return;
      }

      try {
        // Fetch section data
        const sectionRef = doc(firestore, 'homeSections', 'sections');
        const sectionDoc = await getDoc(sectionRef);
        if (!sectionDoc.exists()) {
          setError(`${title} data not found.`);
          setIsLoading(false);
          return;
        }

        const sectionList = sectionDoc.data().sectionList || [];
        const section = sectionList.find((s) => s.id === sectionId);
        if (!section || !section.posterIds?.length) {
          setError(`${title} not configured or no posters available.`);
          setIsLoading(false);
          return;
        }

        setPosterIds(section.posterIds);

        // Fetch all posters at once
        const postersQuery = query(
          collection(firestore, 'posters'),
          where('__name__', 'in', section.posterIds),
          where('isActive', '==', true)
        );
        const postersSnap = await getDocs(postersQuery);
        const fetchedPosters = postersSnap.docs.map((doc) => {
          const data = doc.data();
          const sizes = Array.isArray(data.sizes) ? data.sizes : [];
          const minPriceSize = sizes.length
            ? sizes.reduce((min, size) => (size.finalPrice < min.finalPrice ? size : min), sizes[0])
            : { price: 0, finalPrice: 0, size: '' };

          return {
            id: doc.id,
            title: data.title || 'Untitled',
            image: data.imageUrl || '',
            price: minPriceSize.price || 0,
            finalPrice: minPriceSize.finalPrice || minPriceSize.price || 0,
            discount: minPriceSize.discount || data.discount || 0,
            sizes,
            defaultSize: minPriceSize.size,
            seller: data.seller || null,
          };
        });

        setPosters(fetchedPosters);
        // Cache the fetched data
        cachePosters(sectionId, fetchedPosters, section.posterIds, false);
        setIsLoading(false);
      } catch (err) {
        setError(`Failed to load ${title.toLowerCase()}: ${err.message}`);
        setIsLoading(false);
      }
    };

    fetchData();
  }, [firestore, sectionId, title, getCachedPosters, cachePosters]);

  // Scroll navigation
  const scroll = (direction) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: direction === 'left' ? -300 : 300, behavior: 'smooth' });
    }
  };

  // addToCart, SkeletonCard, and JSX remain unchanged
  const handleAddToCart = (poster, e) => {
    e.preventDefault();
    e.stopPropagation();

    const selectedVariant = selectedVariantMap[poster.id] || `${poster.defaultSize}_Gloss`;
    const [selectedSize, selectedFinish] = selectedVariant.split('_');
    const sizeDetail = poster.sizes.find((s) => s.size === selectedSize) || {};

    const cartItem = {
      posterId: poster.id,
      title: poster.title,
      size: selectedSize,
      finish: selectedFinish,
      price: sizeDetail.price || poster.price,
      finalPrice: sizeDetail.finalPrice || poster.finalPrice,
      discount: sizeDetail.discount || poster.discount,
      seller: poster.seller,
      image: poster.image || 'https://via.placeholder.com/60',
    };

    addToCart(cartItem, false);
  };

  const SkeletonCard = () => (
    <div className="card border-0 rounded-0 flex-shrink-0 trending-cards" style={{ scrollSnapAlign: 'start' }}>
      <div
        className="skeleton-image bg-light"
        style={{ aspectRatio: '4/5', width: '100%', backgroundColor: '#e0e0e0', animation: 'pulse 1.5s infinite' }}
      />
      <div className="pt-3 px-4 d-flex flex-column text-center">
        <div
          className="skeleton-text bg-light mb-1"
          style={{ height: '1rem', width: '80%', margin: '0 auto', backgroundColor: '#e0e0e0', animation: 'pulse 1.5s infinite' }}
        />
        <div
          className="skeleton-button bg-light mt-auto"
          style={{ height: '2.5rem', width: '100%', backgroundColor: '#e0e0e0', animation: 'pulse 1.5s infinite' }}
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
            style={{ width:'40px', height: '40px', zIndex: 10 }}
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
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', scrollBehavior: 'smooth', scrollSnapType: 'x mandatory' }}
        >
          {Array(5).fill().map((_, index) => (
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
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', scrollBehavior: 'smooth', scrollSnapType: 'x mandatory' }}
        >
          {!posters.length && (
            <div className="text-center py-4 w-100">
              <p className="text-muted">No {title.toLowerCase()} available.</p>
            </div>
          )}
          {posters.map((item) => (
            <div key={item.id} className="flex-shrink-0 trending-cards" style={{ scrollSnapAlign: 'start' }}>
              <div className="card border-0 rounded-0" style={{ width: '100%', minHeight: '350px' }}>
                <Link to={`/poster/${item.id}`} className="text-decoration-none text-dark">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-100"
                    loading="lazy"
                    style={{ aspectRatio: '4/5', objectFit: 'cover', minHeight: '200px' }}
                  />
                  <div className="pt-3 px-2 d-flex flex-column text-center">
                    <h6
                      className="card-title mb-1 text-truncate"
                      style={{ fontSize: '.92rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                      title={item.title}
                    >
                      {item.title}
                    </h6>
                    <div className="price-text mb-2" style={{ minHeight: '1.5rem' }}>
                      {(() => {
                        const selectedVariant = selectedVariantMap[item.id] || `${item.defaultSize}_Gloss`;
                        const [selectedSize] = selectedVariant.split('_');
                        const sizeDetail = item.sizes.find((s) => s.size === selectedSize) || {};

                        const price = sizeDetail.price || item.price;
                        const finalPrice = sizeDetail.finalPrice || item.finalPrice;
                        const discount = sizeDetail.discount || item.discount || 0;

                        return discount > 0 ? (
                          <div className="d-flex align-items-center justify-content-center flex-wrap">
                            <span className="text-danger me-2">↓ {discount}%</span>
                            <h6 className="text-muted text-decoration-line-through mb-0 me-2">
                              ₹{price.toLocaleString('en-IN')}
                            </h6>
                            <h6 className="text-success mb-0" style={{ fontSize: '1rem' }}>
                              ₹{finalPrice.toLocaleString('en-IN')}
                            </h6>
                          </div>
                        ) : (
                          <h6 className="text-muted mb-0">₹{finalPrice.toLocaleString('en-IN')}</h6>
                        );
                      })()}
                    </div>
                  </div>
                </Link>
                <div className="mb-2">
                  <select
                    className="form-select form-select-sm text-center"
                    value={selectedVariantMap[item.id] || `${item.defaultSize}_Gloss`}
                    onChange={(e) => handleVariantChange(item.id, e.target.value)}
                  >
                    {item.sizes.map((s) =>
                      ['Gloss', 'Matte'].map((finish) => (
                        <option key={`${s.size}_${finish}`} value={`${s.size}_${finish}`}>
                          {s.size} – {finish} Finish
                        </option>
                      ))
                    )}
                  </select>
                </div>
                <button className="btn btn-dark mb-3" onClick={(e) => handleAddToCart(item, e)}>
                  Add to Cart
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

SectionScroll.propTypes = {
  sectionId: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
};