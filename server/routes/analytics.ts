import { RequestHandler } from "express";
import {
  format,
  startOfDay,
  endOfDay,
  subDays,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  isToday,
  parseISO,
} from "date-fns";
// We'll create our own functions here since the employees module doesn't export what we need
import { ExternalUser, Employee } from "@shared/api";

// Replicate the external API fetch function
const EXTERNAL_API_URL = "https://jbdspower.in/LeafNetServer/api/user";

async function fetchExternalUsers(): Promise<ExternalUser[]> {
  try {
    console.log("Fetching users from external API:", EXTERNAL_API_URL);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(EXTERNAL_API_URL, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const users: ExternalUser[] = await response.json();
    console.log(
      `External API response: { count: ${users.length}, sample: ${JSON.stringify(users[0] || {}, null, 2)} }`,
    );

    return users;
  } catch (error) {
    console.error("Error fetching external users:", error);
    if (error.name === "AbortError") {
      console.error("External API request timed out after 30 seconds");
    } else if (error.message.includes("fetch")) {
      console.error("Network error connecting to external API");
    }
    return [];
  }
}

// Replicate the mapping function
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

function getRealisticIndianLocation(index: number) {
  const locations = [
    { lat: 28.6139, lng: 77.209, address: "New Delhi, India" },
    { lat: 19.076, lng: 72.8777, address: "Mumbai, Maharashtra" },
    { lat: 12.9716, lng: 77.5946, address: "Bangalore, Karnataka" },
    { lat: 13.0827, lng: 80.2707, address: "Chennai, Tamil Nadu" },
    { lat: 22.5726, lng: 88.3639, address: "Kolkata, West Bengal" },
    { lat: 26.9124, lng: 75.7873, address: "Jaipur, Rajasthan" },
    { lat: 21.1458, lng: 79.0882, address: "Nagpur, Maharashtra" },
    { lat: 23.0225, lng: 72.5714, address: "Ahmedabad, Gujarat" },
    { lat: 17.385, lng: 78.4867, address: "Hyderabad, Telangana" },
    { lat: 18.5204, lng: 73.8567, address: "Pune, Maharashtra" },
  ];
  return locations[index % locations.length];
}

function mapExternalUserToEmployee(
  user: ExternalUser,
  index: number,
): Employee {
  const userId = user._id;

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

// Function to get date range based on filter
function getDateRange(dateRange: string, startDate?: string, endDate?: string) {
  const now = new Date();

  switch (dateRange) {
    case "today":
      return {
        start: startOfDay(now),
        end: endOfDay(now),
      };
    case "yesterday":
      const yesterday = subDays(now, 1);
      return {
        start: startOfDay(yesterday),
        end: endOfDay(yesterday),
      };
    case "week":
      return {
        start: startOfWeek(now, { weekStartsOn: 1 }), // Monday
        end: endOfWeek(now, { weekStartsOn: 1 }),
      };
    case "month":
      return {
        start: startOfMonth(now),
        end: endOfMonth(now),
      };
    case "custom":
      if (startDate && endDate) {
        return {
          start: startOfDay(parseISO(startDate)),
          end: endOfDay(parseISO(endDate)),
        };
      }
      // Fallback to today
      return {
        start: startOfDay(now),
        end: endOfDay(now),
      };
    default:
      return {
        start: startOfDay(now),
        end: endOfDay(now),
      };
  }
}

// Function to calculate meeting duration in hours
function calculateMeetingDuration(startTime: string, endTime?: string): number {
  const start = new Date(startTime);
  const end = endTime ? new Date(endTime) : new Date();
  const durationMs = end.getTime() - start.getTime();
  return durationMs / (1000 * 60 * 60); // Convert to hours
}

// Function to calculate duty hours (placeholder - would need tracking data)
function calculateDutyHours(
  employeeId: string,
  dateRange: { start: Date; end: Date },
): number {
  // This is a placeholder calculation
  // In a real app, this would calculate based on tracking sessions, check-ins, etc.
  // For now, we'll assume 8 hours per working day in the date range
  const daysInRange = Math.ceil(
    (dateRange.end.getTime() - dateRange.start.getTime()) /
      (1000 * 60 * 60 * 24),
  );
  return Math.min(daysInRange * 8, 40); // Max 40 hours per week
}

export const getEmployeeAnalytics: RequestHandler = async (req, res) => {
  try {
    const {
      employeeId,
      dateRange = "today",
      startDate,
      endDate,
      search,
    } = req.query;

    // Get date range
    const { start, end } = getDateRange(
      dateRange as string,
      startDate as string,
      endDate as string,
    );

    console.log(`Fetching analytics for date range: ${start} to ${end}`);

    // Fetch all employees
    const externalUsers = await fetchExternalUsers();
    let employees = externalUsers.map((user, index) =>
      mapExternalUserToEmployee(user, index),
    );

    // Filter by employee if specified
    if (employeeId && employeeId !== "all") {
      employees = employees.filter((emp) => emp.id === employeeId);
    }

    // Filter by search term if specified
    if (search) {
      const searchTerm = (search as string).toLowerCase();
      employees = employees.filter(
        (emp) =>
          emp.name.toLowerCase().includes(searchTerm) ||
          emp.email.toLowerCase().includes(searchTerm),
      );
    }

    // Get actual meeting data from the meetings module
    // Import the meetings array from meetings.ts
    const { meetings: actualMeetings } = await import("./meetings");

    console.log("Using actual meetings data:", actualMeetings);

    // Calculate analytics for each employee
    const analytics = employees.map((employee) => {
      // Get meetings for this employee
      const employeeMeetings = actualMeetings.filter(
        (meeting) => meeting.employeeId === employee.id,
      );

      // Filter meetings by date range
      const meetingsInRange = employeeMeetings.filter((meeting) => {
        const meetingDate = new Date(meeting.startTime);
        return meetingDate >= start && meetingDate <= end;
      });

      // Calculate today's meetings
      const todayMeetings = employeeMeetings.filter((meeting) =>
        isToday(new Date(meeting.startTime)),
      ).length;

      // Calculate total meeting hours
      const totalMeetingHours = meetingsInRange.reduce((total, meeting) => {
        return (
          total + calculateMeetingDuration(meeting.startTime, meeting.endTime)
        );
      }, 0);

      // Calculate duty hours
      const totalDutyHours = calculateDutyHours(employee.id, { start, end });

      return {
        employeeId: employee.id,
        employeeName: employee.name,
        totalMeetings: employeeMeetings.length,
        todayMeetings,
        totalMeetingHours,
        totalDutyHours,
        status: employee.status,
      };
    });

    // Calculate summary statistics
    const summary = {
      totalEmployees: employees.length,
      activeMeetings: employees.filter((emp) => emp.status === "meeting")
        .length,
      totalMeetingsToday: analytics.reduce(
        (sum, emp) => sum + emp.todayMeetings,
        0,
      ),
      avgMeetingDuration:
        analytics.length > 0
          ? analytics.reduce((sum, emp) => sum + emp.totalMeetingHours, 0) /
            Math.max(
              analytics.reduce((sum, emp) => sum + emp.totalMeetings, 0),
              1,
            )
          : 0,
    };

    res.json({
      analytics,
      summary,
      dateRange: {
        start: start.toISOString(),
        end: end.toISOString(),
        label: dateRange,
      },
    });
  } catch (error) {
    console.error("Error fetching employee analytics:", error);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
};

// Mock meeting data generator for demonstration
function generateMockMeetings(
  employees: any[],
  startDate: Date,
  endDate: Date,
) {
  const meetings: any[] = [];
  const customers = [
    "Tech Corp",
    "ABC Industries",
    "XYZ Solutions",
    "Global Systems",
    "Innovation Ltd",
  ];
  const leadIds = ["LEAD-001", "LEAD-002", "LEAD-003", "LEAD-004", "LEAD-005"];

  employees.forEach((employee, empIndex) => {
    // Generate 1-5 meetings per employee in the date range
    const meetingCount = Math.floor(Math.random() * 5) + 1;

    for (let i = 0; i < meetingCount; i++) {
      // Random date within range
      const randomTime = new Date(
        startDate.getTime() +
          Math.random() * (endDate.getTime() - startDate.getTime()),
      );

      // Random meeting duration (30 minutes to 3 hours)
      const durationHours = Math.random() * 2.5 + 0.5;
      const endTime = new Date(
        randomTime.getTime() + durationHours * 60 * 60 * 1000,
      );

      meetings.push({
        id: `meeting_${empIndex}_${i}`,
        employeeId: employee.id,
        startTime: randomTime.toISOString(),
        endTime: endTime.toISOString(),
        clientName: customers[Math.floor(Math.random() * customers.length)],
        leadId: leadIds[Math.floor(Math.random() * leadIds.length)],
        status: "completed",
        location: employee.location,
      });
    }
  });

  return meetings;
}

export const getEmployeeDetails: RequestHandler = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { dateRange = "today", startDate, endDate } = req.query;

    // Get date range
    const { start, end } = getDateRange(
      dateRange as string,
      startDate as string,
      endDate as string,
    );

    console.log(
      `Fetching employee details for ${employeeId}, date range: ${start} to ${end}`,
    );

    // Get actual meeting data
    const { meetings: actualMeetings } = await import("./meetings");

    // Filter meetings for this employee within date range
    const employeeMeetings = actualMeetings.filter((meeting) => {
      const meetingDate = new Date(meeting.startTime);
      return (
        meeting.employeeId === employeeId &&
        meetingDate >= start &&
        meetingDate <= end
      );
    });

    // Group by date for day records
    const dateGroups = employeeMeetings.reduce(
      (groups, meeting) => {
        const date = format(new Date(meeting.startTime), "yyyy-MM-dd");
        if (!groups[date]) groups[date] = [];
        groups[date].push(meeting);
        return groups;
      },
      {} as Record<string, any[]>,
    );

    // Generate day records
    const dayRecords = Object.entries(dateGroups).map(([date, meetings]) => {
      const totalMeetings = meetings.length;
      const totalMeetingHours = meetings.reduce((total, meeting) => {
        return (
          total + calculateMeetingDuration(meeting.startTime, meeting.endTime)
        );
      }, 0);

      return {
        date,
        totalMeetings,
        startLocationTime: meetings[0]?.startTime || "",
        startLocationAddress: meetings[0]?.location?.address || "",
        outLocationTime: meetings[meetings.length - 1]?.endTime || "",
        outLocationAddress:
          meetings[meetings.length - 1]?.location?.address || "",
        totalDutyHours: 8, // Placeholder - would calculate from tracking data
        meetingTime: totalMeetingHours,
        travelAndLunchTime: Math.max(0, 8 - totalMeetingHours), // Simplified calculation
      };
    });

    // Generate meeting records
    const meetingRecords = employeeMeetings.map((meeting) => ({
      employeeName: "", // Will be filled by client
      companyName: meeting.clientName || "Unknown Company",
      date: format(new Date(meeting.startTime), "yyyy-MM-dd"),
      leadId: meeting.leadId || "",
      meetingInTime: format(new Date(meeting.startTime), "HH:mm"),
      meetingInLocation: meeting.location?.address || "",
      meetingOutTime: meeting.endTime
        ? format(new Date(meeting.endTime), "HH:mm")
        : "",
      meetingOutLocation: meeting.location?.address || "",
      totalStayTime: calculateMeetingDuration(
        meeting.startTime,
        meeting.endTime,
      ),
      discussion: meeting.meetingDetails?.discussion || meeting.notes || "",
      meetingPerson:
        meeting.meetingDetails?.customers?.length > 0
          ? meeting.meetingDetails.customers
              .map((customer) => customer.customerEmployeeName)
              .join(", ")
          : meeting.meetingDetails?.customerEmployeeName || "Unknown",
    }));

    res.json({
      dayRecords: dayRecords.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      ),
      meetingRecords: meetingRecords.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      ),
    });
  } catch (error) {
    console.error("Error fetching employee details:", error);
    res.status(500).json({ error: "Failed to fetch employee details" });
  }
};

export const getMeetingTrends: RequestHandler = async (req, res) => {
  try {
    const { employeeId, period = "week" } = req.query;

    // This would calculate meeting trends over time
    // For now, return mock data
    const trends = {
      labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      datasets: [
        {
          label: "Meetings",
          data: [2, 4, 3, 5, 2, 1, 0],
        },
        {
          label: "Hours",
          data: [4, 8, 6, 10, 4, 2, 0],
        },
      ],
    };

    res.json(trends);
  } catch (error) {
    console.error("Error fetching meeting trends:", error);
    res.status(500).json({ error: "Failed to fetch trends" });
  }
};
