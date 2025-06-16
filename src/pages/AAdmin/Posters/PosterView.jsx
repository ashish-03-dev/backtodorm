import React, { useState, useEffect } from "react";
import { useFirebase } from "../../../context/FirebaseContext";
import { doc, getDoc } from "firebase/firestore";

const PosterView = ({ poster }) => {
  const { firestore } = useFirebase();
  const [sellerName, setSellerName] = useState("Loading...");

  useEffect(() => {
    const fetchSellerName = async () => {
      if (poster?.seller) {
        try {
          const userDoc = await getDoc(doc(firestore, "users", poster.seller));
          if (userDoc.exists()) {
            setSellerName(userDoc.data().name || "Unknown User");
          } else {
            setSellerName("Unknown User");
          }
        } catch (error) {
          console.error("Error fetching seller name:", error);
          setSellerName("Error");
        }
      }
    };
    fetchSellerName();
  }, [firestore, poster]);

  return (
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
        <strong>Sizes and Prices:</strong>
        {Array.isArray(poster.sizes) && poster.sizes.length > 0 ? (
          <ul>
            {poster.sizes.map((size, index) => (
              <li key={index}>
                {size.size}:{" "}
                {poster.discount > 0 ? (
                  <>
                    <del>₹{size.price}</del>{" "}
                    <strong>₹{size.finalPrice}</strong> ({poster.discount}% OFF)
                  </>
                ) : (
                  <strong>₹{size.price}</strong>
                )}
              </li>
            ))}
          </ul>
        ) : (
          " No sizes available"
        )}
      </p>
      <p>
        <strong>Category:</strong> {poster.category || "None"}
      </p>
      <p>
        <strong>Collections:</strong>{" "}
        {poster.collections?.length > 0 ? poster.collections.join(", ") : "None"}
      </p>
      <p>
        <strong>Tags:</strong>{" "}
        {poster.tags?.length > 0 ? poster.tags.join(", ") : "None"}
      </p>
      <p>
        <strong>Keywords:</strong>{" "}
        {poster.keywords?.length > 0 ? poster.keywords.join(", ") : "None"}
      </p>
      <p>
        <strong>Seller:</strong> {sellerName} ({poster.seller})
      </p>
      <p>
        <strong>Active:</strong> {poster.isActive ? "Yes" : "No"} |{" "}
        <strong>Approved:</strong>{" "}
        {poster.approved.charAt(0).toUpperCase() + poster.approved.slice(1)}
      </p>
      <p>
        <small>Created At: {new Date(poster.createdAt).toLocaleString()}</small>
      </p>
    </>
  );
};

export default PosterView;