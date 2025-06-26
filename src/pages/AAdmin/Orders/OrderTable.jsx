import React from 'react';
import { Table, Button, Badge } from 'react-bootstrap';

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
              <td>{new Date(order.orderDate).toLocaleDateString('en-IN')}</td>
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
                <Button
                  variant="outline-info"
                  size="sm"
                  className="me-2"
                  onClick={() => {
                    handleShowDetail(order);
                    setShowDetailModal(true);
                  }}
                  disabled={submitting}
                >
                  View
                </Button>
                {isPendingTab ? (
                  <Button variant="secondary" size="sm" disabled>
                    Awaiting Payment
                  </Button>
                ) : order.sentToSupplier ? (
                  <Button variant="success" size="sm" disabled>
                    Sent
                  </Button>
                ) : (
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
                )}
                {!isPendingTab && order.paymentStatus === 'Completed' && (
                  <Button
                    variant="outline-primary"
                    size="sm"
                    onClick={() => handleVerifyPricing(order.id)}
                    disabled={submitting}
                  >
                    Verify Pricing
                  </Button>
                )}
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
    </div>
  );
};

export default OrderTable;