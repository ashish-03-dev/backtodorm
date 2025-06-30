import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { useFirebase } from '../../context/FirebaseContext';
import { useCartContext } from '../../context/CartContext';

export default function NewArrivals() {
  const { firestore } = useFirebase();
  const { addToCart } = useCartContext();
  const [posters, setPosters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!firestore) {
      setError('Firestore is not available.');
      setLoading(false);
      return;
    }

    const fetchPosters = async () => {
      try {
        const postersQuery = query(
          collection(firestore, 'posters'),
          where('isActive', '==', true),
          orderBy('createdAt', 'desc'),
          limit(8)
        );

        const querySnapshot = await getDocs(postersQuery);
        const fetchedPosters = querySnapshot.docs.map((doc) => {
          const data = doc.data();
          const sizes = Array.isArray(data.sizes) ? data.sizes : [];
          const lowestPrice = sizes.length > 0
            ? Math.min(...sizes.map(s => s.finalPrice || s.price || 0))
            : 0;

          return {
            id: doc.id,
            title: data.title || 'Untitled',
            image: data.imageUrl || 'https://via.placeholder.com/300',
            sizes: sizes,
            price: lowestPrice,
            discount: data.discount || 0,
            seller: data.seller || 'Unknown',
          };
        });

        setPosters(fetchedPosters);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching posters:', err);
        setError('Failed to load posters: ' + err.message);
        setLoading(false);
      }
    };

    fetchPosters();
  }, [firestore]);

  const handleAddToCart = (poster) => {
    if (!poster.sizes || poster.sizes.length === 0) {
      alert('No sizes available for this poster.');
      return;
    }

    const defaultSize = poster.sizes[0].size;
    const selectedSizeObj = poster.sizes[0] || {};
    const displayPrice = selectedSizeObj.finalPrice || selectedSizeObj.price || 0;

    const cartItem = {
      posterId: poster.id,
      title: poster.title,
      size: defaultSize,
      price: displayPrice,
      image: poster.image,
      seller: poster.seller,
    };

    try {
      addToCart(cartItem);
    } catch (err) {
      console.error('Error adding to cart:', err);
      alert('Failed to add to cart.');
    }
  };

  if (loading) {
    return (
      <section className="bg-white">
        <div className="container my-5 text-center">
          <div className="spinner-border text-dark" role="status" />
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="bg-white">
        <div className="container my-5 text-center">{error}</div>
      </section>
    );
  }

  return (
    <section className="bg-white">
      <div className="container pb-4">
        <h2 className="fs-2 fw-bold mb-4 text-center">New Arrivals</h2>

        <div className="row g-4">
          {posters.map((poster) => (
            <div
              key={poster.id}
              className="col-6 col-md-4 col-lg-3 d-flex align-items-stretch"
            >
              <div
                className="border rounded shadow-sm w-100 bg-white overflow-hidden d-flex flex-column"
                style={{
                  transition: 'transform 0.2s, box-shadow 0.3s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow =
                    '0 0.75rem 1.5rem rgba(0,0,0,0.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = '';
                  e.currentTarget.style.boxShadow = '';
                }}
              >
                <Link
                  to={`/poster/${poster.id}`}
                  className="text-decoration-none text-dark flex-grow-1"
                >
                  <img
                    src={poster.image}
                    alt={poster.title}
                    className="w-100"
                    style={{
                      aspectRatio: '4/5',
                      objectFit: 'cover',
                    }}
                  />
                  <div className="p-3 text-center">
                    <h3 className="fs-6 fw-semibold mb-1 text-truncate">
                      {poster.title}
                    </h3>
                    <p className="mb-1" style={{ fontSize: '16px' }}>
                      From ₹{poster.price.toLocaleString('en-IN')}
                      {poster.discount > 0 && (
                        <span className="text-success ms-1">
                          ({poster.discount}% off)
                        </span>
                      )}
                    </p>
                  </div>
                </Link>
                <div className="px-3 pb-3 text-center">
                  <button
                    onClick={() => handleAddToCart(poster)}
                    className="btn btn-dark btn-sm rounded-pill px-4"
                    aria-label={`Add ${poster.title} to cart`}
                  >
                    Add to Cart
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-5">
          <Link to="/posters" className="btn btn-outline-dark btn-lg">
            View All
          </Link>
        </div>
      </div>
    </section>
  );
}