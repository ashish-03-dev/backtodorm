import React, { useState } from "react";
import { Button, Modal, Form, Badge } from "react-bootstrap";

const dummyTickets = [
  {
    id: "TCK001",
    user: {
      name: "Ashish Kumar",
      email: "ashish03.dev@gmail.com",
      phone: "9876543210",
    },
    orderId: "ORD001",
    subject: "Poster arrived damaged",
    message: "The Naruto poster was torn at the edge.",
    status: "Open",
    assignedTo: "",
    date: "2025-06-12",
  },
  {
    id: "TCK002",
    user: {
      name: "Riya Singh",
      email: "riya@example.com",
      phone: "9871234567",
    },
    orderId: "ORD002",
    subject: "Late delivery",
    message: "Order was supposed to arrive 3 days ago.",
    status: "Resolved",
    assignedTo: "Support Team A",
    date: "2025-06-10",
  },
];

const Support = () => {
  const [tickets, setTickets] = useState(dummyTickets);
  const [filterStatus, setFilterStatus] = useState("");
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const filteredTickets = tickets.filter(
    (t) => filterStatus === "" || t.status === filterStatus
  );

  const handleStatusChange = (ticketId, newStatus) => {
    setTickets((prev) =>
      prev.map((t) =>
        t.id === ticketId ? { ...t, status: newStatus } : t
      )
    );
  };

  const handleAssignChange = (ticketId, staff) => {
    setTickets((prev) =>
      prev.map((t) =>
        t.id === ticketId ? { ...t, assignedTo: staff } : t
      )
    );
  };

  return (
    <div className="container mt-4">
      <h2 className="mb-3">🛠️ Support / Complaints</h2>

      <div className="row mb-3">
        <div className="col-md-4">
          <Form.Select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">Filter by Status</option>
            <option>Open</option>
            <option>In Progress</option>
            <option>Resolved</option>
          </Form.Select>
        </div>
      </div>

      <div className="table-responsive">
        <table className="table table-hover align-middle">
          <thead className="table-light">
            <tr>
              <th>ID</th>
              <th>User</th>
              <th>Order</th>
              <th>Subject</th>
              <th>Status</th>
              <th>Assigned</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredTickets.map((ticket) => (
              <tr key={ticket.id}>
                <td>{ticket.id}</td>
                <td>{ticket.user.name}</td>
                <td>{ticket.orderId}</td>
                <td>{ticket.subject}</td>
                <td>
                  <Form.Select
                    size="sm"
                    value={ticket.status}
                    onChange={(e) =>
                      handleStatusChange(ticket.id, e.target.value)
                    }
                  >
                    <option>Open</option>
                    <option>In Progress</option>
                    <option>Resolved</option>
                  </Form.Select>
                </td>
                <td>
                  <Form.Control
                    size="sm"
                    placeholder="Assign..."
                    value={ticket.assignedTo}
                    onChange={(e) =>
                      handleAssignChange(ticket.id, e.target.value)
                    }
                  />
                </td>
                <td>{ticket.date}</td>
                <td>
                  <Button
                    size="sm"
                    variant="outline-info"
                    onClick={() => {
                      setSelectedTicket(ticket);
                      setShowDetailModal(true);
                    }}
                  >
                    View
                  </Button>
                </td>
              </tr>
            ))}
            {filteredTickets.length === 0 && (
              <tr>
                <td colSpan="8" className="text-center text-muted">
                  No tickets found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      <Modal show={showDetailModal} onHide={() => setShowDetailModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Ticket Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedTicket && (
            <>
              <p><strong>Ticket ID:</strong> {selectedTicket.id}</p>
              <p><strong>Subject:</strong> {selectedTicket.subject}</p>
              <p><strong>Message:</strong> {selectedTicket.message}</p>
              <hr />
              <p><strong>Order ID:</strong> {selectedTicket.orderId}</p>
              <p><strong>User:</strong> {selectedTicket.user.name}</p>
              <p><strong>Email:</strong> {selectedTicket.user.email}</p>
              <p><strong>Phone:</strong> {selectedTicket.user.phone}</p>
              <p><strong>Status:</strong>{" "}
                <Badge bg={
                  selectedTicket.status === "Resolved"
                    ? "success"
                    : selectedTicket.status === "In Progress"
                    ? "warning"
                    : "secondary"
                }>
                  {selectedTicket.status}
                </Badge>
              </p>
              <p><strong>Assigned To:</strong> {selectedTicket.assignedTo || "Not assigned"}</p>
              <p><strong>Date:</strong> {selectedTicket.date}</p>
            </>
          )}
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default Support;
