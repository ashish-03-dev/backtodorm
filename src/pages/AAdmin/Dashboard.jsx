import React, { useEffect, useState } from 'react';
import { useFirebase } from '../../context/FirebaseContext';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const Dashboard = () => {
  const { firestore } = useFirebase();
  const [metrics, setMetrics] = useState([
    { label: "Total Orders", value: 0, icon: "bi-bag-fill", color: "primary" },
    { label: "Order Status", value: { pending: 0, sent: 0, delivered: 0 }, icon: "bi-hourglass-split", color: "warning" },
    { label: "Total Revenue", value: "₹0", icon: "bi-currency-rupee", color: "success" },
    { label: "Active Sellers", value: 0, icon: "bi-person-badge", color: "info" },
    { label: "Total Posters", value: 0, icon: "bi-image", color: "secondary" },
    { label: "Support Tickets", value: { open: 0, resolved: 0 }, icon: "bi-life-preserver", color: "danger" },
  ]);

  const activityLogs = [
    "🛒 Order #2345 placed by @user123",
    "🎨 New poster uploaded by @seller45",
    "📬 Support ticket #678 resolved",
    "🙋‍♂️ New seller signup: @creative_store",
  ];

  const notifications = [
    "🔔 New seller @dreamdesigns signed up",
    "🚨 Complaint received for Order #2299",
    "📢 Promo banner expiring tomorrow",
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch Orders
        const ordersSnapshot = await getDocs(collection(firestore, 'orders'));
        const totalOrders = ordersSnapshot.size;
        let pendingOrders = 0;
        let sentOrders = 0;
        let deliveredOrders = 0;
        let totalRevenue = 0;

        ordersSnapshot.forEach(doc => {
          const order = doc.data();
          if (order.sentToSupplier === false) {
            pendingOrders += 1;
          } else if (order.sentToSupplier === true && order.status !== 'delivered') {
            sentOrders += 1;
          }
          if (order.status === 'delivered') {
            deliveredOrders += 1;
            totalRevenue += order.totalPrice || 0;
          }
        });

        // Fetch Sellers
        const sellersSnapshot = await getDocs(collection(firestore, 'sellers'));
        const totalSellers = sellersSnapshot.size;

        // Fetch Posters
        const postersSnapshot = await getDocs(collection(firestore, 'posters'));
        const totalPosters = postersSnapshot.size;

        // Fetch Support Tickets
        const ticketsSnapshot = await getDocs(collection(firestore, 'supportTickets'));
        let openTickets = 0;
        let resolvedTickets = 0;
        ticketsSnapshot.forEach(doc => {
          if (doc.data().status === 'open') {
            openTickets += 1;
          } else if (doc.data().status === 'resolved') {
            resolvedTickets += 1;
          }
        });

        // Update metrics
        setMetrics([
          { label: "Total Orders", value: totalOrders, icon: "bi-bag-fill", color: "primary" },
          {
            label: "Order Status",
            value: { pending: pendingOrders, sent: sentOrders, delivered: deliveredOrders },
            icon: "bi-hourglass-split",
            color: "warning"
          },
          {
            label: "Total Revenue",
            value: `₹${(totalRevenue / 100000).toFixed(1)}L`,
            icon: "bi-currency-rupee",
            color: "success"
          },
          { label: "Active Sellers", value: totalSellers, icon: "bi-person-badge", color: "info" },
          { label: "Total Posters", value: totalPosters, icon: "bi-image", color: "secondary" },
          {
            label: "Support Tickets",
            value: { open: openTickets, resolved: resolvedTickets },
            icon: "bi-life-preserver",
            color: "danger"
          },
        ]);
      } catch (error) {
        console.error("Error fetching data: ", error);
      }
    };

    fetchData();
  }, [firestore]);

  return (
    <div className="p-4 p-md-5">
      <h3 className="mb-4">📊 Dashboard Overview</h3>

      {/* Metrics */}
      <div className="row">
        {metrics.map((metric, index) => (
          <div className="col-md-4 mb-4" key={index}>
            <div className={`card border-${metric.color} shadow-sm`}>
              <div className="card-body d-flex align-items-center">
                <i className={`bi ${metric.icon} text-${metric.color} fs-3 me-3`}></i>
                <div>
                  <div className="text-muted small">{metric.label}</div>
                  <div className="fw-bold fs-5">
                    {metric.label === "Order Status" ? (
                      `${metric.value.pending}/${metric.value.sent}/${metric.value.delivered}`
                    ) : metric.label === "Support Tickets" ? (
                      `${metric.value.open}/${metric.value.resolved}`
                    ) : (
                      metric.value
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Activity and Notifications */}
      <div className="row mt-4">
        {/* Activity Logs */}
        <div className="col-md-6 mb-4">
          <div className="card shadow-sm">
            <div className="card-header fw-semibold">📅 Recent Activity Logs</div>
            <ul className="list-group list-group-flush">
              {activityLogs.map((log, index) => (
                <li key={index} className="list-group-item small text-muted">{log}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Notifications */}
        <div className="col-md-6 mb-4">
          <div className="card shadow-sm">
            <div className="card-header fw-semibold">🔔 Notifications</div>
            <ul className="list-group list-group-flush">
              {notifications.map((note, index) => (
                <li key={index} className="list-group-item small text-muted">{note}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;