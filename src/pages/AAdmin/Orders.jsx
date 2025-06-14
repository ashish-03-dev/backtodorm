import React, { useState } from "react";
import { Modal, Button, Form, Badge } from "react-bootstrap";

const dummyOrders = [
  {
    id: "ORD001",
    customer: "Ashish Kumar",
    date: "2025-06-12",
    status: "Pending",
    total: 749,
    sentToSupplier: true,
    supplierInfo: {
      supplierName: "PosterPrints Ltd.",
      contact: "posterprints@example.com",
      notes: "Deliver by Friday",
      trackingId: "TRK123456",
    },
    items: [
      { name: "Naruto Poster", qty: 1, price: 249 },
      { name: "Iron Man Poster", qty: 2, price: 250 },
    ],
  },
  {
    id: "ORD002",
    customer: "Riya Singh",
    date: "2025-06-11",
    status: "Delivered",
    total: 299,
    sentToSupplier: false,
    items: [{ name: "Attack on Titan Poster", qty: 1, price: 299 }],
  },
];

const Orders = () => {
  const [orders, setOrders] = useState(dummyOrders);
  const [filter, setFilter] = useState({ status: "", search: "" });
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [supplierData, setSupplierData] = useState({
    supplierName: "",
    contact: "",
    notes: "",
    trackingId: "",
    sentOrderId: null,
  });

  const handleStatusChange = (orderId, newStatus) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
    );
  };

  const filteredOrders = orders.filter((order) => {
    return (
      (filter.status === "" || order.status === filter.status) &&
      (filter.search === "" ||
        order.customer.toLowerCase().includes(filter.search.toLowerCase()) ||
        order.id.toLowerCase().includes(filter.search.toLowerCase()))
    );
  });

  const isFiltering =
    filter.status !== "" || filter.search.trim().length > 1;


  const handleShowDetail = (order) => {
    setSelectedOrder(order);
    setShowDetailModal(true);
  };

  const handleShowEdit = (order = null) => {
    setSelectedOrder(order);
    setShowEditModal(true);
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    const form = e.target;
    const newOrder = {
      id: selectedOrder?.id || "ORD" + (orders.length + 1).toString().padStart(3, "0"),
      customer: form.customer.value,
      date: form.date.value,
      status: form.status.value,
      total: parseInt(form.total.value),
      items: [],
    };

    if (selectedOrder) {
      setOrders((prev) =>
        prev.map((o) => (o.id === selectedOrder.id ? newOrder : o))
      );
    } else {
      setOrders((prev) => [...prev, newOrder]);
    }

    setShowEditModal(false);
  };

  return (
    <div className="container mt-4">
      <h2 className="mb-3">📦 Orders Management</h2>

      {/* FILTERS */}
      <div className="row g-3 mb-3">
        <div className="col-md-3">
          <Form.Select
            value={filter.status}
            onChange={(e) =>
              setFilter((prev) => ({ ...prev, status: e.target.value }))
            }
          >
            <option value="">Filter by Status</option>
            <option>Pending</option>
            <option>Shipped</option>
            <option>Delivered</option>
            <option>Cancelled</option>
          </Form.Select>
        </div>
        <div className="col-md-5">
          <Form.Control
            type="text"
            placeholder="Search by Customer or Order ID"
            value={filter.search}
            onChange={(e) =>
              setFilter((prev) => ({ ...prev, search: e.target.value }))
            }
          />
        </div>
        <div className="col-md-4 text-end">
          <Button variant="primary" onClick={() => handleShowEdit(null)}>
            + Create Order
          </Button>
        </div>
      </div>
      {!isFiltering && orders.some((o) => !o.sentToSupplier) && (
        <div className="mb-4 p-3 border rounded bg-light">
          <h5 className="mb-3">🚨 Unforwarded Customer Orders</h5>
          {orders
            .filter((o) => !o.sentToSupplier)
            .map((order) => (
              <div
                key={order.id}
                className="d-flex justify-content-between align-items-center mb-2 p-2 border rounded bg-white"
              >
                <div>
                  <strong>{order.id}</strong> - {order.customer} ({order.date}) - ₹{order.total}
                </div>
                <Button
                  variant="outline-success"
                  size="sm"
                  onClick={() => {
                    setSupplierData({
                      supplierName: "",
                      contact: "",
                      notes: "",
                      trackingId: "",
                      sentOrderId: order.id,
                    });
                    setShowSupplierModal(true);
                  }}
                >
                  Forward to Supplier
                </Button>
              </div>
            ))}
        </div>
      )}

      {/* TABLE */}
      <div className="table-responsive">
        <table className="table table-hover align-middle">
          <thead className="table-light">
            <tr>
              <th>Order ID</th>
              <th>Customer</th>
              <th>Date</th>
              <th>Status</th>
              <th>Total (₹)</th>
              <th>Supplier</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map((order) => (
              <tr key={order.id}>
                <td>
                  {order.id}
                  {order.sentToSupplier && (
                    <Badge bg="success" className="ms-2">Sent</Badge>
                  )}
                </td>
                <td>{order.customer}</td>
                <td>{order.date}</td>
                <td>
                  <Form.Select
                    size="sm"
                    value={order.status}
                    onChange={(e) =>
                      handleStatusChange(order.id, e.target.value)
                    }
                  >
                    <option>Pending</option>
                    <option>Shipped</option>
                    <option>Delivered</option>
                    <option>Cancelled</option>
                  </Form.Select>
                </td>
                <td>{order.total}</td>
                <td>
                  {order.sentToSupplier ? "✅ Done" : "❌ Not Sent"}
                </td>
                <td>
                  <Button
                    variant="outline-info"
                    size="sm"
                    className="me-2"
                    onClick={() => handleShowDetail(order)}
                  >
                    View
                  </Button>
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    className="me-2"
                    onClick={() => handleShowEdit(order)}
                  >
                    Edit
                  </Button>
                  {order.sentToSupplier ? (
                    <Button variant="success" size="sm" disabled>
                      Sent
                    </Button>
                  ) : (
                    <Button
                      variant="outline-success"
                      size="sm"
                      onClick={() => {
                        setSupplierData({
                          supplierName: "",
                          contact: "",
                          notes: "",
                          trackingId: "",
                          sentOrderId: order.id,
                        });
                        setShowSupplierModal(true);
                      }}
                    >
                      Send to Supplier
                    </Button>
                  )}
                </td>
              </tr>
            ))}
            {filteredOrders.length === 0 && (
              <tr>
                <td colSpan="7" className="text-center text-muted">
                  No orders found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ORDER DETAILS MODAL */}
      <Modal show={showDetailModal} onHide={() => setShowDetailModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Order Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedOrder && (
            <>
              <p><strong>Order ID:</strong> {selectedOrder.id}</p>
              <p><strong>Customer:</strong> {selectedOrder.customer}</p>
              <p><strong>Date:</strong> {selectedOrder.date}</p>
              <p><strong>Status:</strong> {selectedOrder.status}</p>
              <p><strong>Total:</strong> ₹{selectedOrder.total}</p>
              <hr />
              <h6>Items:</h6>
              <ul className="list-group">
                {selectedOrder.items.map((item, i) => (
                  <li key={i} className="list-group-item d-flex justify-content-between">
                    {item.name} (x{item.qty}) <span>₹{item.price}</span>
                  </li>
                ))}
              </ul>
              {selectedOrder.sentToSupplier && selectedOrder.supplierInfo && (
                <>
                  <hr />
                  <h6>Supplier Info:</h6>
                  <p><strong>Name:</strong> {selectedOrder.supplierInfo.supplierName}</p>
                  <p><strong>Contact:</strong> {selectedOrder.supplierInfo.contact}</p>
                  <p><strong>Tracking ID:</strong> {selectedOrder.supplierInfo.trackingId}</p>
                  <p><strong>Notes:</strong> {selectedOrder.supplierInfo.notes}</p>
                </>
              )}
            </>
          )}
        </Modal.Body>
      </Modal>

      {/* EDIT/CREATE MODAL */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>{selectedOrder ? "Edit" : "Create"} Order</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleEditSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Customer Name</Form.Label>
              <Form.Control
                name="customer"
                defaultValue={selectedOrder?.customer || ""}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Date</Form.Label>
              <Form.Control
                name="date"
                type="date"
                defaultValue={selectedOrder?.date || ""}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Status</Form.Label>
              <Form.Select name="status" defaultValue={selectedOrder?.status || "Pending"}>
                <option>Pending</option>
                <option>Shipped</option>
                <option>Delivered</option>
                <option>Cancelled</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Total Amount (₹)</Form.Label>
              <Form.Control
                type="number"
                name="total"
                defaultValue={selectedOrder?.total || 0}
                required
              />
            </Form.Group>

            <Button type="submit" variant="success">
              {selectedOrder ? "Update Order" : "Create Order"}
            </Button>
          </Form>
        </Modal.Body>
      </Modal>

      {/* SUPPLIER MODAL */}
      <Modal show={showSupplierModal} onHide={() => setShowSupplierModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Send Order to Supplier</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form
            onSubmit={(e) => {
              e.preventDefault();
              const updated = orders.map((o) =>
                o.id === supplierData.sentOrderId
                  ? {
                    ...o,
                    sentToSupplier: true,
                    supplierInfo: { ...supplierData },
                  }
                  : o
              );
              setOrders(updated);
              setShowSupplierModal(false);
              alert(`Order ${supplierData.sentOrderId} marked as sent to supplier.`);
            }}
          >
            <Form.Group className="mb-3">
              <Form.Label>Supplier Name</Form.Label>
              <Form.Control
                value={supplierData.supplierName}
                onChange={(e) =>
                  setSupplierData((prev) => ({
                    ...prev,
                    supplierName: e.target.value,
                  }))
                }
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Supplier Contact</Form.Label>
              <Form.Control
                value={supplierData.contact}
                onChange={(e) =>
                  setSupplierData((prev) => ({
                    ...prev,
                    contact: e.target.value,
                  }))
                }
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Notes / Instructions</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={supplierData.notes}
                onChange={(e) =>
                  setSupplierData((prev) => ({
                    ...prev,
                    notes: e.target.value,
                  }))
                }
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Tracking ID</Form.Label>
              <Form.Control
                value={supplierData.trackingId}
                onChange={(e) =>
                  setSupplierData((prev) => ({
                    ...prev,
                    trackingId: e.target.value,
                  }))
                }
              />
            </Form.Group>

            <Button type="submit" variant="success">
              Mark as Sent
            </Button>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default Orders;
