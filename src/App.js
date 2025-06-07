import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';

import posters from './data/posters';
import Login from "./pages/Login";
import SignupPage from './pages/Signup';

function App() {

  return (
    <Router>
      <Routes>
        <Route path="/*" element={<Home />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/login" element={<Login />} />
      </Routes>
    </Router>
  );
}

export default App;