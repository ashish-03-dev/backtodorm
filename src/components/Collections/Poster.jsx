import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc } from "firebase/firestore";
import { useFirebase } from '../../context/FirebaseContext';
import { useCartContext } from '../../context/CartContext';

export default function ProductDetail() {
  const { id } = useParams();
  const { firestore } = useFirebase();
  const { addToCart, buyNow, deliveryCharge, freeDeliveryThreshold } = useCartContext();
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
          image: posterData.imageUrl || "https://via.placeholder.com/300",
          description: posterData.description || "No description available.",
          discount: posterData.discount || 0,
          sizes: sizes.map(size => ({
            size: size.size,
            price: size.price || 0,
            finalPrice: size.finalPrice || size.price || 0,
            discount: size.discount || posterData.discount || 0,
          })),
          seller: posterData.seller || "Unknown",
        });
        setSelectedSize(defaultSize);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching poster:", err);
        setError(`Failed to load poster: ${err.message}`);
        setLoading(false);
      }
    };

    fetchPoster();
  }, [id, firestore]);

  const handleSizeChange = (size) => {
    setSelectedSize(size);
  };

  const handleAddToCart = () => {
    if (!selectedSize) {
      alert("Please select a size.");
      return;
    }

    const selectedSizeObj = poster.sizes.find(s => s.size === selectedSize) || {};
    const cartItem = {
      posterId: poster.id,
      title: poster.title,
      size: selectedSize,
      price: selectedSizeObj.price || 0,
      finalPrice: selectedSizeObj.finalPrice || selectedSizeObj.price || 0,
      discount: selectedSizeObj.discount || poster.discount || 0,
      seller: poster.seller,
      image: poster.image,
    };

    try {
      addToCart(cartItem);
    } catch (err) {
      console.error("Error adding to cart:", err);
      alert("Failed to add item to cart.");
    }
  };

  const handleBuyNow = () => {
    if (!selectedSize) {
      alert("Please select a size.");
      return;
    }

    const selectedSizeObj = poster.sizes.find(s => s.size === selectedSize) || {};
    const item = {
      posterId: poster.id,
      title: poster.title,
      size: selectedSize,
      price: selectedSizeObj.price || 0,
      finalPrice: selectedSizeObj.finalPrice || selectedSizeObj.price || 0,
      discount: selectedSizeObj.discount || poster.discount || 0,
      seller: poster.seller,
      image: poster.image,
    };

    try {
      buyNow(item);
      navigate('/checkout');
    } catch (err) {
      console.error("Error processing buy now:", err);
      alert("Failed to proceed to checkout.");
    }
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

  const selectedSizeObj = poster.sizes.find(s => s.size === selectedSize) || {};
  const displayPrice = selectedSizeObj.finalPrice || selectedSizeObj.price || 0;
  const originalPrice = selectedSizeObj.price || 0;
  const isDiscounted = selectedSizeObj.discount > 0 && selectedSizeObj.finalPrice < selectedSizeObj.price;

  return (
    <div className="container" style={{ height: "calc(100svh - 65px)" }}>
      <div className="row">
        <div
          className="col-md-6 py-4 overflow-auto"
          style={{ height: 'calc(100svh - 65px)', paddingRight: '1rem' }}
        >
          <img
            src={poster.image}
            alt={poster.title}
            style={{
              width: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
            }}
            className="rounded"
          />
        </div>

        <div className="col-md-6 px-4 pt-5 pb-4 d-flex flex-column justify-content-between">
          <div>
            <h3>{poster.title}</h3>
            <p className="mb-4">{poster.description}</p>

            <div className="mb-4">
              {isDiscounted ? (
                <div className="d-flex align-items-center">
                  <span className="text-danger fw-semibold me-2">
                    ↓ {selectedSizeObj.discount}% OFF
                  </span>
                  <h5 className="text-muted text-decoration-line-through mb-0 me-2">
                    ₹{originalPrice.toLocaleString('en-IN')}
                  </h5>
                  <h5 className="text-success fw-semibold mb-0">
                    ₹{displayPrice.toLocaleString('en-IN')}
                  </h5>
                </div>
              ) : (
                <h5 className="text-muted fw-semibold mb-0">
                  ₹{displayPrice.toLocaleString('en-IN')}
                </h5>
              )}
            </div>
            <div className="mb-4">
              <h6 className="fw-semibold mb-2">Select Size</h6>
              <div className="d-flex gap-2">
                {poster.sizes.map(({ size }) => (
                  <button
                    key={size}
                    className={`btn border  ${selectedSize === size ? 'border-primary text-primary' : ''}`}
                    onClick={() => handleSizeChange(size)}
                    aria-label={`Select size ${size}`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

          </div>

          <div>
            <div className="border-top pt-4 mt-2">
              <h6 className="fw-semibold mb-3">Shipping & Returns</h6>
              <div className="d-flex flex-column gap-2">
                <div className="d-flex align-items-center">
                  <i className="bi bi-truck me-2 text-primary" style={{ fontSize: '1.2rem' }}></i>
                  <p className="mb-0 text-dark">
                    <strong>Delivery Charge:</strong> {deliveryCharge === 0 ? 'Free' : `₹${deliveryCharge.toLocaleString('en-IN')}`}
                  </p>
                </div>
                <div className="d-flex align-items-center">
                  <i className="bi bi-wallet2 me-2 text-success" style={{ fontSize: '1.2rem' }}></i>
                  <p className="mb-0 text-dark">
                    <strong>Free Delivery:</strong> On orders above ₹{freeDeliveryThreshold.toLocaleString('en-IN')}
                  </p>
                </div>
                <div className="d-flex align-items-center">
                  <i className="bi bi-box-arrow-left me-2 text-muted" style={{ fontSize: '1.2rem' }}></i>
                  <p className="mb-0 text-muted small">
                    Ships in 2–4 days. 7-day return for damaged posters.{' '} View {' '}
                    <Link to="/return-policy" className="text-primary text-decoration-underline">
                      Return Policy
                    </Link>
                  </p>
                </div>
              </div>
            </div>

            <div className="d-flex flex-column gap-2 mb-4 mt-4">
              <button
                className="btn btn-dark btn-lg"
                onClick={handleAddToCart}
                aria-label="Add to cart"
              >
                🛒 Add to Cart
              </button>
              <button
                className="btn btn-outline-dark btn-lg"
                onClick={handleBuyNow}
                aria-label="Buy now"
              >
                Buy Now
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}