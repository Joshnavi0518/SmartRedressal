# AI-Based Grievance Redressal & Analytics Platform

A  full-stack grievance management system built with MERN stack, JWT authentication, and AI-powered complaint analysis.

## 🚀 Features

- **JWT Authentication** with role-based access control (Citizen, Officer, Admin)
- **AI-Powered Analysis** using NLP for:
  - Automatic complaint category classification
  - Sentiment analysis
  - Priority detection
- **Citizen Dashboard**: Submit and track complaints
- **Officer Dashboard**: Manage assigned complaints and update status
- **Admin Dashboard**: Comprehensive analytics and monitoring
- **RESTful API** with Express.js
- **MongoDB** database with proper schema design
- **Modern React UI** with responsive design

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
└── ai-service/          # Python FastAPI service
    ├── app.py           # FastAPI application
    └── models/          # ML models (generated)
```

## 🛠️ Tech Stack

### Backend
- Node.js + Express.js
- MongoDB + Mongoose
- JWT (jsonwebtoken)
- bcryptjs for password hashing
- Axios for AI service communication

### Frontend
- React 18
- React Router DOM
- Axios
- Context API for state management

### AI Service
- Python 3.8+
- FastAPI
- scikit-learn (TF-IDF + Logistic Regression)
- NLTK for text preprocessing

## 📋 Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- Python 3.8 or higher
- npm or yarn

## 🔧 Installation & Setup

### 1. Clone the repository

```bash
cd new_project
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in the `backend` directory:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/grievance_db
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRE=7d
AI_SERVICE_URL=http://localhost:8000
NODE_ENV=development
```

### 3. AI Service Setup

```bash
cd ai-service
python -m venv venv

# On Windows
venv\Scripts\activate

# On Linux/Mac
source venv/bin/activate

pip install -r requirements.txt
```

### 4. Frontend Setup

```bash
cd frontend
npm install
```

Create a `.env` file in the `frontend` directory:

```env
REACT_APP_API_URL=http://localhost:5000/api
```

## 🚀 Running the Application

### 1. Start MongoDB

Make sure MongoDB is running on your system:

```bash
# Windows (if installed as service, it should start automatically)
# Or use MongoDB Compass

# Linux/Mac
mongod
```

### 2. Start AI Service

```bash
cd ai-service
# Activate virtual environment first
python app.py
```

The AI service will run on `http://localhost:8000`

### 3. Start Backend Server

```bash
cd backend
npm run dev
# or
npm start
```

The backend will run on `http://localhost:5000`

### 4. Start Frontend

```bash
cd frontend
npm start
```

The frontend will run on `http://localhost:3000`

## 👤 User Roles & Registration

The platform supports three user roles with separate login pages:

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

### Registration Process

- **Citizens**: Simple registration with name, email, password
- **Officers**: Must select a domain/department during registration. The system will:
  - Find or create a department for that domain
  - Assign the officer to that department
  - Allow them to see unassigned complaints from their department
- **Admins**: Standard registration (no domain required)

## 📡 API Endpoints

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

## 🧠 AI Analysis

The AI service automatically analyzes each complaint:

1. **Category Classification**: Uses TF-IDF + Logistic Regression to classify complaints into:
   - Municipal
   - Healthcare
   - Education
   - Transport
   - Utilities
   - Other

2. **Sentiment Analysis**: Rule-based sentiment detection (Positive/Neutral/Negative)

3. **Priority Detection**: Determines priority (Low/Medium/High/Critical) based on:
   - Sentiment
   - Category
   - Keywords (urgent, emergency, etc.)

## 🔐 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Role-based access control (RBAC)
- Protected routes
- Input validation
- Error handling middleware

## 📊 Database Schema

### Collections

1. **Users**: name, email, password, role, department (auto-assigned for officers based on domain), phone, address
2. **Complaints**: title, description, category, status, priority, sentiment, citizen, assignedOfficer, department, location, resolution, aiAnalysis
3. **Departments**: name, description, category, contactEmail, contactPhone, officers
4. **Feedback**: complaint, citizen, rating, comment

## 🎨 Frontend Features

- Responsive design
- Role-based routing
- Real-time complaint tracking
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

