import React, { useState, useEffect } from "react";
import { useParams, useOutletContext } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { useFirebase } from "../../context/FirebaseContext";

export default function SingleCollection() {
  const { firestore } = useFirebase();
  const { collectionId } = useParams();
  const { addToCart } = useOutletContext(); // Get addToCart from HomeLayout
  const [collection, setCollection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const ensureString = (value) => (typeof value === "string" ? value : "");

  useEffect(() => {
    const fetchCollection = async () => {
      if (!firestore || !collectionId) {
        setError("Invalid Firestore instance or collection ID");
        setLoading(false);
        return;
      }

      try {
        const collectionRef = doc(firestore, "standaloneCollections", collectionId);
        const collectionSnap = await getDoc(collectionRef);

        if (!collectionSnap.exists()) {
          setError("Collection not found");
          setLoading(false);
          return;
        }

        const collectionData = collectionSnap.data();

        const posters = await Promise.all(
          (Array.isArray(collectionData.posters) ? collectionData.posters : []).map(async (poster) => {
            try {
              const posterId = ensureString(poster.posterId || poster).trim();
              if (!posterId) return null;

              const posterRef = doc(firestore, "posters", posterId);
              const posterSnap = await getDoc(posterRef);

              if (!posterSnap.exists()) return null;

              const posterData = posterSnap.data();
              let size = ensureString(poster.size);
              let price = Number.isFinite(poster.price) ? poster.price : 0;
              let seller = ensureString(posterData.seller);

              if (!poster.posterId && typeof poster === "string") {
                const sizes = Array.isArray(posterData.sizes) ? posterData.sizes : [];
                const defaultSize = sizes[0] || {};
                size = ensureString(defaultSize.size);
                price = Number.isFinite(defaultSize.finalPrice)
                  ? defaultSize.finalPrice
                  : Number.isFinite(defaultSize.price)
                  ? defaultSize.price
                  : 0;
              }

              return {
                id: posterId,
                posterId,
                title: ensureString(posterData.title),
                image: ensureString(posterData.imageUrl),
                selectedSize: size,
                price,
                seller,
              };
            } catch (err) {
              console.warn(`Failed to fetch poster ${poster.posterId || poster}: ${err.message}`);
              return null;
            }
          })
        );

        setCollection({
          id: collectionSnap.id,
          title: ensureString(collectionData.title),
          description: ensureString(collectionData.description),
          discount: Number.isFinite(collectionData.discount) ? collectionData.discount : 20,
          posters: posters.filter((p) => p && p.image && p.selectedSize),
        });
        setLoading(false);
      } catch (err) {
        setError(`Failed to load collection: ${err.message}`);
        setLoading(false);
      }
    };

    fetchCollection();
  }, [firestore, collectionId]);

  const handleBuyAll = () => {
    if (!collection?.posters?.length) {
      setError("No posters available to add to cart.");
      return;
    }
    addToCart(
      {
        type: "collection",
        collectionId: collection.id,
        posters: collection.posters.map((poster) => ({
          posterId: poster.posterId,
          title: poster.title,
          image: poster.image,
          size: poster.selectedSize,
          price: poster.price,
          seller: poster.seller,
        })),
        quantity: 1,
        collectionDiscount: collection.discount,
      },
      true,
      collection.id,
      collection.discount
    );
    console.log("Buy Full Pack clicked for collection:", collection.id, collection.posters);
  };

  const handleAddToCart = (poster) => {
    if (!poster) {
      setError("Invalid poster selected.");
      return;
    }
    addToCart(
      {
        type: "poster",
        posterId: poster.posterId,
        title: poster.title,
        image: poster.image,
        size: poster.selectedSize,
        price: poster.price,
        seller: poster.seller,
        quantity: 1,
      },
      false
    );
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <p className="text-danger">{error}</p>;
  if (!collection) return <p>Collection not found</p>;

  const totalPrice = collection.posters.reduce((sum, p) => sum + p.price, 0);
  const discountedPrice = Math.round(totalPrice * (1 - collection.discount / 100));

  return (
    <div className="container py-5">
      <h2 className="mb-3">{collection.title}</h2>
      <p className="mb-4 text-muted">{collection.description}</p>
      <button
        className="btn btn-dark mb-4"
        onClick={handleBuyAll}
        disabled={!collection.posters.length}
      >
        Buy Full Pack ({collection.discount}% off) – ₹{discountedPrice}
      </button>

      <div className="row">
        {collection.posters.map((poster) => (
          <div key={`${poster.id}-${poster.selectedSize}`} className="col-6 col-md-4 col-lg-3 mb-4">
            <div className="card h-100 shadow-sm border-0">
              <img
                src={poster.image}
                alt={`${poster.title} (${poster.selectedSize})`}
                className="card-img-top"
                style={{ aspectRatio: "20/23", objectFit: "cover" }}
              />
              <div className="card-body text-center">
                <h6 className="fw-semibold text-truncate mb-2">{poster.title} ({poster.selectedSize})</h6>
                <p className="text-muted fw-semibold mb-0">₹{poster.price}</p>
                <button
                  className="btn btn-sm btn-outline-dark mt-2"
                  onClick={() => handleAddToCart(poster)}
                >
                  Add to Cart
                </button>
              </div>
            </div>
          </div>
        ))}
        {!collection.posters.length && (
          <p className="text-muted">No posters available in this collection.</p>
        )}
      </div>
    </div>
  );
}