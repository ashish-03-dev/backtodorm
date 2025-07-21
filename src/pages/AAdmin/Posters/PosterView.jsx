import React, { useState, useEffect } from "react";
import { Card, ListGroup, Image } from "react-bootstrap";
import { useFirebase } from "../../../context/FirebaseContext";
import { doc, getDoc } from "firebase/firestore";

const PosterView = ({ poster }) => {
  const [imageError, setImageError] = useState(false);
  const [originalPosterData, setOriginalPosterData] = useState(null);
  const { firestore } = useFirebase();

  const imageSource = poster?.imageUrl || poster?.originalImageUrl || "";
  const placeholderImage = "https://via.placeholder.com/300x300?text=Image+not+found";

  // Fetch original poster data from Firestore
  useEffect(() => {
    const fetchOriginalPoster = async () => {
      if (poster?.posterId) {
        try {
          const posterRef = doc(firestore, "originalPoster", poster.posterId);
          const posterSnap = await getDoc(posterRef);
          if (posterSnap.exists()) {
            setOriginalPosterData(posterSnap.data());
          }
        } catch (error) {
          console.error("Error fetching original poster:", error);
        }
      }
    };

    fetchOriginalPoster();
  }, [firestore, poster?.posterId]);

  return (
    <Card>
      <Card.Body className="p-3">
        <div className="row">
          <div className="text-center col-md-6">
            {imageSource && !imageError ? (
              <Image
                src={imageSource}
                alt={poster.title || "Poster"}
                fluid
                style={{ maxHeight: "500px", objectFit: "contain" }}
                onError={() => setImageError(true)}
              />
            ) : (
              <Image
                src={placeholderImage}
                alt="Placeholder"
                fluid
                style={{ height: "300px", objectFit: "contain" }}
              />
            )}
          </div>
          <div className="col-md-6">
            <Card.Title className="mb-3">{poster.title || "Untitled"}</Card.Title>
            <ListGroup variant="flush">
              <ListGroup.Item>
                <strong>Sizes and Prices:</strong>{" "}
                {Array.isArray(poster.sizes) && poster.sizes.length > 0 ? (
                  <ul>
                    {poster.sizes.map((size, index) => (
                      <li key={index}>
                        {size.size}:{" "}
                        {poster.discount > 0 && size.finalPrice ? (
                          <>
                            <del>₹{size.price}</del>{" "}
                            <strong>₹{size.finalPrice}</strong> ({poster.discount}% OFF)
                          </>
                        ) : (
                          <strong>₹{size.price || "N/A"}</strong>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  "No sizes available"
                )}
              </ListGroup.Item>
              <ListGroup.Item>
                <strong>Collections:</strong>{" "}
                {poster.collections?.length > 0 ? poster.collections.join(", ") : "None"}
              </ListGroup.Item>
              <ListGroup.Item>
                <strong>Tags:</strong>{" "}
                {poster.tags?.length > 0 ? poster.tags.join(", ") : "None"}
              </ListGroup.Item>
              <ListGroup.Item>
                <strong>Keywords:</strong>{" "}
                {poster.keywords?.length > 0 ? poster.keywords.join(", ") : "No items"}
              </ListGroup.Item>
              <ListGroup.Item>
                <strong>Active:</strong> {poster.isActive ? "Yes" : "No"}
              </ListGroup.Item>
              <ListGroup.Item>
                <small>
                  <strong>Created At:</strong>{" "}
                  {poster.createdAt
                    ? poster.createdAt.toDate().toLocaleString("en-IN", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })
                    : "N/A"}
                </small>
              </ListGroup.Item>
              <ListGroup.Item>
                <small>
                  <strong>Poster ID:</strong> {poster.posterId || poster.id || "N/A"}
                </small>
              </ListGroup.Item>
              <ListGroup.Item>
                <small>
                  <strong>Original Poster Link:</strong>{" "}
                  {originalPosterData?.imageUrl ? (
                    <a
                      href={originalPosterData.imageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View Original Poster
                    </a>
                  ) : (
                    "N/A"
                  )}
                </small>
              </ListGroup.Item>
            </ListGroup>
          </div>
        </div>
      </Card.Body>
    </Card>
  );
};

export default PosterView;