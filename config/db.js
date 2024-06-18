import mysql from "mysql2";
import dotenv from "dotenv";

dotenv.config();

// Create a connection pool instead of a single connection
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true, // Ensures that requests will queue if no connection is immediately available
    connectionLimit: 100, // Set the maximum number of connections that can be opened simultaneously
    queueLimit: 0 // Set the maximum number of requests that can be queued when all connections are in use (0 means no limit)
});

// Test the pool by fetching a connection and testing a simple query
pool.getConnection((err, connection) => {
    if (err) {
        console.error("Error getting connection from pool:", err);
        return;
    }
    console.log("Connected to the database using connection pool.");

    // Release the connection back to the pool
    connection.release();

    // Optional: You could perform a simple query here to test the connection
    // connection.query('SELECT 1 + 1 AS solution', (error, results, fields) => {
    //     if (error) throw error;
    //     console.log('Test query result:', results[0].solution); // Should log 2
    //     connection.release(); // Return the connection to the pool
    // });
});

export default pool;
