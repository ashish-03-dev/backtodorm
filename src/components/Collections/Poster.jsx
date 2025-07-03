import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc } from "firebase/firestore";
import { useFirebase } from '../../context/FirebaseContext';
import { useCartContext } from '../../context/CartContext';
import { BsTruck, BsWallet2, BsBoxArrowLeft } from 'react-icons/bs';

export default function ProductDetail() {
  const { id } = useParams();
  const { firestore } = useFirebase();
  const { addToCart, buyNow, deliveryCharge, freeDeliveryThreshold } = useCartContext();
  const navigate = useNavigate();
  const [poster, setPoster] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedFinish, setSelectedFinish] = useState("Gloss");

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
          setError("This poster is not available for purchase.");
          setLoading(false);
          return;
        }

        const sizes = Array.isArray(posterData.sizes) ? posterData.sizes : [];
        if (sizes.length === 0) {
          setError("No sizes available for this poster.");
          setLoading(false);
          return;
        }

        const defaultSize = sizes[0].size || null;

        setPoster({
          id: posterSnap.id,
          title: posterData.title || "Untitled",
          image: posterData.imageUrl || "https://via.placeholder.com/300",
          description: posterData.description || "No description available.",
          discount: posterData.discount || 0,
          sizes: sizes.map(size => ({
            size: size.size || "N/A",
            price: Number.isFinite(size.price) ? size.price : 0,
            finalPrice: Number.isFinite(size.finalPrice) ? size.finalPrice : size.price || 0,
            discount: Number.isFinite(size.discount) ? size.discount : posterData.discount || 0,
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
      setError("Please select a size.");
      return;
    }
    if (!selectedFinish) {
      setError("Please select a finish.");
      return;
    }

    const selectedSizeObj = poster.sizes.find(s => s.size === selectedSize) || {};
    if (!selectedSizeObj.size || selectedSizeObj.price === null || selectedSizeObj.finalPrice === null) {
      setError("Invalid size or pricing information.");
      return;
    }

    const cartItem = {
      posterId: poster.id,
      title: poster.title,
      size: selectedSize,
      finish: selectedFinish,
      price: selectedSizeObj.price || 0,
      finalPrice: selectedSizeObj.finalPrice || selectedSizeObj.price || 0,
      discount: selectedSizeObj.discount || poster.discount || 0,
      seller: poster.seller,
      image: poster.image,
    };

    console.log("Adding to cart:", {
      posterId: cartItem.posterId,
      title: cartItem.title,
      size: cartItem.size,
      finish: cartItem.finish,
      price: cartItem.price,
      finalPrice: cartItem.finalPrice,
      discount: cartItem.discount,
    });

    try {
      addToCart(cartItem);
      setError(null);
    } catch (err) {
      console.error("Error adding to cart:", err);
      setError("Failed to add item to cart. Please try again.");
    }
  };

  const handleBuyNow = () => {
    if (!selectedSize) {
      setError("Please select a size.");
      return;
    }
    if (!selectedFinish) {
      setError("Please select a finish.");
      return;
    }

    const selectedSizeObj = poster.sizes.find(s => s.size === selectedSize) || {};
    if (!selectedSizeObj.size || selectedSizeObj.price === null || selectedSizeObj.finalPrice === null) {
      setError("Invalid size or pricing information.");
      return;
    }

    const item = {
      posterId: poster.id,
      title: poster.title,
      size: selectedSize,
      finish: selectedFinish,
      price: selectedSizeObj.price || 0,
      finalPrice: selectedSizeObj.finalPrice || selectedSizeObj.price || 0,
      discount: selectedSizeObj.discount || poster.discount || 0,
      seller: poster.seller,
      image: poster.image,
    };

    console.log("Proceeding to buy now:", {
      posterId: item.posterId,
      title: item.title,
      size: item.size,
      finish: item.finish,
      price: item.price,
      finalPrice: item.finalPrice,
      discount: item.discount,
    });

    try {
      buyNow(item);
      navigate('/checkout');
      setError(null);
    } catch (err) {
      console.error("Error processing buy now:", err);
      setError("Failed to proceed to checkout. Please try again.");
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
          style={{ maxHeight: 'calc(100svh - 65px)', paddingRight: '1rem' }}
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

        <div className="col-md-6 p-4 pt-0 pt-md-5 d-flex flex-column justify-content-between">
          <div>
            {error && (
              <div className="alert alert-danger alert-dismissible fade show" role="alert">
                {error}
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setError(null)}
                  aria-label="Close"
                ></button>
              </div>
            )}
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
                    className={`btn border ${selectedSize === size ? 'border-primary text-primary' : ''}`}
                    onClick={() => handleSizeChange(size)}
                    aria-label={`Select size ${size}`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
            <div className="mb-4 mb-lg-3">
              <h6 className="fw-semibold mb-2">Select Finish</h6>
              <div className="d-flex gap-2">
                {['Gloss', 'Matte'].map((finish) => (
                  <button
                    key={finish}
                    className={`btn border ${selectedFinish === finish ? 'border-primary text-primary' : ''}`}
                    onClick={() => setSelectedFinish(finish)}
                    aria-label={`Select finish ${finish}`}
                  >
                    {finish}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <div className="border-top pt-3 mt-4">
              <h6 className="fw-semibold mb-3">Shipping & Returns</h6>
              <div className="d-flex flex-column gap-2">
                <div className="d-flex align-items-center">
                  <BsTruck className="me-2 text-primary" style={{ fontSize: '1.2rem' }} />
                  <p className="mb-0 text-dark">
                    <strong>Delivery Charge:</strong> {deliveryCharge === 0 ? 'Free' : `₹${deliveryCharge.toLocaleString('en-IN')}`}
                  </p>
                </div>
                <div className="d-flex align-items-center">
                  <BsWallet2 className="me-2 text-success" style={{ fontSize: '1.2rem' }} />
                  <p className="mb-0 text-dark">
                    <strong>Free Delivery:</strong> On orders above ₹{freeDeliveryThreshold.toLocaleString('en-IN')}
                  </p>
                </div>
                <div className="d-flex align-items-center">
                  <BsBoxArrowLeft className="me-2 text-muted" style={{ fontSize: '1.2rem' }} />
                  <p className="mb-0 text-muted small">
                    Ships in 2–4 days. 7-day return for damaged posters.{' '}
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
                disabled={!selectedSize || !selectedFinish}
              >
                🛒 Add to Cart
              </button>
              <button
                className="btn btn-outline-dark btn-lg"
                onClick={handleBuyNow}
                aria-label="Buy now"
                disabled={!selectedSize || !selectedFinish}
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