import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import posters from '../data/posters';

export default function ProductDetail({ addToCart }) {
  const { id } = useParams();
  const [poster, setPoster] = useState(null);
  const [selectedSize, setSelectedSize] = useState('Medium');

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const found = posters.find(p => p.id === Number(id));
    console.log(found);
    setPoster(found);
    setTimeout(() => setLoading(false), 500); // simulate delay
  }, [id, posters]);

  const handleSizeChange = (size) => {
    setSelectedSize(size);
  };

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

        <div className="col-md-6 d-flex flex-column justify-content-between">
          <div>
            <h3 className="">{poster.title}</h3>
            <p className="mb-4">{poster.description}</p>

            {/* Size Options */}
            <div className="mb-4">
              <h6 className="fw-semibold mb-2">Select Size</h6>
              <div className="d-flex gap-2">
                {['Small', 'Medium', 'Large'].map((size) => (
                  <button
                    key={size}
                    className={`btn btn-outline-dark ${selectedSize === size ? 'active' : ''}`}
                    onClick={() => handleSizeChange(size)}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            <h5 className="text-muted">₹{poster.price}</h5>
          </div>

          <div>
            <div className="border-top pt-4 mt-2">
              <h6 className="fw-semibold mb-2">Shipping & Returns</h6>
              <p className="text-muted small">
                All posters ship in 2–4 business days. Easy returns within 7 days of delivery.
              </p>
            </div>

            <div className="d-flex flex-column gap-2 mb-4">
              <button
                className="btn btn-dark btn-lg"
                onClick={() => addToCart({ ...poster, selectedSize })}
              >
                🛒 Add to Cart
              </button>
              <button className="btn btn-outline-dark btn-lg">Buy Now</button>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}


