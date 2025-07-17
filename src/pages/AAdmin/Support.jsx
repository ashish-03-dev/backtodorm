import React, { useState, useEffect } from "react";
import { Modal, Button, Form, Badge, Table, Spinner, Alert } from "react-bootstrap";
import { useFirebase } from "../../context/FirebaseContext";
import { collection, query, onSnapshot, doc, updateDoc } from "firebase/firestore";
import moment from 'moment';

export default function AdminSupport() {
  const { firestore, userData, error: firebaseError } = useFirebase();
  const [tickets, setTickets] = useState([]);
  const [filter, setFilter] = useState({ status: "", search: "" });
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [resolution, setResolution] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Fetch support tickets
  useEffect(() => {
    if (!firestore) return;

    const ticketsQuery = query(collection(firestore, "supportTickets"));
    const unsubscribe = onSnapshot(
      ticketsQuery,
      (snapshot) => {
        try {
          const ticketList = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          //sort using date and time
          setTickets(
            ticketList.sort(
              (a, b) =>
                b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime()
            )
          );
          setLoading(false);
        } catch (err) {
          setError(`Failed to fetch tickets: ${err.message}`);
          setLoading(false);
        }
      },
      (err) => {
        setError(`Failed to fetch tickets: ${err.message}`);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [firestore, userData]);

  const handleStatusChange = async (ticketId, newStatus) => {
    setSubmitting(true);
    setError("");
    try {
      const ticketRef = doc(firestore, "supportTickets", ticketId);
      await updateDoc(ticketRef, {
        status: newStatus,
        updatedAt: new Date().toISOString(),
      });

      // Update userSupportTickets collection
      const ticket = tickets.find(t => t.id === ticketId);
      const userTicketRef = doc(firestore, `userSupportTickets/${ticket.userId}/tickets`, ticketId);
      await updateDoc(userTicketRef, {
        status: newStatus,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      setError(`Failed to update status: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateTicket = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const ticketRef = doc(firestore, "supportTickets", selectedTicket.id);
      await updateDoc(ticketRef, {
        adminNotes,
        resolution: resolution || selectedTicket.resolution,
        updatedAt: new Date().toISOString(),
        status: resolution ? "Resolved" : selectedTicket.status,
      });

      // Update userSupportTickets collection
      const userTicketRef = doc(firestore, `userSupportTickets/${selectedTicket.userId}/tickets`, selectedTicket.id);
      await updateDoc(userTicketRef, {
        adminNotes,
        resolution: resolution || selectedTicket.resolution,
        updatedAt: new Date().toISOString(),
        status: resolution ? "Resolved" : selectedTicket.status,
      });

      setShowDetailModal(false);
      setAdminNotes("");
      setResolution("");
    } catch (err) {
      setError(`Failed to update ticket: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredTickets = tickets.filter((ticket) => {
    return (
      (filter.status === "" || ticket.status === filter.status) &&
      (filter.search === "" ||
        ticket.userName.toLowerCase().includes(filter.search.toLowerCase()) ||
        ticket.id.toLowerCase().includes(filter.search.toLowerCase()) ||
        ticket.description.toLowerCase().includes(filter.search.toLowerCase()))
    );
  });

  const isFiltering = filter.status !== "" || filter.search.trim().length > 1;

  const handleShowDetail = (ticket) => {
    setSelectedTicket(ticket);
    setAdminNotes(ticket.adminNotes || "");
    setResolution(ticket.resolution || "");
    setShowDetailModal(true);
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "100vh" }}>
        <Spinner animation="border" className="text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    );
  }

  if (firebaseError) {
    return (
      <div className="container mt-4">
        <Alert variant="danger">Firebase Error: {firebaseError}</Alert>
      </div>
    );
  }

  return (
    <div className="p-4 p-md-5">
      <h3 className="mb-4">🎧 Support Tickets</h3>
      {error && <Alert variant="danger" onClose={() => setError("")} dismissible>{error}</Alert>}

      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <Form.Select
            value={filter.status}
            onChange={(e) => setFilter((prev) => ({ ...prev, status: e.target.value }))}
            disabled={submitting}
          >
            <option value="">Filter by Status</option>
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
            <option value="Closed">Closed</option>
          </Form.Select>
        </div>
        <div className="col-md-5">
          <Form.Control
            type="search"
            placeholder="Search by User, Ticket ID, or Description"
            value={filter.search}
            onChange={(e) => setFilter((prev) => ({ ...prev, search: e.target.value }))}
            disabled={submitting}
          />
        </div>
      </div>

      {!isFiltering && tickets.some((ticket) => ticket.status === "Open") && (
        <div className="mb-4 p-3 border rounded bg-light">
          <h5 className="mb-3">🚨 Open Support Tickets</h5>
          {tickets
            .filter((ticket) => ticket.status === "Open")
            .map((ticket) => (
              <div
                key={ticket.id}
                className="d-flex justify-content-between align-items-center mb-2 p-2 border rounded bg-white"
              >
                <div>
                  <strong>{ticket.id}</strong> - {ticket.userName} ({new Date(ticket.createdAt).toLocaleDateString('en-IN')})
                </div>
                <Button
                  variant="outline-primary"
                  size="sm"
                  onClick={() => handleShowDetail(ticket)}
                  disabled={submitting}
                >
                  View & Manage
                </Button>
              </div>
            ))}
        </div>
      )}

      <div className="table-responsive">
        <Table striped bordered hover>
          <thead className="table-light">
            <tr>
              <th>Ticket ID</th>
              <th>User</th>
              <th>Subject</th>
              <th>Order ID</th>
              <th>Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredTickets.map((ticket) => (
              <tr key={ticket.id}>
                <td>
                  {ticket.id}
                  {ticket.status === "Open" && <Badge bg="warning" className="ms-2 text-dark">Open</Badge>}
                </td>
                <td>{ticket.userName}</td>
                <td>{ticket.subject}</td>
                <td>{ticket.orderId || "N/A"}</td>
                <td>{ticket.createdAt?.toDate
                ? moment(ticket.createdAt.toDate()).format("D MMM YYYY, h:mm A")
                : "N/A"}</td>
                <td>
                  <Form.Select
                    size="sm"
                    value={ticket.status}
                    onChange={(e) => handleStatusChange(ticket.id, e.target.value)}
                    disabled={submitting}
                  >
                    <option value="Open">Open</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Closed">Closed</option>
                  </Form.Select>
                </td>
                <td>
                  <Button
                    variant="outline-info"
                    size="sm"
                    onClick={() => handleShowDetail(ticket)}
                    disabled={submitting}
                  >
                    View & Manage
                  </Button>
                </td>
              </tr>
            ))}
            {filteredTickets.length === 0 && (
              <tr>
                <td colSpan="7" className="text-center text-muted">
                  No tickets found.
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>

      <Modal show={showDetailModal} onHide={() => setShowDetailModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Ticket Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedTicket && (
            <>
              <p><strong>Ticket ID:</strong> {selectedTicket.id}</p>
              <p><strong>User:</strong> {selectedTicket.userName} ({selectedTicket.userEmail})</p>
              <p><strong>Subject:</strong> {selectedTicket.subject}</p>
              {selectedTicket.orderId && <p><strong>Order ID:</strong> {selectedTicket.orderId}</p>}
              <p><strong>Description:</strong> {selectedTicket.description}</p>
              <p><strong>Date:</strong> {new Date(selectedTicket.createdAt).toLocaleDateString('en-IN')}</p>
              <p><strong>Status:</strong> {selectedTicket.status}</p>
              <hr />
              <Form onSubmit={handleUpdateTicket}>
                <Form.Group className="mb-3">
                  <Form.Label>Admin Notes</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Add internal notes..."
                    disabled={submitting}
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Resolution Details</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                    placeholder="Describe how the issue was resolved..."
                    disabled={submitting}
                  />
                </Form.Group>
                <Button type="submit" variant="primary" disabled={submitting}>
                  {submitting ? "Saving..." : "Save Changes"}
                </Button>
              </Form>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDetailModal(false)} disabled={submitting}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}