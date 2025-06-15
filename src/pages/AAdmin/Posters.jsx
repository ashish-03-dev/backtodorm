import React, { useState } from "react";
import {
  Tabs,
  Tab,
  Form,
  Button,
  Modal,
} from "react-bootstrap";

// ─── Example Data ───────────────────────────────────────────────────────────────
const initialPosters = [
  {
    id: "spider-man-homecoming-3-piece-set-1021",
    title: "Spider-Man || Homecoming || 3 Piece Set",
    description: "A vibrant 3‑piece Spider‑Man wall art set perfect for Marvel fans.",
    tags: ["marvel", "homecoming"],
    collections: ["movies", "superhero", "3-piece-sets"],
    category: "pop-culture",
    imageUrl: "https://example.com/spiderman.jpg",
    price: 399,
    discount: 10,
    finalPrice: 359,
    visibility: "Published",
    approved: true,
    isPublished: true,
    isActive: true,
    seller: "Ashish Kumar",
    createdAt: "2025-06-15T19:00:09.000Z",
  },
  {
    id: "naruto-shadow-clone-001",
    title: "Naruto Shadow Clone",
    description: "Anime‑style poster of Naruto’s iconic shadow clone jutsu.",
    tags: ["Trending", "Anime"],
    collections: ["anime", "jutsu"],
    category: "anime",
    imageUrl: "https://example.com/naruto.jpg",
    price: 249,
    discount: 0,
    finalPrice: 249,
    visibility: "Draft",
    approved: false,
    isPublished: false,
    isActive: true,
    seller: "Ashish Kumar",
    createdAt: "2025-06-15T18:50:00.000Z",
  },
  {
    id: "iron-man-legacy-002",
    title: "Iron Man Legacy",
    description: "A sleek poster celebrating Iron Man’s technological legacy.",
    tags: ["Marvel"],
    collections: ["movies", "superhero"],
    category: "marvel",
    imageUrl: "https://example.com/ironman.jpg",
    price: 299,
    discount: 0,
    finalPrice: 299,
    visibility: "Draft",
    approved: false,
    isPublished: false,
    isActive: true,
    seller: "Riya Singh",
    createdAt: "2025-06-15T18:45:30.000Z",
  },
  {
    id: "harry-potter-hogwarts-4-piece-set-1001",
    title: "Harry Potter Hogwarts 4 Piece Set",
    description: "Enchanting Hogwarts-themed 4‑piece poster set.",
    tags: ["movies", "fantasy"],
    collections: ["movies", "magic", "4-piece-sets"],
    category: "pop-culture",
    imageUrl: "https://example.com/hogwarts.jpg",
    price: 499,
    discount: 15,
    finalPrice: 424,
    visibility: "Published",
    approved: true,
    isPublished: true,
    isActive: false,
    seller: "Priya Verma",
    createdAt: "2025-06-10T12:30:00.000Z",
  },
];

// ─── Component ─────────────────────────────────────────────────────────────────
const Posters = () => {
  const [posters, setPosters] = useState(initialPosters);
  const [filter, setFilter] = useState({ search: "", visibility: "" });
  const [activeTab, setActiveTab] = useState("recent");
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);

  // ─── Handlers ────────────────────────────────────────────────────────────────
  const openEdit = (poster = null) => {
    setEditing(poster);
    setShowEditModal(true);
  };
  const openView = poster => {
    setViewing(poster);
    setShowViewModal(true);
  };
  const deletePoster = id => {
    if (window.confirm("Delete this poster?")) {
      setPosters(prev => prev.filter(p => p.id !== id));
    }
  };
  const approvePoster = id => {
    setPosters(prev =>
      prev.map(p =>
        p.id === id
          ? { ...p, approved: true, visibility: "Published", isPublished: true }
          : p
      )
    );
  };
  const savePoster = e => {
    e.preventDefault();
    const form = e.target;
    const price = parseFloat(form.price.value);
    const discount = parseFloat(form.discount.value) || 0;
    const finalPrice = Math.round(price - (price * discount) / 100);
    const data = {
      id:
        editing?.id ||
        `${form.title.value
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9\-]/g, "")}-${Date.now()}`,
      title: form.title.value,
      description: form.description.value,
      tags: form.tags.value.split(",").map(t => t.trim()).filter(Boolean),
      collections: form.collections.value
        .split(",")
        .map(c => c.trim())
        .filter(Boolean),
      category: form.category.value,
      imageUrl: form.imageUrl.value,
      price,
      discount,
      finalPrice,
      visibility: form.visibility.value,
      approved: editing?.approved || false,
      isPublished: form.visibility.value === "Published",
      isActive: form.isActive.checked,
      seller: form.seller.value,
      createdAt: editing?.createdAt || new Date().toISOString(),
    };
    setPosters(prev =>
      editing ? prev.map(p => (p.id === editing.id ? data : p)) : [...prev, data]
    );
    setShowEditModal(false);
    setEditing(null);
  };

  // ─── Lists for Tabs ─────────────────────────────────────────────────────────
  const recentList = [...posters]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

  const allFiltered = posters.filter(p =>
    (filter.visibility === "" || p.visibility === filter.visibility) &&
    (filter.search === "" ||
      p.title.toLowerCase().includes(filter.search.toLowerCase()))
  );

  const draftsList = posters.filter(p => p.visibility === "Draft");
  const pendingList = posters.filter(p => p.visibility === "Draft" && !p.approved);
  const publishedList = posters.filter(p => p.visibility === "Published");

  // ─── Build By-Collection Map ────────────────────────────────────────────────
  const collectionsMap = posters.reduce((map, p) => {
    p.collections.forEach(col => {
      if (!map[col]) map[col] = [];
      map[col].push(p);
    });
    return map;
  }, {});

  // ─── Table Renderer ─────────────────────────────────────────────────────────
  const renderTable = list => (
    <div className="table-responsive">
      <table className="table table-hover table-bordered align-middle">
        <thead className="table-light">
          <tr>
            <th>Preview</th>
            <th>Title</th>
            <th>Category</th>
            <th>Pricing</th>
            <th>Visibility</th>
            <th>Active</th>
            <th>Approved</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {list.map(p => (
            <tr key={p.id}>
              <td><img src={p.imageUrl} alt="" width="60" /></td>
              <td>{p.title}</td>
              <td>{p.category}</td>
              <td>₹{p.price} / {p.discount}% → <strong>₹{p.finalPrice}</strong></td>
              <td>{p.visibility}</td>
              <td>{p.isActive ? "Yes" : "No"}</td>
              <td>{p.approved ? "Yes" : "No"}</td>
              <td>
                <Button size="sm" variant="outline-info" className="me-1" onClick={() => openView(p)}>View</Button>
                <Button size="sm" variant="outline-primary" className="me-1" onClick={() => openEdit(p)}>Edit</Button>
                <Button size="sm" variant="outline-danger" className="me-1" onClick={() => deletePoster(p.id)}>Delete</Button>
                {!p.approved && (
                  <Button size="sm" variant="outline-success" onClick={() => approvePoster(p.id)}>Approve</Button>
                )}
              </td>
            </tr>
          ))}
          {list.length === 0 && (
            <tr>
              <td colSpan="8" className="text-center text-muted">No posters found.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="container mt-4">
      <h2>🖼️ Posters Management</h2>

      <Tabs
        id="posters-tabs"
        activeKey={activeTab}
        onSelect={k => setActiveTab(k)}
        className="mb-3"
      >
        <Tab eventKey="recent" title="🕑 Recent">
          {renderTable(recentList)}
        </Tab>
        <Tab eventKey="all" title="📋 All Posters">
          <div className="row g-3 mb-3">
            <div className="col-md-6">
              <Form.Control
                placeholder="Search by title..."
                value={filter.search}
                onChange={e => setFilter(f => ({ ...f, search: e.target.value }))}
              />
            </div>
            <div className="col-md-4">
              <Form.Select
                value={filter.visibility}
                onChange={e => setFilter(f => ({ ...f, visibility: e.target.value }))}
              >
                <option value="">All Visibility</option>
                <option value="Published">Published</option>
                <option value="Draft">Draft</option>
              </Form.Select>
            </div>
            <div className="col-md-2 text-end">
              <Button onClick={() => openEdit(null)}>+ Add Poster</Button>
            </div>
          </div>
          {renderTable(allFiltered)}
        </Tab>
        <Tab eventKey="drafts" title="✏️ Drafts">
          {renderTable(draftsList)}
        </Tab>
        <Tab eventKey="pending" title="⏳ Pending Approval">
          {renderTable(pendingList)}
        </Tab>
        <Tab eventKey="published" title="✅ Published">
          {renderTable(publishedList)}
        </Tab>
        <Tab eventKey="collections" title="📦 By Collection">
          {Object.entries(collectionsMap).map(([col, list]) => (
            <div key={col} className="mb-4">
              <h5 className="mb-2">{col.charAt(0).toUpperCase() + col.slice(1)}</h5>
              {renderTable(list)}
            </div>
          ))}
        </Tab>
      </Tabs>

      {/* View Modal */}
      <Modal show={showViewModal} onHide={() => setShowViewModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Poster Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {viewing && (
            <>
              <div className="text-center mb-3">
                <img src={viewing.imageUrl} alt={viewing.title} className="img-fluid" style={{ maxHeight: 300 }} />
              </div>
              <h5>{viewing.title}</h5>
              <p>{viewing.description}</p>
              <p><strong>Price:</strong>{" "}
                {viewing.discount > 0 ? (
                  <>
                    <del>₹{viewing.price}</del>{" "}
                    <strong>₹{viewing.finalPrice}</strong>{" "}
                    ({viewing.discount}% OFF)
                  </>
                ) : (
                  <strong>₹{viewing.price}</strong>
                )}
              </p>
              <p><strong>Category:</strong> {viewing.category}</p>
              <p><strong>Collections:</strong> {viewing.collections.join(", ")}</p>
              <p><strong>Tags:</strong> {viewing.tags.join(", ")}</p>
              <p><strong>Seller:</strong> {viewing.seller}</p>
              <p>
                <strong>Visibility:</strong> {viewing.visibility} |{" "}
                <strong>Active:</strong> {viewing.isActive ? "Yes" : "No"} |{" "}
                <strong>Approved:</strong> {viewing.approved ? "Yes" : "No"}
              </p>
              <p><small>Created At: {new Date(viewing.createdAt).toLocaleString()}</small></p>
            </>
          )}
        </Modal.Body>
      </Modal>

      {/* Edit/Add Modal */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>{editing ? "Edit Poster" : "Add Poster"}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={savePoster}>
            <Form.Group className="mb-3">
              <Form.Label>Title</Form.Label>
              <Form.Control name="title" defaultValue={editing?.title || ""} required />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control as="textarea" rows={2} name="description" defaultValue={editing?.description || ""} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Tags (comma-separated)</Form.Label>
              <Form.Control name="tags" defaultValue={editing?.tags.join(", ") || ""} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Collections (comma-separated)</Form.Label>
              <Form.Control name="collections" defaultValue={editing?.collections.join(", ") || ""} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Category</Form.Label>
              <Form.Control name="category" defaultValue={editing?.category || ""} required />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Image URL</Form.Label>
              <Form.Control type="url" name="imageUrl" defaultValue={editing?.imageUrl || ""} required />
            </Form.Group>
            <div className="row g-3">
              <div className="col-md-4">
                <Form.Group>
                  <Form.Label>Price (₹)</Form.Label>
                  <Form.Control type="number" name="price" defaultValue={editing?.price || ""} required />
                </Form.Group>
              </div>
              <div className="col-md-4">
                <Form.Group>
                  <Form.Label>Discount (%)</Form.Label>
                  <Form.Control type="number" name="discount" defaultValue={editing?.discount || 0} />
                </Form.Group>
              </div>
              <div className="col-md-4">
                <Form.Group>
                  <Form.Label>Visibility</Form.Label>
                  <Form.Select name="visibility" defaultValue={editing?.visibility || "Draft"}>
                    <option>Published</option>
                    <option>Draft</option>
                  </Form.Select>
                </Form.Group>
              </div>
            </div>
            <Form.Group className="mb-3 mt-3">
              <Form.Label>Seller</Form.Label>
              <Form.Control name="seller" defaultValue={editing?.seller || ""} required />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Check type="checkbox" name="isActive" label="Active" defaultChecked={editing?.isActive ?? true} />
            </Form.Group>
            <Button type="submit" variant="success">{editing ? "Update Poster" : "Add Poster"}</Button>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default Posters;
