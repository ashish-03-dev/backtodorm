import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { ListGroup, Button, Modal, Form, Collapse } from "react-bootstrap";
import { BiPlus, BiClipboard, BiTrash, BiImage, BiChevronDown, BiChevronUp } from "react-icons/bi";
import { collection, getDocs, setDoc, doc, deleteDoc, getDoc } from "firebase/firestore";
import { useFirebase } from "../../../context/FirebaseContext";
import { fetchImages } from "./utils";

// Helper to generate standardized document ID
const generateDocId = (name) => {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/[^a-z0-9-]/g, ''); // Remove special characters
};

// Helper to ensure string or empty string
const ensureString = (value) => (typeof value === "string" ? value : "");

// Validate Firestore document ID
const isValidDocumentId = (id) => {
  return id && /^[a-z0-9-]+$/.test(id.trim());
};

const StandaloneCollectionsTab = ({
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
  const [formData, setFormData] = useState({
    name: "",
    title: "",
    description: "",
    image: "",
    posters: [],
    discount: 20,
  });
  const [formErrors, setFormErrors] = useState({});
  const [formPosterImages, setFormPosterImages] = useState({});
  const [posterDetails, setPosterDetails] = useState({});
  const [activePoster, setActivePoster] = useState(0);
  const [mainImagePosterTitle, setMainImagePosterTitle] = useState("");
  const [submissionError, setSubmissionError] = useState(null);

  // Fetch standalone collections
  useEffect(() => {
    const fetchCollections = async () => {
      if (!firestore) {
        console.log("Firestore not initialized");
        return;
      }
      try {
        const standaloneCollectionsRef = collection(firestore, "standaloneCollections");
        const standaloneSnapshot = await getDocs(standaloneCollectionsRef);
        const collections = standaloneSnapshot.docs.map((d) => ({
          id: d.id,
          type: "standaloneCollection",
          name: ensureString(d.data().name),
          title: ensureString(d.data().title),
          description: ensureString(d.data().description),
          image: ensureString(d.data().image),
          posters: Array.isArray(d.data().posters)
            ? d.data().posters.map((p) => ({
                posterId: ensureString(p.posterId || p),
                size: ensureString(p.size),
                price: Number.isFinite(p.price) ? p.price : 0,
              }))
            : [],
          discount: Number.isFinite(d.data().discount) ? d.data().discount : 20,
          createdAt: d.data().createdAt,
          updatedAt: d.data().updatedAt,
        }));
        setCollections(collections);
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
    (collection?.name || collection?.title || collection?.id || "").toLowerCase().includes((filter?.search || "").toLowerCase())
  );
  const isFiltering = !!filter?.search?.trim();

  const validateForm = async (formData, selectedItem, items) => {
    const errors = {};
    const id = ensureString(formData.id).trim();
    const name = ensureString(formData.name).trim();
    const title = ensureString(formData.title).trim();
    const description = ensureString(formData.description).trim();
    const image = ensureString(formData.image).trim();
    const discount = parseFloat(formData.discount);

    if (!name) {
      errors.name = "Name is required.";
    } else {
      const generatedId = generateDocId(name);
      if (!isValidDocumentId(generatedId)) {
        errors.name = "Name generates an invalid ID. Use alphanumeric characters, spaces, or hyphens.";
      } else if (!selectedItem && items.some((c) => c.id === generatedId)) {
        errors.name = "A collection with this name already exists.";
      }
    }
    if (!id) {
      errors.id = "ID is required.";
    } else if (!isValidDocumentId(id)) {
      errors.id = "Invalid ID format. Use lowercase alphanumeric characters and hyphens only.";
    }
    if (!title) {
      errors.title = "Title is required.";
    }
    if (!description) {
      errors.description = "Description is required.";
    }
    if (!image) {
      errors.image = "Main image poster ID is required.";
    } else if (!isValidDocumentId(image)) {
      errors.image = "Invalid Poster ID format.";
    } else if (firestore) {
      try {
        const posterRef = doc(firestore, "posters", image);
        const posterSnap = await getDoc(posterRef);
        if (!posterSnap.exists()) {
          errors.image = "Poster ID does not exist.";
        } else if (!posterSnap.data().imageUrl) {
          errors.image = "Poster has no image URL.";
        }
      } catch (err) {
        errors.image = `Failed to validate poster: ${err.message}`;
      }
    }
    if (!Number.isFinite(discount) || discount < 0 || discount > 100) {
      errors.discount = "Discount must be a number between 0 and 100.";
    }

    const posterErrors = await Promise.all(
      (formData.posters || []).map(async (poster, index) => {
        const safePosterId = ensureString(poster.posterId).trim();
        const size = ensureString(poster.size).trim();
        const price = parseFloat(poster.price);
        const posterErr = {};
        if (!safePosterId) {
          posterErr.posterId = "Poster ID is required.";
        } else if (!isValidDocumentId(safePosterId)) {
          posterErr.posterId = "Invalid Poster ID format.";
        } else if (firestore) {
          try {
            const posterRef = doc(firestore, "posters", safePosterId);
            const posterSnap = await getDoc(posterRef);
            if (!posterSnap.exists()) {
              posterErr.posterId = "Poster ID does not exist.";
            } else {
              const sizes = Array.isArray(posterSnap.data().sizes) ? posterSnap.data().sizes : [];
              if (!sizes.length) {
                posterErr.posterId = "Poster has no sizes available.";
              } else if (!size) {
                posterErr.size = "Size is required.";
              } else {
                const selectedSize = sizes.find((s) => s.size === size);
                if (!selectedSize) {
                  posterErr.size = "Selected size is not available.";
                } else if (!Number.isFinite(price) || price <= 0) {
                  posterErr.price = "Invalid price for selected size.";
                }
              }
            }
          } catch (err) {
            posterErr.posterId = `Failed to validate poster: ${err.message}`;
          }
        }
        return Object.keys(posterErr).length ? { index, errors: posterErr } : null;
      })
    );
    if (posterErrors.some((err) => err)) {
      errors.posters = posterErrors.filter((err) => err);
    }
    console.log("Validation result:", errors);
    return errors;
  };

  const handleSubmit = async (formData, selectedItem) => {
    try {
      const id = ensureString(formData.id).trim();
      if (!isValidDocumentId(id)) {
        throw new Error("Invalid standalone collection ID format.");
      }
      console.log("Saving collection with ID:", id);
      const newCollection = {
        name: ensureString(formData.name).trim(),
        title: ensureString(formData.title).trim(),
        description: ensureString(formData.description).trim(),
        image: ensureString(formData.image).trim(),
        posters: (formData.posters || []).map((p) => ({
          posterId: ensureString(p.posterId).trim(),
          size: ensureString(p.size).trim(),
          price: parseFloat(p.price) || 0,
        })).filter((p) => p.posterId && p.size),
        discount: parseFloat(formData.discount) || 20,
        createdAt: selectedItem ? selectedItem.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await setDoc(doc(firestore, "standaloneCollections", id), newCollection);
      setCollections((prev) => {
        const newState = prev.some((c) => c.id === id)
          ? prev.map((c) => (c.id === id ? { id, type: "standaloneCollection", ...newCollection } : c))
          : [...prev, { id, type: "standaloneCollection", ...newCollection }];
        console.log("New standaloneCollections state:", newState);
        return newState;
      });

      const newIds = [
        ...(formData.posters || []).map((p) => p.posterId),
        ...(formData.image ? [formData.image] : []),
      ].map(ensureString).filter((id) => id.trim() && !posterImages[id]);
      if (newIds.length) {
        const imageResults = await fetchImages(newIds, firestore);
        setPosterImages((prev) => ({ ...prev, ...Object.fromEntries(imageResults) }));
      }
      setSubmissionError(null);
    } catch (err) {
      console.error("Submission error:", err);
      setSubmissionError(`Failed to save collection: ${err.message}`);
      throw err;
    }
  };

  const handleDelete = async (item) => {
    try {
      await deleteDoc(doc(firestore, "standaloneCollections", item.id));
      setCollections((prev) => prev.filter((c) => c.id !== item.id));
      setSubmissionError(null);
    } catch (err) {
      console.error("Deletion error:", err);
      setSubmissionError(`Failed to delete collection: ${err.message}`);
      throw err;
    }
  };

  const handleShowDetail = (item) => {
    setSelectedItem(item);
    setShowDetailModal(true);
  };

  const handleEdit = (item = null) => {
    setSelectedItem(item);
    const initialFormData = {
      name: ensureString(item?.name),
      title: ensureString(item?.title),
      description: ensureString(item?.description),
      image: ensureString(item?.image),
      posters: Array.isArray(item?.posters)
        ? item.posters.map((p) => ({
            posterId: ensureString(p.posterId || p),
            size: ensureString(p.size),
            price: Number.isFinite(p.price) ? p.price : -1,
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

    if (initialFormData.image) {
      fetchPosterImagesData(initialFormData.image, null);
    }
    initialFormData.posters.forEach((poster, index) => {
      if (poster.posterId) fetchPosterImagesData(poster.posterId, index);
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
      posters: [...prev.posters, { posterId: "", size: "", price: -1 }],
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

  const fetchPosterImagesData = async (posterId, index) => {
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
                price: Number.isFinite(s.price) ? s.price : -1,
                finalPrice: Number.isFinite(s.finalPrice) ? s.finalPrice : s.price || -1,
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
            const currentPoster = formData.posters[index];
            let price = currentPoster.price || -1;
            if (currentPoster.size && sizes.length) {
              const selectedSize = sizes.find((s) => s.size === currentPoster.size);
              price = selectedSize ? (Number.isFinite(selectedSize.finalPrice) ? selectedSize.finalPrice : selectedSize.price || -1) : -1;
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
      fetchPosterImagesData(safeValue, null);
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
      posters: prev.posters.map((p, i) => (i === index ? { posterId: safeValue, size: "", price: -1 } : p)),
    }));
    if (safeValue && isValidDocumentId(safeValue)) {
      fetchPosterImagesData(safeValue, index);
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
    const price = selectedSize ? (Number.isFinite(selectedSize.finalPrice) ? selectedSize.finalPrice : selectedSize.price || -1) : -1;
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
        alert("Invalid clipboard content: Must be a valid document ID (alphanumeric or hyphens).");
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
    console.log("Form submission started");
    setSubmissionError(null);

    console.log("Raw name:", formData.name);
    const generatedId = generateDocId(formData.name || 'unnamed-collection');
    console.log("Collection ID:", generatedId);
    console.log("Is valid ID:", isValidDocumentId(generatedId));
    if (!isValidDocumentId(generatedId)) {
      setFormErrors({ name: "Invalid name format. Use alphanumeric characters, spaces, or hyphens only." });
      return;
    }

    const updatedFormData = {
      ...formData,
      id: generatedId,
    };
    console.log("Updated form data:", updatedFormData);

    const errors = await validateForm(updatedFormData, selectedItem, collections);
    console.log("Validation errors:", errors);
    setFormErrors(errors);

    if (!Object.keys(errors).length) {
      try {
        await handleSubmit(updatedFormData, selectedItem);
        console.log("Submission successful");
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
              <strong>{collection.title} (Name: {collection.name}, ID: {collection.id})</strong>
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
              <p><strong>Name:</strong> {selectedItem.name}</p>
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
                      Price: ₹{poster.price >= 0 ? poster.price : "N/A"}
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
              <Form.Label>Name</Form.Label>
              <Form.Control
                type="text"
                name="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., TV Series"
                required
                isInvalid={!!formErrors.name}
                aria-describedby="standalone-collection-name-error"
              />
              <Form.Text className="text-muted">
                Used to generate the collection ID (e.g., "TV Series" becomes "tv-series").
              </Form.Text>
              <Form.Control.Feedback type="invalid" id="standalone-collection-name-error">
                {formErrors.name}
              </Form.Control.Feedback>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Title</Form.Label>
              <Form.Control
                type="text"
                name="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Popular TV Series Collection"
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
                placeholder="e.g., Collection of popular TV series posters."
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
                  placeholder="e.g., tv-series-poster-123"
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
                              placeholder="e.g., tv-series-poster-123"
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
                              name={`poster-size-${index}`}
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
                                value={poster.price >= 0 ? poster.price : ""}
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
  filter: PropTypes.shape({
    search: PropTypes.string,
  }).isRequired,
  posterImages: PropTypes.object.isRequired,
  setPosterImages: PropTypes.func.isRequired,
  handleFetchImage: PropTypes.func.isRequired,
};

StandaloneCollectionsTab.defaultProps = {
  filter: { search: "" },
};

export default StandaloneCollectionsTab;