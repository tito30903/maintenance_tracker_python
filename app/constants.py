# PATHS
LOGIN_URL = "/login"
REGISTER_URL = "/register"
DASHBOARD_URL = "/dashboard"
DASHBOARD_MANAGER_URL = DASHBOARD_URL + "/manager"
DASHBOARD_TECHNICIAN_URL = DASHBOARD_URL + "/technician"
UNAUTHORIZED = "/unauthorized"
PROFILE_URL = "/profile"

# API
API_PREFIX = "/api"
API_TICKETS = API_PREFIX + "/tickets"
API_USERS = API_PREFIX + "/users"
API_PHOTOS = API_PREFIX + "/photos/<ticket_id>"
API_PROFILE = API_PREFIX + "/profile"


# DEBUG PATHS
DEBUG_URL = "/debug"
DEBUG_DUMP_USERS_URL = "/dumpUsers"
DEBUG_DUMP_TICKETS_URL = "/dumpTickets"