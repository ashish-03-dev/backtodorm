import React from "react";
import { Form, Button, Modal, Alert } from "react-bootstrap";
import Select from "react-select";
import ReactCrop from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { usePosterForm } from "./usePosterForm";

const POSTER_SIZES = {
  A4: { name: "A4", widthPx: 2480, heightPx: 3508, widthCm: 21, heightCm: 29.7 },
  A3: { name: "A3", widthPx: 3508, heightPx: 4961, widthCm: 29.7, heightCm: 42 },
  "A3*3": { name: "A3*3", widthPx: 3508 * 3, heightPx: 4961, widthCm: 29.7 * 3, heightCm: 42 },
  "A4*5": { name: "A4*5", widthPx: 2480 * 5, heightPx: 3508, widthCm: 21 * 5, heightCm: 29.7 },
};

const PosterForm = ({ poster, onSubmit, onApprove, onUpdateTempPoster }) => {
  const {
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
  } = usePosterForm({ poster, onSubmit, onApprove, onUpdateTempPoster });

  const getImageName = (url) => {
    if (!url) return "No image";
    const isCloudinary = url.includes("cloudinary.com");
    const path = url.split("/").pop();
    return isCloudinary ? `Cloudinary image: ${path}` : `Firestore image: ${path}`;
  };

  // Truncate keywords to 50 characters and add "..." if longer
  const displayKeywords = keywords.length > 50 ? `${keywords.slice(0, 50)}...` : keywords;

  return (
    <div>
      {error && <Alert variant="danger" onClose={() => setError(null)} dismissible>{error}</Alert>}
      <Form onSubmit={handleSubmit} ref={formRef}>
        <Form.Group className="mb-3">
          <Form.Label>Poster ID</Form.Label>
          <div className="input-group">
            <Form.Control
              name="posterId"
              defaultValue={poster?.posterId || ""}
              placeholder="Enter a unique ID (letters, numbers, hyphens, underscores)"
              required
              isInvalid={!!idError}
              isValid={idChecked && !idError}
              aria-describedby="posterIdFeedback"
            />
            <Button
              variant="outline-secondary"
              onClick={() => checkIdUniqueness(formRef.current?.posterId?.value?.trim().toLowerCase())}
              aria-label="Check Poster ID"
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
              value={displayKeywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="Enter keywords..."
            />
            <Button
              variant="outline-secondary"
              onClick={generateKeywordsLocal}
              aria-label="Generate keywords"
              disabled={uploading}
            >
              Generate
            </Button>
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
          <Form.Label>Image</Form.Label>
          {poster ? (
            <div>
              <Form.Text>
                {getImageName(imageDownloadUrl || (poster.source === "posters" ? poster.imageUrl : poster.originalImageUrl))}
              </Form.Text>
              {imageDownloadUrl && (
                <div className="mt-2">
                  <a href={imageDownloadUrl} target="_blank" rel="noopener noreferrer">
                    View Image
                  </a>
                </div>
              )}
            </div>
          ) : (
            <Form.Control
              type="file"
              name="imageFile"
              accept="image/*"
              onChange={handleImageChange}
              required
            />
          )}
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Check
            name="isActive"
            label="Active"
            defaultChecked={poster?.isActive !== false}
          />
        </Form.Group>
        <div className="d-flex justify-content-between">
          <div className="d-flex gap-2">
            <Button
              type="submit"
              variant="primary"
              disabled={uploading || !idChecked || !!idError || !sellerChecked || !isSellerValid}
            >
              {uploading ? "Uploading..." : poster?.approved === "pending" ? "Update Poster" : poster ? "Update Poster" : "Submit Poster"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => onSubmit(null)}
              disabled={uploading}
            >
              Cancel
            </Button>
          </div>
          {poster?.approved === "pending" && (
            <Button
              type="button"
              variant="success"
              onClick={handleApprove}
              disabled={uploading || !idChecked || !!idError || !sellerChecked || !isSellerValid}
            >
              Approve
            </Button>
          )}
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
            <Alert variant="danger">Invalid size selected for cropping.</Alert>
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