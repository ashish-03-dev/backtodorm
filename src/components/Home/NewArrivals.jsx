import React from 'react';
import newArrivals from '../../data/newArrivals';

export default function NewArrivals() {
  return (
    <section className="bg-white">
      <div className="container">
        <h2 className="fs-2 fw-bold mb-4 text-center">New Arrivals</h2>

        <div className="row g-4">
          {newArrivals.map((poster, i) => (
            <div
              key={i}
              className="col-6 col-md-4 col-lg-3 d-flex align-items-stretch"
            >
              <div
                className="border rounded shadow-sm w-100 bg-white overflow-hidden"
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
                <img
                  src={poster.image}
                  alt={poster.title}
                  className="w-100"
                  style={{
                    // height: 'auto',
                    aspectRatio: "4/5",
                    objectFit: 'cover',
                  }}
                />
                <div className="p-3 text-center">
                  <h3 className="fs-6 fw-semibold mb-1 text-truncate">
                    {poster.title}
                  </h3>
                  <p className="" style={{ fontSize: "16px" }} >From ₹{poster.price}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
