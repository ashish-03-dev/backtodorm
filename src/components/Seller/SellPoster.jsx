import React, { useState, useRef, useEffect } from "react";
import { Form, Button, Alert, Modal, ProgressBar, Spinner } from "react-bootstrap";
import { collection, getDocs, doc, getDoc, setDoc } from "firebase/firestore";
import { ref, uploadBytesResumable } from "firebase/storage";
import Select from "react-select";
import CreatableSelect from "react-select/creatable";
import ReactCrop, { centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { useFirebase } from "../../context/FirebaseContext";
import { addPoster } from "./sellerUtils";

const POSTER_SIZES = {
  A4: { widthPx: 2480, heightPx: 3508, aspectRatio: 2480 / 3508 },
  A3: { widthPx: 3508, heightPx: 4961, aspectRatio: 3508 / 4961 },
  // "A3 x 3": { widthPx: 3508 * 3, heightPx: 4961, aspectRatio: (3508 * 3) / 4961 },
};

export default function SellYourPoster() {
  const { firestore, storage, user } = useFirebase();
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    tags: "",
    collections: [],
    size: "", // Changed from sizes array to single size string
    imageFile: null,
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [cropping, setCropping] = useState(false);
  const [crop, setCrop] = useState(null);
  const [imageSrc, setImageSrc] = useState(null);
  const [originalImageSrc, setOriginalImageSrc] = useState(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [selectedSize, setSelectedSize] = useState("");
  const [rotation, setRotation] = useState(0);
  const [croppedPreview, setCroppedPreview] = useState(null);
  const [collections, setCollections] = useState([]);
  const [sellerUsername, setSellerUsername] = useState("");
  const [recommendedSize, setRecommendedSize] = useState(null);
  const [cropImageSize, setCropImageSize] = useState({ width: 0, height: 0 });
  const imgRef = useRef(null);
  const fileInputRef = useRef(null);
  const IMAGE_QUALITY = 0.9;
  const [showOptionalCropNotice, setShowOptionalCropNotice] = useState(false);

  // Reset form when closing
  useEffect(() => {
    if (!editing) {
      setFormData({
        title: "",
        description: "",
        tags: "",
        collections: [],
        size: "",
        imageFile: null,
      });
      setError("");
      setSubmitting(false);
      setProgress(0);
      setCropping(false);
      setCrop(null);
      setImageSrc(null);
      setOriginalImageSrc(null);
      setShowCropModal(false);
      setSelectedSize("");
      setRotation(0);
      setCroppedPreview(null);
      setRecommendedSize(null);
      setCropImageSize({ width: 0, height: 0 });
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [editing]);

  // Clear success message after 5 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // Fetch user data and collections
  useEffect(() => {
    const fetchData = async () => {
      if (!user || !firestore) {
        setError("Please log in to continue.");
        return;
      }
      try {
        const userDoc = await getDoc(doc(firestore, "users", user.uid));
        if (userDoc.exists() && userDoc.data().sellerUsername) {
          setSellerUsername(userDoc.data().sellerUsername);
        } else {
          setError("Seller profile incomplete. Please set up your username.");
        }
        const snapshot = await getDocs(collection(firestore, "collections"));
        setCollections(snapshot.docs.map((doc) => ({ value: doc.id, label: doc.data().name })));
      } catch (err) {
        setError("Failed to load data: " + err.message);
      }
    };
    if (editing) fetchData();
  }, [firestore, user, editing]);

  // Update crop size only during active cropping
  useEffect(() => {
    if (
      crop &&
      imageSrc &&
      imgRef.current?.naturalWidth &&
      imgRef.current?.naturalHeight &&
      selectedSize &&
      POSTER_SIZES[selectedSize]
    ) {
      const cropWidth = (crop.width / 100) * imgRef.current.naturalWidth;
      const cropHeight = (crop.height / 100) * imgRef.current.naturalHeight;
      if (cropWidth > 0 && cropHeight > 0) {
        setCropImageSize({ width: Math.round(cropWidth), height: Math.round(cropHeight) });
      } else {
        setCropImageSize({ width: 0, height: 0 });
      }
    }
  }, [crop, imageSrc, selectedSize]);

  const handleImageChange = (e) => {
    if (!selectedSize || !POSTER_SIZES[selectedSize]) {
      setError("Please select a size before uploading an image.");
      return;
    }

    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const { widthPx, heightPx, aspectRatio } = POSTER_SIZES[selectedSize];
        const actualAspect = img.width / img.height;
        const aspectDiff = Math.abs(actualAspect - aspectRatio);

        // Set image resolution for preview
        setCropImageSize({ width: img.width, height: img.height });

        // Recommend better size if resolution is low
        const bestSize = Object.keys(POSTER_SIZES).reduce((best, size) => {
          const { widthPx: w, heightPx: h, aspectRatio: r } = POSTER_SIZES[size];
          const diff = Math.abs((img.width / img.height) - r);
          const largeEnough = img.width >= w && img.height >= h;
          if (largeEnough && (!best || diff < Math.abs((img.width / img.height) - POSTER_SIZES[best].aspectRatio))) {
            return size;
          }
          return best;
        }, null);

        const isUpscaling = img.width < widthPx || img.height < heightPx;
        setRecommendedSize(isUpscaling && bestSize && bestSize !== selectedSize ? bestSize : null);

        const imageDataUrl = event.target.result;

        const applyAutoScale = () => {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          canvas.width = widthPx;
          canvas.height = heightPx;
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
          ctx.drawImage(img, 0, 0, widthPx, heightPx);
          canvas.toBlob((blob) => {
            if (blob) {
              const scaledFile = new File([blob], `scaled_${Date.now()}.jpg`, { type: "image/jpeg" });
              setFormData((prev) => ({ ...prev, imageFile: scaledFile }));
              setCroppedPreview(canvas.toDataURL("image/jpeg", IMAGE_QUALITY));
              setCropImageSize({ width: img.width, height: img.height });
            } else {
              setError("Failed to process image.");
            }
          }, "image/jpeg", IMAGE_QUALITY);
        };

        if (aspectDiff >= 0.05) {
          // Force crop
          setOriginalImageSrc(imageDataUrl);
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
          // Allow auto-scaling + manual cropping (optional)
          applyAutoScale();
          setOriginalImageSrc(imageDataUrl);
          setImageSrc(imageDataUrl);
          setRotation(0);
          setShowOptionalCropNotice(true);
          setCrop(
            centerCrop(
              makeAspectCrop({ unit: "%", width: 80, aspect: aspectRatio }, aspectRatio, img.width, img.height),
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


  const handleSwitchSize = () => {
    if (recommendedSize) {
      setFormData((prev) => ({ ...prev, size: recommendedSize }));
      setSelectedSize(recommendedSize);
      setRecommendedSize(null);
    }
  };

  const handleClearImage = () => {
    setFormData((prev) => ({ ...prev, imageFile: null }));
    setImageSrc(null);
    setOriginalImageSrc(null);
    setCroppedPreview(null);
    setShowCropModal(false);
    setCrop(null);
    setRotation(0);
    setRecommendedSize(null);
    setShowOptionalCropNotice(false); // 👈 ADD THIS HERE
    setCropImageSize({ width: 0, height: 0 });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRotate = () => {
    if (!imgRef.current || !originalImageSrc || !selectedSize || !POSTER_SIZES[selectedSize]) return;
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
      setImageSrc(canvas.toDataURL("image/jpeg", IMAGE_QUALITY));
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
      setRotation(newRotation);
      setCropImageSize({
        width: Math.round(canvas.width),
        height: Math.round(canvas.height),
      });
    };
    img.src = originalImageSrc;
  };

  const handleCropComplete = async () => {
    if (!imgRef.current || !crop?.width || !crop?.height || crop.width < 10 || crop.height < 10 || !selectedSize || !POSTER_SIZES[selectedSize]) {
      setError("Invalid crop region or size selection.");
      setShowCropModal(false);
      return;
    }
    setCropping(true);
    try {
      const { widthPx, heightPx } = POSTER_SIZES[selectedSize];
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
            const croppedFile = new File([blob], `cropped_${Date.now()}.jpg`, { type: "image/jpeg" });
            setFormData((prev) => ({ ...prev, imageFile: croppedFile }));
            setCroppedPreview(canvas.toDataURL("image/jpeg", IMAGE_QUALITY));
            setCropImageSize({ width: Math.round(cropWidth), height: Math.round(cropHeight) });
            resolve();
          },
          "image/jpeg",
          IMAGE_QUALITY
        );
      });
      setShowCropModal(false);
      setImageSrc(null);
      setOriginalImageSrc(null);
      setCrop(null);
      setRotation(0);
    } catch (err) {
      setError("Failed to process crop: " + err.message);
    } finally {
      setCropping(false);
    }
  };

  const handleSizeChange = (value) => {
    setFormData((prev) => ({ ...prev, size: value in POSTER_SIZES ? value : "", imageFile: null }));
    setSelectedSize(value in POSTER_SIZES ? value : "");
    setImageSrc(null);
    setOriginalImageSrc(null);
    setCroppedPreview(null);
    setShowCropModal(false);
    setRecommendedSize(null);
    setShowOptionalCropNotice(false); // 👈 ADD THIS HERE
    setCropImageSize({ width: 0, height: 0 });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const simplifyTags = (tags) => {
    return tags
      .split(",")
      .map((t) =>
        t
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, "")
          .replace(/\s+/g, "-")
      )
      .filter(Boolean);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);
    setProgress(0);

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
    if (!(formData.size in POSTER_SIZES)) {
      setError("Please select a valid size.");
      setSubmitting(false);
      return;
    }

    const data = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      tags: simplifyTags(formData.tags),
      collections: formData.collections.map((col) => col.value),
      sizes: [{ size: formData.size }], // Convert single size to array for compatibility
      sellerUsername,
    };

    try {
      const imageRef = ref(storage, `posters/${sellerUsername}/${Date.now()}_${formData.imageFile.name}`);
      const uploadTask = uploadBytesResumable(imageRef, formData.imageFile);
      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progressPercent = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setProgress(progressPercent);
        },
        (uploadErr) => {
          setError("Failed to upload image: " + uploadErr.message);
          setSubmitting(false);
          setProgress(0);
        },
        async () => {
          try {
            data.originalImageUrl = imageRef.fullPath;
            const result = await addPoster(firestore, data);
            if (result.success) {
              setSuccess("Poster submitted successfully! It will be reviewed soon.");
              setEditing(false);
            } else {
              setError(result.error || "Failed to save poster.");
            }
          } catch (err) {
            setError("Failed to save poster: " + err.message);
          } finally {
            setSubmitting(false);
            setProgress(0);
          }
        }
      );
    } catch (err) {
      setError("Failed to save poster: " + err.message);
      setSubmitting(false);
      setProgress(0);
    }
  };

  return (
    <div className="p-4 p-md-5">
      <h4 className="mb-4">Sell Your Poster</h4>
      {success && (
        <Alert variant="success" onClose={() => setSuccess("")} dismissible>
          {success}
        </Alert>
      )}
      {editing ? (
        <>
          <Form>
            {error && (
              <Alert variant="danger" onClose={() => setError("")} dismissible>
                {error}
              </Alert>
            )}
            <Form.Group className="mb-3">
              <Form.Label>Title</Form.Label>
              <Form.Control
                type="text"
                value={formData.title}
                onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                required
                placeholder="Poster title"
                disabled={submitting}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Describe your poster"
                rows={2}
                disabled={submitting}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Tags (comma-separated)</Form.Label>
              <Form.Control
                type="text"
                value={formData.tags}
                onChange={(e) => setFormData((prev) => ({ ...prev, tags: e.target.value }))}
                placeholder="e.g., k-pop, minimalist"
                disabled={submitting}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Collections</Form.Label>
              <CreatableSelect
                isMulti
                options={collections}
                value={formData.collections}
                onChange={(selected) => setFormData((prev) => ({ ...prev, collections: selected }))}
                placeholder="Select or type to create collections"
                isDisabled={submitting}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Size</Form.Label>
              <Form.Select
                value={formData.size}
                onChange={(e) => handleSizeChange(e.target.value)}
                required
                disabled={submitting}
              >
                <option value="">Select size</option>
                {Object.entries(POSTER_SIZES).map(([label, size]) => (
                  <option key={label} value={label}>
                    {label} - ({size.widthPx} × {size.heightPx})
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Image</Form.Label>
              <div className="position-relative">
                <Form.Control
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  required
                  ref={fileInputRef}
                  disabled={submitting || !selectedSize || !POSTER_SIZES[selectedSize]}
                  style={{ paddingRight: formData.imageFile ? "60px" : undefined }}
                />
                {formData.imageFile && (
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
                    Image resolution is too low for {selectedSize} (
                    {POSTER_SIZES[selectedSize].widthPx}x{POSTER_SIZES[selectedSize].heightPx}px). Recommended size: {recommendedSize} (
                    {POSTER_SIZES[recommendedSize].widthPx}x{POSTER_SIZES[recommendedSize].heightPx}px).
                  </p>
                  <Button variant="outline-primary" size="sm" onClick={handleSwitchSize}>
                    Switch to {recommendedSize}
                  </Button>
                </div>
              )}
              {showOptionalCropNotice && (
                <Button
                  size="sm"
                  className="mt-3"
                  variant="outline-secondary"
                  onClick={() => {
                    setShowCropModal(true);
                    setShowOptionalCropNotice(false); // hide this after showing crop modal
                  }}
                >
                  Crop Anyway
                </Button>
              )}

              {croppedPreview && selectedSize && POSTER_SIZES[selectedSize] && (
                <div className="mt-3">
                  <p>
                    Source resolution: {cropImageSize.width}x{cropImageSize.height}px<br />
                    Expected resolution ({selectedSize}): {POSTER_SIZES[selectedSize].widthPx}x{POSTER_SIZES[selectedSize].heightPx}px<br />
                  </p>
                  <img src={croppedPreview} alt="Preview" style={{ maxWidth: "200px" }} />
                </div>
              )}
            </Form.Group>
            <div className="d-flex gap-2">
              <Button type="submit" variant="primary" onClick={handleSubmit} disabled={submitting}>
                {submitting ? "Submitting..." : "Submit"}
              </Button>
              <Button variant="secondary" onClick={() => setEditing(false)} disabled={submitting}>
                Cancel
              </Button>
            </div>
            {progress > 0 && progress < 100 && (
              <ProgressBar now={progress} label={`${Math.round(progress)}%`} className="mt-3" animated />
            )}
          </Form>
          <Modal
            show={showCropModal}
            onHide={() => {
              setShowCropModal(false);
              setFormData((prev) => ({ ...prev, imageFile: null }));
              setImageSrc(null);
              setOriginalImageSrc(null);
              setCroppedPreview(null);
              setCrop(null);
              setRotation(0);
              setRecommendedSize(null);
              setCropImageSize({ width: 0, height: 0 });
              if (fileInputRef.current) fileInputRef.current.value = "";
            }}
          >
            <Modal.Header closeButton>
              <Modal.Title>{selectedSize && POSTER_SIZES[selectedSize] ? `Crop Image to ${selectedSize}` : "Crop Image"}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              {selectedSize && POSTER_SIZES[selectedSize] && (
                <>
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
                      style={{ maxWidth: "100%", imageRendering: "auto" }}
                      crossOrigin="anonymous"
                    />
                  </ReactCrop>
                  <p className="mt-2">
                    Crop resolution: {cropImageSize.width}x{cropImageSize.height}px<br />
                    Expected resolution ({selectedSize}): {POSTER_SIZES[selectedSize].widthPx}x{POSTER_SIZES[selectedSize].heightPx}px
                  </p>
                </>
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
                      disabled={!crop?.width || !crop?.height || cropping || !selectedSize || !POSTER_SIZES[selectedSize]}
                    >
                      Apply Crop
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={handleRotate}
                      disabled={cropping || !selectedSize || !POSTER_SIZES[selectedSize]}
                    >
                      Rotate 90°
                    </Button>
                  </div>
                )}
              </div>
            </Modal.Body>
          </Modal>
        </>
      ) : (
        <Button variant="primary" onClick={() => setEditing(true)}>
          Submit New Poster
        </Button>
      )}
    </div>
  );
}