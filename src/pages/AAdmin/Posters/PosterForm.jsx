import React, { useState, useRef, useEffect } from "react";
import { Form, Button, Modal } from "react-bootstrap";
import { doc, getDoc, collection, getDocs, setDoc, query, where } from "firebase/firestore";
import Select from "react-select";
import { useFirebase } from "../../../context/FirebaseContext";

const PosterForm = ({ poster, onSave }) => {
  const { firestore, auth } = useFirebase();
  const [uploading, setUploading] = useState(false);
  const [idError, setIdError] = useState(null);
  const [collectionError, setCollectionError] = useState(null);
  const [idChecked, setIdChecked] = useState(!!poster);
  const [availableCollections, setAvailableCollections] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);
  const [showNewCollectionModal, setShowNewCollectionModal] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [newCollectionError, setNewCollectionError] = useState(null);
  const [selectedCollections, setSelectedCollections] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [sellerUsername, setSellerUsername] = useState(poster?.sellerUsername || "@");
  const [sellerName, setSellerName] = useState("");
  const [sellerId, setSellerId] = useState(poster?.seller || "");
  const [isSellerValid, setIsSellerValid] = useState(!!poster);
  const [keywords, setKeywords] = useState(poster?.keywords?.join(", ") || "");
  const [showAllKeywords, setShowAllKeywords] = useState(false);
  const [sizes, setSizes] = useState(
    Array.isArray(poster?.sizes) && poster.sizes.length > 0
      ? poster.sizes
      : [{ size: "", price: "" }]
  );
  const formRef = useRef(null);

  // Normalize text for keywords and collections
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

  // Normalize to hyphenated lowercase
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
          value: doc.id, // e.g., "k-pop"
          label: doc.data().name, // e.g., "k-pop"
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

    const fetchTags = async () => {
      try {
        const tagsRef = collection(firestore, "tags");
        const snapshot = await getDocs(tagsRef);
        const tags = snapshot.docs.map((doc) => ({
          value: doc.id,
          label: doc.data().name, // e.g., "k-pop"
        }));
        setAvailableTags(tags);
        if (poster?.tags) {
          const selected = poster.tags.map((tag) => {
            const existingTag = tags.find((t) => t.value === tag || t.label === tag);
            return existingTag || { value: tag, label: tag };
          });
          setSelectedTags(selected);
        }
      } catch (error) {
        console.error("Error fetching tags:", error);
      }
    };

    const fetchSellerInfo = async () => {
      if (poster?.seller && poster?.sellerUsername) {
        try {
          const userQuery = query(
            collection(firestore, "users"),
            where("sellerUsername", "==", poster.sellerUsername)
          );
          const querySnapshot = await getDocs(userQuery);
          if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0];
            const data = userDoc.data();
            setSellerName(data.name || "Unknown User");
            setIsSellerValid(!!data.isSeller);
            setSellerId(userDoc.id);
          } else {
            setIsSellerValid(false);
          }
        } catch (error) {
          console.error("Error fetching seller info:", error);
          setIsSellerValid(false);
        }
      }
    };

    if (firestore) {
      fetchCollections();
      fetchTags();
      fetchSellerInfo();
    }
  }, [firestore, poster]);

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
      const docRef = doc(firestore, "posters", posterId);
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
      alert("Enter a title first to suggest an ID.");
      return;
    }
    const generatedId = `${title
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9\-_]/g, "")}-${Date.now()}`;
    formRef.current.posterId.value = generatedId;
    checkIdUniqueness(generatedId);
  };

  const checkSellerUsername = async (username) => {
    if (!username || username.length <= 1) {
      setIsSellerValid(false);
      setSellerName("");
      setSellerId("");
      return false;
    }
    if (!username.startsWith("@")) {
      setIsSellerValid(false);
      setSellerName("");
      setSellerId("");
      return false;
    }
    try {
      const userQuery = query(
        collection(firestore, "users"),
        where("sellerUsername", "==", username)
      );
      const querySnapshot = await getDocs(userQuery);
      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        const data = userDoc.data();
        if (data.isSeller) {
          setSellerName(data.name || "Unknown User");
          setIsSellerValid(true);
          setSellerId(userDoc.id);
          return true;
        }
      }
      setIsSellerValid(false);
      setSellerName("");
      setSellerId("");
      return false;
    } catch (error) {
      console.error("Error checking seller username:", error);
      setIsSellerValid(false);
      setSellerName("");
      setSellerId("");
      return false;
    }
  };

  const insertUserId = async () => {
    if (!auth) {
      alert("Authentication is not initialized. Please check Firebase setup.");
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
            formRef.current.seller.value = data.sellerUsername;
            setSellerName(data.name || "Unknown User");
            setIsSellerValid(true);
            setSellerId(user.uid);
          } else {
            alert("You are not registered as a seller. Please become a seller first.");
          }
        } else {
          alert("User data not found.");
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        alert("Failed to fetch user data: " + error.message);
      }
    } else {
      alert("No user is currently signed in.");
    }
  };

  const handleSellerUsernameChange = (e) => {
    let value = e.target.value;
    if (!value.startsWith("@")) {
      value = "@" + value.replace(/^@+/, "");
    }
    setSellerUsername(value);
    setIsSellerValid(false);
    setSellerName("");
    setSellerId("");
  };

  const handleTagChange = async (selectedOptions) => {
    setSelectedTags(selectedOptions || []);
    for (const option of selectedOptions || []) {
      if (!availableTags.some((tag) => tag.value === option.value)) {
        try {
          const newTagName = normalizeCollection(option.label.trim());
          if (!newTagName || availableTags.some((tag) => tag.label === newTagName)) {
            continue;
          }
          const newTagId = doc(collection(firestore, "tags")).id;
          await setDoc(doc(firestore, "tags", newTagId), { name: newTagName });
          setAvailableTags((prev) => [
            ...prev,
            { value: newTagId, label: newTagName },
          ]);
        } catch (error) {
          console.error("Error adding new tag:", error);
        }
      }
    }
  };

  const generateKeywordsLocal = () => {
    const form = formRef.current;
    const title = form?.title?.value?.trim() || "";
    const description = form?.description?.value?.trim() || "";
    const tags = selectedTags.map((t) => t.label);
    const collections = selectedCollections.map((col) => col.label);
    const stopWords = new Set(["a", "an", "the", "and", "or", "but", "in", "on", "at", "to"]);
    const words = [
      ...title.toLowerCase().split(/\s+/),
      ...description.toLowerCase().split(/\s+/),
      ...tags.flatMap(normalizeText),
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
        name: normalizedName, // e.g., "k-pop"
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
    setSizes(updatedSizes);
  };

  const addSize = () => {
    if (sizes.length === 0 || sizes.every((s) => s.size && s.price)) {
      setSizes([...sizes, { size: "", price: "" }]);
    } else {
      alert("Please fill in the current size and price before adding a new one.");
    }
  };

  const removeSize = (index) => {
    if (sizes.length > 1) {
      setSizes(sizes.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    const posterId = (poster?.id || form.posterId.value.trim()).toLowerCase();
    const discount = parseFloat(form.discount.value) || 0;
    let imageUrl = poster?.imageUrl || form.imageUrl.value;
    const collections = selectedCollections.map((col) => normalizeCollection(col.label)); // e.g., "k-pop"
    const tags = selectedTags.map((tag) => normalizeCollection(tag.label)); // e.g., "k-pop"

    if (!poster && (!posterId || !idChecked || idError)) {
      alert("Please provide a unique Poster ID and check its availability.");
      return;
    }
    if (!isSellerValid) {
      alert("Please provide a valid seller username and check its availability.");
      return;
    }
    if (sizes.some((s) => !s.size || !s.price || isNaN(s.price) || parseFloat(s.price) <= 0)) {
      alert("Please provide valid sizes and prices for all entries.");
      return;
    }

    if (form.imageFile.files[0]) {
      setUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", form.imageFile.files[0]);
        formData.append("upload_preset", "your_unsigned_preset");
        const response = await fetch(
          `https://api.cloudinary.com/v1_1/your-cloud-name/image/upload`,
          {
            method: "POST",
            body: formData,
          }
        );
        const data = await response.json();
        if (!data.secure_url) {
          throw new Error("Image upload failed");
        }
        imageUrl = data.secure_url;
      } catch (error) {
        alert("Failed to upload image: " + error.message);
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    const data = {
      title: form.title.value,
      description: form.description.value,
      tags,
      keywords: keywords.split(",").map((k) => k.trim()).filter(Boolean),
      collections,
      imageUrl,
      discount,
      sizes: sizes.map((s) => ({
        size: s.size,
        price: parseFloat(s.price),
        finalPrice: Math.round(parseFloat(s.price) - (parseFloat(s.price) * discount) / 100),
      })),
      approved: poster?.approved || "draft",
      isActive: form.isActive.checked,
      seller: sellerId,
      sellerUsername,
      createdAt: poster?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    onSave(data, posterId);
  };

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto" }}>
      <Form onSubmit={handleSubmit} ref={formRef}>
        {!poster ? (
          <Form.Group className="mb-3">
            <Form.Label>Poster ID</Form.Label>
            <div className="input-group">
              <Form.Control
                name="posterId"
                defaultValue=""
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
        ) : (
          <Form.Group className="mb-3">
            <Form.Label>Poster ID</Form.Label>
            <Form.Control
              name="posterId"
              defaultValue={poster.id}
              disabled
              readOnly
            />
          </Form.Group>
        )}
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
          <Form.Label>Tags</Form.Label>
          <Select
            isMulti
            options={availableTags}
            value={selectedTags}
            onChange={handleTagChange}
            className="flex-grow-1"
            placeholder="Select or create tags (e.g., k-pop, minimalist)..."
            isCreatable
            formatCreateLabel={(inputValue) => `Create tag "${inputValue}"`}
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
              <Form.Control
                type="text"
                placeholder="Size (e.g., A4)"
                value={sizeObj.size || ""}
                onChange={(e) => handleSizeChange(index, "size", e.target.value)}
                required
              />
              <Form.Control
                type="number"
                placeholder="Price (₹)"
                value={sizeObj.price || ""}
                onChange={(e) => handleSizeChange(index, "price", e.target.value)}
                required
                min="0"
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
          <Form.Label>Image Upload</Form.Label>
          <Form.Control type="file" name="imageFile" accept="image/*" />
          {poster?.imageUrl && (
            <Form.Text className="mt-2">
              Current: <a href={poster.imageUrl} target="_blank" rel="noopener noreferrer">View Image</a>
            </Form.Text>
          )}
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Image URL (optional if uploading)</Form.Label>
          <Form.Control
            type="url"
            name="imageUrl"
            defaultValue={poster?.imageUrl || ""}
            placeholder="Enter image URL"
          />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Discount (%)</Form.Label>
          <Form.Control
            type="number"
            name="discount"
            defaultValue={poster?.discount || 0}
            placeholder="Enter discount percentage"
          />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Seller Username</Form.Label>
          <div className="input-group" style={{ flexWrap: "nowrap" }}>
            <div className="position-relative me-2" style={{ minWidth: "150px", flexGrow: 1 }}>
              <Form.Control
                name="seller"
                value={sellerUsername}
                onChange={handleSellerUsernameChange}
                required
                placeholder="@username"
                isValid={isSellerValid}
                aria-describedby="sellerFeedback"
              />
              {isSellerValid && (
                <span
                  className="position-absolute top-50 end-0 translate-middle-y me-2 text-success"
                  style={{ fontSize: "1rem" }}
                >
                  ✓
                </span>
              )}
            </div>
            <Form.Control
              type="text"
              value={sellerName}
              readOnly
              placeholder="Seller Name"
              style={{ width: "35%" }}
            />
            <Button
              variant="outline-secondary"
              onClick={() => checkSellerUsername(sellerUsername)}
              aria-label="Check seller username"
              className="me-1"
            >
              Check
            </Button>
            <Button
              variant="outline-secondary"
              onClick={insertUserId}
              aria-label="Insert current user"
            >
              Me
            </Button>
          </div>
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Check
            type="checkbox"
            name="isActive"
            label="Active"
            defaultChecked={poster?.isActive ?? true}
            disabled={poster?.approved !== "approved"}
          />
        </Form.Group>
        <Button type="submit" variant="success" disabled={uploading} className="w-100">
          {uploading ? "Uploading..." : poster ? "Update Poster" : "Save Draft"}
        </Button>
      </Form>

      <Modal show={showNewCollectionModal} onHide={() => setShowNewCollectionModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Suggest New Collection</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleNewCollectionSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Collection Name</Form.Label>
              <Form.Control
                type="text"
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                placeholder="e.g., K Pop"
                isInvalid={!!newCollectionError}
              />
              <Form.Control.Feedback type="invalid">{newCollectionError}</Form.Control.Feedback>
            </Form.Group>
            <Button type="submit" variant="success">
              Add Collection
            </Button>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default PosterForm;