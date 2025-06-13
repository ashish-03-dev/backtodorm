import React from 'react';
import trending from '../../data/trending';

export default function PosterGrid({ addToCart }) {
  return (
    <section className="py-5 bg-light">
      <div className="container">
        <h2 className="text-center fw-bold fs-2 mb-4">You may also like</h2>
        <div className="d-flex overflow-auto gap-3 pb-2" style={{ scrollSnapType: "x mandatory" }}>
          {trending.map((poster) => (
            <div key={poster.id} className="flex-shrink-0"
              style={{
                width: "80%", // mobile default
                maxWidth: "18rem", // limit card size on large screens
                scrollSnapAlign: "start",
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
                <img
                  src={poster.image}
                  alt={poster.title}
                  style={{
                    width: '100%',
                    aspectRatio: "4/5",
                    objectFit: 'cover',  // Cover to fill the width nicely
                    display: 'block',    // Remove any inline space below image
                    borderRadius: '0.5rem 0.5rem 0 0' // Round only top corners, optional
                  }}

                />
                <div className="p-3 text-center">
                  <h3 className="fs-6 fw-semibold mb-1 text-truncate">{poster.title}</h3>
                  <p className="" style={{ fontSize: "16px" }} >From ₹{poster.price}</p>
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
