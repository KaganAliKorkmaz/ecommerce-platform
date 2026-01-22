const mysql = require("mysql2");

// Log database connection parameters (without password)
console.log('Database connection config (Docker):', {
  host: process.env.DB_HOST || 'db',
  user: process.env.DB_USER || 'root',
  database: process.env.DB_NAME || 'online_store'
});

const poolConfig = {
  host: process.env.DB_HOST || 'db',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '2001',
  database: process.env.DB_NAME || 'online_store',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 20000 // Increased connection timeout to 20 seconds
};

let pool;

const initializePool = () => {
  if (pool) {
    console.log('Pool already initialized.');
    return;
  }
  console.log('Initializing MySQL connection pool...');
  pool = mysql.createPool(poolConfig);

  pool.on('error', (err) => {
    console.error('MySQL Pool Error:', err.code, err.message);
    // More specific error handling could be added here if needed
    // For example, attempting to re-initialize the pool on certain errors.
  });

  // Test the pool with a getConnection attempt
  pool.getConnection((err, connection) => {
    if (err) {
      console.error('❌ Failed to get initial connection from pool after initialization:', err.code, err.message);
      // This indicates a more persistent issue if it happens after multiple retries
      return;
    }
    console.log('✅ Successfully got initial test connection from pool!');
    connection.query('SELECT 1 + 1 AS solution', (queryErr, results) => {
      if (queryErr) {
        console.error('❌ MySQL Initial Pool Query Error:', queryErr.message);
      } else {
        console.log('✅ Database initial pool query successful. Result:', results[0].solution);
      }
      connection.release(); // Release the connection back to the pool
    });
  });
};

const attemptInitialConnection = (retries = 10, delay = 5000) => { // Increased retries
  console.log(`Attempting initial MySQL connection to host '${poolConfig.host}'... (${retries} retries left)`);
  const tempConnection = mysql.createConnection(poolConfig);
  
  tempConnection.connect(err => {
    if (err) {
      console.error(`❌ Initial MySQL Connection Error (Attempt ${10 - retries + 1}):`, err.message, "Code:", err.code);
      tempConnection.end(); // Ensure connection is closed on error
      
      if (retries > 0 && (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT' || err.code === 'ENETUNREACH')) {
        console.log(`Retrying initial connection in ${delay / 1000} seconds due to ${err.code}...`);
        setTimeout(() => attemptInitialConnection(retries - 1, delay), delay);
      } else if (retries > 0) {
        // For other errors, retry a few times as well, but maybe with less persistence
        console.log(`Retrying initial connection for other error in ${delay / 1000} seconds...`);
        setTimeout(() => attemptInitialConnection(retries - 1, delay), delay);
      } else {
        console.error("Maximum retry attempts for initial connection reached. Will attempt to initialize pool anyway.");
        initializePool(); // Attempt to initialize pool even if direct connection fails after retries
      }
      return;
    }
    console.log("✅ Initial direct MySQL connection successful!");
    tempConnection.end();
    initializePool(); // Initialize the pool once a direct connection is successful
  });

  tempConnection.on('error', (err) => {
    // This handles async errors from the temporary connection itself, though less common with connect
    console.error('Async error on temporary connection:', err.code, err.message);
    // We might not retry here as the connect callback should handle most cases
  });
};

if (!pool) { // Ensure we only attempt to connect and initialize once
  attemptInitialConnection();
} else {
  console.log('Connection pool already seems to be initializing or initialized.');
}

// Export a function that returns the promise-based interface of the pool
module.exports = () => {
  if (!pool) {
    // This case should ideally not be hit if attemptInitialConnection leads to initializePool
    console.warn('Pool not yet initialized when db module was required! You might get errors. Forcing initialization.');
    initializePool();
  }
  return pool.promise();
}; 