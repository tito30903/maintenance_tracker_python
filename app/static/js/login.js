const loginForm = document.querySelector("#loginForm");

loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = new FormData(loginForm);
    const response = await fetch("/login", {
        method: "POST",
        body: formData
    });

    const data = await response.json();

    if (data.success) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("role", data.role);
        window.location.href = "/dashboard/" + data.role; // redirect after login
    } else {
        alert(data.message);
    }
});

