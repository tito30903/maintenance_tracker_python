document.addEventListener("DOMContentLoaded", async () => {
    const user = await fetchUserInfo();
    if (user) {
        document.querySelector("input[name='name']").value = user.name;
        document.querySelector("input[name='email']").value = user.email;
    }

});

function validatePasswords() {
    const pw = document.getElementById("password").value;
    const pwConfirm = document.getElementById("password_confirm").value;
    const error = document.getElementById("password_error");

    if (pw || pwConfirm) {
        if (pw !== pwConfirm) {
            error.classList.remove("hidden");
            return false;
        }
    }

    error.classList.add("hidden");
    return true;
}

async function fetchUserInfo() {
    const token = localStorage.getItem("token");
    if (!token){
        console.log("No Token")
    }
    try {
        const response = await fetch(`/api/profile`, {
            headers: {
                "Authorization": "Bearer " + token
            }
        });
        if (!response.ok) return null;
        return await response.json();
    } catch (error) {
        console.error(error);
        return null;
    }
}

async function saveProfile() {
    const token = localStorage.getItem("token");

    if(validatePasswords()){
        const body = {
            name: document.querySelector("input[name='name']").value,
            email: document.querySelector("input[name='email']").value,
            password: document.getElementById("password").value
        };

        const response = await fetch("/api/profile", {
            method: "POST",
            headers: {
                "Authorization": "Bearer " + token,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
        });

        if (response.ok) {
            alert("Saved!");
        } else {
            alert("Error saving profile");
        }
        history.back();
    }
}
