const express = require('express')
const bcrypt = require('bcrypt')    
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const path = require('path')
const jwt = require('jsonwebtoken');

const SECRET_KEY = 'swamikiran@1234';

const app = express()
app.use(express.json());
const dbpath = path.join(__dirname, 'travel_booking_platform.db')
let db = null

const instilationsDBAndServer = async () => {
  try {
    db = await open({
      filename: dbpath,
      driver: sqlite3.Database,
    })

    app.listen(3000, () => {
      console.log('server running at port 3000')
    })
  } catch (e) {
    console.log(`DB error ${e.message}`)
  }
}
instilationsDBAndServer()
//authentication middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token required' });

  jwt.verify(token, 'your_jwt_secret_key', (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
}
app.get('/', (request, response) => {
  const getQuery=`select * from users;`
  db.all(getQuery)
    .then((data) => {
      response.send(data)
    })
    .catch((error) => {
      response.status(500).send({ error: error.message })
    })
})
app.post('/register', async (req, res) => {
  const { name, email, password, phone, address, passportNumber } = req.body;

  if (!name || !email || !password || !phone || !address || !passportNumber) {
    return res.status(400).json({ error: 'Required fields missing.' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const query = `
      INSERT INTO Users (name, email, password, phone, address, passport_number)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    await db.run(query, [
      name,
      email,
      hashedPassword,
      phone,
      address,
      passportNumber,
    ]);


    res.status(201).json({success:true, message: 'User registered successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
})


app.post('/login', async (req, res) => {
  const { email, password } = req.body;


  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required.' });
  }

  try {

    const user = await db.get(`SELECT * FROM Users WHERE email = ?`, [email]);

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      { userId: user.user_id, email: user.email },
      SECRET_KEY,
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.user_id,
        firstName: user.name.split(' ')[0] || '',
        lastName: user.name.split(' ')[1] || '',
        email: user.email
      }
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/flights/search', async (req, res) => {
  const {
    from,
    to,
    departDate,
    returnDate,
    tripType = 'oneway',
    adults = 1,
    children = 0,
    class: travelClass = 'economy'
  } = req.query;

  if (!from || !to || !departDate) {
    return res.status(400).json({ error: 'Missing required parameters: from, to, departDate' });
  }

  const totalPassengers = parseInt(adults) + parseInt(children);

  try {
    const query = `
      SELECT 
        f.flight_id AS flightId,
        f.flight_number AS flightNumber,
        f.departure_time AS departure,
        f.arrival_time AS arrival,
        f.base_price AS price,
        f.available_seats AS availableSeats,
        f.aircraft_type,
        al.name AS airline,
        sa.code AS sourceCode,
        da.code AS destinationCode
      FROM Flights f
      JOIN Airlines al ON f.airline_id = al.airline_id
      JOIN Airports sa ON f.source_airport_id = sa.airport_id
      JOIN Airports da ON f.destination_airport_id = da.airport_id
      WHERE sa.code = ? AND da.code = ? AND DATE(f.departure_time) = ? AND f.available_seats >= ?
    `;

    const rows = await db.all(query, [from, to, departDate, totalPassengers]);

    const flights = rows.map(flight => {
      const departure = new Date(flight.departure);
      const arrival = new Date(flight.arrival);
      const durationMs = arrival - departure;
      const hours = Math.floor(durationMs / (1000 * 60 * 60));
      const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
      const duration = `${hours}h ${minutes}m`;

      return {
        flightId: flight.flightId,
        flightNumber: flight.flightNumber,
        airline: flight.airline,
        from: flight.sourceCode,
        to: flight.destinationCode,
        departure: flight.departure,
        arrival: flight.arrival,
        duration: duration,
        price: flight.price,
        availableSeats: flight.availableSeats,
        class: travelClass
      };
    });

    res.status(200).json({
      success: true,
      tripType,
      flights
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to search flights' });
  }
});

//get flight by id
app.get('/api/flights/:flightId', async (req, res) => {
    const { flightId } = req.params;
    if (!flightId) {
        return res.status(400).json({ error: 'Flight ID is required' });
    }
    const query = `
      SELECT 
        f.flight_id AS flightId,
        f.flight_number AS flightNumber,
        f.departure_time AS departure,
        f.arrival_time AS arrival,
        f.base_price AS price,
        f.available_seats AS availableSeats,
        f.aircraft_type,
        al.name AS airline,
        sa.code AS sourceCode,
        da.code AS destinationCode
      FROM Flights f
      JOIN Airlines al ON f.airline_id = al.airline_id
      JOIN Airports sa ON f.source_airport_id = sa.airport_id
      JOIN Airports da ON f.destination_airport_id = da.airport_id
      WHERE f.flight_id = ?
    `;
    const row = await db.get(query, [flightId]);
    if (!row) {
        return res.status(404).json({ error: 'Flight not found' });
    }
    res.status(200).json({ success: true, flight: row });
});


//flights/booking
app.post('/api/flights/book', authenticateToken, async (req, res) => {
  const { flightId, journeyDate, class: travelClass, passengers, contactDetails } = req.body;
  const userId = req.user.id;

  if (!flightId || !journeyDate || !Array.isArray(passengers) || passengers.length === 0 || !contactDetails) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const flight = await db.get(`SELECT * FROM Flights WHERE flight_id = ?`, [flightId]);
    if (!flight || flight.available_seats < passengers.length) {
      return res.status(400).json({ error: 'Flight not available or not enough seats' });
    }

    const pricePerPassenger = flight.base_price;
    const totalAmount = pricePerPassenger * passengers.length;
    const bookingReference = 'FL' + Math.floor(100000 + Math.random() * 900000);

    const result = await db.run(
      `INSERT INTO FlightBookings (user_id, flight_id, booking_reference, journey_date, total_fare, booking_status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, flightId, bookingReference, journeyDate, totalAmount, 'confirmed']
    );
    const bookingId = result.lastID;

    for (const p of passengers) {
      const name = `${p.title} ${p.firstName} ${p.lastName}`;
      await db.run(
        `INSERT INTO Passengers (booking_id, name, age, gender, passport_number, booking_type)
         VALUES (?, ?, ?, ?, ?, 'flight')`,
        [
          bookingId,
          name,
          p.age || 30, // fallback if age is not given
          p.gender || 'Unknown',
          p.passportNumber || ''
        ]
      );
    }

    await db.run(
      `UPDATE Flights SET available_seats = available_seats - ? WHERE flight_id = ?`,
      [passengers.length, flightId]
    );

    await db.run(
      `INSERT INTO Payments (user_id, booking_type, booking_id, amount, payment_date, status)
       VALUES (?, 'flight', ?, ?, DATETIME('now'), 'completed')`,
      [userId, bookingId, totalAmount]
    );
    res.status(201).json({
      success: true,
      bookingReference,
      totalAmount,
      bookingId
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

//get hotels by id
app.get('/api/hotels/:hotelId', async (req, res) => {
  const { hotelId } = req.params;
  if (!hotelId) {
    return res.status(400).json({ error: 'Hotel ID is required' });
  }

  const query = `SELECT * FROM hotels WHERE hostel_id = ?`;

  try {
    const row = await db.get(query, [hotelId]);
    if (!row) {
      return res.status(404).json({ error: 'Hotel not found' });
    }
    res.status(200).json({ success: true, hotel: row });
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});
//payments/confirm
app.post('/api/payments/confirm', async (req, res) => {
  const { bookingType, bookingId, amount } = req.body;


  if (!bookingType || !bookingId || !amount) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const result = await db.run(
      `INSERT INTO Payments (booking_type, booking_id, amount, payment_date, status)
       VALUES (?, ?, ?, DATETIME('now'), 'completed')`,
      [bookingType, bookingId, amount]
    );
      

    

    res.status(201).json({
      success: true,
      status: 'completed',
      paymentDate: new Date().toISOString()
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

//search airports
app.get('/api/airports', async (req, res) => {
  const { search } = req.query;

  try {
    let query = `SELECT code, name, city, country FROM Airports`;
    let params = [];

    if (search) {
      query += ` WHERE city LIKE ? OR name LIKE ?`;
      params.push(`%${search}%`, `%${search}%`);
    }

    const airports = await db.all(query, params);

    res.json({
      success: true,
      airports
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch airports' });
  }
});