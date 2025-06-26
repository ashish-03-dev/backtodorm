import React from 'react';
import { Modal, Button, ListGroup, Card } from 'react-bootstrap';

const OrderDetailModal = ({ show, onHide, order }) => {
  if (!order) return null;

  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Order Details - {order.id}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Card className="mb-3">
          <Card.Body>
            <h5>Customer Information</h5>
            <p><strong>Name:</strong> {order.customerName}</p>
            <p><strong>Shipping Address:</strong> {order.shippingAddress?.address}, {order.shippingAddress?.locality}, {order.shippingAddress?.city}, {order.shippingAddress?.state} - {order.shippingAddress?.pincode}</p>
            {order.shippingAddress?.landmark && <p><strong>Landmark:</strong> {order.shippingAddress.landmark}</p>}
          </Card.Body>
        </Card>
        <Card className="mb-3">
          <Card.Body>
            <h5>Order Items</h5>
            <ListGroup variant="flush">
              {order.items.map((item, index) => (
                <ListGroup.Item key={`${item.posterId || item.collectionId}-${index}`}>
                  <div className="d-flex align-items-center">
                    <img
                      src={item.image || 'https://via.placeholder.com/50'}
                      alt={item.posterTitle || item.collectionTitle || 'Item'}
                      style={{ width: '50px', height: '50px', objectFit: 'cover', marginRight: '10px' }}
                    />
                    <div className="flex-grow-1">
                      <h6>{item.type === 'poster' ? item.posterTitle : `Collection: ${item.collectionTitle}`}</h6>
                      <p className="mb-0">Quantity: {item.quantity || 1}</p>
                      <p className="mb-0">Size: {item.size || 'N/A'}</p>
                      {item.discount > 0 && <p className="mb-0 text-success">Discount: {item.discount}%</p>}
                      {item.collectionDiscount > 0 && <p className="mb-0 text-success">Collection Discount: {item.collectionDiscount}%</p>}
                    </div>
                    <p>
                      ₹{(
                        item.type === 'collection'
                          ? (item.posters || []).reduce((sum, p) => sum + (p.finalPrice || p.price || 0), 0) * (item.quantity || 1) * (1 - (item.collectionDiscount || 0) / 100)
                          : (item.finalPrice || item.price || 0) * (item.quantity || 1)
                      ).toLocaleString('en-IN')}
                    </p>
                  </div>
                  {item.type === 'collection' && (
                    <ul className="mt-2 ps-3 small text-muted">
                      {(item.posters || []).map((poster, i) => (
                        <li key={i}>
                          {poster.title || 'Untitled'} ({poster.size || 'N/A'}) - ₹{(poster.finalPrice || poster.price || 0).toLocaleString('en-IN')}
                          {poster.discount > 0 && <span className="text-success ms-1">({poster.discount}% off)</span>}
                        </li>
                      ))}
                    </ul>
                  )}
                </ListGroup.Item>
              ))}
            </ListGroup>
          </Card.Body>
        </Card>
        <Card>
          <Card.Body>
            <h5>Order Summary</h5>
            <p><strong>Subtotal:</strong> ₹{order.subtotal.toLocaleString('en-IN')}</p>
            <p><strong>Delivery Charge:</strong> ₹{order.deliveryCharge.toLocaleString('en-IN')}</p>
            <p><strong>Total:</strong> ₹{order.totalPrice.toLocaleString('en-IN')}</p>
            <p><strong>Payment Status:</strong> {order.paymentStatus}</p>
            {order.razorpay_payment_id && <p><strong>Razorpay Payment ID:</strong> {order.razorpay_payment_id}</p>}
            {order.razorpay_order_id && <p><strong>Razorpay Order ID:</strong> {order.razorpay_order_id}</p>}
            {order.sentToSupplier && (
              <>
                <h5>Supplier Information</h5>
                <p><strong>Supplier Name:</strong> {order.supplierInfo?.supplierName}</p>
                <p><strong>Supplier Order ID:</strong> {order.supplierInfo?.supplierOrderId}</p>
                <p><strong>Supplier Address:</strong> {order.supplierInfo?.address?.address}, {order.supplierInfo?.address?.city}, {order.supplierInfo?.address?.state} - {order.supplierInfo?.address?.pincode}</p>
              </>
            )}
          </Card.Body>
        </Card>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default OrderDetailModal;