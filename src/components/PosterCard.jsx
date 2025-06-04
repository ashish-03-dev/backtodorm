import React from 'react';

export default function PosterCard({ poster }) {
  return (
    <div className="card h-100 shadow-sm">
      <img src={poster.img} className="card-img-top" alt={poster.title} />
      <div className="card-body d-flex flex-column">
        <h5 className="card-title">{poster.title}</h5>
        <p className="card-text text-muted">{poster.price}</p>
        <a href="#" className="btn btn-dark mt-auto">View Details</a>
      </div>
    </div>
  );
}
