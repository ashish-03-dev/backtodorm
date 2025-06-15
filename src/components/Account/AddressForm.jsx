import React, { useState } from "react";

export default function AddressForm({ fetchAddresses, addAddress, setShowForm }) {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    pincode: "",
    locality: "",
    address: "",
    district: "",
    state: "",
    landmark: "",
  });

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async () => {
    await addAddress(formData);
    setFormData({
      name: "", phone: "", pincode: "", locality: "", address: "",
      district: "", state: "", landmark: ""
    });
    setShowForm(false);
    fetchAddresses();
  };

  return (
    <>
      <div className="card p-4 mb-3">
        <div className="row g-3">
          {/* Name and Phone */}
          <div className="col-12 col-md-6">
            <input
              className="form-control"
              name="name"
              placeholder="Name"
              value={formData.name}
              onChange={handleChange}
            />
          </div>
          <div className="col-12 col-md-6">
            <input
              className="form-control"
              name="phone"
              placeholder="10-digit Mobile Number"
              value={formData.phone}
              onChange={handleChange}
            />
          </div>

          {/* Pincode and Locality */}
          <div className="col-12 col-md-6">
            <input
              className="form-control"
              name="pincode"
              placeholder="Pincode"
              value={formData.pincode}
              onChange={handleChange}
            />
          </div>
          <div className="col-12 col-md-6">
            <input
              className="form-control"
              name="locality"
              placeholder="Locality"
              value={formData.locality}
              onChange={handleChange}
            />
          </div>

          {/* Address */}
          <div className="col-12">
            <textarea
              className="form-control"
              name="address"
              placeholder="Address (area & street)"
              value={formData.address}
              onChange={handleChange}
              rows={2}
            />
          </div>

          {/* District and State */}
          <div className="col-12 col-md-6">
            <input
              className="form-control"
              name="district"
              placeholder="District / City / Town"
              value={formData.district}
              onChange={handleChange}
            />
          </div>
          <div className="col-12 col-md-6">
            <select
              className="form-control"
              name="state"
              value={formData.state}
              onChange={handleChange}
            >
              <option value="">Select State</option>
              {[
                "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
                "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
                "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
                "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan",
                "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
                "Uttarakhand", "West Bengal"
              ].map((state) => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
          </div>

          {/* Landmark */}
          <div className="col-12">
            <input
              className="form-control"
              name="landmark"
              placeholder="Landmark (optional)"
              value={formData.landmark}
              onChange={handleChange}
            />
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="mt-3 d-flex gap-2">
        <button className="btn btn-primary" onClick={handleSubmit}>Save Address</button>
        <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
      </div>
    </>
  );
}
