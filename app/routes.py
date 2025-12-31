from flask import Blueprint, render_template, request, jsonify, Response

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
