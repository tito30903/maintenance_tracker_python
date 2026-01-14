from flask import Flask

def create_app():
    app = Flask(__name__)
    app.config.from_object('config.Config')

    # import and register routes
    from .routes import main
    app.register_blueprint(main)

    # inject path constants globally into all Jinja templates
    @app.context_processor
    def inject_constants():
        from .constants import LOGIN_URL, REGISTER_URL, DASHBOARD_URL, UNAUTHORIZED, PROFILE_URL
        return {
            'LOGIN_URL': LOGIN_URL,
            'REGISTER_URL': REGISTER_URL,
            'DASHBOARD_URL': DASHBOARD_URL,
            'UNAUTHORIZED_URL': UNAUTHORIZED,
            'PROFILE_URL': PROFILE_URL,
        }

    return app
