import { useState } from 'react';
import { useFirebase } from '../../context/FirebaseContext';

export default function SecuritySettings() {
  const { user, deactivateUserAccount, loadingUserData } = useFirebase();
  const [error, setError] = useState(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Handle account deactivation with confirmation
  const handleDeactivate = async () => {
    setError(null);
    setShowConfirmDialog(true); // Show confirmation dialog
  };

  // Confirm account deactivation
  const confirmDeactivate = async () => {
    setShowConfirmDialog(false);
    setError(null);

    try {
      // Deactivate the account (updates Firestore and signs out)
      await deactivateUserAccount();
      setError('Your account has been deactivated successfully. You have been signed out.');
    } catch (err) {
      setError(`Failed to deactivate account: ${err.message}. Please try again or contact support.`);
    }
  };

  // Render loading state
  if (loadingUserData) {
    return <div>Loading...</div>;
  }

  return (
    <div aria-labelledby="security-settings-heading">
      <h4 id="security-settings-heading" className="mb-4">Security Settings</h4>

      {/* Display linked accounts */}
      {user?.providerData.some(p => p.providerId === 'google.com') && (
        <div className="mb-2 text-success" aria-label="Google account linked">
          <strong> Google Account: </strong>{user.email}
        </div>
      )}
      {user?.phoneNumber && (
        <div className="mb-2 text-success" aria-label="Phone number verified">
          <strong> Phone:</strong> {user.phoneNumber}
        </div>
      )}

      <div style={{ minHeight: "22rem" }}></div>

      {user?.metadata?.lastSignInTime && (
        <div className="mb-0" aria-label="Last login time">
          <strong>Last Login:</strong>{' '}
          {new Date(user.metadata.lastSignInTime).toLocaleString('en-US', {
            dateStyle: 'medium',
            timeStyle: 'short',
            timeZone: 'Asia/Kolkata',
          })}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      {/* Deactivate account button */}
      <div className="mt-4 d-flex gap-2 border-top">
        <button
          className="btn btn-outline-danger border-0 mt-2"
          onClick={handleDeactivate}
          disabled={!user}
          aria-label="Deactivate account"
        >
          Deactivate Account
        </button>
      </div>

      {/* Overlay for modal */}
      {showConfirmDialog && (
        <div
          className="modal-backdrop fade show"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 1040,
          }}
          onClick={() => setShowConfirmDialog(false)}
          aria-hidden="true"
        />
      )}

      {/* Confirmation dialog */}
      {showConfirmDialog && (
        <div className="modal" style={{ display: 'block', zIndex: 1050 }} role="dialog" aria-labelledby="confirm-dialog-title">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 id="confirm-dialog-title" className="modal-title">Confirm Account Deactivation</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowConfirmDialog(false)}
                  aria-label="Close"
                ></button>
              </div>
              <div className="modal-body">
                Are you sure you want to deactivate your account? You can reactivate it later by logging in again.
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowConfirmDialog(false)}
                  aria-label="Cancel deactivation"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={confirmDeactivate}
                  aria-label="Confirm deactivation"
                >
                  Deactivate
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}