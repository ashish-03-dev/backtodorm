import React, { useState, Suspense } from "react";
import { Modal, Spinner, Alert, Nav, Tab } from "react-bootstrap";
import { useOutletContext } from "react-router-dom";
import { lazy } from "react";

const PosterTable = lazy(() => import("./PosterTable"));
const PosterView = lazy(() => import("./PosterView"));

export default function MyProducts() {
  const {
    posters,
    loading,
    error,
    setError,
    viewingPoster,
    setViewingPoster,
    handleViewPoster,
    handleDeletePoster,
  } = useOutletContext();
  const [activeTab, setActiveTab] = useState("pending");

  if (loading) {
    return (
      <div
        className="d-flex flex-column justify-content-center align-items-center"
        style={{ minHeight: "100%" }}
      >
        <p className="mt-2 text-muted">Loading Posters...</p>
      </div>
    );
  }

  const pendingPosters = posters.filter((p) => p.status === "pending");
  const approvedPosters = posters.filter((p) => p.status === "approved");
  const rejectedPosters = posters.filter((p) => p.status === "rejected");

  return (
    <div className="p-4 p-md-5">
      <h4 className="mb-4">My Products</h4>
      {error && (
        <Alert variant="danger" onClose={() => setError("")} dismissible>
          {error}
        </Alert>
      )}

      <Tab.Container activeKey={activeTab} onSelect={(k) => setActiveTab(k)}>
        <Nav variant="tabs" className="mb-3">
          <Nav.Item>
            <Nav.Link eventKey="pending">Pending ({pendingPosters.length})</Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="approved">Approved ({approvedPosters.length})</Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="rejected">Rejected ({rejectedPosters.length})</Nav.Link>
          </Nav.Item>
        </Nav>
        <Tab.Content>
          <Tab.Pane eventKey="pending">
            <Suspense fallback={<Spinner animation="border" className="d-block mx-auto my-3" />}>
              <PosterTable
                posters={pendingPosters}
                onView={handleViewPoster}
                onDelete={handleDeletePoster}
              />
            </Suspense>
          </Tab.Pane>
          <Tab.Pane eventKey="approved">
            <Suspense fallback={<Spinner animation="border" className="d-block mx-auto my-3" />}>
              <PosterTable
                posters={approvedPosters}
                onView={handleViewPoster}
                onDelete={handleDeletePoster}
              />
            </Suspense>
          </Tab.Pane>
          <Tab.Pane eventKey="rejected">
            <Suspense fallback={<Spinner animation="border" className="d-block mx-auto my-3" />}>
              <PosterTable
                posters={rejectedPosters}
                onView={handleViewPoster}
                onDelete={handleDeletePoster}
              />
            </Suspense>
          </Tab.Pane>
        </Tab.Content>
      </Tab.Container>

      <Modal show={!!viewingPoster} onHide={() => setViewingPoster(null)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Poster Preview</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Suspense fallback={<Spinner animation="border" className="d-block mx-auto my-3" />}>
            {viewingPoster ? (
              <PosterView poster={viewingPoster} />
            ) : (
              <Alert variant="warning">No poster selected.</Alert>
            )}
          </Suspense>
        </Modal.Body>
      </Modal>
    </div>
  );
}