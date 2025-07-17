import { Link } from 'react-router-dom';
import { useCollectionDetail } from '../../context/CollectionDetailContext';

const CollectionDetail = () => {
  const {
    posters,
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
  } = useCollectionDetail();

  const title = collectionName || 'Collection';

  if (isLoading) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-5">
        <h2 className="mb-4 text-capitalize">{title}</h2>
        <div className="alert alert-danger">{error}</div>
      </div>
    );
  }

  return (
    <div className="container py-5">
      <h2 className="mb-4 text-capitalize">{title}</h2>

      {/* Filters */}
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

      {/* Posters */}
      <div className="row row-cols-2 row-cols-sm-3 row-cols-lg-4 g-4">
        {posters.length === 0 ? (
          <p className="col-12">No posters found for selected filters.</p>
        ) : (
          posters.map((poster) => (
            <div key={poster.id} className="col">
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
          ))
        )}
      </div>

      {/* Load More */}
      {hasMore && (
        <div className="text-center mt-4">
          <button className="btn btn-primary" onClick={handleLoadMore} disabled={isLoading}>
            {isLoading ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}
    </div>
  );
};

export default CollectionDetail;