import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import posters from '../data/posters'; // adjust path

export default function PosterDetail({ addToCart }) {
    const { id } = useParams();
    const [poster, setPoster] = useState(null);
    const [selectedSize, setSelectedSize] = useState('Medium');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const found = posters.find(p => String(p.id) === id);
        setPoster(found);
        setTimeout(() => setLoading(false), 300);
    }, [id]);

    const handleSizeChange = (size) => {
        setSelectedSize(size);
    };

    if (loading || !poster) return <div className="container py-5 text-center">Loading...</div>;

    return (
        <div className="container py-5">
            <div className="row g-5">
                {/* Image Section */}
                <div className="col-md-6">
                    <img
                        src={poster.img}
                        alt={poster.title}
                        className="img-fluid rounded shadow-sm w-100"
                    />
                </div>

                {/* Details Section */}
                <div className="col-md-6 d-flex flex-column justify-content-between" style={{ minHeight: '600px' }}>
                    <div>
                        <h1 className="fw-bold mb-2">{poster.title}</h1>
                        <p className="text-muted">{poster.description}</p>
                        <h4 className="mb-4">{poster.price}</h4>

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
                    </div>

                    {/* Action Buttons + Shipping info at bottom */}
                    <div>
                        <div className="d-flex flex-column gap-2 mb-4">
                            <button
                                className="btn btn-dark btn-lg"
                                onClick={() => addToCart({ ...poster, selectedSize })}
                            >
                                🛒 Add to Cart
                            </button>
                            <button className="btn btn-outline-dark btn-lg">Buy Now</button>
                        </div>

                        <div className="border-top pt-4 mt-4">
                            <h6 className="fw-semibold mb-2">Shipping & Returns</h6>
                            <p className="text-muted small">
                                All posters ship in 2–4 business days. Easy returns within 7 days of delivery.
                            </p>
                        </div>
                    </div>
                </div>

            </div>

            {/* You May Also Like */}
            <div className="mt-5 pt-5 border-top">
                <h4 className="fw-bold mb-4">You May Also Like</h4>
                <div className="row">
                    {posters
                        .filter((p) => String(p.id) !== id)
                        .slice(0, 3)
                        .map((p) => (
                            <div className="col-md-4 mb-4" key={p.id}>
                                <div className="card h-100 shadow-sm border-0">
                                    <img src={p.img} className="card-img-top" alt={p.title} />
                                    <div className="card-body">
                                        <h5 className="card-title">{p.title}</h5>
                                        <p className="card-text text-muted">{p.price}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                </div>
            </div>
        </div>
    );
}
