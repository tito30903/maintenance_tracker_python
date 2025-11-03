document.addEventListener("DOMContentLoaded", async () => {
    const token = localStorage.getItem("token");

    if (token) {
        try {
            const response = await fetch('/dashboard/data', {
                method: 'GET',
                headers: {
                    'Token': token
                }
            });

            if (response.ok) {
                const html = await response.text();
                console.log(html);
            } else if (response.status === 401) {
                window.location.href = '/unauthorized';
            }
        } catch (error) {
            console.error("Error loading dashboard:", error);
            window.location.href = '/unauthorized';
        }
    } else {
        console.log("No token found. Redirecting to login...");
        window.location.href = '/login';
    }
});
