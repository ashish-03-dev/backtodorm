import React, { useState } from "react";
import PropTypes from "prop-types";
import { ListGroup, Button, Modal, Form, Collapse } from "react-bootstrap";
import { BiPlus, BiClipboard, BiTrash, BiImage, BiChevronDown, BiChevronUp } from "react-icons/bi";
import { doc, getDoc } from "firebase/firestore";
import { useFirebase } from "../../../context/FirebaseContext";

const StandaloneCollectionsTab = ({
  collections,
  setCollections,
  filter,
  posterImages,
  setPosterImages,
  validateForm,
  handleSubmit,
  handleDelete,
  handleFetchImage,
}) => {
  const { firestore } = useFirebase();
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [formData, setFormData] = useState({
    id: "",
    title: "",
    description: "",
    image: "", // Stores posterId
    posters: [], // Array of { posterId, size, price }
    discount: 20, // Default discount percentage
  });
  const [formErrors, setFormErrors] = useState({});
  const [formPosterImages, setFormPosterImages] = useState({});
  const [posterDetails, setPosterDetails] = useState({}); // Cache poster details { posterId: { title, imageUrl, sizes: [{ size, price, finalPrice }] } }
  const [activePoster, setActivePoster] = useState(0);
  const [mainImagePosterTitle, setMainImagePosterTitle] = useState("");
  const [submissionError, setSubmissionError] = useState(null);

  const filteredCollections = collections.filter((collection) =>
    (collection?.title || collection?.id || "").toLowerCase().includes((filter?.search || "").toLowerCase())
  );
  const isFiltering = !!filter?.search?.trim();

  // Helper to ensure string or empty string
  const ensureString = (value) => (typeof value === "string" ? value : "");

  // Validate Firestore document ID
  const isValidDocumentId = (id) => {
    return id && /^[a-zA-Z0-9_-]+$/.test(id.trim());
  };

  const handleShowDetail = (item) => {
    setSelectedItem(item);
    setShowDetailModal(true);
  };

  const handleEdit = (item = null) => {
    setSelectedItem(item);
    const initialFormData = {
      id: ensureString(item?.id),
      title: ensureString(item?.title),
      description: ensureString(item?.description),
      image: ensureString(item?.image),
      posters: Array.isArray(item?.posters)
        ? item.posters.map((p) => ({
          posterId: ensureString(p.posterId || p), // Handle legacy string arrays
          size: ensureString(p.size),
          price: Number.isFinite(p.price) ? p.price : 0,
        }))
        : [],
      discount: Number.isFinite(item?.discount) ? item.discount : 20,
    };
    setFormData(initialFormData);
    setFormErrors({});
    setSubmissionError(null);
    setMainImagePosterTitle("");
    setPosterDetails({});
    setFormPosterImages({});

    // Fetch poster details
    if (initialFormData.image) {
      fetchPosterData(initialFormData.image, null);
    }
    initialFormData.posters.forEach((poster, index) => {
      if (poster.posterId) fetchPosterData(poster.posterId, index);
    });
    setActivePoster(0);
    setShowEditModal(true);
  };

  const handleDeleteModal = (item) => {
    setSelectedItem(item);
    setShowDeleteModal(true);
  };

  const handleAddPoster = () => {
    setFormData((prev) => ({
      ...prev,
      posters: [...prev.posters, { posterId: "", size: "", price: 0 }],
    }));
    setActivePoster(formData.posters.length);
  };

  const handleRemovePoster = (index) => {
    setFormData((prev) => ({
      ...prev,
      posters: prev.posters.filter((_, i) => i !== index),
    }));
    setFormErrors((prev) => ({
      ...prev,
      posters: prev.posters?.filter((pErr) => pErr.index !== index),
    }));
    setPosterDetails((prev) => {
      const newDetails = { ...prev };
      const id = ensureString(formData.posters[index].posterId);
      delete newDetails[id];
      return newDetails;
    });
    setFormPosterImages((prev) => {
      const newImages = { ...prev };
      const id = ensureString(formData.posters[index].posterId);
      delete newImages[id];
      return newImages;
    });
    if (activePoster >= index && activePoster > 0) {
      setActivePoster(activePoster - 1);
    }
  };

  const fetchPosterData = async (posterId, index) => {
    const safePosterId = ensureString(posterId).trim();
    if (!firestore || !safePosterId || !isValidDocumentId(safePosterId)) {
      if (index !== null) {
        setFormErrors((prev) => ({
          ...prev,
          posters: [
            ...(prev.posters?.filter((pErr) => pErr.index !== index) || []),
            { index, errors: { posterId: safePosterId ? "Invalid Poster ID format." : "Poster ID is required." } },
          ],
        }));
      } else {
        setFormErrors((prev) => ({
          ...prev,
          image: safePosterId ? "Invalid Poster ID format." : "Poster ID is required.",
        }));
      }
      return;
    }

    try {
      const posterRef = doc(firestore, "posters", safePosterId);
      const posterSnap = await getDoc(posterRef);

      if (posterSnap.exists()) {
        const posterData = posterSnap.data();
        if (!posterData.imageUrl) {
          if (index !== null) {
            setFormErrors((prev) => ({
              ...prev,
              posters: [
                ...(prev.posters?.filter((pErr) => pErr.index !== index) || []),
                { index, errors: { posterId: "Poster has no image URL." } },
              ],
            }));
          } else {
            setFormErrors((prev) => ({
              ...prev,
              image: "Poster has no image URL.",
            }));
          }
        } else {
          const sizes = Array.isArray(posterData.sizes) ? posterData.sizes : [];
          setPosterDetails((prev) => ({
            ...prev,
            [safePosterId]: {
              id: safePosterId,
              title: ensureString(posterData.title),
              imageUrl: ensureString(posterData.imageUrl),
              sizes: sizes.map((s) => ({
                size: ensureString(s.size),
                price: Number.isFinite(s.price) ? s.price : 0,
                finalPrice: Number.isFinite(s.finalPrice) ? s.finalPrice : s.price || 0,
              })),
            },
          }));
          setFormPosterImages((prev) => ({
            ...prev,
            [safePosterId]: posterData.imageUrl,
          }));
          setPosterImages((prev) => ({
            ...prev,
            [safePosterId]: posterData.imageUrl,
          }));
          if (index === null) {
            setMainImagePosterTitle(ensureString(posterData.title));
            setFormErrors((prev) => ({ ...prev, image: null }));
          } else {
            // Update price if size is selected
            const currentPoster = formData.posters[index];
            let price = currentPoster.price || 0;
            if (currentPoster.size && sizes.length) {
              const selectedSize = sizes.find((s) => s.size === currentPoster.size);
              price = selectedSize ? (Number.isFinite(selectedSize.finalPrice) ? selectedSize.finalPrice : selectedSize.price || 0) : 0;
            }
            setFormData((prev) => ({
              ...prev,
              posters: prev.posters.map((p, i) => (i === index ? { ...p, price } : p)),
            }));
            setFormErrors((prev) => ({
              ...prev,
              posters: prev.posters?.map((pErr) =>
                pErr.index === index
                  ? { ...pErr, errors: { ...pErr.errors, posterId: null, size: sizes.length && !currentPoster.size ? "Size is required." : null } }
                  : pErr
              ) || [],
            }));
          }
          handleFetchImage(posterData.imageUrl, setFormPosterImages);
        }
      } else {
        if (index !== null) {
          setFormErrors((prev) => ({
            ...prev,
            posters: [
              ...(prev.posters?.filter((pErr) => pErr.index !== index) || []),
              { index, errors: { posterId: "Poster ID does not exist." } },
            ],
          }));
        } else {
          setFormErrors((prev) => ({
            ...prev,
            image: "Poster ID does not exist.",
          }));
          setMainImagePosterTitle("");
        }
      }
    } catch (err) {
      if (index !== null) {
        setFormErrors((prev) => ({
          ...prev,
          posters: [
            ...(prev.posters?.filter((pErr) => pErr.index !== index) || []),
            { index, errors: { posterId: `Failed to fetch poster: ${err.message}` } },
          ],
        }));
      } else {
        setFormErrors((prev) => ({
          ...prev,
          image: `Failed to fetch poster: ${err.message}`,
        }));
        setMainImagePosterTitle("");
      }
    }
  };

  const handleMainImagePosterIdChange = (value) => {
    const safeValue = ensureString(value);
    setFormData((prev) => ({ ...prev, image: safeValue }));
    if (safeValue && isValidDocumentId(safeValue)) {
      fetchPosterData(safeValue, null);
    } else {
      setMainImagePosterTitle("");
      setFormErrors((prev) => ({
        ...prev,
        image: safeValue ? "Invalid Poster ID format." : null,
      }));
      setPosterDetails((prev) => {
        const newDetails = { ...prev };
        delete newDetails[formData.image];
        return newDetails;
      });
      setFormPosterImages((prev) => {
        const newImages = { ...prev };
        delete newImages[formData.image];
        return newImages;
      });
    }
  };

  const handlePosterIdChange = (index, value) => {
    const safeValue = ensureString(value);
    setFormData((prev) => ({
      ...prev,
      posters: prev.posters.map((p, i) => (i === index ? { posterId: safeValue, size: "", price: 0 } : p)),
    }));
    if (safeValue && isValidDocumentId(safeValue)) {
      fetchPosterData(safeValue, index);
    } else {
      setPosterDetails((prev) => {
        const newDetails = { ...prev };
        delete newDetails[formData.posters[index].posterId];
        return newDetails;
      });
      setFormPosterImages((prev) => {
        const newImages = { ...prev };
        delete newImages[formData.posters[index].posterId];
        return newImages;
      });
      setFormErrors((prev) => ({
        ...prev,
        posters: prev.posters?.filter((pErr) => pErr.index !== index) || [],
      }));
    }
  };

  const handleSizeChange = (index, size) => {
    const posterId = formData.posters[index].posterId;
    const sizes = posterDetails[posterId]?.sizes || [];
    const selectedSize = sizes.find((s) => s.size === size);
    const price = selectedSize ? (Number.isFinite(selectedSize.finalPrice) ? selectedSize.finalPrice : selectedSize.price || 0) : 0;
    setFormData((prev) => ({
      ...prev,
      posters: prev.posters.map((p, i) => (i === index ? { ...p, size, price } : p)),
    }));
    setFormErrors((prev) => ({
      ...prev,
      posters: prev.posters?.map((pErr) =>
        pErr.index === index
          ? { ...pErr, errors: { ...pErr.errors, size: size ? null : "Size is required." } }
          : pErr
      ) || [],
    }));
  };

  const handlePasteClipboard = async (key, index = null) => {
    try {
      const text = await navigator.clipboard.readText();
      const safeText = ensureString(text).trim();
      if (safeText && isValidDocumentId(safeText)) {
        if (key === "image") {
          handleMainImagePosterIdChange(safeText);
        } else if (index !== null && key === "posterId") {
          handlePosterIdChange(index, safeText);
        }
      } else {
        alert("Invalid clipboard content: Must be a valid document ID (alphanumeric, underscores, or hyphens).");
      }
    } catch {
      alert("Failed to paste from clipboard.");
    }
  };

  const handleViewImage = (id) => {
    const safeId = ensureString(id);
    const imageUrl = formPosterImages[safeId] || posterImages[safeId];
    if (safeId && imageUrl) {
      window.open(imageUrl, "_blank", "noopener,noreferrer");
    } else {
      alert("Invalid ID: No image found.");
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setSubmissionError(null);
    const errors = await validateForm(formData, selectedItem);

    setFormErrors(errors);

    if (!Object.keys(errors).length) {
      try {
        await handleSubmit(formData, selectedItem);
        setShowEditModal(false);
      } catch (err) {
        console.error("Submission failed:", err);
        setSubmissionError(`Failed to save collection: ${err.message}`);
      }
    }
  };

  const togglePoster = (index) => {
    setActivePoster(activePoster === index ? null : index);
  };

  return (
    <div className="border rounded p-3" style={{ maxHeight: "600px", overflowY: "auto" }}>
      <div className="d-flex justify-content-end mb-3">
        <Button variant="primary" onClick={() => handleEdit()} aria-label="Create new standalone collection">
          Create Standalone Collection
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
              <strong>{collection.title}</strong>
              <div className="text-muted small">Posters: {collection?.posters?.length || 0}, Discount: {collection?.discount || 20}%</div>
            </div>
            <div>
              <Button
                variant="outline-primary"
                size="sm"
                className="me-2"
                onClick={() => handleShowDetail(collection)}
                aria-label={`View standalone collection ${collection.title}`}
              >
                View
              </Button>
              <Button
                variant="outline-secondary"
                size="sm"
                className="me-2"
                onClick={() => handleEdit(collection)}
                aria-label={`Edit standalone collection ${collection.title}`}
              >
                Edit
              </Button>
              <Button
                variant="outline-danger"
                size="sm"
                onClick={() => handleDeleteModal(collection)}
                aria-label={`Delete standalone collection ${collection.title}`}
              >
                Delete
              </Button>
            </div>
          </ListGroup.Item>
        ))}
        {!filteredCollections.length && (
          <ListGroup.Item className="text-center text-muted">
            {isFiltering ? "No matching collections." : "No standalone collections found."}
          </ListGroup.Item>
        )}
      </ListGroup>
      <Modal
        show={showDetailModal}
        onHide={() => setShowDetailModal(false)}
        aria-labelledby="standalone-collection-detail-modal-title"
      >
        <Modal.Header closeButton>
          <Modal.Title id="standalone-collection-detail-modal-title">Standalone Collection Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedItem && (
            <>
              <p><strong>ID:</strong> {selectedItem.id}</p>
              <p><strong>Title:</strong> {selectedItem.title}</p>
              <p><strong>Description:</strong> {selectedItem.description}</p>
              <p><strong>Discount:</strong> {selectedItem.discount || 20}%</p>
              <p>
                <strong>Main Image (Poster ID):</strong>{" "}
                {selectedItem.image ? (
                  <>
                    {selectedItem.image}{" "}
                    {posterImages[selectedItem.image] ? (
                      <Button
                        variant="link"
                        onClick={() => handleViewImage(selectedItem.image)}
                        aria-label={`View main image for collection ${selectedItem.title}`}
                      >
                        View Image
                      </Button>
                    ) : (
                      "No image available"
                    )}
                  </>
                ) : (
                  "No poster ID set"
                )}
              </p>
              <hr />
              <h6>Posters:</h6>
              <ListGroup>
                {selectedItem.posters?.map((poster, i) => (
                  <ListGroup.Item key={i} className="d-flex justify-content-between align-items-center">
                    <div>
                      <strong>{posterDetails[poster.posterId]?.title || poster.posterId}</strong> (ID: {poster.posterId})<br />
                      Size: {poster.size || "N/A"}<br />
                      Price: ₹{poster.price || "N/A"}
                    </div>
                    {posterImages[poster.posterId] && (
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => handleViewImage(poster.posterId)}
                        title="View poster image"
                        aria-label={`View image for poster ${posterDetails[poster.posterId]?.title || poster.posterId}`}
                      >
                        <BiImage />
                      </Button>
                    )}
                  </ListGroup.Item>
                ))}
                {!selectedItem.posters?.length && (
                  <ListGroup.Item className="text-muted">No posters assigned.</ListGroup.Item>
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
        aria-labelledby="standalone-collection-edit-modal-title"
      >
        <Modal.Header closeButton>
          <Modal.Title id="standalone-collection-edit-modal-title">
            {selectedItem ? "Edit Standalone Collection" : "Create Standalone Collection"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleFormSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Collection ID</Form.Label>
              <Form.Control
                type="text"
                name="id"
                value={formData.id}
                onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                placeholder="e.g., nature-landscapes"
                required
                disabled={!!selectedItem}
                isInvalid={!!formErrors.id}
                aria-describedby="standalone-collection-id-error"
              />
              <Form.Control.Feedback type="invalid" id="standalone-collection-id-error">
                {formErrors.id}
              </Form.Control.Feedback>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Title</Form.Label>
              <Form.Control
                type="text"
                name="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Nature Landscapes"
                required
                isInvalid={!!formErrors.title}
                aria-describedby="standalone-collection-title-error"
              />
              <Form.Control.Feedback type="invalid" id="standalone-collection-title-error">
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
                placeholder="e.g., Serene and beautiful views of nature."
                required
                isInvalid={!!formErrors.description}
                aria-describedby="standalone-collection-description-error"
              />
              <Form.Control.Feedback type="invalid" id="standalone-collection-description-error">
                {formErrors.description}
              </Form.Control.Feedback>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Full Pack Discount (%)</Form.Label>
              <Form.Control
                type="number"
                name="discount"
                value={formData.discount}
                onChange={(e) => setFormData({ ...formData, discount: parseFloat(e.target.value) || 0 })}
                placeholder="e.g., 20 for 20% off"
                min="0"
                max="100"
                step="0.1"
                required
                isInvalid={!!formErrors.discount}
                aria-describedby="standalone-collection-discount-error"
              />
              <Form.Control.Feedback type="invalid" id="standalone-collection-discount-error">
                {formErrors.discount}
              </Form.Control.Feedback>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Main Image (Poster ID)</Form.Label>
              <div className="input-group">
                <Form.Control
                  type="text"
                  value={formData.image}
                  onChange={(e) => handleMainImagePosterIdChange(e.target.value)}
                  placeholder="e.g., nature-poster-123"
                  required
                  isInvalid={!!formErrors.image}
                  aria-describedby="standalone-collection-main-image-poster-id-error"
                />
                <Button
                  variant="outline-secondary"
                  onClick={() => handlePasteClipboard("image")}
                  title="Paste from clipboard"
                  aria-label="Paste main image poster ID from clipboard"
                >
                  <BiClipboard />
                </Button>
                <Button
                  variant="outline-primary"
                  onClick={() => handleViewImage(formData.image)}
                  title="View image"
                  disabled={
                    !formData.image.trim() ||
                    formPosterImages[formData.image] === null ||
                    (!formPosterImages[formData.image] && !posterImages[formData.image])
                  }
                  aria-label="View main image for collection"
                >
                  {formPosterImages[formData.image] === null ? "Loading..." : <BiImage />}
                </Button>
              </div>
              <Form.Control.Feedback type="invalid" id="standalone-collection-main-image-poster-id-error">
                {formErrors.image}
              </Form.Control.Feedback>
              {mainImagePosterTitle && (
                <div className="mt-2">
                  <strong>Poster Title:</strong> {mainImagePosterTitle}
                </div>
              )}
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Posters</Form.Label>
              {formData.posters.map((poster, index) => {
                const posterError = formErrors.posters?.find((pErr) => pErr.index === index);
                const isOpen = activePoster === index;
                return (
                  <div key={index} className="border rounded p-3 mb-3">
                    <div
                      className="d-flex justify-content-between align-items-center cursor-pointer"
                      onClick={() => togglePoster(index)}
                      aria-controls={`poster-collapse-${index}`}
                      aria-expanded={isOpen}
                      style={{ cursor: "pointer" }}
                    >
                      <h6 className="mb-0">{posterDetails[poster.posterId]?.title || `Poster ${index + 1}`}</h6>
                      <span>{isOpen ? <BiChevronUp /> : <BiChevronDown />}</span>
                    </div>
                    <Collapse in={isOpen}>
                      <div id={`poster-collapse-${index}`}>
                        <Form.Group className="mb-2 mt-3">
                          <Form.Label>Poster ID</Form.Label>
                          <div className="input-group">
                            <Form.Control
                              type="text"
                              value={poster.posterId}
                              onChange={(e) => handlePosterIdChange(index, e.target.value)}
                              placeholder="e.g., nature-poster-123"
                              required
                              isInvalid={!!posterError?.errors?.posterId}
                              aria-describedby={`standalone-collection-poster-id-error-${index}`}
                            />
                            <Button
                              variant="outline-secondary"
                              onClick={() => handlePasteClipboard("posterId", index)}
                              title="Paste from clipboard"
                              aria-label="Paste poster ID from clipboard"
                            >
                              <BiClipboard />
                            </Button>
                            <Button
                              variant="outline-primary"
                              onClick={() => handleViewImage(poster.posterId)}
                              title="View poster image"
                              disabled={
                                !poster.posterId.trim() ||
                                formPosterImages[poster.posterId] === null ||
                                (!formPosterImages[poster.posterId] && !posterImages[poster.posterId])
                              }
                              aria-label={`View image for poster ${posterDetails[poster.posterId]?.title || poster.posterId}`}
                            >
                              {formPosterImages[poster.posterId] === null ? "Loading..." : <BiImage />}
                            </Button>
                          </div>
                          <Form.Control.Feedback type="invalid" id={`standalone-collection-poster-id-error-${index}`}>
                            {posterError?.errors?.posterId}
                          </Form.Control.Feedback>
                        </Form.Group>
                        {posterDetails[poster.posterId]?.sizes?.length > 0 ? (
                          <Form.Group className="mb-2">
                            <Form.Label>Size</Form.Label>
                            <Form.Select
                              name={`poster-size-${index}`} // Added name attribute
                              value={poster.size}
                              onChange={(e) => handleSizeChange(index, e.target.value)}
                              required
                              isInvalid={!!posterError?.errors?.size}
                              aria-describedby={`standalone-collection-poster-size-error-${index}`}
                            >
                              <option value="">Select size</option>
                              {posterDetails[poster.posterId].sizes.map((s, i) => (
                                <option key={i} value={s.size}>
                                  {s.size} (₹{s.finalPrice || s.price})
                                </option>
                              ))}
                            </Form.Select>
                            <Form.Control.Feedback type="invalid" id={`standalone-collection-poster-size-error-${index}`}>
                              {posterError?.errors?.size}
                            </Form.Control.Feedback>
                          </Form.Group>
                        ) : (
                          poster.posterId && (
                            <div className="text-danger mb-2" id={`standalone-collection-poster-size-error-${index}`}>
                              No sizes available for this poster.
                            </div>
                          )
                        )}
                        {posterDetails[poster.posterId] && (
                          <>
                            <Form.Group className="mb-2">
                              <Form.Label>Poster Title</Form.Label>
                              <Form.Control
                                type="text"
                                value={posterDetails[poster.posterId].title}
                                readOnly
                                placeholder="Fetched from poster"
                              />
                            </Form.Group>
                            <Form.Group className="mb-2">
                              <Form.Label>Poster Price (₹)</Form.Label>
                              <Form.Control
                                type="number"
                                value={poster.price}
                                readOnly
                                placeholder="Select a size"
                              />
                            </Form.Group>
                          </>
                        )}
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => handleRemovePoster(index)}
                          aria-label="Remove poster"
                        >
                          <BiTrash /> Remove Poster
                        </Button>
                      </div>
                    </Collapse>
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
        aria-labelledby="standalone-collection-delete-modal-title"
      >
        <Modal.Header closeButton>
          <Modal.Title id="standalone-collection-delete-modal-title">Confirm Delete</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>
            Are you sure you want to delete standalone collection <strong>{selectedItem?.title}</strong>? This action cannot be undone.
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
            aria-label="Confirm delete standalone collection"
          >
            Delete
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

StandaloneCollectionsTab.propTypes = {
  collections: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      title: PropTypes.string,
      description: PropTypes.string,
      image: PropTypes.string,
      posters: PropTypes.arrayOf(
        PropTypes.shape({
          posterId: PropTypes.string,
          size: PropTypes.string,
          price: PropTypes.number,
        })
      ),
      discount: PropTypes.number,
      type: PropTypes.string,
    })
  ).isRequired,
  setCollections: PropTypes.func.isRequired,
  filter: PropTypes.shape({
    search: PropTypes.string,
  }).isRequired,
  posterImages: PropTypes.object.isRequired,
  setPosterImages: PropTypes.func.isRequired,
  validateForm: PropTypes.func.isRequired,
  handleSubmit: PropTypes.func.isRequired,
  handleDelete: PropTypes.func.isRequired,
  handleFetchImage: PropTypes.func.isRequired,
};

StandaloneCollectionsTab.defaultProps = {
  collections: [],
  filter: { search: "" },
};

export default StandaloneCollectionsTab;