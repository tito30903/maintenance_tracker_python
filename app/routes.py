from flask import Blueprint, render_template
from .supabase_client import supabase

main = Blueprint('main', __name__)

@main.route('/')
def index():
    return render_template('index.html')

@main.route('/about')
def about():
    return "This is a Flask project template!"


@main.route('/testdb')
def testdb():
    users = supabase.table('users').select("*").execute()
    print(users)
    return users.data
