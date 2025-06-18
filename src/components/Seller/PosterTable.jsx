import React from "react";
import { Button } from "react-bootstrap";
import '../../styles/SellerComponents.css';

export default function PosterTable({ posters, onEdit, onView, onDelete, onSubmit, isDashboardView = false }) {
  return (
    <div className="table-responsive">
      <table className="table table-hover table-bordered align-middle">
        <thead className="table-light">
          <tr>
            <th>Title</th>
            <th>Status</th>
            {!isDashboardView && <th>Keywords</th>}
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {Array.isArray(posters) && posters.length > 0 ? (
            posters.map((poster) => (
              <tr key={poster.id}>
                <td>{poster.title || "Untitled"}</td>
                <td>{poster.approved || "Draft"}</td>
                {!isDashboardView && (
                  <td>{poster.keywords?.join(", ") || "None"}</td>
                )}
                <td>
                  <div className="d-flex gap-2">
                    <Button
                      size="sm"
                      variant="outline-primary"
                      onClick={() => onView(poster)}
                    >
                      View
                    </Button>
                    {!isDashboardView && (
                      <>
                        <Button
                          size="sm"
                          variant="outline-secondary"
                          onClick={() => onEdit(poster)}
                          disabled={poster.approved === "approved"}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline-danger"
                          onClick={() => onDelete(poster.id)}
                          disabled={poster.approved === "approved"}
                        >
                          Delete
                        </Button>
                        {poster.approved === "draft" && (
                          <Button
                            size="sm"
                            variant="outline-success"
                            onClick={() => onSubmit(poster.id)}
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