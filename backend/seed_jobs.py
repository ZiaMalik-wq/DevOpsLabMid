import requests
import json

# 1. CONFIGURATION
API_URL = "http://127.0.0.1:8000"
# Use the email/password of the Company you created earlier
COMPANY_EMAIL = "hr@techcorp.com"
COMPANY_PASSWORD = "zia12345"

# 2. THE DATA (20 Real-world Student Jobs)
jobs_data = [
    {
        "title": "Machine Learning Intern",
        "description": "Assist in building predictive models using Python, Scikit-Learn, and Pandas. Experience with data cleaning and visualization required.",
        "location": "Lahore, Pakistan",
        "job_type": "Internship",
        "salary_range": "40k - 60k PKR",
        "max_seats": 2
    },
    {
        "title": "React Native Developer",
        "description": "Looking for a mobile app developer. Must know React Native, Expo, and Redux. You will build iOS and Android apps from scratch.",
        "location": "Remote",
        "job_type": "Contract",
        "salary_range": "100k PKR",
        "max_seats": 1
    },
    {
        "title": "Data Analyst (Entry Level)",
        "description": "Analyze business trends using SQL and PowerBI. Strong Excel skills and attention to detail needed.",
        "location": "Islamabad, Pakistan",
        "job_type": "Full-time",
        "salary_range": "70k - 90k PKR",
        "max_seats": 1
    },
    {
        "title": "DevOps Engineer Trainee",
        "description": "Learn cloud infrastructure on AWS. Work with Docker, Kubernetes, and CI/CD pipelines (GitHub Actions). Linux knowledge is a must.",
        "location": "Karachi, Pakistan",
        "job_type": "Trainee",
        "salary_range": "35k - 50k PKR",
        "max_seats": 3
    },
    {
        "title": "Content Writer & SEO Specialist",
        "description": "Write engaging blog posts for our tech product. optimize content for search engines using keywords and backlinks.",
        "location": "Remote",
        "job_type": "Part-time",
        "salary_range": "25k PKR",
        "max_seats": 1
    },
    {
        "title": "Junior Python Backend Developer",
        "description": "Develop REST APIs using FastAPI and Django. Knowledge of PostgreSQL and Redis is preferred.",
        "location": "Lahore, Pakistan",
        "job_type": "Full-time",
        "salary_range": "60k - 90k PKR",
        "max_seats": 2
    },
    {
        "title": "UI/UX Designer Intern",
        "description": "Design user interfaces for web and mobile apps using Figma. Create wireframes and prototypes.",
        "location": "Islamabad, Pakistan",
        "job_type": "Internship",
        "salary_range": "30k PKR",
        "max_seats": 1
    },
    {
        "title": "Cybersecurity Analyst",
        "description": "Monitor network traffic for security breaches. Knowledge of firewalls, VPNs, and penetration testing tools like Kali Linux.",
        "location": "Rawalpindi, Pakistan",
        "job_type": "Full-time",
        "salary_range": "120k PKR",
        "max_seats": 1
    },
    {
        "title": "MERN Stack Developer",
        "description": "Full stack developer needed using MongoDB, Express, React, and Node.js. Build scalable web applications.",
        "location": "Lahore, Pakistan",
        "job_type": "Full-time",
        "salary_range": "80k - 110k PKR",
        "max_seats": 2
    },
    {
        "title": "Digital Marketing Intern",
        "description": "Manage social media accounts (LinkedIn, Instagram). Run ad campaigns and analyze engagement metrics.",
        "location": "Remote",
        "job_type": "Internship",
        "salary_range": "20k PKR",
        "max_seats": 1
    }
]

def seed_database():
    print(f"🚀 Starting Database Seeding to {API_URL}...")

    # 1. Login to get Token
    print(f"🔑 Logging in as {COMPANY_EMAIL}...")
    login_payload = {
        "username": COMPANY_EMAIL,
        "password": COMPANY_PASSWORD
    }
    
    # We send as form-data because of OAuth2PasswordRequestForm
    response = requests.post(f"{API_URL}/auth/token", data=login_payload)
    
    if response.status_code != 200:
        print(f"Login Failed: {response.text}")
        return

    token = response.json()["access_token"]
    print("Login Successful! Token received.")

    # 2. Loop and Post Jobs
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    success_count = 0
    
    for job in jobs_data:
        print(f"Posting: {job['title']}...")
        resp = requests.post(f"{API_URL}/jobs/create", json=job, headers=headers)
        
        if resp.status_code == 200:
            print(f"Created (ID: {resp.json()['id']})")
            success_count += 1
        else:
            print(f"Failed: {resp.text}")

    print(f"\nFinished! Successfully added {success_count} jobs.")

if __name__ == "__main__":
    seed_database()