// src/context/PostersContext.js
import React, { createContext, useState, useEffect,useContext } from 'react';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { useFirebase } from './FirebaseContext'; // Assuming this is your Firebase context

const PostersContext = createContext();

export const useNewArrivals = () => useContext(PostersContext);

export const NewArrivalsProvider = ({ children }) => {
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

    // Only fetch if posters array is empty
    if (posters.length === 0) {
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
    } else {
      setLoading(false); // Data already cached, no need to fetch
    }
  }, [firestore, posters.length]);

  return (
    <PostersContext.Provider value={{ posters, loading, error }}>
      {children}
    </PostersContext.Provider>
  );
};