export const endpoints = {
  login: "/api/users/login",
  me: "/api/users/me",
  users: "/api/users",      // GET with params userType, page, size...
  getFreelan: "/api/users?userType=freelancer", // GET all users (admin)
  getBusiness: "/api/users?userType=business_owner",
  jobs: "/api/jobs-service/jobs",
  services: "/api/jobs-service/services",
};