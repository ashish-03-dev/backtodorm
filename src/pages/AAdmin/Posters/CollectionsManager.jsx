import React, { useState, useEffect } from "react";
import { Modal, Alert, Button, Form, Badge, ListGroup } from "react-bootstrap";
import { collection, getDocs, setDoc, doc, deleteDoc, query, where } from "firebase/firestore";
import { BiPlus, BiClipboard, BiTrash, BiImage } from "react-icons/bi";
import { useFirebase } from "../../../context/FirebaseContext";

// Debounce utility
const debounce = (func, wait) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

const CollectionsManager = () => {
  const { firestore } = useFirebase();
  const [collections, setCollections] = useState([]);
  const [filter, setFilter] = useState({ search: "" });
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [formData, setFormData] = useState({
    collectionId: "",
    name: "",
    description: "",
    posterIds: [""],
  });
  const [formErrors, setFormErrors] = useState({});
  const [error, setError] = useState(null);
  const [posterImages, setPosterImages] = useState({});
  const [formPosterImages, setFormPosterImages] = useState({});

  // Fetch collections
  useEffect(() => {
    const fetchData = async () => {
      try {
        const collectionsSnapshot = await getDocs(collection(firestore, "collections"));
        const collectionsData = collectionsSnapshot.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name || doc.id,
          description: doc.data().description || "",
          posterIds: doc.data().posterIds || [],
        }));
        setCollections(collectionsData);

        // Pre-fetch image URLs
        const allIds = collectionsData.flatMap((collection) => collection.posterIds);
        const uniqueIds = [...new Set(allIds)];
        const chunks = [];
        for (let i = 0; i < uniqueIds.length; i += 10) {
          chunks.push(uniqueIds.slice(i, i + 10));
        }

        const imageResults = [];
        for (const chunk of chunks) {
          const q = query(collection(firestore, "posters"), where("__name__", "in", chunk));
          const querySnap = await getDocs(q);
          querySnap.forEach((doc) => {
            imageResults.push([doc.id, doc.data().imageUrl || ""]);
          });
        }
        setPosterImages(Object.fromEntries(imageResults));
      } catch (err) {
        setError("Failed to fetch collections: " + err.message);
      }
    };
    if (firestore) fetchData();
  }, [firestore]);

  // Debounced fetch for form poster
  const fetchFormPosterImage = debounce(async (id) => {
    if (!id || formPosterImages[id] !== undefined || posterImages[id] !== undefined) return;
    setFormPosterImages((prev) => ({ ...prev, [id]: null }));
    try {
      const q = query(collection(firestore, "posters"), where("__name__", "==", id));
      const querySnap = await getDocs(q);
      const imageUrl = querySnap.docs.length > 0 ? querySnap.docs[0].data().imageUrl || "" : "";
      setFormPosterImages((prev) => ({ ...prev, [id]: imageUrl }));
    } catch (err) {
      setFormPosterImages((prev) => ({ ...prev, [id]: "" }));
    }
  }, 300);

  // Update form poster images
  useEffect(() => {
    const idsToFetch = formData.posterIds || [];
    idsToFetch.forEach((id) => {
      if (id.trim()) {
        if (posterImages[id] !== undefined) {
          setFormPosterImages((prev) => ({ ...prev, [id]: posterImages[id] }));
        } else {
          fetchFormPosterImage(id);
        }
      }
    });
  }, [formData.posterIds, posterImages]);

  // Filter collections
  const filteredCollections = collections.filter((collection) =>
    collection.name.toLowerCase().includes(filter.search.toLowerCase())
  );
  const isFiltering = filter.search.trim().length > 0;

  // Validate form
  const validateForm = async () => {
    const errors = {};
    if (!formData.collectionId.trim()) {
      errors.collectionId = "Collection ID is required.";
    } else if (
      !selectedCollection &&
      collections.some((c) => c.id === formData.collectionId.trim().toLowerCase())
    ) {
      errors.collectionId = "Collection ID already exists.";
    }
    if (!formData.name.trim()) {
      errors.name = "Collection Name is required.";
    }
    const posterErrors = await Promise.all(
      formData.posterIds.map(async (id, index) => {
        if (!id.trim()) return null;
        if (!id.match(/^[a-zA-Z0-9_-]+$/)) {
          return "Invalid ID format (use letters, numbers, -, _).";
        }
        try {
          const q = query(collection(firestore, "posters"), where("__name__", "==", id));
          const querySnap = await getDocs(q);
          if (querySnap.empty) {
            return "Poster ID does not exist.";
          }
        } catch {
          return "Error validating ID.";
        }
        return null;
      })
    );
    if (posterErrors.some((err) => err)) {
      errors.posterIds = posterErrors;
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handlers
  const handleShowCollectionDetail = (collection) => {
    setSelectedCollection(collection);
    setShowDetailModal(true);
  };

  const handleEditCollection = (collection = null) => {
    setSelectedCollection(collection);
    setFormData({
      collectionId: collection?.id || "",
      name: collection?.name || "",
      description: collection?.description || "",
      posterIds: collection?.posterIds?.length ? collection.posterIds : [""],
    });
    setFormErrors({});
    if (collection?.posterIds?.length) {
      const initialImages = {};
      collection.posterIds.forEach((id) => {
        if (posterImages[id] !== undefined) {
          initialImages[id] = posterImages[id];
        }
      });
      setFormPosterImages(initialImages);
    } else {
      setFormPosterImages({});
    }
    setShowEditModal(true);
  };

  const handleAddPoster = () => {
    setFormData((prev) => ({
      ...prev,
      posterIds: [...prev.posterIds, ""],
    }));
  };

  const handleRemovePoster = (index) => {
    setFormData((prev) => ({
      ...prev,
      posterIds: prev.posterIds.filter((_, i) => i !== index),
    }));
    setFormErrors((prev) => ({
      ...prev,
      posterIds: prev.posterIds?.filter((_, i) => i !== index),
    }));
    setFormPosterImages((prev) => {
      const newImages = { ...prev };
      delete newImages[formData.posterIds[index]];
      return newImages;
    });
  };

  const handlePosterChange = (index, value) => {
    const oldId = formData.posterIds[index];
    setFormData((prev) => ({
      ...prev,
      posterIds: prev.posterIds.map((id, i) => (i === index ? value : id)),
    }));
    if (value.trim()) {
      if (posterImages[value] !== undefined) {
        setFormPosterImages((prev) => ({ ...prev, [value]: posterImages[value] }));
      } else {
        fetchFormPosterImage(value.trim());
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
        handlePosterChange(index, text.trim());
        setFormErrors((prev) => ({
          ...prev,
          posterIds: prev.posterIds?.map((err, i) => (i === index ? null : err)),
        }));
      } else {
        alert("Clipboard is empty.");
      }
    } catch (err) {
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

  const handleCollectionSubmit = async (e) => {
    e.preventDefault();
    if (!(await validateForm())) return;

    const collectionId = formData.collectionId.trim().toLowerCase();
    const posterIds = formData.posterIds.filter((id) => id.trim());
    try {
      await setDoc(doc(firestore, "collections", collectionId), {
        name: formData.name.trim(),
        description: formData.description.trim(),
        posterIds,
      });
      setCollections((prev) =>
        prev.some((c) => c.id === collectionId)
          ? prev.map((c) =>
            c.id === collectionId
              ? { id: collectionId, name: formData.name.trim(), description: formData.description.trim(), posterIds }
              : c
          )
          : [
            ...prev,
            { id: collectionId, name: formData.name.trim(), description: formData.description.trim(), posterIds },
          ]
      );
      const newPosterIds = posterIds.filter((id) => !posterImages[id]);
      if (newPosterIds.length) {
        const chunks = [];
        for (let i = 0; i < newPosterIds.length; i += 10) {
          chunks.push(newPosterIds.slice(i, i + 10));
        }
        const imageResults = [];
        for (const chunk of chunks) {
          const q = query(collection(firestore, "posters"), where("__name__", "in", chunk));
          const querySnap = await getDocs(q);
          querySnap.forEach((doc) => {
            imageResults.push([doc.id, doc.data().imageUrl || ""]);
          });
        }
        setPosterImages((prev) => ({ ...prev, ...Object.fromEntries(imageResults) }));
      }
      setShowEditModal(false);
      setError(null);
    } catch (err) {
      setError("Failed to save collection: " + err.message);
    }
  };

  const handleDeleteCollection = async () => {
    try {
      await deleteDoc(doc(firestore, "collections", selectedCollection.id));
      setCollections((prev) => prev.filter((c) => c.id !== selectedCollection.id));
      setShowDeleteModal(false);
      setError(null);
    } catch (err) {
      setError("Failed to delete collection: " + err.message);
    }
  };

  return (
    <div>
      <div className="row g-3 mb-3">
        <div className="col-md-5">
          <Form.Control
            type="text"
            placeholder="Search by Collection Name/ID"
            value={filter.search}
            onChange={(e) => setFilter((prev) => ({ ...prev, search: e.target.value }))}
          />
        </div>
        <div className="col-md-7 text-end">
          <Button variant="primary" onClick={() => handleEditCollection(null)}>
            + Create Collection
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="danger" className="mb-3">
          {error}
        </Alert>
      )}

      <div className="table-responsive">
        <table className="table table-hover align-middle">
          <thead className="table-light">
            <tr>
              <th>Name</th>
              <th>Poster Count</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredCollections.map((collection) => (
              <tr key={collection.id}>
                <td>{collection.name}</td>
                <td>
                  <Badge bg="info">{collection.posterIds?.length || 0}</Badge>
                </td>
                <td>
                  <Button
                    variant="outline-primary"
                    size="sm"
                    className="me-2"
                    onClick={() => handleShowCollectionDetail(collection)}
                  >
                    View
                  </Button>
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    className="me-2"
                    onClick={() => handleEditCollection(collection)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="outline-danger"
                    size="sm"
                    onClick={() => {
                      setSelectedCollection(collection);
                      setShowDeleteModal(true);
                    }}
                  >
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
            {filteredCollections.length === 0 && (
              <tr>
                <td colSpan="3" className="text-center text-muted">
                  {isFiltering ? "No matching collections." : "No collections found."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* DETAIL MODAL */}
      <Modal show={showDetailModal} onHide={() => setShowDetailModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Collection Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedCollection && (
            <>
              <p><strong>Collection ID:</strong> {selectedCollection.id}</p>
              <p><strong>Name:</strong> {selectedCollection.name}</p>
              <p><strong>Description:</strong> {selectedCollection.description || "No description provided."}</p>
              <p><strong>Poster Count:</strong> {selectedCollection.posterIds?.length || 0}</p>
              <hr />
              <h6>Poster IDs:</h6>
              <ListGroup>
                {selectedCollection.posterIds?.map((id, i) => (
                  <ListGroup.Item
                    key={i}
                    className="d-flex justify-content-between align-items-center"
                  >
                    <span>
                      <strong>ID:</strong> {id}
                    </span>
                    {posterImages[id] && (
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => handleViewImage(id)}
                        title="View image"
                      >
                        <BiImage />
                      </Button>
                    )}
                  </ListGroup.Item>
                ))}
                {selectedCollection.posterIds?.length === 0 && (
                  <ListGroup.Item className="text-muted">No posters assigned.</ListGroup.Item>
                )}
              </ListGroup>
            </>
          )}
        </Modal.Body>
      </Modal>

      {/* EDIT/CREATE MODAL */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>{selectedCollection ? "Edit Collection" : "Create Collection"}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleCollectionSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Collection ID</Form.Label>
              <Form.Control
                name="collectionId"
                value={formData.collectionId}
                onChange={(e) => setFormData((prev) => ({ ...prev, collectionId: e.target.value }))}
                placeholder="e.g., movies, cars"
                required
                disabled={!!selectedCollection}
                isInvalid={!!formErrors.collectionId}
              />
              <Form.Control.Feedback type="invalid">{formErrors.collectionId}</Form.Control.Feedback>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Name</Form.Label>
              <Form.Control
                name="name"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Movies, Cars"
                required
                isInvalid={!!formErrors.name}
              />
              <Form.Control.Feedback type="invalid">{formErrors.name}</Form.Control.Feedback>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="description"
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Enter collection description"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Poster IDs</Form.Label>
              {formData.posterIds?.length === 0 && (
                <div className="text-muted mb-2">No poster IDs assigned.</div>
              )}
              {formData.posterIds?.map((id, index) => (
                <div key={index} className="mb-2 d-flex align-items-center gap-2">
                  <div className="input-group flex-grow-1">
                    <Form.Control
                      placeholder="Poster ID (e.g., 20-bts--k-pop-set--polaroid-prints-1750059077745)"
                      value={id}
                      onChange={(e) => handlePosterChange(index, e.target.value)}
                      isInvalid={
                        formErrors.posterIds?.[index] ||
                        (id.trim() && !formPosterImages[id] && formPosterImages[id] !== null)
                      }
                    />
                    <Button
                      variant="outline-secondary"
                      onClick={() => handlePasteClipboard(index)}
                      title="Paste from clipboard"
                    >
                      <BiClipboard />
                    </Button>
                    <Button
                      variant="outline-primary"
                      onClick={() => handleViewImage(id)}
                      title="View image"
                      disabled={
                        !id.trim() || formPosterImages[id] === null || (!formPosterImages[id] && !posterImages[id])
                      }
                    >
                      {formPosterImages[id] === null ? "Loading..." : <BiImage />}
                    </Button>
                    <Button
                      variant="outline-danger"
                      onClick={() => handleRemovePoster(index)}
                      title="Remove poster"
                    >
                      <BiTrash />
                    </Button>
                    <Form.Control.Feedback type="invalid">
                      {formErrors.posterIds?.[index] ||
                        (id.trim() && !formPosterImages[id] && formPosterImages[id] !== null
                          ? "Invalid Poster ID"
                          : "")}
                    </Form.Control.Feedback>
                  </div>
                </div>
              ))}
              <Button variant="outline-primary" size="sm" onClick={handleAddPoster} className="mt-2">
                <BiPlus /> Add Poster
              </Button>
            </Form.Group>
            <Button type="submit" variant="success">
              {selectedCollection ? "Update Collection" : "Create Collection"}
            </Button>
          </Form>
        </Modal.Body>
      </Modal>

      {/* DELETE CONFIRMATION MODAL */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Deletion</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to delete collection <strong>{selectedCollection?.name}</strong>? This cannot be undone.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDeleteCollection}>
            Delete
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default CollectionsManager;