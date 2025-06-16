import React from "react";
import { Button } from "react-bootstrap";

const PosterTable = ({ posters, onEdit, onView, onDelete, onApprove, onReject, onSubmit }) => (
  <div className="table-responsive">
    <table className="table table-hover table-bordered align-middle">
      <thead className="table-light">
        <tr>
          <th>Preview</th>
          <th>Title</th>
          <th>Category</th>
          <th>Pricing</th>
          <th>Active</th>
          <th>Approved</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {Array.isArray(posters) && posters.length > 0 ? (
          posters.map((p) => (
            <tr key={p.id}>
              <td>
                <Button variant="link" onClick={() => onView(p)}>
                  View
                </Button>
              </td>
              <td>{p.title || "No title"}</td>
              <td>{p.category || "No category"}</td>
              <td>
                {Array.isArray(p.sizes) && p.sizes.length > 0 ? (
                  p.sizes.map((size, index) => (
                    <div key={index}>
                      {size.size || "Unknown size"}: ₹{size.price || 0} / {p.discount || 0}% →{" "}
                      <strong>₹{size.finalPrice || 0}</strong>
                    </div>
                  ))
                ) : (
                  <span>No sizes available</span>
                )}
              </td>
              <td>{p.isActive ? "Yes" : "No"}</td>
              <td>{p.approved ? p.approved.charAt(0).toUpperCase() + p.approved.slice(1) : "Unknown"}</td>
              <td>
                <Button
                  size="sm"
                  variant="outline-primary"
                  className="me-1"
                  onClick={() => onEdit(p)}
                >
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline-danger"
                  className="me-1"
                  onClick={() => onDelete(p.id)}
                >
                  Delete
                </Button>
                {p.approved === "pending" && (
                  <>
                    <Button
                      size="sm"
                      variant="outline-success"
                      className="me-1"
                      onClick={() => onApprove(p.id)}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline-warning"
                      onClick={() => onReject(p.id)}
                    >
                      Reject
                    </Button>
                  </>
                )}
                {p.approved === "draft" && (
                  <Button
                    size="sm"
                    variant="outline-primary"
                    className="me-1"
                    onClick={() => onSubmit(p.id)}
                  >
                    Submit for Review
                  </Button>
                )}
              </td>
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan="7" className="text-center text-muted">
              No posters found.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
);

export default PosterTable;