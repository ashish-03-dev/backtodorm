import React, { useState } from "react";

const initialState = {
  name: "",
  phone: "",
  pincode: "",
  locality: "",
  address: "",
  city: "",
  state: "",
  landmark: "",
};

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
      <div className="card p-3 mb-3">
        <div className="row g-2">
          <div className="col-md-6">
            <input className="form-control" name="name" placeholder="Name" value={formData.name} onChange={handleChange} />
          </div>
          <div className="col-md-6">
            <input className="form-control" name="phone" placeholder="10-digit Mobile Number" value={formData.phone} onChange={handleChange} />
          </div>

          <div className="col-md-6">
            <input className="form-control" name="pincode" placeholder="Pincode" value={formData.pincode} onChange={handleChange} />
          </div>
          <div className="col-md-6">
            <input className="form-control" name="locality" placeholder="Locality" value={formData.locality} onChange={handleChange} />
          </div>

          <div className="col-12">
            <textarea className="form-control" name="address" placeholder="Address (area & street)" value={formData.address} onChange={handleChange} rows={2} />
          </div>

          <div className="col-md-6">
            <input className="form-control" name="district" placeholder="District / City / Town" value={formData.district} onChange={handleChange} />
          </div>
          <div className="col-md-6">
            <select className="form-control" name="state" value={formData.state} onChange={handleChange}>
              <option value="">Select State</option>
              <option value="Andhra Pradesh">Andhra Pradesh</option>
              <option value="Arunachal Pradesh">Arunachal Pradesh</option>
              <option value="Assam">Assam</option>
              <option value="Bihar">Bihar</option>
              <option value="Chhattisgarh">Chhattisgarh</option>
              <option value="Delhi">Delhi</option>
              <option value="Goa">Goa</option>
              <option value="Gujarat">Gujarat</option>
              <option value="Haryana">Haryana</option>
              <option value="Himachal Pradesh">Himachal Pradesh</option>
              <option value="Jharkhand">Jharkhand</option>
              <option value="Karnataka">Karnataka</option>
              <option value="Kerala">Kerala</option>
              <option value="Madhya Pradesh">Madhya Pradesh</option>
              <option value="Maharashtra">Maharashtra</option>
              <option value="Manipur">Manipur</option>
              <option value="Meghalaya">Meghalaya</option>
              <option value="Mizoram">Mizoram</option>
              <option value="Nagaland">Nagaland</option>
              <option value="Odisha">Odisha</option>
              <option value="Punjab">Punjab</option>
              <option value="Rajasthan">Rajasthan</option>
              <option value="Sikkim">Sikkim</option>
              <option value="Tamil Nadu">Tamil Nadu</option>
              <option value="Telangana">Telangana</option>
              <option value="Tripura">Tripura</option>
              <option value="Uttar Pradesh">Uttar Pradesh</option>
              <option value="Uttarakhand">Uttarakhand</option>
              <option value="West Bengal">West Bengal</option>
            </select>
          </div>

          <div className="col-12">
            <input className="form-control" name="landmark" placeholder="Landmark (optional)" value={formData.landmark} onChange={handleChange} />
          </div>
        </div>

        <div className="mt-3 d-flex gap-2">
          <button className="btn btn-primary" onClick={handleSubmit}>Save Address</button>
          <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
        </div>
      </div>
    </>
  );
}
