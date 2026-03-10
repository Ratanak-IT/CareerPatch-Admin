import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const BASE_URL = import.meta.env.VITE_API_URL;

export const profileApi = createApi({
  reducerPath: "profileApi",
  baseQuery: fetchBaseQuery({
    baseUrl: BASE_URL,
    prepareHeaders: (headers, { getState }) => {
      const token = getState().auth?.accessToken;
      if (token) headers.set("authorization", `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ["Me"],
  endpoints: (builder) => ({
    

    updateFreelancerProfile: builder.mutation({
      query: (body) => ({ url: "/api/users/update-freelancer-profile", method: "PUT", body }),
      invalidatesTags: ["Me"],
    }),

    // ── Business owner profile update ────────────────────────────
    updateBusinessProfile: builder.mutation({
      query: (body) => ({ url: "/api/users/update-business-profile", method: "PUT", body }),
      invalidatesTags: ["Me"],
    }),

    uploadProfileImage: builder.mutation({
      query: (file) => {
        const formData = new FormData();
        formData.append("file", file);
        return { url: "/api/users/upload-profile-image", method: "POST", body: formData };
      },
      invalidatesTags: ["Me"],
    }),
  }),
});

export const {
  useMeQuery,
  useUpdateFreelancerProfileMutation,
  useUpdateBusinessProfileMutation,
  useUploadProfileImageMutation,
} = profileApi;
