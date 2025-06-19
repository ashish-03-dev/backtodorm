import React, { useState, useEffect } from "react";
import { Button, Form, Table, Modal, Spinner, Alert } from "react-bootstrap";
import { useFirebase } from "../../context/FirebaseContext";
import { useNavigate } from "react-router-dom";
import { collection, query, onSnapshot, doc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";
import "../../styles/SellerComponents.css";

const TagManager = () => {
  const { firestore, user, userData, loadingUserData } = useFirebase();
  const navigate = useNavigate();
  const [tags, setTags] = useState([]);
  const [newTag, setNewTag] = useState("");
  const [editItem, setEditItem] = useState({ id: "", value: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (loadingUserData) return;
    if (!user || !userData?.isAdmin) {
      navigate("/login", { replace: true });
    }
  }, [user, userData, loadingUserData, navigate]);

  useEffect(() => {
    if (!firestore || !userData?.isAdmin || loadingUserData) return;

    const tagsQuery = query(collection(firestore, "tags"));
    const unsubscribe = onSnapshot(
      tagsQuery,
      (snapshot) => {
        setTags(snapshot.docs.map((doc) => ({ id: doc.id, name: doc.data().name })));
        setLoading(false);
      },
      (err) => {
        setError(`Failed to fetch tags: ${err.message}`);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [firestore, userData, loadingUserData]);

  const handleAdd = async () => {
    if (!newTag.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      const normalizedTag = newTag.trim().toLowerCase();
      if (tags.some((tag) => tag.name.toLowerCase() === normalizedTag)) {
        setError(`Tag "${newTag}" already exists.`);
        setSubmitting(false);
        return;
      }
      const newId = doc(collection(firestore, "tags")).id;
      await setDoc(doc(firestore, "tags", newId), { name: normalizedTag });
      setNewTag("");
    } catch (err) {
      setError(`Failed to add tag: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this tag?")) return;
    setSubmitting(true);
    setError("");
    try {
      await deleteDoc(doc(firestore, "tags", id));
    } catch (err) {
      setError(`Failed to delete tag: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (id, value) => {
    setEditItem({ id, value });
  };

  const handleEditSave = async () => {
    if (!editItem.value.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      const normalizedTag = editItem.value.trim().toLowerCase();
      if (
        tags.some(
          (tag) => tag.name.toLowerCase() === normalizedTag && tag.id !== editItem.id
        )
      ) {
        setError(`Tag "${editItem.value}" already exists.`);
        setSubmitting(false);
        return;
      }
      await updateDoc(doc(firestore, "tags", editItem.id), {
        name: normalizedTag,
      });
      setEditItem({ id: "", value: "" });
    } catch (err) {
      setError(`Failed to update tag: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingUserData || loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "100vh" }}>
        <Spinner animation="border" className="text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    );
  }

  if (!user || !userData?.isAdmin) return null;

  return (
    <div className="container mx-auto mt-4">
      <h2 className="mb-4">🏷️ Tag Manager</h2>
      {error && <Alert variant="danger" onClose={() => setError("")} dismissible>{error}</Alert>}
      <Form className="d-flex mb-4">
        <Form.Control
          placeholder="Add new tag (e.g., minimalist, k-pop)"
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          disabled={submitting}
        />
        <Button
          className="ms-2"
          variant="primary"
          onClick={handleAdd}
          disabled={submitting || !newTag.trim()}
        >
          + Add Tag
        </Button>
      </Form>
      <div className="table-responsive">
        <Table striped bordered hover>
          <thead className="table-light">
            <tr>
              <th>#</th>
              <th>Tag Name</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {tags.map((tag, i) => (
              <tr key={tag.id}>
                <td>{i + 1}</td>
                <td>{tag.name}</td>
                <td>
                  <Button
                    size="sm"
                    variant="outline-primary"
                    onClick={() => handleEdit(tag.id, tag.name)}
                    className="me-2"
                    disabled={submitting}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => handleDelete(tag.id)}
                    disabled={submitting}
                  >
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
            {tags.length === 0 && (
              <tr>
                <td colSpan="3" className="text-center text-muted">
                  No tags found.
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>
      <Modal show={editItem.id !== ""} onHide={() => setEditItem({ id: "", value: "" })}>
        <Modal.Header closeButton>
          <Modal.Title>Edit Tag</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Control
            value={editItem.value}
            onChange={(e) => setEditItem((prev) => ({ ...prev, value: e.target.value }))}
            disabled={submitting}
            placeholder="Enter new tag name"
          />
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setEditItem({ id: "", value: "" })}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleEditSave}
            disabled={submitting || !editItem.value.trim()}
          >
            Save Changes
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default TagManager;