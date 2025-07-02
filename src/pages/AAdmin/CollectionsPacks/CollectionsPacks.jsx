import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { ListGroup, Button, Modal, Form } from "react-bootstrap";
import { BiPlus, BiClipboard, BiTrash } from "react-icons/bi";
import { useFirebase } from "../../../context/FirebaseContext";
import {
  generateDocId,
  ensureString,
  isValidDocumentId,
  fetchCollections,
  handleSubmit,
  handleDelete,
  validateForm,
  handlePosterIdChange,
  handleSizeChange,
  handlePasteClipboard,
  handleMainImagePosterIdChange,
} from "./utils";

const CollectionsPacks = ({ filter }) => {
  const { firestore } = useFirebase();
  const [collections, setCollections] = useState([]);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    image: "",
    posters: [{ posterId: "", size: "" }],
    discount: 20,
  });
  const [formErrors, setFormErrors] = useState({});
  const [posterDetails, setPosterDetails] = useState({});
  const [submissionError, setSubmissionError] = useState(null);
  const [mainImagePosterTitle, setMainImagePosterTitle] = useState("");

  useEffect(() => {
    fetchCollections(firestore, setCollections, setSubmissionError);
  }, [firestore]);

  const filteredCollections = collections.filter((collection) =>
    (collection?.title || collection?.id || "")
      .toLowerCase()
      .includes((filter?.search || "").toLowerCase())
  );
  const isFiltering = !!filter?.search?.trim();

  const handleEdit = (item = null) => {
    setSelectedItem(item);
    setFormData({
      title: ensureString(item?.title),
      description: ensureString(item?.description),
      image: ensureString(item?.image),
      posters: Array.isArray(item?.posters)
        ? item.posters.map((p) => ({
            posterId: ensureString(p.posterId || p),
            size: ensureString(p.size),
          }))
        : [{ posterId: "", size: "" }],
      discount: item?.discount || 20,
    });
    setFormErrors({});
    setSubmissionError(null);
    setPosterDetails({});
    setMainImagePosterTitle("");
    setShowEditModal(true);
  };

  const handleDeleteModal = (item) => {
    setSelectedItem(item);
    setShowDeleteModal(true);
  };

  const handleAddPoster = () => {
    setFormData((prev) => ({
      ...prev,
      posters: [...prev.posters, { posterId: "", size: "" }],
    }));
  };

  const handleRemovePoster = (index) => {
    if (formData.posters.length <= 1) return;
    setFormData((prev) => ({
      ...prev,
      posters: prev.posters.filter((_, i) => i !== index),
    }));
    setFormErrors((prev) => ({
      ...prev,
      posters: prev.posters?.filter((pErr) => pErr.index !== index) || [],
    }));
    setPosterDetails((prev) => {
      const newDetails = { ...prev };
      delete newDetails[formData.posters[index]?.posterId];
      return newDetails;
    });
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setSubmissionError(null);

    const generatedId = generateDocId(formData.title || "unnamed-collection");
    if (!isValidDocumentId(generatedId)) {
      setFormErrors({ title: "Invalid title: Use alphanumeric, spaces, or hyphens." });
      return;
    }

    const updatedFormData = {
      ...formData,
      id: generatedId,
      imageUrl: posterDetails[formData.image]?.imageUrl || "",
    };
    const errors = await validateForm(updatedFormData, selectedItem, collections, firestore);
    setFormErrors(errors);

    if (!Object.keys(errors).length) {
      await handleSubmit(
        updatedFormData,
        selectedItem,
        firestore,
        setCollections,
        setSubmissionError
      );
      setShowEditModal(false);
    }
  };

  return (
    <div className="p-4 p-md-5">
      <h3 className="mb-4">🏠 Collection Packs</h3>
      <div style={{ maxHeight: "600px", overflowY: "auto" }}>
        <div className="d-flex justify-content-end mb-3">
          <Button
            variant="primary"
            onClick={() => handleEdit()}
            aria-label="Create new collection pack"
          >
            New Collection Pack
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
                <strong>
                  {collection.title} (ID: {collection.id})
                </strong>
                <div className="text-muted small">
                  Posters: {collection?.posters?.length || 0}, Discount: {collection?.discount || 20}%
                </div>
              </div>
              <div>
                <Button
                  variant="outline-primary"
                  size="sm"
                  className="me-2"
                  onClick={() => {
                    setShowDetailModal(true);
                    setSelectedItem(collection);
                  }}
                  aria-label={`View collection ${collection.title}`}
                >
                  View
                </Button>
                <Button
                  variant="outline-danger"
                  size="sm"
                  onClick={() => handleDeleteModal(collection)}
                  aria-label={`Delete collection ${collection.title}`}
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
        <Modal
          size="lg"
          show={showDetailModal}
          onHide={() => setShowDetailModal(false)}
          aria-labelledby="collection-detail-modal-title"
        >
          <Modal.Header closeButton>
            <Modal.Title id="collection-detail-modal-title">
              Collection Details
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {selectedItem && (
              <>
                <p><strong>ID:</strong> {selectedItem.id}</p>
                <p><strong>Title:</strong> {selectedItem.title}</p>
                <p><strong>Description:</strong> {selectedItem.description}</p>
                <p><strong>Main Image Poster ID:</strong> {selectedItem.image}</p>
                <p><strong>Discount:</strong> {selectedItem.discount}%</p>
                <hr />
                <h6>Posters:</h6>
                <ListGroup>
                  {selectedItem.posters?.map((poster, i) => (
                    <ListGroup.Item
                      key={i}
                      className="d-flex justify-content-between align-items-center"
                    >
                      <div>
                        <strong>{posterDetails[poster.posterId]?.title || poster.posterId}</strong> (ID: {poster.posterId})
                        <br />
                        Size: {poster.size || "N/A"}
                      </div>
                    </ListGroup.Item>
                  ))}
                  {!selectedItem.posters?.length && (
                    <ListGroup.Item className="text-muted">
                      No posters assigned.
                    </ListGroup.Item>
                  )}
                </ListGroup>
              </>
            )}
          </Modal.Body>
        </Modal>
        <Modal
          show={showEditModal}
          onHide={() => setShowEditModal(false)}
          size="lg"
          aria-labelledby="collection-edit-modal-title"
        >
          <Modal.Header closeButton>
            <Modal.Title id="collection-edit-modal-title">
              {selectedItem ? "Edit Collection" : "Create Collection"}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form onSubmit={handleFormSubmit}>
              <Form.Group className="mb-3">
                <Form.Label>Title</Form.Label>
                <Form.Control
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Popular TV Collection"
                  required
                  isInvalid={!!formErrors.title}
                  aria-describedby="collection-title-error"
                />
                <Form.Control.Feedback type="invalid" id="collection-title-error">
                  {formErrors.title}
                </Form.Control.Feedback>
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Description</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  name="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g., Collection of popular TV series posters."
                  required
                  isInvalid={!!formErrors.description}
                  aria-describedby="collection-description-error"
                />
                <Form.Control.Feedback type="invalid" id="collection-description-error">
                  {formErrors.description}
                </Form.Control.Feedback>
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Main Image Poster ID</Form.Label>
                <div className="input-group">
                  <Form.Control
                    type="text"
                    name="image"
                    value={formData.image}
                    onChange={(e) =>
                      handleMainImagePosterIdChange(
                        e.target.value,
                        setFormData,
                        setFormErrors,
                        setPosterDetails,
                        setMainImagePosterTitle,
                        formData,
                        firestore
                      )
                    }
                    placeholder="e.g., main-poster-123"
                    required
                    isInvalid={!!formErrors.image}
                    aria-describedby="collection-main-image-error"
                  />
                  <Button
                    variant="outline-secondary"
                    onClick={() =>
                      handlePasteClipboard(
                        "image",
                        null,
                        (value) =>
                          handleMainImagePosterIdChange(
                            value,
                            setFormData,
                            setFormErrors,
                            setPosterDetails,
                            setMainImagePosterTitle,
                            formData,
                            firestore
                          ),
                        () => {}
                      )
                    }
                    title="Paste from clipboard"
                    dainaria-label="Paste main image poster ID from clipboard"
                  >
                    <BiClipboard />
                  </Button>
                  <Form.Control.Feedback type="invalid" id="collection-main-image-error">
                    {formErrors.image}
                  </Form.Control.Feedback>
                </div>
                {mainImagePosterTitle && (
                  <Form.Text className="text-muted">
                    Poster Title: {mainImagePosterTitle}
                  </Form.Text>
                )}
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Full Pack Discount (%)</Form.Label>
                <Form.Control
                  type="number"
                  name="discount"
                  value={formData.discount}
                  onChange={(e) => setFormData({ ...formData, discount: parseFloat(e.target.value) || 0 })}
                  placeholder="e.g., 20 for 202 off"
                  min="0"
                  max="100"
                  step="0.1"
                  required
                  isInvalid={!!formErrors.discount}
                  aria-describedby="collection-discount-error"
                />
                <Form.Control.Feedback type="invalid" id="collection-discount-error">
                  {formErrors.discount}
                </Form.Control.Feedback>
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Posters</Form.Label>
                {formData.posters.map((poster, index) => {
                  const posterError = formErrors.posters?.find((pErr) => pErr.index === index);
                  return (
                    <div key={index} className="d-flex align-items-center gap-2 mb-2">
                      <div className="input-group flex-grow-1">
                        <Form.Control
                          type="text"
                          value={poster.posterId}
                          onChange={(e) =>
                            handlePosterIdChange(
                              index,
                              e.target.value,
                              setFormData,
                              setPosterDetails,
                              setFormErrors,
                              formData,
                              firestore
                            )
                          }
                          placeholder="e.g., tv-series-poster-123"
                          required
                          isInvalid={!!posterError?.errors?.posterId}
                          aria-describedby={`collection-poster-id-error-${index}`}
                        />
                        <Button
                          variant="outline-secondary"
                          onClick={() =>
                            handlePasteClipboard(
                              "posterId",
                              index,
                              null,
                              (idx, value) =>
                                handlePosterIdChange(
                                  idx,
                                  value,
                                  setFormData,
                                  setPosterDetails,
                                  setFormErrors,
                                  formData,
                                  firestore
                                )
                            )
                          }
                          title="Paste from clipboard"
                          aria-label="Paste poster ID from clipboard"
                        >
                          <BiClipboard />
                        </Button>
                        <Form.Control.Feedback type="invalid" id={`collection-poster-id-error-${index}`}>
                          {posterError?.errors?.posterId}
                        </Form.Control.Feedback>
                      </div>
                      <Form.Select
                        name={`poster-size-${index}`}
                        value={poster.size}
                        onChange={(e) =>
                          handleSizeChange(
                            index,
                            e.target.value,
                            formData,
                            posterDetails,
                            setFormData,
                            setFormErrors
                          )
                        }
                        required
                        disabled={!posterDetails[poster.posterId]?.sizes?.length}
                        isInvalid={!!posterError?.errors?.size}
                        aria-describedby={`collection-poster-size-error-${index}`}
                        style={{ minWidth: "120px" }}
                      >
                        <option value="">Select size</option>
                        {posterDetails[poster.posterId]?.sizes?.map((s, i) => (
                          <option key={i} value={s.size}>
                            {s.size}
                          </option>
                        ))}
                      </Form.Select>
                      <Form.Control.Feedback type="invalid" id={`collection-poster-size-error-${index}`}>
                        {posterError?.errors?.size}
                      </Form.Control.Feedback>
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => handleRemovePoster(index)}
                        aria-label="Remove poster"
                        disabled={formData.posters.length <= 1}
                      >
                        <BiTrash />
                      </Button>
                    </div>
                  );
                })}
                <Button
                  variant="outline-primary"
                  size="sm"
                  onClick={handleAddPoster}
                  className="mt-2"
                  aria-label="Add poster"
                >
                  <BiPlus /> Add Poster
                </Button>
              </Form.Group>
              <Button type="submit" variant="primary">
                {selectedItem ? "Update" : "Create"} Collection
              </Button>
            </Form>
          </Modal.Body>
        </Modal>
        <Modal
          show={showDeleteModal}
          onHide={() => setShowDeleteModal(false)}
          aria-labelledby="collection-delete-modal-title"
        >
          <Modal.Header closeButton>
            <Modal.Title id="collection-delete-modal-title">
              Confirm Delete
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p>
              Are you sure you want to delete collection <strong>{selectedItem?.title}</strong>? This action cannot be undone.
            </p>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                handleDelete(selectedItem, firestore, setCollections, setSubmissionError);
                setShowDeleteModal(false);
              }}
              aria-label="Confirm delete collection"
            >
              Delete
            </Button>
          </Modal.Footer>
        </Modal>
      </div>
    </div>
  );
};

CollectionsPacks.propTypes = {
  filter: PropTypes.shape({
    search: PropTypes.string,
  }).isRequired,
};

CollectionsPacks.defaultProps = {
  filter: { search: "" },
};

export default CollectionsPacks;