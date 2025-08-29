import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new pg.Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'vscdatabase.cxaogewmsid6.ap-south-1.rds.amazonaws.com',
  database: process.env.DB_NAME || 'service-center',
  password: process.env.DB_PASSWORD || 'Vehicle12345',
  port: process.env.DB_PORT || 5432,
  ssl: {
    rejectUnauthorized: false, // Required for AWS RDS or any SSL-based connection
  },
});

export default pool;
