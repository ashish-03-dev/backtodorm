import React from "react";
import { ListGroup, Image } from "react-bootstrap";

const PosterView = ({ poster }) => {
  // Use the pre-fetched imageUrl from the poster prop (already resolved in MyProducts)
  const imageUrl = poster?.imageUrl;

  return (
    <div className="p-3">
      <div className="text-center mb-3">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={poster?.title || "Poster"}
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

      <h5 className="mb-3">{poster?.title || "Untitled"}</h5>
      {poster?.description && <p>{poster.description}</p>}

      <ListGroup variant="flush">
        {Array.isArray(poster?.collections) && poster.collections.length > 0 && (
          <ListGroup.Item>
            <strong>Collections:</strong> {poster.collections.join(", ")}
          </ListGroup.Item>
        )}
        {Array.isArray(poster?.tags) && poster.tags.length > 0 && (
          <ListGroup.Item>
            <strong>Tags:</strong> {poster.tags.join(", ")}
          </ListGroup.Item>
        )}
        {poster?.sellerUsername && (
          <ListGroup.Item>
            <strong>Seller:</strong> {poster.sellerUsername}
          </ListGroup.Item>
        )}
        {(poster?.status || typeof poster?.isActive === "boolean") && (
          <ListGroup.Item>
            {poster?.status && (
              <>
                <strong>Status:</strong>{" "}
                {poster.status.charAt(0).toUpperCase() + poster.status.slice(1)}
                {typeof poster?.isActive === "boolean" && " | "}
              </>
            )}
            {typeof poster?.isActive === "boolean" && (
              <>
                <strong>Active:</strong> {poster.isActive ? "Yes" : "No"}
              </>
            )}
          </ListGroup.Item>
        )}
        {poster?.createdAt && (
          <ListGroup.Item>
            <small>
              <strong>{poster.source === "rejectedPosters" ? "Rejected At" : "Created At"}:</strong>{" "}
              {new Date(
                poster.createdAt.seconds ? poster.createdAt.seconds * 1000 : poster.createdAt
              ).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
            </small>
          </ListGroup.Item>
        )}
      </ListGroup>
    </div>
  );
};

export default PosterView;