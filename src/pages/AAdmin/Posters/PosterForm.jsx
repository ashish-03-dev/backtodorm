import React, { useState, useRef } from "react";
import { Form, Button } from "react-bootstrap";
import { doc, getDoc } from "firebase/firestore";
import { useFirebase } from "../../../context/FirebaseContext";

const PosterForm = ({ poster, onSave }) => {
  const { firestore } = useFirebase();
  const [uploading, setUploading] = useState(false);
  const [idError, setIdError] = useState(null);
  const [idChecked, setIdChecked] = useState(false);
  const posterIdRef = useRef(null);

  const checkIdUniqueness = async (posterId) => {
    if (!posterId) {
      setIdError("Poster ID is required.");
      setIdChecked(false);
      return false;
    }
    if (!posterId.match(/^[a-zA-Z0-9_-]+$/)) {
      setIdError("Poster ID must contain only letters, numbers, hyphens, or underscores.");
      setIdChecked(false);
      return false;
    }
    try {
      const docRef = doc(firestore, "posters", posterId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setIdError("Poster ID already exists. Choose a unique ID.");
        setIdChecked(false);
        return false;
      }
      setIdError(null);
      setIdChecked(true);
      return true;
    } catch (error) {
      setIdError("Failed to check ID: " + error.message);
      setIdChecked(false);
      return false;
    }
  };

  const suggestId = () => {
    const title = posterIdRef.current.form.title.value.trim();
    if (!title) {
      alert("Enter a title first to suggest an ID.");
      return;
    }
    const generatedId = `${title
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9\-_]/g, "")}-${Date.now()}`;
    posterIdRef.current.value = generatedId;
    checkIdUniqueness(generatedId);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    const posterId = (poster?.id || form.posterId.value.trim()).toLowerCase();
    const price = parseFloat(form.price.value);
    const discount = parseFloat(form.discount.value) || 0;
    const finalPrice = Math.round(price - (price * discount) / 100);
    let imageUrl = poster?.imageUrl || form.imageUrl.value;

    // Validate posterId for new posters
    if (!poster) {
      if (!posterId) {
        alert("Poster ID is required.");
        return;
      }
      if (!idChecked || idError) {
        alert("Please check the Poster ID for uniqueness before saving.");
        return;
      }
    }

    // Handle image upload to Cloudinary
    if (form.imageFile.files[0]) {
      setUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", form.imageFile.files[0]);
        formData.append("upload_preset", "your_unsigned_preset"); // Replace with your preset
        const response = await fetch(
          `https://api.cloudinary.com/v1_1/your-cloud-name/image/upload`, // Replace with your cloud name
          {
            method: "POST",
            body: formData,
          }
        );
        const data = await response.json();
        if (!data.secure_url) {
          throw new Error("Image upload failed");
        }
        imageUrl = data.secure_url;
      } catch (error) {
        alert("Failed to upload image: " + error.message);
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    const data = {
      title: form.title.value,
      description: form.description.value,
      tags: form.tags.value.split(",").map((t) => t.trim()).filter(Boolean),
      collections: form.collections.value
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean),
      category: form.category.value,
      imageUrl,
      price,
      discount,
      finalPrice,
      approved: poster?.approved || "draft",
      isActive: form.isActive.checked,
      seller: form.seller.value,
      createdAt: poster?.createdAt || new Date().toISOString(),
    };
    onSave(data, posterId);
  };

  return (
    <Form onSubmit={handleSubmit}>
      {!poster && (
        <Form.Group className="mb-3">
          <Form.Label>Poster ID</Form.Label>
          <div className="input-group">
            <Form.Control
              name="posterId"
              defaultValue=""
              placeholder="Enter a unique ID (letters, numbers, hyphens, underscores)"
              required
              isInvalid={!!idError}
              isValid={idChecked && !idError}
              ref={posterIdRef}
              aria-describedby="posterIdFeedback"
            />
            <Button
              variant="outline-secondary"
              onClick={() => checkIdUniqueness(posterIdRef.current.value.trim().toLowerCase())}
            >
              Check
            </Button>
            <Button
              variant="outline-secondary"
              onClick={suggestId}
            >
              Suggest ID
            </Button>
          </div>
          <Form.Control.Feedback type="invalid" id="posterIdFeedback">
            {idError}
          </Form.Control.Feedback>
        </Form.Group>
      )}
      <Form.Group className="mb-3">
        <Form.Label>Title</Form.Label>
        <Form.Control
          name="title"
          defaultValue={poster?.title || ""}
          required
        />
      </Form.Group>
      <Form.Group className="mb-3">
        <Form.Label>Description</Form.Label>
        <Form.Control
          as="textarea"
          rows={2}
          name="description"
          defaultValue={poster?.description || ""}
        />
      </Form.Group>
      <Form.Group className="mb-3">
        <Form.Label>Tags (comma-separated)</Form.Label>
        <Form.Control
          name="tags"
          defaultValue={poster?.tags.join(", ") || ""}
        />
      </Form.Group>
      <Form.Group className="mb-3">
        <Form.Label>Collections (comma-separated)</Form.Label>
        <Form.Control
          name="collections"
          defaultValue={poster?.collections.join(", ") || ""}
        />
      </Form.Group>
      <Form.Group className="mb-3">
        <Form.Label>Category</Form.Label>
        <Form.Control
          name="category"
          defaultValue={poster?.category || ""}
          required
        />
      </Form.Group>
      <Form.Group className="mb-3">
        <Form.Label>Image Upload</Form.Label>
        <Form.Control type="file" name="imageFile" accept="image/*" />
        {poster?.imageUrl && (
          <Form.Text>
            Current: <a href={poster.imageUrl} target="_blank" rel="noopener noreferrer">View Image</a>
          </Form.Text>
        )}
      </Form.Group>
      <Form.Group className="mb-3">
        <Form.Label>Image URL (optional if uploading)</Form.Label>
        <Form.Control
          type="url"
          name="imageUrl"
          defaultValue={poster?.imageUrl || ""}
        />
      </Form.Group>
      <div className="row g-3">
        <div className="col-md-4">
          <Form.Group>
            <Form.Label>Price (₹)</Form.Label>
            <Form.Control
              type="number"
              name="price"
              defaultValue={poster?.price || ""}
              required
            />
          </Form.Group>
        </div>
        <div className="col-md-4">
          <Form.Group>
            <Form.Label>Discount (%)</Form.Label>
            <Form.Control
              type="number"
              name="discount"
              defaultValue={poster?.discount || 0}
            />
          </Form.Group>
        </div>
      </div>
      <Form.Group className="mb-3 mt-3">
        <Form.Label>Seller</Form.Label>
        <Form.Control
          name="seller"
          defaultValue={poster?.seller || ""}
          required
        />
      </Form.Group>
      <Form.Group className="mb-3">
        <Form.Check
          type="checkbox"
          name="isActive"
          label="Active"
          defaultChecked={poster?.isActive ?? true}
          disabled={poster?.approved !== "approved"}
        />
      </Form.Group>
      <Button type="submit" variant="success" disabled={uploading || (!poster && (!idChecked || !!idError))}>
        {uploading ? "Uploading..." : poster ? "Update Poster" : "Save Draft"}
      </Button>
    </Form>
  );
};

export default PosterForm;