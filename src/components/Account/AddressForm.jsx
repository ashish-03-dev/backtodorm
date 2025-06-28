import React, { useState, useEffect } from 'react';
import { Alert, InputGroup } from 'react-bootstrap';

export default function AddressForm({
  fetchAddresses,
  addAddress,
  setShowForm,
  initialData,
  isEditMode,
  onSubmit,
  onCancel,
}) {
  const [formData, setFormData] = useState(
    initialData || {
      name: '',
      phone: '',
      pincode: '',
      locality: '',
      address: '',
      city: '',
      state: '',
      landmark: '',
    }
  );
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        phone: initialData.phone.replace(/^\+91\s?/, ''), // Strip +91 if present
      });
    }
  }, [initialData]);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (
      !formData.name ||
      !formData.phone ||
      !formData.pincode ||
      !formData.locality ||
      !formData.address ||
      !formData.city ||
      !formData.state
    ) {
      setError('Please fill in all required fields.');
      return;
    }
    if (formData.phone.length !== 10 || !/^\d{10}$/.test(formData.phone)) {
      setError('Phone number must be a 10-digit number.');
      return;
    }
    if (formData.pincode.length !== 6 || !/^\d{6}$/.test(formData.pincode)) {
      setError('Pincode must be a 6-digit number.');
      return;
    }

    try {
      const addressData = { ...formData, createdAt: isEditMode ? formData.createdAt : new Date() };
      if (isEditMode && onSubmit) {
        await onSubmit(addressData);
      } else {
        await addAddress(addressData);
        await fetchAddresses();
      }
      setFormData({
        name: '',
        phone: '',
        pincode: '',
        locality: '',
        address: '',
        city: '',
        state: '',
        landmark: '',
      });
      setShowForm(false);
    } catch (err) {
      setError(`Failed to ${isEditMode ? 'update' : 'add'} address: ${err.message}`);
    }
  };

  return (
    <div className="card p-4">
      <h5 className="mb-3">{isEditMode ? 'Edit Address' : 'Add New Address'}</h5>
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      <form onSubmit={handleSubmit}>
        <div className="row g-3">
          {/* Name and Phone */}
          <div className="col-12 col-md-6">
            <input
              className="form-control"
              name="name"
              placeholder="Name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>
          <div className="col-12 col-md-6">
            <InputGroup>
              <InputGroup.Text>+91</InputGroup.Text>
              <input
                className="form-control"
                name="phone"
                placeholder="10-digit Mobile Number"
                value={formData.phone}
                onChange={handleChange}
                required
                maxLength={10}
                type="tel"
              />
            </InputGroup>
          </div>

          {/* Pincode and Locality */}
          <div className="col-12 col-md-6">
            <input
              className="form-control"
              name="pincode"
              placeholder="Pincode"
              value={formData.pincode}
              onChange={handleChange}
              required
              maxLength={6}
            />
          </div>
          <div className="col-12 col-md-6">
            <input
              className="form-control"
              name="locality"
              placeholder="Locality"
              value={formData.locality}
              onChange={handleChange}
              required
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
              required
            />
          </div>

          {/* City and State */}
          <div className="col-12 col-md-6">
            <input
              className="form-control"
              name="city"
              placeholder="District / City / Town"
              value={formData.city}
              onChange={handleChange}
              required
            />
          </div>
          <div className="col-12 col-md-6">
            <select
              className="form-control"
              name="state"
              value={formData.state}
              onChange={handleChange}
              required
            >
              <option value="">Select State</option>
              {[
                'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
                'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
                'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
                'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan',
                'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh',
                'Uttarakhand', 'West Bengal',
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

        {/* Buttons */}
        <div className="mt-3 d-flex gap-2">
          <button type="submit" className="btn btn-primary">
            {isEditMode ? 'Update Address' : 'Save Address'}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onCancel || (() => setShowForm(false))}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}