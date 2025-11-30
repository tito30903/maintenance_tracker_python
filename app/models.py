from enum import Enum

class UserRoles(Enum):
    MANAGER = 1
    TECHNICIAN = 2

    def get_role_by_id(role_id: int):
        for role in UserRoles:
            if role.value == role_id:
                return role
        return None

    def get_role_by_name(name: str):
        for role in UserRoles:
            if role.name == name.upper():
                return role
        return None


    def __str__(self):
        return self.name.lower()

class TicketPriority(Enum):
    LOW = 1
    MEDIUM = 2
    HIGH = 3

class TicketStatus(Enum):
    OPEN = 1
    IN_PROGRESS = 2
    CLOSED = 3
