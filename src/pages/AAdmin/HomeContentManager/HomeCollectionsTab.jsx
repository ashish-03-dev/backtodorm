import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { ListGroup, Button, Modal, Form } from "react-bootstrap";
import { BiPlus, BiClipboard, BiTrash, BiImage } from "react-icons/bi";
import { collection, getDocs, setDoc, doc, deleteDoc, getDoc } from "firebase/firestore";
import { useFirebase } from "../../../context/FirebaseContext";
import { fetchImages } from "./utils";

// Helper to ensure string or empty string
const ensureString = (value) => (typeof value === "string" ? value : "");

// Validate Firestore document ID
const isValidDocumentId = (id) => {
  return id && /^[a-z0-9-]+$/.test(id.trim());
};

const HomeCollectionsTab = ({
  filter,
  posterImages,
  setPosterImages,
  handleFetchImage,
}) => {
  const { firestore } = useFirebase();
  const [collections, setCollections] = useState([]);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [formData, setFormData] = useState({ name: "", imageIds: [""] });
  const [formErrors, setFormErrors] = useState({});
  const [formPosterImages, setFormPosterImages] = useState({});
  const [submissionError, setSubmissionError] = useState(null);

  // Fetch home collections
  useEffect(() => {
    const fetchCollections = async () => {
      if (!firestore) {
        console.log("Firestore not initialized");
        return;
      }
      try {
        const collectionsRef = collection(firestore, "homeSections/homeCollections/collectionItems");
        const collectionsSnapshot = await getDocs(collectionsRef);
        const collections = collectionsSnapshot.docs.map((d) => ({
          id: d.id,
          type: "collection",
          name: ensureString(d.data().name),
          imageIds: d.data().imageIds || [],
        }));
        setCollections(collections);
        console.log("Fetched homeCollections:", collections);
      } catch (err) {
        console.error("Fetch error:", err);
        setSubmissionError(
          err.code === "permission-denied"
            ? "Permission denied: Check Firestore rules."
            : `Failed to fetch collections: ${err.message}`
        );
      }
    };
    fetchCollections();
  }, [firestore]);

  const filteredCollections = collections.filter((collection) =>
    (collection?.name || collection?.id || "").toLowerCase().includes((filter?.search || "").toLowerCase())
  );
  const isFiltering = !!filter?.search?.trim();

  const normalizeDocumentId = (name) => {
    return name
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-");
  };

  const validateForm = async (formData, selectedItem, items) => {
    const errors = {};
    const name = ensureString(formData.name).trim();
    const id = normalizeDocumentId(name);
    if (!name) {
      errors.name = "Collection Name is required.";
    } else if (!isValidDocumentId(id)) {
      errors.name = "Invalid name format. Use lowercase alphanumeric characters and hyphens only.";
    } else if (!selectedItem && items.some((c) => c.id === id)) {
      errors.name = "Collection already exists.";
    }

    const imageErrors = await Promise.all(
      (formData.imageIds || []).map(async (id, index) => {
        const safeId = ensureString(id).trim();
        if (!safeId) return null;
        if (!isValidDocumentId(safeId)) return "Invalid ID format.";
        try {
          const posterRef = doc(firestore, "posters", id);
          const posterSnap = await getDoc(posterRef);
          if (!posterSnap.exists()) return "Image ID does not exist.";
          return null;
        } catch (err) {
          return `Failed to validate ID: ${err.message}`;
        }
      })
    );
    if (imageErrors.some((err) => err)) errors.imageIds = imageErrors;

    console.log("Validation result:", errors);
    return errors;
  };

  const handleSubmit = async (formData, selectedItem) => {
    try {
      const id = normalizeDocumentId(formData.name);
      if (!isValidDocumentId(id)) {
        throw new Error("Invalid collection ID format.");
      }
      const name = ensureString(formData.name).trim();
      const imageIds = (formData.imageIds || []).map(ensureString).filter((id) => id.trim());
      await setDoc(doc(firestore, "homeSections/homeCollections/collectionItems", id), {
        name,
        imageIds,
      });
      setCollections((prev) =>
        prev.some((c) => c.id === id)
          ? prev.map((c) => (c.id === id ? { id, type: "collection", name, imageIds } : c))
          : [...prev, { id, type: "collection", name, imageIds }]
      );

      const newIds = imageIds.filter((id) => id.trim() && !posterImages[id]);
      if (newIds.length) {
        const imageResults = await fetchImages(newIds, firestore);
        setPosterImages((prev) => ({ ...prev, ...Object.fromEntries(imageResults) }));
      }
      setSubmissionError(null);
    } catch (error) {
      console.error("Submission error:", error);
      setSubmissionError(`Failed to save collection: ${error.message}`);
      throw error;
    }
  };

  const handleDelete = async (item) => {
    try {
      await deleteDoc(doc(firestore, "homeSections/homeCollections/collectionItems", item.id));
      setCollections((prev) => prev.filter((c) => c.id !== item.id));
      setSubmissionError(null);
    } catch (error) {
      console.error("Deletion error:", error);
      setSubmissionError(`Failed to delete collection: ${error.message}`);
      throw error;
    }
  };

  const handleShowDetail = (item) => {
    setSelectedItem(item);
    setShowDetailModal(true);
  };

  const handleEdit = (item = null) => {
    setSelectedItem(item);
    setFormData({
      name: item?.name || "",
      imageIds: item?.imageIds?.length ? item.imageIds : [""],
    });
    setFormErrors({});
    const initialImages = {};
    if (item?.imageIds?.length) {
      item.imageIds.forEach((id) => {
        if (posterImages[id] !== undefined) {
          initialImages[id] = posterImages[id];
        }
      });
    }
    setFormPosterImages(initialImages);
    setShowEditModal(true);
  };

  const handleDeleteModal = (item) => {
    setSelectedItem(item);
    setShowDeleteModal(true);
  };

  const handleAddImage = () => {
    setFormData((prev) => ({
      ...prev,
      imageIds: [...prev.imageIds, ""],
    }));
  };

  const handleRemoveImage = (index) => {
    try {
      setFormData((prev) => ({
        ...prev,
        imageIds: prev.imageIds?.filter((_, i) => i !== index) || [],
      }));
      setFormErrors((prev) => ({
        ...prev,
        imageIds: prev.imageIds?.filter((_, i) => i !== index) || [],
      }));
      setFormPosterImages((prev) => {
        const newImages = { ...prev };
        const id = formData.imageIds[index];
        delete newImages[id];
        return newImages;
      });
    } catch (error) {
      console.error("Error removing image:", error);
      setSubmissionError("Failed to remove image.");
    }
  };

  const handleImageChange = (index, value) => {
    try {
      const oldId = formData.imageIds?.[index] || null;
      setFormData((prev) => ({
        ...prev,
        imageIds: prev.imageIds?.map((id, i) => (i === index ? value : id)) || [],
      }));
      if (value.trim()) {
        if (posterImages[value] !== undefined) {
          setFormPosterImages((prev) => ({ ...prev, [value]: posterImages[value] }));
        } else {
          handleFetchImage(value.trim(), setFormPosterImages); // Fix: Pass setFormPosterImages
        }
      }
      if (oldId) {
        setFormPosterImages((prev) => {
          const newImages = { ...prev };
          delete newImages[oldId];
          return newImages;
        });
      }
      setFormErrors((prev) => ({
        ...prev,
        imageIds: prev.imageIds?.map((err, i) => (i === index ? undefined : err)) || [],
      }));
    } catch (error) {
      console.error("Error changing image:", error);
      setSubmissionError("Failed to update image ID.");
    }
  };

  const handlePasteClipboard = async (index) => {
    try {
      const text = await navigator.clipboard.readText();
      const safeText = ensureString(text.trim());
      if (safeText) {
        handleImageChange(index, safeText);
        setFormErrors((prev) => ({
          ...prev,
          imageIds: prev.imageIds?.map((err, i) => (i === index ? null : err)) || [],
        }));
      } else {
        alert("Clipboard is empty or contains invalid data.");
      }
    } catch (error) {
      console.error("Failed to paste from clipboard:", error);
      alert("Failed to paste from clipboard.");
    }
  };

  const handleViewImage = (id) => {
    try {
      const imageUrl = formPosterImages[id] || posterImages[id];
      if (id && imageUrl) {
        window.open(imageUrl, "_blank", "noopener,noreferrer");
      } else if (imageUrl === "" && formPosterImages[id] !== null) {
        alert("Invalid ID: No image found.");
      } else {
        alert("No image available for this ID.");
      }
    } catch (error) {
      console.error("Error viewing image:", error);
      alert("Failed to view image.");
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      const normalizedFormData = {
        ...formData,
        documentId: normalizeDocumentId(formData.name),
        imageIds: formData.imageIds.filter((id) => id.trim()),
      };
      const errors = await validateForm(normalizedFormData, selectedItem, collections);
      setFormErrors(errors);
      if (!Object.keys(errors).length) {
        await handleSubmit(normalizedFormData, selectedItem);
        setShowEditModal(false);
      }
    } catch (error) {
      console.error("Form submission error:", error);
      setSubmissionError(`Failed to submit form: ${error.message}`);
    }
  };

  return (
    <div className="border rounded p-3" style={{ maxHeight: "600px", overflowY: "auto" }}>
      <div className="d-flex justify-content-end mb-3">
        <Button variant="primary" onClick={() => handleEdit()} aria-label="Create new collection">
          Create Collection
        </Button>
      </div>
      {submissionError && (
        <div className="alert alert-danger" role="alert">
          {submissionError}
        </div>
      )}
      <ListGroup>
        {filteredCollections.map((collection) => (
          <ListGroup.Item
            key={collection.id}
            className="d-flex justify-content-between align-items-center"
          >
            <div>
              <strong>{collection.name}</strong>
              <div className="text-muted small">Images: {collection?.imageIds?.length || 0}</div>
            </div>
            <div>
              <Button
                variant="outline-primary"
                size="sm"
                className="me-2"
                onClick={() => handleShowDetail(collection)}
                aria-label={`View collection ${collection.name}`}
              >
                View
              </Button>
              <Button
                variant="outline-secondary"
                size="sm"
                className="me-2"
                onClick={() => handleEdit(collection)}
                aria-label={`Edit collection ${collection.name}`}
              >
                Edit
              </Button>
              <Button
                variant="outline-danger"
                size="sm"
                onClick={() => handleDeleteModal(collection)}
                aria-label={`Delete collection ${collection.name}`}
              >
                Delete
              </Button>
            </div>
          </ListGroup.Item>
        ))}
        {!filteredCollections.length && (
          <ListGroup.Item className="text-center text-muted">
            {isFiltering ? "No matching collections." : "No collections found."}
          </ListGroup.Item>
        )}
      </ListGroup>
      <Modal show={showDetailModal} onHide={() => setShowDetailModal(false)} aria-labelledby="collection-detail-modal-title">
        <Modal.Header closeButton>
          <Modal.Title id="collection-detail-modal-title">Collection Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedItem && (
            <>
              <p>
                <strong>Collection Name:</strong> {selectedItem.name}
              </p>
              <p>
                <strong>Image Count:</strong> {selectedItem.imageIds?.length || 0}
              </p>
              <hr />
              <h6>Image IDs:</h6>
              <ListGroup>
                {selectedItem.imageIds?.map((id, i) => (
                  <ListGroup.Item key={i} className="d-flex justify-content-between align-items-center">
                    <span>
                      <strong>ID:</strong> {id}
                    </span>
                    {posterImages[id] && (
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => handleViewImage(id)}
                        title="View image"
                        aria-label={`View image for ${id}`}
                      >
                        <BiImage />
                      </Button>
                    )}
                  </ListGroup.Item>
                ))}
                {!selectedItem.imageIds?.length && (
                  <ListGroup.Item className="text-muted">No images assigned.</ListGroup.Item>
                )}
              </ListGroup>
            </>
          )}
        </Modal.Body>
      </Modal>
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} size="lg" aria-labelledby="collection-edit-modal-title">
        <Modal.Header closeButton>
          <Modal.Title id="collection-edit-modal-title">
            {selectedItem ? "Edit Collection" : "Create Collection"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleFormSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Collection Name</Form.Label>
              <Form.Control
                type="text"
                name="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., TV Series, Comics"
                required
                disabled={!!selectedItem}
                isInvalid={!!formErrors.name}
                aria-describedby="collection-name-error"
              />
              <Form.Text className="text-muted">
                The collection ID will be generated from the name (e.g., "TV Series" becomes "tv-series").
              </Form.Text>
              <Form.Control.Feedback type="invalid" id="collection-name-error">
                {formErrors.name}
              </Form.Control.Feedback>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Image IDs</Form.Label>
              {!formData.imageIds?.length && <div className="text-muted mb-2">No image IDs assigned.</div>}
              {formData.imageIds?.map((id, index) => (
                <div key={index} className="mb-2 d-flex align-items-center gap-2">
                  <div className="input-group flex-grow-1">
                    <Form.Control
                      placeholder="Image ID (e.g., 20-bts--k-pop-set--polaroid-175005907974)"
                      value={id}
                      onChange={(e) => handleImageChange(index, e.target.value)}
                      isInvalid={
                        !!formErrors.imageIds?.[index] ||
                        (id.trim() && !formPosterImages[id] && formPosterImages[id] !== null)
                      }
                      aria-describedby={`collection-image-error-${index}`}
                    />
                    <Button
                      variant="outline-secondary"
                      onClick={() => handlePasteClipboard(index)}
                      title="Paste from clipboard"
                      aria-label="Paste image ID from clipboard"
                    >
                      <BiClipboard />
                    </Button>
                    <Button
                      variant="outline-primary"
                      onClick={() => handleViewImage(id)}
                      title="View image"
                      disabled={!id.trim() || formPosterImages[id] === null || (!formPosterImages[id] && !posterImages[id])}
                      aria-label={`View image for ${id}`}
                    >
                      {formPosterImages[id] === null ? "Loading..." : <BiImage />}
                    </Button>
                    <Button
                      variant="outline-danger"
                      onClick={() => handleRemoveImage(index)}
                      title="Remove image"
                      aria-label="Remove image"
                    >
                      <BiTrash />
                    </Button>
                  </div>
                  <Form.Control.Feedback type="invalid" id={`collection-image-error-${index}`}>
                    {formErrors.imageIds?.[index] ||
                      (id.trim() && !formPosterImages[id] && formPosterImages[id] !== null ? "Invalid Image ID" : "")}
                  </Form.Control.Feedback>
                </div>
              ))}
              <Button
                variant="outline-primary"
                size="sm"
                onClick={() => handleAddImage()}
                className="mt-2"
                aria-label="Add image"
              >
                <BiPlus /> Add Image
              </Button>
            </Form.Group>
            <Button type="submit" variant="primary">
              {selectedItem ? "Update" : "Create"} Collection
            </Button>
          </Form>
        </Modal.Body>
      </Modal>
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} aria-labelledby="collection-delete-modal-title">
        <Modal.Header closeButton>
          <Modal.Title id="collection-delete-modal-title">Confirm Delete</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>
            Are you sure you want to delete collection <strong>{selectedItem?.name}</strong>? This action cannot be undone.
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              handleDelete(selectedItem);
              setShowDeleteModal(false);
            }}
            aria-label="Confirm delete collection"
          >
            Delete
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

HomeCollectionsTab.propTypes = {
  filter: PropTypes.shape({
    search: PropTypes.string,
  }).isRequired,
  posterImages: PropTypes.object.isRequired,
  setPosterImages: PropTypes.func.isRequired,
  handleFetchImage: PropTypes.func.isRequired,
};

HomeCollectionsTab.defaultProps = {
  filter: { search: "" },
};

export default HomeCollectionsTab;