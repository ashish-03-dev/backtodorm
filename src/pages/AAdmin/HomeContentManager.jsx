import React, { useState, useEffect } from "react";
import { Modal, Button, Form, Badge, ListGroup, Alert, Tabs, Tab, Nav, Navbar, Offcanvas } from "react-bootstrap";
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
  const [homeSections, setHomeSections] = useState([]);
  const [homeCategories, setHomeCategories] = useState([]);
  const [filter, setFilter] = useState({ search: "", tab: "homeSections", homeSubTab: "categories" });
  const [selectedSection, setSelectedSection] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [formData, setFormData] = useState({
    sectionId: "",
    posterIds: [""],
    categoryName: "",
    imageIds: [""],
  });
  const [formErrors, setFormErrors] = useState({});
  const [error, setError] = useState(null);
  const [posterImages, setPosterImages] = useState({});
  const [formPosterImages, setFormPosterImages] = useState({});
  const [showSidebar, setShowSidebar] = useState(false);

  // Fetch home sections and home categories
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch home sections (trending, popular)
        const homeSectionsSnapshot = await getDocs(collection(firestore, "homeSections"));
        const sectionsData = homeSectionsSnapshot.docs
          .filter((doc) => doc.id === "trending" || doc.id === "popular")
          .map((doc) => ({
            id: doc.id,
            posterIds: doc.data().posterIds || [],
          }));
        setHomeSections(sectionsData);

        // Fetch home categories from homeSections/categories/homecategories
        try {
          const homeCategoriesSnapshot = await getDocs(
            collection(firestore, "homeSections/categories/homecategories")
          );
          const categoriesData = homeCategoriesSnapshot.docs.map((doc) => ({
            id: doc.id,
            name: doc.data().name || doc.id,
            imageIds: doc.data().imageIds || [],
          }));
          setHomeCategories(categoriesData);
        } catch (err) {
          console.warn("homeSections/categories/homecategories does not exist or is inaccessible:", err.message);
          setHomeCategories([]);
        }

        // Pre-fetch image URLs
        const allIds = [
          ...sectionsData.flatMap((section) => section.posterIds),
          ...homeCategories.flatMap((cat) => cat.imageIds),
        ];
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
        setError("Failed to fetch data: " + err.message);
      }
    };
    if (firestore) fetchData();
  }, [firestore]);

  // Debounced fetch for form poster/image
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
    const idsToFetch = [...(formData.posterIds || []), ...(formData.imageIds || [])];
    idsToFetch.forEach((id) => {
      if (id.trim()) {
        if (posterImages[id] !== undefined) {
          setFormPosterImages((prev) => ({ ...prev, [id]: posterImages[id] }));
        } else {
          fetchFormPosterImage(id);
        }
      }
    });
  }, [formData.posterIds, formData.imageIds, posterImages]);

  // Filter data
  const filteredSections = homeSections.filter((section) =>
    section.id.toLowerCase().includes(filter.search.toLowerCase())
  );
  const filteredCategories = homeCategories.filter((category) =>
    category.name.toLowerCase().includes(filter.search.toLowerCase())
  );
  const isFiltering = filter.search.trim().length > 0;

  // Validate form
  const validateForm = async (type) => {
    const errors = {};
    if (type === "section") {
      if (!formData.sectionId.trim()) {
        errors.sectionId = "Section ID is required.";
      } else if (
        !selectedSection &&
        homeSections.some((s) => s.id === formData.sectionId.trim().toLowerCase())
      ) {
        errors.sectionId = "Section ID already exists.";
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
    } else if (type === "category") {
      if (!formData.categoryName.trim()) {
        errors.categoryName = "Category Name is required.";
      } else if (
        !selectedCategory &&
        homeCategories.some((c) => c.id === formData.categoryName.trim().toLowerCase())
      ) {
        errors.categoryName = "Category already exists.";
      }
      const imageErrors = await Promise.all(
        formData.imageIds.map(async (id, index) => {
          if (!id.trim()) return null;
          if (!id.match(/^[a-zA-Z0-9_-]+$/)) {
            return "Invalid ID format (use letters, numbers, -, _).";
          }
          try {
            const q = query(collection(firestore, "posters"), where("__name__", "==", id));
            const querySnap = await getDocs(q);
            if (querySnap.empty) {
              return "Image ID does not exist.";
            }
          } catch {
            return "Error validating ID.";
          }
          return null;
        })
      );
      if (imageErrors.some((err) => err)) {
        errors.imageIds = imageErrors;
      }
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handlers
  const handleShowSectionDetail = (section) => {
    setSelectedSection(section);
    setSelectedCategory(null);
    setShowDetailModal(true);
  };

  const handleShowCategoryDetail = (category) => {
    setSelectedSection(null);
    setSelectedCategory(category);
    setShowDetailModal(true);
  };

  const handleEditSection = (section = null) => {
    setSelectedSection(section);
    setSelectedCategory(null);
    setFormData({
      sectionId: section?.id || "",
      posterIds: section?.posterIds?.length ? section.posterIds : [""],
      categoryName: "",
      imageIds: [""],
    });
    setFormErrors({});
    if (section?.posterIds?.length) {
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

  const handleEditCategory = (category = null) => {
    setSelectedSection(null);
    setSelectedCategory(category);
    setFormData({
      sectionId: "",
      posterIds: [""],
      categoryName: category?.name || "",
      imageIds: category?.imageIds?.length ? category.imageIds : [""],
    });
    setFormErrors({});
    if (category?.imageIds?.length) {
      const initialImages = {};
      category.imageIds.forEach((id) => {
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

  const handleAddImage = () => {
    setFormData((prev) => ({
      ...prev,
      [selectedSection || filter.homeSubTab === "scrollSections" ? "posterIds" : "imageIds"]: [
        ...(selectedSection || filter.homeSubTab === "scrollSections" ? prev.posterIds : prev.imageIds),
        "",
      ],
    }));
  };

  const handleRemoveImage = (index) => {
    setFormData((prev) => ({
      ...prev,
      [selectedSection || filter.homeSubTab === "scrollSections" ? "posterIds" : "imageIds"]: (
        selectedSection || filter.homeSubTab === "scrollSections" ? prev.posterIds : prev.imageIds
      ).filter((_, i) => i !== index),
    }));
    setFormErrors((prev) => ({
      ...prev,
      [selectedSection || filter.homeSubTab === "scrollSections" ? "posterIds" : "imageIds"]: (
        selectedSection || filter.homeSubTab === "scrollSections" ? prev.posterIds : prev.imageIds
      )?.filter((_, i) => i !== index),
    }));
    setFormPosterImages((prev) => {
      const newImages = { ...prev };
      const field = selectedSection || filter.homeSubTab === "scrollSections" ? "posterIds" : "imageIds";
      delete newImages[formData[field][index]];
      return newImages;
    });
  };

  const handleImageChange = (index, value) => {
    const field = selectedSection || filter.homeSubTab === "scrollSections" ? "posterIds" : "imageIds";
    const oldId = formData[field][index];
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].map((id, i) => (i === index ? value : id)),
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

  const handlePasteClipboard = async (index, type = "imageId") => {
    try {
      const text = await navigator.clipboard.readText();
      if (text.trim()) {
        handleImageChange(index, text.trim());
        setFormErrors((prev) => ({
          ...prev,
          [type === "posterId" ? "posterIds" : "imageIds"]: prev[type === "posterId" ? "posterIds" : "imageIds"]?.map(
            (err, i) => (i === index ? null : err)
          ),
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

  const handleSectionSubmit = async (e) => {
    e.preventDefault();
    if (!(await validateForm("section"))) return;

    const sectionId = formData.sectionId.trim().toLowerCase();
    const posterIds = formData.posterIds.filter((id) => id.trim());
    try {
      await setDoc(doc(firestore, "homeSections", sectionId), { posterIds });
      setHomeSections((prev) =>
        prev.some((s) => s.id === sectionId)
          ? prev.map((s) => (s.id === sectionId ? { id: sectionId, posterIds } : s))
          : [...prev, { id: sectionId, posterIds }]
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
      setError("Failed to save section: " + err.message);
    }
  };

  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    if (!(await validateForm("category"))) return;

    const categoryId = formData.categoryName.trim().toLowerCase();
    const imageIds = formData.imageIds.filter((id) => id.trim());
    try {
      await setDoc(doc(firestore, "homeSections/categories/homecategories", categoryId), {
        name: formData.categoryName.trim(),
        imageIds,
      });
      setHomeCategories((prev) =>
        prev.some((c) => c.id === categoryId)
          ? prev.map((c) =>
              c.id === categoryId
                ? { id: categoryId, name: formData.categoryName.trim(), imageIds }
                : c
            )
          : [...prev, { id: categoryId, name: formData.categoryName.trim(), imageIds }],
      );
      const newImageIds = imageIds.filter((id) => !posterImages[id]);
      if (newImageIds.length) {
        const chunks = [];
        for (let i = 0; i < newImageIds.length; i += 10) {
          chunks.push(newImageIds.slice(i, i + 10));
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
      setError("Failed to save category: " + err.message);
    }
  };

  const handleDeleteSection = async () => {
    try {
      await deleteDoc(doc(firestore, "homeSections", selectedSection.id));
      setHomeSections((prev) => prev.filter((s) => s.id !== selectedSection.id));
      setShowDeleteModal(false);
      setError(null);
    } catch (err) {
      setError("Failed to delete section: " + err.message);
    }
  };

  const handleDeleteCategory = async () => {
    try {
      await deleteDoc(doc(firestore, "homeSections/categories/homecategories", selectedCategory.id));
      setHomeCategories((prev) => prev.filter((c) => c.id !== selectedCategory.id));
      setShowDeleteModal(false);
      setError(null);
    } catch (err) {
      setError("Failed to delete category: " + err.message);
    }
  };

  // Render Home Sections content with sidebar
  const renderHomeSectionsContent = () => {
    return (
      <div className="d-flex">
        {/* Sidebar for Home Sections (Categories and Scroll Sections) */}
        <Nav
          className="flex-column bg-light border-end d-none d-md-block"
          style={{ width: "200px", padding: "1rem" }}
        >
          <h5 className="mb-3">Home Sections</h5>
          <Nav.Item>
            <Nav.Link
              active={filter.homeSubTab === "categories"}
              onClick={() => setFilter((prev) => ({ ...prev, homeSubTab: "categories", search: "" }))}
              className="mb-2"
            >
              Home Categories
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link
              active={filter.homeSubTab === "scrollSections"}
              onClick={() => setFilter((prev) => ({ ...prev, homeSubTab: "scrollSections", search: "" }))}
              className="mb-2"
            >
              Scroll Sections
            </Nav.Link>
          </Nav.Item>
        </Nav>

        {/* Offcanvas Sidebar for mobile */}
        <Navbar bg="light" expand={false} className="d-md-none mb-3">
          <Navbar.Toggle onClick={() => setShowSidebar(true)} />
          <Navbar.Offcanvas
            show={showSidebar}
            onHide={() => setShowSidebar(false)}
            placement="start"
          >
            <Offcanvas.Header closeButton>
              <Offcanvas.Title>Home Sections</Offcanvas.Title>
            </Offcanvas.Header>
            <Offcanvas.Body>
              <Nav className="flex-column">
                <Nav.Item>
                  <Nav.Link
                    active={filter.homeSubTab === "categories"}
                    onClick={() => {
                      setFilter((prev) => ({ ...prev, homeSubTab: "categories", search: "" }));
                      setShowSidebar(false);
                    }}
                    className="mb-2"
                  >
                    Home Categories
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link
                    active={filter.homeSubTab === "scrollSections"}
                    onClick={() => {
                      setFilter((prev) => ({ ...prev, homeSubTab: "scrollSections", search: "" }));
                      setShowSidebar(false);
                    }}
                    className="mb-2"
                  >
                    Scroll Sections
                  </Nav.Link>
                </Nav.Item>
              </Nav>
            </Offcanvas.Body>
          </Navbar.Offcanvas>
        </Navbar>

        {/* Content Area */}
        <div className="flex-grow-1 ms-md-3">
          {filter.homeSubTab === "categories" ? (
            <div className="border rounded p-3" style={{ maxHeight: "600px", overflowY: "auto" }}>
              <ListGroup>
                {filteredCategories.map((category) => (
                  <ListGroup.Item
                    key={category.id}
                    className="d-flex justify-content-between align-items-center"
                  >
                    <div>
                      <strong>{category.name}</strong>
                      <div className="text-muted small">Images: {category.imageIds?.length || 0}</div>
                    </div>
                    <div>
                      <Button
                        variant="outline-primary"
                        size="sm"
                        className="me-2"
                        onClick={() => handleShowCategoryDetail(category)}
                      >
                        View
                      </Button>
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        className="me-2"
                        onClick={() => handleEditCategory(category)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => {
                          setSelectedSection(null);
                          setSelectedCategory(category);
                          setShowDeleteModal(true);
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </ListGroup.Item>
                ))}
                {filteredCategories.length === 0 && (
                  <ListGroup.Item className="text-center text-muted">
                    {isFiltering ? "No matching categories." : "No categories found. Create one to get started."}
                  </ListGroup.Item>
                )}
              </ListGroup>
            </div>
          ) : (
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
                        <Badge bg="info">{section.posterIds?.length || 0}</Badge>
                      </td>
                      <td>
                        <Button
                          variant="outline-primary"
                          size="sm"
                          className="me-2"
                          onClick={() => handleShowSectionDetail(section)}
                        >
                          View
                        </Button>
                        <Button
                          variant="outline-secondary"
                          size="sm"
                          className="me-2"
                          onClick={() => handleEditSection(section)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => {
                            setSelectedSection(section);
                            setSelectedCategory(null);
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
                        {isFiltering ? "No matching sections." : "No sections found."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="container mt-4">
      <h2 className="mb-3">🏠 Section Management</h2>

      {/* FILTERS */}
      <div className="row g-3 mb-3">
        <div className="col-md-5">
          <Form.Control
            type="text"
            placeholder={`Search by ${filter.homeSubTab === "categories" ? "Category" : "Section"} Name/ID`}
            value={filter.search}
            onChange={(e) => setFilter((prev) => ({ ...prev, search: e.target.value }))}
          />
        </div>
        <div className="col-md-7 text-end">
          {filter.homeSubTab === "categories" ? (
            <Button variant="primary" onClick={() => handleEditCategory(null)}>
              + Create Category
            </Button>
          ) : (
            <Button variant="primary" onClick={() => handleEditSection(null)}>
              + Create Section
            </Button>
          )}
        </div>
      </div>

      {/* TABS */}
      <Tabs
        activeKey={filter.tab}
        onSelect={(k) => setFilter((prev) => ({ ...prev, tab: k, search: "", homeSubTab: "categories" }))}
        className="mb-3"
      >
        <Tab eventKey="homeSections" title="Home Sections">
          {renderHomeSectionsContent()}
        </Tab>
      </Tabs>

      {/* ERROR ALERT */}
      {error && (
        <Alert variant="danger" className="mb-3">
          {error}
        </Alert>
      )}

      {/* DETAIL MODAL */}
      <Modal show={showDetailModal} onHide={() => setShowDetailModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>{selectedSection ? "Section Details" : "Category Details"}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedSection && (
            <>
              <p><strong>Section ID:</strong> {selectedSection.id}</p>
              <p><strong>Poster Count:</strong> {selectedSection.posterIds?.length || 0}</p>
              <hr />
              <h6>Poster IDs:</h6>
              <ListGroup>
                {selectedSection.posterIds?.map((id, i) => (
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
                {selectedSection.posterIds?.length === 0 && (
                  <ListGroup.Item className="text-muted">No posters assigned.</ListGroup.Item>
                )}
              </ListGroup>
            </>
          )}
          {selectedCategory && (
            <>
              <p><strong>Category Name:</strong> {selectedCategory.name}</p>
              <p><strong>Image Count:</strong> {selectedCategory.imageIds?.length || 0}</p>
              <hr />
              <h6>Image IDs:</h6>
              <ListGroup>
                {selectedCategory.imageIds?.map((id, i) => (
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
                {selectedCategory?.imageIds?.length === 0 && (
                  <ListGroup.Item className="text-muted">No images assigned.</ListGroup.Item>
                )}
              </ListGroup>
            </>
          )}
        </Modal.Body>
      </Modal>

      {/* EDIT/CREATE MODAL */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            {selectedSection
              ? "Edit Section"
              : selectedCategory
              ? "Edit Category"
              : filter.homeSubTab === "categories"
              ? "Create Category"
              : "Create Section"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form
            onSubmit={
              selectedSection || filter.homeSubTab === "scrollSections"
                ? handleSectionSubmit
                : handleCategorySubmit
            }
          >
            {selectedSection || filter.homeSubTab === "scrollSections" ? (
              <>
                <Form.Group className="mb-3">
                  <Form.Label>Section ID</Form.Label>
                  <Form.Control
                    type="text"
                    name="sectionId"
                    value={formData.sectionId}
                    onChange={(e) => setFormData((prev) => ({ ...prev, sectionId: e.target.value }))}
                    placeholder="e.g., trending, popular"
                    required
                    disabled={!!selectedSection}
                    isInvalid={!!formErrors.sectionId}
                  />
                  <Form.Control.Feedback type="invalid">{formErrors.sectionId}</Form.Control.Feedback>
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Poster IDs</Form.Label>
                  {formData.posterIds?.length === 0 && (
                    <div className="text-muted mb-2">No poster IDs assigned.</div>
                  )}
                  {formData.posterIds?.map((id, index) => (
                    <div key={index} className="mb-2 d-flex align-items-center gap-2">
                      <div className="input-group flex">
                        <Form.Control
                          placeholder="Poster ID (e.g., 20-bts--k-pop-set--polaroid-175005907974)"
                          value={id}
                          onChange={(e) => handleImageChange(index, e.target.value)}
                          isInvalid={
                            formErrors.posterIds?.[index] ||
                            (id.trim() && !formPosterImages[id] && formPosterImages[id] !== null)
                          }
                        />
                        <Button
                          variant="outline-secondary"
                          onClick={() => handlePasteClipboard(index, "posterId")}
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
                          onClick={() => handleRemoveImage(index)}
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
                  <Button variant="outline-primary" size="sm" onClick={handleAddImage} className="mt-2">
                    <BiPlus /> Add Poster
                  </Button>
                </Form.Group>
              </>
            ) : (
              <>
                <Form.Group className="mb-3">
                  <Form.Label>Category Name</Form.Label>
                  <Form.Control
                    type="text"
                    name="categoryName"
                    value={formData.categoryName}
                    onChange={(e) => setFormData((prev) => ({ ...prev, categoryName: e.target.value }))}
                    placeholder="e.g., Movies, Comics"
                    required
                    disabled={!!selectedCategory}
                    isInvalid={!!formErrors.categoryName}
                  />
                  <Form.Control.Feedback type="invalid">{formErrors.categoryName}</Form.Control.Feedback>
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Images IDs</Form.Label>
                  {formData.imageIds?.length === 0 && (
                    <div className="text-muted mb-2">No images IDs assigned.</div>
                  )}
                  {formData.imageIds?.map((id, index) => (
                    <div key={index} className="mb-2 d-flex align-items-center gap-2">
                      <div className="input-group">
                        <Form.Control
                          placeholder="Image ID (e.g., 20-bts--k-pop-set--polaroid-175005907974)"
                          value={id}
                          onChange={(e) => handleImageChange(index, e.target.value)}
                          isInvalid={
                            formErrors.imageIds?.[index] ||
                            (id.trim() && !formPosterImages[id] && formPosterImages[id] !== null)
                          }
                        />
                        <Button
                          variant="outline-secondary"
                          onClick={() => handlePasteClipboard(index, "imageId")}
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
                          onClick={() => handleRemoveImage(index)}
                          title="Remove image"
                        >
                          <BiTrash />
                        </Button>
                        <Form.Control.Feedback type="invalid">
                          {formErrors.imageIds?.[index] ||
                            (id.trim() && !formPosterImages[id] && formPosterImages[id] !== null
                              ? "Invalid Image ID"
                              : "")}
                        </Form.Control.Feedback>
                      </div>
                    </div>
                  ))}
                  <Button variant="outline-primary" size="sm" onClick={handleAddImage} className="mt-2">
                    <BiPlus /> Add Image
                  </Button>
                </Form.Group>
              </>
            )}
            <Button type="submit" variant="primary">
              {selectedSection
                ? "Update Section"
                : selectedCategory
                ? "Update Category"
                : filter.homeSubTab === "categories"
                ? "Create Category"
                : "Create Section"}
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
          Are you sure you want to delete {selectedSection ? "section" : "category"} <strong>
            {selectedSection?.id || selectedCategory?.name}
          </strong>? This action cannot be undone.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={selectedSection ? handleDeleteSection : handleDeleteCategory}
          >
            Delete
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default SectionManager;