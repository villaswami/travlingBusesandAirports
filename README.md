# travlingBusesandAirports
This is a RESTful API built using **Node.js**, **Express.js**, and **SQLite** that powers a basic travel booking platform. It supports user authentication, flight and hotel search, bookings, and payments.

---

## 🚀 Features

- User registration and login (with hashed passwords and JWT)
- Flight search by source, destination, and date
- Book flights with passenger info
- Hotel lookup by ID
- Manage payments for bookings
- Secure routes with token-based authentication
- Search airports by name or city

---

## 🏗️ Tech Stack

- **Backend:** Node.js, Express.js
- **Database:** SQLite (with `sqlite3` and `sqlite` npm modules)
- **Authentication:** JSON Web Token (JWT)
- **Security:** bcrypt for password hashing

---

## 📁 Project Structure

.
├── app.js # Main server file with all routes
├── travel_booking_platform.db # SQLite database file

yaml
Copy
Edit

---

## 🔧 Setup Instructions

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/travel_booking_platform.git
cd travel_booking_platform
2. Install dependencies
bash
Copy
Edit
npm install
3. Initialize the database
Ensure you have a travel_booking_platform.db SQLite file with the appropriate schema. If not, you can create it and define tables such as:

Users

Flights

Airports

Airlines

FlightBookings

Passengers

Payments

Hotels

(Use your existing schema migration script or SQLite GUI to create tables.)

4. Start the server
bash
Copy
Edit
node app.js
The server will run on: http://localhost:3000

🔑 Environment Variables
Update these directly in app.js or use .env with dotenv if preferred:

js
Copy
Edit
const SECRET_KEY = 'your_jwt_secret_key';
You should change it to a secure and secret value in production.

📬 API Endpoints
Authentication
POST /register – Register a new user

POST /login – Login and receive JWT

Flights
GET /api/flights/search – Search for flights

GET /api/flights/:flightId – Get flight details

POST /api/flights/book – Book a flight (requires JWT)

Hotels
GET /api/hotels/:hotelId – Get hotel info

Payments
POST /api/payments/confirm – Confirm payment for a booking

Airports
GET /api/airports?search=cityName – Search airports by name/city

🔐 Authentication
For routes requiring authentication (e.g., booking), use the following header:

makefile
Copy
Edit
Authorization: Bearer <your_token>
🧪 Testing
You can test endpoints using tools like:

Postman

Insomnia

Make sure to add the Authorization header where required.

