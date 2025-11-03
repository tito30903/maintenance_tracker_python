from supabase import create_client, Client
import os

SUPABASE_URL = os.environ.get("SUPABASE_URL") or "your_supabase_url"
SUPABASE_KEY = os.environ.get("SUPABASE_ANON_KEY") or "your_supabase_anon_key"

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
