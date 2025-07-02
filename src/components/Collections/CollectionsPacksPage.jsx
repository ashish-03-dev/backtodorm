// src/pages/CollectionsPacksPage.js
import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { useFirebase } from "../../context/FirebaseContext";
import { Link } from "react-router-dom";

export default function CollectionsPacksPage() {
  const { firestore } = useFirebase();
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const ensureString = (value) => (typeof value === "string" ? value : "");

  useEffect(() => {
    const fetchCollections = async () => {
      try {
        const collectionsRef = collection(firestore, "standaloneCollections");
        const snapshot = await getDocs(collectionsRef);
        const fetched = snapshot.docs.map((doc) => ({
          id: doc.id,
          title: ensureString(doc.data().title),
          description: ensureString(doc.data().description),
          imageUrl: ensureString(doc.data().imageUrl),
          discount: Number.isFinite(doc.data().discount) ? doc.data().discount : 0,
        }));
        setCollections(fetched);
        setLoading(false);
      } catch (err) {
        setError("Failed to load collections: " + err.message);
        setLoading(false);
      }
    };

    fetchCollections();
  }, [firestore]);

  if (loading) return <div className="container py-5 text-center">Loading...</div>;
  if (error) return <div className="container py-5 text-danger text-center">{error}</div>;

  return (
    <section className="container py-5">
      <h1 className="fw-bold mb-4 text-center">All Collections</h1>
      <div className="row g-4">
        {collections.map((col) => (
          <div key={col.id} className="col-6 col-md-4 col-lg-3">
            <Link to={`/collection/${col.id}`} className="text-decoration-none text-dark">
              <div className="card h-100 border">
                <img
                  src={col.imageUrl}
                  alt={col.title}
                  className="w-100"
                  style={{
                    aspectRatio: "20/23",
                    objectFit: "cover",
                    borderTopLeftRadius: "0.5rem",
                    borderTopRightRadius: "0.5rem",
                  }}
                />
                <div className="card-body d-flex flex-column justify-content-between">
                  <div>
                    <h5 className="card-title fw-semibold mb-1">{col.title}</h5>
                    <p className="card-text text-muted small">{col.description}</p>
                  </div>
                  <div>
                    <span className="btn btn-sm btn-outline-dark rounded-pill">View Collection</span>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
