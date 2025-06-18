import React, { useState, useRef, useEffect } from "react";
import { Form, Button, Modal } from "react-bootstrap";
import { doc, getDoc, collection, getDocs, setDoc } from "firebase/firestore";
import Select from "react-select";
import { useFirebase } from "../../../context/FirebaseContext";

const PosterForm = ({ poster, onSave }) => {
  const { firestore, auth } = useFirebase();
  const [uploading, setUploading] = useState(false);
  const [idError, setIdError] = useState(null);
  const [collectionError, setCollectionError] = useState(null);
  const [idChecked, setIdChecked] = useState(!!poster);
  const [availableCollections, setAvailableCollections] = useState([]);
  const [showNewCollectionModal, setShowNewCollectionModal] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [newCollectionError, setNewCollectionError] = useState(null);
  const [selectedCollections, setSelectedCollections] = useState([]);
  const [sellerName, setSellerName] = useState("");
  const [keywords, setKeywords] = useState(poster?.keywords?.join(", ") || "");
  const [showAllKeywords, setShowAllKeywords] = useState(false);
  const [sizes, setSizes] = useState(
    Array.isArray(poster?.sizes) && poster.sizes.length > 0 
      ? poster.sizes 
      : [{ size: "", price: "" }]
  );
  const formRef = useRef(null);

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
            poster.collections.includes(col.label)
          );
          setSelectedCollections(selected);
        }
      } catch (error) {
        console.error("Error fetching collections:", error);
        setCollectionError("Failed to load collections.");
      }
    };

    const fetchSellerName = async () => {
      if (poster?.seller) {
        try {
          const userDoc = await getDoc(doc(firestore, "users", poster.seller));
          if (userDoc.exists()) {
            setSellerName(userDoc.data().name || "Unknown User");
          }
        } catch (error) {
          console.error("Error fetching seller name:", error);
        }
      }
    };

    if (firestore) {
      fetchCollections();
      fetchSellerName();
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

  const insertUserId = async () => {
    if (!auth) {
      alert("Authentication is not initialized. Please check Firebase setup.");
      return;
    }
    const user = auth.currentUser;
    if (user) {
      formRef.current.seller.value = user.uid;
      try {
        const userDoc = await getDoc(doc(firestore, "users", user.uid));
        if (userDoc.exists()) {
          setSellerName(userDoc.data().name || "Unknown User");
        }
      } catch (error) {
        console.error("Error fetching seller name:", error);
      }
    } else {
      alert("No user is currently signed in.");
    }
  };

  const generateKeywords = () => {
    const form = formRef.current;
    const title = form?.title?.value?.trim() || "";
    const description = form?.description?.value?.trim() || "";
    const tags = form?.tags?.value?.split(",").map(t => t.trim()).filter(Boolean) || [];
    const collections = selectedCollections.map(col => col.label);
    
    const stopWords = new Set(["a", "an", "the", "and", "or", "but", "in", "on", "at", "to"]);
    const words = [
      ...title.toLowerCase().split(/\s+/),
      ...description.toLowerCase().split(/\s+/),
      ...tags,
      ...collections
    ];
    const newKeywords = [...new Set(words)]
      .filter(word => !stopWords.has(word) && word.length > 2)
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
    if (availableCollections.some((c) => c.value.toLowerCase() === name.toLowerCase())) {
      setNewCollectionError("Collection already exists.");
      return;
    }

    try {
      const collectionId = name.toLowerCase().replace(/\s+/g, "-");
      await setDoc(doc(firestore, "collections", collectionId), {
        name,
        createdAt: new Date(),
      });
      const newCollection = { value: collectionId, label: name };
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
    if (sizes.length === 0 || sizes.every(s => s.size && s.price)) {
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
    const collections = selectedCollections.map((col) => col.label);

    if (!poster && (!posterId || !idChecked || idError)) {
      alert("Please provide a unique Poster ID and check its availability.");
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
      tags: form.tags.value.split(",").map((t) => t.trim()).filter(Boolean),
      keywords: keywords.split(",").map(k => k.trim()).filter(Boolean),
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
      seller: form.seller.value,
      createdAt: poster?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    onSave(data, posterId);
  };

  const truncatedKeywords = showAllKeywords ? keywords : keywords.slice(0, 50);

  return (
    <div>
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
              >
                Check
              </Button>
              <Button
                variant="outline-secondary"
                onClick={suggestId}
              >
                Suggest ID
              </Button>
            </div>
            <Form.Control.Feedback type="invalid" id="posterIdFeedback">
              {idError}
            </Form.Control.Feedback>
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
          />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Description</Form.Label>
          <Form.Control
            as="textarea"
            rows={2}
            name="description"
            defaultValue={poster?.description || ""}
          />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Tags (comma-separated)</Form.Label>
          <Form.Control
            name="tags"
            defaultValue={poster?.tags?.join(", ") || ""}
          />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Keywords (comma-separated)</Form.Label>
          <div className="input-group">
            <Form.Control
              name="keywords"
              value={truncatedKeywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="Enter keywords..."
            />
            <Button
              variant="outline-secondary"
              onClick={generateKeywords}
            >
              Generate
            </Button>
            {keywords.length > 50 && (
              <Button
                variant="outline-secondary"
                onClick={() => setShowAllKeywords(!showAllKeywords)}
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
            >
              + Suggest New
            </Button>
          </div>
          {collectionError && (
            <Form.Text className="text-danger">{collectionError}</Form.Text>
          )}
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
                >
                  Remove
                </Button>
              )}
            </div>
          ))}
          <Button
            variant="outline-primary"
            onClick={addSize}
            className="mt-2"
          >
            + Add Size
          </Button>
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Image Upload</Form.Label>
          <Form.Control type="file" name="imageFile" accept="image/*" />
          {poster?.imageUrl && (
            <Form.Text>
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
          />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Discount (%)</Form.Label>
          <Form.Control
            type="number"
            name="discount"
            defaultValue={poster?.discount || 0}
          />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Seller</Form.Label>
          <div className="input-group">
            <Form.Control
              name="seller"
              defaultValue={poster?.seller || ""}
              required
            />
            <Form.Control
              type="text"
              value={sellerName}
              readOnly
              placeholder="Seller Name"
            />
            <Button
              variant="outline-secondary"
              onClick={insertUserId}
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
        <Button type="submit" variant="success" disabled={uploading}>
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
                placeholder="e.g., Vintage Cars"
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