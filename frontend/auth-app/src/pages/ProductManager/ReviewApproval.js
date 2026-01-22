import React, { useState, useEffect } from 'react';
import { Container, Table, Button, Badge, Spinner, Alert, Card, Row, Col, Form } from 'react-bootstrap';
import { FaStar, FaRegStar, FaCheck, FaTimes } from 'react-icons/fa';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import './ReviewApproval.scss';
import { API_BASE_URL } from '../../config';

const ReviewApproval = () => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // Fetch products for filter dropdown
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/products`);
        setProducts(response.data);
      } catch (err) {
        console.error('Error fetching products:', err);
      } finally {
        setLoadingProducts(false);
      }
    };

    fetchProducts();
  }, []);

  // Fetch reviews that need approval
  const fetchReviews = async (productId = null) => {
    try {
      setLoading(true);
      setError(null);
      
      let url;
      if (productId) {
        url = `${API_BASE_URL}/ratings/admin/product/${productId}`;
      } else {
        // Fetch all pending reviews if no product is selected
        url = `${API_BASE_URL}/ratings/admin/pending`;
      }
      
      const response = await axios.get(url);
      
      // Filter for unapproved comments only if we have a specific endpoint for all pending reviews
      const reviewData = productId 
        ? response.data.filter(review => review.comment && review.comment_approved === 0)
        : response.data;
        
      setReviews(reviewData);
    } catch (err) {
      console.error('Error fetching reviews:', err);
      setError('Failed to load reviews. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial loading of all pending reviews
    fetchReviews();
  }, []);

  // When product filter changes
  useEffect(() => {
    if (selectedProductId) {
      fetchReviews(selectedProductId);
    } else {
      fetchReviews();
    }
  }, [selectedProductId]);

  const handleApprove = async (reviewId) => {
    try {
      await axios.put(`${API_BASE_URL}/ratings/approve/${reviewId}`);
      
      // Remove the approved review from the list
      setReviews(reviews.filter(review => review.id !== reviewId));
      setSuccess('Review approved successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error approving review:', err);
      setError('Failed to approve review');
      
      // Clear error message after 3 seconds
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleReject = async (reviewId) => {
    try {
      await axios.delete(`${API_BASE_URL}/ratings/${reviewId}`);
      
      // Remove the rejected review from the list
      setReviews(reviews.filter(review => review.id !== reviewId));
      setSuccess('Review rejected successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error rejecting review:', err);
      setError('Failed to reject review');
      
      // Clear error message after 3 seconds
      setTimeout(() => setError(null), 3000);
    }
  };

  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        i <= rating ? (
          <FaStar key={i} className="star filled" />
        ) : (
          <FaRegStar key={i} className="star" />
        )
      );
    }
    return stars;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // If user doesn't have product_manager role
  if (user?.role !== 'product_manager') {
    return (
      <Container className="my-5">
        <Alert variant="danger">
          You don't have permission to access this page. This page is only for product managers.
        </Alert>
      </Container>
    );
  }

  return (
    <Container className="my-5 review-approval-page">
      <h2 className="mb-4">Review Approval Management</h2>
      
      {success && <Alert variant="success">{success}</Alert>}
      {error && <Alert variant="danger">{error}</Alert>}
      
      <Card className="mb-4">
        <Card.Body>
          <Row>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Filter by Product</Form.Label>
                <Form.Select 
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  disabled={loadingProducts}
                >
                  <option value="">All Products</option>
                  {products.map(product => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>
        </Card.Body>
      </Card>
      
      {loading ? (
        <div className="text-center my-5">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading reviews...</span>
          </Spinner>
        </div>
      ) : reviews.length === 0 ? (
        <Alert variant="info">
          No reviews pending approval.
        </Alert>
      ) : (
        <Table responsive className="review-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>User</th>
              <th>Product</th>
              <th>Rating</th>
              <th>Comment</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {reviews.map(review => (
              <tr key={review.id}>
                <td>{review.id}</td>
                <td>{review.user_name}</td>
                <td>
                  {products.find(p => p.id === review.product_id)?.name || `Product #${review.product_id}`}
                </td>
                <td>
                  <div className="rating-stars">
                    {renderStars(review.rating)}
                  </div>
                </td>
                <td className="review-comment-cell">{review.comment}</td>
                <td>{formatDate(review.created_at)}</td>
                <td>
                  <div className="action-buttons">
                    <Button 
                      variant="success" 
                      size="sm"
                      onClick={() => handleApprove(review.id)}
                      title="Approve Review"
                    >
                      <FaCheck />
                    </Button>
                    <Button 
                      variant="danger" 
                      size="sm"
                      onClick={() => handleReject(review.id)}
                      title="Reject Review"
                    >
                      <FaTimes />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Container>
  );
};

export default ReviewApproval; 