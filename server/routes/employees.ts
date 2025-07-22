import { RequestHandler } from "express";
import {
  Employee,
  ExternalUser,
  EmployeesResponse,
  LocationUpdate,
  LocationUpdateResponse,
} from "@shared/api";

// External API URL
const EXTERNAL_API_URL = "https://jbdspower.in/LeafNetServer/api/user";

// In-memory storage for employee statuses and locations (since external API doesn't provide these)
interface EmployeeStatus {
  status: "active" | "inactive" | "meeting";
  location: {
    lat: number;
    lng: number;
    address: string;
    timestamp: string;
  };
  lastUpdate: string;
  currentTask?: string;
}

let employeeStatuses: Record<string, EmployeeStatus> = {};

// Simple address formatting for Indian coordinates
function getAddressFromCoordinates(lat: number, lng: number): string {
  // Check if coordinates are in India (approximate bounds)
  const isInIndia = lat >= 6.0 && lat <= 37.6 && lng >= 68.0 && lng <= 97.5;

  if (isInIndia) {
    // Determine approximate Indian city based on coordinates
    const city = getIndianCityFromCoordinates(lat, lng);
    return `${city}, India (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
  }

  // Fallback to coordinates for non-Indian locations
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

// Function to determine nearest Indian city based on coordinates
function getIndianCityFromCoordinates(lat: number, lng: number): string {
  const cities = [
    { name: "New Delhi", lat: 28.6139, lng: 77.209 },
    { name: "Mumbai", lat: 19.076, lng: 72.8777 },
    { name: "Bangalore", lat: 12.9716, lng: 77.5946 },
    { name: "Chennai", lat: 13.0827, lng: 80.2707 },
    { name: "Kolkata", lat: 22.5726, lng: 88.3639 },
    { name: "Hyderabad", lat: 17.385, lng: 78.4867 },
    { name: "Ahmedabad", lat: 23.0225, lng: 72.5714 },
    { name: "Pune", lat: 18.5204, lng: 73.8567 },
    { name: "Jaipur", lat: 26.9124, lng: 75.7873 },
    { name: "Chandigarh", lat: 30.7333, lng: 76.7794 },
  ];

  // Find the closest city
  let closestCity = cities[0];
  let minDistance = Math.sqrt(
    Math.pow(lat - cities[0].lat, 2) + Math.pow(lng - cities[0].lng, 2),
  );

  for (const city of cities) {
    const distance = Math.sqrt(
      Math.pow(lat - city.lat, 2) + Math.pow(lng - city.lng, 2),
    );
    if (distance < minDistance) {
      minDistance = distance;
      closestCity = city;
    }
  }

  return closestCity.name;
}

// Default location for India (New Delhi) as fallback
const defaultIndiaLocation = {
  lat: 28.6139,
  lng: 77.209,
  address: "New Delhi, India",
};

// Common Indian city locations for realistic distribution
const indianCityLocations = [
  { lat: 28.6139, lng: 77.209, address: "New Delhi, India" },
  { lat: 19.076, lng: 72.8777, address: "Mumbai, Maharashtra, India" },
  { lat: 12.9716, lng: 77.5946, address: "Bangalore, Karnataka, India" },
  { lat: 13.0827, lng: 80.2707, address: "Chennai, Tamil Nadu, India" },
  { lat: 22.5726, lng: 88.3639, address: "Kolkata, West Bengal, India" },
  { lat: 17.385, lng: 78.4867, address: "Hyderabad, Telangana, India" },
  { lat: 23.0225, lng: 72.5714, address: "Ahmedabad, Gujarat, India" },
  { lat: 18.5204, lng: 73.8567, address: "Pune, Maharashtra, India" },
  { lat: 26.9124, lng: 75.7873, address: "Jaipur, Rajasthan, India" },
  { lat: 30.7333, lng: 76.7794, address: "Chandigarh, India" },
  { lat: 21.1458, lng: 79.0882, address: "Nagpur, Maharashtra, India" },
  { lat: 15.2993, lng: 74.124, address: "Goa, India" },
  { lat: 25.5941, lng: 85.1376, address: "Patna, Bihar, India" },
  { lat: 26.8467, lng: 80.9462, address: "Lucknow, Uttar Pradesh, India" },
  { lat: 31.1048, lng: 77.1734, address: "Shimla, Himachal Pradesh, India" },
];

// Function to get a realistic Indian location based on user index
function getRealisticIndianLocation(index: number) {
  const locationIndex = index % indianCityLocations.length;
  const baseLocation = indianCityLocations[locationIndex];

  // Add small random offset to make locations more realistic (within ~5km radius)
  const latOffset = (Math.random() - 0.5) * 0.1; // ~5km latitude variation
  const lngOffset = (Math.random() - 0.5) * 0.1; // ~5km longitude variation

  return {
    lat: baseLocation.lat + latOffset,
    lng: baseLocation.lng + lngOffset,
    address: baseLocation.address,
  };
}

// Function to map external user to internal employee structure
function mapExternalUserToEmployee(
  user: ExternalUser,
  index: number,
): Employee {
  const userId = user._id;

  // Initialize default status if not exists
  if (!employeeStatuses[userId]) {
    const realisticLocation = getRealisticIndianLocation(index);
    employeeStatuses[userId] = {
      status: index === 1 ? "meeting" : index === 3 ? "inactive" : "active",
      location: {
        ...realisticLocation,
        timestamp: new Date().toISOString(),
      },
      lastUpdate: `${Math.floor(Math.random() * 15) + 1} minutes ago`,
      currentTask:
        index === 0
          ? "Client meeting"
          : index === 1
            ? "Equipment installation"
            : undefined,
    };
  }

  const status = employeeStatuses[userId];

  return {
    id: userId,
    name: user.name,
    email: user.email,
    phone: user.mobileNumber,
    status: status.status,
    location: status.location,
    lastUpdate: status.lastUpdate,
    currentTask: status.currentTask,
    deviceId: `device_${userId.slice(-6)}`,
    designation: user.designation,
    department: user.department,
    companyName: user.companyName[0]?.companyName,
    reportTo: user.report?.name,
  };
}

// Function to fetch users from external API
async function fetchExternalUsers(): Promise<ExternalUser[]> {
  try {
    console.log("Fetching users from external API:", EXTERNAL_API_URL);

    // Add timeout to external API call
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    const response = await fetch(EXTERNAL_API_URL, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "Employee-Tracker/1.0",
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(
        `HTTP error! status: ${response.status} ${response.statusText}`,
      );
    }

    const users = (await response.json()) as ExternalUser[];
    console.log("External API response:", {
      count: users.length,
      sample: users[0],
    });
    return Array.isArray(users) ? users : [];
  } catch (error) {
    console.error("Error fetching external users:", error);

    // Check if it's a timeout or abort error
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        console.error("External API request timed out after 30 seconds");
      } else if (error.message.includes("fetch")) {
        console.error("Network error connecting to external API");
      }
    }

    // Return empty array if API fails
    return [];
  }
}

export const getEmployees: RequestHandler = async (req, res) => {
  try {
    const externalUsers = await fetchExternalUsers();
    const employees = externalUsers.map((user, index) =>
      mapExternalUserToEmployee(user, index),
    );

    const response: EmployeesResponse = {
      employees,
      total: employees.length,
    };
    res.json(response);
  } catch (error) {
    console.error("Error fetching employees:", error);
    res.status(500).json({ error: "Failed to fetch employees" });
  }
};

export const getEmployee: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const externalUsers = await fetchExternalUsers();
    const userIndex = externalUsers.findIndex((user) => user._id === id);

    if (userIndex === -1) {
      return res.status(404).json({ error: "Employee not found" });
    }

    const employee = mapExternalUserToEmployee(
      externalUsers[userIndex],
      userIndex,
    );
    res.json(employee);
  } catch (error) {
    console.error("Error fetching employee:", error);
    res.status(500).json({ error: "Failed to fetch employee" });
  }
};

export const updateEmployeeLocation: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { lat, lng, accuracy } = req.body;

    // Check if employee exists in external API
    const externalUsers = await fetchExternalUsers();
    const userIndex = externalUsers.findIndex((user) => user._id === id);

    if (userIndex === -1) {
      return res.status(404).json({ error: "Employee not found" });
    }

    // Get formatted address from coordinates
    const address = getAddressFromCoordinates(lat, lng);
    console.log(`Generated address: ${address}`);

    // Update local status
    if (!employeeStatuses[id]) {
      employeeStatuses[id] = {
        status: "active",
        location: { lat, lng, address, timestamp: new Date().toISOString() },
        lastUpdate: "Just now",
      };
    } else {
      employeeStatuses[id] = {
        ...employeeStatuses[id],
        location: {
          lat,
          lng,
          address,
          timestamp: new Date().toISOString(),
        },
        lastUpdate: "Just now",
        status: "active", // Update status to active when location is updated
      };
    }

    const employee = mapExternalUserToEmployee(
      externalUsers[userIndex],
      userIndex,
    );

    const response: LocationUpdateResponse = {
      success: true,
      employee,
    };

    res.json(response);
  } catch (error) {
    console.error("Error updating employee location:", error);
    res.status(500).json({ error: "Failed to update location" });
  }
};

export const updateEmployeeStatus: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, currentTask } = req.body;

    // Check if employee exists in external API
    const externalUsers = await fetchExternalUsers();
    const userIndex = externalUsers.findIndex((user) => user._id === id);

    if (userIndex === -1) {
      return res.status(404).json({ error: "Employee not found" });
    }

    // Update local status
    if (!employeeStatuses[id]) {
      employeeStatuses[id] = {
        status: "active",
        location: {
          lat: 40.7128,
          lng: -74.006,
          address: "New York, NY",
          timestamp: new Date().toISOString(),
        },
        lastUpdate: "Just now",
      };
    }

    employeeStatuses[id] = {
      ...employeeStatuses[id],
      status,
      currentTask: currentTask || employeeStatuses[id].currentTask,
      lastUpdate: "Just now",
    };

    const employee = mapExternalUserToEmployee(
      externalUsers[userIndex],
      userIndex,
    );
    res.json(employee);
  } catch (error) {
    console.error("Error updating employee status:", error);
    res.status(500).json({ error: "Failed to update status" });
  }
};

export const createEmployee: RequestHandler = (req, res) => {
  // Since we're using external API, employee creation should be handled there
  res
    .status(501)
    .json({ error: "Employee creation should be handled by the external API" });
};

export const updateEmployee: RequestHandler = (req, res) => {
  // Since we're using external API, employee updates should be handled there
  res
    .status(501)
    .json({ error: "Employee updates should be handled by the external API" });
};

export const deleteEmployee: RequestHandler = (req, res) => {
  // Since we're using external API, employee deletion should be handled there
  res
    .status(501)
    .json({ error: "Employee deletion should be handled by the external API" });
};

export const refreshEmployeeLocations: RequestHandler = async (req, res) => {
  try {
    console.log("Refreshing all employee locations with Indian cities");

    // Clear existing location statuses
    employeeStatuses = {};

    // Get fresh data from external API
    const externalUsers = await fetchExternalUsers();

    // Re-initialize with fresh Indian locations
    const employees = externalUsers.map((user, index) =>
      mapExternalUserToEmployee(user, index),
    );

    console.log(`Refreshed locations for ${employees.length} employees`);

    res.json({
      success: true,
      message: `Successfully refreshed locations for ${employees.length} employees with Indian cities`,
      employees,
    });
  } catch (error) {
    console.error("Error refreshing employee locations:", error);
    res.status(500).json({ error: "Failed to refresh employee locations" });
  }
};
