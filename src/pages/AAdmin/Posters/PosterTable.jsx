import React from "react";
import { Button } from "react-bootstrap";
import "../../../styles/SellerComponents.css";

const PosterTable = ({
  posters,
  onEdit,
  onView,
  onDelete,
  onApprove,
  onReject,
  onSubmit,
}) => (
  <div className="table-responsive">
    <table className="table table-hover table-bordered align-middle">
      <thead className="table-light">
        <tr>
          <th>Preview</th>
          <th>Title</th>
          <th>Seller Username</th>
          <th>Pricing</th>
          <th>Active</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {Array.isArray(posters) && posters.length > 0 ? (
          posters.map((p) => (
            <tr key={p.id}>
              <td>
                <Button
                  variant="link"
                  onClick={() => onView(p)}
                  aria-label={`View poster ${p.title || "Untitled"} details`}
                >
                  View
                </Button>
              </td>
              <td>{p.title || "No title"}</td>
              <td>{p.sellerUsername || "Unknown"}</td>
              <td>
                {Array.isArray(p.sizes) && p.sizes.length > 0 ? (
                  p.sizes.map((size, index) => (
                    <div key={index}>
                      {size.size || "Unknown size"}: ₹{size.price || "N/A"}{" "}
                      {p.discount > 0 && size.finalPrice ? (
                        <>
                          <del>₹{size.price}</del>{" "}
                          <strong>₹{size.finalPrice}</strong> ({p.discount}% OFF)
                        </>
                      ) : (
                        <strong>₹{size.price}</strong>
                      )}
                    </div>
                  ))
                ) : (
                  <span>No sizes available</span>
                )}
              </td>
              <td>{p.isActive ? "Yes" : "No"}</td>
              <td>
                {p.approved
                  ? p.approved.charAt(0).toUpperCase() + p.approved.slice(1)
                  : "Draft"}
              </td>
              <td>
                <div className="d-flex gap-2">
                  {p.source === "tempPosters" && p.approved === "pending" ? (
                    <>
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => onView(p)}
                        aria-label={`View poster ${p.title || "Untitled"} card`}
                      >
                        View
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => onEdit(p)}
                        aria-label={`Edit poster ${p.title || "Untitled"}`}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="success"
                        size="sm"
                        onClick={() => onApprove(p.id)}
                        aria-label={`Approve poster ${p.title || "Untitled"}`}
                      >
                        Approve
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => onReject(p.id)}
                        aria-label={`Reject poster ${p.title || "Untitled"}`}
                      >
                        Reject
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => onEdit(p)}
                        aria-label={`Edit poster ${p.title || "Untitled"}`}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => onDelete(p.id, p.source)}
                        aria-label={`Delete poster ${p.title || "Untitled"}`}
                      >
                        Delete
                      </Button>
                      {p.source === "tempPosters" && p.approved !== "approved" && (
                        <Button
                          variant="info"
                          size="sm"
                          onClick={() => onSubmit(p.id)}
                          aria-label={`Submit poster ${p.title || "Untitled"} for review`}
                        >
                          Submit
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan="7" className="text-center">
              No posters found
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
);

export default PosterTable;