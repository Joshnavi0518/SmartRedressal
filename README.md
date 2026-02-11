# SmartRedressal – AI-Assisted Grievance Redressal (MERN + Python/NLTK)

SmartRedressal is a full‑stack grievance management system where citizens can raise complaints,
officers can work on them, and admins can monitor what is happening in the system.
Under the hood it uses the MERN stack plus a small Python/NLTK service to analyze complaint text.



## 🚀 What the project does

- **Secure login with JWT** and role‑based access (Citizen, Officer, Admin)
- **AI‑assisted complaint analysis** using NLP to:
  - guess the complaint category (Municipal, Healthcare, Education, etc.)
  - estimate sentiment (Positive / Neutral / Negative)
  - derive a priority (Low / Medium / High / Critical)
- **Citizen dashboard** to submit complaints and track their status over time
- **Officer dashboard** to view department‑specific complaints, assign and resolve them
- **Admin dashboard** with basic analytics and recent‑complaints overview
- **RESTful API** built with Express.js and MongoDB/Mongoose
- **Modern React UI** with a simple, responsive layout

## 📁 Project Structure

```
new_project/
├── backend/              # Node.js + Express API
│   ├── models/          # MongoDB models
│   ├── routes/          # API routes
│   ├── middleware/      # Auth & error handling
│   ├── utils/           # Helper functions
│   └── server.js        # Entry point
├── frontend/            # React application
│   ├── src/
│   │   ├── components/  # Reusable components
│   │   ├── pages/       # Page components
│   │   ├── context/     # React context
│   │   └── services/    # API service
│   └── public/
└── ai-service/          # Python Flask + NLTK service
    ├── app.py           # Flask application
    └── models/          # ML models (generated)
```

## 🛠️ Tech Stack (at a glance)

### Backend (API)
- Node.js + Express.js
- MongoDB + Mongoose
- JWT (`jsonwebtoken`) for authentication
- `bcryptjs` for password hashing
- `express-validator` for input validation
- `axios` for talking to the Python AI service

### Frontend (Web App)
- React 18 (Create React App)
- React Router DOM (role‑based routing)
- Axios (HTTP client)
- React Context API for auth state (`AuthContext`)

### AI Service (NLP helper)
- Python 3.8+
- Flask + Flask‑CORS
- scikit‑learn (TF‑IDF + Logistic Regression)
- NLTK for tokenization, stopwords, lemmatization

## 📋 Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- Python 3.8 or higher
- npm or yarn

## 🔧 Installation & setup

### 1. Clone the repository

```bash
cd new_project
```

### 2. Backend setup (Express + MongoDB)

```bash
cd backend
npm install
```

Create a `.env` file in the `backend` directory (never commit this file to Git):

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/grievance_db
JWT_SECRET=change_me_to_a_long_random_secret
JWT_EXPIRE=7d
AI_SERVICE_URL=http://localhost:8000
NODE_ENV=development
```

### 3. AI service setup (Python + NLTK)

```bash
cd ai-service
python -m venv venv

# On Windows
venv\Scripts\activate

# On Linux/Mac
source venv/bin/activate

pip install -r requirements.txt
```

### 4. Frontend setup (React)

```bash
cd frontend
npm install
```

Create a `.env` file in the `frontend` directory:

```env
REACT_APP_API_URL=http://localhost:5000/api
```

## 🚀 Running the application

### 1. Start MongoDB

Make sure MongoDB is running on your system:

```bash
# Windows (if installed as service, it should start automatically)
# Or use MongoDB Compass

# Linux/Mac
mongod
```

### 2. Start the AI service

```bash
cd ai-service
# Activate virtual environment first
python app.py
```

The AI service will run on `http://localhost:8000`

### 3. Start the backend server

```bash
cd backend
npm run dev
# or
npm start
```

The backend will run on `http://localhost:5000`

### 4. Start the frontend

```bash
cd frontend
npm start
```

The frontend will run on `http://localhost:3000`

## 👤 User roles & registration flow

The platform supports three user roles with separate login pages and slightly
different dashboards:

1. **Citizen** (`/login` or `/citizen-login`): Can submit and track complaints
2. **Officer** (`/officer-login`): Can view and manage complaints from their department
   - **Important**: Officers must select a **Domain/Department** during registration:
     - Municipal
     - Healthcare
     - Education
     - Transport
     - Utilities
     - Other
   - Officers are automatically assigned to the department matching their selected domain
3. **Admin** (`/admin-login`): Can view analytics and manage the system

### Registration process

- **Citizens**: Simple registration with name, email, and password.
- **Officers**: Must select a domain/department during registration. The system will:
  - Find or create a department for that domain
  - Assign the officer to that department
  - Allow them to see unassigned complaints from their department
- **Admins**: Standard registration (no domain required)

## 📡 API endpoints (high‑level)

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (Protected)

### Complaints
- `GET /api/complaints` - Get all complaints (filtered by role)
- `POST /api/complaints` - Create new complaint (Citizen)
- `GET /api/complaints/:id` - Get single complaint
- `PUT /api/complaints/:id/status` - Update complaint status (Officer/Admin)
- `PUT /api/complaints/:id/assign` - Assign complaint to officer (Admin/Officer)

### Departments
- `GET /api/departments` - Get all departments
- `POST /api/departments` - Create department (Admin)
- `GET /api/departments/:id` - Get single department

### Admin
- `GET /api/admin/stats` - Get dashboard statistics (Admin)
- `GET /api/admin/users` - Get all users (Admin)

### Feedback
- `POST /api/feedback` - Submit feedback (Citizen)
- `GET /api/feedback` - Get feedback (filtered by role)

### AI Service
- `POST /api/analyze` - Analyze complaint (used internally)

## 🧠 How the AI analysis works

For each complaint, the AI service receives the title and description as plain text.
It cleans the text, runs it through a small classifier, and sends back a summary:

1. **Category classification**: Uses TF‑IDF + Logistic Regression (plus keyword rules) to classify complaints into:
   - Municipal
   - Healthcare
   - Education
   - Transport
   - Utilities
   - Other

2. **Sentiment analysis**: A simple, rule‑based sentiment detector (Positive / Neutral / Negative).

3. **Priority detection**: Derives a priority (Low / Medium / High / Critical) based on:
   - Sentiment
   - Category
   - Keywords (urgent, emergency, etc.)

## 🔐 Security features (backend)

- JWT‑based authentication with access tokens
- Password hashing with `bcryptjs`
- Role‑based access control (RBAC) for routes
- Protected API endpoints behind `protect` / `authorize` middleware
- Input validation with `express-validator`
- Centralized error‑handling middleware

## 📊 Database schema (MongoDB collections)

1. **Users**: name, email, password, role, department (auto-assigned for officers based on domain), phone, address
2. **Complaints**: title, description, category, status, priority, sentiment, citizen, assignedOfficer, department, location, resolution, aiAnalysis
3. **Departments**: name, description, category, contactEmail, contactPhone, officers
4. **Feedback**: complaint, citizen, rating, comment

## 🎨 Frontend Features

- Responsive design
- Role-based routing (Citizen, Officer, Admin)
- Complaint submission and tracking
- Status updates
- Analytics dashboard
- Clean, professional UI

## 🧪 Testing

To test the application:

1. Register as a Citizen and submit a complaint
2. Register as an Officer and check assigned complaints
3. Register as an Admin to view analytics

## 📝 Environment Variables

### Backend (.env)
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/grievance_db
JWT_SECRET=your_secret_key
JWT_EXPIRE=7d
AI_SERVICE_URL=http://localhost:8000
NODE_ENV=development
```

### Frontend (.env)
```
REACT_APP_API_URL=http://localhost:5000/api
```

## 🐛 Troubleshooting

1. **MongoDB Connection Error**: Ensure MongoDB is running and the connection string is correct
2. **AI Service Not Responding**: Check if the Python service is running on port 8000
3. **CORS Errors**: Verify backend CORS settings allow frontend origin
4. **JWT Errors**: Ensure JWT_SECRET is set in backend .env



## 👨‍💻 Author

Built as a full-stack project demonstrating:
- MERN stack expertise
- AI/ML integration
- JWT authentication
- RESTful API design
- Modern React development

---

This project was built as a learning-focused full-stack system to understand
role-based authentication, AI integration, and scalable backend design.

