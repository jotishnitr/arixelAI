<div align="center">

  <!-- Project Logo / Banner Placeholder -->
  <h1>⚡ ArixelAI</h1>
  <p><strong>Next-Generation Conversational Intelligence Platform</strong></p>

  <p>
    A full-stack, multimodal AI chat application built from the ground up featuring the custom <strong>ArixelCore-1o</strong> engine, enterprise-grade authentication, persistent session context, and an ultra-responsive interface.
  </p>

  <p>
    <a href="https://jotishnitr.github.io/arixelAI/"><strong>Explore Live Demo »</strong></a>
  </p>

  <!-- Badges -->
  <p>
    <img src="https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React 19" />
    <img src="https://img.shields.io/badge/Vite-8.0-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite 8" />
    <img src="https://img.shields.io/badge/Node.js-Express_5-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node Express" />
    <img src="https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB" />
    <img src="https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge" alt="License MIT" />
  </p>
</div>

---

## 📑 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Architecture & Tech Stack](#-architecture--tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation & Setup](#installation--setup)
  - [Environment Configuration](#environment-configuration)
- [Security & Authentication](#-security--authentication)
- [Roadmap](#-roadmap)
- [Author & License](#-author--license)

---

## 🌟 Overview

**ArixelAI** provides an end-to-end alternative to proprietary chat interfaces, combining a bespoke conversational model persona with a scalable micro-architecture. Designed to deliver zero-latency experiences, it handles image inputs, maintains real-time cross-message context, and stores full conversational histories securely in the cloud.

> [!TIP]
> Try out the live deployment directly in your browser: **[jotishnitr.github.io/arixelAI](https://jotishnitr.github.io/arixelAI/)**

---

## ✨ Key Features

<table>
  <tr>
    <td width="50%">
      <h3>🤖 ArixelCore-1o Intelligence</h3>
      <ul>
        <li><strong>Custom AI Persona:</strong> Tailored responses powered by the core ArixelCore-1o engine.</li>
        <li><strong>Multimodal Processing:</strong> Send and analyze images alongside complex text prompts.</li>
        <li><strong>Auto-Thread Summarization:</strong> Generates clean 3–5 word session titles automatically on your first message.</li>
      </ul>
    </td>
    <td width="50%">
      <h3>💬 Persistent Session Engine</h3>
      <ul>
        <li><strong>Full Context Memory:</strong> Maintains historical context throughout long multi-turn sessions.</li>
        <li><strong>MongoDB Storage:</strong> User-isolated thread histories stored with rapid indexing.</li>
        <li><strong>Sidebar Session Manager:</strong> Effortlessly switch, search, and resume past chats.</li>
      </ul>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <h3>🔐 Robust Authentication</h3>
      <ul>
        <li><strong>Dual-Auth Pipeline:</strong> Native email/password (bcrypt with 10 salt rounds) + Google OAuth 2.0.</li>
        <li><strong>Cross-Origin Security:</strong> Secure JWT cookies configured with <code>SameSite: None; Secure: true</code>.</li>
        <li><strong>Route Guards:</strong> Express-level middleware securing chat history and profile endpoints.</li>
      </ul>
    </td>
    <td width="50%">
      <h3>👤 Account & Profile Control</h3>
      <ul>
        <li><strong>Profile Management:</strong> View and update personal details (country, mobile, age, preferences).</li>
        <li><strong>Markdown Rendering:</strong> Rich code block formatting, syntax styling, and math syntax via <code>react-markdown</code>.</li>
      </ul>
    </td>
  </tr>
</table>

---

## 🛠️ Architecture & Tech Stack

┌─────────────────────────────────────────────────────────────┐ │ Client (React 19 + Vite) │ │ - react-markdown Renderer - Custom Dark Theme UI │ │ - Session History Manager - Image Upload Pipeline │ └──────────────────────────────┬──────────────────────────────┘ │ HTTPS / Cross-Origin Cookies ┌──────────────────────────────▼──────────────────────────────┐ │ Server (Node.js + Express 5) │ │ - Auth Middleware (JWT) - OAuth 2.0 (Passport.js) │ │ - Context Sanitization - Thread Title Generator │ └──────────────────────────────┬──────────────────────────────┘ │ Mongoose Driver ┌──────────────────────────────▼──────────────────────────────┐ │ Database (MongoDB Atlas) │ │ - User Collections - Chat Threads & Messages │ └─────────────────────────────────────────────────────────────┘


### Stack Breakdown

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, Vite 8, `react-markdown`, Babel Compiler, Custom CSS3 |
| **Backend** | Node.js, Express 5, Passport.js (`passport-google-oauth20`) |
| **Database** | MongoDB, Mongoose ODM |
| **Security** | JSON Web Tokens (JWT), Bcrypt, Cookie-Parser, Express-Session, CORS |

---

## 📁 Project Structure


arixelAI/
├── 📁 client/                 # React 19 SPA (Vite)
│   ├── 📁 src/
│   │   ├── 📁 components/     # UI Components (ChatArea, Sidebar, Modals)
│   │   ├── 📁 context/        # Global Auth & Chat State
│   │   ├── 📁 styles/         # Custom CSS & Design Tokens
│   │   └── App.jsx            # Core Application Root
│   └── package.json
│
└── 📁 server/                 # Express 5 REST API
    ├── 📁 config/             # DB & Passport Configurations
    ├── 📁 controllers/        # Chat, Auth, and Profile Controllers
    ├── 📁 middleware/         # JWT Verification & CORS Configuration
    ├── 📁 models/             # Mongoose Schemas (User, Thread, Message)
    ├── 📁 routes/             # API Route Endpoints
    ├── server.js              # Entrypoint
    └── package.json
🚀 Getting Started
Prerequisites
Ensure you have the following installed locally:

Node.js (v18.x or later recommended)
MongoDB (Local instance or MongoDB Atlas URI)
Google Cloud Console Project (for OAuth 2.0 Credentials)
Installation & Setup
Clone the repository

git clone https://github.com/jotishnitr/arixelAI.git
cd arixelAI
Setup the Backend Server

cd server
npm install
Setup the Frontend Client

cd ../client
npm install
Environment Configuration
Create a .env file in the server/ directory:

# Database & Core
PORT=5000
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/arixelAI
SESSION_SECRET=your_super_secret_session_key
JWT_SECRET=your_jwt_signing_key

# External AI Provider
AI_API_KEY=your_model_api_key

# Google OAuth 2.0 Credentials
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
CALLBACK_URL=http://localhost:5000/api/auth/google/callback

# Client Origin (CORS)
CLIENT_URL=http://localhost:5173
Running the Application
Start the backend server:

cd server
npm run dev    # or npm start
Start the Vite frontend development server:

cd ../client
npm run dev
Open your browser at http://localhost:5173.

🔒 Security & Authentication
Cross-Origin Cookie Architecture: Session cookies utilize SameSite=None and Secure=true headers to facilitate cross-domain authentication between isolated static frontends (GitHub Pages) and cloud backends (Render).
Password Salting: Passwords hashed with standard 10-round bcrypt routines.
Route Isolation: Private endpoints guarded by strict JWT verification middleware.
👨‍💻 Author & Credits
Designed and maintained by Jotish Kumar (@jotishnitr).

Founder & Lead Developer of ArixelAI.

📄 License
This project is licensed under the MIT License — see the LICENSE file for details.


