import React, { useState, useEffect, useRef } from "react";
import { Modal, Form, Button, Alert, Spinner } from "react-bootstrap";
import { useFirebase } from "../../../context/FirebaseContext";
import { collection, getDocs } from "firebase/firestore";
import { ref, getDownloadURL } from "firebase/storage";
import { saveFramedImage } from "../Posters/adminPosterUtils";

const POSTER_SIZES = {
  A4: { name: "A4", widthPx: 2480, heightPx: 3508 },
  A3: { name: "A3", widthPx: 3508, heightPx: 4961 },
  "A3*3": { name: "A3*3", widthPx: 3508 * 3, heightPx: 4961 },
  "A4*5": { name: "A4*5", widthPx: 2480 * 5, heightPx: 3508 },
};

const PosterFrameForm = ({ poster, onClose, onSave }) => {
  const { firestore, storage, user } = useFirebase();
  const [size, setSize] = useState(poster?.sizes?.[0]?.size || "A4");
  const [frames, setFrames] = useState([]);
  const [selectedFrame, setSelectedFrame] = useState(null);
  const [posterImage, setPosterImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const canvasRef = useRef(null);

  // Fetch poster image and frames
  useEffect(() => {
    const fetchData = async () => {
      if (!firestore || !storage || !poster) {
        setError("Firestore, Storage, or poster data is missing.");
        setLoading(false);
        return;
      }

      try {
        // Fetch poster image
        let posterUrl;
        if (poster.originalImageUrl && poster.source === "tempPosters") {
          const imageRef = ref(storage, poster.originalImageUrl);
          posterUrl = await getDownloadURL(imageRef);
        } else if (poster.imageUrl && poster.source === "posters") {
          posterUrl = poster.imageUrl; // Cloudinary or direct URL
        } else {
          throw new Error("No valid image URL provided.");
        }
        setPosterImage(posterUrl);

        // Fetch frames for the selected size
        const framesSnapshot = await getDocs(collection(firestore, "frames"));
        const framesData = framesSnapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .filter((frame) => frame.size === size && frame.imageUrl); // Ensure imageUrl exists
        if (framesData.length === 0) {
          setError("No frames available for the selected size.");
        } else {
          setFrames(framesData);
          setSelectedFrame(framesData[0]);
        }
      } catch (err) {
        console.error("Error fetching data:", err);
        setError(`Failed to fetch data: ${err.message}. Ensure Firebase Storage CORS is configured for localhost:3000.`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [firestore, storage, poster, size]);

  // Render composite image on canvas
  useEffect(() => {
    if (!posterImage || !selectedFrame || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const posterImg = new Image();
    const frameImg = new Image();

    const loadImages = async () => {
      try {
        // Fetch image URLs
        const frameImageRef = ref(storage, selectedFrame.imageUrl);
        const frameUrl = await getDownloadURL(frameImageRef);
        const posterUrl = posterImage; // Already fetched in previous useEffect

        posterImg.src = posterUrl;
        frameImg.src = frameUrl;

        await Promise.all([
          new Promise((resolve, reject) => {
            posterImg.onload = resolve;
            posterImg.onerror = () => reject(new Error("Failed to load poster image. Ensure Firebase Storage CORS is configured."));
          }),
          new Promise((resolve, reject) => {
            frameImg.onload = resolve;
            frameImg.onerror = () => reject(new Error("Failed to load frame image. Ensure Firebase Storage CORS is configured."));
          }),
        ]);

        // Set canvas size
        canvas.width = 1200;
        canvas.height = 800;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Calculate dimensions
        const { width, height } = POSTER_SIZES[size];
        const scale = Math.min(canvas.width / width, canvas.height / height, 1);
        const scaledWidth = width * scale;
        const scaledHeight = height * scale;
        const x = (canvas.width - scaledWidth) / 2;
        const y = (canvas.height - scaledHeight) / 2;

        // Draw poster at frame's position
        const { x: posX, y: posY, width: posWidth, height: posHeight } = selectedFrame.position;
        ctx.drawImage(posterImg, x + posX * scale, y + posY * scale, posWidth * scale, posHeight * scale);

        // Draw frame
        ctx.drawImage(frameImg, x, y, scaledWidth, scaledHeight);
      } catch (err) {
        console.error("Canvas rendering error:", err);
        setError(err.message);
      }
    };

    loadImages();
  }, [posterImage, selectedFrame, size, poster, storage]);

  const handleSave = async () => {
    if (!canvasRef.current) {
      setError("Canvas not ready.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const compositeImage = canvasRef.current.toDataURL("image/png");
      const result = await saveFramedImage(firestore, storage, poster.id, compositeImage, user);
      if (result.success) {
        onSave(poster.id, result.framedImageUrl);
        onClose();
      } else {
        setError(`Failed to save framed image: ${result.error}`);
      }
    } catch (err) {
      console.error("Error saving framed image:", err);
      setError(`Failed to save framed image: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center p-4">
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  return (
    <Modal show={true} onHide={onClose} size="lg" backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>Frame Poster: {poster?.title || "Untitled"}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && (
          <Alert variant="danger" onClose={() => setError(null)} dismissible>
            {error}
          </Alert>
        )}
        <Form>
          <Form.Group className="mb-3">
            <Form.Label>Poster Size</Form.Label>
            <Form.Select value={size} onChange={(e) => setSize(e.target.value)}>
              {poster?.sizes?.map((s) => (
                <option key={s.size} value={s.size}>
                  {s.size} ({POSTER_SIZES[s.size]?.widthPx / 300}in x {POSTER_SIZES[s.size]?.heightPx / 300}in)
                </option>
              ))}
            </Form.Select>
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Frame Style</Form.Label>
            <Form.Select
              value={selectedFrame?.id || ""}
              onChange={(e) => setSelectedFrame(frames.find((f) => f.id === e.target.value))}
              disabled={frames.length === 0}
            >
              {frames.length === 0 ? (
                <option>No frames available for this size</option>
              ) : (
                frames.map((frame) => (
                  <option key={frame.id} value={frame.id}>
                    {frame.frameStyle}
                  </option>
                ))
              )}
            </Form.Select>
          </Form.Group>
          <canvas ref={canvasRef} className="border shadow-lg mb-4 w-100" style={{ maxWidth: "100%" }} />
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSave} disabled={loading || !selectedFrame}>
          {loading ? "Saving..." : "Save Framed Image"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default PosterFrameForm;