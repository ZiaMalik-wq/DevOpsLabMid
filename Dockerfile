FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Upgrade pip first
RUN pip install --upgrade pip

# Install Torch CPU specifically (This is the heavy step)
# We use --retries to handle network glitches
RUN pip install --no-cache-dir --retries 10 --timeout 2000 torch --index-url https://download.pytorch.org/whl/cpu

# Copy requirements
COPY backend/requirements.txt .

# Install other requirements
# We EXCLUDE torch from here because we just installed it
RUN pip install --no-cache-dir --upgrade -r requirements.txt

# Pre-download AI Model
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"

# Copy Code
COPY backend .

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-10000}"]