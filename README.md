# Haus of Defined Beauty

> Where Beauty Is Defined

A full-stack booking platform for Haus of Defined Beauty — a nail, lash, makeup, and hair salon based in Melville, Johannesburg.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, React Router v6, Axios |
| Backend | Node.js, Express |
| Database | MongoDB (Mongoose) |
| Auth | Google OAuth 2.0 / JWT |
| Payments | Third-party gateway (R100 deposit) |
| Notifications | WhatsApp API |

## Project Structure

```
haus-of-defined-beauty/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   └── routes/
│   ├── app.js
│   ├── server.js
│   └── .env.example
└── frontend/
    ├── public/
    └── src/
        ├── Dashboards/
        ├── App.js
        └── Login.js
```

## Getting Started

### Backend

```bash
cd backend
cp .env.example .env   # fill in your credentials
npm install
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm start
```

The React app proxies API calls to `http://localhost:5000`.

## Key Business Rules

- Customers pay a **R100 non-refundable deposit** to confirm a booking.
- Cancellations within **24 hours** of the appointment forfeit the deposit.
- No double-bookings — slots are locked once confirmed.
- Admin can block dates and manage available time slots via the Calendar.

## Roles

| Role | Access |
|---|---|
| Admin | Manage bookings, calendar, services, and view reports |
| Customer | Book appointments, view booking history, manage profile |
