import React, { useState } from "react";
import PropTypes from "prop-types";
import { ListGroup, Button, Modal, Form, Alert } from "react-bootstrap";
import { BiPlus, BiClipboard, BiTrash, BiImage, BiRefresh } from "react-icons/bi";
import { collection, query, where, orderBy, limit, getDocs, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { useFirebase } from "../../../context/FirebaseContext";

const SectionsTab = ({
  sections,
  setSections,
  filter,
  posterImages,
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
  const [formData, setFormData] = useState({ id: "", posterIds: [""] });
  const [formErrors, setFormErrors] = useState({});
  const [formPosterImages, setFormPosterImages] = useState({});
  const [updateError, setUpdateError] = useState(null);

  // Define section update rules
  const sectionUpdateRules = {
    trending: [
      { field: "orderCount", direction: "desc" },
      { field: "__name__", direction: "asc" },
    ],
    "new-arrivals": [
      { field: "createdAt", direction: "desc" },
      { field: "__name__", direction: "asc" },
    ],
    default: [
      { field: "createdAt", direction: "desc" },
      { field: "__name__", direction: "asc" },
    ],
  };

  // Ensure sections is an array
  const safeSections = Array.isArray(sections) ? sections : [];
  const filteredSections = safeSections.filter((section) =>
    (section?.id || "").toLowerCase().includes((filter?.search || "").toLowerCase())
  );
  const isFiltering = !!(filter?.search || "").trim();

  const handleInitializeOrderCounts = async () => {
    if (!firestore) {
      setUpdateError("Firestore is not available.");
      return;
    }

    try {
      const snapshot = await getDocs(collection(firestore, "posters"));
      const updates = snapshot.docs.map((docRef) =>
        getDoc(doc(firestore, "posters", docRef.id)).then((posterDoc) => {
          const data = posterDoc.data();
          if (data && data.orderCount === undefined) {
            return updateDoc(doc(firestore, "posters", docRef.id), { orderCount: 0 });
          }
          return Promise.resolve();
        })
      );
      await Promise.all(updates);
      setUpdateError("Successfully initialized order counts for all posters.");
    } catch (err) {
      console.error("Error initializing order counts:", err);
      setUpdateError(`Failed to initialize order counts: ${err.message}`);
    }
  };

  const handleUpdateSection = async (sectionId) => {
    if (!firestore) {
      setUpdateError("Firestore is not available.");
      return;
    }

    try {
      const rules = sectionUpdateRules[sectionId] || sectionUpdateRules.default;
      const queryConstraints = [
        collection(firestore, "posters"),
        where("isActive", "==", true),
        ...rules.map((rule) => orderBy(rule.field, rule.direction)),
        limit(20),
      ];

      const postersQuery = query(...queryConstraints);
      const snapshot = await getDocs(postersQuery);
      const posterDocs = await Promise.all(
        snapshot.docs.map((docRef) => getDoc(doc(firestore, "posters", docRef.id)))
      );

      const posterIds = posterDocs
        .filter((doc) => doc.exists())
        .map((doc) => ({
          id: doc.id,
          orderCount: doc.data().orderCount || 0,
          createdAt: doc.data().createdAt && typeof doc.data().createdAt.toMillis === "function"
            ? doc.data().createdAt.toMillis()
            : 0,
        }))
        .sort((a, b) => {
          for (const rule of rules) {
            const field = rule.field;
            const direction = rule.direction === "desc" ? -1 : 1;
            if (field === "orderCount") {
              if (a.orderCount !== b.orderCount) {
                return (a.orderCount - b.orderCount) * direction;
              }
            } else if (field === "createdAt") {
              if (a.createdAt !== b.createdAt) {
                return (a.createdAt - b.createdAt) * direction;
              }
            } else if (field === "__name__") {
              return a.id.localeCompare(b.id) * direction;
            }
          }
          return 0;
        })
        .map((item) => item.id);

      if (posterIds.length === 0) {
        setUpdateError(`No active posters found for section ${sectionId}.`);
        return;
      }

      const sectionsDocRef = doc(firestore, "homeSections", "sections");
      const sectionsDoc = await getDocs(collection(firestore, "homeSections"));
      const sectionList = sectionsDoc.docs.find((d) => d.id === "sections")?.data().sectionList || [];
      const updatedSection = { id: sectionId, posterIds };
      const updatedSectionList = sectionList.some((s) => s.id === sectionId)
        ? sectionList.map((s) => (s.id === sectionId ? updatedSection : s))
        : [...sectionList, updatedSection];

      await setDoc(sectionsDocRef, { sectionList: updatedSectionList });
      setSections(updatedSectionList.map((item) => ({ ...item, type: "section" })));
      setUpdateError(null);
    } catch (err) {
      console.error(`Error updating section ${sectionId}:`, err);
      setUpdateError(`Failed to update section ${sectionId}: ${err.message}`);
    }
  };

  const handleShowDetail = (item) => {
    if (!item) return;
    setSelectedItem(item);
    setShowDetailModal(true);
  };

  const handleEdit = (item = null) => {
    setSelectedItem(item);
    setFormData({
      id: item?.id || "",
      posterIds: item?.posterIds?.length ? item.posterIds : [""],
    });
    setFormErrors({});
    const initialImages = {};
    if (item?.posterIds?.length) {
      item.posterIds.forEach((id) => {
        if (posterImages?.[id] !== undefined) initialImages[id] = posterImages[id];
      });
    }
    setFormPosterImages(initialImages);
    setShowEditModal(true);
  };

  const handleDeleteModal = (item) => {
    if (item.id === "trending") {
      setUpdateError("The 'trending' section cannot be deleted as it is managed automatically.");
      return;
    }
    setSelectedItem(item);
    setShowDeleteModal(true);
  };

  const handleAddImage = () => {
    setFormData((prev) => ({
      ...prev,
      posterIds: [...prev.posterIds, ""],
    }));
  };

  const handleRemoveImage = (index) => {
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
      const id = formData.posterIds[index];
      delete newImages[id];
      return newImages;
    });
  };

  const handleImageChange = async (index, value) => {
    const oldId = formData.posterIds[index];
    setFormData((prev) => ({
      ...prev,
      posterIds: prev.posterIds.map((id, i) => (i === index ? value : id)),
    }));
    if (value.trim()) {
      if (posterImages?.[value] !== undefined) {
        setFormPosterImages((prev) => ({ ...prev, [value]: posterImages[value] }));
      } else {
        try {
          const posterDoc = await getDoc(doc(firestore, "posters", value.trim()));
          if (posterDoc.exists() && posterDoc.data().imageUrl) {
            setFormPosterImages((prev) => ({ ...prev, [value]: posterDoc.data().imageUrl }));
            handleFetchImage(value.trim(), setFormPosterImages);
          } else {
            setFormPosterImages((prev) => ({ ...prev, [value]: null }));
          }
        } catch (err) {
          console.error(`Error fetching poster ${value}:`, err);
          setFormPosterImages((prev) => ({ ...prev, [value]: null }));
        }
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
          posterIds: prev.posterIds?.map((err, i) => (i === index ? null : err)),
        }));
      } else {
        alert("Clipboard is empty.");
      }
    } catch {
      alert("Failed to paste from clipboard.");
    }
  };

  const handleViewImage = (id) => {
    const imageUrl = formPosterImages[id] || posterImages?.[id];
    if (id && imageUrl) {
      window.open(imageUrl, "_blank", "noopener,noreferrer");
    } else if (id && formPosterImages[id] !== null) {
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
      <div className="d-flex justify-content-end mb-3 gap-2">
        <Button
          variant="primary"
          onClick={() => handleEdit()}
          aria-label="Create new section"
          disabled={!firestore}
        >
          Create Section
        </Button>
        <Button
          variant="outline-secondary"
          onClick={handleInitializeOrderCounts}
          aria-label="Initialize order counts for all posters"
          disabled={!firestore}
        >
          Initialize Order Counts
        </Button>
      </div>
      {updateError && (
        <Alert variant={updateError.includes("Successfully") ? "success" : "danger"} onClose={() => setUpdateError(null)} dismissible>
          {updateError}
        </Alert>
      )}
      <ListGroup>
        {filteredSections.length > 0 ? (
          filteredSections.map((section) => (
            <ListGroup.Item
              key={section.id}
              className="d-flex justify-content-between align-items-center"
            >
              <div>
                <strong>{section.id}</strong>
                <div className="text-muted small">
                  Posters: {section?.posterIds?.length || 0}
                  {section.id === "trending" && " (Managed Automatically)"}
                </div>
              </div>
              <div>
                <Button
                  variant="outline-primary"
                  size="sm"
                  className="me-2"
                  onClick={() => handleShowDetail(section)}
                  aria-label={`View section ${section.id}`}
                >
                  View
                </Button>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  className="me-2"
                  onClick={() => handleEdit(section)}
                  aria-label={`Edit section ${section.id}`}
                >
                  Edit
                </Button>
                <Button
                  variant="outline-primary"
                  size="sm"
                  className="me-2"
                  onClick={() => handleUpdateSection(section.id)}
                  aria-label={`Update section ${section.id}`}
                  disabled={!firestore || (!sectionUpdateRules[section.id] && !sectionUpdateRules.default)}
                >
                  <BiRefresh /> Update
                </Button>
                <Button
                  variant="outline-danger"
                  size="sm"
                  onClick={() => handleDeleteModal(section)}
                  aria-label={`Delete section ${section.id}`}
                  disabled={section.id === "trending"}
                >
                  Delete
                </Button>
              </div>
            </ListGroup.Item>
          ))
        ) : (
          <ListGroup.Item className="text-center text-muted">
            {isFiltering ? "No matching sections." : "No sections found."}
          </ListGroup.Item>
        )}
      </ListGroup>
      <Modal
        show={showDetailModal}
        onHide={() => setShowDetailModal(false)}
        aria-labelledby="section-detail-modal-title"
      >
        <Modal.Header closeButton>
          <Modal.Title id="section-detail-modal-title">Section Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedItem && (
            <>
              <p>
                <strong>Section ID:</strong> {selectedItem.id}
              </p>
              <p>
                <strong>Poster Count:</strong> {selectedItem.posterIds?.length || 0}
              </p>
              <hr />
              <h6>Poster IDs:</h6>
              <ListGroup>
                {selectedItem.posterIds?.length > 0 ? (
                  selectedItem.posterIds.map((id, i) => (
                    <ListGroup.Item
                      key={i}
                      className="d-flex justify-content-between align-items-center"
                    >
                      <span>
                        <strong>ID:</strong> {id}
                      </span>
                      {posterImages?.[id] && (
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={() => handleViewImage(id)}
                          title="View image"
                          aria-label={`View image for poster ${id}`}
                        >
                          <BiImage />
                        </Button>
                      )}
                    </ListGroup.Item>
                  ))
                ) : (
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
        aria-labelledby="section-edit-modal-title"
      >
        <Modal.Header closeButton>
          <Modal.Title id="section-edit-modal-title">
            {selectedItem ? "Edit Section" : "Create Section"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleFormSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Section ID</Form.Label>
              <Form.Control
                type="text"
                name="id"
                value={formData.id}
                onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                placeholder="e.g., trending, popular"
                required
                disabled={!!selectedItem}
                isInvalid={!!formErrors.id}
                aria-describedby="section-id-error"
              />
              <Form.Control.Feedback type="invalid" id="section-id-error">
                {formErrors.id}
              </Form.Control.Feedback>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Poster IDs</Form.Label>
              {!formData.posterIds?.length && (
                <div className="text-muted mb-2">No poster IDs assigned.</div>
              )}
              {formData.posterIds?.map((id, index) => (
                <div key={index} className="mb-2 d-flex align-items-center gap-2">
                  <div className="input-group flex-grow-1">
                    <Form.Control
                      placeholder="Poster ID (e.g., 20-bts--k-pop-set--polaroid-175005907974)"
                      value={id}
                      onChange={(e) => handleImageChange(index, e.target.value)}
                      isInvalid={
                        !!formErrors.posterIds?.[index] ||
                        (id.trim() &&
                          !formPosterImages[id] &&
                          formPosterImages[id] !== null)
                      }
                      aria-describedby={`section-poster-error-${index}`}
                    />
                    <Button
                      variant="outline-secondary"
                      onClick={() => handlePasteClipboard(index)}
                      title="Paste from clipboard"
                      aria-label="Paste poster ID from clipboard"
                    >
                      <BiClipboard />
                    </Button>
                    <Button
                      variant="outline-primary"
                      onClick={() => handleViewImage(id)}
                      title="View image"
                      disabled={
                        !id.trim() ||
                        formPosterImages[id] === null ||
                        !formPosterImages[id]
                      }
                      aria-label={`View image for poster ${id}`}
                    >
                      {formPosterImages[id] === null ? "Loading..." : <BiImage />}
                    </Button>
                    <Button
                      variant="outline-danger"
                      onClick={() => handleRemoveImage(index)}
                      title="Remove poster"
                      aria-label="Remove poster"
                    >
                      <BiTrash />
                    </Button>
                  </div>
                  <Form.Control.Feedback
                    type="invalid"
                    id={`section-poster-error-${index}`}
                  >
                    {formErrors.posterIds?.[index] ||
                      (id.trim() &&
                        !formPosterImages[id] &&
                        formPosterImages[id] !== null
                        ? "Invalid Poster ID"
                        : "")}
                  </Form.Control.Feedback>
                </div>
              ))}
              <Button
                variant="outline-primary"
                size="sm"
                onClick={() => handleAddImage()}
                className="mt-2"
                aria-label="Add poster"
              >
                <BiPlus /> Add Poster
              </Button>
            </Form.Group>
            <Button type="submit" variant="primary">
              {selectedItem ? "Update" : "Create"} Section
            </Button>
          </Form>
        </Modal.Body>
      </Modal>
      <Modal
        show={showDeleteModal}
        onHide={() => setShowDeleteModal(false)}
        aria-labelledby="section-delete-modal-title"
      >
        <Modal.Header closeButton>
          <Modal.Title id="section-delete-modal-title">Confirm Delete</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>
            Are you sure you want to delete section{" "}
            <strong>{selectedItem?.id}</strong>? This action cannot be undone.
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
            aria-label="Confirm delete section"
          >
            Delete
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

SectionsTab.propTypes = {
  sections: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      posterIds: PropTypes.arrayOf(PropTypes.string),
      type: PropTypes.string,
    })
  ),
  setSections: PropTypes.func.isRequired,
  filter: PropTypes.shape({
    search: PropTypes.string,
  }),
  posterImages: PropTypes.object,
  validateForm: PropTypes.func.isRequired,
  handleSubmit: PropTypes.func.isRequired,
  handleDelete: PropTypes.func.isRequired,
  handleFetchImage: PropTypes.func.isRequired,
  firestore: PropTypes.object,
};

SectionsTab.defaultProps = {
  sections: [],
  filter: { search: "" },
  posterImages: {},
};

export default SectionsTab;