from datetime import datetime

from .models import UserRoles
from .supabase_client import supabase

from flask import jsonify
import os

# TOKEN VALIDATION / LOGIN / REGISTRATION
# return enum for which page token is valid
def validate_token(token: str) -> tuple[UserRoles, str] | None:
    if token is None:
        return None

    response = supabase.table("users").select("*").eq("token", token).execute()
    if len(response.data) == 1:
        role_id = response.data[0].get("role")
        return UserRoles.get_role_by_id(role_id), response.data[0].get("id")

    return None

def verify_user(email: str, password: str) -> tuple[str, UserRoles] | None:
    """
    Check if a user exists and password matches.
    Returns token and role if valid, None otherwise.
    """
    response = supabase.table("users").select("*").eq("email", email).eq("password", password).execute()

    if len(response.data) == 1:
        found_user = response.data[0]
        return found_user.get("token"), UserRoles.get_role_by_id(found_user.get("role"))

    return None

def register_user(username:str, email: str, password: str) -> str:
    try:
        response = supabase.table('users').insert({
            "name": username,
            "email": email,
            "password": password
        }).execute()
        return response.data[0].get("token")
    except Exception as e:
        return e.message

# TICKET MANAGEMENT
def create_ticket(name: str, description: str, priority: int, created_by: str) -> bool:
    response = supabase.table('tickets').insert({
        "name": name,
        "description": description,
        "priority": priority,
        "status": 1,  # Default to OPEN
        "created_by": created_by,
        "created_at": datetime.now().isoformat()
    }).execute()
    return response.data[0]

def get_tickets(user_id: str | None) -> list[dict]:
    if user_id is None:
        return supabase.table('tickets').select('*').order('created_at').execute().data
    else:
        return supabase.table('tickets').select('*').eq('assigned_to', user_id).order('created_at').execute().data

def update_ticket(ticket: dict) -> bool:
    try:
        supabase.table('tickets').update(ticket).eq('id', ticket.get('id')).execute()
        return True
    except Exception:
        return False


def upload_attachment(ticket_id, file):
    file_extension = os.path.splitext(file.filename)[1]
    file_path = f"{ticket_id}/{os.urandom(4).hex()}{file_extension}"

    try:
        file.seek(0)
        file_content = file.read()
        supabase.storage.from_('photo_bucket').upload(
            file_path,
            file_content,
            {"content-type": file.content_type}
        )

        file_url = supabase.storage.from_('photo_bucket').get_public_url(file_path)

        supabase.table('ticket_photos').insert({
            "ticket_id": ticket_id,
            "url": file_url,
            "file_path": file_path
        }).execute()

        return jsonify({"url": file_url}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


def get_pictures(ticket_id):
    response = (
        supabase
        .table("ticket_photos")
        .select("id, url, file_path, created_at")
        .eq("ticket_id", ticket_id)
        .order("created_at", desc=True)
        .execute()
    )

    return response.data


# USER MANAGEMENT
def get_users() -> list[dict]:
    return supabase.table('users').select('id, email, name, role').execute().data

def get_users_by_role(role: UserRoles):
    return supabase.table('users').select('id, email, name, role').eq('role', role.value).execute().data

# this is only used for debugging purposes - includes sensitive info like password and token
def _get_users() -> list[dict]:
    return supabase.table('users').select('*').execute().data