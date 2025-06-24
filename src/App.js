import Orders from "./pages/AAdmin/Orders";
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import HomeLayout from './pages/HomeLayout';
import MainLanding from './components/Home/MainLanding';
import CollectionDetail from './components/Collections/CollectionsDetail';
import SingleCollection from './components/Collections/SingleCollection';
import Poster from './components/Collections/Poster';
import Checkout from './components/Checkout';
import ProtectedRoute from './routes/ProtectedRoute';
import Login from './pages/Login';
import AdminLayout from './pages/AAdmin/AdminLayout';
import Dashboard from "./pages/AAdmin/Dashboard";
import SectionManager from './pages/AAdmin/HomeContentManager/SectionManager';
import Sellers from "./pages/AAdmin/Sellers";
import Posters from "./pages/AAdmin/Posters/Posters";
import PosterApprovals from "./pages/AAdmin/PosterApprovals";
import Users from "./pages/AAdmin/Users";
import Settings from "./pages/AAdmin/SiteSettings";
import AdminUsers from "./pages/AAdmin/AdminUsers";
import AccountLayout from './components/Account/AccountLayout';
import ProfileInfo from './components/Account/ProfileInfo';
import ProfileOrders from './components/Account/ProfileOrders';
import ProfileAddresses from './components/Account/ProfileAddresses';
import SecuritySettings from './components/Account/SecuritySettings';
import BecomeSeller from './components/Account/BecomeSeller';
import SellerLayout from './components/Seller/SellerLayout';
import SellerDashboard from './components/Seller/SellerDashboard';
import MyProducts from './components/Seller/MyProducts';
import SalesHistory from './components/Seller/SalesHistory';
import Payouts from "./components/Seller/Payouts";
import SellerSettings from "./components/Seller/SellerSettings";
import SearchPage from './components/SearchPage';
import HelpCentre from "./components/Account/HelpCentre";
import AdminSupport from './pages/AAdmin/AdminSupport';

function App() {

  return (
    <Router>
      <Routes>
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
        <Route path="/login" element={<Login />} />
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
          <Route path="support" element={<AdminSupport />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;