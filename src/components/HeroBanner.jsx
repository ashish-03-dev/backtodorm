import React from 'react';
import { Link } from 'react-router-dom';

export default function HeroBanner() {
  return (
    <div className="bg-light text-center py-4 py-md-5">
      <div className="container">
        <h1 className="display-4 fw-semibold">Transform Your Dorm with Art That Speaks</h1>
        <p className="lead text-muted">Curated posters for every vibe. Elevate your space today.</p>
        <Link to="/categories" className="btn btn-dark btn-lg mt-3">
          Shop Now
        </Link>
      </div>
    </div>
  );
}
