from flask import Blueprint, render_template, request
from .supabase_client import supabase
from .db import verify_user, register_user

main = Blueprint('main', __name__)

@main.route('/')
def index():
    return render_template('index.html')

@main.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form['email']
        password = request.form['password']
        return str(verify_user(email, password))

    return render_template('login.html')

@main.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form['username']
        email = request.form['email']
        password = request.form['password']

        # Insert into Supabase
        register_user(username, email, password)
        return f"Register attempted for {username}"
    return render_template('register.html')

@main.route('/about')
def about():
    return "This is a Flask project template!"


@main.route('/dumpUsers')
def dump_users():
    users = supabase.table('users').select("*").execute()
    print(users)
    return users.data
