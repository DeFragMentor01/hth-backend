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

  fastify.get("/countries", async (request, reply) => {
    const client = await pool.connect();

    try {
      const res = await client.query("SELECT * FROM countries");
      reply.send(res.rows);
    } catch (err) {
      console.error("Error occurred:", err);
      reply
        .status(500)
        .send({ message: "An error occurred", error: err.message });
    } finally {
      client.release();
    }
  });

  fastify.get("/provinces/:country_id", async (request, reply) => {
    const { country_id } = request.params;
    const client = await pool.connect();

    try {
      const res = await client.query(
        "SELECT * FROM provinces WHERE country_id = $1",
        [country_id]
      );
      reply.send(res.rows);
    } catch (err) {
      console.error("Error occurred:", err);
      reply
        .status(500)
        .send({ message: "An error occurred", error: err.message });
    } finally {
      client.release();
    }
  });

  // Get list of districts for a specific city
  fastify.get("/districts/:province_id", async (request, reply) => {
    const { province_id } = request.params;
    const client = await pool.connect();

    try {
      const res = await client.query(
        "SELECT * FROM districts WHERE province_id = $1",
        [province_id]
      );
      reply.send(res.rows);
    } catch (err) {
      console.error("Error occurred:", err);
      reply
        .status(500)
        .send({ message: "An error occurred", error: err.message });
    } finally {
      client.release();
    }
  });

  // Get list of villages for a specific district
  fastify.get("/villages/:district_id", async (request, reply) => {
    const { district_id } = request.params;
    const client = await pool.connect();

    try {
      const res = await client.query(
        "SELECT * FROM villages WHERE district_id = $1",
        [district_id]
      );
      reply.send(res.rows);
    } catch (err) {
      console.error("Error occurred:", err);
      reply
        .status(500)
        .send({ message: "An error occurred", error: err.message });
    } finally {
      client.release();
    }
  });

  fastify.get("/villages", async (request, reply) => {
    const { country_id, province_id, district_id } = request.query;
    const client = await pool.connect();

    const query = `
    SELECT v.* 
    FROM countries AS c
    JOIN provinces AS p ON c.id = p.country_id
    JOIN districts AS d ON p.id = d.province_id
    JOIN villages AS v ON d.id = v.district_id
    WHERE 
      (c.id = $1 OR $1 IS NULL) AND 
      (p.id = $2 OR $2 IS NULL) AND 
      (d.id = $3 OR $3 IS NULL);
  `;
    const params = [country_id, province_id, district_id];

    try {
      const res = await client.query(query, params);
      reply.send(res.rows);
    } catch (err) {
      console.error("Error occurred:", err);
      reply
        .status(500)
        .send({ message: "An error occurred", error: err.message });
    } finally {
      client.release();
    }
  });

  // Get the count of villages in a specific country
  fastify.get("/villages/count/country/:country_id", async (request, reply) => {
    const { country_id } = request.params;
    const client = await pool.connect();

    try {
      const res = await client.query(
        `
      SELECT COUNT(*) AS count 
      FROM countries AS c 
      JOIN provinces AS p ON c.id = p.country_id
      JOIN districts AS d ON p.id = d.province_id
      JOIN villages AS v ON d.id = v.district_id
      WHERE c.id = $1
    `,
        [country_id]
      );

      reply.send(res.rows[0]);
    } catch (err) {
      console.error("Error occurred:", err);
      reply
        .status(500)
        .send({ message: "An error occurred", error: err.message });
    } finally {
      client.release();
    }
  });

  // Get the count of villages in a specific province
  fastify.get(
    "/villages/count/province/:province_id",
    async (request, reply) => {
      const { province_id } = request.params;
      const client = await pool.connect();

      try {
        const res = await client.query(
          `
      SELECT COUNT(*) AS count 
      FROM provinces AS p
      JOIN districts AS d ON p.id = d.province_id
      JOIN villages AS v ON d.id = v.district_id
      WHERE p.id = $1
    `,
          [province_id]
        );

        reply.send(res.rows[0]);
      } catch (err) {
        console.error("Error occurred:", err);
        reply
          .status(500)
          .send({ message: "An error occurred", error: err.message });
      } finally {
        client.release();
      }
    }
  );

  // Get the count of villages in a specific district
  fastify.get(
    "/villages/count/district/:district_id",
    async (request, reply) => {
      const { district_id } = request.params;
      const client = await pool.connect();

      try {
        const res = await client.query(
          `
      SELECT COUNT(*) AS count 
      FROM districts AS d
      JOIN villages AS v ON d.id = v.district_id
      WHERE d.id = $1
    `,
          [district_id]
        );

        reply.send(res.rows[0]);
      } catch (err) {
        console.error("Error occurred:", err);
        reply
          .status(500)
          .send({ message: "An error occurred", error: err.message });
      } finally {
        client.release();
      }
    }
  );

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
      let query = "SELECT DISTINCT ";
      let params = [];

      const allowedFields = [
        "username",
        "dateofbirth",
        "gender",
        "tribe",
        "community",
        "city",
        "state",
        "country",
        "age",
      ];

      query += allowedFields.join(", ");

      if (!country) {
        query += " FROM users";
      } else if (!state) {
        query += " FROM users WHERE country = $1";
        params.push(country);
      } else if (!city) {
        query += " FROM users WHERE country = $1 AND state = $2";
        params.push(country, state);
      } else {
        query += " FROM users WHERE country = $1 AND state = $2 AND city = $3";
        params.push(country, state, city);
      }

      const result = await client.query(query, params);
      client.release();
      reply.code(200).send(result.rows.map((row) => Object.values(row)[0]));
    } catch (error) {
      console.error("Error fetching filter options:", error);
      reply
        .code(500)
        .send({
          error:
            process.env.NODE_ENV === "development"
              ? error
              : "Internal Server Error",
        });
    }
  });

  fastify.get("/users", async (request, reply) => {
    try {
      const {
        page = 1,
        size = 100,
        country,
        state,
        city,
        village,
        community,
        gender,
        age,
        ageRange,
        verified,
        name,
      } = request.query;
      const offset = (page - 1) * size;
  
      const allowedFields = [
        "username",
        "firstname",
        "lastname",
        "gender",
        "community",
        "city",
        "state",
        "country",
        "village",
        "verified",
        "computed_age",
      ];
  
      let query = `SELECT ${allowedFields.join(", ")} FROM (
          SELECT *, DATE_PART('year', AGE(dateofbirth)) AS computed_age 
          FROM users
        ) users_with_age WHERE 1=1`;
      let countQuery = `SELECT COUNT(*) FROM (
          SELECT *, DATE_PART('year', AGE(dateofbirth)) AS computed_age 
          FROM users
        ) users_with_age WHERE 1=1`;
  
      let params = [size, offset];
      let countParams = [];
  
      if (country) {
        params.push(country);
        countParams.push(country);
        query += ` AND country = $${params.length}`;
        countQuery += ` AND country = $${countParams.length}`;
      }
      if (state) {
        params.push(state);
        countParams.push(state);
        query += ` AND state = $${params.length}`;
        countQuery += ` AND state = $${countParams.length}`;
      }
      if (city) {
        params.push(city);
        countParams.push(city);
        query += ` AND city = $${params.length}`;
        countQuery += ` AND city = $${countParams.length}`;
      }
      if (village) {
        params.push(village);
        countParams.push(village);
        query += ` AND village = $${params.length}`;
        countQuery += ` AND village = $${countParams.length}`;
      }
      if (community) {
        params.push(community);
        countParams.push(community);
        query += ` AND community = $${params.length}`;
        countQuery += ` AND community = $${countParams.length}`;
      }
      if (gender) {
        params.push(gender);
        countParams.push(gender);
        query += ` AND gender = $${params.length}`;
        countQuery += ` AND gender = $${countParams.length}`;
      }
      if (age) {
        params.push(age);
        countParams.push(age);
        query += ` AND computed_age = $${params.length}`;
        countQuery += ` AND computed_age = $${countParams.length}`;
      }
      if (ageRange) {
        const [minAge, maxAge] = ageRange.split("-");
        params.push(minAge, maxAge);
        countParams.push(minAge, maxAge);
        query += ` AND computed_age BETWEEN $${params.length - 1} AND $${params.length}`;
        countQuery += ` AND computed_age BETWEEN $${countParams.length - 1} AND $${countParams.length}`;
      }
      if (verified !== undefined) {
        params.push(verified === "true" ? true : false);
        countParams.push(verified === "true" ? true : false);
        query += ` AND verified = $${params.length}`;
        countQuery += ` AND verified = $${countParams.length}`;
      }
      if (name) {
        params.push(`%${name}%`);
        countParams.push(`%${name}%`);
        query += ` AND (firstname ILIKE $${params.length} OR lastname ILIKE $${params.length})`;
        countQuery += ` AND (firstname ILIKE $${countParams.length} OR lastname ILIKE $${countParams.length})`;
      }
  
      query += " ORDER BY id LIMIT $1 OFFSET $2";
  
      const client = await pool.connect();
      const result = await client.query(query, params);
  
      const users = result.rows;
  
      // Query for total number of users matching the filter
      const filterTotalResult = await client.query(countQuery, countParams);
      const filterTotalUsers = filterTotalResult.rows[0].count;
  
      // Query for total number of users
      const totalResult = await client.query("SELECT COUNT(*) FROM users");
      const totalUsers = totalResult.rows[0].count;
  
      client.release();
  
      reply
        .code(200)
        .send({ users, total: totalUsers, filterTotal: filterTotalUsers });
    } catch (error) {
      console.error("Error fetching user data:", error);
      reply
        .code(500)
        .send({
          error:
            process.env.NODE_ENV === "development"
              ? error
              : "Internal Server Error",
        });
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

  // Get all countries
  fastify.get("/user-countries", async (request, reply) => {
    const query = "SELECT DISTINCT country FROM users ORDER BY country";

    const client = await pool.connect();
    const result = await client.query(query);
    client.release();

    const countries = result.rows.map((row) => row.country);

    reply.send(countries);
  });

  // Get states by country
  fastify.get("/user-states", async (request, reply) => {
    const { country } = request.query;

    const query =
      "SELECT DISTINCT state FROM users WHERE country = $1 AND state IS NOT NULL ORDER BY state";

    const client = await pool.connect();
    // Pass the `country` value in as a parameter to the query
    const result = await client.query(query, [country]);
    client.release();

    const { rows } = result;
    const states = rows.map((row) => row.state);

    reply.send(states);
  });

  // Get cities by state
  fastify.get("/user-cities", async (request, reply) => {
    const { state } = request.query;

    const query =
      "SELECT DISTINCT city FROM users WHERE state = $1 AND city IS NOT NULL ORDER BY city";

    const client = await pool.connect();
    const result = await client.query(query, [state]);
    client.release();

    const { rows } = result;
    const cities = rows.map((row) => row.city);

    reply.send(cities);
  });

  // Get communities by state
  fastify.get("/user-communities", async (request, reply) => {
    const { state } = request.query;

    const query =
      "SELECT DISTINCT community FROM users WHERE state = $1 AND community IS NOT NULL ORDER BY community";

    const client = await pool.connect();
    const result = await client.query(query, [state]);
    client.release();

    const { rows } = result;
    const communities = rows.map((row) => row.community);

    reply.send(communities);
  });

  // Get villages by community
  fastify.get("/user-villages", async (request, reply) => {
    const { community } = request.query;

    const query =
      "SELECT DISTINCT village FROM users WHERE community = $1 AND village IS NOT NULL ORDER BY village";

    const client = await pool.connect();
    const result = await client.query(query, [community]);
    client.release();

    const { rows } = result;
    const villages = rows.map((row) => row.village);

    reply.send(villages);
  });
}

// fastify.register(routes);

module.exports = routes;
