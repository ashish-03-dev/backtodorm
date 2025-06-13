export default function SecuritySettings() {
  return (
    <div>
      <h4 className="mb-3">Security Settings</h4>
      <div className="mb-3">
        <label className="form-label">Change Password</label>
        <input type="password" className="form-control" placeholder="New Password" />
      </div>
      <button className="btn btn-primary">Update Password</button>
    </div>
  );
}