import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL;

// const isDev = import.meta.env.DEV;

// const baseURL = isDev ? "" : (import.meta.env.VITE_API_URL || "");

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: false,
});



const getAccessToken = () => localStorage.getItem("ACCESS_TOKEN");
const getRefreshToken = () => localStorage.getItem("REFRESH_TOKEN");

const setTokens = (accessToken, refreshToken) => {
  if (accessToken) localStorage.setItem("ACCESS_TOKEN", accessToken);
  if (refreshToken) localStorage.setItem("REFRESH_TOKEN", refreshToken);
};

const clearTokens = () => {
  localStorage.removeItem("ACCESS_TOKEN");
  localStorage.removeItem("REFRESH_TOKEN");
};


http.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log("➡️ REQUEST:", config.method?.toUpperCase(), config.baseURL + config.url);
    console.log("➡️ HEADERS:", config.headers);
    console.log("➡️ DATA:", config.data);
    return config;
  },
  (error) => Promise.reject(error)
);


let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

http.interceptors.response.use(
  (response) => {
    console.log("✅ RESPONSE:", response.status, response.config.url);
    console.log("✅ DATA:", response.data);
    return response;
  },

  async (error) => {
    console.log("❌ ERROR:", error.response?.status, error.config?.url);
    console.log("❌ MESSAGE:", error.response?.data);
    const originalRequest = error.config;

    if (!error.response) return Promise.reject(error);

    if (error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = getRefreshToken();

      if (!refreshToken) {
        clearTokens();
        window.location.href = "/login";
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise(function (resolve, reject) {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return http(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      isRefreshing = true;

      try {
        // Postman collection uses: POST /api/users/refresh
        const response = await axios.post(`${BASE_URL}/api/users/refresh`, { refreshToken });

        const newAccessToken = response.data.accessToken;
        const newRefreshToken = response.data.refreshToken;

        setTokens(newAccessToken, newRefreshToken);

        http.defaults.headers.Authorization = `Bearer ${newAccessToken}`;

        processQueue(null, newAccessToken);

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return http(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        clearTokens();
        window.location.href = "/login";
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);