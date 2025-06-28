import React, { useState, useEffect } from 'react';
import { useFirebase } from '../../context/FirebaseContext';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { Alert, Spinner, Card, Badge, Tabs, Tab, Container, Row, Col } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';

export default function ProfileOrders() {
  const { user, firestore } = useFirebase();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!firestore) {
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
  }, []);

  const renderOrders = (orderList) => (
    <div className="d-flex flex-column gap-4">
      {orderList.length === 0 ? (
        <p className="text-muted ms-3">No Orders Yet.</p>
      ) : (
        orderList.map((order) => (
          <Card
            key={order.id}
            className="shadow-sm border-0 rounded-3 overflow-hidden"
          >
            <Card.Header className="bg-light d-flex justify-content-between align-items-center">
              <div>
                <strong className="fs-6">Order ID:</strong>{' '}
                <span className="text-muted">{order.id}</span>
              </div>
              <Badge
                bg={
                  order.paymentStatus === 'Completed'
                    ? order.status === 'Delivered'
                      ? 'success'
                      : order.status === 'Shipped'
                        ? 'primary'
                        : 'warning'
                    : order.paymentStatus === 'Pending'
                      ? 'warning'
                      : 'danger'
                }
                className="px-3 py-2 fs-6"
              >
                {order.paymentStatus === 'Completed' ? order.status : order.paymentStatus}
              </Badge>
            </Card.Header>
            <Card.Body className="p-4">
              <Row className="mb-3">
                <Col>
                  <div className="text-muted fs-6">
                    <i className="bi bi-calendar me-2"></i>Placed on {order.date}
                  </div>
                </Col>
              </Row>
              {order.isPending && (
                <Alert variant="warning" className="mb-4 py-2">
                  Awaiting payment confirmation.
                </Alert>
              )}
              {!order.isPending && order.paymentStatus === 'Failed' && (
                <Alert variant="danger" className="mb-4 py-2 fw-bold text-center">
                  Payment Failed. Please place a new order or contact support.
                </Alert>
              )}
              <div className="mb-4">
                <h6 className="fw-bold mb-3">Items</h6>
                <ul className="list-unstyled ps-3">
                  {order.items.map((item, idx) => (
                    <li key={idx} className="mb-3">
                      {item.type === 'poster' ? (
                        <div className="d-flex justify-content-between">
                          <span>
                            {item.name} ({item.size}) × {item.quantity}
                          </span>
                          <span>₹{(item.price * item.quantity).toLocaleString('en-IN')}</span>
                        </div>
                      ) : (
                        <>
                          <div className="d-flex justify-content-between">
                            <span>
                              Collection: {item.name} × {item.quantity} (Discount:{' '}
                              {item.collectionDiscount}%)
                            </span>
                            <span></span>
                          </div>
                          <ul className="list-unstyled ps-4 mt-2">
                            {item.posters.map((poster, i) => (
                              <li key={i} className="text-muted">
                                <div className="d-flex justify-content-between">
                                  <span>
                                    - {poster.name} ({poster.size})
                                  </span>
                                  <span>₹{poster.price.toLocaleString('en-IN')}</span>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
              <Row className="mb-3">
                <Col>
                  <strong>Total:</strong> {order.total}
                </Col>
              </Row>
              {order.shippingAddress && (
                <Row className="mb-3">
                  <Col>
                    <strong>Shipping Address:</strong>
                    <p className="text-muted mb-0">
                      {order.shippingAddress.name}, {order.shippingAddress.address},{' '}
                      {order.shippingAddress.locality}, {order.shippingAddress.city},{' '}
                      {order.shippingAddress.state} - {order.shippingAddress.pincode}
                    </p>
                  </Col>
                </Row>
              )}
              <Row className="mb-3">
                <Col>
                  <strong>Payment:</strong> {order.paymentStatus} via {order.paymentMethod}
                </Col>
              </Row>
            </Card.Body>
          </Card>
        ))
      )}
    </div>
  );

  if (loading) return (
    <div className="text-center d-flex align-items-center justify-content-center" style={{ height: "calc(100svh - 65px - 3rem)" }}>
      <p className="mt-2">Loading your orders...</p>
    </div>
  );

  if (error) return <Alert variant="danger" className="w-75 mx-auto mt-5">{error}</Alert>;

  return (
    <Container className="p-4 p-md-5">
      <Row className="align-items-center">
        <Col><h4 className='mb-4'>My Orders</h4></Col>
      </Row>
      <Tabs defaultActiveKey="all" variant="pills" className="mb-4 gap-3">
        <Tab eventKey="all" title="All Orders">{renderOrders(orders)}</Tab>
        <Tab eventKey="pending" title="Pending Payment">{renderOrders(orders.filter((order) => order.isPending))}</Tab>
        <Tab eventKey="confirmed" title="Confirmed Orders">{renderOrders(orders.filter((order) => !order.isPending))}</Tab>
      </Tabs>
    </Container>
  );
}