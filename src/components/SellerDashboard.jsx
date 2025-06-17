import React, { useState, useEffect } from "react";
import { useFirebase } from "../context/FirebaseContext";
import { getFirestore, collection, addDoc, getDocs, query, where } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

export default function SellerDashboard() {
  const { user, userData, firestore } = useFirebase();
  const navigate = useNavigate();
  const [designs, setDesigns] = useState([]);
  const [newDesign, setNewDesign] = useState({ title: "", price: "", image: null });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user || !userData?.isSeller) {
      navigate("/account");
      return;
    }

    // Fetch seller's designs
    const fetchDesigns = async () => {
      setLoading(true);
      try {
        const designsRef = collection(firestore, "designs");
        const q = query(designsRef, where("sellerId", "==", user.uid));
        const querySnapshot = await getDocs(q);
        const designsList = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setDesigns(designsList);
      } catch (err) {
        setError("Failed to fetch designs");
      }
      setLoading(false);
    };

    fetchDesigns();
  }, [user, userData, firestore, navigate]);

  const handleDesignSubmit = async (e) => {
    e.preventDefault();
    if (!newDesign.title || !newDesign.price || !newDesign.image) {
      setError("All fields are required");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const designData = {
        title: newDesign.title,
        price: parseFloat(newDesign.price),
        sellerId: user.uid,
        storeName: userData.sellerInfo.storeName,
        createdAt: new Date().toISOString(),
        // In a real app, upload image to Firebase Storage and store the URL
        imageUrl: URL.createObjectURL(newDesign.image), // Placeholder for demo
      };
      await addDoc(collection(firestore, "designs"), designData);
      setDesigns([...designs, designData]);
      setNewDesign({ title: "", price: "", image: null });
    } catch (err) {
      setError("Failed to upload design");
    }
    setLoading(false);
  };

  return (
    <div className="container p-4">
      <h2>Seller Dashboard</h2>
      <h4>Welcome, {userData?.sellerInfo?.storeName}!</h4>

      {/* Upload Design Form */}
      <div className="card mb-4">
        <div className="card-body">
          <h5 className="card-title">Upload a New Design</h5>
          <form onSubmit={handleDesignSubmit}>
            <div className="mb-3">
              <label htmlFor="designTitle" className="form-label">Design Title</label>
              <input
                type="text"
                className="form-control"
                id="designTitle"
                value={newDesign.title}
                onChange={(e) => setNewDesign({ ...newDesign, title: e.target.value })}
                placeholder="Enter design title"
              />
            </div>
            <div className="mb-3">
              <label htmlFor="designPrice" className="form-label">Price ($)</label>
              <input
                type="number"
                className="form-control"
                id="designPrice"
                value={newDesign.price}
                onChange={(e) => setNewDesign({ ...newDesign, price: e.target.value })}
                placeholder="Enter price"
              />
            </div>
            <div className="mb-3">
              <label htmlFor="designImage" className="form-label">Design Image</label>
              <input
                type="file"
                className="form-control"
                id="designImage"
                accept="image/*"
                onChange={(e) => setNewDesign({ ...newDesign, image: e.target.files[0] })}
              />
            </div>
            {error && <div className="alert alert-danger">{error}</div>}
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Uploading..." : "Upload Design"}
            </button>
          </form>
        </div>
      </div>

      {/* Posted Designs */}
      <div className="card mb-4">
        <div className="card-body">
          <h5 className="card-title">Posted Designs</h5>
          {loading ? (
            <p>Loading designs...</p>
          ) : designs.length === 0 ? (
            <p>No designs posted yet.</p>
          ) : (
            <div className="row">
              {designs.map((design) => (
                <div key={design.id} className="col-md-4 mb-3">
                  <div className="card">
                    <img src={design.imageUrl} className="card-img-top" alt={design.title} />
                    <div className="card-body">
                      <h6 className="card-title">{design.title}</h6>
                      <p className="card-text">Price: ${design.price}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Placeholder for Sold Items and Revenue */}
      <div className="card mb-4">
        <div className="card-body">
          <h5 className="card-title">Sales Summary</h5>
          <p>Sold Items: Coming soon...</p>
          <p>Revenue: Coming soon...</p>
        </div>
      </div>
    </div>
  );
}