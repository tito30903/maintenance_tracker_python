// ensure headers exist in the options object
const originalFetch = window.fetch;
window.fetch = async (url, options = {}) => {
    const token = localStorage.getItem("token");
    options.headers = options.headers || {};
    if (token) {
        options.headers = {
            ...options.headers,
            Token: `${token}`,
        };
    }
    return originalFetch(url, options);
};
