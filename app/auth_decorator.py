import inspect
from functools import wraps

from flask import Response, request

from app.db import validate_token


def authorized(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Token')
        if not token:
            return Response(status=401)

        role, user_id = validate_token(token)
        if role is None:
            return Response(status=401)

        # get function parameter names
        sig = inspect.signature(f)
        params = sig.parameters

        # build only kwargs that function accepts
        call_kwargs = {}
        if 'role' in params:
            call_kwargs['role'] = role
        if 'user_id' in params:
            call_kwargs['user_id'] = user_id

        # Pass role to the route function
        return f(*args, **call_kwargs, **kwargs)

    return decorated