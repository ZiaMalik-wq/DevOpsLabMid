# Campus Career AI

Campus Career AI is an intelligent recruitment platform built for university students and campus recruiters. Unlike traditional job boards that rely on exact keyword matching, this platform uses vector embeddings and AI to semantically match student resumes with job descriptions, providing a fit score to help students find the best opportunities.

---

## Live Demo
Check out the live application at: [https://campuscareerai.me/](https://campuscareerai.me/)

---

## Key Features

### AI-Powered Matching

- Automatic matching of student resumes against job postings using semantic vector search (Qdrant)
- Hybrid search combining traditional keyword search (SQL) with AI-powered meaning search (Vector)
- Match score display showing percentage match based on skills, location, and resume content

### AI Career Tools for Students

- AI Interview Preparation: Generates personalized technical and behavioral interview questions based on the job description and your resume
- AI Cover Letter Generator: Creates tailored cover letters with customizable tone (professional, enthusiastic, confident)
- Skill Gap Analysis: Identifies missing skills and provides personalized learning paths with real course recommendations

### Application Management

- Real-time notification system for application status updates (shortlisted, interview, hired, rejected)
- Application deadline enforcement with clear visual indicators
- Save jobs for later viewing

### Company Dashboard

- Post and manage job listings with deadlines
- View and filter applicants with AI-ranked candidates
- Update application status with automatic student notifications
- Analytics dashboard with hiring funnel visualization

### Student Dashboard

- Profile management with resume upload
- Track application status across all applications
- View personalized job recommendations
- Access AI career tools from any job listing

### Security and Infrastructure

- JWT authentication with role-based access control
- Secure signed URLs for file storage (1-hour expiry)
- Containerized with **Docker** and orchestrated using **docker-compose**
- Deployed on **Azure Kubernetes Service (AKS)** with **Nginx Ingress**
- Automated SSL/TLS certificates via **cert-manager** and **Let's Encrypt**

---

## Tech Stack

### Backend

- Python and FastAPI for high-performance API
- SQLModel (SQLAlchemy) for database ORM
- Alembic for database migrations
- JWT and Passlib for authentication
- Groq API for LLM features (Llama 3.1, Mixtral)
- AsyncIO for non-blocking operations

### Frontend

- React.js for user interface
- Tailwind CSS for styling
- Vite for fast builds
- React Router for navigation
- React Hot Toast for notifications

### Data and AI

- PostgreSQL (Supabase) as primary database
- HuggingFace Transformers (all-MiniLM-L6-v2) for embeddings
- Qdrant Cloud for vector database and semantic search
- Supabase Storage for resume and profile image storage

---

## Installation and Setup

### Prerequisites

- Python 3.10 or higher
- Node.js and npm
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/campus-career-ai.git
cd campus-career-ai
```

### 2. Backend Setup

Navigate to the backend folder:

```bash
cd backend
```

Create and activate a virtual environment:

```bash
python -m venv venv

# Windows
venv\Scripts\activate

# Mac/Linux
source venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Create a `.env` file in the backend folder with these variables:

```env
DATABASE_URL="postgresql://user:pass@db.supabase.co:5432/postgres"
SECRET_KEY="your_secret_key"
QDRANT_URL="https://your-cluster.qdrant.io"
QDRANT_API_KEY="your_qdrant_key"
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_KEY="your_anon_key"
GROQ_API_KEY="your_groq_api_key"
```

Run database migrations:

```bash
alembic upgrade head
```

Start the backend server:

```bash
uvicorn app.main:app --reload
```

The API will run at http://localhost:8000

### 3. Frontend Setup

Navigate to the frontend folder:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Update the API base URL in `frontend/src/services/api.js` if needed:

```javascript
const BASE_URL = "http://localhost:8000";
```

Start the frontend:

```bash
npm run dev
```

The UI will run at http://localhost:5173

---

## Running with Docker

The easiest way to run the full stack locally is using **docker-compose**:

```bash
# Build and start both frontend and backend
docker-compose up --build
```

The frontend will be available at `http://localhost:80` and the backend at `http://localhost:8000`.

---

## Deployment to Azure Kubernetes Service (AKS)

The project includes full Kubernetes manifests for deployment to AKS:

1. **Dockerize**: Build and push images to Docker Hub.
2. **Infrastructure**: Create an AKS cluster and install Nginx Ingress Controller and cert-manager.
3. **Deploy**:
   ```bash
   kubectl apply -f kubernetes/backend.yaml
   kubectl apply -f kubernetes/frontend.yaml
   kubectl apply -f kubernetes/issuer.yaml
   kubectl apply -f kubernetes/ingress.yaml
   ```

---

## API Endpoints

### Authentication

- POST /auth/register - Register new user
- POST /auth/login - Login and get token
- GET /auth/me - Get current user profile

### Jobs

- GET /jobs - List all jobs with filters
- POST /jobs - Create job (company only)
- GET /jobs/{id} - Get job details
- GET /jobs/{id}/interview-prep - AI interview preparation
- POST /jobs/{id}/cover-letter - AI cover letter generation
- GET /jobs/{id}/skill-gap - AI skill gap analysis

### Applications

- POST /applications/{job_id} - Apply to job
- GET /applications/me - Get my applications
- PATCH /applications/{id}/status - Update status (company only)

### Notifications

- GET /notifications - Get user notifications
- GET /notifications/unread-count - Get unread count
- POST /notifications/mark-read - Mark as read
- POST /notifications/mark-all-read - Mark all as read

---

## Testing the Features

1. Register as a Company and post a job with a detailed description
2. Register as a Student and complete your profile with skills
3. Upload a PDF resume to enable AI features
4. Navigate to a job and try the AI tools:
   - Click "AI Interview Prep" for practice questions
   - Click "AI Cover Letter" to generate a tailored letter
   - Click "Skill Gap Analysis" to see learning recommendations
5. Apply to jobs and watch for notification updates when the company changes your status

---

## Project Structure

campus-career-ai/
├── backend/             # FastAPI Backend
├── frontend/            # React/Vite Frontend
├── kubernetes/          # K8s manifests (AKS)
├── Dockerfile           # Backend Dockerfile
├── docker-compose.yml   # Local orchestration
└── README.md
```

---

## License

This project is licensed under the MIT License.
