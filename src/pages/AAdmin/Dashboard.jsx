import React from 'react';

const Dashboard = () => {
  const metrics = [
    { label: "Total Orders", value: 1240, icon: "bi-bag-fill", color: "primary" },
    { label: "Pending Orders", value: 37, icon: "bi-hourglass-split", color: "warning" },
    { label: "Total Revenue", value: "₹1.5L", icon: "bi-currency-rupee", color: "success" },
    { label: "Active Sellers", value: 18, icon: "bi-person-badge", color: "info" },
    { label: "Total Posters", value: 860, icon: "bi-image", color: "secondary" },
    { label: "Support Tickets", value: "5 Open / 12 Resolved", icon: "bi-life-preserver", color: "danger" },
  ];

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

  return (
    <div className="container mt-4">
      <h1 className="mb-4">📊 Dashboard Overview</h1>

      {/* Metrics */}
      <div className="row">
        {metrics.map((metric, index) => (
          <div className="col-md-4 mb-4" key={index}>
            <div className={`card border-${metric.color} shadow-sm`}>
              <div className="card-body d-flex align-items-center">
                <i className={`bi ${metric.icon} text-${metric.color} fs-3 me-3`}></i>
                <div>
                  <div className="text-muted small">{metric.label}</div>
                  <div className="fw-bold fs-5">{metric.value}</div>
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
