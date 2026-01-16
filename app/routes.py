from flask import Blueprint, render_template, request, jsonify, Response, redirect, url_for, session

from . import db
from .auth_decorator import authorized
from .constants import *
from .models import UserRoles

main = Blueprint('main', __name__)

@main.route('/')
def index():
    return render_template('index.html')

# LOGIN AND REGISTRATION ROUTES
@main.route(LOGIN_URL, methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form['email']
        password = request.form['password']

        response = db.verify_user(email, password)

        if isinstance(response, tuple):
            return jsonify({"success": True, "token": response[0], "role": response[1].__str__()}), 200
        else:
            return jsonify({"success": False, "message": "Invalid email or password"}), 401

    return render_template('login.html')


@main.route(REGISTER_URL, methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form['username']
        email = request.form['email']
        password = request.form['password']

        # Insert into Supabase
        return db.register_user(username, email, password)
    return render_template('register.html')

@main.route(PROFILE_URL)
def profile_page():
    return render_template("profile.html")

# DASHBOARD ROUTES
@main.route(DASHBOARD_MANAGER_URL, methods=['GET'])
def dashboard_manager():
    return render_template('dashboard_manager.html')

@main.route(DASHBOARD_TECHNICIAN_URL, methods=['GET'])
def dashboard_technician():
    return render_template('dashboard_technician.html')

# API ROUTES
@main.route(API_TICKETS + '/create', methods=['POST'])
@authorized
def create_ticket(user_id: str):
    ticket_name = request.get_json().get('name')
    db.create_ticket(ticket_name, "Description", 1, user_id)
    return Response(status=201)

@main.route(API_TICKETS, methods=['GET'])
@authorized
def get_all_tickets(role: UserRoles, user_id: str):
    if role == UserRoles.MANAGER:
        tickets = db.get_tickets(None)
    else:
        tickets = db.get_tickets(user_id)
    return jsonify({"success": True, "tickets": tickets})

@main.route(API_TICKETS + '/update', methods=['PUT'])
@authorized
def update_ticket_priority():
    ticket_update = request.json

    if db.update_ticket(ticket_update):
        return jsonify({"success": True})
    return Response(status=400)

@main.route(API_USERS, methods=['GET'])
@authorized
def get_users():
    role = request.args.get('role')
    if role:
        user_role = UserRoles.get_role_by_name(role)

        if user_role is None:
            return jsonify({"success": False, "message": "Invalid role"}), 400
        users = db.get_users_by_role(user_role)
        return jsonify({"success": True, "users": users})

    users = db.get_users_by_role(UserRoles.TECHNICIAN)
    return jsonify({"success": True, "users": users})

@main.route(UNAUTHORIZED, methods=['GET'])
def unauthorized():
    return render_template('unauthorized.html')

@main.route('/about')
def about():
    return "This is a Flask project template!"

@main.route(API_PHOTOS, methods=['PUT'])
@authorized
def put_photos(ticket_id: str):

    if not ticket_id:
        return jsonify({"error": "Ticket ID fehlt"}), 400

    if 'file' not in request.files:
        return jsonify({"error": "No file"}), 400

    file = request.files['file']
    ret = db.upload_attachment(ticket_id, file)

    return ret

@main.route(API_PHOTOS, methods=['GET'])
@authorized
def get_photos(ticket_id: str):
    if not ticket_id:
        return jsonify({"error": "Ticket ID fehlt"}), 400
    return jsonify({"success": True, "pictures": db.get_pictures(ticket_id)})

@main.route(API_PROFILE, methods=['GET', 'POST'])
def api_profile():
    auth = request.headers.get("Authorization")

    if not auth or not auth.startswith("Bearer "):
        return {"error": "unauthorized"}, 401

    token = auth.replace("Bearer ", "")

    if request.method == "GET":
        user = db.get_user_info(token)
        if not user:
            return {"error": "not found"}, 404

        return {
            "name": user["name"],
            "email": user["email"]
        }

    if request.method == "POST":
        data = request.get_json()

        if not data:
            return {"error": "no data provided"}, 400

        name = data.get("name")
        email = data.get("email")
        password = data.get("password")

        if not name or not email:
            return {"error": "name and email required"}, 400

        success = db.update_user(
            token=token,
            name=name,
            email=email,
            password=password
        )

        if not success:
            return {"error": "update failed"}, 500

        return {"success": True}



# DEBUG ROUTES
@main.route(DEBUG_URL + DEBUG_DUMP_USERS_URL, methods=['GET'])
def dump_users():
    users = db._get_users()
    print(users)
    return users

@main.route(DEBUG_URL + DEBUG_DUMP_TICKETS_URL, methods=['GET'])
def dump_tickets():
    tickets = db.get_tickets(None)
    print(tickets)
    return tickets

@main.route('/history', methods=['GET'])
def history_page():
    return render_template('history_log.html', hide_header_actions=True)

@main.route(API_TICKETS + '/save_update', methods=['POST'])
@authorized
def save_ticket_update(user_id: str):
    ticket_id = request.form.get("ticket_id")
    if not ticket_id:
        return jsonify({"success": False, "message": "ticket_id missing"}), 400

    name = request.form.get("name")
    description = request.form.get("description")
    message = request.form.get("message") or ""

    status_raw = request.form.get("status")
    priority_raw = request.form.get("priority")
    assigned_to_raw = request.form.get("assigned_to")

    updates = {"id": ticket_id}

    if name is not None:
        updates["name"] = name
    if description is not None:
        updates["description"] = description

    if status_raw is not None and status_raw != "":
        updates["status"] = int(status_raw)
    if priority_raw is not None and priority_raw != "":
        updates["priority"] = int(priority_raw)
    if assigned_to_raw == "":
        updates["assigned_to"] = None
    elif assigned_to_raw is not None:
        updates["assigned_to"] = assigned_to_raw

    files = request.files.getlist("files")

    try:
        result = db.save_ticket_update_with_log(
            ticket_id=ticket_id,
            actor_user_id=user_id,
            updates=updates,
            note_text=message,
            files=files
        )
        return jsonify({"success": True, "log": result["log"], "uploaded": result["uploaded"]})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@main.route(API_TICKETS + '/history', methods=['GET'])
@authorized
def get_history(role: UserRoles, user_id: str):
    q = request.args.get("q")
    rows = db.get_ticket_history(search=q)
    return jsonify({"success": True, "entries": rows})

