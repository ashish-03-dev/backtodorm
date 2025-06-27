import React, { useState, useEffect } from "react";
import { Form, Button, Table, Alert, Spinner } from "react-bootstrap";
import { useFirebase } from "../../context/FirebaseContext";
import { collection, getDocs,addDoc, doc, deleteDoc } from "firebase/firestore";
import { saveFrame, updateFrame, deleteFrame } from "./Posters/adminPosterUtils";
import "bootstrap/dist/css/bootstrap.min.css";

const POSTER_SIZES = {
  A4: { name: "A4", widthPx: 2480, heightPx: 3508 },
  A3: { name: "A3", widthPx: 3508, heightPx: 4961 },
  "A3*3": { name: "A3*3", widthPx: 3508 * 3, heightPx: 4961 },
  "A4*5": { name: "A4*5", widthPx: 2480 * 5, heightPx: 3508 },
};

const FramesAdmin = () => {
  const { firestore, storage, user } = useFirebase();
  const [frames, setFrames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    id: null,
    size: "A4",
    frameStyle: "",
    position: { x: 0, y: 0, width: 0, height: 0 },
    file: null,
  });
  const [editing, setEditing] = useState(false);

  // Fetch frames
  useEffect(() => {
    const fetchFrames = async () => {
      if (!firestore) {
        setError("Firestore instance is undefined.");
        setLoading(false);
        return;
      }
      try {
        const framesSnapshot = await getDocs(collection(firestore, "frames"));
        const framesData = framesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setFrames(framesData);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching frames:", err);
        setError(`Failed to fetch frames: ${err.message}`);
        setLoading(false);
      }
    };

    fetchFrames();
  }, [firestore]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name.includes("position.")) {
      const key = name.split(".")[1];
      setFormData((prev) => ({
        ...prev,
        position: { ...prev.position, [key]: parseFloat(value) || 0 },
      }));
    } else if (name === "file") {
      setFormData((prev) => ({ ...prev, file: e.target.files[0] }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      setError("User not authenticated.");
      return;
    }
    try {
      setLoading(true);
      setError(null);

      const frameData = {
        size: formData.size,
        frameStyle: formData.frameStyle,
        position: formData.position,
      };

      let result;
      if (editing) {
        result = await updateFrame(firestore, storage, formData.id, frameData, formData.file, user);
      } else {
        result = await saveFrame(firestore, storage, frameData, formData.file, user);
      }

      if (result.success) {
        setFrames((prev) =>
          editing
            ? prev.map((f) => (f.id === formData.id ? { id: formData.id, ...frameData, imageUrl: result.imageUrl } : f))
            : [...prev, { id: result.id, ...frameData, imageUrl: result.imageUrl }]
        );
        resetForm();
      } else {
        setError(`Failed to ${editing ? "update" : "save"} frame: ${result.error}`);
      }
    } catch (err) {
      console.error(`Error ${editing ? "updating" : "saving"} frame:`, err);
      setError(`Failed to ${editing ? "update" : "save"} frame: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (frame) => {
    setFormData({
      id: frame.id,
      size: frame.size,
      frameStyle: frame.frameStyle,
      position: frame.position,
      file: null,
    });
    setEditing(true);
  };

  const handleDelete = async (frameId) => {
    if (!user) {
      setError("User not authenticated.");
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const result = await deleteFrame(firestore, storage, frameId);
      if (result.success) {
        setFrames((prev) => prev.filter((f) => f.id !== frameId));
      } else {
        setError(`Failed to delete frame: ${result.error}`);
      }
    } catch (err) {
      console.error("Error deleting frame:", err);
      setError(`Failed to delete frame: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      id: null,
      size: "A4",
      frameStyle: "",
      position: { x: 0, y: 0, width: 0, height: 0 },
      file: null,
    });
    setEditing(false);
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "100vh" }}>
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  return (
    <div className="container mt-4" style={{ maxWidth: "1400px" }}>
      <h2 className="mb-3">🖼️ Frame Management</h2>
      {error && (
        <Alert variant="danger" onClose={() => setError(null)} dismissible>
          {error}
        </Alert>
      )}

      <h4 className="mb-3">{editing ? "Edit Frame" : "Add New Frame"}</h4>
      <Form onSubmit={handleSubmit}>
        <Form.Group className="mb-3">
          <Form.Label>Size</Form.Label>
          <Form.Select
            name="size"
            value={formData.size}
            onChange={handleInputChange}
            required
          >
            {Object.keys(POSTER_SIZES).map((key) => (
              <option key={key} value={key}>
                {key} ({POSTER_SIZES[key].widthPx / 300}in x {POSTER_SIZES[key].heightPx / 300}in)
              </option>
            ))}
          </Form.Select>
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Frame Style</Form.Label>
          <Form.Control
            type="text"
            name="frameStyle"
            value={formData.frameStyle}
            onChange={handleInputChange}
            placeholder="e.g., Wooden, Metal"
            required
          />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Position (pixels)</Form.Label>
          <div className="d-flex gap-2">
            <Form.Control
              type="number"
              name="position.x"
              value={formData.position.x}
              onChange={handleInputChange}
              placeholder="X"
              required
              min="0"
            />
            <Form.Control
              type="number"
              name="position.y"
              value={formData.position.y}
              onChange={handleInputChange}
              placeholder="Y"
              required
              min="0"
            />
            <Form.Control
              type="number"
              name="position.width"
              value={formData.position.width}
              onChange={handleInputChange}
              placeholder="Width"
              required
              min="0"
            />
            <Form.Control
              type="number"
              name="position.height"
              value={formData.position.height}
              onChange={handleInputChange}
              placeholder="Height"
              required
              min="0"
            />
          </div>
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Frame Image</Form.Label>
          <Form.Control
            type="file"
            name="file"
            accept="image/*"
            onChange={handleInputChange}
            required={!editing}
          />
        </Form.Group>
        <Button
          type="submit"
          variant="primary"
          disabled={loading || !formData.frameStyle || (!formData.file && !editing)}
        >
          {loading ? "Saving..." : editing ? "Update Frame" : "Add Frame"}
        </Button>
        {editing && (
          <Button
            variant="secondary"
            className="ms-2"
            onClick={resetForm}
            disabled={loading}
          >
            Cancel Edit
          </Button>
        )}
      </Form>

      <h4 className="mt-5 mb-3">Existing Frames</h4>
      {frames.length === 0 ? (
        <p>No frames found.</p>
      ) : (
        <Table striped bordered hover responsive>
          <thead>
            <tr>
              <th>Size</th>
              <th>Frame Style</th>
              <th>Position (x, y, w, h)</th>
              <th>Image</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {frames.map((frame) => (
              <tr key={frame.id}>
                <td>{frame.size}</td>
                <td>{frame.frameStyle}</td>
                <td>
                  ({frame.position.x}, {frame.position.y}, {frame.position.width}, {frame.position.height})
                </td>
                <td>
                  <img
                    src={frame.imageUrl}
                    alt={frame.frameStyle}
                    style={{ width: "100px", height: "auto" }}
                  />
                </td>
                <td>
                  <Button
                    variant="outline-primary"
                    size="sm"
                    onClick={() => handleEdit(frame)}
                    className="me-2"
                  >
                    Edit
                  </Button>
                  <Button
                    variant="outline-danger"
                    size="sm"
                    onClick={() => handleDelete(frame.id)}
                  >
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
};

export default FramesAdmin;