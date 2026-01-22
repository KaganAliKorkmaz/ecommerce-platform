import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Homepage from "./pages/Homepage";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Products from "./pages/Products";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Shipping from "./pages/Shipping";
import Payment from "./pages/Payment";
import NavigationBar from "./components/Navbar";
import Footer from "./components/Footer";
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import Review from './pages/Review';
import OrderSuccess from './pages/OrderSuccess';
import Profile from './pages/Profile';
import Orders from './pages/Orders';
import ReviewApproval from './pages/ProductManager/ReviewApproval';
import OrderProcessing from './pages/ProductManager/OrderProcessing';
import ProductManagement from './pages/ProductManager/ProductManagement';
import ProductDetails from './components/shopping/ProductDetails';
import ProtectedRoute from './components/ProtectedRoute';
import { setupAxiosInterceptors } from './utils/auth';
import axios from 'axios';
import CheckoutRegister from "./pages/CheckoutRegister";
import Wishlist from './pages/Wishlist';
import ProductApproval from './pages/ProductApproval';
import DiscountManagement from './pages/DiscountManagement';
import RevenueDashboard from './pages/RevenueDashboard';
import NotificationsPage from './pages/NotificationsPage';
import InvoiceManagement from './pages/InvoiceManagement';
import SalesRefundPanel from './pages/SalesRefundPanel';

setupAxiosInterceptors(axios);

function App() {
  useEffect(() => {
    console.log('App mounted, checking auth state');
    console.log('Token in localStorage:', localStorage.getItem('token'));
    console.log('UserData in localStorage:', localStorage.getItem('userData'));
  }, []);

  return (
    <Router>
      <AuthProvider>
        <CartProvider>
          <NavigationBar />
          <main className="min-vh-100">
            <Routes>
              <Route path="/" element={<Homepage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/products" element={<Products />} />
              <Route path="/products/:id" element={<ProductDetails />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/wishlist" element={<ProtectedRoute><Wishlist /></ProtectedRoute>} />
              
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/checkout/register" element={<CheckoutRegister />} />
              <Route path="/checkout/shipping" element={
                <ProtectedRoute>
                  <Shipping />
                </ProtectedRoute>
              } />
              <Route path="/checkout/payment" element={
                <ProtectedRoute>
                  <Payment />
                </ProtectedRoute>
              } />
              <Route path="/checkout/review" element={
                <ProtectedRoute>
                  <Review />
                </ProtectedRoute>
              } />
              
              <Route path="/order-success" element={
                <ProtectedRoute>
                  <OrderSuccess />
                </ProtectedRoute>
              } />
              <Route path="/orders" element={
                <ProtectedRoute>
                  <Orders />
                </ProtectedRoute>
              } />
              <Route path="/notifications" element={
                <ProtectedRoute>
                  <NotificationsPage />
                </ProtectedRoute>
              } />
              <Route path="/admin/review-approval" element={
                <ProtectedRoute requiredRole="product_manager">
                  <ReviewApproval />
                </ProtectedRoute>
              } />
              <Route path="/admin/order-processing" element={
                <ProtectedRoute requiredRole="product_manager">
                  <OrderProcessing />
                </ProtectedRoute>
              } />
              <Route path="/admin/product-management" element={
                <ProtectedRoute requiredRole="product_manager">
                  <ProductManagement />
                </ProtectedRoute>
              } />
              <Route path="/product-approval" element={
                <ProtectedRoute requiredRole="sales_manager">
                  <ProductApproval />
                </ProtectedRoute>
              } />
              <Route path="/discount-management" element={
                <ProtectedRoute requiredRole="sales_manager">
                  <DiscountManagement />
                </ProtectedRoute>
              } />
              <Route path="/revenue-dashboard" element={
                <ProtectedRoute requiredRole="sales_manager">
                  <RevenueDashboard />
                </ProtectedRoute>
              } />
              <Route path="/invoice-management" element={
                <ProtectedRoute requiredRole="sales_manager">
                  <InvoiceManagement />
                </ProtectedRoute>
              } />
              <Route path="/refund-management" element={
                <ProtectedRoute requiredRole="sales_manager">
                  <SalesRefundPanel />
                </ProtectedRoute>
              } />
            </Routes>
          </main>
          <Footer />
        </CartProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
