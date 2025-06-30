import React from "react";
import { Form, Button, Modal, Alert, Spinner } from "react-bootstrap";
import Select from "react-select";
import ReactCrop from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { usePosterForm } from "../Posters/usePosterForm";

const POSTER_SIZES = {
  A4: { name: "A4", widthPx: 2480, heightPx: 3508, widthCm: 21, heightCm: 29.7, aspectRatio: 2480 / 3508 },
  A3: { name: "A3", widthPx: 3508, heightPx: 4961, widthCm: 29.7, heightCm: 42, aspectRatio: 3508 / 4961 },
  "A3*3": { name: "A3*3", widthPx: 3508 * 3, heightPx: 4961, widthCm: 29.7 * 3, heightCm: 42, aspectRatio: (3508 * 3) / 4961 },
  "A4*5": { name: "A4*5", widthPx: 2480 * 5, heightPx: 3508, widthCm: 21 * 5, heightCm: 29.7, aspectRatio: (2480 * 5) / 3508 },
};

const PosterForm = ({ poster, onSubmit, onApprove, onUpdatePoster, onApproveTempPoster }) => {
  const {
    state: {
      uploading,
      error,
      idError,
      idChecked,
      collectionError,
      availableCollections,
      tags,
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
      rotation,
      croppedPreview,
      originalImageSize,
      recommendedSize,
      cropping,
      discount,
      imageDownloadUrl,
    },
    refs: { formRef, imgRef, fileInputRef },
    handlers: {
      setError,
      setTags,
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
      generateKeywords,
      handleSizeChange,
      addSize,
      removeSize,
      handleImageChange,
      handleClearImage,
      handleRotate,
      handleCropComplete,
      handleSwitchSize,
      handleDiscountChange,
      handleSubmit,
      handleApprove,
      setSellerChecked,
      setIsSellerValid,
      setSellerName,
    },
  } = usePosterForm({ poster, onSubmit, onApprove, onUpdatePoster, onApproveTempPoster });

  const getImageName = (url) => {
    if (!url) return "No image";
    const isCloudinary = url.includes("cloudinary.com");
    const path = url.split("/").pop();
    return isCloudinary ? `Cloudinary image: ${path}` : `Firestore image: ${path}`;
  };

  return (
    <div>
      {error && <Alert variant="danger" onClose={() => setError(null)} dismissible>{error}</Alert>}
      <Form onSubmit={handleSubmit} ref={formRef}>
        <Form.Group className="mb-3">
          <Form.Label>Poster ID</Form.Label>
          <div className="d-flex gap-2 align-items-center">
            <Form.Control
              name="posterId"
              defaultValue={poster?.posterId || ""}
              placeholder="Enter a unique ID (letters, numbers, hyphens, underscores)"
              required
              isInvalid={!!idError}
              isValid={idChecked && !idError}
              aria-describedby="posterIdFeedback"
              disabled={!!poster?.posterId}
              className="flex-grow-1"
            />
            {!poster?.posterId && (
              <>
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
              </>
            )}
          </div>
          <Form.Control.Feedback type="invalid" id="posterIdFeedback">
            {idError}
          </Form.Control.Feedback>
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Title</Form.Label>
          <Form.Control
            name="title"
            defaultValue={poster?.title || ""}
            required
            placeholder="Enter poster title"
            disabled={uploading}
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
            disabled={uploading}
          />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Tags (comma-separated)</Form.Label>
          <Form.Control
            name="tags"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="Enter tags (e.g., k-pop, minimalist)"
            disabled={uploading}
          />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Keywords (comma-separated)</Form.Label>
          <div className="d-flex gap-2 align-items-center">
            <Form.Control
              name="keywords"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="Enter keywords..."
              disabled={uploading}
            />
            <Button
              variant="outline-secondary"
              onClick={generateKeywords}
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
              isDisabled={uploading}
            />
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
                disabled={uploading}
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
                disabled={uploading}
              />

              <Form.Control
                type="text"
                placeholder="Final Price"
                value={sizeObj.finalPrice || ""}
                readOnly
                style={{ width: "120px" }}
                disabled={uploading}
              />
              {sizes.length > 1 && (
                <Button
                  variant="outline-danger"
                  onClick={() => removeSize(index)}
                  title="Remove size"
                  aria-label="Remove size"
                  disabled={uploading}
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
            disabled={uploading}
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
            disabled={uploading}
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
            <div className="position-relative" style={{ maxWidth: "100%" }}>
              <Form.Control
                type="file"
                name="imageFile"
                accept="image/*"
                onChange={handleImageChange}
                required
                ref={fileInputRef}
                style={{ paddingRight: croppedPreview ? "60px" : undefined }}
                disabled={uploading || !selectedSize || !POSTER_SIZES[selectedSize]}
              />
              {croppedPreview && (
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
          )}
          {recommendedSize && (
            <div className="mt-2">
              <p>
                Image resolution is too low for {selectedSize}. Would you like to switch to {recommendedSize} (
                {POSTER_SIZES[recommendedSize].widthPx}x{POSTER_SIZES[recommendedSize].heightPx}px)?
              </p>
              <Button variant="outline-primary" size="sm" onClick={handleSwitchSize}>
                Switch to {recommendedSize}
              </Button>
            </div>
          )}
          {croppedPreview && selectedSize && POSTER_SIZES[selectedSize] && (
            <div className="mt-3">
              <p>
                Original image size: {originalImageSize.width}x{originalImageSize.height}px<br />
                Preview (image will be saved at {selectedSize} resolution: {POSTER_SIZES[selectedSize].widthPx}x{POSTER_SIZES[selectedSize].heightPx}px):
              </p>
              <img src={croppedPreview} alt="Preview" style={{ maxWidth: "200px" }} />
            </div>
          )}
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
              disabled={uploading}
            />
            <Button
              variant="outline-secondary"
              onClick={checkSellerUsername}
              aria-label="Check Seller Username"
              disabled={uploading}
            >
              Check
            </Button>
            <Button
              variant="outline-secondary"
              onClick={insertUserId}
              aria-label="Use Current User ID"
              disabled={uploading}
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
          <Form.Check
            name="isActive"
            label="Active"
            defaultChecked={poster?.isActive !== false}
            disabled={uploading}
          />
        </Form.Group>
        <div className="d-flex gap-2">
          {(!poster || poster.source === "posters") && (
            <Button
              type="submit"
              variant="primary"
              disabled={uploading || !idChecked || !!idError || !sellerChecked || !isSellerValid}
            >
              {uploading ? "Uploading..." : poster ? "Update Poster" : "Submit Poster"}
            </Button>
          )}
          {!poster || poster.source === "tempPosters" && poster?.approved !== "approved" && (
            <Button
              type="button"
              variant="success"
              onClick={handleApprove}
              disabled={uploading || !idChecked || !!idError || !sellerChecked || !isSellerValid}
            >
              Approve
            </Button>
          )}
          <Button
            type="button"
            variant="secondary"
            onClick={() => onSubmit(null)}
            disabled={uploading}
          >
            Cancel
          </Button>
        </div>
      </Form>

      <Modal
        show={showCropModal}
        onHide={() => {
          setShowCropModal(false);
          handleClearImage();
        }}
      >
        <Modal.Header closeButton>
          <Modal.Title>{selectedSize && POSTER_SIZES[selectedSize] ? `Crop Image to ${selectedSize}` : "Crop Image"}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedSize && POSTER_SIZES[selectedSize] ? (
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
            </>
          ) : (
            <Alert variant="danger">Invalid size selected for cropping.</Alert>
          )}
        </Modal.Body>
      </Modal>

    </div>
  );
};

export default PosterForm;