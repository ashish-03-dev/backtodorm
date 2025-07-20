import React from 'react';
import { Link } from 'react-router-dom';

export default function HeroBanner() {
  return (
    <div className="position-relative text-center text-white py-5 mb-md-3">
      <div className="position-absolute top-0 start-0 w-100 h-100">
        <img
          src="https://res.cloudinary.com/dqu3mzqfj/image/upload/v1753045882/Untitled_design_iyrxvr.webp"
          alt="Background"
          className="d-none d-md-block w-100 h-100 object-fit-cover"
        />
        <img
          src="https://res.cloudinary.com/dqu3mzqfj/image/upload/v1753045932/starts_60_1_qv3qaw.webp"
          alt="Background"
          className="d-block d-md-none w-100 h-100 object-fit-cover"
        />
        <div className="position-absolute top-0 start-0 w-100 h-100 bg-dark opacity-75"></div>
      </div>

      <div className="position-relative container py-5">
        <h1 className="display-5 fw-bold">Give Your Room a Cool Vibe</h1>
        <p className="lead">
          Premium 300 DPI prints—feel the crisp detail and vibrant colors.
        </p>
        <Link to="/all-posters" className="btn btn-light btn-lg mt-3">
          Browse All Posters
        </Link>
      </div>
    </div>
  );
}
