import React from "react";
import { Button, Table, Image } from "react-bootstrap";
import moment from "moment";
import "bootstrap/dist/css/bootstrap.min.css";

const PosterTable = ({
  posters,
  onEdit,
  onView,
  onReject,
}) => {
  if (!posters || posters.length === 0) {
    return <p>No posters found.</p>;
  }

  return (
    <Table striped bordered hover responsive className="mt-3">
      <thead>
        <tr>
          <th>Image</th>
          <th>Title</th>
          <th>Seller</th>
          <th>Status</th>
          <th>Created At</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {posters.map((poster) => (
          <tr key={poster.id}>
            <td>
              {poster.imageUrl || poster.originalImageUrl ? (
                <Image
                  src={poster.imageUrl || poster.originalImageUrl}
                  alt={poster.title}
                  thumbnail
                  style={{ width: "100px", height: "auto" }}
                />
              ) : (
                "No image"
              )}
            </td>
            <td>{poster.title || "Untitled"}</td>
            <td>{poster.sellerUsername || "Unknown"}</td>
            <td>{poster.approved || "Pending"}</td>
            <td>
              {poster.createdAt
                ? moment(poster.createdAt.toDate ? poster.createdAt.toDate() : poster.createdAt).format("YYYY-MM-DD")
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
                {poster.approved === "pending" ? (
                  <Button
                    variant="outline-success"
                    size="sm"
                    onClick={() => onEdit(poster)}
                    title="Edit and Approve poster"
                  >
                    Approve
                  </Button>
                ) : (
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    onClick={() => onEdit(poster)}
                    title="Edit poster"
                  >
                    Edit
                  </Button>
                )}
                {onReject && poster.approved === "pending" && (
                  <Button
                    variant="outline-warning"
                    size="sm"
                    onClick={() => onReject(poster.id)}
                    title="Reject poster"
                  >
                    Reject
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