import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

export default function PosterDetail({ posters, addToCart }) {
  const { id } = useParams();
  const [poster, setPoster] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const found = posters.find(p => p.id === Number(id));
    console.log(found);
    setPoster(found);
    setTimeout(() => setLoading(false), 500); // simulate delay
  }, [id, posters]);

  if (loading) {
    return (
      <div className="container my-5 text-center">
        <div className="spinner-border text-dark" role="status" />
      </div>
    );
  }

  if (!poster) {
    return <div className="text-center mt-5">Poster not found.</div>;
  }

  return (
    <div className="container my-5">
      <div className="row g-5">
        <div className="col-md-6">
          <img src={poster.img} className="img-fluid rounded shadow-sm" alt={poster.title} />
        </div>
        <div className="col-md-6">
          <h2 className="fw-bold mb-3">{poster.title}</h2>
          <h4 className="text-muted mb-4">₹{poster.price}</h4>
          <p className="mb-4">{poster.description}</p>

          {/* Optional: Size selector */}
         <select className="form-select mb-3">
            <option>Select Size</option>
            <option>A3</option>
            <option>A2</option>
          </select>


          <button onClick={() => addToCart(poster)} className="btn btn-dark px-4">
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
}


