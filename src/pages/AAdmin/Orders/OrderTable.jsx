import React, { useState } from 'react';
import { Table, Button, Badge, Modal, Form, Alert } from 'react-bootstrap';
import { useFirebase } from '../../../context/FirebaseContext';
import { doc, updateDoc } from 'firebase/firestore';

const OrderTable = ({
  orders,
  handleShowDetail,
  setShowDetailModal,
  setSupplierData,
  setShowSupplierModal,
  handleVerifyPricing,
  submitting,
  isPendingTab = false,
}) => {
  const { firestore } = useFirebase();
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [editError, setEditError] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);

  const handleEditOrder = async (e) => {
    e.preventDefault();
    setEditError('');
    setEditSubmitting(true);

    try {
      if (!newStatus) {
        throw new Error('Please select a new status');
      }

      await updateDoc(doc(firestore, 'orders', selectedOrder.id), {
        status: newStatus
      });

      setShowEditModal(false);
      setSelectedOrder(null);
      setNewStatus('');
    } catch (err) {
      setEditError(`Failed to update order status: ${err.message}`);
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleOpenEditModal = (order) => {
    setSelectedOrder(order);
    setNewStatus(order.status || ''); // Pre-fill with current status if exists
    setShowEditModal(true);
  };

  return (
    <div className="table-responsive">
      <Table striped bordered hover>
        <thead className="table-light">
          <tr>
            <th>Order ID</th>
            <th>Customer</th>
            <th>Date</th>
            <th>Total (₹)</th>
            <th>Payment Status</th>
            <th>Verified</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id}>
              <td>
                {order.id}
                {order.sentToSupplier && <Badge bg="success" className="ms-2">Sent</Badge>}
              </td>
              <td>{order.customerName}</td>
              <td>
                {order.orderDate?.toDate
                  ? order.orderDate.toDate().toLocaleString("en-IN", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })
                  : "N/A"}
              </td>
              <td>{order.totalPrice.toLocaleString('en-IN')}</td>
              <td>
                <Badge
                  bg={
                    order.paymentStatus === 'Completed'
                      ? 'success'
                      : order.paymentStatus === 'Pending'
                        ? 'warning'
                        : 'danger'
                  }
                >
                  {order.paymentStatus}
                </Badge>
              </td>
              <td>
                {order.paymentStatus === 'Completed' && !isPendingTab ? (
                  <Badge bg={order.verified ? 'success' : 'danger'}>
                    {order.verified ? 'Verified' : 'Unverified'}
                  </Badge>
                ) : (
                  <Badge bg="secondary">N/A</Badge>
                )}
              </td>
              <td>
                <div className='d-flex gap-2'>
                  <Button
                    variant="outline-info"
                    size="sm"
                    onClick={() => {
                      handleShowDetail(order);
                      setShowDetailModal(true);
                    }}
                    disabled={submitting}
                  >
                    View
                  </Button>
                  {!isPendingTab && order.paymentStatus === 'Completed' && !order.verified && (
                    <Button
                      variant="outline-primary"
                      size="sm"
                      onClick={() => handleVerifyPricing(order.id)}
                      disabled={submitting}
                    >
                      Verify Pricing
                    </Button>
                  )}

                  {isPendingTab ? (
                    <Button variant="secondary" size="sm" disabled>
                      Awaiting Payment
                    </Button>
                  ) : order.sentToSupplier ? (
                    <>
                      <Button variant="success" size="sm" disabled>
                        Sent
                      </Button>
                      <Button
                        variant="outline-warning"
                        size="sm"
                        onClick={() => handleOpenEditModal(order)}
                        disabled={submitting}
                      >
                        Edit Status
                      </Button>
                    </>
                  ) : order.verified ? ( // Only show if order is verified
                    <Button
                      variant="outline-success"
                      size="sm"
                      className="me-2"
                      onClick={() => {
                        setSupplierData({
                          supplierName: '',
                          contact: '',
                          items: order.items,
                          address: order.shippingAddress || {
                            name: '',
                            address: '',
                            locality: '',
                            city: '',
                            state: '',
                            pincode: '',
                            landmark: ''
                          },
                          supplierOrderId: '',
                          sentOrderId: order.id,
                        });
                        setShowSupplierModal(true);
                      }}
                      disabled={submitting || order.paymentStatus !== 'Completed'}
                    >
                      Send to Supplier
                    </Button>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
          {orders.length === 0 && (
            <tr>
              <td colSpan="7" className="text-center text-muted">
                No orders found.
              </td>
            </tr>
          )}
        </tbody>
      </Table>

      <Modal show={showEditModal} onHide={() => setShowEditModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Edit Order Status</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {editError && <Alert variant="danger">{editError}</Alert>}
          <Form onSubmit={handleEditOrder}>
            <Form.Group className="mb-3">
              <Form.Label>Order ID: {selectedOrder?.id}</Form.Label>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>New Status</Form.Label>
              <Form.Select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                required
              >
                <option value="">Select Status</option>
                <option value="Order Received">Order Placed</option>
                <option value="Processing">Processing</option>
                <option value="Shipped">Shipped</option>
                <option value="Delivered">Delivered</option>
                <option value="Cancelled">Cancelled</option>
              </Form.Select>
            </Form.Group>
            <Button variant="primary" type="submit" disabled={editSubmitting}>
              {editSubmitting ? 'Updating...' : 'Update Status'}
            </Button>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default OrderTable;