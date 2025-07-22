// Existing demo interface
export interface DemoResponse {
  message: string;
}

// Employee tracking interfaces
export interface LocationData {
  lat: number;
  lng: number;
  address: string;
  timestamp: string;
}

// External API User structure
export interface ExternalUser {
  _id: string;
  target: number;
  name: string;
  email: string;
  companyName: Array<{
    companyName: string;
    _id: string;
  }>;
  report: {
    _id: string;
    name: string;
  };
  designation: string;
  department: string;
  mobileNumber: string;
}

// Internal Employee structure (mapped from external API)
export interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: "active" | "inactive" | "meeting";
  location: LocationData;
  lastUpdate: string;
  currentTask?: string;
  deviceId?: string;
  designation?: string;
  department?: string;
  companyName?: string;
  reportTo?: string;
}

export interface LocationUpdate {
  employeeId: string;
  location: {
    lat: number;
    lng: number;
  };
  timestamp: string;
  accuracy?: number;
}

// Enhanced tracking session data
export interface TrackingSession {
  id: string;
  employeeId: string;
  startTime: string;
  endTime?: string;
  startLocation: LocationData;
  endLocation?: LocationData;
  route: LocationData[]; // Array of coordinates for route
  totalDistance: number; // in meters
  duration?: number; // in seconds
  status: "active" | "completed";
}

// Enhanced meeting data with customer details
export interface MeetingDetails {
  customerName?: string;
  customerEmployeeName?: string;
  customerEmail?: string;
  customerMobile?: string;
  customerDesignation?: string;
  customerDepartment?: string;
  discussion: string; // mandatory
}

export interface MeetingLog {
  id: string;
  employeeId: string;
  location: LocationData;
  startTime: string;
  endTime?: string;
  clientName?: string;
  notes?: string;
  status: "started" | "in-progress" | "completed";
  trackingSessionId?: string;
  meetingDetails?: MeetingDetails;
}

// API Response types
export interface EmployeesResponse {
  employees: Employee[];
  total: number;
}

export interface LocationUpdateResponse {
  success: boolean;
  employee: Employee;
}

export interface MeetingLogsResponse {
  meetings: MeetingLog[];
  total: number;
}

export interface CreateMeetingRequest {
  employeeId: string;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  clientName?: string;
  notes?: string;
  trackingSessionId?: string;
}

// New interfaces for enhanced functionality
export interface TrackingSessionResponse {
  sessions: TrackingSession[];
  total: number;
}

export interface EndMeetingRequest {
  meetingDetails: MeetingDetails;
}

export interface MeetingHistoryResponse {
  meetings: MeetingLog[];
  total: number;
  page: number;
  totalPages: number;
}

export interface UpdateLocationRequest {
  lat: number;
  lng: number;
  accuracy?: number;
}
