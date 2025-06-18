import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useFirebase } from '../../context/FirebaseContext';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

export default function CollectionDetail({ addToCart }) {
  const { firestore } = useFirebase();
  const { collectionId } = useParams();
  const [posters, setPosters] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [collectionName, setCollectionName] = useState(null);

  useEffect(() => {
    const fetchCollectionAndPosters = async () => {
      if (!firestore) {
        console.error('Firestore instance is not available');
        setError('Failed to connect to database.');
        setIsLoading(false);
        return;
      }

      try {
        // Fetch collection document to get the name (label)
        const collectionRef = doc(firestore, 'collections', collectionId);
        const collectionDoc = await getDoc(collectionRef);
        let collectionLabel = collectionId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()); // Fallback: Convert ID to title case

        if (collectionDoc.exists()) {
          collectionLabel = collectionDoc.data().name || collectionLabel;
          console.log('Collection found:', { id: collectionId, name: collectionLabel });
        } else {
          console.warn('Collection not found in collections:', collectionId);
        }

        setCollectionName(collectionLabel);

        // Query posters where collections array contains the collection label
        const postersRef = collection(firestore, 'posters');
        const q = query(postersRef, where('collections', 'array-contains', collectionLabel));
        const querySnapshot = await getDocs(q);

        console.log('Query snapshot size:', querySnapshot.size); // Debug log

        const fetchedPosters = querySnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            title: data.title || 'Untitled Poster',
            img: data.imageUrl || '/placeholder-image.jpg',
            price: data.sizes?.[0]?.price || 0,
            discount: data.discount || 0,
            finalPrice: data.sizes?.[0]?.finalPrice || data.sizes?.[0]?.price || 0,
          };
        });

        console.log('Fetched posters:', fetchedPosters);
        setPosters(fetchedPosters);
      } catch (err) {
        console.error('Failed to fetch posters:', err);
        setError('Failed to load posters. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCollectionAndPosters();
  }, [firestore, collectionId]);

  if (isLoading) {
    return (
      <div className="container py-5">
        <h2 className="mb-4 text-capitalize">{collectionName || collectionId?.replace('-', ' ') || 'Collection'}</h2>
        <p>Loading posters...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-5">
        <h2 className="mb-4 text-capitalize">{collectionName || collectionId?.replace('-', ' ') || 'Collection'}</h2>
        <p className="text-danger">{error}</p>
      </div>
    );
  }

  return (
    <div className="container py-5">
      <h2 className="mb-4 text-capitalize">{collectionName || collectionId?.replace('-', ' ') || 'Collection'}</h2>
      <div className="row">
        {posters.length === 0 ? (
          <p>No posters found.</p>
        ) : (
          posters.map((poster) => (
            <div key={poster.id} className="col-6 col-md-4 col-lg-3 mb-4">
              <div className="card h-100 shadow-sm border-0">
                <img
                  src={poster.img}
                  alt={poster.title}
                  className="card-img-top"
                  style={{ aspectRatio: '20/23', objectFit: 'cover' }}
                />
                <div className="card-body text-center">
                  <h6 className="fw-semibold text-truncate mb-2">{poster.title}</h6>
                  <p className="text-muted fw-semibold mb-0">₹{poster.finalPrice || poster.price}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}