import React, { useEffect, useState } from 'react';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { useFirebase } from '../../context/FirebaseContext';

export default function YouMayAlsoLike({ addToCart }) {
  const { firestore } = useFirebase();
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
        // Query to fetch approved, active posters, ordered by a 'popularity' field or recent creation
        // You can replace 'popularity' with any relevant field in your Firestore (e.g., 'views', 'sales')
        // Fallback to 'createdAt' if no personalization data is available
        const postersQuery = query(
          collection(firestore, 'posters'),
          where('approved', '==', 'approved'),
          where('isActive', '==', true),
          orderBy('createdAt', 'desc'),
          // orderBy('popularity', 'desc'), // Adjust this field based on your data model
          limit(6) // Limit to 6 posters for the carousel
        );

        const querySnapshot = await getDocs(postersQuery);
        const fetchedPosters = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          title: doc.data().title || 'Untitled',
          image: doc.data().imageUrl || '',
          price: doc.data().finalPrice || 0,
        }));

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

  if (loading) {
    return (
      <section className="py-5 bg-light">
        <div className="container text-center">
          <div className="spinner-border text-dark" role="status" />
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="py-5 bg-light">
        <div className="container text-center">{error}</div>
      </section>
    );
  }

  return (
    <section className="py-5 bg-light">
      <div className="container">
        <h2 className="text-center fw-bold fs-2 mb-4">You May Also Like</h2>
        <div className="d-flex overflow-auto gap-3 pb-2" style={{ scrollSnapType: 'x mandatory' }}>
          {posters.map((poster) => (
            <div
              key={poster.id}
              className="flex-shrink-0"
              style={{
                width: '80%', // Mobile default
                maxWidth: '18rem', // Limit card size on large screens
                scrollSnapAlign: 'start',
              }}
            >
              <div
                className="border rounded shadow-sm w-100 bg-white overflow-hidden"
                style={{
                  transition: 'transform 0.2s, box-shadow 0.3s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 0.75rem 1.5rem rgba(0,0,0,0.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = '';
                  e.currentTarget.style.boxShadow = '';
                }}
              >
                <img
                  src={poster.image}
                  alt={poster.title}
                  style={{
                    width: '100%',
                    aspectRatio: '4/5',
                    objectFit: 'cover',
                    display: 'block',
                    borderRadius: '0.5rem 0.5rem 0 0',
                  }}
                />
                <div className="p-3 text-center">
                  <h3 className="fs-6 fw-semibold mb-1 text-truncate">{poster.title}</h3>
                  <p style={{ fontSize: '16px' }}>From ₹{poster.price}</p>
                  <button
                    onClick={() => addToCart(poster)}
                    className="btn btn-dark btn-sm rounded-pill px-4"
                  >
                    Add to Cart
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}