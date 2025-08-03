import axios from "axios"

// Configura l'URL base delle tue API Node.js
const API_BASE_URL = process.env.API_URL || "http://localhost:3003"

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
})

// Interceptor per aggiungere il token alle richieste
api.interceptors.request.use(
  (config) => {
    // Questo codice viene eseguito solo lato client
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token")
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  },
)

// Interceptor per gestire errori di autenticazione
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Questo codice viene eseguito solo lato client
    if (typeof window !== "undefined" && error.response?.status === 401) {
      localStorage.removeItem("token")
      // Reindirizza alla pagina di login solo se non ci sei già
      if (window.location.pathname !== "/login") {
        window.location.href = "/login"
      }
    }
    return Promise.reject(error)
  },
)

export default api
