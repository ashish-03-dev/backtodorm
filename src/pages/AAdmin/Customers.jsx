import React, { useState } from "react";
import { Modal, Button, Form, Badge } from "react-bootstrap";

const dummyCustomers = [
  {
    id: "CUS001",
    name: "Ashish Kumar",
    email: "ashish@example.com",
    phone: "9876543210",
    status: "Active",
    orders: [
      { id: "ORD001", date: "2025-06-10", total: 749 },
      { id: "ORD004", date: "2025-05-20", total: 399 },
    ],
    wishlist: ["One Piece Poster", "Demon Slayer Poster"],
  },
  {
    id: "CUS002",
    name: "Riya Singh",
    email: "riya@example.com",
    phone: "9988776655",
    status: "Suspended",
    orders: [{ id: "ORD002", date: "2025-06-08", total: 299 }],
    wishlist: ["Marvel Poster"],
  },
];

const Customers = () => {
  const [customers, setCustomers] = useState(dummyCustomers);
  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const handleToggleStatus = (id) => {
    setCustomers((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, status: c.status === "Active" ? "Suspended" : "Active" }
          : c
      )
    );
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="container mt-4">
      <h2 className="mb-3">👥 Customers</h2>

      {/* Search Filter */}
      <div className="row mb-3">
        <div className="col-md-6">
          <Form.Control
            placeholder="Search by Name or Email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Customers Table */}
      <div className="table-responsive">
        <table className="table table-hover align-middle">
          <thead className="table-light">
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Status</th>
              <th>Orders</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredCustomers.length === 0 ? (
              <tr>
                <td colSpan="6" className="text-center text-muted">
                  No matching customers found.
                </td>
              </tr>
            ) : (
              filteredCustomers.map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td>{c.email}</td>
                  <td>{c.phone}</td>
                  <td>
                    <Badge bg={c.status === "Active" ? "success" : "secondary"}>
                      {c.status}
                    </Badge>
                  </td>
                  <td>{c.orders.length}</td>
                  <td>
                    <Button
                      variant="outline-info"
                      size="sm"
                      className="me-2"
                      onClick={() => {
                        setSelectedCustomer(c);
                        setShowModal(true);
                      }}
                    >
                      View
                    </Button>
                    <Button
                      variant={c.status === "Active" ? "outline-danger" : "outline-success"}
                      size="sm"
                      onClick={() => handleToggleStatus(c.id)}
                    >
                      {c.status === "Active" ? "Suspend" : "Reactivate"}
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Details Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Customer Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedCustomer && (
            <>
              <p><strong>Name:</strong> {selectedCustomer.name}</p>
              <p><strong>Email:</strong> {selectedCustomer.email}</p>
              <p><strong>Phone:</strong> {selectedCustomer.phone}</p>
              <p><strong>Status:</strong> {selectedCustomer.status}</p>

              <hr />
              <h6>Order History:</h6>
              <ul className="list-group mb-3">
                {selectedCustomer.orders.map((order) => (
                  <li className="list-group-item d-flex justify-content-between" key={order.id}>
                    {order.id} - {order.date}
                    <span>₹{order.total}</span>
                  </li>
                ))}
              </ul>

              <h6>Wishlist:</h6>
              <ul className="list-group">
                {selectedCustomer.wishlist.map((item, idx) => (
                  <li key={idx} className="list-group-item">{item}</li>
                ))}
              </ul>
            </>
          )}
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default Customers;
