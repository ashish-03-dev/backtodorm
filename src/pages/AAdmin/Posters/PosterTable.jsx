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
        {posters.map((p) => (
          <tr key={p.id}>
            <td>
              <Button variant="link" onClick={() => onView(p)}>
                View
              </Button>
            </td>
            <td>{p.title}</td>
            <td>{p.category}</td>
            <td>
              ₹{p.price} / {p.discount}% → <strong>₹{p.finalPrice}</strong>
            </td>
            <td>{p.isActive ? "Yes" : "No"}</td>
            <td>{p.approved.charAt(0).toUpperCase() + p.approved.slice(1)}</td>
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
        ))}
        {posters.length === 0 && (
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