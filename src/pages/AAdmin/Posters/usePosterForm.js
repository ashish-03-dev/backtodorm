import { useState, useRef, useEffect } from "react";
import { doc, getDoc, collection, getDocs, setDoc } from "firebase/firestore";
import { ref, getDownloadURL } from "firebase/storage";
import { centerCrop, makeAspectCrop } from "react-image-crop";
import { useFirebase } from "../../../context/FirebaseContext";

// Predefined poster sizes
const POSTER_SIZES = {
  A4: { name: "A4", widthPx: 2480, heightPx: 3508, widthCm: 21, heightCm: 29.7, aspectRatio: 2480 / 3508 },
  A3: { name: "A3", widthPx: 3508, heightPx: 4961, widthCm: 29.7, heightCm: 42, aspectRatio: 3508 / 4961 },
  "A3*3": { name: "A3*3", widthPx: 3508 * 3, heightPx: 4961, widthCm: 29.7 * 3, heightCm: 42, aspectRatio: (3508 * 3) / 4961 },
  "A4*5": { name: "A4*5", widthPx: 2480 * 5, heightPx: 3508, widthCm: 21 * 5, heightCm: 29.7, aspectRatio: (2480 * 5) / 3508 },
};

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

export const usePosterForm = ({ poster, onSubmit, onApprove, onUpdateTempPoster }) => {
  const { firestore, storage, auth } = useFirebase();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [idError, setIdError] = useState(null);
  const [idChecked, setIdChecked] = useState(poster?.posterId);
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
  const [imageDownloadUrl, setImageDownloadUrl] = useState(null);
  const formRef = useRef(null);
  const imgRef = useRef(null);

  // Fetch download URL for originalImageUrl in edit mode
  useEffect(() => {
    if (poster?.source === "tempPosters" && poster?.originalImageUrl && storage) {
      const fetchDownloadUrl = async () => {
        try {
          const imageRef = ref(storage, poster.originalImageUrl);
          const url = await getDownloadURL(imageRef);
          setImageDownloadUrl(url);
        } catch (err) {
          console.warn(`Failed to fetch download URL for ${poster.originalImageUrl}:`, err.message);
          setError(`Failed to load image URL: ${err.message}`);
        }
      };
      fetchDownloadUrl();
    } else if (poster?.source === "posters" && poster?.imageUrl) {
      setImageDownloadUrl(poster.imageUrl);
    }
  }, [poster, storage]);

  // Fetch collections and seller info
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
          const userDoc = await getDoc(doc(firestore, "sellers", sellerUsername));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setSellerName(data.sellerName || "Unknown User");
            setIsSellerValid(true);
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

  // Validate selected size
  useEffect(() => {
    if (!POSTER_SIZES[selectedSize]) {
      const validSize = sizes.find((s) => POSTER_SIZES[s.size])?.size || "A4";
      setSelectedSize(validSize);
    }
  }, [sizes, selectedSize]);

  // Validation functions
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
      const sellerDoc = await getDoc(doc(firestore, "sellers", inputSellerUsername));
      if (sellerDoc.exists()) {
        const data = sellerDoc.data();
        setSellerUsername(inputSellerUsername);
        setSellerName(data.sellerName || "Unknown User");
        setIsSellerValid(true);
        setSellerChecked(true);
      } else {
        setSellerName("Seller not found");
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

  // Keyword generation
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

  // Collection management
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
      setError("Failed to save collection: " + err.message);
    }
  };

  // Size management
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

  // Image handling
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
            const fileList = new DataTransfer();
            fileList.items.add(file);
            formRef.current.imageFile.files = fileList.files;
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

  // Discount handling
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

  // Submission handlers
  const validateForm = (posterId, form) => {
    if (!posterId || !idChecked || idError) {
      setError("Please provide a unique Poster ID and check its availability.");
      return false;
    }
    if (!isSellerValid || !sellerUsername || !sellerChecked) {
      setError("Please provide and verify a valid Seller Username.");
      return false;
    }
    if (sizes.some((s) => !s.size || !s.price || isNaN(s.price) || parseFloat(s.price) <= 0 || !POSTER_SIZES[s.size])) {
      setError("Please provide valid sizes and prices for all entries.");
      return false;
    }
    if (!poster && !form.imageFile?.files[0]) {
      setError("An image is required for new posters.");
      return false;
    }
    return true;
  };

  const preparePosterData = (form, posterId) => {
    const collections = selectedCollections.map((col) => normalizeCollection(col.label));
    const tagArray = tags.split(",").map((t) => normalizeCollection(t.trim())).filter(Boolean);
    return {
      title: form.title.value.trim(),
      description: form.description.value.trim(),
      tags: tagArray,
      keywords: keywords.split(",").map((k) => k.trim()).filter(Boolean),
      collections,
      originalImageUrl: poster?.source === "tempPosters" ? poster?.originalImageUrl || "" : "",
      imageUrl: poster?.source === "posters" ? poster?.imageUrl || "" : "",
      imageFile: form.imageFile?.files[0] || null,
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
      posterId: form.posterId.value,
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);
    const form = e.target;
    const posterId = (poster?.id || form.posterId.value.trim());

    if (!validateForm(posterId, form)) {
      setUploading(false);
      return;
    }

    const data = preparePosterData(form, posterId);

    try {
      if (!poster) {
        // New poster submission
        await onSubmit(data, posterId);
      } else if (poster.source === "posters") {
        // Update approved poster
        await onSubmit(data, posterId);
      } else if (poster.source === "tempPosters") {
        // Update temp poster
        await onUpdateTempPoster(data, posterId);
      }
    } catch (err) {
      setError(`Failed to submit poster: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleApprove = async (e) => {
    e.preventDefault();
    setUploading(true);
    const form = formRef.current;
    const posterId = poster?.id;
    if (!validateForm(posterId, form)) {
      setUploading(false);
      return;
    }

    try {
      await onApprove(posterId);
    } catch (err) {
      setError(`Failed to approve poster: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  return {
    state: {
      uploading,
      error,
      idError,
      idChecked,
      collectionError,
      availableCollections,
      tags,
      showNewCollectionModal,
      newCollectionName,
      newCollectionError,
      selectedCollections,
      sellerUsername,
      sellerName,
      isSellerValid,
      sellerChecked,
      keywords,
      sizes,
      selectedSize,
      crop,
      imageSrc,
      showCropModal,
      discount,
      imageDownloadUrl,
    },
    refs: { formRef, imgRef },
    handlers: {
      setError,
      setTags,
      setShowNewCollectionModal,
      setNewCollectionName,
      setSelectedCollections,
      setSellerUsername,
      setKeywords,
      setSizes,
      setSelectedSize,
      setCrop,
      setImageSrc,
      setShowCropModal,
      setDiscount,
      checkIdUniqueness,
      suggestId,
      checkSellerUsername,
      insertUserId,
      generateKeywordsLocal,
      handleNewCollectionSubmit,
      handleSizeChange,
      addSize,
      removeSize,
      handleImageChange,
      handleCropComplete,
      handleDiscountChange,
      handleSubmit,
      handleApprove,
      setSellerChecked,
      setIsSellerValid,
      setSellerName,
    },
  };
};