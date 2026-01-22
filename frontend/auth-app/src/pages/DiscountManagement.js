import React, { useState, useEffect } from 'react';
import { Container, Card, Button, Form, Table, Alert, Badge } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import axios from '../utils/axios';

const DiscountManagement = () => {
  const { user } = useAuth();
  const [discounts, setDiscounts] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    product_id: '',
    discount_type: 'percentage',
    discount_value: '',
    start_date: '',
    end_date: ''
  });

  useEffect(() => {
    if (user && user.role === 'sales_manager') {
      fetchDiscounts();
      fetchProducts();
    }
  }, [user]);

  const fetchDiscounts = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/discounts');
      setDiscounts(response.data);
      setError('');
    } catch (err) {
      console.error('Error fetching discounts:', err);
      setError(err.response?.data?.error || 'Failed to fetch discounts');
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await axios.get('/products');
      setProducts(response.data);
    } catch (err) {
      console.error('Error fetching products:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/discounts', formData);
      fetchDiscounts();
      setFormData({
        product_id: '',
        discount_type: 'percentage',
        discount_value: '',
        start_date: '',
        end_date: ''
      });
      setError('');
    } catch (err) {
      console.error('Error creating discount:', err);
      setError(err.response?.data?.error || 'Failed to create discount');
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`/discounts/${id}`);
      fetchDiscounts();
    } catch (err) {
      console.error('Error deleting discount:', err);
      setError(err.response?.data?.error || 'Failed to delete discount');
    }
  };

  if (!user || user.role !== 'sales_manager') {
    return (
      <Container className="py-5">
        <Alert variant="danger">You don't have permission to access this page.</Alert>
      </Container>
    );
  }

  return (
    <Container className="py-5">
      <h2 className="mb-4">Discount Management</h2>
      
      {error && <Alert variant="danger">{error}</Alert>}

      <Card className="mb-4">
        <Card.Body>
          <h4>Create New Discount</h4>
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Product</Form.Label>
              <Form.Select
                value={formData.product_id}
                onChange={(e) => setFormData({...formData, product_id: e.target.value})}
                required
              >
                <option value="">Select Product</option>
                {products.map(product => (
                  <option key={product.id} value={product.id}>
                    {product.name} (${product.price})
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Discount Type</Form.Label>
              <Form.Select
                value={formData.discount_type}
                onChange={(e) => setFormData({...formData, discount_type: e.target.value})}
                required
              >
                <option value="percentage">Percentage</option>
                <option value="fixed_amount">Fixed Amount</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Discount Value</Form.Label>
              <Form.Control
                type="number"
                step="0.01"
                value={formData.discount_value}
                onChange={(e) => setFormData({...formData, discount_value: e.target.value})}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Start Date</Form.Label>
              <Form.Control
                type="datetime-local"
                value={formData.start_date}
                onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>End Date</Form.Label>
              <Form.Control
                type="datetime-local"
                value={formData.end_date}
                onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                required
              />
            </Form.Group>

            <Button type="submit" variant="primary">
              Create Discount
            </Button>
          </Form>
        </Card.Body>
      </Card>

      <Card>
        <Card.Body>
          <h4>Current Discounts</h4>
          {loading ? (
            <p>Loading...</p>
          ) : (
            <Table responsive>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Original Price</th>
                  <th>Type</th>
                  <th>Value</th>
                  <th>Discounted Price</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {discounts.map(discount => {
                  const discountedPrice = discount.discount_type === 'percentage'
                    ? discount.original_price * (1 - discount.discount_value / 100)
                    : Math.max(0, discount.original_price - discount.discount_value);
                  
                  const now = new Date();
                  const startDate = new Date(discount.start_date);
                  const endDate = new Date(discount.end_date);
                  const isActive = now >= startDate && now <= endDate;

                  return (
                    <tr key={discount.id}>
                      <td>{discount.product_name}</td>
                      <td>${discount.original_price}</td>
                      <td>{discount.discount_type}</td>
                      <td>
                        {discount.discount_type === 'percentage'
                          ? `${discount.discount_value}%`
                          : `$${discount.discount_value}`}
                      </td>
                      <td>${discountedPrice.toFixed(2)}</td>
                      <td>{new Date(discount.start_date).toLocaleString()}</td>
                      <td>{new Date(discount.end_date).toLocaleString()}</td>
                      <td>
                        <Badge bg={isActive ? "success" : "secondary"}>
                          {isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDelete(discount.id)}
                        >
                          Delete
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
};

export default DiscountManagement; 