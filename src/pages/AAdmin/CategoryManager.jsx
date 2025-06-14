import React, { useState } from "react";
import { Button, Form, Table, Modal, Row, Col } from "react-bootstrap";

const CategoryTagManager = () => {
  const [categories, setCategories] = useState(["Anime", "Gaming", "Movies"]);
  const [tags, setTags] = useState(["Trending", "Minimalist", "Vintage"]);
  const [newCategory, setNewCategory] = useState("");
  const [newTag, setNewTag] = useState("");
  const [editItem, setEditItem] = useState({ type: "", index: -1, value: "" });

  const handleAdd = (type) => {
    if (type === "category" && newCategory.trim()) {
      setCategories([...categories, newCategory.trim()]);
      setNewCategory("");
    } else if (type === "tag" && newTag.trim()) {
      setTags([...tags, newTag.trim()]);
      setNewTag("");
    }
  };

  const handleDelete = (type, index) => {
    if (type === "category") {
      setCategories(categories.filter((_, i) => i !== index));
    } else {
      setTags(tags.filter((_, i) => i !== index));
    }
  };

  const handleEdit = (type, index, value) => {
    setEditItem({ type, index, value });
  };

  const handleEditSave = () => {
    if (editItem.type === "category") {
      const updated = [...categories];
      updated[editItem.index] = editItem.value;
      setCategories(updated);
    } else {
      const updated = [...tags];
      updated[editItem.index] = editItem.value;
      setTags(updated);
    }
    setEditItem({ type: "", index: -1, value: "" });
  };

  return (
    <div className="container mt-4">
      <h2 className="mb-4">📚 Category & Tag Manager</h2>

      <Row>
        {/* Categories Section */}
        <Col md={6}>
          <h5>📁 Categories</h5>
          <Form className="d-flex mb-3">
            <Form.Control
              placeholder="New category"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
            />
            <Button className="ms-2" onClick={() => handleAdd("category")}>
              Add
            </Button>
          </Form>
          <Table bordered hover>
            <thead>
              <tr>
                <th>#</th>
                <th>Category Name</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td>{cat}</td>
                  <td>
                    <Button
                      size="sm"
                      variant="outline-primary"
                      onClick={() => handleEdit("category", i, cat)}
                      className="me-2"
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline-danger"
                      onClick={() => handleDelete("category", i)}
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Col>

        {/* Tags Section */}
        <Col md={6}>
          <h5>🏷️ Tags</h5>
          <Form className="d-flex mb-3">
            <Form.Control
              placeholder="New tag"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
            />
            <Button className="ms-2" onClick={() => handleAdd("tag")}>
              Add
            </Button>
          </Form>
          <Table bordered hover>
            <thead>
              <tr>
                <th>#</th>
                <th>Tag Name</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tags.map((tag, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td>{tag}</td>
                  <td>
                    <Button
                      size="sm"
                      variant="outline-primary"
                      onClick={() => handleEdit("tag", i, tag)}
                      className="me-2"
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline-danger"
                      onClick={() => handleDelete("tag", i)}
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Col>
      </Row>

      {/* Edit Modal */}
      <Modal
        show={editItem.index !== -1}
        onHide={() => setEditItem({ type: "", index: -1, value: "" })}
      >
        <Modal.Header closeButton>
          <Modal.Title>Edit {editItem.type === "category" ? "Category" : "Tag"}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Control
            value={editItem.value}
            onChange={(e) =>
              setEditItem((prev) => ({ ...prev, value: e.target.value }))
            }
          />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setEditItem({ type: "", index: -1, value: "" })}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleEditSave}>
            Save Changes
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default CategoryTagManager;
