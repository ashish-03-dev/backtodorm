import React from "react";
import { Form, Button } from "react-bootstrap";

const PosterFilter = ({ filter, onFilterChange, onAdd, hideApprovedFilter }) => {
  const handleChange = (e) => {
    const { name, value } = e.target;
    onFilterChange({ ...filter, [name]: value });
  };

  return (
    <div className="d-flex mb-3 gap-3">
      <Form.Group>
        <Form.Label>Search</Form.Label>
        <Form.Control
          type="text"
          name="search"
          value={filter.search}
          onChange={handleChange}
          placeholder="Search by title, description, or tags"
        />
      </Form.Group>
      {!hideApprovedFilter && (
        <Form.Group>
          <Form.Label>Status</Form.Label>
          <Form.Select name="approved" value={filter.approved} onChange={handleChange}>
            <option value="">All</option>
            <option value="draft">Draft</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </Form.Select>
        </Form.Group>
      )}
      <div className="ms-auto align-self-end">
        <Button variant="primary" onClick={onAdd}>
          + Add Poster
        </Button>
      </div>
    </div>
  );
};

export default PosterFilter;