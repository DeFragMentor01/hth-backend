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
  
fastify.get('/countries', async (request, reply) => {
  const client = await pool.connect();
  
  try {
    const res = await client.query('SELECT * FROM countries')
    reply.send(res.rows)
  } catch (err) {
    console.error('Error occurred:', err)
    reply.status(500).send({ message: 'An error occurred', error: err.message })
  } finally {
    client.release()
  }
});

fastify.get('/provinces/:country_id', async (request, reply) => {
  const { country_id } = request.params
  const client = await pool.connect();

  try {
    const res = await client.query('SELECT * FROM provinces WHERE country_id = $1', [country_id])
    reply.send(res.rows)
  } catch (err) {
    console.error('Error occurred:', err)
    reply.status(500).send({ message: 'An error occurred', error: err.message })
  } finally {
    client.release()
  }
});

// Get list of districts for a specific city
fastify.get('/districts/:province_id', async (request, reply) => {
  const { province_id } = request.params
  const client = await pool.connect();

  try {
    const res = await client.query('SELECT * FROM districts WHERE province_id = $1', [province_id])
    reply.send(res.rows)
  } catch (err) {
    console.error('Error occurred:', err)
    reply.status(500).send({ message: 'An error occurred', error: err.message })
  } finally {
    client.release()
  }
});

// Get list of villages for a specific district
fastify.get('/villages/:district_id', async (request, reply) => {
  const { district_id } = request.params
  const client = await pool.connect();

  try {
    const res = await client.query('SELECT * FROM villages WHERE district_id = $1', [district_id])
    reply.send(res.rows)
  } catch (err) {
    console.error('Error occurred:', err)
    reply.status(500).send({ message: 'An error occurred', error: err.message })
  } finally {
    client.release()
  }
});

fastify.get('/villages', async (request, reply) => {
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
    console.error('Error occurred:', err);
    reply.status(500).send({ message: 'An error occurred', error: err.message });
  } finally {
    client.release();
  }
});

  // Get the count of villages in a specific country
fastify.get('/villages/count/country/:country_id', async (request, reply) => {
  const { country_id } = request.params
  const client = await pool.connect();

  try {
    const res = await client.query(`
      SELECT COUNT(*) AS count 
      FROM countries AS c 
      JOIN provinces AS p ON c.id = p.country_id
      JOIN districts AS d ON p.id = d.province_id
      JOIN villages AS v ON d.id = v.district_id
      WHERE c.id = $1
    `, [country_id])

    reply.send(res.rows[0])
  } catch (err) {
    console.error('Error occurred:', err)
    reply.status(500).send({ message: 'An error occurred', error: err.message })
  } finally {
    client.release()
  }
});

// Get the count of villages in a specific province
fastify.get('/villages/count/province/:province_id', async (request, reply) => {
  const { province_id } = request.params
  const client = await pool.connect();

  try {
    const res = await client.query(`
      SELECT COUNT(*) AS count 
      FROM provinces AS p
      JOIN districts AS d ON p.id = d.province_id
      JOIN villages AS v ON d.id = v.district_id
      WHERE p.id = $1
    `, [province_id])

    reply.send(res.rows[0])
  } catch (err) {
    console.error('Error occurred:', err)
    reply.status(500).send({ message: 'An error occurred', error: err.message })
  } finally {
    client.release()
  }
});

// Get the count of villages in a specific district
fastify.get('/villages/count/district/:district_id', async (request, reply) => {
  const { district_id } = request.params
  const client = await pool.connect();

  try {
    const res = await client.query(`
      SELECT COUNT(*) AS count 
      FROM districts AS d
      JOIN villages AS v ON d.id = v.district_id
      WHERE d.id = $1
    `, [district_id])

    reply.send(res.rows[0])
  } catch (err) {
    console.error('Error occurred:', err)
    reply.status(500).send({ message: 'An error occurred', error: err.message })
  } finally {
    client.release()
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
      'firstname',
      'lastname',
      'dateofbirth',
      'gender',
      'community',
      'city',
      'state',
      'country',
      'village'
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
  
  // Get states by country
fastify.get('/states', async (request, reply) => {
  const { country } = request.query;

  const query = 'SELECT DISTINCT state FROM users WHERE country = $1 AND state IS NOT NULL ORDER BY state';

  const client = await pool.connect();
  // Pass the `country` value in as a parameter to the query
  const result = await client.query(query, [country]);
  client.release();

  const { rows } = result;
  const states = rows.map(row => row.state);

  reply.send(states);
}); 

}

// fastify.register(routes);

module.exports = routes;
