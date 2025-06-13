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
import AdminPanel from './pages/admin/AdminPanel';
import AddPoster from './pages/admin/AddPoster';
import EditPoster from './pages/admin/EditPoster';
import AccountLayout from './components/Account/AccountLayout';
import ProfileInfo from './components/Account/ProfileInfo';
import ProfileOrders from './components/Account/ProfileOrders';
import ProfileAddresses from './components/Account/ProfileAddresses';
import SecuritySettings from './components/Account/SecuritySettings';

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
          <Route path="profile" element={<AccountLayout />}>
            <Route index element={<ProfileInfo />} />
            <Route path="orders" element={<ProfileOrders />} />
            <Route path="addresses" element={<ProfileAddresses />} />
            <Route path="security" element={<SecuritySettings />} />
          </Route>
        </Route>

        <Route path="/login" element={<Login />} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/admin/add" element={<AddPoster />} />
        <Route path="/admin/edit/:id" element={<EditPoster />} />
      </Routes>
    </Router>
  );
}

export default App;