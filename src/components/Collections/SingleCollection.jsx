import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { useFirebase } from "../../context/FirebaseContext";
import { useCartContext } from "../../context/CartContext";

export default function SingleCollection() {
  const { firestore } = useFirebase();
  const { collectionId } = useParams();
  const { addToCart } = useCartContext();
  const navigate = useNavigate();
  const [collection, setCollection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedFinish, setSelectedFinish] = useState("Gloss");
  const [addedToCart, setAddedToCart] = useState(false);
  const [previewPoster, setPreviewPoster] = useState(null); // { poster, index }
  const [touchStartX, setTouchStartX] = useState(null);

  const ensureString = (value) => (typeof value === "string" ? value : "");
  const ensureNumber = (value) => (Number.isFinite(value) && value >= 0 ? value : null);

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

        if (!Array.isArray(collectionData.posters) || collectionData.posters.length === 0) {
          console.warn(`No posters found in collection ${collectionId}`);
          setCollection({
            id: collectionSnap.id,
            title: ensureString(collectionData.title),
            description: ensureString(collectionData.description),
            collectionDiscount: ensureNumber(collectionData.discount) || 0,
            posters: [],
          });
          setLoading(false);
          return;
        }

        const posters = await Promise.all(
          collectionData.posters.map(async (poster) => {
            try {
              const posterId = ensureString(poster.posterId || poster).trim();
              if (!posterId) {
                console.warn(`Invalid posterId in collection ${collectionId}:`, poster);
                return { error: "Missing or invalid posterId" };
              }

              const posterRef = doc(firestore, "posters", posterId);
              const posterSnap = await getDoc(posterRef);

              if (!posterSnap.exists()) {
                console.warn(`Poster not found: ${posterId}`);
                return { error: `Poster ${posterId} not found in Firestore` };
              }

              const posterData = posterSnap.data();

              let size = ensureString(poster.size);
              let price = ensureNumber(poster.price);
              let finalPrice = ensureNumber(poster.finalPrice);
              let discount = ensureNumber(posterData.discount);
              let seller = ensureString(posterData.seller);

              if (!poster.posterId && typeof poster === "string") {
                const sizes = Array.isArray(posterData.sizes) ? posterData.sizes : [];
                if (sizes.length === 0) {
                  console.warn(`No sizes found for poster ${posterId}`);
                  return { error: `No sizes available for poster ${posterId}` };
                }
                const defaultSize = sizes[0];
                size = ensureString(defaultSize.size);
                price = ensureNumber(defaultSize.price);
                finalPrice = ensureNumber(defaultSize.finalPrice);
              } else {
                const sizes = Array.isArray(posterData.sizes) ? posterData.sizes : [];
                const selectedSizeData = sizes.find((s) => s.size === size);
                if (!selectedSizeData) {
                  console.warn(`Invalid size ${size} for poster ${posterId}`);
                  return { error: `Invalid size ${size} for poster ${posterId}` };
                }
                price = ensureNumber(selectedSizeData.price);
                finalPrice = ensureNumber(selectedSizeData.finalPrice);
              }

              const validationErrors = [];
              if (!posterData.imageUrl) validationErrors.push("Missing imageUrl");
              if (!size) validationErrors.push("Missing size");
              if (!posterData.title) validationErrors.push("Missing title");
              if (price === null) validationErrors.push("Invalid or missing price");
              if (finalPrice === null) validationErrors.push("Invalid or missing finalPrice");
              if (discount === null) validationErrors.push("Invalid or missing discount");

              if (validationErrors.length > 0) {
                console.warn(`Poster ${posterId} failed validation:`, validationErrors);
                return { error: `Validation failed: ${validationErrors.join(", ")}` };
              }

              return {
                id: posterId,
                posterId,
                title: ensureString(posterData.title),
                image: ensureString(posterData.imageUrl),
                selectedSize: size,
                price,
                finalPrice,
                discount,
                seller,
                error: null,
              };
            } catch (err) {
              console.warn(`Failed to fetch poster ${poster.posterId || poster}: ${err.message}`);
              return { error: `Failed to fetch: ${err.message}` };
            }
          })
        );

        const validPosters = posters.filter((p) => !p.error);
        const invalidPosters = posters.filter((p) => p.error);

        if (validPosters.length === 0 && invalidPosters.length > 0) {
          setError("No valid posters available in this collection. Check console for details.");
        }

        setCollection({
          id: collectionSnap.id,
          title: ensureString(collectionData.title),
          description: ensureString(collectionData.description),
          collectionDiscount: ensureNumber(collectionData.discount) || 0,
          posters: validPosters,
        });
        setLoading(false);
      } catch (err) {
        console.error("Failed to load collection:", err);
        setError(`Failed to load collection: ${err.message}`);
        setLoading(false);
      }
    };

    fetchCollection();
  }, [firestore, collectionId]);

  const handleBuyAll = () => {
    if (!collection?.posters?.length) {
      setError("No valid posters available to add to cart.");
      return;
    }

    if (!selectedFinish) {
      setError("Please select a finish for the collection.");
      return;
    }

    const invalidPosters = collection.posters.filter(
      (poster) => !poster.posterId || !poster.selectedSize || !poster.title || poster.price === null || poster.finalPrice === null || poster.discount === null
    );
    if (invalidPosters.length > 0) {
      const errorMessage = `Cannot add collection to cart: Invalid posters detected: ${invalidPosters
        .map((p) => p.posterId || "unknown")
        .join(", ")}`;
      console.error(errorMessage);
      setError(errorMessage);
      return;
    }

    addToCart(
      {
        type: "collection",
        collectionId: collection.id,
        finish: selectedFinish,
        posters: collection.posters.map((poster) => ({
          posterId: poster.posterId,
          title: poster.title,
          image: poster.image,
          size: poster.selectedSize,
          price: poster.price,
          finalPrice: poster.finalPrice,
          discount: poster.discount,
          seller: poster.seller,
        })),
        quantity: 1,
        collectionDiscount: collection.collectionDiscount,
      },
      true,
      collection.id,
      collection.collectionDiscount
    );
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 3000);
    console.log("Buy Full Pack clicked for collection:", {
      collectionId: collection.id,
      finish: selectedFinish,
      collectionDiscount: collection.collectionDiscount,
      posters: collection.posters.map((p) => ({
        posterId: p.posterId,
        size: p.selectedSize,
        discount: p.discount,
      })),
    });
  };

  const handleAddToCart = (poster) => {
    if (!poster || poster.error) {
      const errorMessage = poster.error
        ? `Cannot add poster to cart: ${poster.error}`
        : "Invalid poster selected.";
      console.error(errorMessage, poster);
      setError(errorMessage);
      return;
    }

    if (!poster.posterId || !poster.selectedSize || !poster.title || poster.price === null || poster.finalPrice === null || poster.discount === null) {
      const validationErrors = [];
      if (!poster.posterId) validationErrors.push("Missing posterId");
      if (!poster.selectedSize) validationErrors.push("Missing size");
      if (!poster.title) validationErrors.push("Missing title");
      if (poster.price === null) validationErrors.push("Invalid or missing price");
      if (poster.finalPrice === null) validationErrors.push("Invalid or missing finalPrice");
      if (poster.discount === null) validationErrors.push("Invalid or missing discount");
      const errorMessage = `Cannot add poster ${poster.posterId || "unknown"} to cart: ${validationErrors.join(", ")}`;
      console.error(errorMessage, poster);
      setError(errorMessage);
      return;
    }

    if (!selectedFinish) {
      setError("Please select a finish for the poster.");
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
        finalPrice: poster.finalPrice,
        discount: poster.discount,
        seller: poster.seller,
        quantity: 1,
        finish: selectedFinish,
      },
      false
    );
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 3000);
    console.log("Added poster to cart:", {
      posterId: poster.posterId,
      size: poster.selectedSize,
      finish: selectedFinish,
      price: poster.price,
      finalPrice: poster.finalPrice,
      discount: poster.discount,
    });
  };

  const handleImageClick = (poster, index) => {
    setPreviewPoster({ poster, index });
  };

  const handleClosePreview = () => {
    setPreviewPoster(null);
    setTouchStartX(null);
  };

  const handlePrevPoster = () => {
    if (!collection?.posters?.length || !previewPoster) return;
    const newIndex = (previewPoster.index - 1 + collection.posters.length) % collection.posters.length;
    setPreviewPoster({ poster: collection.posters[newIndex], index: newIndex });
  };

  const handleNextPoster = () => {
    if (!collection?.posters?.length || !previewPoster) return;
    const newIndex = (previewPoster.index + 1) % collection.posters.length;
    setPreviewPoster({ poster: collection.posters[newIndex], index: newIndex });
  };

  const handleTouchStart = (e) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e) => {
    if (touchStartX === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const deltaX = touchStartX - touchEndX;
    const swipeThreshold = 50; // Minimum swipe distance in pixels

    if (deltaX > swipeThreshold) {
      handleNextPoster(); // Swipe left -> next poster
    } else if (deltaX < -swipeThreshold) {
      handlePrevPoster(); // Swipe right -> previous poster
    }
    setTouchStartX(null);
  };

  if (loading) return (
    <div className="d-flex justify-content-center align-items-center" style={{ height: "calc(100svh - 65px)" }}>
      <p className="text-center">Loading...</p>
    </div>
  );
  if (error) return <p className="text-danger">{error}</p>;
  if (!collection) return <p>Collection not found</p>;

  const totalFinalPrice = collection.posters.reduce((sum, p) => sum + (p.finalPrice || 0), 0);
  const discountedCollectionPrice = totalFinalPrice > 0 ? Math.round(totalFinalPrice * (1 - collection.collectionDiscount / 100)) : 0;

  return (
    <div className="container py-5">
      <h2 className="mb-3">{collection.title}</h2>
      <p className="mb-4 text-muted">{collection.description}</p>

      <div className="mb-4">
        <h6 className="fw-semibold mb-2">Select Finish for Collection</h6>
        <div className="d-flex gap-2">
          {['Gloss', 'Matte'].map((finish) => {
            const isSelected = selectedFinish === finish;
            return (
              <button
                key={finish}
                className={`btn border rounded px-3 py-2 ${isSelected ? 'border-primary text-primary' : ''
                  }`}
                onClick={() => setSelectedFinish(finish)}
                aria-label={`Select finish ${finish}`}
              >
                {finish}
              </button>
            );
          })}
        </div>
      </div>

      <div className="d-flex gap-2 mb-4 align-items-center">
        <button
          className="btn btn-primary"
          onClick={handleBuyAll}
          disabled={!collection.posters.length || totalFinalPrice === 0}
        >
          Buy Pack of {collection.posters.length} ({collection.collectionDiscount}% off) – ₹{discountedCollectionPrice}
        </button>
        {addedToCart && (
          <span className="text-success small ms-1">✅ Added to cart</span>
        )}
      </div>

      <div className="row">
        {collection.posters.map((poster, index) => (
          <div key={`${poster.id}-${poster.selectedSize}`} className="col-6 col-md-4 col-lg-3 mb-4">
            <div
              className="card h-100 shadow-sm border-0"
              style={{ cursor: "pointer" }}
              onClick={() => handleImageClick(poster, index)}
              role="button"
              aria-label={`View ${poster.title} preview`}
            >
              <img
                src={poster.image}
                alt={`${poster.title} (${poster.selectedSize})`}
                className="card-img-top"
                style={{ aspectRatio: "20/23", objectFit: "cover" }}
              />
              <div className="card-body text-center">
                <h6 className="text-truncate mb-2">
                  {poster.title} ({poster.selectedSize})
                </h6>
                {poster.error ? (
                  <p className="text-danger small">{poster.error}</p>
                ) : (
                  <p className="mb-0">
                    {poster.discount > 0 ? (
                      <>
                        <span className="text-muted text-decoration-line-through me-1">₹{poster.price}</span>
                        <span className="fw-semibold">₹{poster.finalPrice}</span>
                        <span className="text-success ms-1 small">({poster.discount}% off)</span>
                      </>
                    ) : (
                      <span className="fw-semibold">₹{poster.price}</span>
                    )}
                  </p>
                )}
                <button
                  className="btn btn-outline-primary mt-2"
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent triggering image preview
                    handleAddToCart(poster);
                  }}
                  disabled={!!poster.error}
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

      {previewPoster && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          role="dialog"
          aria-label="Poster preview"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.8)" }}
          onClick={handleClosePreview}
        >
          <div
            className="modal-dialog modal-lg modal-dialog-centered"
            role="document"
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
          >
            <div className="modal-content bg-transparent border-0 position-relative">
              <button
                type="button"
                className="btn-close btn-close-white position-absolute"
                style={{ top: "10px", right: "10px", zIndex: 1050 }}
                onClick={handleClosePreview}
                aria-label="Close preview"
              ></button>
              <div
                className="d-flex justify-content-center align-items-center"
                style={{ minHeight: "80vh" }}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
              >
                <img
                  src={previewPoster.poster.image}
                  alt={`${previewPoster.poster.title} preview`}
                  className="img-fluid"
                  style={{ maxHeight: "80vh", maxWidth: "100%", objectFit: "contain" }}
                />

                {collection.posters.length > 1 && (
                  <>
                    <button
                      className="btn btn-light position-absolute top-50 start-0 translate-middle-y"
                      style={{ opacity: 0.8 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePrevPoster();
                      }}
                      aria-label="Previous poster"
                    >
                      <span aria-hidden="true">&larr;</span>
                    </button>
                    <button
                      className="btn btn-light position-absolute top-50 end-0 translate-middle-y"
                      style={{ opacity: 0.8 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNextPoster();
                      }}
                      aria-label="Next poster"
                    >
                      <span aria-hidden="true">&rarr;</span>
                    </button>
                  </>
                )}
              </div>
              <div className="modal-footer border-0 justify-content-center">
                <p className="text-white mb-0">
                  {previewPoster.poster.title} ({previewPoster.poster.selectedSize})
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}