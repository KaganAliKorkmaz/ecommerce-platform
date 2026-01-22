import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Badge, Spinner, Alert } from 'react-bootstrap';
import { FaStar, FaRegStar } from 'react-icons/fa';
import axios from 'axios';
import { API_BASE_URL } from '../../config';
import './ProductReviews.scss';

const ProductReviews = ({ productId }) => {
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState({ averageRating: 0, ratingCount: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [user, setUser] = useState(null);
  const [product, setProduct] = useState(null);

  // Fetch reviews for the product
  const fetchReviews = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/ratings/product/${productId}`);
      setReviews(response.data.ratings);
      setStats(response.data.stats);
      setError(null);
    } catch (err) {
      console.error('Error fetching reviews:', err);
      setError('Failed to load reviews. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (productId) {
      fetchReviews();
    }
  }, [productId]);

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await axios.post(`${API_BASE_URL}/ratings/submit`, {
        userId: user.id,
        productId: product.id,
        rating: rating,
        comment: comment
      });

      if (response.data.success) {
        setSuccess(response.data.message);
        setRating(0);
        setComment('');
        // Refresh reviews after successful submission
        fetchReviews();
      }
    } catch (err) {
      console.error('Error submitting review:', err);
      setError(err.response?.data?.error || 'Failed to submit review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Render stars based on rating
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

  // Format date to a readable string
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="text-center my-4">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading reviews...</span>
        </Spinner>
      </div>
    );
  }

  if (error) {
    return <Alert variant="danger">{error}</Alert>;
  }

  return (
    <div className="product-reviews my-4">
      <h3 className="mb-3">Customer Reviews</h3>
      
      <Card className="mb-4 review-summary">
        <Card.Body>
          <Row>
            <Col md={4} className="text-center border-end">
              <div className="average-rating">
                <h2>{stats.averageRating && !isNaN(stats.averageRating) ? Number(stats.averageRating).toFixed(1) : 'No ratings'}</h2>
                <div className="stars">
                  {renderStars(Math.round(stats.averageRating || 0))}
                </div>
                <div className="rating-count">
                  Based on {stats.ratingCount} {stats.ratingCount === 1 ? 'review' : 'reviews'}
                </div>
              </div>
            </Col>
            <Col md={8}>
              <div className="rating-breakdown">
                <h5>Rating Breakdown</h5>
                {[5, 4, 3, 2, 1].map(star => {
                  const count = reviews.filter(review => Math.round(review.rating || 0) === star).length;
                  const percentage = stats.ratingCount > 0 ? (count / stats.ratingCount) * 100 : 0;
                  
                  return (
                    <div key={star} className="rating-bar-container">
                      <div className="rating-label">{star} {star === 1 ? 'star' : 'stars'}</div>
                      <div className="rating-bar">
                        <div 
                          className="rating-bar-fill" 
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                      <div className="rating-count-label">{count}</div>
                    </div>
                  );
                })}
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {reviews.length === 0 ? (
        <Alert variant="info">
          This product has no reviews yet. Be the first to review this product!
        </Alert>
      ) : (
        <div className="reviews-list">
          {reviews.map(review => (
            <Card key={review.id} className="mb-3 review-card">
              <Card.Body>
                <div className="review-header">
                  <div className="reviewer-info">
                    <h5 className="reviewer-name">{review.user_name}</h5>
                    <div className="review-date">{formatDate(review.created_at)}</div>
                  </div>
                  <Badge bg="primary" className="rating-badge">
                    {review.rating ? Number(review.rating).toFixed(1) : 'N/A'}
                  </Badge>
                </div>
                
                <div className="review-rating">
                  {renderStars(Math.round(review.rating || 0))}
                </div>
                
                {review.comment && (
                  <div className="review-comment mt-3">
                    {review.comment}
                  </div>
                )}
              </Card.Body>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductReviews; 