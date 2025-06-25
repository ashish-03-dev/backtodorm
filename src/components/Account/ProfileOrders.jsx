import React, { useState, useEffect } from 'react';
import { useFirebase } from '../../context/FirebaseContext';
import { collection, query, where, onSnapshot, doc, getDoc, deleteDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { Alert, Spinner, Card, Badge, Button, Tabs, Tab, Container, Row, Col } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';

export default function ProfileOrders() {
  const { user, firestore, functions } = useFirebase();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user || !firestore) {
      setError('User or Firestore not available.');
      setLoading(false);
      return;
    }

    const fetchOrders = async (snapshot, isPending = false, collectionPath = `userOrders/${user.uid}/orders`) => {
      const fetchedOrders = await Promise.all(
        snapshot.docs.map(async (orderDoc) => {
          const orderData = orderDoc.data();
          const orderRef = doc(firestore, isPending ? 'temporaryOrders' : 'orders', orderData.orderId);
          const orderSnap = await getDoc(orderRef);
          if (!orderSnap.exists()) return null;

          const fullOrderData = isPending ? orderData : orderSnap.data();
          const items = await Promise.all(
            (fullOrderData.items || []).map(async (item) => {
              const ref = item.type === 'poster' 
                ? doc(firestore, 'posters', item.posterId)
                : doc(firestore, 'standaloneCollections', item.collectionId);
              const snap = await getDoc(ref);

              return item.type === 'poster'
                ? {
                    type: 'poster',
                    name: item.title || (snap.exists() ? snap.data().title : 'Unknown Poster'),
                    quantity: item.quantity || 1,
                    size: item.size || 'N/A',
                    price: item.finalPrice || item.price || 0,
                  }
                : {
                    type: 'collection',
                    name: snap.exists() ? snap.data().title : 'Unknown Collection',
                    quantity: item.quantity || 1,
                    collectionDiscount: item.collectionDiscount || 0,
                    posters: (item.posters || []).map((poster) => ({
                      name: poster.title || 'Unknown Poster',
                      size: poster.size || 'N/A',
                      price: poster.finalPrice || poster.price || 0,
                    })),
                  };
            })
          );

          return {
            id: orderData.orderId,
            date: (isPending ? orderData.createdAt?.toDate() : orderData.orderDate)
              ? new Date(isPending ? orderData.createdAt.toDate() : orderData.orderDate).toLocaleDateString('en-US', {
                  year: 'numeric', month: 'short', day: 'numeric',
                })
              : 'N/A',
            items: items.filter(Boolean),
            total: `₹${(fullOrderData.total || fullOrderData.totalPrice || 0).toLocaleString('en-IN')}`,
            status: isPending ? 'Pending Payment' : orderData.status || 'Pending',
            shippingAddress: fullOrderData.shippingAddress || null,
            paymentStatus: fullOrderData.paymentStatus || (isPending ? 'Pending' : 'Completed'),
            paymentMethod: fullOrderData.paymentMethod || (isPending ? 'Razorpay' : 'N/A'),
            isPending,
          };
        })
      );
      return fetchedOrders.filter(Boolean);
    };

    const ordersQuery = query(collection(firestore, `userOrders/${user.uid}/orders`));
    const pendingOrdersQuery = query(collection(firestore, 'temporaryOrders'), where('userId', '==', user.uid));

    const unsubscribeOrders = onSnapshot(ordersQuery, async (snapshot) => {
      try {
        const confirmedOrders = await fetchOrders(snapshot);
        const unsubscribePending = onSnapshot(pendingOrdersQuery, async (pendingSnapshot) => {
          try {
            const pendingOrders = await fetchOrders(pendingSnapshot, true, 'temporaryOrders');
            setOrders([...confirmedOrders, ...pendingOrders].sort((a, b) => new Date(b.date) - new Date(a.date)));
            setLoading(false);
          } catch (err) {
            setError(`Failed to load pending orders: ${err.message}`);
            setLoading(false);
          }
        });
        return () => unsubscribePending();
      } catch (err) {
        setError(`Failed to load orders: ${err.message}`);
        setLoading(false);
      }
    });

    return () => unsubscribeOrders();
  }, [user, firestore]);

  const handleRetryPayment = async (orderId) => {
    try {
      const createRazorpayOrder = httpsCallable(functions, 'createRazorpayOrder');
      const tempOrderRef = doc(firestore, 'temporaryOrders', orderId);
      const tempOrderSnap = await getDoc(tempOrderRef);
      if (!tempOrderSnap.exists()) throw new Error('Order not found.');

      const tempOrderData = tempOrderSnap.data();
      const result = await createRazorpayOrder({
        subtotal: tempOrderData.subtotal,
        deliveryCharge: tempOrderData.deliveryCharge,
        total: tempOrderData.total,
        items: tempOrderData.items,
        shippingAddress: tempOrderData.shippingAddress,
        isBuyNow: tempOrderData.isBuyNow,
      });

      const { orderId: razorpayOrderId, amount, currency } = result.data;
      const options = {
        key: process.env.REACT_APP_RAZORPAY_KEY_ID,
        amount: amount.toString(),
        currency: currency || 'INR',
        name: 'Back to Dorm',
        description: tempOrderData.isBuyNow ? 'Buy Now Purchase' : 'Cart Purchase',
        order_id: razorpayOrderId,
        prefill: { name: tempOrderData.shippingAddress.name, email: user.email || '', contact: tempOrderData.shippingAddress.phone },
        notes: {
          address: `${tempOrderData.shippingAddress.address}, ${tempOrderData.shippingAddress.locality}, ${tempOrderData.shippingAddress.city}, ${tempOrderData.shippingAddress.state} - ${tempOrderData.shippingAddress.pincode}`,
          userId: user.uid,
          subtotal: tempOrderData.subtotal,
          deliveryCharge: tempOrderData.deliveryCharge,
          total: tempOrderData.total,
        },
        theme: { color: '#0d6efd' },
        handler: async (response) => {
          try {
            const verifyRazorpayPayment = httpsCallable(functions, 'verifyRazorpayPayment');
            const verifyResult = await verifyRazorpayPayment({
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            });
            if (verifyResult.data.success) setError('Payment successful!');
          } catch (err) {
            setError(`Payment verification failed: ${err.message}`);
          }
        },
        modal: { ondismiss: () => setError('Payment not completed.') },
      };

      new window.Razorpay(options).open();
    } catch (err) {
      setError(`Failed to retry payment: ${err.message}`);
    }
  };

  const handleCancelOrder = async (orderId) => {
    try {
      await deleteDoc(doc(firestore, 'temporaryOrders', orderId));
      setError('Order cancelled successfully.');
    } catch (err) {
      setError(`Failed to cancel order: ${err.message}`);
    }
  };

  const renderOrders = (orderList) => (
    <div className="d-flex flex-column gap-3">
      {orderList.length === 0 ? (
        <p className="text-muted text-center">No orders found.</p>
      ) : (
        orderList.map((order) => (
          <Card key={order.id} className="shadow-sm border-0">
            <Card.Body>
              <Row>
                <Col xs={8}>
                  <strong>Order ID:</strong> {order.id}
                </Col>
                <Col xs={4} className="text-end">
                  <Badge bg={order.paymentStatus === 'Completed' ? 'success' : 'warning'}>
                    {order.paymentStatus === 'Completed' ? order.status : order.paymentStatus}
                  </Badge>
                </Col>
              </Row>
              <div className="text-muted">Placed on {order.date}</div>
              {order.isPending && <Alert variant="warning">Awaiting payment confirmation.</Alert>}
              <ul>
                {order.items.map((item, idx) => (
                  <li key={idx}>
                    {item.type === 'poster' ? (
                      `${item.name} (${item.size}) × ${item.quantity} - ₹${(item.price * item.quantity).toLocaleString('en-IN')}`
                    ) : (
                      <>
                        Collection: {item.name} × {item.quantity} (Discount: {item.collectionDiscount}%)
                        <ul>
                          {item.posters.map((poster, i) => (
                            <li key={i}>
                              - {poster.name} ({poster.size}) - ₹{poster.price.toLocaleString('en-IN')}
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </li>
                ))}
              </ul>
              <div><strong>Total:</strong> {order.total}</div>
              {order.shippingAddress && (
                <div>
                  <strong>Shipping Address:</strong> {order.shippingAddress.name}, {order.shippingAddress.address}, {order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.pincode}
                </div>
              )}
              <div><strong>Payment:</strong> {order.paymentStatus} via {order.paymentMethod}</div>
              {order.isPending && (
                <div>
                  {order.paymentStatus === 'Failed' && (
                    <Button onClick={() => handleRetryPayment(order.id)}>Retry Payment</Button>
                  )}
                  <Button variant="outline-danger" onClick={() => handleCancelOrder(order.id)}>Cancel Order</Button>
                </div>
              )}
            </Card.Body>
          </Card>
        ))
      )}
    </div>
  );

  if (loading) return <Spinner animation="border" />;
  if (error) return <Alert variant="danger">{error}</Alert>;

  return (
    <Container>
      <Row>
        <Col><h2>My Orders</h2></Col>
        <Col className="text-end">
          <Button onClick={() => setLoading(true)}>Refresh</Button>
        </Col>
      </Row>
      <Tabs defaultActiveKey="all">
        <Tab eventKey="all" title="All Orders">{renderOrders(orders)}</Tab>
        <Tab eventKey="pending" title="Pending Payment">{renderOrders(orders.filter((order) => order.isPending))}</Tab>
        <Tab eventKey="confirmed" title="Confirmed Orders">{renderOrders(orders.filter((order) => !order.isPending))}</Tab>
      </Tabs>
    </Container>
  );
}