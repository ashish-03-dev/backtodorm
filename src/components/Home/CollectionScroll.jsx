import { useRef, useState} from 'react';
import { Link } from 'react-router-dom';
import { useCollectionsContext } from '../../context/CollectionsContext';
import { BsChevronLeft, BsChevronRight } from 'react-icons/bs';

export default function HorizontalCollectionScroll() {
  const { collections, loading, error } = useCollectionsContext();
  const scrollRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);

  const scroll = (direction) => {
    const container = scrollRef.current;
    if (container) {
      const scrollAmount = 320;
      container.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  return (
    <section
      className="py-4 py-md-5 px-3 position-relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <h2 className="fs-2 fw-bold mb-4 text-center">Collection Packs</h2>

      <div
        ref={scrollRef}
        className="d-flex overflow-auto gap-4 pb-2"
        style={{
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {loading ? (
          <div className="w-100 text-center py-4">Loading collections...</div>
        ) : error ? (
          <div className="w-100 text-center text-danger py-4">{error}</div>
        ) : (
          <>
            {isHovered && (
              <>
                <button
                  onClick={() => scroll('left')}
                  className="btn btn-light rounded-circle position-absolute top-50 start-0 translate-middle-y d-none d-md-flex align-items-center justify-content-center shadow"
                  style={{ width: '40px', height: '40px', zIndex: 10 }}
                  aria-label="Scroll left"
                >
                  <BsChevronLeft className="fs-5" />
                </button>
                <button
                  onClick={() => scroll('right')}
                  className="btn btn-light rounded-circle position-absolute top-50 end-0 translate-middle-y d-none d-md-flex align-items-center justify-content-center shadow"
                  style={{ width: '40px', height: '40px', zIndex: 10 }}
                  aria-label="Scroll right"
                >
                  <BsChevronRight className="fs-5" />
                </button>
              </>
            )}
            {collections.map((col) => (
              <Link
                to={`/collection/${col.id}`}
                key={col.id}
                className="text-decoration-none text-dark flex-shrink-0 collection-cards"
                style={{ scrollSnapAlign: 'start' }}
              >
                <div className="card border h-100">
                  <img
                    src={col.imageUrl}
                    alt={col.title}
                    className="w-100"
                    style={{
                      aspectRatio: '20/23',
                      objectFit: 'cover',
                      borderTopLeftRadius: '0.5rem',
                      borderTopRightRadius: '0.5rem',
                    }}
                  />
                  <div className="card-body d-flex flex-column justify-content-between">
                    <div>
                      <h5 className="card-title fw-semibold mb-1">{col.title}</h5>
                      <p className="card-text text-muted small mb-2">{col.description}</p>
                    </div>
                    <div>
                      <span className="btn btn-sm btn-outline-dark rounded-pill">View Collection</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </>
        )}
      </div>
      <div className="text-center mt-4">
        <Link to="/collections-packs" className="btn btn-outline-dark">
          View All
        </Link>
      </div>
    </section>
  );
}