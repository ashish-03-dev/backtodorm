import React from 'react';
import { Link } from 'react-router-dom';

export default function HeroBanner() {
  return (
    <div className="position-relative text-center text-white py-5">
      <div className="position-absolute top-0 start-0 w-100 h-100">
        <img
          src="https://res.cloudinary.com/dqu3mzqfj/image/upload/v1753045882/Untitled_design_iyrxvr.webp" // Replace with your desktop background image
          alt="Background"
          className="d-none d-md-block w-100 h-100 object-fit-cover"
        />
        <img
          src="https://res.cloudinary.com/dqu3mzqfj/image/upload/v1753045932/starts_60_1_qv3qaw.webp" // Replace with your mobile background image
          alt="Background"
          className="d-block d-md-none w-100 h-100 object-fit-cover"
        />
        {/* Dark overlay */}
        <div className="position-absolute top-0 start-0 w-100 h-100 bg-dark opacity-75"></div>
      </div>

      {/* Content */}
      <div className="position-relative container py-5">
        <h1 className="display-5 fw-bold">Give Your Room a Cool Vibe</h1>
        <p className="lead">
          Awesome, high-quality 300 DPI posters made to match your style.
        </p>
        <Link to="/all-posters" className="btn btn-light btn-lg mt-3">
          Browse All Posters
        </Link>
      </div>
    </div>
  );
}
