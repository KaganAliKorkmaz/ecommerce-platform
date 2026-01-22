import React, { useState, useEffect } from 'react';
import { 
  Container, Row, Col, Table, Button, Form, Modal, 
  Alert, Spinner, InputGroup, Pagination, Badge 
} from 'react-bootstrap';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../config';
import './ProductManagement.scss';

const ProductManagement = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // State for filtering and pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [productsPerPage] = useState(10);
  const [filterCategory, setFilterCategory] = useState('');
  const [sortField, setSortField] = useState('id');
  const [sortDirection, setSortDirection] = useState('asc');

  // State for product form
  const [showProductModal, setShowProductModal] = useState(false);
  const [productFormData, setProductFormData] = useState({
    name: '',
    model: '',
    serial_number: '',
    description: '',
    stock: 0,
    price: '',
    cost: '',
    warranty_months: 0,
    distributor_info: '',
    category_id: '',
    visible: 0
  });
  const [editingProductId, setEditingProductId] = useState(null);
  const [formErrors, setFormErrors] = useState({});

  // State for delete confirmation modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);

  // State for stock update modal
  const [showStockModal, setShowStockModal] = useState(false);
  const [productToUpdateStock, setProductToUpdateStock] = useState(null);
  const [newStockValue, setNewStockValue] = useState(0);

  // State for category management
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoryFormData, setCategoryFormData] = useState({
    name: '',
    description: ''
  });
  const [categoryFormErrors, setCategoryFormErrors] = useState({});
  
  // State for category delete confirmation modal
  const [showCategoryDeleteModal, setShowCategoryDeleteModal] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);

  // Fetch products and categories on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');
        
        // Get the token directly before making API calls
        const token = localStorage.getItem('token');
        
        if (!token) {
          setError('Authentication token is missing. Please log in again.');
          setLoading(false);
          return;
        }
        
        console.log('Using token for API call:', token);
        
        // Fetch products with proper authentication
        const productsResponse = await axios.get(`${API_BASE_URL}/products/admin/all`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        // Fetch categories
        const categoriesResponse = await axios.get(`${API_BASE_URL}/products/categories/all`);
        
        setProducts(productsResponse.data);
        setCategories(categoriesResponse.data);
      } catch (err) {
        console.error('Error details:', err);
        if (err.response?.status === 401) {
          setError('Your session has expired. Please log in again.');
        } else {
          setError(err.response?.data?.error || 'Error fetching data. Please try again.');
        }
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter and sort products
  const filteredProducts = products.filter(product => {
    const matchesSearch = 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.serial_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = filterCategory ? product.category_id == filterCategory : true;
    
    return matchesSearch && matchesCategory;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (a[sortField] === null) return 1;
    if (b[sortField] === null) return -1;
    
    if (sortField === 'price' || sortField === 'stock' || sortField === 'warranty_months') {
      return sortDirection === 'asc' 
        ? parseFloat(a[sortField]) - parseFloat(b[sortField])
        : parseFloat(b[sortField]) - parseFloat(a[sortField]);
    }
    
    if (sortDirection === 'asc') {
      return a[sortField]?.toString().localeCompare(b[sortField]?.toString() || '');
    } else {
      return b[sortField]?.toString().localeCompare(a[sortField]?.toString() || '');
    }
  });

  // Get current products for pagination
  const indexOfLastProduct = currentPage * productsPerPage;
  const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
  const currentProducts = sortedProducts.slice(indexOfFirstProduct, indexOfLastProduct);

  // Change page
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Handle sort
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Reset form data
  const resetFormData = () => {
    setProductFormData({
      name: '',
      model: '',
      serial_number: '',
      description: '',
      stock: 0,
      price: '',
      cost: '',
      warranty_months: 0,
      distributor_info: '',
      category_id: '',
      visible: 0
    });
    setEditingProductId(null);
    setFormErrors({});
  };

  // Open modal for adding new product
  const handleAddProduct = () => {
    resetFormData();
    setShowProductModal(true);
  };

  // Open modal for editing product
  const handleEditProduct = (product) => {
    setProductFormData({
      name: product.name,
      model: product.model || '',
      serial_number: product.serial_number || '',
      description: product.description || '',
      stock: product.stock || 0,
      price: product.price || '',
      cost: product.cost || '',
      warranty_months: product.warranty_months || 0,
      distributor_info: product.distributor_info || '',
      category_id: product.category_id || '',
      visible: product.visible
    });
    setEditingProductId(product.id);
    setShowProductModal(true);
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    
    // Convert numeric fields to appropriate types
    if (type === 'number') {
      setProductFormData({
        ...productFormData,
        [name]: value === '' ? '' : Number(value)
      });
    } else {
      setProductFormData({
        ...productFormData,
        [name]: value
      });
    }
    
    // Clear specific field error when user starts typing
    if (formErrors[name]) {
      setFormErrors({
        ...formErrors,
        [name]: ''
      });
    }
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};
    
    if (!productFormData.name.trim()) {
      newErrors.name = 'Product name is required';
    }
    
    if (productFormData.stock < 0) {
      newErrors.stock = 'Stock cannot be negative';
    }
    
    // Price is optional but must be non-negative if provided
    if (productFormData.price !== '' && parseFloat(productFormData.price) < 0) {
      newErrors.price = 'Price cannot be negative';
    }
    
    if (productFormData.warranty_months < 0) {
      newErrors.warranty_months = 'Warranty months cannot be negative';
    }
    
    if (!productFormData.category_id) {
      newErrors.category_id = 'Category is required';
    }
    
    setFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit product form (create or update)
  const handleSubmitProduct = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication token is missing. Please log in again.');
        setLoading(false);
        return;
      }
      
      // Create a copy of form data without visibility field
      // since product managers don't control visibility through the main form
      const { visible, ...productDataWithoutVisibility } = productFormData;
      
      // Format data properly for submission
      const formattedData = {
        ...productDataWithoutVisibility,
        // Convert string values to appropriate types
        category_id: productDataWithoutVisibility.category_id ? parseInt(productDataWithoutVisibility.category_id) : null,
        stock: parseInt(productDataWithoutVisibility.stock) || 0,
        warranty_months: parseInt(productDataWithoutVisibility.warranty_months) || 0,
        // Handle price specially - backend will convert empty string, 0, or undefined to NULL
        price: productDataWithoutVisibility.price === '' ? null : productDataWithoutVisibility.price,
        // Handle cost specially - backend will convert empty string, 0, or undefined to NULL
        cost: productDataWithoutVisibility.cost === '' ? null : productDataWithoutVisibility.cost
      };
      
      console.log("Submitting product data:", formattedData);
      
      let response;
      
      if (editingProductId) {
        // Update existing product
        response = await axios.put(
          `${API_BASE_URL}/products/admin/${editingProductId}`,
          formattedData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
        setSuccess('Product updated successfully');
      } else {
        // Create new product
        response = await axios.post(
          `${API_BASE_URL}/products/admin/create`,
          formattedData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
        setSuccess('Product created successfully');
      }
      
      // Refresh products list
      const productsResponse = await axios.get(`${API_BASE_URL}/products/admin/all`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      setProducts(productsResponse.data);
      setShowProductModal(false);
      resetFormData();
    } catch (err) {
      console.error('Full error:', err);
      if (err.response?.status === 401) {
        setError('Your session has expired. Please log in again.');
      } else if (err.response?.data?.error) {
        setError(`Error: ${err.response.data.error}`);
      } else {
        setError(`Error saving product: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Open modal for delete confirmation
  const handleConfirmDelete = (product) => {
    setProductToDelete(product);
    setShowDeleteModal(true);
  };

  // Delete product
  const handleDeleteProduct = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication token is missing. Please log in again.');
        setLoading(false);
        return;
      }
      
      await axios.delete(`${API_BASE_URL}/products/admin/${productToDelete.id}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      // Refresh products list
      const productsResponse = await axios.get(`${API_BASE_URL}/products/admin/all`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      setProducts(productsResponse.data);
      setSuccess(`Product "${productToDelete.name}" deleted successfully!`);
      setShowDeleteModal(false);
      setProductToDelete(null);
    } catch (err) {
      let errorMessage = 'Error deleting product. Please try again.';
      
      if (err.response?.status === 401) {
        errorMessage = 'Your session has expired. Please log in again.';
      } else if (err.response?.status === 400 && err.response?.data?.error?.includes('referenced in orders')) {
        errorMessage = `Cannot delete "${productToDelete?.name}" because it has been ordered before. Use the "Hide" button to remove it from customer view while preserving order history.`;
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      }
      
      setError(errorMessage);
      setShowDeleteModal(false);
      console.error('Error deleting product:', err);
    } finally {
      setLoading(false);
    }
  };

  // Open modal for stock update
  const handleOpenStockModal = (product) => {
    setProductToUpdateStock(product);
    setNewStockValue(product.stock || 0);
    setShowStockModal(true);
  };

  // Update stock
  const handleUpdateStock = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication token is missing. Please log in again.');
        return;
      }
      
      if (!productToUpdateStock) {
        setError('No product selected for stock update.');
        return;
      }

      if (newStockValue < 0) {
        setError('Stock value cannot be negative.');
        return;
      }

      await axios.put(`${API_BASE_URL}/products/admin/stock/${productToUpdateStock.id}`, 
        { stock: newStockValue },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      // Update products in state
      setProducts(products.map(p => 
        p.id === productToUpdateStock.id 
          ? { ...p, stock: newStockValue } 
          : p
      ));

      setSuccess(`Stock for ${productToUpdateStock.name} updated successfully!`);
      setShowStockModal(false);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (err) {
      console.error('Error updating stock:', err);
        setError(err.response?.data?.error || 'Error updating stock. Please try again.');
      }
  };

  // Handle category form input changes
  const handleCategoryInputChange = (e) => {
    const { name, value } = e.target;
    
    setCategoryFormData({
      ...categoryFormData,
      [name]: value
    });
    
    // Clear specific field error when user starts typing
    if (categoryFormErrors[name]) {
      setCategoryFormErrors({
        ...categoryFormErrors,
        [name]: ''
      });
    }
  };

  // Validate category form
  const validateCategoryForm = () => {
    const newErrors = {};
    
    if (!categoryFormData.name.trim()) {
      newErrors.name = 'Category name is required';
    }
    
    setCategoryFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit category form (create)
  const handleSubmitCategory = async (e) => {
    e.preventDefault();
    
    if (!validateCategoryForm()) {
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication token is missing. Please log in again.');
        return;
      }
      
      const response = await axios.post(
        `${API_BASE_URL}/products/categories/create`,
        categoryFormData,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      // Add the new category to the categories state
      setCategories([...categories, response.data]);
      
      // Show success message
      setSuccess('Category created successfully!');
      
      // Reset form and close modal
      setCategoryFormData({ name: '', description: '' });
      setShowCategoryModal(false);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (err) {
      console.error('Error creating category:', err);
      setError(err.response?.data?.error || 'Error creating category. Please try again.');
    }
  };

  // Handle category delete confirmation
  const handleConfirmDeleteCategory = (category) => {
    setCategoryToDelete(category);
    setShowCategoryDeleteModal(true);
  };

  // Delete category
  const handleDeleteCategory = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication token is missing. Please log in again.');
        return;
      }

      if (!categoryToDelete) {
        setError('No category selected for deletion.');
        return;
      }

      await axios.delete(`${API_BASE_URL}/products/categories/${categoryToDelete.id}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      // Remove the category from the categories state
      setCategories(categories.filter(category => category.id !== categoryToDelete.id));

      // Reset any products that were filtered by this category
      if (filterCategory == categoryToDelete.id) {
        setFilterCategory('');
      }

      // Show success message
      setSuccess(`Category "${categoryToDelete.name}" deleted successfully!`);
      
      // Reset and close modal
      setCategoryToDelete(null);
      setShowCategoryDeleteModal(false);

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (err) {
      console.error('Error deleting category:', err);
      setError(err.response?.data?.error || 'Error deleting category. Please try again.');
      setShowCategoryDeleteModal(false);
    }
  };

  // Toggle product visibility
  const handleToggleVisibility = async (product) => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication token is missing. Please log in again.');
        setLoading(false);
        return;
      }
      
      // Toggle the visible property (0 -> 1 or 1 -> 0)
      const newVisibility = product.visible === 1 ? 0 : 1;
      
      // If trying to make a product visible, check if it has a price
      if (newVisibility === 1 && (!product.price || parseFloat(product.price) === 0)) {
        setError('Products need to have a price set by a Sales Manager before they can be made visible to customers.');
        setLoading(false);
        return;
      }
      
      // Use the dedicated visibility endpoint
      await axios.patch(
        `${API_BASE_URL}/products/admin/${product.id}/visibility`,
        { visible: newVisibility },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      // Refresh products list
      const productsResponse = await axios.get(`${API_BASE_URL}/products/admin/all`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      setProducts(productsResponse.data);
      setSuccess(`Product ${newVisibility === 1 ? 'shown' : 'hidden'} successfully`);
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Your session has expired. Please log in again.');
      } else if (err.response?.status === 403) {
        setError('You do not have permission to change product visibility.');
      } else {
        setError(err.response?.data?.error || 'Error toggling product visibility. Please try again.');
      }
      console.error('Error toggling visibility:', err);
    } finally {
      setLoading(false);
    }
  };

  // If user doesn't have product_manager role
  if (user && user.role !== 'product_manager') {
    return (
      <Container className="my-5">
        <Alert variant="danger">
          You don't have permission to access this page. This page is only for product managers.
        </Alert>
      </Container>
    );
  }

  // If no user or still loading authentication
  if (!user) {
    return (
      <Container className="my-5 text-center">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
        <p className="mt-3">Checking authentication...</p>
      </Container>
    );
  }

  return (
    <Container fluid className="product-management-page my-5">
      <Row className="mb-4">
        <Col>
          <h2>Product Management</h2>
          <p>Manage products, update stock, and control visibility.</p>
          <Alert variant="info">
            <strong>Important:</strong> As a Product Manager, you can add, edit, and delete products, but pricing is set by Sales Managers. 
            Products won't be visible to customers until a Sales Manager sets the price.
            <br /><br />
            <strong>Note on Deletion:</strong> Products that have been ordered cannot be deleted to preserve order history. 
            Use the "Hide" button instead to remove them from customer view.
          </Alert>
        </Col>
        <Col xs="auto">
          <Button variant="primary" onClick={handleAddProduct}>
            Add New Product
          </Button>
        </Col>
      </Row>

      {success && <Alert variant="success" onClose={() => setSuccess('')} dismissible>{success}</Alert>}
      {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}

      <Row className="mb-4">
        <Col md={2}>
          <Button variant="primary" onClick={handleAddProduct} className="w-100">
            Add Product
          </Button>
        </Col>
        <Col md={3}>
          <InputGroup>
            <Form.Control
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </InputGroup>
        </Col>
        <Col md={3}>
          <Form.Select 
            value={filterCategory} 
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Form.Select>
        </Col>
        <Col md={2}>
          <Button variant="outline-success" onClick={() => setShowCategoryModal(true)} className="w-100">
            Add Category
          </Button>
        </Col>
        <Col md={2} className="text-end">
          <span className="me-2">Total: {filteredProducts.length}</span>
        </Col>
      </Row>

      {/* Category Management Section */}
      <Row className="mb-4">
        <Col>
          <div className="bg-light p-3 rounded">
            <h5 className="mb-3">Category Management</h5>
            <div className="d-flex flex-wrap gap-2">
              {categories.map(category => (
                <div key={category.id} className="d-flex align-items-center bg-white rounded p-2 border">
                  <span className="me-2">{category.name}</span>
                  <Button 
                    variant="outline-danger" 
                    size="sm"
                    onClick={() => handleConfirmDeleteCategory(category)}
                    title="Delete Category"
                  >
                    ✕
                  </Button>
                </div>
              ))}
              {categories.length === 0 && (
                <span className="text-muted">No categories available</span>
              )}
            </div>
          </div>
        </Col>
      </Row>

      {loading && !products.length ? (
        <div className="text-center my-5">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
        </div>
      ) : (
        <>
          <div className="table-responsive">
            <Table striped bordered hover>
              <thead>
                <tr>
                  <th onClick={() => handleSort('id')} className="sortable-header">
                    ID {sortField === 'id' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => handleSort('name')} className="sortable-header">
                    Name {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => handleSort('model')} className="sortable-header">
                    Model {sortField === 'model' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => handleSort('stock')} className="sortable-header">
                    Stock {sortField === 'stock' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => handleSort('price')} className="sortable-header">
                    Price {sortField === 'price' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => handleSort('warranty_months')} className="sortable-header">
                    Warranty {sortField === 'warranty_months' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentProducts.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="text-center">No products found</td>
                  </tr>
                ) : (
                  currentProducts.map(product => (
                    <tr key={product.id}>
                      <td>{product.id}</td>
                      <td>{product.name}</td>
                      <td>{product.model || '-'}</td>
                      <td>
                        <Badge 
                          bg={product.stock > 0 ? 'success' : 'danger'}
                          className="stock-badge"
                        >
                          {product.stock}
                        </Badge>
                        <Button 
                          variant="outline-secondary"
                          size="sm"
                          className="ms-2"
                          onClick={() => handleOpenStockModal(product)}
                        >
                          Update
                        </Button>
                      </td>
                      <td>{product.price ? `$${parseFloat(product.price).toFixed(2)}` : 'Not set'}</td>
                      <td>{product.warranty_months} months</td>
                      <td>{product.category_name || 'Uncategorized'}</td>
                      <td>
                        <Badge 
                          bg={product.visible ? 'success' : 'warning'}
                          className="me-2"
                        >
                          {product.visible ? 'Visible' : 'Hidden'}
                        </Badge>
                        <Button 
                          variant={product.visible ? "outline-warning" : "outline-success"} 
                          size="sm"
                          onClick={() => handleToggleVisibility(product)}
                        >
                          {product.visible ? 'Hide' : 'Show'}
                        </Button>
                      </td>
                      <td>
                        <Button 
                          variant="outline-primary" 
                          size="sm"
                          className="me-1"
                          onClick={() => handleEditProduct(product)}
                        >
                          Edit
                        </Button>
                        <Button 
                          variant="outline-danger" 
                          size="sm"
                          onClick={() => handleConfirmDelete(product)}
                        >
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </div>

          {/* Pagination */}
          {sortedProducts.length > productsPerPage && (
            <Pagination className="justify-content-center">
              <Pagination.First onClick={() => paginate(1)} disabled={currentPage === 1} />
              <Pagination.Prev onClick={() => paginate(currentPage - 1)} disabled={currentPage === 1} />
              
              {[...Array(Math.ceil(sortedProducts.length / productsPerPage)).keys()].map(number => (
                Math.abs(currentPage - (number + 1)) < 3 && (
                  <Pagination.Item
                    key={number + 1}
                    active={currentPage === number + 1}
                    onClick={() => paginate(number + 1)}
                  >
                    {number + 1}
                  </Pagination.Item>
                )
              ))}
              
              <Pagination.Next
                onClick={() => paginate(currentPage + 1)}
                disabled={currentPage === Math.ceil(sortedProducts.length / productsPerPage)}
              />
              <Pagination.Last
                onClick={() => paginate(Math.ceil(sortedProducts.length / productsPerPage))}
                disabled={currentPage === Math.ceil(sortedProducts.length / productsPerPage)}
              />
            </Pagination>
          )}
        </>
      )}

      {/* Add/Edit Product Modal */}
      <Modal show={showProductModal} onHide={() => setShowProductModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{editingProductId ? 'Edit Product' : 'Add New Product'}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmitProduct}>
          <Modal.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Name *</Form.Label>
                  <Form.Control
                    type="text"
                    name="name"
                    value={productFormData.name}
                    onChange={handleInputChange}
                    isInvalid={!!formErrors.name}
                    required
                  />
                  <Form.Control.Feedback type="invalid">
                    {formErrors.name}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Model</Form.Label>
                  <Form.Control
                    type="text"
                    name="model"
                    value={productFormData.model}
                    onChange={handleInputChange}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Serial Number</Form.Label>
                  <Form.Control
                    type="text"
                    name="serial_number"
                    value={productFormData.serial_number}
                    onChange={handleInputChange}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Category *</Form.Label>
                  <Form.Select
                    name="category_id"
                    value={productFormData.category_id}
                    onChange={handleInputChange}
                    isInvalid={!!formErrors.category_id}
                    required
                  >
                    <option value="">Select Category</option>
                    {categories.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </Form.Select>
                  <Form.Control.Feedback type="invalid">
                    {formErrors.category_id}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="description"
                value={productFormData.description}
                onChange={handleInputChange}
              />
            </Form.Group>

            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Stock</Form.Label>
                  <Form.Control
                    type="number"
                    name="stock"
                    value={productFormData.stock}
                    onChange={handleInputChange}
                    min="0"
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Warranty (Months)</Form.Label>
                  <Form.Control
                    type="number"
                    name="warranty_months"
                    value={productFormData.warranty_months}
                    onChange={handleInputChange}
                    min="0"
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Cost (Optional)</Form.Label>
                  <Form.Control
                    type="number"
                    name="cost"
                    value={productFormData.cost || ''}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                  />
                  <Form.Text className="text-muted">
                    Custom cost (if different from 50% of price)
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Distributor Information</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                name="distributor_info"
                value={productFormData.distributor_info}
                onChange={handleInputChange}
              />
            </Form.Group>

            <Alert variant="info" className="mt-3">
              <strong>Note:</strong> Product visibility can be toggled directly from the product list using the Show/Hide button after the product has been created.
              {!productFormData.price && (
                <div className="mt-2">
                  <strong>Important:</strong> Products may not be visible to customers until a price is set by a sales manager.
                </div>
              )}
            </Alert>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowProductModal(false)}>
              Cancel
            </Button>
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
                  <span className="ms-2">Saving...</span>
                </>
              ) : (
                editingProductId ? 'Update Product' : 'Create Product'
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Delete Product</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Are you sure you want to delete the product "<strong>{productToDelete?.name}</strong>"?</p>
          
          <Alert variant="warning" className="mt-3">
            <h6>⚠️ Important Notes:</h6>
            <ul className="mb-0">
              <li><strong>Products that have been ordered cannot be deleted</strong> to maintain order history and data integrity.</li>
              <li>If deletion fails, consider <strong>hiding the product</strong> instead using the "Hide" button in the product list.</li>
              <li>Hidden products won't be visible to customers but preserve all order history.</li>
              <li>Only products that have never been ordered can be permanently deleted.</li>
            </ul>
          </Alert>
          
          <Alert variant="info" className="mt-2">
            <strong>Alternative:</strong> If you want to remove this product from customer view, 
            cancel this dialog and use the <Badge bg="warning">Hide</Badge> button instead.
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button variant="outline-warning" onClick={() => {
            setShowDeleteModal(false);
            handleToggleVisibility(productToDelete);
          }}>
            Hide Product Instead
          </Button>
          <Button variant="danger" onClick={handleDeleteProduct} disabled={loading}>
            {loading ? (
              <>
                <Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  role="status"
                  aria-hidden="true"
                />
                <span className="ms-2">Deleting...</span>
              </>
            ) : (
              'Permanently Delete'
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Stock Update Modal */}
      <Modal show={showStockModal} onHide={() => setShowStockModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Update Stock</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Update stock for "{productToUpdateStock?.name}"</p>
          <Form.Group>
            <Form.Label>Current Stock: {productToUpdateStock?.stock}</Form.Label>
            <Form.Control
              type="number"
              value={newStockValue}
              onChange={(e) => setNewStockValue(Math.max(0, parseInt(e.target.value) || 0))}
              min="0"
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowStockModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleUpdateStock} disabled={loading}>
            {loading ? (
              <>
                <Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  role="status"
                  aria-hidden="true"
                />
                <span className="ms-2">Updating...</span>
              </>
            ) : (
              'Update Stock'
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Category Modal */}
      <Modal show={showCategoryModal} onHide={() => setShowCategoryModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Add New Category</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmitCategory}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Name *</Form.Label>
              <Form.Control
                type="text"
                name="name"
                value={categoryFormData.name}
                onChange={handleCategoryInputChange}
                isInvalid={!!categoryFormErrors.name}
                required
              />
              <Form.Control.Feedback type="invalid">
                {categoryFormErrors.name}
              </Form.Control.Feedback>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="description"
                value={categoryFormData.description}
                onChange={handleCategoryInputChange}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowCategoryModal(false)}>
              Cancel
            </Button>
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
                  <span className="ms-2">Saving...</span>
                </>
              ) : (
                'Create Category'
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Category Delete Confirmation Modal */}
      <Modal show={showCategoryDeleteModal} onHide={() => setShowCategoryDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Delete Category</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to delete the category "{categoryToDelete?.name}"?
          <Alert variant="warning" className="mt-3">
            This action cannot be undone. Make sure there are no products in this category before deleting.
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCategoryDeleteModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDeleteCategory} disabled={loading}>
            {loading ? (
              <>
                <Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  role="status"
                  aria-hidden="true"
                />
                <span className="ms-2">Deleting...</span>
              </>
            ) : (
              'Delete Category'
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default ProductManagement;