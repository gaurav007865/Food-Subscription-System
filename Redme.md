# 🍱 TiffinHub - Smart Tiffin Subscription & Food Donation Platform

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Google Apps Script](https://img.shields.io/badge/Google%20Apps%20Script-4285F4?style=for-the-badge&logo=google&logoColor=white)
![Google Sheets](https://img.shields.io/badge/Google%20Sheets-34A853?style=for-the-badge&logo=google-sheets&logoColor=white)

---

# 📌 Project Overview

TiffinHub is a complete web-based food subscription platform that connects users with local homemade tiffin providers while also supporting food donation management for NGOs.

The platform contains two separate portals:

- 👤 User Portal
- 👨‍💼 Admin Dashboard

The backend is powered entirely by Google Apps Script and Google Sheets, eliminating the need for traditional server infrastructure.

---

# ✨ Key Features

## 👤 User Portal

- User Registration
- User Login
- Password Hashing (SHA-256)
- Persistent Login using LocalStorage
- Responsive Landing Page
- Authentication Modal
- Toast Notifications
- Explore Tiffins
- Food Donation Section
- Modern UI Design

---

## 👨‍💼 Admin Dashboard

Complete enterprise dashboard including:

### 📊 KPI Dashboard

- Total Revenue
- Total Orders
- Active Subscriptions
- Registered Users

---

### 📦 Live Order Management

Admin can

- View all orders
- Change order status
- Track deliveries

Supported statuses:

- Order Confirmed
- Preparing
- Out for Delivery
- Delivered

---

### 🍱 Tiffin Management

Admin can

- Add New Tiffin
- Delete Tiffin
- Toggle Availability
- View Catalog

Each tiffin contains

- Provider Name
- Meal Type
- Price
- Location
- Image URL
- Availability

---

### 📅 Subscription Management

Admin can monitor

- Active Plans
- Expired Plans
- Plan Type
- Total Cost
- Subscription Duration

---

### ❤️ Food Donation Management

Admin can

- View Food Donations
- Assign NGOs
- Match Donations
- Update Donation Status

---

### 👥 User Management

Admin can

- View Registered Users
- Email
- Phone Number
- Registration Date

---

# 🔐 Authentication

## User Authentication

- Register
- Login
- SHA-256 Password Hashing
- Local Storage Session

---

## Admin Authentication

Separate admin login system.

Admin session is stored using

```
localStorage
```

---

# 🛠 Technology Stack

## Frontend

- HTML5
- CSS3
- Vanilla JavaScript

---

## Backend

Google Apps Script

---

## Database

Google Sheets

---

## Authentication

- SHA-256 Password Encryption
- LocalStorage Session

---

## API

REST API using Google Apps Script Web App

---

# 📂 Project Structure

```
TiffinHub
│
├── index.html
├── admin.html
├── style.css
├── script.js
├── README.md
│
└── Google Apps Script
      ├── Code.gs
      ├── User APIs
      ├── Admin APIs
      └── Google Sheets
```

---

# ⚙️ Google Sheets Database

Suggested Sheets

```
Users

Orders

Tiffins

Subscriptions

Donations

Admins
```

---

# 📡 API Architecture

Frontend

↓

JavaScript Fetch API

↓

Google Apps Script

↓

Google Sheets

↓

JSON Response

---

# 🔄 User Flow

```
Open Website

↓

Register/Login

↓

Browse Tiffins

↓

Order Food

↓

Subscription

↓

Track Order

↓

Receive Delivery
```

---

# 🔄 Admin Flow

```
Admin Login

↓

Dashboard

↓

View KPIs

↓

Manage Orders

↓

Manage Tiffins

↓

Manage Users

↓

Manage Donations

↓

Logout
```

---

# 🔒 Security Features

✔ SHA-256 Password Hashing

✔ Separate Admin Authentication

✔ Persistent Sessions

✔ REST API Communication

✔ Input Validation

✔ Toast Notifications

---

# 🎯 Main Functional Modules

## User Module

- Registration
- Login
- Session
- Explore Meals

---

## Admin Module

- Dashboard
- Orders
- Tiffins
- Users
- Donations
- Subscriptions

---

## Food Donation Module

- NGO Assignment
- Donation Tracking

---

## Subscription Module

- Active Plans
- Monthly Plans
- Renewal Tracking

---

# 📊 Dashboard KPIs

The Admin Dashboard displays

- Revenue
- Orders
- Users
- Active Subscriptions

---

# 🎨 UI Highlights

- Responsive Layout
- Clean Dashboard
- Modern Cards
- Professional Tables
- Icons
- Toast Messages
- Sticky Header
- Navigation Tabs

---

# 🚀 Installation

## Clone Repository

```bash
git clone https://github.com/yourusername/TiffinHub.git
```

---

## Open Project

Simply open

```
index.html
```

or

```
admin.html
```

in browser.

---

## Configure API

Inside

```
script.js
```

Replace

```javascript
const API_URL="YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE";
```

with your deployed Google Apps Script Web App URL.

Similarly update the Admin API URL in `admin.html`.

---

# 🌐 Deployment

Can be hosted on

- GitHub Pages
- Netlify
- Vercel
- Firebase Hosting

Backend remains on Google Apps Script.

---

# 📸 Screens Included

- Landing Page
- Login Modal
- Registration
- Admin Dashboard
- KPI Cards
- Orders
- Tiffins
- Donations
- Users
- Subscriptions

---

# 🚧 Future Improvements

- Online Payments
- Google Maps Integration
- Delivery Tracking
- Push Notifications
- Email Verification
- OTP Login
- Admin Analytics Charts
- Customer Reviews
- AI Food Recommendation
- Coupon System
- Wallet Integration
- Dark Mode
- Multi-language Support
- Mobile App (Flutter)

---

# 🎓 Learning Outcomes

This project demonstrates

- REST API Integration
- Authentication
- CRUD Operations
- Google Apps Script
- Google Sheets Database
- Session Management
- Responsive UI
- Dashboard Development
- JavaScript Fetch API
- Enterprise Admin Panel

---

# 📄 License

This project is developed for educational and learning purposes.

Feel free to modify and extend it.

---

# 👨‍💻 Author

**Developed by**

**Gaurav Kanade**

---

# ⭐ Support

If you like this project,

⭐ Star the repository

🍴 Fork it

🛠 Contribute

📢 Share with others

---
# Deployment Link
https://armain.netlify.app/


---
# 🙏 Thank You

Thank you for exploring **TiffinHub**.

Making homemade food accessible while reducing food waste through technology.