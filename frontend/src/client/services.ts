// Temporary API services until OpenAPI client is generated
import { client } from "./sdk.gen";

const BASE_URL = "http://localhost:8000/api/v1";

async function request(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem("access_token");
  const headers = {
    ...options.headers,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const response = await fetch(`${BASE_URL}${url}`, { ...options, headers });
  
  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem("access_token");
      window.location.href = "/login";
    }
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response.json();
}

export const RoomsService = {
  readRooms: async ({ limit = 100, skip = 0 }: { limit?: number; skip?: number }) => {
    return request(`/rooms/?limit=${limit}&skip=${skip}`);
  },
};

export const CustomersService = {
  readCustomers: async ({ limit = 100, skip = 0, search }: { limit?: number; skip?: number; search?: string }) => {
    const params = new URLSearchParams({ limit: String(limit), skip: String(skip) });
    if (search) params.append("search", search);
    return request(`/customers/?${params}`);
  },
  createCustomer: async ({ requestBody }: { requestBody: any }) => {
    return request("/customers/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });
  },
  updateCustomer: async ({ customerId, requestBody }: { customerId: string; requestBody: any }) => {
    return request(`/customers/${customerId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });
  },
  deleteCustomer: async ({ customerId }: { customerId: string }) => {
    return request(`/customers/${customerId}`, { method: "DELETE" });
  },
};

export const BookingsService = {
  readBookings: async ({ limit = 100, skip = 0, status }: { limit?: number; skip?: number; status?: string }) => {
    const params = new URLSearchParams({ limit: String(limit), skip: String(skip) });
    if (status) params.append("status", status);
    return request(`/bookings/?${params}`);
  },
  updateBooking: async ({ bookingId, requestBody }: { bookingId: string; requestBody: any }) => {
    return request(`/bookings/${bookingId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });
  },
};

export const LoginService = {
  loginAccessToken: async ({ formData }: { formData: { username: string; password: string; grant_type: string } }) => {
    const params = new URLSearchParams({
      username: formData.username,
      password: formData.password,
      grant_type: formData.grant_type || "password",
    });
    
    const response = await fetch(`${BASE_URL}/login/access-token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params,
    });
    
    if (!response.ok) {
      throw new Error("Invalid credentials");
    }
    
    return response.json();
  },
};