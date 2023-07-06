const fastify = require("fastify")();
const cors = require("@fastify/cors");
const csv = require("csv-parser");
const formBody = require("@fastify/formbody");
const pool = require("../database");

const port = process.env.PORT || 3000;
const host = "0.0.0.0";

async function routes(fastify, options) {
  fastify.register(formBody);
 fastify.register(cors, {
    origin: "*",
  });
  fastify.get("/", async (request, reply) => {
    return { hello: "world" };
  });
  fastify.get("/villages-info", async (request, reply) => {
    try {
      const client = await pool.connect();
      const result = await client.query("SELECT * FROM villages");
      const villages = result.rows;

      client.release();

      reply.code(200).send(villages);
    } catch (error) {
      console.error("Error fetching village data:", error);
      reply.code(500).send({ error: "Internal Server Error" });
    }
  });

  fastify.post("/login", async (request, reply) => {
    try {
      const { email, password } = request.body;

      console.log("Request body:", request.body); // log the request body

      const client = await pool.connect();

      const result = await client.query(
        `
        SELECT password FROM users WHERE email = $1
      `,
        [email]
      );

      console.log("Database response:", result.rows); // log the database response

      if (result.rows.length === 0) {
        reply.status(401).send({ message: "No user found with this email." });
        return;
      }

      const storedPassword = result.rows[0].password;

      if (password !== storedPassword) {
        reply.status(401).send({ message: "Incorrect password." });
        return;
      }

      reply.send({
        message: "User authenticated successfully!",
        success: true,
      });
    } catch (err) {
      console.error("Error occurred:", err);
      reply
        .status(500)
        .send({ message: "An error occurred", error: err.message });
    }
  });

fastify.get("/users/filters", async (request, reply) => {
  try {
    const { country, state, city } = request.query;
    const client = await pool.connect();
    let query = 'SELECT DISTINCT ';
    let params = [];

    const allowedFields = [
      'username',
      'dateofbirth',
      'gender',
      'tribe',
      'community',
      'city',
      'state',
      'country',
      'age'
    ];

    query += allowedFields.join(', ');

    if (!country) {
      query += ' FROM users';
    } else if (!state) {
      query += ' FROM users WHERE country = $1';
      params.push(country);
    } else if (!city) {
      query += ' FROM users WHERE country = $1 AND state = $2';
      params.push(country, state);
    } else {
      query += ' FROM users WHERE country = $1 AND state = $2 AND city = $3';
      params.push(country, state, city);
    }

    const result = await client.query(query, params);
    client.release();
    reply.code(200).send(result.rows.map(row => Object.values(row)[0]));

  } catch (error) {
    console.error("Error fetching filter options:", error);
    reply.code(500).send({ error: process.env.NODE_ENV === 'development' ? error : "Internal Server Error" });
  }
});

fastify.get("/users", async (request, reply) => {
  try {
    const { page = 1, size = 100, country, state, city, village } = request.query;
    const offset = (page - 1) * size;

    const allowedFields = [
      'username',
      'dateofbirth',
      'gender',
      'tribe',
      'community',
      'city',
      'state',
      'country',
      'age'
    ];

    let query = `SELECT ${allowedFields.join(', ')} FROM users WHERE 1=1`;
    let params = [size, offset];

    if (country) {
      params.push(country);
      query += ` AND country = $${params.length}`;
    }
    if (state) {
      params.push(state);
      query += ` AND state = $${params.length}`;
    }
    if (city) {
      params.push(city);
      query += ` AND city = $${params.length}`;
    }
    if (village) {
      params.push(village);
      query += ` AND village = $${params.length}`;
    }

    query += ' ORDER BY id LIMIT $1 OFFSET $2';

    const client = await pool.connect();
    const result = await client.query(query, params);

    const users = result.rows;

    // Query for total number of users
    const totalResult = await client.query("SELECT COUNT(*) FROM users");
    const totalUsers = totalResult.rows[0].count;

    client.release();

    reply.code(200).send({ users, total: totalUsers });
  } catch (error) {
    console.error("Error fetching user data:", error);
    reply.code(500).send({ error: process.env.NODE_ENV === 'development' ? error : "Internal Server Error" });
  }
});
  
  fastify.post("/register", async (request, reply) => {
    try {
      const {
        firstname,
        lastname,
        username,
        gender,
        dateofbirth,
        village,
        community,
        city,
        state,
        country,
        memberType,
        email,
        password, // Add the password field here
      } = request.body;

      const client = await pool.connect();

      const result = await client.query(
        `
        INSERT INTO users (
          firstname,
          lastname,
          username,
          gender,
          dateofbirth,
          village,
          community,
          city,
          state,
          country,
          membertype,
          email,
          password -- Add the password field here
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *
      `,
        [
          firstname,
          lastname,
          username,
          gender,
          dateofbirth,
          village,
          community,
          city,
          state,
          country,
          memberType,
          email,
          password, // Pass the password as is
        ]
      );

      reply.send({
        message: "User registered successfully!",
        user: result.rows[0],
      });
    } catch (err) {
      console.error("Error occurred:", err);
      reply
        .status(500)
        .send({ message: "An error occurred", error: err.message });
    }
  });
}

// fastify.register(routes);

module.exports = routes;
