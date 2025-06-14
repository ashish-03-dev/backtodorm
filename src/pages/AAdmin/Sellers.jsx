import React, { useState } from "react";
import { Table, Button, Form, Modal, Badge } from "react-bootstrap";

const dummySellers = [
  {
    id: "S001",
    name: "Rahul Sharma",
    email: "rahul@example.com",
    phone: "9876543210",
    totalPosters: 10,
    approvedPosters: 8,
    rejectedPosters: 2,
    sold: 42,
    isActive: true,
  },
  {
    id: "S002",
    name: "Ayesha Khan",
    email: "ayesha@example.com",
    phone: "9876543222",
    totalPosters: 5,
    approvedPosters: 5,
    rejectedPosters: 0,
    sold: 19,
    isActive: false,
  },
];

const Sellers = () => {
  const [sellers, setSellers] = useState(dummySellers);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [selectedSeller, setSelectedSeller] = useState(null);

  const filteredSellers = sellers.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && s.isActive) ||
      (statusFilter === "inactive" && !s.isActive);
    return matchesSearch && matchesStatus;
  });

  const handleToggleStatus = (id) => {
    setSellers((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isActive: !s.isActive } : s))
    );
  };

  const handleEdit = (seller = null) => {
    setSelectedSeller(seller);
    setShowModal(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    const form = e.target;
    const newSeller = {
      id: selectedSeller?.id || "S" + (sellers.length + 1).toString().padStart(3, "0"),
      name: form.name.value,
      email: form.email.value,
      phone: form.phone.value,
      totalPosters: selectedSeller?.totalPosters || 0,
      approvedPosters: selectedSeller?.approvedPosters || 0,
      rejectedPosters: selectedSeller?.rejectedPosters || 0,
      sold: selectedSeller?.sold || 0,
      isActive: selectedSeller?.isActive ?? true,
    };

    if (selectedSeller) {
      setSellers((prev) =>
        prev.map((s) => (s.id === selectedSeller.id ? newSeller : s))
      );
    } else {
      setSellers((prev) => [...prev, newSeller]);
    }

    setShowModal(false);
  };

  return (
    <div className="container mt-4">
      <h2 className="mb-3">🧑‍💼 Sellers Management</h2>

      {/* Search and Filter */}
      <div className="row mb-3">
        <div className="col-md-4">
          <Form.Control
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="col-md-4">
          <Form.Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Suspended</option>
          </Form.Select>
        </div>
        <div className="col-md-4 text-end">
          <Button onClick={() => handleEdit(null)}>+ Add Seller</Button>
        </div>
      </div>

      {/* Table */}
      <div className="table-responsive">
        <Table bordered hover>
          <thead className="table-light">
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Posters</th>
              <th>Approved</th>
              <th>Rejected</th>
              <th>Sold</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredSellers.map((seller) => (
              <tr key={seller.id}>
                <td>{seller.name}</td>
                <td>{seller.email}</td>
                <td>{seller.phone}</td>
                <td>{seller.totalPosters}</td>
                <td>
                  <Badge bg="success">{seller.approvedPosters}</Badge>
                </td>
                <td>
                  <Badge bg="danger">{seller.rejectedPosters}</Badge>
                </td>
                <td>
                  <Badge bg="info">{seller.sold}</Badge>
                </td>
                <td>
                  <Badge bg={seller.isActive ? "success" : "secondary"}>
                    {seller.isActive ? "Active" : "Suspended"}
                  </Badge>
                </td>
                <td>
                  <Button
                    size="sm"
                    variant="outline-secondary"
                    className="me-2"
                    onClick={() => handleEdit(seller)}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant={seller.isActive ? "danger" : "success"}
                    onClick={() => handleToggleStatus(seller.id)}
                  >
                    {seller.isActive ? "Suspend" : "Activate"}
                  </Button>
                </td>
              </tr>
            ))}
            {filteredSellers.length === 0 && (
              <tr>
                <td colSpan="9" className="text-center text-muted">
                  No sellers found.
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>

      {/* Add/Edit Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            {selectedSeller ? "Edit Seller" : "Add New Seller"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleSave}>
            <Form.Group className="mb-3">
              <Form.Label>Seller Name</Form.Label>
              <Form.Control
                name="name"
                defaultValue={selectedSeller?.name || ""}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                name="email"
                defaultValue={selectedSeller?.email || ""}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Phone</Form.Label>
              <Form.Control
                name="phone"
                defaultValue={selectedSeller?.phone || ""}
              />
            </Form.Group>
            <Button type="submit" variant="success">
              {selectedSeller ? "Update" : "Add"} Seller
            </Button>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default Sellers;
