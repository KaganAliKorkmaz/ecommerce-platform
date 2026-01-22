import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Form, Button, Table, Card, Spinner, Alert, Badge } from 'react-bootstrap';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { format } from 'date-fns';
import './InvoiceManagement.scss';

const InvoiceManagement = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [downloading, setDownloading] = useState({});

  // Fetch invoices based on date range
  const fetchInvoices = async () => {
    setLoading(true);
    setError(null);
    try {
      let url = `${API_BASE_URL}/invoices/manager/all`;
      
      // Add date range parameters if provided
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      console.log('Fetching invoices from URL:', url);
      
      const response = await axios.get(url);
      console.log('Invoice response:', response.data);
      setInvoices(response.data);
    } catch (err) {
      console.error('Error fetching invoices:', err);
      console.error('Error details:', err.response || 'No response details');
      
      // More detailed error message
      let errorMessage = 'Failed to fetch invoices';
      if (err.response) {
        errorMessage += `: ${err.response.status} ${err.response.statusText}`;
        if (err.response.data && err.response.data.error) {
          errorMessage += ` - ${err.response.data.error}`;
        }
      } else if (err.request) {
        errorMessage += ' - No response received from server';
      } else {
        errorMessage += ` - ${err.message}`;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Load invoices when component mounts
  useEffect(() => {
    fetchInvoices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Download a single invoice
  const downloadInvoice = async (invoiceId) => {
    setDownloading(prev => ({ ...prev, [invoiceId]: true }));
    try {
      const response = await axios.get(`${API_BASE_URL}/invoices/${invoiceId}`, {
        responseType: 'blob'
      });
      
      // Create a blob link to download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice-${invoiceId}.pdf`);
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      window.URL.revokeObjectURL(url);
      link.remove();
    } catch (err) {
      console.error(`Error downloading invoice ${invoiceId}:`, err);
      setError(`Failed to download invoice #${invoiceId}`);
    } finally {
      setDownloading(prev => ({ ...prev, [invoiceId]: false }));
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy HH:mm');
    } catch (error) {
      return dateString;
    }
  };

  // Get status badge variant
  const getStatusVariant = (status) => {
    switch (status) {
      case 'processing':
        return 'warning';
      case 'in-transit':
        return 'info';
      case 'delivered':
        return 'success';
      case 'cancelled':
        return 'danger';
      default:
        return 'secondary';
    }
  };

  return (
    <Container className="py-5 invoice-management">
      <h1 className="mb-4">Invoice Management</h1>
      
      <Card className="mb-4 filter-card">
        <Card.Body>
          <Row className="align-items-end">
            <Col md={4}>
              <Form.Group controlId="startDate">
                <Form.Label>Start Date</Form.Label>
                <Form.Control 
                  type="date" 
                  value={startDate} 
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group controlId="endDate">
                <Form.Label>End Date</Form.Label>
                <Form.Control 
                  type="date" 
                  value={endDate} 
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </Form.Group>
            </Col>
            <Col md={4} className="d-flex">
              <Button 
                variant="primary" 
                className="me-2 flex-grow-1" 
                onClick={fetchInvoices}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                    <span className="ms-2">Loading...</span>
                  </>
                ) : (
                  <>Apply Filter</>
                )}
              </Button>
              <Button 
                variant="outline-secondary" 
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                }}
              >
                Clear
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {invoices.length > 0 ? (
        <div className="table-responsive">
          <Table striped hover className="invoice-table">
            <thead>
              <tr>
                <th>Order #</th>
                <th>Customer</th>
                <th>Email</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td>#{invoice.id}</td>
                  <td>{invoice.user_name}</td>
                  <td>{invoice.user_email}</td>
                  <td>{formatDate(invoice.created_at)}</td>
                  <td>${Number(invoice.total_amount).toFixed(2)}</td>
                  <td>
                    <Badge bg={getStatusVariant(invoice.status)}>
                      {invoice.status}
                    </Badge>
                  </td>
                  <td>
                    <Button
                      variant="outline-primary"
                      size="sm"
                      onClick={() => downloadInvoice(invoice.id)}
                      disabled={downloading[invoice.id]}
                    >
                      {downloading[invoice.id] ? (
                        <>
                          <Spinner animation="border" size="sm" />
                          <span className="ms-2">Downloading...</span>
                        </>
                      ) : (
                        <>
                          <i className="bi bi-download me-1"></i> Invoice
                        </>
                      )}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      ) : (
        <Card className="text-center p-5">
          <Card.Body>
            {loading ? (
              <div className="text-center py-5">
                <Spinner animation="border" role="status">
                  <span className="visually-hidden">Loading...</span>
                </Spinner>
                <p className="mt-3">Loading invoices...</p>
              </div>
            ) : (
              <>
                <i className="bi bi-file-earmark-text display-1 text-muted"></i>
                <h3 className="mt-3">No Invoices Found</h3>
                <p className="text-muted">
                  {startDate || endDate ? 
                    'No invoices match your filter criteria.' : 
                    'No invoices available in the system.'}
                </p>
              </>
            )}
          </Card.Body>
        </Card>
      )}
    </Container>
  );
};

export default InvoiceManagement; 