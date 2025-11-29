from enum import Enum

class UserRoles(Enum):
    MANAGER = 1
    TECHNICIAN = 2

    def getRoleById(role_id: int):
        for role in UserRoles:
            if role.value == role_id:
                return role
        return None


    def __str__(self):
        return self.name.capitalize()
