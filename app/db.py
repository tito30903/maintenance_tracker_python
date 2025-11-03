from .supabase_client import supabase

def verify_user(email: str, password: str) -> bool:
    """
    Check if a user exists and password matches.
    Returns True if valid, False otherwise.
    """
    response = supabase.table("users").select("*").eq("email", email).eq("password", password).execute()
    return len(response.data) == 1

def register_user(username:str, email: str, password: str):
    supabase.table('users').insert({
        "name": username,
        "email": email,
        "password": password  # WARNING: store hashed passwords in production
    }).execute()
