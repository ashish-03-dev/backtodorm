import React from "react";

const PosterView = ({ poster }) => (
  <>
    <div className="text-center mb-3">
      <img
        src={poster.imageUrl}
        alt={poster.title}
        className="img-fluid"
        style={{ maxHeight: 300 }}
      />
    </div>
    <h5>{poster.title}</h5>
    <p>{poster.description}</p>
    <p>
      <strong>Price:</strong>{" "}
      {poster.discount > 0 ? (
        <>
          <del>₹{poster.price}</del>{" "}
          <strong>₹{poster.finalPrice}</strong> ({poster.discount}% OFF)
        </>
      ) : (
        <strong>₹{poster.price}</strong>
      )}
    </p>
    <p>
      <strong>Category:</strong> {poster.category}
    </p>
    <p>
      <strong>Collections:</strong> {poster.collections.join(", ")}
    </p>
    <p>
      <strong>Tags:</strong> {poster.tags.join(", ")}
    </p>
    <p>
      <strong>Seller:</strong> {poster.seller}
    </p>
    <p>
      <strong>Visibility:</strong> {poster.visibility} |{" "}
      <strong>Active:</strong> {poster.isActive ? "Yes" : "No"} |{" "}
      <strong>Approved:</strong> {poster.approved ? "Yes" : "No"}
    </p>
    <p>
      <small>Created At: {new Date(poster.createdAt).toLocaleString()}</small>
    </p>
  </>
);

export default PosterView;