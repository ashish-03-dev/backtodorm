import React from 'react';

const categories = ['Minimal', 'Quotes', 'Anime', 'Nature', 'Pop', 'Aesthetic'];

export default function CategoryGrid() {
  return (
    <section className="py-5">
      <div className="container text-center">
        <h2 className="mb-4">Shop by Category</h2>
        <div className="row">
          {categories.map((cat, i) => (
            <div className="col-6 col-md-4 col-lg-2 mb-3" key={i}>
              <div className="border rounded p-3 h-100 d-flex align-items-center justify-content-center bg-white shadow-sm">
                {cat}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
