import React, { useState, useEffect } from "react";
import { Modal, Button, Form, Badge, ListGroup, Alert } from "react-bootstrap";
import { collection, getDocs, setDoc, doc, deleteDoc, query, where } from "firebase/firestore";
import { useFirebase } from "../../context/FirebaseContext";
import { BiPlus, BiClipboard, BiTrash, BiImage } from "react-icons/bi";

// Debounce utility
const debounce = (func, wait) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

const SectionManager = () => {
  const { firestore } = useFirebase();
  const [sections, setSections] = useState([]);
  const [filter, setFilter] = useState({ search: "" });
  const [selectedSection, setSelectedSection] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [formData, setFormData] = useState({
    sectionId: "",
    posterIds: [""],
  });
  const [formErrors, setFormErrors] = useState({});
  const [error, setError] = useState(null);
  const [posterImages, setPosterImages] = useState({});
  const [formPosterImages, setFormPosterImages] = useState({});

  // Fetch sections and pre-fetch image URLs
  useEffect(() => {
    const fetchSections = async () => {
      try {
        const sectionsSnapshot = await getDocs(collection(firestore, "homeSections"));
        const sectionsData = sectionsSnapshot.docs.map((doc) => ({
          id: doc.id,
          posterIds: doc.data().posterIds || [],
        }));
        setSections(sectionsData);

        // Pre-fetch image URLs
        const allPosterIds = sectionsData.flatMap((section) => section.posterIds);
        const uniquePosterIds = [...new Set(allPosterIds)];
        const chunks = [];
        for (let i = 0; i < uniquePosterIds.length; i += 10) {
          chunks.push(uniquePosterIds.slice(i, i + 10));
        }

        const imageResults = [];
        for (const chunk of chunks) {
          const q = query(
            collection(firestore, "posters"),
            where("id", "in", chunk)
          );
          const querySnap = await getDocs(q);
          querySnap.docs.forEach((doc) => {
            imageResults.push([doc.data().id, doc.data().imageUrl || ""]);
          });
        }
        setPosterImages(Object.fromEntries(imageResults));
      } catch (err) {
        setError("Failed to fetch sections: " + err.message);
      }
    };
    fetchSections();
  }, [firestore]);

  // Debounced fetch for form poster images
  const fetchFormPosterImage = debounce(async (posterId) => {
    if (!posterId || formPosterImages[posterId] !== undefined || posterImages[posterId] !== undefined) {
      return; // Skip if already in formPosterImages or posterImages
    }
    setFormPosterImages((prev) => ({ ...prev, [posterId]: null })); // null indicates loading
    try {
      const q = query(
        collection(firestore, "posters"),
        where("id", "==", posterId)
      );
      const querySnap = await getDocs(q);
      const imageUrl = querySnap.docs.length > 0 ? querySnap.docs[0].data().imageUrl || "" : "";
      setFormPosterImages((prev) => ({ ...prev, [posterId]: imageUrl }));
    } catch (err) {
      console.error(`Failed to fetch poster ${posterId}:`, err);
      setFormPosterImages((prev) => ({ ...prev, [posterId]: "" }));
    }
  }, 300);

  // Update form poster images
  useEffect(() => {
    formData.posterIds.forEach((id) => {
      if (id.trim()) {
        // Use posterImages if available, otherwise fetch
        if (posterImages[id] !== undefined) {
          setFormPosterImages((prev) => ({ ...prev, [id]: posterImages[id] }));
        } else {
          fetchFormPosterImage(id);
        }
      }
    });
  }, [formData.posterIds, posterImages]);

  // Filter sections by search
  const filteredSections = sections.filter((section) =>
    section.id.toLowerCase().includes(filter.search.toLowerCase())
  );

  const isFiltering = filter.search.trim().length > 1;

  // Validate form
  const validateForm = () => {
    const errors = {};
    if (!formData.sectionId.trim()) {
      errors.sectionId = "Section ID is required.";
    } else if (
      !selectedSection &&
      sections.some((s) => s.id === formData.sectionId.trim().toLowerCase())
    ) {
      errors.sectionId = "Section ID already exists.";
    }

    const posterErrors = formData.posterIds.map((id, index) => {
      if (id.trim() && !id.match(/^[a-zA-Z0-9_-]+$/)) {
        return "Invalid ID format (use letters, numbers, -, _).";
      }
      return null;
    });

    if (posterErrors.some((err) => err)) {
      errors.posterIds = posterErrors;
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handlers
  const handleShowDetail = (section) => {
    setSelectedSection(section);
    setShowDetailModal(true);
  };

  const handleShowEdit = (section = null) => {
    setSelectedSection(section);
    setFormData({
      sectionId: section?.id || "",
      posterIds: section?.posterIds.length ? section.posterIds : [""],
    });
    setFormErrors({});
    // Initialize formPosterImages with known posterImages for this section
    if (section?.posterIds.length) {
      const initialImages = {};
      section.posterIds.forEach((id) => {
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
      posterIds: prev.posterIds.length === 0 ? [""] : [...prev.posterIds, ""],
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
    // Clear formPosterImages for removed posterId
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
      // Use posterImages if available, otherwise fetch
      if (posterImages[value] !== undefined) {
        setFormPosterImages((prev) => ({ ...prev, [value]: posterImages[value] }));
      } else {
        fetchFormPosterImage(value.trim());
      }
    }
    // Clear formPosterImages for changed posterId
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
          posterIds: prev.posterIds?.map((err, i) =>
            i === index ? null : err
          ),
        }));
      } else {
        alert("Clipboard is empty.");
      }
    } catch (err) {
      alert("Failed to access clipboard. Please paste manually.");
    }
  };

  const handleViewImage = (posterId) => {
    const imageUrl = formPosterImages[posterId] || posterImages[posterId];
    if (posterId && imageUrl) {
      window.open(imageUrl, "_blank", "noopener,noreferrer");
    } else {
      alert("Image not available or still loading. Please ensure the Poster ID is valid.");
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const sectionId = formData.sectionId.trim().toLowerCase();
    const posterIds = formData.posterIds.filter((id) => id.trim());

    try {
      await setDoc(doc(firestore, "homeSections", sectionId), { posterIds });
      setSections((prev) =>
        prev.some((s) => s.id === sectionId)
          ? prev.map((s) => (s.id === sectionId ? { id: sectionId, posterIds } : s))
          : [...prev, { id: sectionId, posterIds }]
      );
      // Update posterImages cache
      const newPosterIds = posterIds.filter((id) => !posterImages[id]);
      if (newPosterIds.length) {
        const chunks = [];
        for (let i = 0; i < newPosterIds.length; i += 10) {
          chunks.push(newPosterIds.slice(i, i + 10));
        }
        const imageResults = [];
        for (const chunk of chunks) {
          const q = query(
            collection(firestore, "posters"),
            where("id", "in", chunk)
          );
          const querySnap = await getDocs(q);
          querySnap.docs.forEach((doc) => {
            imageResults.push([doc.data().id, doc.data().imageUrl || ""]);
          });
        }
        setPosterImages((prev) => ({ ...prev, ...Object.fromEntries(imageResults) }));
      }
      setShowEditModal(false);
      setError(null);
    } catch (err) {
      setError("Failed to save section: " + err.message);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteDoc(doc(firestore, "homeSections", selectedSection.id));
      setSections((prev) => prev.filter((s) => s.id !== selectedSection.id));
      setShowDeleteModal(false);
      setError(null);
    } catch (err) {
      setError("Failed to delete section: " + err.message);
    }
  };

  return (
    <div className="container mt-4">
      <h2 className="mb-3">🏠 Home Sections Management</h2>

      {/* FILTERS */}
      <div className="row g-3 mb-3">
        <div className="col-md-5">
          <Form.Control
            type="text"
            placeholder="Search by Section ID"
            value={filter.search}
            onChange={(e) =>
              setFilter((prev) => ({ ...prev, search: e.target.value }))
            }
          />
        </div>
        <div className="col-md-7 text-end">
          <Button variant="primary" onClick={() => handleShowEdit(null)}>
            + Create Section
          </Button>
        </div>
      </div>

      {/* ERROR ALERT */}
      {error && (
        <div className="alert alert-danger mb-3" role="alert">
          {error}
        </div>
      )}

      {/* TABLE */}
      <div className="table-responsive">
        <table className="table table-hover align-middle">
          <thead className="table-light">
            <tr>
              <th>Section ID</th>
              <th>Poster Count</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredSections.map((section) => (
              <tr key={section.id}>
                <td>{section.id}</td>
                <td>
                  <Badge bg="info">{section.posterIds.length}</Badge>
                </td>
                <td>
                  <Button
                    variant="outline-info"
                    size="sm"
                    className="me-2"
                    onClick={() => handleShowDetail(section)}
                  >
                    View
                  </Button>
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    className="me-2"
                    onClick={() => handleShowEdit(section)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="outline-danger"
                    size="sm"
                    onClick={() => {
                      setSelectedSection(section);
                      setShowDeleteModal(true);
                    }}
                  >
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
            {filteredSections.length === 0 && (
              <tr>
                <td colSpan="3" className="text-center text-muted">
                  No sections found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* SECTION DETAILS MODAL */}
      <Modal show={showDetailModal} onHide={() => setShowDetailModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Section Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedSection && (
            <>
              <p><strong>Section ID:</strong> {selectedSection.id}</p>
              <p><strong>Poster Count:</strong> {selectedSection.posterIds.length}</p>
              <hr />
              <h6>Poster IDs:</h6>
              <ListGroup>
                {selectedSection.posterIds.map((id, i) => (
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
                        onClick={() => window.open(posterImages[id], "_blank", "noopener,noreferrer")}
                        title="View image"
                      >
                        <BiImage />
                      </Button>
                    )}
                  </ListGroup.Item>
                ))}
                {selectedSection.posterIds.length === 0 && (
                  <ListGroup.Item className="text-muted">
                    No posters assigned.
                  </ListGroup.Item>
                )}
              </ListGroup>
            </>
          )}
        </Modal.Body>
      </Modal>

      {/* EDIT/CREATE MODAL */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>{selectedSection ? "Edit" : "Create"} Section</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleEditSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Section ID</Form.Label>
              <Form.Control
                name="sectionId"
                value={formData.sectionId}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, sectionId: e.target.value }))
                }
                placeholder="e.g., trending, popular"
                required
                disabled={!!selectedSection}
                isInvalid={!!formErrors.sectionId}
              />
              <Form.Control.Feedback type="invalid">
                {formErrors.sectionId}
              </Form.Control.Feedback>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Poster IDs</Form.Label>
              {formData.posterIds.length === 0 && (
                <div className="text-muted mb-2">No poster IDs assigned.</div>
              )}
              {formData.posterIds.map((id, index) => (
                <div key={index} className="mb-2 d-flex align-items-center gap-2 poster-entry">
                  <div className="input-group flex-grow-1">
                    <Form.Control
                      placeholder="Poster ID (e.g., poster1)"
                      value={id}
                      onChange={(e) => handlePosterChange(index, e.target.value)}
                      isInvalid={formErrors.posterIds?.[index] || (id.trim() && !formPosterImages[id] && formPosterImages[id] !== null)}
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
                      onClick={() => handleViewImage(id)} // Fixed: Replaced dorp with handleViewImage
                      title="View image"
                      disabled={!id.trim() || (!formPosterImages[id] && !posterImages[id])}
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
                      {formErrors.posterIds?.[index] || (id.trim() && !formPosterImages[id] && formPosterImages[id] !== null ? "Invalid Poster ID: No image found." : "")}
                    </Form.Control.Feedback>
                  </div>
                </div>
              ))}
              <Button
                variant="outline-primary"
                size="sm"
                onClick={handleAddPoster}
                className="mt-2"
              >
                <BiPlus /> Add Poster
              </Button>
            </Form.Group>

            <Button type="submit" variant="success">
              {selectedSection ? "Update Section" : "Create Section"}
            </Button>
          </Form>
        </Modal.Body>
      </Modal>

      {/* DELETE CONFIRMATION MODAL */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Delete</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to delete the section{" "}
          <strong>{selectedSection?.id}</strong>? This action cannot be undone.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete}>
            Delete
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default SectionManager;