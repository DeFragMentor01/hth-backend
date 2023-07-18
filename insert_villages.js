const fs = require('fs');

// Read the villages.json file
const rawData = fs.readFileSync('villages.json');
const villagesData = JSON.parse(rawData);

// Assuming you already have a PostgreSQL database connection in your app
const db = require('./database'); // Replace './your-database-connection' with the path to your database connection module

console.log('Script executed successfully!'); //yeah right

// Insert data into the villages table
async function insertData() {
  try {
    for (const village of villagesData) {
      const insertQuery = `
        INSERT INTO villages (no, province, district, village_name, latitude, longitude, area_square_meter, hectares, shape_length)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `;

      const values = [
        village.No,
        village.Province,
        village.District,
        village['Village Name'],
        village.Latitude,
        village.Longitude,
        village['Area(Square Meter)'],
        village.Hectares,
        village['Shape Length']
      ];

      // Execute the INSERT query using the existing database connection
      await db.query(insertQuery, values);
    }

    console.log('Data inserted successfully!');
  } catch (error) {
    console.error('Error inserting data:', error);
  }
}

// Call the insertData function
insertData();
