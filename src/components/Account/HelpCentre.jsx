import React, { useState, useEffect } from 'react';
import { useFirebase } from '../../context/FirebaseContext';
import { collection, query, onSnapshot, doc, setDoc, addDoc } from 'firebase/firestore';
import { Alert, Spinner, Form, Button, Card, Table, Badge } from 'react-bootstrap';
import { Navigate } from 'react-router-dom';
import '../../styles/AccountLayout.css'; // Reuse existing styles for consistency

export default function HelpCentre() {
  const { user, firestore, userData, loadingUserData } = useFirebase();
  const [orders, setOrders] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [subject, setSubject] = useState('');
  const [orderId, setOrderId] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);

  // Fetch user's past orders and support tickets
  useEffect(() => {
    if (!user || !firestore) {
      setLoading(false);
      return;
    }

    // Fetch orders
    const ordersQuery = query(collection(firestore, `userOrders/${user.uid}/orders`));
    const ordersUnsubscribe = onSnapshot(
      ordersQuery,
      (snapshot) => {
        const fetchedOrders = snapshot.docs.map((doc) => ({
          id: doc.data().orderId,
          date: doc.data().orderDate
            ? new Date(doc.data().orderDate).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })
            : 'N/A',
        }));
        setOrders(fetchedOrders.sort((a, b) => new Date(b.date) - new Date(a.date)));
      },
      (err) => {
        setError(`Failed to load orders: ${err.message}`);
      }
    );

    // Fetch support tickets
    const ticketsQuery = query(collection(firestore, `userSupportTickets/${user.uid}/tickets`));
    const ticketsUnsubscribe = onSnapshot(
      ticketsQuery,
      (snapshot) => {
        const fetchedTickets = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setTickets(fetchedTickets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
        setLoading(false);
      },
      (err) => {
        setError(`Failed to load tickets: ${err.message}`);
        setLoading(false);
      }
    );

    return () => {
      ordersUnsubscribe();
      ticketsUnsubscribe();
    };
  }, [user, firestore]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      setError('Please log in to submit a support ticket.');
      return;
    }
    if (!subject || !description) {
      setError('Please fill in all required fields.');
      return;
    }
    if (subject === 'Order Related' && !orderId) {
      setError('Please select an order for order-related issues.');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const ticketData = {
        userId: user.uid,
        userName: userData?.name || user.displayName || 'Unknown',
        userEmail: user.email || '',
        subject,
        orderId: subject === 'Order Related' ? orderId : null,
        description,
        status: 'Open',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        adminNotes: '',
        resolution: '',
      };

      // Add to supportTickets collection
      const ticketRef = await addDoc(collection(firestore, 'supportTickets'), ticketData);

      // Mirror in userSupportTickets collection
      await setDoc(doc(firestore, `userSupportTickets/${user.uid}/tickets`, ticketRef.id), {
        ...ticketData,
        ticketId: ticketRef.id,
      });

      setSuccess('Support ticket submitted successfully!');
      setSubject('');
      setOrderId('');
      setDescription('');
      setShowForm(false);
    } catch (err) {
      setError(`Failed to submit ticket: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingUserData || loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
        <Spinner animation="border" variant="primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  return (
    <div className="container mt-4">
      <h4 className="mb-4 border-bottom pb-2">Help Centre</h4>

      {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}
      {success && <Alert variant="success" onClose={() => setSuccess('')} dismissible>{success}</Alert>}

      {!showForm ? (
        <>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h5>My Support Tickets</h5>
            <Button
              variant="primary"
              onClick={() => setShowForm(true)}
            >
              Start New Ticket
            </Button>
          </div>

          {tickets.length === 0 ? (
            <p className="text-muted">You have no support tickets yet.</p>
          ) : (
            <div className="table-responsive">
              <Table striped bordered hover>
                <thead className="table-light">
                  <tr>
                    <th>Ticket ID</th>
                    <th>Subject</th>
                    <th>Order ID</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Description</th>
                    <th>Resolution</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((ticket) => (
                    <tr key={ticket.id}>
                      <td>
                        {ticket.id}
                        {ticket.status === 'Open' && <Badge bg="warning" className="ms-2 text-dark">Open</Badge>}
                      </td>
                      <td>{ticket.subject}</td>
                      <td>{ticket.orderId || 'N/A'}</td>
                      <td>{new Date(ticket.createdAt).toLocaleDateString('en-IN')}</td>
                      <td>{ticket.status}</td>
                      <td>{ticket.description}</td>
                      <td>{ticket.resolution || 'Pending'}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </>
      ) : (
        <Card className="shadow-sm p-4">
          <Card.Body>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5>Create New Support Ticket</h5>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowForm(false)}
                disabled={submitting}
              >
                Back to Tickets
              </Button>
            </div>
            <Form onSubmit={handleSubmit}>
              <Form.Group className="mb-3">
                <Form.Label className="fw-semibold">Subject</Form.Label>
                <Form.Select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  disabled={submitting}
                  required
                >
                  <option value="">Select an issue</option>
                  <option value="Order Related">Order Related</option>
                  <option value="Product Related">Product Related</option>
                  <option value="Other">Other</option>
                </Form.Select>
              </Form.Group>

              {subject === 'Order Related' && (
                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold">Select Order</Form.Label>
                  <Form.Select
                    value={orderId}
                    onChange={(e) => setOrderId(e.target.value)}
                    disabled={submitting || orders.length === 0}
                    required
                  >
                    <option value="">Select an order</option>
                    {orders.map((order) => (
                      <option key={order.id} value={order.id}>
                        Order {order.id} - {order.date}
                      </option>
                    ))}
                  </Form.Select>
                  {orders.length === 0 && (
                    <Form.Text className="text-muted">
                      No past orders available.
                    </Form.Text>
                  )}
                </Form.Group>
              )}

              <Form.Group className="mb-3">
                <Form.Label className="fw-semibold">Describe Your Issue</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={5}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Please provide details about your issue..."
                  disabled={submitting}
                  required
                />
              </Form.Group>

              <Button
                type="submit"
                variant="primary"
                disabled={submitting}
              >
                {submitting ? 'Submitting...' : 'Submit Ticket'}
              </Button>
            </Form>
          </Card.Body>
        </Card>
      )}
    </div>
  );
}