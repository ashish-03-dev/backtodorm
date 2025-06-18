import React, { useState, useEffect } from "react";
import { Button, Form, Alert } from "react-bootstrap";
import { addPoster, updatePoster } from "./sellerUtils";
import { useFirebase } from "../../context/FirebaseContext";

export default function SellerPosterForm({ poster, onSave }) {
  const { user, firestore } = useFirebase();
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    keywords: "",
    imageUrl: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (poster) {
      setFormData({
        title: poster.title || "",
        description: poster.description || "",
        keywords: poster.keywords?.join(", ") || "",
        imageUrl: poster.imageUrl || "",
      });
    }
  }, [poster]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const data = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      keywords: formData.keywords
        .split(",")
        .map((k) => k.trim())
        .filter((k) => k),
      imageUrl: formData.imageUrl.trim(),
      seller: user.uid,
      approved: "draft",
    };

    try {
      const result = poster
        ? await updatePoster(firestore, data, poster.id)
        : await addPoster(firestore, data);
      if (result.success) {
        onSave(data, result.id);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message || "Failed to save poster");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Form onSubmit={handleSubmit}>
      {error && <Alert variant="danger">{error}</Alert>}
      <Form.Group className="mb-3">
        <Form.Label>Title</Form.Label>
        <Form.Control
          type="text"
          name="title"
          value={formData.title}
          onChange={handleChange}
          required
          placeholder="Enter poster title"
        />
      </Form.Group>
      <Form.Group className="mb-3">
        <Form.Label>Description</Form.Label>
        <Form.Control
          as="textarea"
          name="description"
          value={formData.description}
          onChange={handleChange}
          required
          placeholder="Describe your poster"
          rows={4}
        />
      </Form.Group>
      <Form.Group className="mb-3">
        <Form.Label>Keywords</Form.Label>
        <Form.Control
          type="text"
          name="keywords"
          value={formData.keywords}
          onChange={handleChange}
          placeholder="Enter keywords, separated by commas"
        />
        <Form.Text className="text-muted">
          Example: abstract, colorful, modern
        </Form.Text>
      </Form.Group>
      <Form.Group className="mb-3">
        <Form.Label>Image URL</Form.Label>
        <Form.Control
          type="url"
          name="imageUrl"
          value={formData.imageUrl}
          onChange={handleChange}
          required
          placeholder="Enter image URL"
        />
      </Form.Group>
      <div className="d-flex gap-2">
        <Button type="submit" variant="primary" disabled={submitting}>
          {submitting ? "Saving..." : poster ? "Update" : "Save Draft"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => onSave(null)}
          disabled={submitting}
        >
          Cancel
        </Button>
      </div>
    </Form>
  );
}