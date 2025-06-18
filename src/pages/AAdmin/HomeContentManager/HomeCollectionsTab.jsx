import React, { useState } from "react";
import PropTypes from "prop-types";
import { ListGroup, Button, Modal, Form } from "react-bootstrap";
import { BiPlus, BiClipboard, BiTrash, BiImage } from "react-icons/bi";

const HomeCollectionsTab = ({
  collections,
  setCollections,
  filter,
  posterImages,
  validateForm,
  handleSubmit,
  handleDelete,
  handleFetchImage,
}) => {
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [formData, setFormData] = useState({ name: "", imageIds: [""] });
  const [formErrors, setFormErrors] = useState({});
  const [formPosterImages, setFormPosterImages] = useState({});

  const filteredCollections = collections.filter((collection) =>
    (collection?.name || collection?.id || "").toLowerCase().includes((filter?.search || "").toLowerCase())
  );
  const isFiltering = !!filter?.search?.trim();

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
        if (posterImages[id] !== undefined) initialImages[id] = posterImages[id];
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
    setFormData((prev) => ({
      ...prev,
      imageIds: prev.imageIds.filter((_, i) => i !== index),
    }));
    setFormErrors((prev) => ({
      ...prev,
      imageIds: prev.imageIds?.filter((_, i) => i !== index),
    }));
    setFormPosterImages((prev) => {
      const newImages = { ...prev };
      const id = formData.imageIds[index];
      delete newImages[id];
      return newImages;
    });
  };

  const handleImageChange = (index, value) => {
    const oldId = formData.imageIds[index];
    setFormData((prev) => ({
      ...prev,
      imageIds: prev.imageIds.map((id, i) => (i === index ? value : id)),
    }));
    if (value.trim()) {
      if (posterImages[value] !== undefined) {
        setFormPosterImages((prev) => ({ ...prev, [value]: posterImages[value] }));
      } else {
        handleFetchImage(value.trim(), setFormPosterImages);
      }
    }
    if (oldId) {
      setFormPosterImages((prev) => {
        const newImages = { ...prev };
        delete newImages[oldId];
        return newImages;
      });
    }
  };

  const handlePasteClipboard = async (index) => {
    try {
      const text = await navigator.clipboard.readText();
      if (text.trim()) {
        handleImageChange(index, text.trim());
        setFormErrors((prev) => ({
          ...prev,
          imageIds: prev.imageIds?.map((err, i) => (i === index ? null : err)),
        }));
      } else {
        alert("Clipboard is empty.");
      }
    } catch {
      alert("Failed to paste from clipboard.");
    }
  };

  const handleViewImage = (id) => {
    const imageUrl = formPosterImages[id] || posterImages[id];
    if (id && imageUrl) {
      window.open(imageUrl, "_blank", "noopener,noreferrer");
    } else if (imageUrl === "" && formPosterImages[id] !== null) {
      alert("Invalid ID: No image found.");
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const errors = await validateForm(formData, selectedItem);
    setFormErrors(errors);
    if (!Object.keys(errors).length) {
      await handleSubmit(formData, selectedItem);
      setShowEditModal(false);
    }
  };

  return (
    <div className="border rounded p-3" style={{ maxHeight: "600px", overflowY: "auto" }}>
      <div className="d-flex justify-content-end mb-3">
        <Button variant="primary" onClick={() => handleEdit()} aria-label="Create new collection">
          Create Collection
        </Button>
      </div>
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
                placeholder="e.g., Movies, Comics"
                required
                disabled={!!selectedItem}
                isInvalid={!!formErrors.name}
                aria-describedby="collection-name-error"
              />
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
  collections: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string,
      imageIds: PropTypes.arrayOf(PropTypes.string),
      type: PropTypes.string,
    })
  ).isRequired,
  setCollections: PropTypes.func.isRequired,
  filter: PropTypes.shape({
    search: PropTypes.string,
  }).isRequired,
  posterImages: PropTypes.object.isRequired,
  validateForm: PropTypes.func.isRequired,
  handleSubmit: PropTypes.func.isRequired,
  handleDelete: PropTypes.func.isRequired,
  handleFetchImage: PropTypes.func.isRequired,
};

HomeCollectionsTab.defaultProps = {
  collections: [],
  filter: { search: "" },
};

export default HomeCollectionsTab;