// src/store.js
import { configureStore } from "@reduxjs/toolkit";
import { profileApi } from "../services/profileApi"; // ✅ your RTK Query api

export const store = configureStore({
  reducer: {
    [profileApi.reducerPath]: profileApi.reducer, // ✅ add api reducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(profileApi.middleware), // ✅ add api middleware
});