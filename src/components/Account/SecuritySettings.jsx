import { useFirebase } from '../../context/FirebaseContext';

export default function SecuritySettings() {
  const { user, deleteUserAccount, setUpRecaptcha } = useFirebase();

  const getLoginProvider = (user) => {
    if (!user) return null;

    const providerId = user.providerData[0]?.providerId;

    if (providerId === "google.com") return "google";
    if (providerId === "phone") return "phone";

    return "unknown";
  };

  const handleDelete = async () => {
    deleteUserAccount(setUpRecaptcha);
  };

  return (
    <div>
      <h4 className="mb-4">Security Settings</h4>

      {user?.providerData.some(p => p.providerId === "google.com") && (
        <div className="mb-2 text-success">✅ Google Account Linked</div>
      )}

      {user?.phoneNumber && (
        <div className="mb-2 text-success">✅ Phone Number Verified</div>
      )}

      <div className="mb-4 ms-1">
        <strong>Last Login:</strong> {new Date(user?.metadata?.lastSignInTime).toLocaleString()}
      </div>

      <div className="mt-4 d-flex gap-2 border-top">
        <button className="btn btn-outline-danger border-0 mt-3"
          onClick={handleDelete}
        >Delete Account</button>
      </div>

      <div id="recaptcha-container" />
    </div>

  );
}