import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom'; // Import Link for navigation
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { useFirebase } from '../../context/FirebaseContext';

export default function NewArrivals() {
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
        const postersQuery = query(
          collection(firestore, 'posters'),
          where('approved', '==', 'approved'),
          where('isActive', '==', true),
          orderBy('createdAt', 'desc'),
          limit(8)
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
              <Link
                to={`/poster/${poster.id}`}
                className="text-decoration-none w-100"
              >
                <div
                  className="border rounded shadow-sm w-100 bg-white overflow-hidden"
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
                  <img
                    src={poster.image}
                    alt={poster.title}
                    className="w-100"
                    style={{
                      aspectRatio: '4/5',
                      objectFit: 'cover',
                    }}
                  />
                  <div className="p-3 text-center text-dark">
                    <h3 className="fs-6 fw-semibold mb-1 text-truncate">
                      {poster.title}
                    </h3>
                    <p className="" style={{ fontSize: '16px' }}>
                      From ₹{poster.price}
                    </p>
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>

        {/* View All Button */}
        <div className="text-center mt-5">
          <Link to="/posters" className="btn btn-outline-dark btn-lg">
            View All
          </Link>
        </div>
      </div>
    </section>
  );
}