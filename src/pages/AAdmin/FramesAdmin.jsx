import React, { useState, useEffect, useRef } from "react";
import { Form, Button, Table, Alert, Spinner, Modal, Badge } from "react-bootstrap";
import { useFirebase } from "../../context/FirebaseContext";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
import { saveFrame } from "./Posters/adminPosterUtils";
import ReactCrop, { centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import "bootstrap/dist/css/bootstrap.min.css";
import { getFunctions, httpsCallable } from "firebase/functions";

const FRAME_SIZES = {
  A4: { name: "A4", widthPx: 900, heightPx: 1200, aspectRatio: 3 / 4 },
  A3: { name: "A3", widthPx: 1000, heightPx: 1500, aspectRatio: 2 / 3 },
  "A3 x 3": { name: "A3*3", widthPx: 1200, heightPx: 1800, aspectRatio: 2 / 3 },
  "A4 x 5": { name: "A4*5", widthPx: 1200, heightPx: 1600, aspectRatio: 3 / 4 },
};

const POSTER_POSITIONS = {
  "top-left": { label: "Top Left", getPosition: (size) => ({ x: 50, y: 50, width: FRAME_SIZES[size].widthPx * 0.8, height: FRAME_SIZES[size].heightPx * 0.8 }) },
  "top-center": { label: "Top Center", getPosition: (size) => ({ x: FRAME_SIZES[size].widthPx * 0.1, y: 50, width: FRAME_SIZES[size].widthPx * 0.8, height: FRAME_SIZES[size].heightPx * 0.8 }) },
  "top-right": { label: "Top Right", getPosition: (size) => ({ x: FRAME_SIZES[size].widthPx * 0.2, y: 50, width: FRAME_SIZES[size].widthPx * 0.8, height: FRAME_SIZES[size].heightPx * 0.8 }) },
  "center-left": { label: "Center Left", getPosition: (size) => ({ x: 50, y: FRAME_SIZES[size].heightPx * 0.1, width: FRAME_SIZES[size].widthPx * 0.8, height: FRAME_SIZES[size].heightPx * 0.8 }) },
  "center": { label: "Center", getPosition: (size) => ({ x: FRAME_SIZES[size].widthPx * 0.1, y: FRAME_SIZES[size].heightPx * 0.1, width: FRAME_SIZES[size].widthPx * 0.8, height: FRAME_SIZES[size].heightPx * 0.8 }) },
  "center-right": { label: "Center Right", getPosition: (size) => ({ x: FRAME_SIZES[size].widthPx * 0.2, y: FRAME_SIZES[size].heightPx * 0.1, width: FRAME_SIZES[size].widthPx * 0.8, height: FRAME_SIZES[size].heightPx * 0.8 }) },
  "bottom-left": { label: "Bottom Left", getPosition: (size) => ({ x: 50, y: FRAME_SIZES[size].heightPx * 0.2, width: FRAME_SIZES[size].widthPx * 0.8, height: FRAME_SIZES[size].heightPx * 0.8 }) },
  "bottom-center": { label: "Bottom Center", getPosition: (size) => ({ x: FRAME_SIZES[size].widthPx * 0.1, y: FRAME_SIZES[size].heightPx * 0.2, width: FRAME_SIZES[size].widthPx * 0.8, height: FRAME_SIZES[size].heightPx * 0.8 }) },
  "bottom-right": { label: "Bottom Right", getPosition: (size) => ({ x: FRAME_SIZES[size].widthPx * 0.2, y: FRAME_SIZES[size].heightPx * 0.2, width: FRAME_SIZES[size].widthPx * 0.8, height: FRAME_SIZES[size].heightPx * 0.8 }) },
  "custom": { label: "Custom", getPosition: () => ({ x: 0, y: 0, width: 0, height: 0 }) },
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
    posterPosition: "center",
    position: { x: 0, y: 0, width: 0, height: 0 },
    file: null,
  });
  const [cropping, setCropping] = useState(false);
  const [crop, setCrop] = useState(null);
  const [imageSrc, setImageSrc] = useState(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [croppedPreview, setCroppedPreview] = useState(null);
  const [rotation, setRotation] = useState(0);
  const [recommendedSize, setRecommendedSize] = useState(null);
  const [originalImageSize, setOriginalImageSize] = useState({ width: 0, height: 0 });
  const imgRef = useRef(null);
  const fileInputRef = useRef(null);
  const IMAGE_QUALITY = 1.0; // Set to 1.0 to preserve quality

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
        console.error("Failed to fetch frames:", err);
        setError(`Failed to fetch frames: ${err.message}`);
        setLoading(false);
      }
    };
    fetchFrames();
  }, [firestore]);

  const handleImageChange = (e) => {
    if (!formData.size || !FRAME_SIZES[formData.size]) {
      setError("Please select a size before uploading an image.");
      return;
    }
    const file = e.target.files[0];
    if (!file) return;
    const isWebP = file.type === "image/webp";
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        setOriginalImageSize({ width: img.width, height: img.height });
        const { widthPx, heightPx, aspectRatio } = FRAME_SIZES[formData.size];
        const isCorrectSize = img.width >= widthPx && img.height >= heightPx;
        const isCorrectAspect = Math.abs(img.width / img.height - aspectRatio) <= 0.05;

        if (isWebP && isCorrectSize && isCorrectAspect) {
          setFormData((prev) => ({ ...prev, file }));
          setCroppedPreview(event.target.result);
        } else {
          const bestSize = Object.keys(FRAME_SIZES).reduce((best, size) => {
            const { widthPx: w, heightPx: h } = FRAME_SIZES[size];
            if (img.width >= w && img.height >= h && (!best || w * h > FRAME_SIZES[best].widthPx * FRAME_SIZES[best].heightPx)) {
              return size;
            }
            return best;
          }, null);

          const isUpscaling = img.width < widthPx || img.height < heightPx;
          if (isUpscaling && bestSize && bestSize !== formData.size) {
            setRecommendedSize(bestSize);
          } else {
            setRecommendedSize(null);
          }

          const imageDataUrl = event.target.result;
          if (Math.abs(img.width / img.height - aspectRatio) > 0.05) {
            setImageSrc(imageDataUrl);
            setShowCropModal(true);
            setRotation(0);
            setCrop(
              centerCrop(
                makeAspectCrop({ unit: "%", width: 80, aspect: aspectRatio }, aspectRatio, img.width, img.height),
                img.width,
                img.height
              )
            );
          } else {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            canvas.width = widthPx;
            canvas.height = heightPx;
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = "high";
            ctx.drawImage(img, 0, 0, widthPx, heightPx);
            canvas.toBlob(
              (blob) => {
                if (blob) {
                  const scaledFile = new File([blob], `scaled_${Date.now()}.webp`, { type: "image/webp" });
                  setFormData((prev) => ({ ...prev, file: scaledFile }));
                  setCroppedPreview(canvas.toDataURL("image/webp", IMAGE_QUALITY));
                }
              },
              "image/webp",
              IMAGE_QUALITY
            );
          }
        }
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = async () => {
    if (!imgRef.current || !crop?.width || !crop?.height || crop.width < 10 || crop.height < 10 || !formData.size || !FRAME_SIZES[formData.size]) {
      setError("Invalid crop region or size selection.");
      setShowCropModal(false);
      return;
    }
    setCropping(true);
    try {
      const { widthPx, heightPx } = FRAME_SIZES[formData.size];
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = widthPx;
      canvas.height = heightPx;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      const cropX = (crop.x / 100) * imgRef.current.naturalWidth;
      const cropY = (crop.y / 100) * imgRef.current.naturalHeight;
      const cropWidth = (crop.width / 100) * imgRef.current.naturalWidth;
      const cropHeight = (crop.height / 100) * imgRef.current.naturalHeight;
      ctx.drawImage(imgRef.current, cropX, cropY, cropWidth, cropHeight, 0, 0, widthPx, heightPx);

      await new Promise((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Failed to generate cropped image."));
              return;
            }
            const croppedFile = new File([blob], `cropped_${Date.now()}.webp`, { type: "image/webp" });
            setFormData((prev) => ({ ...prev, file: croppedFile }));
            setCroppedPreview(canvas.toDataURL("image/webp", IMAGE_QUALITY));
            resolve();
          },
          "image/webp",
          IMAGE_QUALITY
        );
      });

      setShowCropModal(false);
      setImageSrc(null);
      setCrop(null);
      setRotation(0);
    } catch (err) {
      console.error("Failed to process crop:", err);
      setError("Failed to process crop: " + err.message);
    } finally {
      setCropping(false);
    }
  };

  const handleRotate = () => {
    if (!imgRef.current || !imageSrc || !formData.size || !FRAME_SIZES[formData.size]) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const newRotation = (rotation + 90) % 360;
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = newRotation % 180 === 0 ? img.width : img.height;
      canvas.height = newRotation % 180 === 0 ? img.height : img.width;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((newRotation * Math.PI) / 180);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      setImageSrc(canvas.toDataURL("image/webp", IMAGE_QUALITY));
      setCrop(
        centerCrop(
          makeAspectCrop(
            { unit: "%", width: 80, aspect: FRAME_SIZES[formData.size].aspectRatio },
            FRAME_SIZES[formData.size].aspectRatio,
            canvas.width,
            canvas.height
          ),
          canvas.width,
          canvas.height
        )
      );
      setRotation(newRotation);
      setOriginalImageSize({ width: canvas.width, height: canvas.height });
    };
    img.src = imageSrc;
  };

  const handleClearImage = () => {
    setFormData((prev) => ({ ...prev, file: null }));
    setImageSrc(null);
    setCroppedPreview(null);
    setShowCropModal(false);
    setCrop(null);
    setRotation(0);
    setRecommendedSize(null);
    setOriginalImageSize({ width: 0, height: 0 });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSwitchSize = () => {
    if (recommendedSize) {
      setFormData((prev) => ({ ...prev, size: recommendedSize, file: null }));
      setRecommendedSize(null);
      setImageSrc(null);
      setCroppedPreview(null);
      setShowCropModal(false);
      setCrop(null);
      setRotation(0);
      setOriginalImageSize({ width: 0, height: 0 });
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleAutofillPosition = () => {
    if (formData.posterPosition !== "custom" && formData.size && POSTER_POSITIONS[formData.posterPosition]) {
      const position = POSTER_POSITIONS[formData.posterPosition].getPosition(formData.size);
      setFormData((prev) => ({ ...prev, position }));
    }
  };

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
      console.error("Failed to upload to Cloudinary:", err);
      setError(`Failed to upload to Cloudinary: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name.includes("position.")) {
      const key = name.split(".")[1];
      setFormData((prev) => ({
        ...prev,
        posterPosition: "custom",
        position: { ...prev.position, [key]: parseFloat(value) || 0 },
      }));
    } else if (name === "file") {
      handleImageChange(e);
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
    if (!formData.frameStyle) {
      setError("Frame style is required.");
      return;
    }
    if (!formData.size || !FRAME_SIZES[formData.size]) {
      setError("Please select a valid size.");
      return;
    }
    if (!formData.file) {
      setError("Image is required.");
      return;
    }
    if (formData.position.width <= 0 || formData.position.height <= 0) {
      setError("Poster position width and height must be greater than 0.");
      return;
    }
    try {
      setLoading(true);
      setError(null);

      const frameData = {
        size: formData.size,
        frameStyle: formData.frameStyle,
        posterPosition: formData.posterPosition,
        position: formData.position,
        uploaded: false,
      };

      const result = await saveFrame(firestore, storage, frameData, formData.file, user);
      if (result.success) {
        setFrames((prev) => [...prev, { id: result.id, ...frameData, imageUrl: result.imageUrl, fileName: formData.file.name, uploaded: false }]);
        resetForm();
      } else {
        setError(`Failed to save frame: ${result.error}`);
      }
    } catch (err) {
      console.error("Failed to save frame:", err);
      setError(`Failed to save frame: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      id: null,
      size: "A4",
      frameStyle: "",
      posterPosition: "center",
      position: { x: 0, y: 0, width: 0, height: 0 },
      file: null,
    });
    setCroppedPreview(null);
    setImageSrc(null);
    setCrop(null);
    setRotation(0);
    setRecommendedSize(null);
    setOriginalImageSize({ width: 0, height: 0 });
    if (fileInputRef.current) fileInputRef.current.value = "";
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

      <h4 className="mb-3">Add New Frame</h4>
      <Form onSubmit={handleSubmit}>
        <Form.Group className="mb-3">
          <Form.Label>Size</Form.Label>
          <Form.Select
            name="size"
            value={formData.size}
            onChange={handleInputChange}
            required
            disabled={loading}
          >
            {Object.keys(FRAME_SIZES).map((key) => (
              <option key={key} value={key}>
                {key}
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
            disabled={loading}
          />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Poster Position</Form.Label>
          <div className="d-flex gap-2">
            <Form.Select
              name="posterPosition"
              value={formData.posterPosition}
              onChange={handleInputChange}
              required
              disabled={loading}
            >
              {Object.keys(POSTER_POSITIONS).map((key) => (
                <option key={key} value={key}>
                  {POSTER_POSITIONS[key].label}
                </option>
              ))}
            </Form.Select>
            <Button
              variant="outline-primary"
              size="sm"
              onClick={handleAutofillPosition}
              disabled={loading || formData.posterPosition === "custom" || !formData.size}
            >
              Apply
            </Button>
          </div>
          <div className="mt-2">
            <Form.Label>Poster Position Coordinates (pixels)</Form.Label>
            <div className="d-flex gap-2">
              <Form.Control
                type="number"
                name="position.x"
                value={formData.position.x}
                onChange={handleInputChange}
                placeholder="X"
                required
                min="0"
                disabled={loading}
              />
              <Form.Control
                type="number"
                name="position.y"
                value={formData.position.y}
                onChange={handleInputChange}
                placeholder="Y"
                required
                min="0"
                disabled={loading}
              />
              <Form.Control
                type="number"
                name="position.width"
                value={formData.position.width}
                onChange={handleInputChange}
                placeholder="Width"
                required
                min="0"
                disabled={loading}
              />
              <Form.Control
                type="number"
                name="position.height"
                value={formData.position.height}
                onChange={handleInputChange}
                placeholder="Height"
                required
                min="0"
                disabled={loading}
              />
            </div>
          </div>
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Frame Image</Form.Label>
          <div className="position-relative">
            <Form.Control
              type="file"
              name="file"
              accept="image/*"
              onChange={handleImageChange}
              required
              ref={fileInputRef}
              disabled={loading || !formData.size || !FRAME_SIZES[formData.size]}
            />
            {formData.file && (
              <span
                onClick={handleClearImage}
                style={{
                  position: "absolute",
                  top: "50%",
                  right: "10px",
                  transform: "translateY(-50%)",
                  cursor: "pointer",
                  fontSize: "0.9rem",
                  color: "#007bff",
                }}
              >
                Clear
              </span>
            )}
          </div>
          {recommendedSize && (
            <div className="mt-2">
              <p>
                Image resolution is too low for {formData.size}. Would you like to switch to {recommendedSize} (
                {FRAME_SIZES[recommendedSize].widthPx}x{FRAME_SIZES[recommendedSize].heightPx}px)?
              </p>
              <Button variant="outline-primary" size="sm" onClick={handleSwitchSize} disabled={loading}>
                Switch to {recommendedSize}
              </Button>
            </div>
          )}
          {croppedPreview && formData.size && FRAME_SIZES[formData.size] && (
            <div className="mt-3">
              <p>
                Original image size: {originalImageSize.width}x{originalImageSize.height}px<br />
                Preview (image will be saved at {formData.size} resolution: {FRAME_SIZES[formData.size].widthPx}x{FRAME_SIZES[formData.size].heightPx}px):
              </p>
              <img src={croppedPreview} alt="Preview" style={{ maxWidth: "200px" }} />
            </div>
          )}
        </Form.Group>
        <Button
          type="submit"
          variant="primary"
          disabled={loading || !formData.frameStyle || !formData.file}
        >
          {loading ? "Saving..." : "Add Frame"}
        </Button>
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
              <th>Poster Position</th>
              <th>Poster Coordinates (x, y, w, h)</th>
              <th>Image</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {frames.map((frame) => (
              <tr key={frame.id}>
                <td>{frame.size}</td>
                <td>{frame.frameStyle}</td>
                <td>{POSTER_POSITIONS[frame.posterPosition]?.label || frame.posterPosition}</td>
                <td>
                  ({frame.position.x}, {frame.position.y}, {frame.position.width}, {frame.position.height})
                </td>
                <td>
                  {frame.imageUrl ? (
                    <img
                      src={frame.imageUrl}
                      alt={frame.frameStyle}
                      style={{ width: "100px", height: "auto" }}
                    />
                  ) : (
                    "No Image"
                  )}
                </td>
                <td>
                  {frame.uploaded ? (
                    <Badge bg="success">Uploaded</Badge>
                  ) : (
                    "-"
                  )}
                </td>
                <td>
                  {!frame.uploaded && frame.imageUrl && (
                    <Button
                      variant="outline-success"
                      size="sm"
                      onClick={() => handleUploadToCloudinary(frame)}
                      disabled={loading}
                    >
                      Upload
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <Modal
        show={showCropModal}
        onHide={() => {
          setShowCropModal(false);
          setFormData((prev) => ({ ...prev, file: null }));
          setImageSrc(null);
          setCroppedPreview(null);
          setCrop(null);
          setRotation(0);
          setRecommendedSize(null);
          setOriginalImageSize({ width: 0, height: 0 });
          if (fileInputRef.current) fileInputRef.current.value = "";
        }}
      >
        <Modal.Header closeButton>
          <Modal.Title>{formData.size && FRAME_SIZES[formData.size] ? `Crop Image to ${formData.size}` : "Crop Image"}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {formData.size && FRAME_SIZES[formData.size] && (
            <ReactCrop
              crop={crop}
              onChange={(_, percentCrop) => setCrop(percentCrop)}
              aspect={FRAME_SIZES[formData.size].aspectRatio}
              minWidth={FRAME_SIZES[formData.size].widthPx / 20}
              minHeight={FRAME_SIZES[formData.size].heightPx / 20}
            >
              <img
                ref={imgRef}
                src={imageSrc}
                alt="Crop preview"
                style={{ maxWidth: "100%", imageRendering: "auto" }}
                crossOrigin="anonymous"
              />
            </ReactCrop>
          )}
          <div className="d-flex flex-column align-items-center gap-2 mt-3">
            {cropping ? (
              <div className="d-flex flex-column align-items-center">
                <Spinner animation="border" className="d-block text-primary" role="status">
                  <span className="visually-hidden">Processing...</span>
                </Spinner>
                <p className="mt-2 text-muted">Processing...</p>
              </div>
            ) : (
              <div className="d-flex gap-2">
                <Button
                  variant="primary"
                  onClick={handleCropComplete}
                  disabled={!crop?.width || !crop?.height || cropping || !formData.size || !FRAME_SIZES[formData.size]}
                >
                  Apply Crop
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleRotate}
                  disabled={cropping || !formData.size || !FRAME_SIZES[formData.size]}
                >
                  Rotate 90°
                </Button>
              </div>
            )}
          </div>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default FramesAdmin;