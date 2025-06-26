import { lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import HomeLayout from './pages/HomeLayout';
import Policies from "./components/Policies";
import MainLanding from './components/Home/MainLanding';
import CollectionDetail from './components/Collections/CollectionsDetail';
import SingleCollection from './components/Collections/SingleCollection';
import Poster from './components/Collections/Poster';
import Checkout from './components/Checkout';
import ProtectedRoute from './routes/ProtectedRoute';
import Login from './pages/Login';
import SearchPage from './components/SearchPage';
import HelpCentre from "./components/Account/HelpCentre";

import AccountLayout from './components/Account/AccountLayout';
import ProfileInfo from './components/Account/ProfileInfo';
import ProfileOrders from './components/Account/ProfileOrders';
import ProfileAddresses from './components/Account/ProfileAddresses';
import SecuritySettings from './components/Account/SecuritySettings';
import BecomeSeller from './components/Account/BecomeSeller';


const AdminLayout = lazy(() => import('./pages/AAdmin/AdminLayout'));
const Dashboard = lazy(() => import('./pages/AAdmin/Dashboard'));
const Orders = lazy(() => import('./pages/AAdmin/Orders/index'));
const SectionManager = lazy(() => import('./pages/AAdmin/HomeContentManager/SectionManager'));
const Sellers = lazy(() => import('./pages/AAdmin/Sellers'));
const Posters = lazy(() => import('./pages/AAdmin/Posters/Posters'));
const PosterApprovals = lazy(() => import('./pages/AAdmin/PosterApprovals'));
const Users = lazy(() => import('./pages/AAdmin/Users'));
const Settings = lazy(() => import('./pages/AAdmin/SiteSettings'));
const AdminUsers = lazy(() => import('./pages/AAdmin/AdminUsers'));
const Support = lazy(() => import('./pages/AAdmin/Support'));

const SellerLayout = lazy(() => import('./components/Seller/SellerLayout'));
const SellerDashboard = lazy(() => import('./components/Seller/SellerDashboard'));
const MyProducts = lazy(() => import('./components/Seller/MyProducts'));
const SalesHistory = lazy(() => import('./components/Seller/SalesHistory'));
const Payouts = lazy(() => import('./components/Seller/Payouts'));
const SellerSettings = lazy(() => import('./components/Seller/SellerSettings'));

function App() {

  return (
    <Router>
      <Suspense fallback={<div>Loading...</div>}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/privacy-policy" element={<Policies />} />
          <Route path="/terms-and-conditions" element={<Policies />} />
          <Route path="/return-policy" element={<Policies />} />
          <Route path="/" element={<HomeLayout />}>
            <Route index element={<MainLanding />} />
            <Route path="collections/:collectionId" element={<CollectionDetail />} />
            <Route path="collection/:collectionId" element={<SingleCollection />} />
            <Route path="poster/:id" element={<Poster />} />
            <Route path="checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
            <Route path="account" element={<ProtectedRoute><AccountLayout /></ProtectedRoute>}>
              <Route index element={<ProfileInfo />} />
              <Route path="profile" element={<ProfileInfo />} />
              <Route path="orders" element={<ProfileOrders />} />
              <Route path="addresses" element={<ProfileAddresses />} />
              <Route path="security" element={<SecuritySettings />} />
              <Route path="become-seller" element={<BecomeSeller />} />
              <Route path="help-centre" element={<HelpCentre />} />
            </Route>
            <Route path="seller" element={<ProtectedRoute><SellerLayout /></ProtectedRoute>}>
              <Route index element={<SellerDashboard />} />
              <Route path="dashboard" element={<SellerDashboard />} />
              <Route path="products" element={<MyProducts />} />
              <Route path="sales" element={<SalesHistory />} />
              <Route path="payouts" element={<Payouts />} />
              <Route path="settings" element={<SellerSettings />} />
            </Route>
            <Route path="/search" element={<SearchPage />} />
          </Route>
          <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute >} >
            <Route index element={<Dashboard />} />
            <Route path="orders" element={<Orders />} />
            <Route path="home-content" element={<SectionManager />} />
            <Route path="sellers" element={<Sellers />} />
            <Route path="posters" element={<Posters />} />
            <Route path="poster-approvals" element={<PosterApprovals />} />
            <Route path="users" element={<Users />} />
            <Route path="settings" element={<Settings />} />
            <Route path="admin-users" element={<AdminUsers />} />
            <Route path="support" element={<Support />} />
          </Route>
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;