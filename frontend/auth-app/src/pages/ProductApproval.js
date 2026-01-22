import React, { useState, useEffect } from 'react';
import { Container, Table, Button, Form, Modal, Alert, Badge } from 'react-bootstrap';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config';

const ProductApproval = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [price, setPrice] = useState('');
  const [isApproving, setIsApproving] = useState(false);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (user && user.role === 'sales_manager') {
      fetchAllProductsForSales();
    }
  }, [user]);

  const fetchAllProductsForSales = async () => {
    setLoading(true);
    try {
      // Get the token from localStorage
      const token = localStorage.getItem('token');
      
      if (!token) {
        setError('Authentication token is missing. Please log in again.');
        setLoading(false);
        return;
      }
      
      console.log('Fetching products for sales with token:', token.substring(0, 15) + '...');
      
      // Use the token explicitly for this request
      const response = await axios.get(`${API_BASE_URL}/products/sales`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('Products retrieved:', response.data.length);
      setProducts(response.data);
      setError('');
    } catch (err) {
      console.error('Error fetching products:', err.response?.status, err.response?.data);
      setError(`Failed to fetch products: ${err.response?.data?.error || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSetOrUpdatePrice = async () => {
    if (!selectedProduct || !price || parseFloat(price) <= 0) {
      setError('Invalid price entered.');
      return;
    }
    
    try {
      // Get the token from localStorage
      const token = localStorage.getItem('token');
      
      if (!token) {
        setError('Authentication token is missing. Please log in again.');
        return;
      }
      
      console.log(`${selectedProduct.price_approved ? 'Updating' : 'Setting'} price for product ID ${selectedProduct.id} to $${price}`);
      
      // Use the token explicitly for this request
      await axios.patch(`${API_BASE_URL}/products/${selectedProduct.id}/approve`, 
        { price: parseFloat(price) },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      setShowModal(false);
      setError('');
      setSuccess(`Product price ${selectedProduct.price_approved ? 'updated' : 'set'} successfully and product is now visible to customers!`);
      fetchAllProductsForSales();
    } catch (err) {
      console.error('Error setting/updating price:', err.response?.status, err.response?.data);
      setError(`Failed to ${selectedProduct.price_approved ? 'update' : 'set'} price: ${err.response?.data?.error || err.message}`);
    }
  };

  if (!user || user.role !== 'sales_manager') {
    return (
      <Container className="py-5">
        <Alert variant="danger">
          You don't have permission to access this page.
        </Alert>
      </Container>
    );
  }

  return (
    <Container className="py-5">
      <h2 className="mb-4">Product Price Approval</h2>
      
      {error && <Alert variant="danger">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      {loading ? (
        <p>Loading...</p>
      ) : products.length === 0 ? (
        <Alert variant="info">No products found.</Alert>
      ) : (
        <Table responsive striped bordered hover>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Model</th>
              <th>Category</th>
              <th>Current Price</th>
              <th>Price & Visibility Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map(product => (
              <tr key={product.id} className={!product.price_approved ? 'table-warning' : ''}> 
                <td>{product.id}</td>
                <td>{product.name}</td>
                <td>{product.model || '-'}</td>
                <td>{product.category_name || 'Uncategorized'}</td>
                <td>{product.price ? `$${parseFloat(product.price).toFixed(2)}` : 'Not Set'}</td>
                <td>
                  <Badge bg={product.price_approved ? 'success' : 'warning'} className="me-2">
                    {product.price_approved ? 'Approved' : 'Needs Price'}
                  </Badge>
                  {product.visible === 1 ? (
                    <Badge bg="success">Visible</Badge>
                  ) : (
                    <Badge bg="secondary">Hidden</Badge>
                  )}
                </td>
                <td>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setSelectedProduct(product);
                      setPrice(product.price ? parseFloat(product.price).toFixed(2) : ''); 
                      setIsApproving(!product.price_approved);
                      setShowModal(true);
                    }}
                  >
                    {product.price_approved ? 'Update Price' : 'Set Price'}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>{selectedProduct?.price_approved ? 'Update' : 'Set'} Product Price</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Product Name</Form.Label>
              <Form.Control
                type="text"
                value={selectedProduct?.name}
                readOnly
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>{selectedProduct?.price_approved ? 'Update' : 'Set'} Price ($)</Form.Label>
              <Form.Control
                type="number"
                step="0.01"
                min="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
                autoFocus
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSetOrUpdatePrice}>
            {selectedProduct?.price_approved ? 'Update Price' : 'Set & Approve Price'}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default ProductApproval; 