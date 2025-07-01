import React, { useState, useEffect } from "react";
import { Alert, Spinner, Table, Badge, Button, Modal } from "react-bootstrap";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { saveFrame, deleteFrame } from "../Posters/adminPosterUtils";
import FrameForm from "./FrameForm";
import PosterSizeTable from "./PosterSizeTable";
import "bootstrap/dist/css/bootstrap.min.css";
import { useFirebase } from "../../../context/FirebaseContext";

const POSTER_POSITIONS = {
  "top-left": { label: "Top Left" },
  "top-center": { label: "Top Center" },
  "top-right": { label: "Top Right" },
  "center-left": { label: "Center Left" },
  center: { label: "Center" },
  "center-right": { label: "Center Right" },
  "bottom-left": { label: "Bottom Left" },
  "bottom-center": { label: "Bottom Center" },
  "bottom-right": { label: "Bottom Right" },
  custom: { label: "Custom" },
};

const FramesAdmin = () => {
  const { firestore, storage, user } = useFirebase();
  const [frames, setFrames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedFrameImage, setSelectedFrameImage] = useState(null);

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
        setError(`Failed to fetch frames: ${err.message}`);
        setLoading(false);
      }
    };
    fetchFrames();
  }, [firestore]);

  const handleUploadToCloudinary = async (frame) => {
    if (!frame.imageUrl || frame.uploaded) {
      setError("No image to upload or already uploaded.");
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const functions = getFunctions();
      const uploadToCloudinary = httpsCallable(functions, "uploadFrame");
      const response = await uploadToCloudinary({ imageUrl: frame.imageUrl, frameId: frame.id, fileName: frame.fileName });
      if (response.data.success) {
        const { cloudinaryUrl } = response.data;
        if (!cloudinaryUrl || !cloudinaryUrl.startsWith("https://res.cloudinary.com")) {
          throw new Error("Invalid Cloudinary URL returned");
        }
        await updateDoc(doc(firestore, "frames", frame.id), {
          imageUrl: cloudinaryUrl,
          uploaded: true,
          updatedAt: new Date().toISOString(),
          updatedBy: user.uid,
        });
        setFrames((prev) =>
          prev.map((f) => (f.id === frame.id ? { ...f, imageUrl: cloudinaryUrl, uploaded: true } : f))
        );
      } else {
        setError(`Failed to upload to Cloudinary: ${response.data.error}`);
      }
    } catch (err) {
      setError(`Failed to upload to Cloudinary: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFrame = async (frameId, fileName) => {
    try {
      setLoading(true);
      setError(null);
      const result = await deleteFrame(firestore, storage, frameId, fileName);
      if (result.success) {
        setFrames((prev) => prev.filter((frame) => frame.id !== frameId));
      } else {
        setError(`Failed to delete frame: ${result.error}`);
      }
    } catch (err) {
      setError(`Failed to delete frame: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (formData) => {
    try {
      setSubmitting(true);
      setError(null);
      const frameData = {
        size: formData.size,
        frameStyle: formData.frameStyle,
        posterPosition: formData.posterPosition,
        position: {
          x: formData.position.x,
          y: formData.position.y,
          width: formData.position.width,
          height: formData.position.height,
        },
        uploaded: false,
      };
      const result = await saveFrame(firestore, storage, frameData, formData.file);
      if (result.success) {
        setFrames((prev) => [
          ...prev,
          { id: result.id, ...frameData, imageUrl: result.imageUrl, fileName: formData.file.name, uploaded: false },
        ]);
        setShowForm(false); // Close the modal on successful submission
      } else {
        setError(`Failed to save frame: ${result.error}`);
      }
    } catch (err) {
      setError(`Failed to save frame: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSizeSelect = (size) => {
    // Handle size selection if needed
  };

  const handleViewImage = (imageUrl) => {
    setSelectedFrameImage(imageUrl);
    setShowImageModal(true);
  };

  const handleCloseImageModal = () => {
    setShowImageModal(false);
    setSelectedFrameImage(null);
  };

  const handleCloseFormModal = () => {
    setShowForm(false);
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "100vh" }}>
        {/* <Spinner animation="border" variant="primary" /> */}
        <p>Loading Frames...</p>
      </div>
    );
  }

  const pendingFrames = frames.filter((frame) => !frame.uploaded);

  return (
    <div className="p-4 p-md-5">
      <div className="d-flex justify-content-between align-items-center">
        <h3 className="mb-4">🖼️ Frame Management</h3>
        <Button
          variant="primary"
          className="mb-3 me-3"
          onClick={() => setShowForm(true)} // Open modal
        >
          Add New Frame
        </Button>
      </div>
      {error && (
        <Alert variant="danger" onClose={() => setError(null)} dismissible>
          {error}
        </Alert>
      )}

      <FrameForm
        showForm={showForm}
        onSubmit={handleSubmit}
        submitting={submitting}
        onClose={handleCloseFormModal}
        user={user}
        loading={loading}
        setError={setError}
      />

      <h4 className="mt-4 mb-3">Pending Frames</h4>
      {pendingFrames.length === 0 ? (
        <p>No pending frames found.</p>
      ) : (
        <Table striped bordered hover responsive>
          <thead>
            <tr>
              <th>Size</th>
              <th>Frame Style</th>
              <th>Poster Position</th>
              <th>Poster Coordinates (x, y, w, h)</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pendingFrames.map((frame) => (
              <tr key={frame.id}>
                <td>{frame.size}</td>
                <td>{frame.frameStyle}</td>
                <td>{POSTER_POSITIONS[frame.posterPosition]?.label || frame.posterPosition}</td>
                <td>
                  ({frame.position.x}, {frame.position.y}, {frame.position.width}, {frame.position.height})
                </td>
                <td>
                  <Badge bg="warning">Pending</Badge>
                </td>
                <td>
                  <Button
                    variant="outline-primary"
                    size="sm"
                    className="me-2"
                    onClick={() => handleViewImage(frame.imageUrl)}
                    disabled={!frame.imageUrl || loading}
                  >
                    View
                  </Button>
                  <Button
                    variant="outline-success"
                    size="sm"
                    className="me-2"
                    onClick={() => handleUploadToCloudinary(frame)}
                    disabled={loading}
                  >
                    Upload
                  </Button>
                  <Button
                    variant="outline-danger"
                    size="sm"
                    onClick={() => handleDeleteFrame(frame.id, frame.fileName)}
                    disabled={loading}
                  >
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <Modal show={showImageModal} onHide={handleCloseImageModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>Frame Image</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedFrameImage ? (
            <img
              src={selectedFrameImage}
              alt="Frame"
              style={{ maxWidth: "100%", height: "auto" }}
            />
          ) : (
            <p>No image available.</p>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseImageModal}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      <div className="mt-4">
        <PosterSizeTable onSelectSize={handleSizeSelect} />
      </div>
    </div>
  );
};

export default FramesAdmin;