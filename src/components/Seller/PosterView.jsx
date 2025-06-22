import React, { useState, useEffect } from "react";
import { Card, ListGroup, Image } from "react-bootstrap";
import { useFirebase } from "../../context/FirebaseContext";
import { doc, getDoc } from "firebase/firestore";
import '../../styles/SellerComponents.css';

const PosterView = ({ poster }) => {
  const { firestore } = useFirebase();
  const [sellerName, setSellerName] = useState("Loading...");

  useEffect(() => {
    const fetchSellerName = async () => {
      if (poster?.sellerUsername && firestore) {
        try {
          const userDoc = await getDoc(doc(firestore, "users", poster.sellerUsername));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setSellerName(data.name || data.sellerUsername || "Unknown Seller");
          } else {
            setSellerName("Unknown Seller");
          }
        } catch (error) {
          console.error("Error fetching seller name:", error);
          setSellerName("Error");
        }
      }
    };
    fetchSellerName();
  }, [firestore, poster]);

  const imageUrl = poster?.imageUrl || poster?.originalImageUrl;

  return (
    <Card className="shadow-sm">
      <Card.Body>
        <div className="text-center mb-3">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={poster.title || "Poster"}
              fluid
              style={{ maxHeight: "300px", objectFit: "contain" }}
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "https://via.placeholder.com/300x300?text=Image+not+found";
              }}
            />
          ) : (
            <div className="text-muted">Image not available</div>
          )}
        </div>

        <Card.Title className="mb-3">{poster.title || "Untitled"}</Card.Title>
        <Card.Text>{poster.description || "No description available."}</Card.Text>

        <ListGroup variant="flush">
          <ListGroup.Item>
            <strong>Sizes:</strong>{" "}
            {Array.isArray(poster.sizes) && poster.sizes.length > 0
              ? poster.sizes.map((s) => s.size).join(", ")
              : "No sizes available"}
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
            {poster.keywords?.length > 0 ? poster.keywords.join(", ") : "None"}
          </ListGroup.Item>
          <ListGroup.Item>
            <strong>Seller:</strong> {sellerName} ({poster.sellerUsername})
          </ListGroup.Item>
          <ListGroup.Item>
            <strong>Status:</strong>{" "}
            {(poster.approved || "draft").charAt(0).toUpperCase() + (poster.approved || "draft").slice(1)}
            {" | "}
            <strong>Active:</strong> {poster.isActive ? "Yes" : "No"}
          </ListGroup.Item>
          <ListGroup.Item>
            <small>
              <strong>Created At:</strong>{" "}
              {poster.createdAt
                ? new Date(
                    poster.createdAt.seconds
                      ? poster.createdAt.seconds * 1000
                      : poster.createdAt
                  ).toLocaleString()
                : "N/A"}
            </small>
          </ListGroup.Item>
        </ListGroup>
      </Card.Body>
    </Card>
  );
};

export default PosterView;
