import React, { useState, useRef, useEffect } from "react";
import { Form, Button, Alert, Modal } from "react-bootstrap";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import Select from "react-select";
import ReactCrop, { centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { useFirebase } from "../../context/FirebaseContext";
import { addPoster } from "./sellerUtils";

// Predefined poster sizes with dimensions (300 DPI for print quality)
const POSTER_SIZES = {
  A4: {
    name: "A4",
    widthPx: 2480,
    heightPx: 3508,
    widthCm: 21,
    heightCm: 29.7,
    aspectRatio: 2480 / 3508,
  },
  A3: {
    name: "A3",
    widthPx: 3508,
    heightPx: 4961,
    widthCm: 29.7,
    heightCm: 42,
    aspectRatio: 3508 / 4961,
  },
  "A3*3": {
    name: "A3*3",
    widthPx: 3508 * 3,
    heightPx: 4961,
    widthCm: 29.7 * 3,
    heightCm: 42,
    aspectRatio: (3508 * 3) / 4961,
  },
  "A4*5": {
    name: "A4*5",
    widthPx: 2480 * 5,
    heightPx: 3508,
    widthCm: 21 * 5,
    heightCm: 29.7,
    aspectRatio: (2480 * 5) / 3508,
  },
};

function SellerPosterForm({ onSave }) {
  const { firestore, storage, user } = useFirebase();
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    tags: "",
    collections: [],
    sizes: [{ size: "A4" }],
    imageFile: null,
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [crop, setCrop] = useState(null);
  const [imageSrc, setImageSrc] = useState(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [selectedSize, setSelectedSize] = useState("A4");
  const [availableCollections, setAvailableCollections] = useState([]);
  const [sellerUsername, setSellerUsername] = useState("");
  const imgRef = useRef(null);
  const formRef = useRef(null);

  // Fetch sellerUsername from user document
  useEffect(() => {
    const fetchUserData = async () => {
      if (user && firestore) {
        try {
          const userDocRef = doc(firestore, "users", user.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            setSellerUsername(userDoc.data().sellerUsername || "");
          } else {
            setError("User document not found.");
          }
        } catch (err) {
          setError("Failed to fetch user data: " + err.message);
        }
      }
    };
    fetchUserData();
  }, [firestore, user]);

  useEffect(() => {
    const fetchCollections = async () => {
      try {
        const snapshot = await getDocs(collection(firestore, "collections"));
        const collections = snapshot.docs.map((doc) => ({
          value: doc.id,
          label: doc.data().name,
        }));
        setAvailableCollections(collections);
      } catch (err) {
        setError("Failed to load collections: " + err.message);
      }
    };
    if (firestore) {
      fetchCollections();
    }
  }, [firestore]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          if (!POSTER_SIZES[selectedSize]) {
            setError("Invalid poster size selected for cropping.");
            return;
          }
          const targetAspect = POSTER_SIZES[selectedSize].aspectRatio;
          const imageAspect = img.width / img.height;
          if (Math.abs(imageAspect - targetAspect) > 0.01) {
            setImageSrc(event.target.result);
            setShowCropModal(true);
            setCrop(
              centerCrop(
                makeAspectCrop(
                  { unit: "%", width: 90, aspect: targetAspect },
                  targetAspect,
                  img.width,
                  img.height
                ),
                img.width,
                img.height
              )
            );
          } else {
            setFormData((prev) => ({ ...prev, imageFile: file }));
          }
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCropComplete = (crop) => {
    if (imgRef.current && crop.width && crop.height) {
      if (!POSTER_SIZES[selectedSize]) {
        setError("Invalid poster size selected for cropping.");
        setShowCropModal(false);
        return;
      }
      const canvas = document.createElement("canvas");
      const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
      const scaleY = imgRef.current.naturalHeight / imgRef.current.height;
      canvas.width = crop.width * scaleX;
      canvas.height = crop.height * scaleY;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(
        imgRef.current,
        crop.x * scaleX,
        crop.y * scaleY,
        crop.width * scaleX,
        crop.height * scaleY,
        0,
        0,
        crop.width * scaleX,
        crop.height * scaleY
      );
      canvas.toBlob(
        (blob) => {
          const croppedFile = new File([blob], `cropped_${Date.now()}.jpg`, {
            type: "image/jpeg",
          });
          setFormData((prev) => ({ ...prev, imageFile: croppedFile }));
          setShowCropModal(false);
          setImageSrc(null);
        },
        "image/jpeg"
      );
    }
  };

  const handleSizeChange = (index, value) => {
    const updatedSizes = [...formData.sizes];
    updatedSizes[index] = { size: value };
    if (!POSTER_SIZES[value]) {
      updatedSizes[index].size = "A4";
    }
    setFormData((prev) => ({ ...prev, sizes: updatedSizes }));
    setSelectedSize(value || "A4");
  };

  const addSize = () => {
    if (formData.sizes.every((s) => s.size && POSTER_SIZES[s.size])) {
      setFormData((prev) => ({
        ...prev,
        sizes: [...prev.sizes, { size: "A4" }],
      }));
      setSelectedSize("A4");
    } else {
      setError("Please select a valid size before adding a new one.");
    }
  };

  const removeSize = (index) => {
    if (formData.sizes.length > 1) {
      const newSizes = formData.sizes.filter((_, i) => i !== index);
      setFormData((prev) => ({ ...prev, sizes: newSizes }));
      if (formData.sizes[index].size === selectedSize) {
        const validSize = newSizes.find((s) => POSTER_SIZES[s.size])?.size || "A4";
        setSelectedSize(validSize);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    if (!user) {
      setError("User is not authenticated. Please log in.");
      setSubmitting(false);
      return;
    }
    if (!sellerUsername) {
      setError("Seller username is not set. Please ensure your profile is complete.");
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
    if (formData.sizes.some((s) => !s.size || !POSTER_SIZES[s.size])) {
      setError("Please select a valid size for all entries.");
      setSubmitting(false);
      return;
    }
    if (!formData.imageFile) {
      setError("An image is required for new posters.");
      setSubmitting(false);
      return;
    }

    const tagArray = formData.tags
      .split(",")
      .map((t) => t.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""))
      .filter(Boolean);

    const data = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      tags: tagArray,
      collections: formData.collections.map((col) => col.value),
      sizes: formData.sizes.map((s) => ({ size: s.size })),
      sellerUsername: sellerUsername,
      approved: "pending",
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      let originalImageUrl = "";
      if (formData.imageFile) {
        const imageRef = ref(
          storage,
          `posters/${sellerUsername}/${Date.now()}_${formData.imageFile.name}`
        );
        await uploadBytes(imageRef, formData.imageFile);
        data.originalImageUrl = imageRef.fullPath;
      }

      // Use addPoster to submit to tempPosters with Firestore-generated ID
      const result = await addPoster(firestore, storage, data);
      if (result.success) {
        onSave(data, result.id);
      } else {
        setError(result.error);
      }
    } catch (err) {
      console.error("Submission error:", err);
      setError(err.message || "Failed to save poster");
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto" }}>
      <Form onSubmit={handleSubmit} ref={formRef}>
        {error && (
          <Alert variant="danger" onClose={() => setError("")} dismissible>
            {error}
          </Alert>
        )}
        <Form.Group className="mb-3">
          <Form.Label>Title</Form.Label>
          <Form.Control
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
            placeholder="Enter poster title"
          />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Description</Form.Label>
          <Form.Control
            as="textarea"
            name="description"
            value={formData.description}
            onChange={handleChange}
            required
            placeholder="Describe your poster"
            rows={2}
          />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Tags (comma-separated)</Form.Label>
          <Form.Control
            type="text"
            name="tags"
            value={formData.tags}
            onChange={handleChange}
            placeholder="Enter tags (e.g., k-pop, minimalist)"
          />
          <Form.Text className="text-muted">
            Add tags to help customers find your poster (e.g., abstract, colorful, modern).
          </Form.Text>
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Collections</Form.Label>
          <Select
            isMulti
            options={availableCollections}
            value={formData.collections}
            onChange={(selected) =>
              setFormData((prev) => ({ ...prev, collections: selected }))
            }
            placeholder="Select collections"
          />
          <Form.Text className="text-muted">
            Choose collections to categorize your poster.
          </Form.Text>
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Sizes</Form.Label>
          {formData.sizes.map((sizeObj, index) => (
            <div key={index} className="d-flex align-items-center gap-2 mb-2">
              <Form.Select
                value={sizeObj.size}
                onChange={(e) => handleSizeChange(index, e.target.value)}
                required
              >
                <option value="">Select size</option>
                {Object.keys(POSTER_SIZES).map((size) => (
                  <option key={size} value={size}>
                    {size} ({POSTER_SIZES[size].widthCm}cm x{" "}
                    {POSTER_SIZES[size].heightCm}cm,{" "}
                    {POSTER_SIZES[size].widthPx}x{POSTER_SIZES[size].heightPx}px)
                  </option>
                ))}
              </Form.Select>
              {formData.sizes.length > 1 && (
                <Button
                  variant="outline-danger"
                  onClick={() => removeSize(index)}
                  title="Remove size"
                  aria-label="Remove size"
                >
                  Remove
                </Button>
              )}
            </div>
          ))}
          <Button
            variant="outline-primary"
            size="sm"
            onClick={addSize}
            className="mt-2"
            aria-label="Add size"
          >
            + Add Size
          </Button>
          <Form.Text className="text-muted d-block mt-2">
            Ensure images meet the required dimensions for print quality (300 DPI).
          </Form.Text>
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Image Upload</Form.Label>
          <Form.Control
            type="file"
            name="imageFile"
            accept="image/*"
            onChange={handleImageChange}
            required
          />
        </Form.Group>
        <div className="d-flex gap-2">
          <Button
            type="submit"
            variant="primary"
            disabled={submitting}
          >
            {submitting ? "Submitting..." : "Submit for Review"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => onSave(null)}
            disabled={submitting}
          >
            Cancel
          </Button>
        </div>
      </Form>

      <Modal show={showCropModal} onHide={() => setShowCropModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Crop Image to {selectedSize}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {POSTER_SIZES[selectedSize] ? (
            <ReactCrop
              crop={crop}
              onChange={(_, percentCrop) => setCrop(percentCrop)}
              aspect={POSTER_SIZES[selectedSize].aspectRatio}
            >
              <img
                ref={imgRef}
                src={imageSrc}
                alt="Crop preview"
                style={{ maxWidth: "100%" }}
              />
            </ReactCrop>
          ) : (
            <Alert variant="danger">Invalid size selected for cropping. Please select a valid size.</Alert>
          )}
          <Button
            variant="primary"
            onClick={() => handleCropComplete(crop)}
            className="mt-3"
            disabled={!POSTER_SIZES[selectedSize]}
          >
            Apply Crop
          </Button>
        </Modal.Body>
      </Modal>
    </div>
  );
}

export default SellerPosterForm;