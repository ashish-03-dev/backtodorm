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
  const validSizes = Object.keys(POSTER_SIZES);
  const [size, setSize] = useState(() => {
    const firstValidSize = poster?.sizes?.find((s) => validSizes.includes(s.size))?.size || "A4";
    return firstValidSize;
  });
  const [frames, setFrames] = useState([]);
  const [selectedFrame, setSelectedFrame] = useState(null);
  const [posterImage, setPosterImage] = useState(null);
  const [useCssShadow, setUseCssShadow] = useState(true); // Changed to true for default checked
  const [cssShadow, setCssShadow] = useState({
    xOffset: -8,
    yOffset: 5,
    blurRadius: 8,
    spreadRadius: 0,
    color: "rgba(0, 0, 0, 0.5)",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const canvasRef = useRef(null);
  const posterContainerRef = useRef(null);

  // Check poster validity
  const isPosterValid = poster && poster.sizes && Array.isArray(poster.sizes);
  useEffect(() => {
    if (!isPosterValid) {
      setError("Invalid or missing poster sizes. Please provide a valid poster.");
      setLoading(false);
    }
  }, [isPosterValid]);

  // Fetch poster image and frames
  useEffect(() => {
    const fetchData = async () => {
      if (!isPosterValid || !firestore || !storage) {
        setError("Firestore, Storage, or poster data is missing.");
        setLoading(false);
        return;
      }

      try {
        if (!validSizes.includes(size)) {
          console.error("Invalid size detected:", size);
          setError(`Invalid size: ${size}. Defaulting to A4.`);
          setSize("A4");
          return;
        }

        let posterUrl;
        if (poster.originalImageUrl && poster.source === "tempPosters") {
          const imageRef = ref(storage, poster.originalImageUrl);
          posterUrl = await getDownloadURL(imageRef);
        } else if (poster.imageUrl && poster.source === "posters") {
          posterUrl = poster.imageUrl;
        } else {
          throw new Error("No valid image URL provided.");
        }
        setPosterImage(posterUrl);

        const framesSnapshot = await getDocs(collection(firestore, "frames"));
        const framesData = framesSnapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .filter((frame) => frame.size === size && frame.imageUrl && frame.position);
        if (framesData.length === 0) {
          setError(`No valid frames available for size ${size}.`);
          setSelectedFrame(null);
        } else {
          setFrames(framesData);
          setSelectedFrame(framesData[0]);
        }
      } catch (err) {
        console.error("Error fetching data:", err);
        setError(`Failed to fetch data: ${err.message}.`);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [firestore, storage, poster, size, isPosterValid]);

  // Render composite image on canvas
  useEffect(() => {
    if (!isPosterValid || !posterImage || !selectedFrame || !canvasRef.current || !selectedFrame.position) {
      return;
    }
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setError("Canvas context not available");
      return;
    }

    const drawCanvas = async () => {
      try {
        const frameUrl = selectedFrame.imageUrl;
        const posterUrl = posterImage;

        const posterImg = new Image();
        const frameImg = new Image();
        posterImg.crossOrigin = "Anonymous";
        frameImg.crossOrigin = "Anonymous";
        posterImg.src = posterUrl;
        frameImg.src = frameUrl;

        await Promise.all([
          new Promise((resolve, reject) => {
            posterImg.onload = () => posterImg.decode().then(resolve).catch(reject);
            posterImg.onerror = () => {
              setError("Failed to load poster image. Check URL or Firebase Storage rules.");
              reject(new Error("Failed to load poster image."));
            };
          }),
          new Promise((resolve, reject) => {
            frameImg.onload = () => frameImg.decode().then(resolve).catch(reject);
            frameImg.onerror = () => {
              setError("Failed to load frame image. Check URL or Firebase Storage rules.");
              reject(new Error("Failed to load frame image."));
            };
          }),
        ]);

        // Set canvas size to frame's natural resolution
        const frameWidth = frameImg.naturalWidth;
        const frameHeight = frameImg.naturalHeight;
        canvas.width = frameWidth;
        canvas.height = frameHeight;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw frame (background) without shadow
        ctx.drawImage(frameImg, 0, 0, frameWidth, frameHeight);

        // Get poster dimensions
        const posterWidth = posterImg.naturalWidth;
        const posterHeight = posterImg.naturalHeight;

        // Get position from selectedFrame.position (area where poster should be placed)
        const { x: posX, y: posY, width: posWidth, height: posHeight } = selectedFrame.position;

        // Scale poster to fit within position area while preserving aspect ratio
        const posterAspectRatio = posterWidth / posterHeight;
        let finalPosterWidth = posWidth;
        let finalPosterHeight = posWidth / posterAspectRatio;
        if (finalPosterHeight > posHeight) {
          finalPosterHeight = posHeight;
          finalPosterWidth = posHeight * posterAspectRatio;
        }
        // Center poster within position area
        const posterX = posX + (posWidth - finalPosterWidth) / 2;
        const posterY = posY + (posHeight - finalPosterHeight) / 2;

        // Save the context state to isolate shadow effects
        ctx.save();

        // Apply CSS shadow if enabled
        if (useCssShadow) {
          ctx.shadowColor = cssShadow.color;
          ctx.shadowOffsetX = cssShadow.xOffset;
          ctx.shadowOffsetY = cssShadow.yOffset;
          ctx.shadowBlur = cssShadow.blurRadius;
          ctx.shadowSpread = cssShadow.spreadRadius;
        }

        // Draw poster on top
        ctx.drawImage(posterImg, posterX, posterY, finalPosterWidth, finalPosterHeight);

        // Restore the context to remove shadow settings
        ctx.restore();
      } catch (err) {
        console.error("Canvas rendering error:", err);
        setError(`Failed to render canvas: ${err.message}. Check image URLs or Firebase Storage rules.`);
      }
    };
    drawCanvas();
  }, [posterImage, selectedFrame, useCssShadow, cssShadow, size, poster, storage, isPosterValid]);

  // Remove CSS shadow from posterContainerRef to prevent frame shadow
  useEffect(() => {
    if (posterContainerRef.current) {
      posterContainerRef.current.style.boxShadow = "none"; // No shadow on container
    }
  }, [useCssShadow, cssShadow]);

  const handleSave = async () => {
    if (!canvasRef.current) {
      setError("Canvas not ready.");
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const compositeImage = canvasRef.current.toDataURL("image/webp", 0.9); // Use WebP with 90% quality
      if (compositeImage.length < 100) {
        throw new Error("Canvas is empty. Cannot save image.");
      }
      const result = await saveFramedImage(firestore, storage, poster.id, compositeImage, user);
      if (result.success) {
        onSave(poster.id, result.framedImageUrl);
        onClose();
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      console.error("Error saving framed image:", err);
      setError(`Failed to save framed image: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isPosterValid) {
    return (
      <Alert variant="danger">
        Invalid or missing poster sizes. Please provide a valid poster.
      </Alert>
    );
  }

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
            <Form.Select
              value={size}
              onChange={(e) => {
                const newSize = e.target.value;
                console.log("Selected size:", newSize);
                if (validSizes.includes(newSize)) {
                  setSize(newSize);
                } else {
                  console.warn("Invalid size selected:", newSize);
                  setError("Selected size is invalid.");
                }
              }}
            >
              {poster.sizes
                .filter((s) => validSizes.includes(s.size))
                .map((s) => (
                  <option key={s.size} value={s.size}>
                    {s.size}
                  </option>
                ))}
              {poster.sizes.filter((s) => validSizes.includes(s.size)).length === 0 && (
                <option value="A4">A4 (default)</option>
              )}
            </Form.Select>
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Frame Style</Form.Label>
            <Form.Select
              value={selectedFrame?.id || ""}
              onChange={(e) => {
                const newFrame = frames.find((f) => f.id === e.target.value);
                setSelectedFrame(newFrame);
              }}
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
          <Form.Group className="mb-3">
            <Form.Check
              type="checkbox"
              label="Apply CSS Shadow"
              checked={useCssShadow}
              onChange={(e) => setUseCssShadow(e.target.checked)}
            />
          </Form.Group>
          {/* {useCssShadow && ( */}
            <div className="d-flex gap-2">
              <Form.Group className="mb-2">
                <Form.Label>X-Offset (px)</Form.Label>
                <Form.Control
                  type="number"
                  value={cssShadow.xOffset}
                  onChange={(e) =>
                    setCssShadow({ ...cssShadow, xOffset: parseInt(e.target.value) || 0 })
                  }
                />
              </Form.Group>
              <Form.Group className="mb-2">
                <Form.Label>Y-Offset (px)</Form.Label>
                <Form.Control
                  type="number"
                  value={cssShadow.yOffset}
                  onChange={(e) =>
                    setCssShadow({ ...cssShadow, yOffset: parseInt(e.target.value) || 0 })
                  }
                />
              </Form.Group>
              <Form.Group className="mb-2">
                <Form.Label>Blur Radius (px)</Form.Label>
                <Form.Control
                  type="number"
                  value={cssShadow.blurRadius}
                  onChange={(e) =>
                    setCssShadow({ ...cssShadow, blurRadius: parseInt(e.target.value) || 0 })
                  }
                />
              </Form.Group>
              <Form.Group className="mb-2">
                <Form.Label>Spread Radius (px)</Form.Label>
                <Form.Control
                  type="number"
                  value={cssShadow.spreadRadius}
                  onChange={(e) =>
                    setCssShadow({ ...cssShadow, spreadRadius: parseInt(e.target.value) || 0 })
                  }
                />
              </Form.Group>
            </div>
          {/* )} */}
          <div className="mb-3">
            <strong>Current Size: </strong>
            {size} ({POSTER_SIZES[size].widthPx}x{POSTER_SIZES[size].heightPx}px)
          </div>
          <div className="d-flex justify-content-center mb-3 position-relative">
            <div ref={posterContainerRef} style={{ display: "inline-block" }}>
              <canvas
                ref={canvasRef}
                className="border"
                style={{
                  maxHeight: "450px",
                  maxWidth: "100%",
                  objectFit: "contain",
                  display: "block",
                }}
              />
            </div>
          </div>
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