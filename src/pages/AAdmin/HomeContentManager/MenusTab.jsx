import React, { useState } from "react";
import PropTypes from "prop-types";
import { ListGroup, Button, Modal, Form } from "react-bootstrap";
import { BiPlus, BiClipboard, BiTrash, BiImage } from "react-icons/bi";

const MenusTab = ({
  menus,
  setMenus,
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
  const [formData, setFormData] = useState({
    id: "",
    sections: [{ title: "", items: [{ name: "", link: "" }], images: [{ src: "", alt: "", label: "", link: "" }] }],
  });
  const [formErrors, setFormErrors] = useState({});
  const [formPosterImages, setFormPosterImages] = useState({});

  const filteredMenus = menus.filter((menu) =>
    (menu?.id || "").toLowerCase().includes((filter?.search || "").toLowerCase())
  );
  const isFiltering = !!filter?.search?.trim();

  const handleShowDetail = (item) => {
    setSelectedItem(item);
    setShowDetailModal(true);
  };

  const handleEdit = (item = null) => {
    setSelectedItem(item);
    setFormData({
      id: item?.id || "",
      sections: item?.sections?.length
        ? item.sections
        : [{ title: "", items: [{ name: "", link: "" }], images: [{ src: "", alt: "", label: "", link: "" }] }],
    });
    setFormErrors({});
    const initialImages = {};
    if (item?.sections?.length) {
      item.sections.forEach((sec) => {
        if (sec.images?.length) {
          sec.images.forEach((img) => {
            if (posterImages[img.src] !== undefined) initialImages[img.src] = posterImages[img.src];
          });
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

  const handleAddSection = () => {
    setFormData((prev) => ({
      ...prev,
      sections: [
        ...prev.sections,
        { title: "", items: [{ name: "", link: "" }], images: [{ src: "", alt: "", label: "", link: "" }] },
      ],
    }));
  };

  const handleRemoveSection = (sectionIndex) => {
    setFormData((prev) => ({
      ...prev,
      sections: prev.sections.filter((_, i) => i !== sectionIndex),
    }));
    setFormErrors((prev) => ({
      ...prev,
      sections: prev.sections?.filter((secErr) => secErr.index !== sectionIndex),
    }));
  };

  const handleAddItem = (sectionIndex) => {
    setFormData((prev) => ({
      ...prev,
      sections: prev.sections.map((sec, i) =>
        i === sectionIndex ? { ...sec, items: [...sec.items, { name: "", link: "" }] } : sec
      ),
    }));
  };

  const handleRemoveItem = (sectionIndex, itemIndex) => {
    setFormData((prev) => ({
      ...prev,
      sections: prev.sections.map((sec, i) =>
        i === sectionIndex ? { ...sec, items: sec.items.filter((_, idx) => idx !== itemIndex) } : sec
      ),
    }));
    setFormErrors((prev) => ({
      ...prev,
      sections: prev.sections?.map((secErr) =>
        secErr && secErr.index === sectionIndex
          ? {
              ...secErr,
              errors: { ...secErr.errors, items: secErr.errors.items?.filter((_, idx) => idx !== itemIndex) },
            }
          : secErr
      ),
    }));
  };

  const handleAddImage = (sectionIndex) => {
    setFormData((prev) => ({
      ...prev,
      sections: prev.sections.map((sec, i) =>
        i === sectionIndex ? { ...sec, images: [...sec.images, { src: "", alt: "", label: "", link: "" }] } : sec
      ),
    }));
  };

  const handleRemoveImage = (index, sectionIndex) => {
    setFormData((prev) => ({
      ...prev,
      sections: prev.sections.map((sec, i) =>
        i === sectionIndex ? { ...sec, images: sec.images.filter((_, imgIdx) => imgIdx !== index) } : sec
      ),
    }));
    setFormErrors((prev) => ({
      ...prev,
      sections: prev.sections?.map((secErr) =>
        secErr && secErr.index === sectionIndex
          ? {
              ...secErr,
              errors: { ...secErr.errors, images: secErr.errors.images?.filter((_, imgIdx) => imgIdx !== index) },
            }
          : secErr
      ),
    }));
    setFormPosterImages((prev) => {
      const newImages = { ...prev };
      const id = formData.sections[sectionIndex].images[index].src;
      delete newImages[id];
      return newImages;
    });
  };

  const handleImageChange = (index, value, sectionIndex) => {
    const oldId = formData.sections[sectionIndex].images[index].src;
    setFormData((prev) => ({
      ...prev,
      sections: prev.sections.map((sec, i) =>
        i === sectionIndex
          ? { ...sec, images: sec.images.map((img, imgIdx) => (imgIdx === index ? { ...img, src: value } : img)) }
          : sec
      ),
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

  const handlePasteClipboard = async (index, sectionIndex) => {
    try {
      const text = await navigator.clipboard.readText();
      if (text.trim()) {
        handleImageChange(index, text.trim(), sectionIndex);
        setFormErrors((prev) => ({
          ...prev,
          sections: prev.sections?.map((secErr) =>
            secErr && secErr.index === sectionIndex
              ? {
                  ...secErr,
                  errors: {
                    ...secErr.errors,
                    images: secErr.errors.images?.map((err, i) => (i === index ? null : err)),
                  },
                }
              : secErr
          ),
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
        <Button variant="primary" onClick={() => handleEdit()} aria-label="Create new menu">
          Create Menu
        </Button>
      </div>
      <ListGroup>
        {filteredMenus.map((menu) => (
          <ListGroup.Item
            key={menu.id}
            className="d-flex justify-content-between align-items-center"
          >
            <div>
              <strong>{menu.id}</strong>
              <div className="text-muted small">Sections: {menu?.sections?.length || 0}</div>
            </div>
            <div>
              <Button
                variant="outline-primary"
                size="sm"
                className="me-2"
                onClick={() => handleShowDetail(menu)}
                aria-label={`View menu ${menu.id}`}
              >
                View
              </Button>
              <Button
                variant="outline-secondary"
                size="sm"
                className="me-2"
                onClick={() => handleEdit(menu)}
                aria-label={`Edit menu ${menu.id}`}
              >
                Edit
              </Button>
              <Button
                variant="outline-danger"
                size="sm"
                onClick={() => handleDeleteModal(menu)}
                aria-label={`Delete menu ${menu.id}`}
              >
                Delete
              </Button>
            </div>
          </ListGroup.Item>
        ))}
        {!filteredMenus.length && (
          <ListGroup.Item className="text-center text-muted">
            {isFiltering ? "No matching menus." : "No menus found."}
          </ListGroup.Item>
        )}
      </ListGroup>
      <Modal show={showDetailModal} onHide={() => setShowDetailModal(false)} aria-labelledby="menu-detail-modal-title">
        <Modal.Header closeButton>
          <Modal.Title id="menu-detail-modal-title">Menu Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedItem && (
            <>
              <p>
                <strong>Menu ID:</strong> {selectedItem.id}
              </p>
              <p>
                <strong>Section Count:</strong> {selectedItem.sections?.length || 0}
              </p>
              <hr />
              <h6>Sections:</h6>
              {selectedItem.sections?.map((section, secIdx) => (
                <div key={secIdx} className="mb-3">
                  <h6>{section.title || `Section ${secIdx + 1}`}</h6>
                  <ListGroup>
                    {section.items?.map((item, itemIdx) => (
                      <ListGroup.Item key={itemIdx}>
                        <strong>{item.name}</strong>: {item.link}
                      </ListGroup.Item>
                    ))}
                    {section.images?.map((img, imgIdx) => (
                      <ListGroup.Item
                        key={`img-${imgIdx}`}
                        className="d-flex justify-content-between align-items-center"
                      >
                        <span>
                          <strong>Image:</strong> {img.label || "No label"} ({img.src})
                        </span>
                        {posterImages[img.src] && (
                          <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={() => handleViewImage(img.src)}
                            title="View image"
                            aria-label={`View image for ${img.src}`}
                          >
                            <BiImage />
                          </Button>
                        )}
                      </ListGroup.Item>
                    ))}
                  </ListGroup>
                </div>
              ))}
              {!selectedItem.sections?.length && <p className="text-muted">No sections assigned.</p>}
            </>
          )}
        </Modal.Body>
      </Modal>
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} size="lg" aria-labelledby="menu-edit-modal-title">
        <Modal.Header closeButton>
          <Modal.Title id="menu-edit-modal-title">
            {selectedItem ? "Edit Menu" : "Create Menu"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleFormSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Menu ID</Form.Label>
              <Form.Control
                type="text"
                name="id"
                value={formData.id}
                onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                placeholder="e.g., shopMenu, collectionsMenu"
                required
                disabled={!!selectedItem}
                isInvalid={!!formErrors.id}
                aria-describedby="menu-id-error"
              />
              <Form.Control.Feedback type="invalid" id="menu-id-error">
                {formErrors.id}
              </Form.Control.Feedback>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Menu Sections</Form.Label>
              {formData.sections?.map((section, secIdx) => {
                const sectionError = formErrors.sections?.find((err) => err?.index === secIdx);
                return (
                  <div key={secIdx} className="border rounded p-3 mb-3">
                    <Form.Group className="mb-2">
                      <Form.Label>Section Title</Form.Label>
                      <Form.Control
                        type="text"
                        value={section.title}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            sections: formData.sections.map((s, i) =>
                              i === secIdx ? { ...s, title: e.target.value } : s
                            ),
                          })
                        }
                        placeholder="e.g., Featured Categories"
                        isInvalid={!!sectionError?.errors?.title}
                        aria-describedby={`menu-section-title-error-${secIdx}`}
                      />
                      <Form.Control.Feedback type="invalid" id={`menu-section-title-error-${secIdx}`}>
                        {sectionError?.errors?.title}
                      </Form.Control.Feedback>
                    </Form.Group>
                    <Form.Group className="mb-2">
                      <Form.Label>Items</Form.Label>
                      {section.items.map((item, itemIdx) => (
                        <div key={itemIdx} className="d-flex align-items-center gap-2 mb-2">
                          <Form.Control
                            type="text"
                            placeholder="Item Name"
                            value={item.name}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                sections: formData.sections.map((s, i) =>
                                  i === secIdx
                                    ? {
                                        ...s,
                                        items: s.items.map((it, idx) =>
                                          idx === itemIdx ? { ...it, name: e.target.value } : it
                                        ),
                                      }
                                    : s
                                ),
                              })
                            }
                            isInvalid={sectionError?.errors?.items?.[itemIdx]?.includes("name")}
                            aria-describedby={`menu-item-name-error-${secIdx}-${itemIdx}`}
                          />
                          <Form.Control
                            type="text"
                            placeholder="Item Link"
                            value={item.link}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                sections: formData.sections.map((s, i) =>
                                  i === secIdx
                                    ? {
                                        ...s,
                                        items: s.items.map((it, idx) =>
                                          idx === itemIdx ? { ...it, link: e.target.value } : it
                                        ),
                                      }
                                    : s
                                ),
                              })
                            }
                            isInvalid={sectionError?.errors?.items?.[itemIdx]?.includes("link")}
                            aria-describedby={`menu-item-link-error-${secIdx}-${itemIdx}`}
                          />
                          <Button
                            variant="outline-danger"
                            onClick={() => handleRemoveItem(secIdx, itemIdx)}
                            title="Remove item"
                            aria-label="Remove item"
                          >
                            <BiTrash />
                          </Button>
                          <Form.Control.Feedback type="invalid" id={`menu-item-name-error-${secIdx}-${itemIdx}`}>
                            {sectionError?.errors?.items?.[itemIdx]?.includes("name") && "Item name is required."}
                          </Form.Control.Feedback>
                          <Form.Control.Feedback type="invalid" id={`menu-item-link-error-${secIdx}-${itemIdx}`}>
                            {sectionError?.errors?.items?.[itemIdx]?.includes("link") && "Item link is required."}
                          </Form.Control.Feedback>
                        </div>
                      ))}
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => handleAddItem(secIdx)}
                        className="mt-2"
                        aria-label="Add item"
                      >
                        <BiPlus /> Add Item
                      </Button>
                    </Form.Group>
                    <Form.Group className="mb-2">
                      <Form.Label>Images</Form.Label>
                      {section.images.map((img, imgIdx) => (
                        <div key={imgIdx} className="d-flex align-items-center gap-2 mb-2">
                          <Form.Control
                            type="text"
                            placeholder="Image ID"
                            value={img.src}
                            onChange={(e) => handleImageChange(imgIdx, e.target.value, secIdx)}
                            isInvalid={
                              !!sectionError?.errors?.images?.[imgIdx] ||
                              (img.src.trim() && !formPosterImages[img.src] && formPosterImages[img.src] !== null)
                            }
                            aria-describedby={`menu-image-src-error-${secIdx}-${imgIdx}`}
                          />
                          <Form.Control
                            type="text"
                            placeholder="Alt Text"
                            value={img.alt}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                sections: formData.sections.map((s, i) =>
                                  i === secIdx
                                    ? {
                                        ...s,
                                        images: s.images.map((im, idx) =>
                                          idx === imgIdx ? { ...im, alt: e.target.value } : im
                                        ),
                                      }
                                    : s
                                ),
                              })
                            }
                          />
                          <Form.Control
                            type="text"
                            placeholder="Label"
                            value={img.label}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                sections: formData.sections.map((s, i) =>
                                  i === secIdx
                                    ? {
                                        ...s,
                                        images: s.images.map((im, idx) =>
                                          idx === imgIdx ? { ...im, label: e.target.value } : im
                                        ),
                                      }
                                    : s
                                ),
                              })
                            }
                          />
                          <Form.Control
                            type="text"
                            placeholder="Link"
                            value={img.link}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                sections: formData.sections.map((s, i) =>
                                  i === secIdx
                                    ? {
                                        ...s,
                                        images: s.images.map((im, idx) =>
                                          idx === imgIdx ? { ...im, link: e.target.value } : im
                                        ),
                                      }
                                    : s
                                ),
                              })
                            }
                          />
                          <Button
                            variant="outline-secondary"
                            onClick={() => handlePasteClipboard(imgIdx, secIdx)}
                            title="Paste image ID"
                            aria-label="Paste image ID from clipboard"
                          >
                            <BiClipboard />
                          </Button>
                          <Button
                            variant="outline-primary"
                            onClick={() => handleViewImage(img.src)}
                            title="View image"
                            disabled={
                              !img.src.trim() ||
                              formPosterImages[img.src] === null ||
                              (!formPosterImages[img.src] && !posterImages[img.src])
                            }
                            aria-label={`View image for ${img.src}`}
                          >
                            {formPosterImages[img.src] === null ? "Loading..." : <BiImage />}
                          </Button>
                          <Button
                            variant="outline-danger"
                            onClick={() => handleRemoveImage(imgIdx, secIdx)}
                            title="Remove image"
                            aria-label="Remove image"
                          >
                            <BiTrash />
                          </Button>
                          <Form.Control.Feedback type="invalid" id={`menu-image-src-error-${secIdx}-${imgIdx}`}>
                            {sectionError?.errors?.images?.[imgIdx] ||
                              (img.src.trim() && !formPosterImages[img.src] && formPosterImages[img.src] !== null
                                ? "Invalid Image ID"
                                : "")}
                          </Form.Control.Feedback>
                        </div>
                      ))}
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => handleAddImage(secIdx)}
                        className="mt-2"
                        aria-label="Add image"
                      >
                        <BiPlus /> Add Image
                      </Button>
                    </Form.Group>
                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={() => handleRemoveSection(secIdx)}
                      className="mt-2"
                      aria-label="Remove section"
                    >
                      Remove Section
                    </Button>
                  </div>
                );
              })}
              <Button
                variant="outline-primary"
                size="sm"
                onClick={handleAddSection}
                className="mt-2"
                aria-label="Add section"
              >
                <BiPlus /> Add Section
              </Button>
            </Form.Group>
            <Button type="submit" variant="primary">
              {selectedItem ? "Update" : "Create"} Menu
            </Button>
          </Form>
        </Modal.Body>
      </Modal>
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} aria-labelledby="menu-delete-modal-title">
        <Modal.Header closeButton>
          <Modal.Title id="menu-delete-modal-title">Confirm Delete</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>
            Are you sure you want to delete menu <strong>{selectedItem?.id}</strong>? This action cannot be undone.
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
            aria-label="Confirm delete menu"
          >
            Delete
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

MenusTab.propTypes = {
  menus: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      sections: PropTypes.arrayOf(
        PropTypes.shape({
          title: PropTypes.string,
          items: PropTypes.arrayOf(
            PropTypes.shape({
              name: PropTypes.string,
              link: PropTypes.string,
            })
          ),
          images: PropTypes.arrayOf(
            PropTypes.shape({
              src: PropTypes.string,
              alt: PropTypes.string,
              label: PropTypes.string,
              link: PropTypes.string,
            })
          ),
        })
      ),
      type: PropTypes.string,
    })
  ).isRequired,
  setMenus: PropTypes.func.isRequired,
  filter: PropTypes.shape({
    search: PropTypes.string,
  }).isRequired,
  posterImages: PropTypes.object.isRequired,
  validateForm: PropTypes.func.isRequired,
  handleSubmit: PropTypes.func.isRequired,
  handleDelete: PropTypes.func.isRequired,
  handleFetchImage: PropTypes.func.isRequired,
};

MenusTab.defaultProps = {
  menus: [],
  filter: { search: "" },
};

export default MenusTab;