from flask import Blueprint, render_template, request, jsonify, redirect, Response

from .constants import LOGIN_URL, REGISTER_URL, DASHBOARD_URL, DEBUG_DUMP_USERS_URL, DEBUG_URL, UNAUTHORIZED, \
    DEBUG_DUMP_TICKETS_URL, API_TICKET
from .models import UserRoles
from .supabase_client import supabase
from .db import verify_user, register_user, validate_token

main = Blueprint('main', __name__)

@main.route('/')
def index():
    return render_template('index.html')

@main.route(LOGIN_URL, methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form['email']
        password = request.form['password']

        response = verify_user(email, password)

        print(response)

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
        return register_user(username, email, password)
    return render_template('register.html')

@main.route(DASHBOARD_URL, methods=['GET'])
def dashboard():
    # TODO change later to correct generic dashboard
    return render_template('dashboard_manager.html')

@main.route(DASHBOARD_URL + '/data', methods=['GET'])
def dashboard_data():
    token = request.headers.get('Token')

    if token is None:
        return redirect(LOGIN_URL)

    role = validate_token(token)

    if role is None:
        return Response(status=401)

    # Example data based on role
    if role == UserRoles.MANAGER:
        data = {"tasks": ["Approve budgets", "Review reports", "Manage team"]}
    elif role == UserRoles.TECHNICIAN:
        data = {"tasks": ["Fix issues", "Update systems", "Report status"]}
    else:
        data = {"tasks": []}

    return jsonify({"success": True, "data": data})

@main.route(API_TICKET + '/create', methods=['POST'])
def create_ticket():
    token = request.headers.get('Token')
    if token is None:
        return Response(status=401)

    if validate_token(token) is None:
        return Response(status=401)

    ticket_name = request.get_json().get('name')

    supabase.table('tickets').insert({'name': ticket_name}).execute()
    return Response(status=201)

@main.route(UNAUTHORIZED, methods=['GET'])
def unauthorized():
    return render_template('unauthorized.html')

@main.route('/about')
def about():
    return "This is a Flask project template!"

@main.route(DEBUG_URL + DEBUG_DUMP_USERS_URL, methods=['GET'])
def dump_users():
    users = supabase.table('users').select("*").execute()
    print(users)
    return users.data

@main.route(DEBUG_URL + DEBUG_DUMP_TICKETS_URL, methods=['GET'])
def dump_tickets():
    tickets = supabase.table('tickets').select("*").execute()
    print(tickets)
    return tickets.data
