import React, { useState } from "react";
import {
  Table,
  Modal,
  Button,
  Form,
  Badge,
  Dropdown,
  Alert,
} from "react-bootstrap";

const defaultRoles = {
  "Super Admin": ["All Access"],
  "Product Manager": ["Add/Edit Posters", "Manage Stock"],
  "Order Manager": ["View/Forward Orders", "Update Status"],
  "Support Agent": ["Manage Complaints"],
};

const AdminUsers = () => {
  const [admins, setAdmins] = useState([
    {
      id: 1,
      name: "Ashish Kumar",
      email: "ashish03.dev@gmail.com",
      role: "Super Admin",
      active: true,
    },
    {
      id: 2,
      name: "Priya Mehta",
      email: "priya@posterstore.com",
      role: "Order Manager",
      active: true,
    },
  ]);

  const [showModal, setShowModal] = useState(false);
  const [currentAdmin, setCurrentAdmin] = useState(null);
  const [newAdmin, setNewAdmin] = useState({
    name: "",
    email: "",
    role: "Order Manager",
  });

  const [successMsg, setSuccessMsg] = useState("");

  const handleOpenModal = (admin) => {
    setCurrentAdmin(admin);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setCurrentAdmin(null);
  };

  const handleToggleActive = (id) => {
    setAdmins((prev) =>
      prev.map((admin) =>
        admin.id === id ? { ...admin, active: !admin.active } : admin
      )
    );
  };

  const handleAddAdmin = () => {
    const id = Date.now();
    setAdmins((prev) => [...prev, { ...newAdmin, id, active: true }]);
    setNewAdmin({ name: "", email: "", role: "Order Manager" });
    setSuccessMsg("New admin added successfully!");
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  const handleRoleChange = (id, role) => {
    setAdmins((prev) =>
      prev.map((admin) => (admin.id === id ? { ...admin, role } : admin))
    );
  };

  return (
    <div className="container mt-4">
      <h2>👥 Admin Users & Roles</h2>

      {successMsg && <Alert variant="success">{successMsg}</Alert>}

      <h5 className="mt-4 mb-2">➕ Add New Admin</h5>
      <Form className="mb-4">
        <div className="row">
          <div className="col-md-3">
            <Form.Control
              type="text"
              placeholder="Name"
              value={newAdmin.name}
              onChange={(e) =>
                setNewAdmin({ ...newAdmin, name: e.target.value })
              }
            />
          </div>
          <div className="col-md-3">
            <Form.Control
              type="email"
              placeholder="Email"
              value={newAdmin.email}
              onChange={(e) =>
                setNewAdmin({ ...newAdmin, email: e.target.value })
              }
            />
          </div>
          <div className="col-md-3">
            <Form.Select
              value={newAdmin.role}
              onChange={(e) =>
                setNewAdmin({ ...newAdmin, role: e.target.value })
              }
            >
              {Object.keys(defaultRoles).map((role) => (
                <option key={role}>{role}</option>
              ))}
            </Form.Select>
          </div>
          <div className="col-md-3">
            <Button onClick={handleAddAdmin}>Add Admin</Button>
          </div>
        </div>
      </Form>

      <Table bordered hover responsive>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Status</th>
            <th>Permissions</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {admins.map((admin) => (
            <tr key={admin.id}>
              <td>{admin.name}</td>
              <td>{admin.email}</td>
              <td>
                <Dropdown>
                  <Dropdown.Toggle variant="secondary" size="sm">
                    {admin.role}
                  </Dropdown.Toggle>
                  <Dropdown.Menu>
                    {Object.keys(defaultRoles).map((role) => (
                      <Dropdown.Item
                        key={role}
                        onClick={() => handleRoleChange(admin.id, role)}
                      >
                        {role}
                      </Dropdown.Item>
                    ))}
                  </Dropdown.Menu>
                </Dropdown>
              </td>
              <td>
                <Badge
                  bg={admin.active ? "success" : "secondary"}
                  style={{ cursor: "pointer" }}
                  onClick={() => handleToggleActive(admin.id)}
                >
                  {admin.active ? "Active" : "Suspended"}
                </Badge>
              </td>
              <td>
                <Button
                  variant="info"
                  size="sm"
                  onClick={() => handleOpenModal(admin)}
                >
                  View
                </Button>
              </td>
              <td>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() =>
                    setAdmins((prev) =>
                      prev.filter((a) => a.id !== admin.id)
                    )
                  }
                >
                  Remove
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      {/* Modal for permissions */}
      <Modal show={showModal} onHide={handleCloseModal}>
        <Modal.Header closeButton>
          <Modal.Title>{currentAdmin?.name}'s Permissions</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>
            <strong>Role:</strong> {currentAdmin?.role}
          </p>
          <ul>
            {(defaultRoles[currentAdmin?.role] || []).map((perm, idx) => (
              <li key={idx}>{perm}</li>
            ))}
          </ul>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseModal}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default AdminUsers;
