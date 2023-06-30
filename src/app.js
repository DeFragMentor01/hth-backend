const fastify = require("fastify")();
const cors = require("@fastify/cors");
const csv = require("csv-parser");
const formBody = require("@fastify/formbody");
const pool = require("../database");

const port = process.env.PORT || 3000;
const host = "RENDER" in process.env ? `0.0.0.0` : null;

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

  fastify.get("/users", async (request, reply) => {
    try {
      const client = await pool.connect();
      const result = await client.query("SELECT * FROM users");
      const users = result.rows;

      client.release();

      reply.code(200).send(users);
    } catch (error) {
      console.error("Error fetching user data:", error);
      reply.code(500).send({ error: "Internal Server Error" });
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
        tribe,
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
          tribe,
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
          tribe,
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
