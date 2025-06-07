import React from 'react';
import posters from '../data/posters'; // adjust based on your actual path
import PosterCard from './PosterCard';

export default function PosterGrid({ addToCart }) {
  return (
    <section className="py-5 bg-light">
      <div className="container">
        <h2 className="text-center fw-bold fs-2 mb-4">You may also like</h2>
        <div className="row g-4">
          {posters.map((poster) => (
            <div key={poster.id} className="col-12 col-sm-6 col-lg-4 d-flex align-items-stretch">
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
                <img
                  src={poster.img}
                  alt={poster.title}
                  className="w-100"
                  style={{
                    width: '100%',
                    height: 'auto',      // Let height adjust naturally
                    objectFit: 'cover',  // Cover to fill the width nicely
                    display: 'block',    // Remove any inline space below image
                    borderRadius: '0.5rem 0.5rem 0 0' // Round only top corners, optional
                  }}

                />
                <div className="p-3 text-center">
                  <h3 className="fs-6 fw-semibold mb-1 text-truncate">{poster.title}</h3>
                  <p className="text-muted small mb-2">₹{poster.price}</p>
                  <button
                    onClick={() => addToCart(poster)}
                    className="btn btn-dark btn-sm rounded-pill px-4"
                  >
                    Add to Cart
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
