import React from "react";
import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="bg-light py-4 text-center">
      <div className="container text-muted small">
        <div className="mb-2">
          <Link to="/terms-and-conditions" className="text-dark mx-2">Terms and Conditions</Link>
          <span>|</span>
          <Link to="/privacy-policy" className="text-dark mx-2">Privacy Policy</Link>
          <span>|</span>
          <a href="mailto:ashish03.dev@gmail.com" className="text-dark mx-2">Contact Us</a>
        </div>
        <div>© 2025 Back To Dorm. All rights reserved.</div>
      </div>
    </footer>
  );
}