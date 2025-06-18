import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from "firebase/firestore";
import { useFirebase } from '../../context/FirebaseContext';
import { useOutletContext } from 'react-router-dom';

export default function ProductDetail() {
  const { id } = useParams();
  const { firestore } = useFirebase();
  const { addToCart, buyNow } = useOutletContext();
  const navigate = useNavigate();
  const [poster, setPoster] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!firestore) {
      setError("Firestore is not available.");
      setLoading(false);
      return;
    }

    const fetchPoster = async () => {
      try {
        const posterRef = doc(firestore, "posters", id);
        const posterSnap = await getDoc(posterRef);

        if (!posterSnap.exists()) {
          setError("Poster not found.");
          setLoading(false);
          return;
        }

        const posterData = posterSnap.data();
        if (posterData.approved !== "approved" || !posterData.isActive) {
          setError("Poster is not available.");
          setLoading(false);
          return;
        }

        const sizes = Array.isArray(posterData.sizes) ? posterData.sizes : [];
        const defaultSize = sizes.length > 0 ? sizes[0].size : null;

        setPoster({
          id: posterSnap.id,
          title: posterData.title || "Untitled",
          image: posterData.imageUrl || "",
          description: posterData.description || "No description available.",
          discount: posterData.discount || 0,
          sizes: sizes,
          seller: posterData.seller || null,
        });
        setSelectedSize(defaultSize);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching poster:", err);
        setError("Failed to load poster: " + err.message);
        setLoading(false);
      }
    };

    fetchPoster();
  }, [id, firestore]);

  const handleSizeChange = (size) => {
    setSelectedSize(size);
  };

  const selectedSizeObj = poster?.sizes.find(s => s.size === selectedSize) || {};
  const displayPrice = selectedSizeObj.finalPrice || selectedSizeObj.price || 0;
  const originalPrice = selectedSizeObj.price || 0;
  const isDiscounted = poster?.discount > 0 && selectedSizeObj.finalPrice < selectedSizeObj.price;

  const handleBuyNow = () => {
    const item = { posterId: poster.id, title: poster.title, selectedSize, price: displayPrice, seller: poster.seller };
    buyNow(item);
    navigate('/checkout');
  };

  if (loading) {
    return (
      <div className="container my-5 text-center">
        <div className="spinner-border text-dark" role="status" />
      </div>
    );
  }

  if (error || !poster) {
    return <div className="text-center mt-5">{error || "Poster not found."}</div>;
  }

  return (
    <div className="container my-5">
      <div className="row g-5">
        <div className="col-md-6">
          <img src={poster.image} className="img-fluid rounded shadow-sm" alt={poster.title} />
        </div>

        <div className="col-md-6 d-flex flex-column justify-content-between">
          <div>
            <h3>{poster.title}</h3>
            <p className="mb-4">{poster.description}</p>

            <div className="mb-4">
              <h6 className="fw-semibold mb-2">Select Size</h6>
              <div className="d-flex gap-2">
                {poster.sizes.map(({ size }) => (
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

            <div className="mb-4">
              {isDiscounted ? (
                <div>
                  <h5 className="text-muted text-decoration-line-through">₹{originalPrice}</h5>
                  <h5 className="text-success">₹{displayPrice} ({poster.discount}% off)</h5>
                </div>
              ) : (
                <h5 className="text-muted">₹{displayPrice}</h5>
              )}
            </div>
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
                onClick={() => addToCart({ posterId: poster.id, title: poster.title, selectedSize, price: displayPrice, seller: poster.seller })}
              >
                🛒 Add to Cart
              </button>
              <button className="btn btn-outline-dark btn-lg" onClick={handleBuyNow}>
                Buy Now
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}