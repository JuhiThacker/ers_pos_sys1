require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0
});

(async () => {
    try {
        const connection = await pool.getConnection();
        console.log(`Database connection done successfully.`);
        connection.release();
    } catch (error) {
        console.log(`Database connection failed.`);
         console.log(error);
    }
})();

module.exports=pool;