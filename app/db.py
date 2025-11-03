from .models import UserRoles
from .supabase_client import supabase

# return enum for which page token is valid
def validate_token(token: str) -> UserRoles | None:
    if token is None:
        return None

    response = supabase.table("users").select("*").eq("token", token).execute()
    if len(response.data) == 1:
        role_id = response.data[0].get("role")
        return UserRoles.getRoleById(role_id)
    return None

def verify_user(email: str, password: str) -> str:
    """
    Check if a user exists and password matches.
    Returns True if valid, False otherwise.
    """
    response = supabase.table("users").select("*").eq("email", email).eq("password", password).execute()
    return response.data[0].get("token")

def register_user(username:str, email: str, password: str) -> str:
    try:
        response = supabase.table('users').insert({
            "name": username,
            "email": email,
            "password": password  # WARNING: store hashed passwords in production
        }).execute()
        return response.data[0].get("token")
    except Exception as e:
        return e.message

