import React, { useState } from "react";
import { Button, Form, Modal, Badge } from "react-bootstrap";

const initialPosters = [
  {
    id: "POST001",
    title: "Naruto Shadow Clone",
    price: 249,
    category: "Anime",
    tags: ["Trending", "Anime"],
    seller: "Ashish Kumar",
    visibility: "Published",
    approved: true,
    image: "https://example.com/naruto.jpg",
  },
  {
    id: "POST002",
    title: "Iron Man Legacy",
    price: 299,
    category: "Marvel",
    tags: ["Marvel"],
    seller: "Riya Singh",
    visibility: "Draft",
    approved: false,
    image: "https://example.com/ironman.jpg",
  },
];

const Posters = () => {
  const [posters, setPosters] = useState(initialPosters);
  const [filter, setFilter] = useState({ category: "", visibility: "", search: "" });
  const [showModal, setShowModal] = useState(false);
  const [editingPoster, setEditingPoster] = useState(null);

  const filtered = posters.filter((p) => {
    return (
      (filter.category === "" || p.category === filter.category) &&
      (filter.visibility === "" || p.visibility === filter.visibility) &&
      (filter.search === "" || p.title.toLowerCase().includes(filter.search.toLowerCase()))
    );
  });

  const handleAddEdit = (e) => {
    e.preventDefault();
    const form = e.target;
    const posterData = {
      id: editingPoster?.id || "POST" + (posters.length + 1).toString().padStart(3, "0"),
      title: form.title.value,
      price: parseInt(form.price.value),
      category: form.category.value,
      tags: form.tags.value.split(",").map((t) => t.trim()),
      seller: form.seller.value,
      visibility: form.visibility.value,
      approved: editingPoster?.approved || false,
      image: form.image.value,
    };

    if (editingPoster) {
      setPosters((prev) => prev.map((p) => (p.id === editingPoster.id ? posterData : p)));
    } else {
      setPosters((prev) => [...prev, posterData]);
    }

    setShowModal(false);
    setEditingPoster(null);
  };

  const handleDelete = (id) => {
    if (window.confirm("Delete this poster?")) {
      setPosters((prev) => prev.filter((p) => p.id !== id));
    }
  };

  const handleApprove = (id) => {
    setPosters((prev) =>
      prev.map((p) => (p.id === id ? { ...p, approved: true, visibility: "Published" } : p))
    );
  };

  return (
    <div className="container mt-4">
      <h2>🖼️ Posters Management</h2>

      {/* Filters */}
      <div className="row g-3 mt-2 mb-3">
        <div className="col-md-3">
          <Form.Select
            value={filter.category}
            onChange={(e) => setFilter((f) => ({ ...f, category: e.target.value }))}
          >
            <option value="">Filter by Category</option>
            <option>Anime</option>
            <option>Marvel</option>
            <option>Games</option>
          </Form.Select>
        </div>
        <div className="col-md-3">
          <Form.Select
            value={filter.visibility}
            onChange={(e) => setFilter((f) => ({ ...f, visibility: e.target.value }))}
          >
            <option value="">Filter by Visibility</option>
            <option>Published</option>
            <option>Draft</option>
          </Form.Select>
        </div>
        <div className="col-md-4">
          <Form.Control
            placeholder="Search by title"
            value={filter.search}
            onChange={(e) => setFilter((f) => ({ ...f, search: e.target.value }))}
          />
        </div>
        <div className="col-md-2 text-end">
          <Button onClick={() => { setEditingPoster(null); setShowModal(true); }}>
            + Add Poster
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="table-responsive">
        <table className="table table-bordered align-middle table-hover">
          <thead className="table-light">
            <tr>
              <th>Preview</th>
              <th>Title</th>
              <th>Price (₹)</th>
              <th>Tags</th>
              <th>Category</th>
              <th>Seller</th>
              <th>Visibility</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((poster) => (
              <tr key={poster.id}>
                <td><img src={poster.image} alt="poster" width="60" /></td>
                <td>{poster.title}</td>
                <td>{poster.price}</td>
                <td>
                  {poster.tags.map((tag, i) => (
                    <Badge bg="secondary" key={i} className="me-1">{tag}</Badge>
                  ))}
                </td>
                <td>{poster.category}</td>
                <td>{poster.seller}</td>
                <td>
                  <Badge bg={poster.visibility === "Published" ? "success" : "warning"}>
                    {poster.visibility}
                  </Badge>
                </td>
                <td>
                  <Button
                    variant="outline-primary"
                    size="sm"
                    onClick={() => { setEditingPoster(poster); setShowModal(true); }}
                    className="me-2"
                  >
                    Edit
                  </Button>
                  <Button
                    variant="outline-danger"
                    size="sm"
                    onClick={() => handleDelete(poster.id)}
                    className="me-2"
                  >
                    Delete
                  </Button>
                  {!poster.approved && (
                    <Button
                      variant="outline-success"
                      size="sm"
                      onClick={() => handleApprove(poster.id)}
                    >
                      Approve
                    </Button>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan="8" className="text-center text-muted">
                  No posters found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>{editingPoster ? "Edit Poster" : "Add Poster"}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleAddEdit}>
            <Form.Group className="mb-3">
              <Form.Label>Title</Form.Label>
              <Form.Control name="title" defaultValue={editingPoster?.title || ""} required />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Price (₹)</Form.Label>
              <Form.Control type="number" name="price" defaultValue={editingPoster?.price || ""} required />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Category</Form.Label>
              <Form.Select name="category" defaultValue={editingPoster?.category || "Anime"}>
                <option>Anime</option>
                <option>Marvel</option>
                <option>Games</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Tags (comma separated)</Form.Label>
              <Form.Control name="tags" defaultValue={editingPoster?.tags?.join(", ") || ""} />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Seller</Form.Label>
              <Form.Control name="seller" defaultValue={editingPoster?.seller || ""} required />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Visibility</Form.Label>
              <Form.Select name="visibility" defaultValue={editingPoster?.visibility || "Draft"}>
                <option>Published</option>
                <option>Draft</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Poster Image URL</Form.Label>
              <Form.Control type="url" name="image" defaultValue={editingPoster?.image || ""} />
            </Form.Group>

            <Button type="submit" variant="success">
              {editingPoster ? "Update Poster" : "Add Poster"}
            </Button>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default Posters;
