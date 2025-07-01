import React, { useState, useEffect } from 'react';
import { Button, Table, Modal, Alert } from 'react-bootstrap';
import { collection, getDocs } from 'firebase/firestore';
import { useFirebase } from '../../../context/FirebaseContext';
import { BiImage } from 'react-icons/bi';

const FRAME_SIZES = {
  A4: { name: "A4", widthPx: 800, heightPx: 1200, aspectRatio: 2 / 3 },
  A3: { name: "A3", widthPx: 1000, heightPx: 1333, aspectRatio: 3 / 4 },
  "A3 x 3": { name: "A3 x 3", widthPx: 1200, heightPx: 1600, aspectRatio: 3 / 4 },
  "A4 x 5": { name: "A4 x 5", widthPx: 1200, heightPx: 1600, aspectRatio: 3 / 4 },
};

const PosterSizeTable = ({ onSelectSize }) => {
  const { firestore } = useFirebase();
  const [framesBySize, setFramesBySize] = useState({});
  const [selectedSize, setSelectedSize] = useState(null);
  const [frameImages, setFrameImages] = useState({});
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch frames for each size
  useEffect(() => {
    const fetchFrames = async () => {
      if (!firestore) {
        setError("Firestore instance is undefined.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const framesData = {};
        const imagesData = {};
        for (const size of Object.keys(FRAME_SIZES)) {
          const framesSnapshot = await getDocs(collection(firestore, 'frames'));
          const sizeFrames = framesSnapshot.docs
            .map((doc) => ({ id: doc.id, ...doc.data() }))
            .filter((frame) => frame.size === size && frame.imageUrl && frame.position);
          framesData[size] = sizeFrames;
          sizeFrames.forEach((frame) => {
            imagesData[frame.id] = frame.imageUrl ? frame.imageUrl : null;
          });
        }
        setFramesBySize(framesData);
        setFrameImages(imagesData);
      } catch (err) {
        setError(`Failed to fetch frames: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };
    fetchFrames();
  }, [firestore]);

  // Handle modal show/hide
  const handleShowFrames = (size) => {
    setSelectedSize(size);
    onSelectSize?.(size); // Call onSelectSize prop if provided
  };
  const handleCloseFrames = () => setSelectedSize(null);

  // Handle view image
  const handleViewImage = (frameId) => {
    if (frameImages[frameId]) {
      window.open(frameImages[frameId], '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <h4 className="mb-3">Frame Sizes</h4>
      {error && (
        <Alert variant="danger" onClose={() => setError(null)} dismissible>
          {error}
        </Alert>
      )}
      {loading ? (
        <div className="text-center">
          <p>Loading frames...</p>
        </div>
      ) : (
        <Table striped bordered hover responsive>
          <thead>
            <tr>
              <th>Size</th>
              <th>Dimensions (px)</th>
              <th>Frame Count</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {Object.keys(FRAME_SIZES).map((size) => (
              <tr key={size}>
                <td>{FRAME_SIZES[size].name}</td>
                <td>{`${FRAME_SIZES[size].widthPx}x${FRAME_SIZES[size].heightPx}`}</td>
                <td>{framesBySize[size]?.length || 0}</td>
                <td>
                  <Button
                    variant="primary"
                    size="sm"
                    className="me-2"
                    onClick={() => handleShowFrames(size)}
                    disabled={loading}
                  >
                    View Frames
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <Modal
        show={selectedSize !== null}
        onHide={handleCloseFrames}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>
            Available Frames for {selectedSize ? FRAME_SIZES[selectedSize].name : ''}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <ul className="list-group list-group-flush">
            {selectedSize && framesBySize[selectedSize]?.length > 0 ? (
              framesBySize[selectedSize].map((frame) => (
                <li
                  key={frame.id}
                  className="list-group-item d-flex justify-content-between align-items-center gap-2"
                >
                  <span>{frame.frameStyle}</span>
                  <Button
                    variant="outline-primary"
                    onClick={() => handleViewImage(frame.id)}
                    title="View image"
                    disabled={
                      !frame.id.trim() ||
                      frameImages[frame.id] === null ||
                      !frameImages[frame.id]
                    }
                    aria-label={`View image for frame ${frame.id}`}
                  >
                    {frameImages[frame.id] === null ? "Loading..." : <BiImage />}
                  </Button>
                </li>
              ))
            ) : (
              <li className="list-group-item">
                No frames available for {selectedSize ? FRAME_SIZES[selectedSize].name : ''}
              </li>
            )}
          </ul>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseFrames}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default PosterSizeTable;