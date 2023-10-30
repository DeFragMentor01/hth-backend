const { Pool } = require("pg");

const pool = new Pool({
  connectionString:
    "postgres://DeFragMentor01:kKyTtNEXs76U@ep-late-silence-99758754.us-east-2.aws.neon.tech/neondb",
  ssl: {
    rejectUnauthorized: false,
  },
});

module.exports = pool;
