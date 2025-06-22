import React, { useState, useRef, useEffect } from "react";
import { Form, Button, Modal, Alert } from "react-bootstrap";
import { doc, getDoc, collection, getDocs, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import Select from "react-select";
import ReactCrop, { centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { useFirebase } from "../../../context/FirebaseContext";

// Predefined poster sizes with dimensions (300 DPI for print quality)
const POSTER_SIZES = {
  A4: { name: "A4", widthPx: 2480, heightPx: 3508, widthCm: 21, heightCm: 29.7, aspectRatio: 2480 / 3508 },
  A3: { name: "A3", widthPx: 3508, heightPx: 4961, widthCm: 29.7, heightCm: 42, aspectRatio: 3508 / 4961 },
  "A3*3": { name: "A3*3", widthPx: 3508 * 3, heightPx: 4961, widthCm: 29.7 * 3, heightCm: 42, aspectRatio: (3508 * 3) / 4961 },
  "A4*5": { name: "A4*5", widthPx: 2480 * 5, heightPx: 3508, widthCm: 21 * 5, heightCm: 29.7, aspectRatio: (2480 * 5) / 3508 },
};

const PosterForm = ({ poster, onSave }) => {
  const { firestore, storage, auth } = useFirebase();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [idError, setIdError] = useState(null);
  const [idChecked, setIdChecked] = useState(!!poster);
  const [collectionError, setCollectionError] = useState(null);
  const [availableCollections, setAvailableCollections] = useState([]);
  const [tags, setTags] = useState(poster?.tags?.join(", ") || "");
  const [showNewCollectionModal, setShowNewCollectionModal] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [newCollectionError, setNewCollectionError] = useState(null);
  const [selectedCollections, setSelectedCollections] = useState([]);
  const [sellerUsername, setSellerUsername] = useState(poster?.sellerUsername || "");
  const [sellerName, setSellerName] = useState("");
  const [isSellerValid, setIsSellerValid] = useState(!!poster?.sellerUsername);
  const [sellerChecked, setSellerChecked] = useState(!!poster?.sellerUsername);
  const [keywords, setKeywords] = useState(poster?.keywords?.join(", ") || "");
  const [showAllKeywords, setShowAllKeywords] = useState(false);
  const [sizes, setSizes] = useState(() => {
    const validSizes = Array.isArray(poster?.sizes) && poster.sizes.length > 0
      ? poster.sizes
          .filter((s) => s.size && POSTER_SIZES[s.size])
          .map((s) => ({
            size: s.size,
            price: s.price?.toString() || "",
            finalPrice: s.finalPrice?.toString() || "",
          }))
      : [{ size: "A4", price: "", finalPrice: "" }];
    return validSizes;
  });
  const [selectedSize, setSelectedSize] = useState(() => {
    const firstValidSize = sizes.find((s) => POSTER_SIZES[s.size])?.size || "A4";
    return firstValidSize;
  });
  const [crop, setCrop] = useState(null);
  const [imageSrc, setImageSrc] = useState(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [discount, setDiscount] = useState(poster?.discount?.toString() || "0");
  const formRef = useRef(null);
  const imgRef = useRef(null);

  const normalizeText = (text) => {
    if (!text) return [];
    const lower = text.toLowerCase().trim();
    const title = lower
      .split(/\s+|-/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
    const hyphenated = lower.replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    return [...new Set([lower, title, hyphenated])].filter(Boolean);
  };

  const normalizeCollection = (text) => {
    if (!text) return "";
    return text.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  };

  useEffect(() => {
    const fetchCollections = async () => {
      try {
        const collectionsRef = collection(firestore, "collections");
        const snapshot = await getDocs(collectionsRef);
        const collections = snapshot.docs.map((doc) => ({
          value: doc.id,
          label: doc.data().name,
        }));
        setAvailableCollections(collections);
        if (poster?.collections) {
          const selected = collections.filter((col) =>
            poster.collections.includes(col.value)
          );
          setSelectedCollections(selected);
        }
      } catch (error) {
        console.error("Error fetching collections:", error);
        setCollectionError("Failed to load collections.");
      }
    };

    const fetchSellerInfo = async () => {
      if (sellerUsername) {
        try {
          const userDoc = await getDoc(doc(firestore, "users", sellerUsername));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setSellerName(data.name || "Unknown User");
            setIsSellerValid(data.isSeller || false);
            setSellerChecked(true);
          } else {
            setIsSellerValid(false);
            setSellerName("User not found");
            setSellerChecked(true);
          }
        } catch (error) {
          console.error("Error fetching seller info:", error);
          setIsSellerValid(false);
          setSellerName("Error fetching user");
          setSellerChecked(true);
        }
      } else {
        setSellerChecked(false);
      }
    };

    if (firestore) {
      fetchCollections();
      fetchSellerInfo();
    }
  }, [firestore, sellerUsername, poster]);

  useEffect(() => {
    if (!POSTER_SIZES[selectedSize]) {
      const validSize = sizes.find((s) => POSTER_SIZES[s.size])?.size || "A4";
      setSelectedSize(validSize);
    }
  }, [sizes, selectedSize]);

  const checkIdUniqueness = async (posterId) => {
    if (!posterId) {
      setIdError("Poster ID is required.");
      setIdChecked(false);
      return false;
    }
    if (!posterId.match(/^[a-zA-Z0-9_-]+$/)) {
      setIdError("Poster ID must contain only letters, numbers, hyphens, or underscores.");
      setIdChecked(false);
      return false;
    }
    if (poster && poster.id === posterId) {
      setIdError(null);
      setIdChecked(true);
      return true;
    }
    try {
      const docRef = doc(firestore, "tempPosters", posterId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setIdError("Poster ID already exists. Choose a unique ID.");
        setIdChecked(false);
        return false;
      }
      setIdError(null);
      setIdChecked(true);
      return true;
    } catch (error) {
      setIdError("Failed to check ID: " + error.message);
      setIdChecked(false);
      return false;
    }
  };

  const suggestId = () => {
    const title = formRef.current?.title?.value?.trim();
    if (!title) {
      setError("Enter a title first to suggest an ID.");
      return;
    }
    const generatedId = `${title
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")}-${Date.now()}`;
    formRef.current.posterId.value = generatedId;
    checkIdUniqueness(generatedId);
  };

  const checkSellerUsername = async () => {
    const inputSellerUsername = formRef.current?.seller?.value?.trim();
    if (!inputSellerUsername) {
      setError("Please enter a Seller Username to check.");
      setIsSellerValid(false);
      setSellerChecked(false);
      return;
    }
    try {
      const userDoc = await getDoc(doc(firestore, "users", inputSellerUsername));
      if (userDoc.exists()) {
        const data = userDoc.data();
        if (data.isSeller) {
          setSellerUsername(inputSellerUsername);
          setSellerName(data.name || "Unknown User");
          setIsSellerValid(true);
          setSellerChecked(true);
        } else {
          setSellerName("User is not a seller");
          setIsSellerValid(false);
          setSellerChecked(true);
        }
      } else {
        setSellerName("User not found");
        setIsSellerValid(false);
        setSellerChecked(true);
      }
    } catch (error) {
      console.error("Error checking seller username:", error);
      setSellerName("Error checking seller username");
      setIsSellerValid(false);
      setSellerChecked(true);
    }
  };

  const insertUserId = async () => {
    if (!auth) {
      setError("Authentication is not initialized. Please check Firebase setup.");
      return;
    }
    const user = auth.currentUser;
    if (user) {
      try {
        const userDoc = await getDoc(doc(firestore, "users", user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data.isSeller && data.sellerUsername) {
            setSellerUsername(data.sellerUsername);
            setSellerName(data.name || "Unknown User");
            setIsSellerValid(true);
            setSellerChecked(true);
          } else {
            setError("You are not registered as a seller. Please become a seller first.");
            setIsSellerValid(false);
            setSellerChecked(true);
          }
        } else {
          setError("User data not found.");
          setIsSellerValid(false);
          setSellerChecked(true);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        setError("Failed to fetch user data: " + error.message);
        setIsSellerValid(false);
        setSellerChecked(true);
      }
    } else {
      setError("No user is currently signed in.");
      setIsSellerValid(false);
      setSellerChecked(true);
    }
  };

  const generateKeywordsLocal = () => {
    const form = formRef.current;
    const title = form?.title?.value?.trim() || "";
    const description = form?.description?.value?.trim() || "";
    const tagArray = tags.split(",").map((t) => t.trim()).filter(Boolean);
    const collections = selectedCollections.map((col) => col.label);
    const stopWords = new Set(["a", "an", "the", "and", "or", "but", "in", "on", "at", "to"]);
    const words = [
      ...title.toLowerCase().split(/\s+/),
      ...description.toLowerCase().split(/\s+/),
      ...tagArray.flatMap(normalizeText),
      ...collections.flatMap(normalizeText),
    ];
    const newKeywords = [...new Set(words)]
      .filter((word) => !stopWords.has(word) && word.length > 2)
      .slice(0, 50);
    setKeywords(newKeywords.join(", "));
  };

  const handleNewCollectionSubmit = async (e) => {
    e.preventDefault();
    const name = newCollectionName.trim();
    if (!name) {
      setNewCollectionError("Collection name is required.");
      return;
    }
    const normalizedName = normalizeCollection(name);
    if (!normalizedName) {
      setNewCollectionError("Invalid collection name.");
      return;
    }
    if (availableCollections.some((c) => c.label === normalizedName)) {
      setNewCollectionError("Collection already exists.");
      return;
    }
    try {
      const collectionId = normalizedName;
      await setDoc(doc(firestore, "collections", collectionId), {
        name: normalizedName,
        createdAt: new Date(),
        posterIds: [],
      });
      const newCollection = { value: collectionId, label: normalizedName };
      setAvailableCollections((prev) => [...prev, newCollection]);
      setSelectedCollections((prev) => [...prev, newCollection]);
      setNewCollectionName("");
      setNewCollectionError(null);
      setShowNewCollectionModal(false);
    } catch (err) {
      setNewCollectionError("Failed to save collection: " + err.message);
      console.error("Error saving collection:", err);
    }
  };

  const handleSizeChange = (index, field, value) => {
    const updatedSizes = [...sizes];
    updatedSizes[index] = { ...updatedSizes[index], [field]: value };
    if (field === "size" && !POSTER_SIZES[value]) {
      updatedSizes[index].size = "A4";
    }
    if (field === "price" && value) {
      const price = parseFloat(value) || 0;
      const disc = parseFloat(discount) || 0;
      updatedSizes[index].finalPrice = (price - (price * disc) / 100).toFixed(2);
    }
    setSizes(updatedSizes);
    if (field === "size" && POSTER_SIZES[value]) {
      setSelectedSize(value);
    }
  };

  const addSize = () => {
    if (sizes.length === 0 || sizes.every((s) => s.size && s.price && POSTER_SIZES[s.size])) {
      setSizes([...sizes, { size: "A4", price: "", finalPrice: "" }]);
      setSelectedSize("A4");
    } else {
      setError("Please fill in the current size and price before adding a new one.");
    }
  };

  const removeSize = (index) => {
    if (sizes.length > 1) {
      const newSizes = sizes.filter((_, i) => i !== index);
      setSizes(newSizes);
      if (sizes[index].size === selectedSize) {
        const validSize = newSizes.find((s) => POSTER_SIZES[s.size])?.size || "A4";
        setSelectedSize(validSize);
      }
    }
  };

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
            setImageSrc(null);
            setShowCropModal(false);
            setCrop(null);
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
      canvas.toBlob((blob) => {
        const croppedFile = new File([blob], `cropped_${Date.now()}.jpg`, { type: "image/jpeg" });
        const fileList = new DataTransfer();
        fileList.items.add(croppedFile);
        formRef.current.imageFile.files = fileList.files;
        setShowCropModal(false);
        setImageSrc(null);
      }, "image/jpeg");
    }
  };

  const handleDiscountChange = (e) => {
    const disc = parseFloat(e.target.value) || 0;
    setDiscount(disc.toString());
    const updatedSizes = sizes.map((s) => {
      if (s.price) {
        const price = parseFloat(s.price) || 0;
        return { ...s, finalPrice: (price - (price * disc) / 100).toFixed(2) };
      }
      return s;
    });
    setSizes(updatedSizes);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    const posterId = (poster?.id || form.posterId.value.trim()).toLowerCase();
    const collections = selectedCollections.map((col) => normalizeCollection(col.label));
    const tagArray = tags.split(",").map((t) => normalizeCollection(t.trim())).filter(Boolean);

    if (!posterId || !idChecked || idError) {
      setError("Please provide a unique Poster ID and check its availability.");
      return;
    }
    if (!isSellerValid || !sellerUsername || !sellerChecked) {
      setError("Please provide and verify a valid Seller Username.");
      return;
    }
    if (sizes.some((s) => !s.size || !s.price || isNaN(s.price) || parseFloat(s.price) <= 0 || !POSTER_SIZES[s.size])) {
      setError("Please provide valid sizes and prices for all entries.");
      return;
    }

    if (form.imageFile.files[0]) {
      setUploading(true);
      try {
        const imageRef = ref(storage, `posters/${sellerUsername}/${Date.now()}_${form.imageFile.files[0].name}`);
        await uploadBytes(imageRef, form.imageFile.files[0]);
        const originalImageUrl = await getDownloadURL(imageRef);
        formRef.current.originalImageUrl = originalImageUrl;
      } catch (error) {
        setError("Failed to upload image: " + error.message);
        setUploading(false);
        return;
      }
      setUploading(false);
    } else if (!poster && !formRef.current.originalImageUrl) {
      setError("An image is required for new posters.");
      return;
    }

    const data = {
      title: form.title.value.trim(),
      description: form.description.value.trim(),
      tags: tagArray,
      keywords: keywords.split(",").map((k) => k.trim()).filter(Boolean),
      collections,
      originalImageUrl: formRef.current.originalImageUrl || poster?.originalImageUrl || "",
      discount: parseFloat(discount) || 0,
      sizes: sizes.map((s) => ({
        size: s.size,
        price: parseFloat(s.price),
        finalPrice: parseFloat(s.finalPrice) || parseFloat(s.price),
      })),
      approved: poster?.source === "posters" ? "approved" : "pending",
      isActive: form.isActive.checked,
      sellerUsername,
      createdAt: poster?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      posterId: posterId,
    };

    onSave(data, posterId);
  };

  return (
    <div style={{ maxWidth: "600px" }}>
      {error && <Alert variant="danger" onClose={() => setError(null)} dismissible>{error}</Alert>}
      <Form onSubmit={handleSubmit} ref={formRef}>
        <Form.Group className="mb-3">
          <Form.Label>Poster ID</Form.Label>
          <div className="input-group">
            <Form.Control
              name="posterId"
              defaultValue={poster?.posterId || poster?.id || ""}
              placeholder="Enter a unique ID (letters, numbers, hyphens, underscores)"
              required
              isInvalid={!!idError}
              isValid={idChecked && !idError}
              aria-describedby="posterIdFeedback"
            />
            <Button
              variant="outline-secondary"
              onClick={() => checkIdUniqueness(formRef.current.posterId.value.trim().toLowerCase())}
              aria-label="Check Poster ID"
              className="me-1"
            >
              Check
            </Button>
            <Button
              variant="outline-secondary"
              onClick={suggestId}
              aria-label="Suggest Poster ID"
            >
              Suggest
            </Button>
            <Form.Control.Feedback type="invalid" id="posterIdFeedback">
              {idError}
            </Form.Control.Feedback>
          </div>
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Seller Username</Form.Label>
          <div className="input-group">
            <Form.Control
              name="seller"
              value={sellerUsername}
              onChange={(e) => {
                setSellerUsername(e.target.value);
                setSellerChecked(false);
                setIsSellerValid(false);
                setSellerName("");
              }}
              placeholder="Enter Seller Username"
              required
              isInvalid={sellerChecked && !isSellerValid}
              isValid={sellerChecked && isSellerValid}
              aria-describedby="sellerUsernameFeedback"
            />
            <Button
              variant="outline-secondary"
              onClick={checkSellerUsername}
              aria-label="Check Seller Username"
              className="me-1"
            >
              Check
            </Button>
            <Button
              variant="outline-secondary"
              onClick={insertUserId}
              aria-label="Use Current User ID"
            >
              Use My ID
            </Button>
          </div>
          {sellerChecked && (
            <Form.Text className={isSellerValid ? "text-muted" : "text-danger"} id="sellerUsernameFeedback">
              {isSellerValid ? `Seller: ${sellerName}` : sellerName}
            </Form.Text>
          )}
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Title</Form.Label>
          <Form.Control
            name="title"
            defaultValue={poster?.title || ""}
            required
            placeholder="Enter poster title"
          />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Description</Form.Label>
          <Form.Control
            as="textarea"
            rows={2}
            name="description"
            defaultValue={poster?.description || ""}
            placeholder="Enter poster description"
          />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Tags (comma-separated)</Form.Label>
          <Form.Control
            name="tags"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="Enter tags (e.g., k-pop, minimalist)"
          />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Keywords (comma-separated)</Form.Label>
          <div className="input-group">
            <Form.Control
              name="keywords"
              value={keywords.slice(0, showAllKeywords ? undefined : 50)}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="Enter keywords..."
            />
            <Button
              variant="outline-secondary"
              onClick={generateKeywordsLocal}
              aria-label="Generate keywords"
              className="me-1"
              disabled={uploading}
            >
              Generate
            </Button>
            {keywords.length > 50 && (
              <Button
                variant="outline-secondary"
                onClick={() => setShowAllKeywords(!showAllKeywords)}
                aria-label={showAllKeywords ? "Truncate keywords" : "Expand keywords"}
              >
                {showAllKeywords ? "Truncate" : "Expand"}
              </Button>
            )}
          </div>
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Collections</Form.Label>
          <div className="d-flex align-items-center gap-2">
            <Select
              isMulti
              options={availableCollections}
              value={selectedCollections}
              onChange={setSelectedCollections}
              className="flex-grow-1"
              placeholder="Select collections..."
            />
            <Button
              variant="outline-primary"
              onClick={() => setShowNewCollectionModal(true)}
              title="Suggest new collection"
              aria-label="Suggest new collection"
            >
              + New
            </Button>
          </div>
          {collectionError && <Form.Text className="text-danger">{collectionError}</Form.Text>}
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Sizes and Prices</Form.Label>
          {sizes.map((sizeObj, index) => (
            <div key={index} className="d-flex align-items-center gap-2 mb-2">
              <Form.Select
                value={sizeObj.size || ""}
                onChange={(e) => handleSizeChange(index, "size", e.target.value)}
                required
              >
                <option value="">Select size</option>
                {Object.keys(POSTER_SIZES).map((size) => (
                  <option key={size} value={size}>
                    {size} ({POSTER_SIZES[size].widthCm}cm x {POSTER_SIZES[size].heightCm}cm)
                  </option>
                ))}
              </Form.Select>
              <Form.Control
                type="number"
                placeholder="Price"
                value={sizeObj.price || ""}
                onChange={(e) => handleSizeChange(index, "price", e.target.value)}
                required
                min="0"
                step="0.01"
                style={{ width: "120px" }}
              />
              <Form.Control
                type="text"
                placeholder="Final Price"
                value={sizeObj.finalPrice || ""}
                readOnly
                style={{ width: "120px" }}
              />
              {sizes.length > 1 && (
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
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Discount (%)</Form.Label>
          <Form.Control
            type="number"
            name="discount"
            value={discount}
            onChange={handleDiscountChange}
            placeholder="Enter discount percentage"
            min="0"
            max="100"
            step="0.1"
          />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Image Upload</Form.Label>
          <Form.Control
            type="file"
            name="imageFile"
            accept="image/*"
            onChange={handleImageChange}
            required={!poster?.originalImageUrl}
          />
          {poster?.originalImageUrl && (
            <Form.Text className="mt-2">
              Current: <a href={poster.originalImageUrl} target="_blank" rel="noopener noreferrer">View Image</a>
            </Form.Text>
          )}
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Check
            type="checkbox"
            name="isActive"
            label="Active"
            defaultChecked={poster?.isActive !== false}
          />
        </Form.Group>
        <div className="d-flex gap-2">
          <Button
            type="submit"
            variant="primary"
            disabled={uploading || !idChecked || !!idError || !sellerChecked || !isSellerValid}
          >
            {uploading ? "Uploading..." : poster ? "Update Poster" : "Submit Poster"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => onSave(null)}
            disabled={uploading}
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

      <Modal show={showNewCollectionModal} onHide={() => setShowNewCollectionModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Add New Collection</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleNewCollectionSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Collection Name</Form.Label>
              <Form.Control
                type="text"
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                placeholder="Enter collection name"
                required
                isInvalid={!!newCollectionError}
              />
              {newCollectionError && (
                <Form.Control.Feedback type="invalid">{newCollectionError}</Form.Control.Feedback>
              )}
            </Form.Group>
            <Button
              type="submit"
              variant="primary"
              disabled={!newCollectionName.trim()}
            >
              Save Collection
            </Button>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default PosterForm;