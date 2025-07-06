import React, { useState, useRef, useEffect } from "react";
import { Form, Button, Modal, Spinner } from "react-bootstrap";
import ReactCrop, { centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";

const FRAME_SIZES = {
  A4: { name: "A4", widthPx: 800, heightPx: 1200, aspectRatio: 2 / 3 },
  A3: { name: "A3", widthPx: 1000, heightPx: 1333, aspectRatio: 3 / 4 },
  "A3 x 3": { name: "A3 x 3", widthPx: 1200, heightPx: 1600, aspectRatio: 3 / 4 },
  "A4 x 5": { name: "A4 x 5", widthPx: 1200, heightPx: 1600, aspectRatio: 3 / 4 },
};

const POSTER_POSITIONS = {
  "top-left": {
    label: "Top Left",
    getPosition: (size) => ({
      x: FRAME_SIZES[size].widthPx * 0.14, // was 0.10
      y: FRAME_SIZES[size].heightPx * 0.16,
      width: FRAME_SIZES[size].widthPx * 0.6,
      height: FRAME_SIZES[size].heightPx * 0.6,
    }),
  },
  "top-center": {
    label: "Top Center",
    getPosition: (size) => ({
      x: FRAME_SIZES[size].widthPx * 0.2,
      y: FRAME_SIZES[size].heightPx * 0.16,
      width: FRAME_SIZES[size].widthPx * 0.6,
      height: FRAME_SIZES[size].heightPx * 0.6,
    }),
  },
  "top-right": {
    label: "Top Right",
    getPosition: (size) => ({
      x: FRAME_SIZES[size].widthPx * 0.26, // was 0.30
      y: FRAME_SIZES[size].heightPx * 0.16,
      width: FRAME_SIZES[size].widthPx * 0.6,
      height: FRAME_SIZES[size].heightPx * 0.6,
    }),
  },
  "center-left": {
    label: "Center Left",
    getPosition: (size) => ({
      x: FRAME_SIZES[size].widthPx * 0.14, // was 0.10
      y: FRAME_SIZES[size].heightPx * 0.2,
      width: FRAME_SIZES[size].widthPx * 0.6,
      height: FRAME_SIZES[size].heightPx * 0.6,
    }),
  },
  center: {
    label: "Center",
    getPosition: (size) => ({
      x: FRAME_SIZES[size].widthPx * 0.2,
      y: FRAME_SIZES[size].heightPx * 0.2,
      width: FRAME_SIZES[size].widthPx * 0.6,
      height: FRAME_SIZES[size].heightPx * 0.6,
    }),
  },
  "center-right": {
    label: "Center Right",
    getPosition: (size) => ({
      x: FRAME_SIZES[size].widthPx * 0.26, // was 0.30
      y: FRAME_SIZES[size].heightPx * 0.2,
      width: FRAME_SIZES[size].widthPx * 0.6,
      height: FRAME_SIZES[size].heightPx * 0.6,
    }),
  },
  custom: {
    label: "Custom",
    getPosition: () => ({
      x: 0,
      y: 0,
      width: 0,
      height: 0,
    }),
  },
};


const IMAGE_QUALITY = 1.0;

const FrameForm = ({ showForm, onSubmit, submitting, onClose, user, loading, setError }) => {
  const [formData, setFormData] = useState({
    id: null,
    size: "A4",
    frameStyle: "",
    posterPosition: "center",
    position: POSTER_POSITIONS.center.getPosition("A4"),
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

  // Auto-update position when size or posterPosition changes (unless custom)
  useEffect(() => {
    if (formData.posterPosition !== "custom" && formData.size && POSTER_POSITIONS[formData.posterPosition]) {
      const position = POSTER_POSITIONS[formData.posterPosition].getPosition(formData.size);
      setFormData((prev) => ({ ...prev, position }));
    }
  }, [formData.size, formData.posterPosition]);

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

       if (isWebP && isCorrectSize) {
  const imageDataUrl = event.target.result;
  setImageSrc(imageDataUrl);
  setShowCropModal(true);
  setRotation(0);
  setCrop(
    centerCrop(
      makeAspectCrop(
        { unit: "%", width: 80, aspect: aspectRatio },
        aspectRatio,
        img.width,
        img.height
      ),
      img.width,
      img.height
    )
  );
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
  setImageSrc(imageDataUrl);
  setShowCropModal(true);
  setRotation(0);
  setCrop(
    centerCrop(
      makeAspectCrop(
        { unit: "%", width: 80, aspect: aspectRatio },
        aspectRatio,
        img.width,
        img.height
      ),
      img.width,
      img.height
    )
  );
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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name.includes("position.")) {
      const key = name.split(".")[1];
      setFormData((prev) => ({
        ...prev,
        posterPosition: "custom",
        position: {
          ...prev.position,
          [key]: value === "" ? 0 : parseFloat(value) || 0,
        },
      }));
    } else if (name === "posterPosition" && value !== "custom" && formData.size && POSTER_POSITIONS[value]) {
      const position = POSTER_POSITIONS[value].getPosition(formData.size);
      setFormData((prev) => ({
        ...prev,
        [name]: value,
        position,
      }));
    } else if (name === "size" && formData.posterPosition !== "custom") {
      const position = POSTER_POSITIONS[formData.posterPosition].getPosition(value);
      setFormData((prev) => ({
        ...prev,
        [name]: value,
        position,
      }));
    } else if (name === "file") {
      handleImageChange(e);
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleFormSubmit = (e) => {
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
    if (
      formData.position.x < 0 ||
      formData.position.y < 0 ||
      formData.position.width <= 0 ||
      formData.position.height <= 0
    ) {
      setError("All position coordinates (x, y, width, height) must be valid numbers greater than or equal to 0 (x, y) and greater than 0 (width, height).");
      return;
    }
    onSubmit(formData);
    onClose();
  };

  // Handle form reset when modal is closed
  const handleFormReset = () => {
    setFormData({
      id: null,
      size: "A4",
      frameStyle: "",
      posterPosition: "center",
      position: POSTER_POSITIONS.center.getPosition("A4"),
      file: null,
    });
    setCroppedPreview(null);
    setImageSrc(null);
    setCrop(null);
    setRotation(0);
    setRecommendedSize(null);
    setOriginalImageSize({ width: 0, height: 0 });
    if (fileInputRef.current) fileInputRef.current.value = "";
    onClose();
  };

  return (
    <>
      <Modal
        show={showForm}
        centered
        size="lg"
      >
        <Modal.Header>
          <Modal.Title>Add New Frame</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleFormSubmit}>
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
              <Form.Label>Frame Description</Form.Label>
              <Form.Control
                type="text"
                name="frameStyle"
                value={formData.frameStyle}
                onChange={handleInputChange}
                placeholder="e.g., Wooden Frame Top Center"
                required
                disabled={loading}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Poster Position</Form.Label>
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
              <div className="mt-2">
                <Form.Label>Poster Position Coordinates (pixels)</Form.Label>
                <div className="d-flex gap-2">
                  <Form.Control
                    type="number"
                    name="position.x"
                    value={formData.position.x ?? ""}
                    onChange={handleInputChange}
                    placeholder="X"
                    required
                    min="0"
                    step="any"
                    disabled={loading}
                  />
                  <Form.Control
                    type="number"
                    name="position.y"
                    value={formData.position.y ?? ""}
                    onChange={handleInputChange}
                    placeholder="Y"
                    required
                    min="0"
                    step="any"
                    disabled={loading}
                  />
                  <Form.Control
                    type="number"
                    name="position.width"
                    value={formData.position.width ?? ""}
                    onChange={handleInputChange}
                    placeholder="Width"
                    required
                    min="0"
                    step="any"
                    disabled={loading}
                  />
                  <Form.Control
                    type="number"
                    name="position.height"
                    value={formData.position.height ?? ""}
                    onChange={handleInputChange}
                    placeholder="Height"
                    required
                    min="0"
                    step="any"
                    disabled={loading}
                  />
                </div>
                <Form.Text className="text-muted">
                  Enter coordinates as numbers (decimals allowed).
                </Form.Text>
              </div>
            </Form.Group>
            <Form.Group>
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
              {croppedPreview && formData.size && FRAME_SIZES[formData.size] && (
                <div className="mt-3">
                  <p>
                    Original image size: {originalImageSize.width}x{originalImageSize.height}px<br />
                    Preview (image will be saved at {formData.size} resolution: {FRAME_SIZES[formData.size].widthPx}x{FRAME_SIZES[formData.size].heightPx}px):
                  </p>
                  <img src={croppedPreview} alt="Preview" style={{ maxWidth: "200px" }} />
                </div>
              )}
              <div className="d-flex mt-3 flex-grow-1 justify-content-between ">
                <Button
                  type="submit"
                  variant="primary"
                  disabled={submitting || !formData.frameStyle || !formData.file}
                >
                  {submitting ? "Saving..." : "Add Frame"}
                </Button>
                <Button variant="secondary" onClick={handleFormReset} disabled={loading}>
                  Close
                </Button>
              </div>
            </Form.Group>
          </Form>
        </Modal.Body>
      </Modal>

      <Modal
        size="lg" // or "xl" for extra large
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
          <Modal.Title>
            {formData.size && FRAME_SIZES[formData.size]
              ? `Crop Image to ${formData.size}`
              : "Crop Image"}
          </Modal.Title>
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
    </>
  );
};

export default FrameForm;