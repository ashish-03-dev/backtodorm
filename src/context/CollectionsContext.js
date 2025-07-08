import React, { createContext, useState, useEffect, useContext } from 'react';
import { collection, query, limit, getDocs } from 'firebase/firestore';
import { useFirebase } from './FirebaseContext';

const CollectionsContext = createContext();

export const useCollectionsContext = () => useContext(CollectionsContext);

export const CollectionsProvider = ({ children }) => {
    const { firestore } = useFirebase();
    const [collections, setCollections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const ensureString = (value) => (typeof value === 'string' ? value : '');

    useEffect(() => {
        if (!firestore) {
            setError('Invalid Firestore instance');
            setLoading(false);
            return;
        }

        // Only fetch if collections array is empty
        if (collections.length === 0) {
            const fetchCollections = async () => {
                try {
                    const collectionsRef = collection(firestore, 'standaloneCollections');
                    const q = query(collectionsRef, limit(8));
                    const snapshot = await getDocs(q);

                    const fetchedCollections = snapshot.docs.map((doc) => ({
                        id: doc.id,
                        title: ensureString(doc.data().title),
                        description: ensureString(doc.data().description),
                        imageUrl: ensureString(doc.data().imageUrl),
                        discount: Number.isFinite(doc.data().discount) ? doc.data().discount : 0,
                        posters: Array.isArray(doc.data`()`.posters) ? doc.data().posters : [],
                    }));

                    setCollections(fetchedCollections);
                    setLoading(false);
                } catch (err) {
                    console.error('Error fetching collections:', err);
                    setError('Failed to load collections: ' + err.message);
                    setLoading(false);
                }
            };

            fetchCollections();
        } else {
            setLoading(false); // Data already cached, no need to fetch
        }
    }, [firestore, collections.length]);

    return (
        <CollectionsContext.Provider value={{ collections, loading, error }}>
            {children}
        </CollectionsContext.Provider>
    );
};