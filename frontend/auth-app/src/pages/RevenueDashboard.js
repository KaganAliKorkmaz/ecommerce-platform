import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner, Table } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { Chart, registerables } from 'chart.js';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';

// Register Chart.js components
Chart.register(...registerables);

const RevenueDashboard = () => {
  const { user } = useAuth();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [revenueData, setRevenueData] = useState(null);
  const [yearlyData, setYearlyData] = useState(null);
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  // Get the first day of the current month for default start date
  useEffect(() => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    
    // Format dates as YYYY-MM-DD
    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(today.toISOString().split('T')[0]);
    
    // Load the yearly summary data
    fetchMonthlySummary();
  }, []);

  // Fetch monthly summary data for the current year
  const fetchMonthlySummary = async () => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        setError('Authentication token is missing. Please log in again.');
        return;
      }
      
      const response = await axios.get(`${API_BASE_URL}/revenue/monthly-summary`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      setYearlyData(response.data);
    } catch (err) {
      console.error('Error fetching monthly summary:', err);
      setError('Failed to load yearly summary data.');
    }
  };

  // Calculate revenue for the selected date range
  const handleCalculateRevenue = async (e) => {
    e.preventDefault();
    
    if (!startDate || !endDate) {
      setError('Please select both start and end dates.');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        setError('Authentication token is missing. Please log in again.');
        setLoading(false);
        return;
      }
      
      const response = await axios.get(`${API_BASE_URL}/revenue/calculate`, {
        params: { startDate, endDate },
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      setRevenueData(response.data);
      setLoading(false);
      
      // Draw chart after data is loaded
      setTimeout(() => {
        drawChart(response.data.chartData);
      }, 100);
    } catch (err) {
      console.error('Error calculating revenue:', err);
      setError('Failed to calculate revenue. Please try again.');
      setLoading(false);
    }
  };

  // Draw the chart with the revenue data
  const drawChart = (chartData) => {
    const ctx = chartRef.current.getContext('2d');
    
    // Destroy previous chart if it exists
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }
    
    // Create new chart
    chartInstance.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: chartData.map(item => format(new Date(item.date), 'MMM dd')),
        datasets: [
          {
            label: 'Revenue',
            data: chartData.map(item => item.revenue),
            backgroundColor: 'rgba(54, 162, 235, 0.5)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1
          },
          {
            label: 'Cost',
            data: chartData.map(item => item.cost),
            backgroundColor: 'rgba(255, 99, 132, 0.5)',
            borderColor: 'rgba(255, 99, 132, 1)',
            borderWidth: 1
          },
          {
            label: 'Profit',
            data: chartData.map(item => item.profit),
            backgroundColor: 'rgba(75, 192, 192, 0.5)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1,
            type: 'line'
          }
        ]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Amount ($)'
            }
          },
          x: {
            title: {
              display: true,
              text: 'Date'
            }
          }
        }
      }
    });
  };

  // Export the report as PDF
  const handleExportPDF = () => {
    if (!revenueData) return;
    
    const doc = new jsPDF();
    const title = `Revenue Report: ${format(new Date(revenueData.startDate), 'MMM dd, yyyy')} - ${format(new Date(revenueData.endDate), 'MMM dd, yyyy')}`;
    
    // Add title
    doc.setFontSize(18);
    doc.text(title, 14, 22);
    
    // Add summary
    doc.setFontSize(12);
    doc.text(`Total Revenue: $${revenueData.totalRevenue.toFixed(2)}`, 14, 35);
    doc.text(`Total Cost: $${revenueData.totalCost.toFixed(2)}`, 14, 45);
    doc.text(`Total Profit: $${revenueData.totalProfit.toFixed(2)}`, 14, 55);
    doc.text(`Number of Orders: ${revenueData.orderCount}`, 14, 65);
    
    // Add chart as image
    if (chartRef.current) {
      const chartImg = chartRef.current.toDataURL('image/png', 1.0);
      doc.addImage(chartImg, 'PNG', 10, 75, 190, 100);
    }
    
    // Add daily data table
    if (revenueData.chartData && revenueData.chartData.length > 0) {
      const tableY = 190;
      doc.text('Daily Breakdown:', 14, tableY - 10);
      
      const tableColumn = ['Date', 'Revenue ($)', 'Cost ($)', 'Profit ($)'];
      const tableRows = revenueData.chartData.map(item => [
        format(new Date(item.date), 'MMM dd, yyyy'),
        item.revenue.toFixed(2),
        item.cost.toFixed(2),
        item.profit.toFixed(2)
      ]);
      
      doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: tableY
      });
    }
    
    // Save the PDF
    doc.save(`revenue-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  // If not a sales manager, show access denied
  if (!user || user.role !== 'sales_manager') {
    return (
      <Container className="py-5">
        <Alert variant="danger">
          You don't have permission to access this page. This dashboard is only available to Sales Managers.
        </Alert>
      </Container>
    );
  }

  return (
    <Container className="py-5">
      <h2 className="mb-4">Revenue and Profit Dashboard</h2>
      
      {error && <Alert variant="danger">{error}</Alert>}
      
      <Row className="mb-4">
        <Col md={6}>
          <Card className="shadow-sm">
            <Card.Body>
              <Card.Title>Calculate Revenue</Card.Title>
              <Form onSubmit={handleCalculateRevenue}>
                <Form.Group className="mb-3">
                  <Form.Label>Start Date</Form.Label>
                  <Form.Control
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </Form.Group>
                
                <Form.Group className="mb-3">
                  <Form.Label>End Date</Form.Label>
                  <Form.Control
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                  />
                </Form.Group>
                
                <Button variant="primary" type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <Spinner
                        as="span"
                        animation="border"
                        size="sm"
                        role="status"
                        aria-hidden="true"
                      />
                      {' '}Calculating...
                    </>
                  ) : (
                    'Calculate'
                  )}
                </Button>
                
                {revenueData && (
                  <Button
                    variant="success"
                    className="ms-2"
                    onClick={handleExportPDF}
                  >
                    Export PDF
                  </Button>
                )}
              </Form>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={6}>
          {yearlyData && (
            <Card className="shadow-sm h-100">
              <Card.Body>
                <Card.Title>Monthly Revenue Summary ({yearlyData.year})</Card.Title>
                <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                  <Table striped hover size="sm">
                    <thead>
                      <tr>
                        <th>Month</th>
                        <th>Revenue</th>
                        <th>Orders</th>
                        <th>Items Sold</th>
                      </tr>
                    </thead>
                    <tbody>
                      {yearlyData.monthlySummary.map((month) => (
                        <tr key={month.month}>
                          <td>{month.monthName}</td>
                          <td>${month.revenue.toFixed(2)}</td>
                          <td>{month.orderCount}</td>
                          <td>{month.itemsSold}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              </Card.Body>
            </Card>
          )}
        </Col>
      </Row>
      
      {revenueData && (
        <Row>
          <Col md={12}>
            <Card className="shadow-sm mb-4">
              <Card.Body>
                <Card.Title>Revenue Summary</Card.Title>
                <Row>
                  <Col md={3}>
                    <div className="text-center mb-3">
                      <h6>Total Revenue</h6>
                      <h3 className="text-primary">${revenueData.totalRevenue.toFixed(2)}</h3>
                    </div>
                  </Col>
                  <Col md={3}>
                    <div className="text-center mb-3">
                      <h6>Total Cost</h6>
                      <h3 className="text-danger">${revenueData.totalCost.toFixed(2)}</h3>
                    </div>
                  </Col>
                  <Col md={3}>
                    <div className="text-center mb-3">
                      <h6>Total Profit</h6>
                      <h3 className={revenueData.totalProfit >= 0 ? "text-success" : "text-danger"}>
                        ${revenueData.totalProfit.toFixed(2)}
                      </h3>
                    </div>
                  </Col>
                  <Col md={3}>
                    <div className="text-center mb-3">
                      <h6>Orders</h6>
                      <h3 className="text-info">{revenueData.orderCount}</h3>
                    </div>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>
          
          <Col md={12}>
            <Card className="shadow-sm mb-4">
              <Card.Body>
                <Card.Title>Revenue and Profit Trend</Card.Title>
                <div style={{ height: '400px' }}>
                  <canvas ref={chartRef}></canvas>
                </div>
              </Card.Body>
            </Card>
          </Col>
          
          {revenueData.chartData && revenueData.chartData.length > 0 && (
            <Col md={12}>
              <Card className="shadow-sm">
                <Card.Body>
                  <Card.Title>Daily Breakdown</Card.Title>
                  <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    <Table striped bordered hover responsive>
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Revenue</th>
                          <th>Cost</th>
                          <th>Profit</th>
                          <th>Profit Margin</th>
                        </tr>
                      </thead>
                      <tbody>
                        {revenueData.chartData.map((day, index) => (
                          <tr key={index}>
                            <td>{format(new Date(day.date), 'MMM dd, yyyy')}</td>
                            <td>${day.revenue.toFixed(2)}</td>
                            <td>${day.cost.toFixed(2)}</td>
                            <td className={day.profit >= 0 ? "text-success" : "text-danger"}>
                              ${day.profit.toFixed(2)}
                            </td>
                            <td>
                              {day.revenue > 0 ? 
                                `${((day.profit / day.revenue) * 100).toFixed(2)}%` : 
                                'N/A'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          )}
        </Row>
      )}
    </Container>
  );
};

export default RevenueDashboard; 