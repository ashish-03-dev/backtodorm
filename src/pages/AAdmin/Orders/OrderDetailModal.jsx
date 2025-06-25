import React from 'react';
import { Modal, Button } from 'react-bootstrap';

const OrderDetailModal = ({ show, onHide, order }) => {
  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Order Details</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {order && (
          <>
            <p><strong>Order ID:</strong> {order.id}</p>
            <p><strong>Customer:</strong> {order.customerName}</p>
            <p><strong>Items:</strong></p>
            <ul>
              {order.items.map((item, index) => (
                <li key={index}>
                  {item.type === 'poster' ? (
                    <span>
                      {item.posterTitle} ({item.size}) × {item.quantity} - ₹{item.price * item.quantity}
                    </span>
                  ) : (
                    <span>
                      Collection: {item.collectionTitle} × {item.quantity} (Discount: {item.collectionDiscount}%)
                      <ul className="ms-3">
                        {item.posters.map((poster, i) => (
                          <li key={i}>
                            {poster.title} ({poster.size}) - ₹{poster.price}
                          </li>
                        ))}
                      </ul>
                    </span>
                  )}
                </li>
              ))}
            </ul>
            <p><strong>Date:</strong> {new Date(order.orderDate).toLocaleDateString('en-IN')}</p>
            <p><strong>Status:</strong> {order.status}</p>
            <p><strong>Total:</strong> ₹{order.totalPrice}</p>
            {order.shippingAddress && (
              <>
                <p><strong>Shipping Address:</strong></p>
                <p>
                  {order.shippingAddress.name}, {order.shippingAddress.address},{' '}
                  {order.shippingAddress.locality}, {order.shippingAddress.city},{' '}
                  {order.shippingAddress.state} - {order.shippingAddress.pincode}
                  {order.shippingAddress.landmark && `, Landmark: ${order.shippingAddress.landmark}`}
                </p>
              </>
            )}
            {order.sentToSupplier && order.supplierInfo && (
              <>
                <hr />
                <h6>Supplier Info:</h6>
                <p><strong>Name:</strong> {order.supplierInfo.supplierName}</p>
                <p><strong>Tracking ID:</strong> {order.supplierInfo.trackingId || 'N/A'}</p>
                <p><strong>Notes:</strong> {order.supplierInfo.notes || 'None'}</p>
              </>
            )}
          </>
        )}
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