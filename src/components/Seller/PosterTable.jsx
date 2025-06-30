import React, { useState } from "react";
import { Button, Spinner } from "react-bootstrap";

export default function PosterTable({ posters, onView, onDelete, isDashboardView = false }) {
  const [viewingId, setViewingId] = useState(null);

  const handleViewClick = async (poster) => {
    setViewingId(poster.id); // Set loading state for this poster's button
    try {
      await onView(poster); // Call the onView function passed from MyProducts
    } finally {
      setViewingId(null); // Reset loading state after view operation completes
    }
  };

  return (
    <div className="table-responsive">
      <table className="table table-hover table-bordered align-middle">
        <thead className="table-light">
          <tr>
            <th>Title</th>
            <th>Status</th>
            <th>{isDashboardView ? "Created At" : "Date"}</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {Array.isArray(posters) && posters.length > 0 ? (
            posters.map((poster) => (
              <tr key={poster.id}>
                <td>{poster.title || "Untitled"}</td>
                <td>
                  {poster.status
                    ? poster.status.charAt(0).toUpperCase() + poster.status.slice(1)
                    : "Draft"}
                </td>
                <td>
                  {poster.createdAt
                    ? poster.createdAt.toDate().toLocaleString("en-IN", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })
                    : "N/A"}
                </td>
                <td>
                  <div className="d-flex gap-2">
                    <Button
                      size="sm"
                      variant="outline-primary"
                      onClick={() => handleViewClick(poster)}
                      disabled={viewingId === poster.id}
                    >
                      {viewingId === poster.id ? (
                        <>
                          <Spinner
                            as="span"
                            animation="border"
                            size="sm"
                            role="status"
                            aria-hidden="true"
                            className="me-1"
                          />
                          Viewing...
                        </>
                      ) : (
                        "View"
                      )}
                    </Button>
                    {!isDashboardView && poster.status !== "approved" && poster.status !== "rejected" && (
                      <Button
                        size="sm"
                        variant="outline-danger"
                        onClick={() => onDelete(poster.id, poster.source)}
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={isDashboardView ? 3 : 4} className="text-center text-muted">
                No posters found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}