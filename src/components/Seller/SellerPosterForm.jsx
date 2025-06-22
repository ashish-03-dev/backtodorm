import React, { useState, useRef, useEffect } from "react";
import { Form, Button, Alert, Modal } from "react-bootstrap";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { ref, uploadBytes } from "firebase/storage";
import Select from "react-select";
import ReactCrop, { centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { useFirebase } from "../../context/FirebaseContext";
import { addPoster } from "./sellerUtils";

// Poster sizes (300 DPI)
const POSTER_SIZES = {
  A4: { widthPx: 2480, heightPx: 3508, aspectRatio: 2480 / 3508 },
  A3: { widthPx: 3508, heightPx: 4961, aspectRatio: 3508 / 4961 },
  "A3*3": { widthPx: 3508 * 3, heightPx: 4961, aspectRatio: (3508 * 3) / 4961 },
  "A4*5": { widthPx: 2480 * 5, heightPx: 3508, aspectRatio: (2480 * 5) / 3508 },
};

function SellerPosterForm({ onSave }) {
  const { firestore, storage, user } = useFirebase();
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    tags: "",
    collections: [],
    sizes: ["A4"],
    imageFile: null,
  });
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [crop, setCrop] = useState(null);
  const [imageSrc, setImageSrc] = useState(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [selectedSize, setSelectedSize] = useState("A4");
  const [rotation, setRotation] = useState(0);
  const [croppedPreview, setCroppedPreview] = useState(null);
  const [collections, setCollections] = useState([]);
  const [sellerUsername, setSellerUsername] = useState("");
  const imgRef = useRef(null);
  const fileInputRef = useRef(null);

  // Fetch user data and collections
  useEffect(() => {
    const fetchData = async () => {
      if (!user || !firestore) {
        setError("Please log in to continue.");
        return;
      }
      try {
        // Fetch seller username
        const userDoc = await getDoc(doc(firestore, "users", user.uid));
        if (userDoc.exists() && userDoc.data().sellerUsername) {
          setSellerUsername(userDoc.data().sellerUsername);
        } else {
          setError("Seller profile incomplete. Please set up your username.");
        }
        // Fetch collections
        const snapshot = await getDocs(collection(firestore, "collections"));
        setCollections(snapshot.docs.map((doc) => ({ value: doc.id, label: doc.data().name })));
      } catch (err) {
        setError("Failed to load data: " + err.message);
      }
    };
    fetchData();
  }, [firestore, user]);

  // Handle image change
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const { widthPx, heightPx, aspectRatio } = POSTER_SIZES[selectedSize];
        if (img.width < widthPx || img.height < heightPx) {
          setWarning(
            `Image resolution (${img.width}x${img.height}) is below ${selectedSize} requirements (${widthPx}x${heightPx}). Upscaling may affect print quality.`
          );
        } else {
          setWarning("");
        }
        if (Math.abs(img.width / img.height - aspectRatio) > 0.05) {
          setImageSrc(event.target.result);
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
          setFormData((prev) => ({ ...prev, imageFile: file }));
          setCroppedPreview(event.target.result);
        }
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  // Clear image
  const handleClearImage = () => {
    setFormData((prev) => ({ ...prev, imageFile: null }));
    setImageSrc(null);
    setCroppedPreview(null);
    setShowCropModal(false);
    setCrop(null);
    setRotation(0);
    setWarning("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Rotate image
  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
    if (imgRef.current && imageSrc) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        canvas.width = img.height;
        canvas.height = img.width;
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((90 * Math.PI) / 180);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);
        setImageSrc(canvas.toDataURL("image/png", 1.0));
        setCrop(
          centerCrop(
            makeAspectCrop(
              { unit: "%", width: 80, aspect: POSTER_SIZES[selectedSize].aspectRatio },
              POSTER_SIZES[selectedSize].aspectRatio,
              canvas.width,
              canvas.height
            ),
            canvas.width,
            canvas.height
          )
        );
      };
      img.src = imageSrc;
    }
  };

  // Handle crop completion
  const handleCropComplete = () => {
    if (!imgRef.current || !crop?.width || !crop?.height || crop.width < 10 || crop.height < 10) {
      setError("Invalid or too small crop region. Please select a larger area.");
      setShowCropModal(false);
      return;
    }
    const { widthPx, heightPx } = POSTER_SIZES[selectedSize];
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = widthPx;
    canvas.height = heightPx;

    ctx.imageSmoothingQuality = "high";
    ctx.translate(widthPx / 2, heightPx / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-widthPx / 2, -heightPx / 2);
    const cropX = (crop.x / 100) * imgRef.current.naturalWidth;
    const cropY = (crop.y / 100) * imgRef.current.naturalHeight;
    const cropWidth = (crop.width / 100) * imgRef.current.naturalWidth;
    const cropHeight = (crop.height / 100) * imgRef.current.naturalHeight;
    ctx.drawImage(imgRef.current, cropX, cropY, cropWidth, cropHeight, 0, 0, widthPx, heightPx);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setError("Failed to generate cropped image.");
          setShowCropModal(false);
          return;
        }
        const croppedFile = new File([blob], `cropped_${Date.now()}.png`, { type: "image/png" });
        setFormData((prev) => ({ ...prev, imageFile: croppedFile }));
        setCroppedPreview(canvas.toDataURL("image/png", 1.0));
        setShowCropModal(false);
        setImageSrc(null);
        setCrop(null);
        setRotation(0);
      },
      "image/png",
      1.0
    );
  };

  // Handle size change
  const handleSizeChange = (index, value) => {
    const updatedSizes = [...formData.sizes];
    updatedSizes[index] = value in POSTER_SIZES ? value : "A4";
    setFormData((prev) => ({ ...prev, sizes: updatedSizes, imageFile: null }));
    setSelectedSize(value in POSTER_SIZES ? value : "A4");
    setImageSrc(null);
    setCroppedPreview(null);
    setShowCropModal(false);
    setWarning("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Add size
  const addSize = () => {
    if (formData.sizes.every((s) => s in POSTER_SIZES)) {
      setFormData((prev) => ({ ...prev, sizes: [...prev.sizes, "A4"] }));
      setSelectedSize("A4");
    } else {
      setError("Please select a valid size.");
    }
  };

  // Remove size
  const removeSize = (index) => {
    if (formData.sizes.length > 1) {
      const newSizes = formData.sizes.filter((_, i) => i !== index);
      setFormData((prev) => ({ ...prev, sizes: newSizes }));
      if (formData.sizes[index] === selectedSize) setSelectedSize(newSizes[0] || "A4");
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    if (!user) {
      setError("Please log in to submit the form.");
      setSubmitting(false);
      return;
    }
    if (!sellerUsername) {
      setError("Seller username not found. Please complete your profile.");
      setSubmitting(false);
      return;
    }
    if (!formData.title.trim()) {
      setError("Title is required.");
      setSubmitting(false);
      return;
    }
    if (!formData.description.trim()) {
      setError("Description is required.");
      setSubmitting(false);
      return;
    }
    if (!formData.imageFile) {
      setError("Image is required.");
      setSubmitting(false);
      return;
    }
    if (formData.sizes.some((s) => !(s in POSTER_SIZES))) {
      setError("Invalid size selected.");
      setSubmitting(false);
      return;
    }

    const data = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      tags: formData.tags
        .split(",")
        .map((t) => t.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""))
        .filter(Boolean),
      collections: formData.collections.map((col) => col.value),
      sizes: formData.sizes,
      sellerUsername,
      approved: "pending",
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      const imageRef = ref(storage, `posters/${sellerUsername}/${Date.now()}_${formData.imageFile.name}`);
      await uploadBytes(imageRef, formData.imageFile);
      data.originalImageUrl = imageRef.fullPath;
      const result = await addPoster(firestore, storage, data);
      if (result.success) {
        onSave(data, result.id);
      } else {
        setError(result.error || "Failed to save poster.");
      }
    } catch (err) {
      setError("Failed to save poster: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto" }}>
      <Form onSubmit={handleSubmit}>
        {error && <Alert variant="danger" onClose={() => setError("")} dismissible>{error}</Alert>}
        {warning && <Alert variant="warning" onClose={() => setWarning("")} dismissible>{warning}</Alert>}
        <Form.Group className="mb-3">
          <Form.Label>Title</Form.Label>
          <Form.Control
            type="text"
            value={formData.title}
            onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
            required
            placeholder="Poster title"
          />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Description</Form.Label>
          <Form.Control
            as="textarea"
            value={formData.description}
            onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
            required
            placeholder="Describe your poster"
            rows={2}
          />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Tags (comma-separated)</Form.Label>
          <Form.Control
            type="text"
            value={formData.tags}
            onChange={(e) => setFormData((prev) => ({ ...prev, tags: e.target.value }))}
            placeholder="e.g., k-pop, minimalist"
          />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Collections</Form.Label>
          <Select
            isMulti
            options={collections}
            value={formData.collections}
            onChange={(selected) => setFormData((prev) => ({ ...prev, collections: selected }))}
            placeholder="Select collections"
          />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Sizes</Form.Label>
          {formData.sizes.map((size, index) => (
            <div key={index} className="d-flex align-items-center gap-2 mb-2">
              <Form.Select value={size} onChange={(e) => handleSizeChange(index, e.target.value)} required>
                <option value="">Select size</option>
                {Object.keys(POSTER_SIZES).map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </Form.Select>
              {formData.sizes.length > 1 && (
                <Button variant="outline-danger" onClick={() => removeSize(index)}>
                  Remove
                </Button>
              )}
            </div>
          ))}
          <Button variant="outline-primary" size="sm" onClick={addSize}>
            + Add Size
          </Button>
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Image</Form.Label>
          <div className="d-flex gap-2 align-items-center">
            <Form.Control type="file" accept="image/*" onChange={handleImageChange} required ref={fileInputRef} />
            {formData.imageFile && (
              <Button variant="outline-danger" size="sm" onClick={handleClearImage}>
                Clear
              </Button>
            )}
          </div>
          {croppedPreview && (
            <div className="mt-3">
              <p>Preview: {warning ? "(Low Resolution - Upscaled)" : ""}</p>
              <img src={croppedPreview} alt="Preview" style={{ maxWidth: "200px" }} />
            </div>
          )}
        </Form.Group>
        <div className="d-flex gap-2">
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting ? "Submitting..." : "Submit"}
          </Button>
          <Button type="button" variant="secondary" onClick={() => onSave(null)} disabled={submitting}>
            Cancel
          </Button>
        </div>
      </Form>

      <Modal show={showCropModal} onHide={() => setShowCropModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Crop Image to {selectedSize}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <ReactCrop
            crop={crop}
            onChange={(_, percentCrop) => setCrop(percentCrop)}
            aspect={POSTER_SIZES[selectedSize].aspectRatio}
            minWidth={POSTER_SIZES[selectedSize].widthPx / 20}
            minHeight={POSTER_SIZES[selectedSize].heightPx / 20}
          >
            <img
              ref={imgRef}
              src={imageSrc}
              alt="Crop preview"
              style={{ maxWidth: "100%", transform: `rotate(${rotation}deg)` }}
              crossOrigin="anonymous"
            />
          </ReactCrop>
          <div className="d-flex gap-2 mt-3">
            <Button variant="primary" onClick={handleCropComplete} disabled={!crop?.width || !crop?.height}>
              Apply Crop
            </Button>
            <Button variant="secondary" onClick={handleRotate}>
              Rotate 90°
            </Button>
          </div>
        </Modal.Body>
      </Modal>
    </div>
  );
}

export default SellerPosterForm;