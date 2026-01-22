import React, { useState, useEffect } from 'react';
import { Container, ListGroup, Card, Spinner, Alert, Button } from 'react-bootstrap';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import './NotificationsPage.scss'; // We'll create this SCSS file next

const NotificationsPage = () => {
  const { user, fetchUnreadNotificationCount } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!user) {
        setLoading(false);
        // setError('Please log in to view notifications.'); // Or handle redirect in routing
        return;
      }

      try {
        setLoading(true);
        // Fetch all notifications now
        const response = await axios.get(`${API_BASE_URL}/notifications/unread`); // This endpoint now fetches all
        setNotifications(response.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching notifications:', err);
        setError('Failed to load notifications. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, [user]);

  const handleMarkAllAsRead = async () => {
    try {
      await axios.patch(`${API_BASE_URL}/notifications/mark-as-read`, {}); // Send empty body to mark all

      // Update local state
      setNotifications(notifications.map(notification => ({ ...notification, is_read: true })));

      // **Refetch unread count after marking all as read**
      fetchUnreadNotificationCount();

    } catch (err) {
      console.error('Error marking all notifications as read:', err);
      // Optionally show an error message to the user
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await axios.patch(`${API_BASE_URL}/notifications/mark-as-read`, {
        notificationIds: [notificationId]
      });

      // Update local state
      setNotifications(notifications.map(notification =>
        notification.id === notificationId ? { ...notification, is_read: true } : notification
      ));

      // **Refetch unread count after marking as read**
      fetchUnreadNotificationCount();

    } catch (err) {
      console.error(`Error marking notification ${notificationId} as read:`, err);
      // Optionally show an error message to the user
    }
  };

  const handleDeleteNotification = async (notificationId) => {
    try {
      // Add backend endpoint for deleting a notification
      await axios.delete(`${API_BASE_URL}/notifications/${notificationId}`);

      // Remove the deleted notification from local state
      setNotifications(notifications.filter(notification => notification.id !== notificationId));

      // **Refetch unread count after deleting**
      fetchUnreadNotificationCount();

    } catch (err) {
      console.error(`Error deleting notification ${notificationId}:`, err);
      // Optionally show an error message to the user
    }
  };

  // TODO: Improve rendering of notification message and metadata based on type

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  if (loading) {
    return (
      <Container className="my-4 text-center">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading notifications...</span>
        </Spinner>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="my-4">
        <Alert variant="danger">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container className="my-4 notifications-page">
      <h2>Notifications</h2>
      {notifications.length > 0 && notifications.some(n => !n.is_read) && (
        <div className="text-end mb-3">
          <Button variant="outline-secondary" size="sm" onClick={handleMarkAllAsRead}>
            Mark all as read
          </Button>
        </div>
      )}
      {notifications.length === 0 ? (
        <Alert variant="info">No unread notifications.</Alert>
      ) : (
        <ListGroup>
          {notifications.map(notification => {
            const isDiscountNotification = notification.type === 'discount';
            let discountMetadata = null;
            if (isDiscountNotification && notification.metadata) {
              try {
                discountMetadata = JSON.parse(notification.metadata);
              } catch (e) {
                console.error('Error parsing notification metadata:', e);
              }
            }

            return (
              <ListGroup.Item
                key={notification.id}
                className={!notification.is_read ? 'unread' : 'read'}
              >
                <Card>
                  <Card.Body>
                    <Card.Title>{notification.type}</Card.Title>
                    <Card.Subtitle className="mb-2 text-muted">{formatDate(notification.created_at)}</Card.Subtitle>
                    
                    {/* Render content based on notification type */}
                    {isDiscountNotification && discountMetadata ? (
                      <Card.Text>
                        The product you wishlisted, <strong>{discountMetadata.product_name}</strong>, is now on sale!
                        {discountMetadata.discount_type === 'percentage' ? (
                           ` Get a ${discountMetadata.discount_value}% discount.`
                        ) : (
                          ` It's discounted by €${discountMetadata.discount_value}.`
                        )}
                        {discountMetadata.product_id && (
                           <Link to={`/products/${discountMetadata.product_id}`} className="ms-2">View Product</Link>
                        )}
                      </Card.Text>
                    ) : (
                      // Default rendering for other notification types
                      <Card.Text>
                        {notification.message}
                      </Card.Text>
                    )}

                    <div className="button-container mt-2">
                      {!notification.is_read && (
                        <Button 
                          variant="outline-primary" 
                          size="sm" 
                          onClick={() => handleMarkAsRead(notification.id)}
                          className="me-2"
                        >
                          Mark as Read
                        </Button>
                      )}
                      {/* Add Delete button */}
                      <Button 
                        variant="outline-danger" 
                        size="sm" 
                        onClick={() => handleDeleteNotification(notification.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </Card.Body>
                </Card>
              </ListGroup.Item>
            );
          })}
        </ListGroup>
      )}
    </Container>
  );
};

export default NotificationsPage; 