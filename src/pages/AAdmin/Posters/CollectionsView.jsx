import React from "react";
import PosterTable from "./PosterTable";

const CollectionsView = ({
  collectionsMap,
  onEdit,
  onView,
  onDelete,
  onApprove,
  onReject,
  onSubmit,
}) => (
  <>
    {Object.entries(collectionsMap).length === 0 ? (
      <p className="text-muted">No collections found.</p>
    ) : (
      Object.entries(collectionsMap).map(([col, list]) => (
        <div key={col} className="mb-4">
          <h5 className="mb-2">{col.charAt(0).toUpperCase() + col.slice(1)}</h5>
          <PosterTable
            posters={list}
            onEdit={onEdit}
            onView={onView}
            onDelete={onDelete}
            onApprove={onApprove}
            onReject={onReject}
            onSubmit={onSubmit}
          />
        </div>
      ))
    )}
  </>
);

export default CollectionsView;