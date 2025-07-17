import React, { useState } from "react";
import { Button, Table, Image } from "react-bootstrap";
import moment from "moment";
import "bootstrap/dist/css/bootstrap.min.css";

const PosterTable = ({
  posters,
  onEdit,
  onView,
  onReject,
  onUpload,
  onSetFrame,
  onDelete,
  lastPosterRef,
}) => {
  const [uploadingPosterId, setUploadingPosterId] = useState(null);

  if (!posters || posters.length === 0) {
    return <p>No posters found.</p>;
  }

  const handleUploadClick = async (posterId) => {
    setUploadingPosterId(posterId);
    try {
      await onUpload(posterId);
    } finally {
      setUploadingPosterId(null);
    }
  };

  return (
    <Table striped bordered hover responsive className="mt-3">
      <thead>
        <tr>
          <th>Image</th>
          <th>Title</th>
          <th>Created At</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {posters.map((poster, index) => (
          <tr
            key={poster.id}
            ref={index === posters.length - 3 ? lastPosterRef : null}
          >
            <td>
              {poster.imageUrl && poster.source !== "tempPosters" ? (
                <Image
                  src={poster.imageUrl}
                  alt={poster.title}
                  thumbnail
                  style={{ width: "100px", height: "auto" }}
                />
              ) : (
                "Firestore image"
              )}
            </td>
            <td>{poster.title || "Untitled"}</td>
            <td>
              {poster.createdAt?.toDate
                ? moment(poster.createdAt.toDate()).format("D MMM YYYY, h:mm A")
                : "N/A"}
            </td>
            <td>
              <div className="d-flex gap-2">
                <Button
                  variant="outline-primary"
                  size="sm"
                  onClick={() => onView(poster)}
                  title="View poster"
                >
                  View
                </Button>
                {poster.source === "posters" && (
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    onClick={() => onEdit(poster)}
                    title="Edit poster"
                  >
                    Edit
                  </Button>
                )}
                {onReject && poster.source == "tempPosters" && !poster.framedImageUrl && (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => onReject(poster.id)}
                    title="Reject poster"
                  >
                    Reject
                  </Button>
                )}
                {onSetFrame && !poster.framedImageUrl && (
                  <Button
                    variant="outline-info"
                    size="sm"
                    onClick={() => onSetFrame(poster)}
                    title="Upload to CDN"
                  >
                    Set Frame
                  </Button>
                )}
                {onUpload && poster.framedImageUrl && (
                  <Button
                    variant="outline-info"
                    size="sm"
                    onClick={() => handleUploadClick(poster.id)}
                    title="Upload to CDN"
                    disabled={uploadingPosterId === poster.id}
                  >
                    {uploadingPosterId === poster.id ? "Uploading..." : "Upload"}
                  </Button>
                )}
                {poster.source === "posters" && (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => onDelete(poster)}
                    title="Delete poster"
                  >
                    Delete
                  </Button>
                )}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
};

export default PosterTable;