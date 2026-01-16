from datetime import datetime

from .models import UserRoles
from .supabase_client import supabase

from flask import jsonify
import os, json

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

def get_user_info(token: str):
    try:
        res = (supabase.table("users").select("email, name").eq("token", token).single().execute())
        return res.data
    except Exception as e:
        print("get_user_info failed:", e)
        return None


def update_user(token: str, email: str, name: str, password: str) -> bool:
    try:
        if password is None:
            supabase.table('users').update({"name": name, "email": email}).eq("token",token).execute()
        else:
            supabase.table('users').update({"name": name, "email": email, "password": password}).eq("token", token).execute()
        return True
    except Exception:
        return False


# this is only used for debugging purposes - includes sensitive info like password and token
def _get_users() -> list[dict]:
    return supabase.table('users').select('*').execute().data

# --- NEW: helpers ---
def get_ticket_by_id(ticket_id: str) -> dict | None:
    resp = supabase.table("tickets").select("*").eq("id", ticket_id).execute()
    if resp.data and len(resp.data) == 1:
        return resp.data[0]
    return None


def create_ticket_log_entry(
    ticket_id: str,
    actor_user_id: str,
    action_type: str,
    message: str,
    old_status: int | None,
    new_status: int | None,
) -> dict:
    resp = supabase.table("ticket_log_entries").insert({
        "ticket_id": ticket_id,
        "actor_user_id": actor_user_id,
        "action_type": action_type,
        "message": message,
        "old_status": old_status,
        "new_status": new_status,
        "created_at": datetime.now().isoformat(),
    }).execute()
    return resp.data[0]


def upload_log_attachment(ticket_id: str, log_entry_id: str, uploaded_by: str, file):
    file_extension = os.path.splitext(file.filename)[1]
    storage_path = f"{ticket_id}/{log_entry_id}/{os.urandom(4).hex()}{file_extension}"

    file.seek(0)
    file_content = file.read()

    supabase.storage.from_("photo_bucket").upload(
        storage_path,
        file_content,
        {"content-type": file.content_type}
    )

    public_url = supabase.storage.from_("photo_bucket").get_public_url(storage_path)

    supabase.table("ticket_attachments").insert({
        "ticket_id": ticket_id,
        "log_entry_id": log_entry_id,
        "uploaded_by": uploaded_by,
        "storage_path": storage_path,
        "file_name": file.filename,
        "mime_type": file.content_type,
        "file_size": len(file_content),
        "created_at": datetime.now().isoformat(),
    }).execute()

    try:
        supabase.table("ticket_photos").insert({
            "ticket_id": ticket_id,
            "url": public_url,
            "file_path": storage_path
        }).execute()
    except Exception:
        pass

    return {
        "url": public_url,
        "storage_path": storage_path,
        "file_name": file.filename,
        "mime_type": file.content_type,
        "file_size": len(file_content),
    }


def save_ticket_update_with_log(
    ticket_id: str,
    actor_user_id: str,
    updates: dict,
    note_text: str,
    files: list
) -> dict:
    """
    updates may contain: name, description, status, priority, assigned_to
    """

    ticket = get_ticket_by_id(ticket_id)
    if ticket is None:
        raise ValueError("Ticket not found")

    old_status = ticket.get("status")
    new_status = updates.get("status", old_status)

    old_priority = ticket.get("priority")
    new_priority = updates.get("priority", old_priority)

    old_assignee = ticket.get("assigned_to")
    new_assignee = updates.get("assigned_to", old_assignee)

    changes = []
    if old_status != new_status:
        changes.append({"field": "status", "from": old_status, "to": new_status})

    if old_priority != new_priority:
        changes.append({"field": "priority", "from": old_priority, "to": new_priority})

    if (old_assignee or None) != (new_assignee or None):
        changes.append({"field": "assignee", "from": old_assignee, "to": new_assignee})


    old_name = ticket.get("name")
    new_name = updates.get("name", old_name)

    old_desc = ticket.get("description")
    new_desc = updates.get("description", old_desc)

    message_payload = {
        "note": note_text or "",
        "old_priority": old_priority,
        "new_priority": new_priority,
        "old_assignee": old_assignee,
        "new_assignee": new_assignee,
        "old_name": old_name,
        "new_name": new_name,
        "old_description": old_desc,
        "new_description": new_desc,
        "changes": changes

    }

    log = create_ticket_log_entry(
        ticket_id=ticket_id,
        actor_user_id=actor_user_id,
        action_type="update",
        message=json.dumps(message_payload),
        old_status=old_status,
        new_status=new_status
    )

    supabase.table("tickets").update(updates).eq("id", ticket_id).execute()

    uploaded = []
    for f in files:
        uploaded.append(upload_log_attachment(ticket_id, log.get("id"), actor_user_id, f))

    return {"log": log, "uploaded": uploaded}


def get_ticket_history(search: str | None = None, limit: int = 200) -> list[dict]:
    """
    Returns flattened rows for history page.
    """

    ticket_map = {}
    ticket_ids = None

    if search:
        t = (supabase.table("tickets")
             .select("id,name,created_at,assigned_to,priority,status")
             .ilike("name", f"%{search}%")
             .execute())
        tickets = t.data or []
        ticket_ids = [x["id"] for x in tickets]
        ticket_map = {x["id"]: x for x in tickets}
    else:
        t = (supabase.table("tickets")
             .select("id,name,created_at,assigned_to,priority,status")
             .execute())
        tickets = t.data or []
        ticket_map = {x["id"]: x for x in tickets}

    log_query = (supabase.table("ticket_log_entries")
                 .select("*")
                 .order("created_at", desc=True)
                 .limit(limit))

    if ticket_ids is not None:
        if len(ticket_ids) == 0:
            return []
        log_query = log_query.in_("ticket_id", ticket_ids)

    logs = log_query.execute().data or []

    log_ids = [l["id"] for l in logs]
    att_map = {lid: [] for lid in log_ids}
    if log_ids:
        atts = (supabase.table("ticket_attachments")
                .select("*")
                .in_("log_entry_id", log_ids)
                .order("created_at", desc=False)
                .execute()).data or []

        for a in atts:
            storage_path = a.get("storage_path")
            url = supabase.storage.from_("photo_bucket").get_public_url(storage_path) if storage_path else None
            att_map[a.get("log_entry_id")].append({
                "url": url,
                "file_name": a.get("file_name"),
                "mime_type": a.get("mime_type"),
                "file_size": a.get("file_size"),
            })

    rows = []
    for l in logs:
        tid = l.get("ticket_id")
        t = ticket_map.get(tid) or {}

        msg = l.get("message") or ""
        payload = None
        try:
            payload = json.loads(msg)
        except Exception:
            payload = {"note": msg}

        new_priority = payload.get("new_priority", t.get("priority"))
        new_assignee = payload.get("new_assignee", t.get("assigned_to"))
        ticket_name = payload.get("new_name", t.get("name"))

        rows.append({
            "log_id": l.get("id"),
            "ticket_id": tid,
            "ticket_name": ticket_name,
            "ticket_created_at": t.get("created_at"),
            "updated_at": l.get("created_at"),
            "assignee": new_assignee,
            "update": payload.get("note", ""),
            "status": l.get("new_status", t.get("status")),
            "priority": new_priority,
            "photos": att_map.get(l.get("id"), []),
            "changes": payload.get("changes", [])
        })

    return rows
