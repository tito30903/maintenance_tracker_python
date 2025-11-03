from flask import Blueprint, render_template, request
from .supabase_client import supabase

main = Blueprint('main', __name__)

@main.route('/')
def index():
    return render_template('index.html')

@main.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form['email']
        password = request.form['password']
        # TODO: Add login logic (check user in DB)
        return f"Login attempted for {email}"
    return render_template('login.html')

@main.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form['username']
        email = request.form['email']
        password = request.form['password']
        # TODO: Add registration logic (save user in DB)
        # Insert into Supabase
        response = supabase.table('users').insert({
            "name": username
            #"email": email,
            #"password": password  # WARNING: store hashed passwords in production
        }).execute()
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
