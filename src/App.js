import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import HomeLayout from './pages/HomeLayout';
import MainLanding from './pages/MainLanding';
import CollectionDetail from './components/Collections/CollectionsDetail';
import CategoryCollectionsPage from './components/Collections/CategoryCollectionPage';
import SingleCollection from './components/Collections/SingleCollection';
import Poster from './components/Collections/Poster';
import Checkout from './pages/Checkout';
import ProtectedRoute from './routes/ProtectedRoute';
import Login from './pages/Login';
import AdminLayout from './pages/AAdmin/AdminLayout';
import Dashboard from "./pages/AAdmin/Dashboard";
import Orders from "./pages/AAdmin/Orders";
import Sellers from "./pages/AAdmin/Sellers";
import Posters from "./pages/AAdmin/Posters/Posters";
import Customers from "./pages/AAdmin/Customers";
import Support from "./pages/AAdmin/Support";
import Settings from "./pages/AAdmin/SiteSettings";
import CategoryManager from "./pages/AAdmin/ContentManager";
import AdminUsers from "./pages/AAdmin/AdminUsers";
import HomeContentManager from "./pages/AAdmin/HomeContentManager";
import AccountLayout from './components/Account/AccountLayout';
import ProfileInfo from './components/Account/ProfileInfo';
import ProfileOrders from './components/Account/ProfileOrders';
import ProfileAddresses from './components/Account/ProfileAddresses';
import SecuritySettings from './components/Account/SecuritySettings';
import Wishlist from './components/Wishlist';
import BecomeSeller from './components/Account/BecomeSeller';
import SellerDashboard from './components/SellerDashboard';
import SearchPage from './components/SearchPage';

function App() {

  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomeLayout />}>
          <Route index element={<MainLanding />} />
          <Route path="collections/:categoryType/:collectionId" element={<CollectionDetail />} />
          <Route path="collections/:categoryType" element={<CategoryCollectionsPage />} />
          <Route path="collection/:collectionId" element={<SingleCollection />} />
          <Route path="poster/:id" element={<Poster />} />
          <Route path="checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
          <Route path="account" element={<AccountLayout />}>
            <Route index element={<ProfileInfo />} />
            <Route path="profile" element={<ProfileInfo />} />
            <Route path="orders" element={<ProfileOrders />} />
            <Route path="addresses" element={<ProfileAddresses />} />
            <Route path="security" element={<SecuritySettings />} />
            <Route path="become-seller" element={<BecomeSeller />} />
          </Route>
          <Route path="/seller-dashboard" element={<SellerDashboard />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/wishlist" element={<Wishlist />} />
        </Route>
        <Route path="/login" element={<Login />} />
        <Route path="/admin" element={<AdminLayout />} >
          <Route index element={<Dashboard />} />
          <Route path="orders" element={<Orders />} />
          <Route path="sellers" element={<Sellers />} />
          <Route path="posters" element={<Posters />} />
          <Route path="home-content" element={<HomeContentManager />} />
          <Route path="customers" element={<Customers />} />
          <Route path="support" element={<Support />} />
          <Route path="settings" element={<Settings />} />
          <Route path="category-manager" element={<CategoryManager />} />
          <Route path="users" element={<AdminUsers />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;