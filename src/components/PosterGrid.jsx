import React from 'react';
import PosterCard from './PosterCard';

const dummyPosters = [
  { id: 1, title: 'Midnight Vibes', price: '₹299', img: '/posters/poster1.jpg' },
  { id: 2, title: 'Zen Flow', price: '₹349', img: '/posters/poster2.jpg' },
  { id: 3, title: 'Sunset Pulse', price: '₹399', img: '/posters/poster3.jpg' },
];

export default function PosterGrid() {
  return (
    <section className="py-5 bg-light">
      <div className="container">
        <h2 className="text-center mb-4">Featured Posters</h2>
        <div className="row">
          {dummyPosters.map(poster => (
            <div className="col-md-4 mb-4" key={poster.id}>
              <PosterCard poster={poster} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
