from supabase import create_client, Client
from app.core.config import settings

# Initialize the Supabase Client using credentials from .env
supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)