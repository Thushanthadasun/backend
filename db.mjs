import pg from 'pg';

const pool = new pg.Pool({
  user: 'postgres',
  host: 'vscdatabase.cxaogewmsid6.ap-south-1.rds.amazonaws.com',
  database: 'service-center',
  password: 'Vehicle12345',
  port: 5432,
  ssl: {
    rejectUnauthorized: false, // Required for AWS RDS or any SSL-based connection
  },
});

export default pool;
