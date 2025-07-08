// src/components/NewArrivals.js
import { Link } from 'react-router-dom';
import { useNewArrivals } from '../../context/NewArrivalsContext';

export default function NewArrivals() {
  const { posters, loading, error } = useNewArrivals();

  if (loading) {
    return (
      <section className="bg-white">
        <div className="container my-5 text-center">
          <div className="spinner-border text-dark" role="status" />
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="bg-white">
        <div className="container my-5 text-center">{error}</div>
      </section>
    );
  }

  return (
    <section className="bg-white">
      <div className="container pb-4">
        <h2 className="fs-2 fw-bold mb-4 text-center">New Arrivals</h2>

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
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-5">
          <Link to="/all-posters" className="btn btn-outline-dark">
            View All
          </Link>
        </div>
      </div>
    </section>
  );
}