import { lazy } from "react";
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import HomeLayout from './pages/HomeLayout';
import Policies from "./components/Policies";
import MainLanding from './components/Home/MainLanding';
import AllPosters from './components/Collections/AllPosters';
import CollectionDetail from './components/Collections/CollectionsDetail';
import SingleCollection from './components/Collections/SingleCollection';
import Poster from './components/Collections/Poster';
import Checkout from './components/Checkout';
import ProtectedRoute from './routes/ProtectedRoute';
import Login from './pages/Login';
import SearchPage from './components/SearchPage';
import HelpCentre from "./components/Account/HelpCentre";
import ScrollManager from './components/ScrollManager';

import AccountLayout from './components/Account/AccountLayout';
import ProfileInfo from './components/Account/ProfileInfo';
import ProfileOrders from './components/Account/ProfileOrders';
import ProfileAddresses from './components/Account/ProfileAddresses';
import SecuritySettings from './components/Account/SecuritySettings';
import CollectionsPacks from "./pages/AAdmin/CollectionsPacks/CollectionsPacks";
import CollectionsPacksPage from "./components/Collections/CollectionsPacksPage";
import CollectionsManager from "./pages/AAdmin/CollectionsManager";

const AdminLayout = lazy(() => import('./pages/AAdmin/AdminLayout'));
const Orders = lazy(() => import('./pages/AAdmin/Orders/index'));
const SectionManager = lazy(() => import('./pages/AAdmin/HomeContentManager/SectionManager'));
const Posters = lazy(() => import('./pages/AAdmin/Posters/Posters'));
const PosterApprovals = lazy(() => import('./pages/AAdmin/PosterApprovals/PosterApprovals'));
const FramesAdmin = lazy(() => import("./pages/AAdmin/Frames/FramesAdmin"));
const Users = lazy(() => import('./pages/AAdmin/Users'));
const Settings = lazy(() => import('./pages/AAdmin/SiteSettings'));
const AdminUsers = lazy(() => import('./pages/AAdmin/AdminUsers'));
const Support = lazy(() => import('./pages/AAdmin/Support'));

function App() {

  return (
    <Router>
      <ScrollManager />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/privacy-policy" element={<Policies />} />
        <Route path="/terms-and-conditions" element={<Policies />} />
        <Route path="/return-policy" element={<Policies />} />
        <Route path="/" element={<HomeLayout />}>
          <Route index element={<MainLanding />} />
          <Route path="all-posters" element={<AllPosters />} />
          <Route path="collections-packs" element={<CollectionsPacksPage />} />
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
            <Route path="help-centre" element={<HelpCentre />} />
          </Route>
          <Route path="/search" element={<SearchPage />} />
        </Route>
        <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute >} >
          <Route path="orders" element={<Orders />} />
          <Route path="home-content" element={<SectionManager />} />
          <Route path="collections" element={<CollectionsManager />} />
          <Route path="collections-packs" element={<CollectionsPacks />} />
          <Route path="posters" element={<Posters />} />
          <Route path="poster-approvals" element={<PosterApprovals />} />
          <Route path="frames" element={<FramesAdmin />} />
          <Route path="users" element={<Users />} />
          <Route path="settings" element={<Settings />} />
          <Route path="admin-users" element={<AdminUsers />} />
          <Route path="support" element={<Support />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;