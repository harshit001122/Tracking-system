import { RequestHandler } from "express";
import { format, startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isToday, parseISO } from "date-fns";
// We'll create our own functions here since the employees module doesn't export what we need
import { ExternalUser, Employee } from "@shared/api";

// Function to get date range based on filter
function getDateRange(dateRange: string, startDate?: string, endDate?: string) {
  const now = new Date();
  
  switch (dateRange) {
    case "today":
      return {
        start: startOfDay(now),
        end: endOfDay(now)
      };
    case "yesterday":
      const yesterday = subDays(now, 1);
      return {
        start: startOfDay(yesterday),
        end: endOfDay(yesterday)
      };
    case "week":
      return {
        start: startOfWeek(now, { weekStartsOn: 1 }), // Monday
        end: endOfWeek(now, { weekStartsOn: 1 })
      };
    case "month":
      return {
        start: startOfMonth(now),
        end: endOfMonth(now)
      };
    case "custom":
      if (startDate && endDate) {
        return {
          start: startOfDay(parseISO(startDate)),
          end: endOfDay(parseISO(endDate))
        };
      }
      // Fallback to today
      return {
        start: startOfDay(now),
        end: endOfDay(now)
      };
    default:
      return {
        start: startOfDay(now),
        end: endOfDay(now)
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
function calculateDutyHours(employeeId: string, dateRange: { start: Date; end: Date }): number {
  // This is a placeholder calculation
  // In a real app, this would calculate based on tracking sessions, check-ins, etc.
  // For now, we'll assume 8 hours per working day in the date range
  const daysInRange = Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24));
  return Math.min(daysInRange * 8, 40); // Max 40 hours per week
}

export const getEmployeeAnalytics: RequestHandler = async (req, res) => {
  try {
    const { employeeId, dateRange = "today", startDate, endDate, search } = req.query;

    // Get date range
    const { start, end } = getDateRange(
      dateRange as string,
      startDate as string,
      endDate as string
    );

    console.log(`Fetching analytics for date range: ${start} to ${end}`);

    // Fetch all employees
    const externalUsers = await fetchExternalUsers();
    let employees = externalUsers.map((user, index) => mapExternalUserToEmployee(user, index));

    // Filter by employee if specified
    if (employeeId && employeeId !== "all") {
      employees = employees.filter(emp => emp.id === employeeId);
    }

    // Filter by search term if specified
    if (search) {
      const searchTerm = (search as string).toLowerCase();
      employees = employees.filter(emp => 
        emp.name.toLowerCase().includes(searchTerm) ||
        emp.email.toLowerCase().includes(searchTerm)
      );
    }

    // Import meetings data (this would normally be from a shared module or database)
    // For now, we'll create some mock meeting data
    const mockMeetings = generateMockMeetings(employees, start, end);

    // Calculate analytics for each employee
    const analytics = employees.map(employee => {
      // Get meetings for this employee
      const employeeMeetings = mockMeetings.filter(meeting => meeting.employeeId === employee.id);
      
      // Filter meetings by date range
      const meetingsInRange = employeeMeetings.filter(meeting => {
        const meetingDate = new Date(meeting.startTime);
        return meetingDate >= start && meetingDate <= end;
      });

      // Calculate today's meetings
      const todayMeetings = employeeMeetings.filter(meeting => 
        isToday(new Date(meeting.startTime))
      ).length;

      // Calculate total meeting hours
      const totalMeetingHours = meetingsInRange.reduce((total, meeting) => {
        return total + calculateMeetingDuration(meeting.startTime, meeting.endTime);
      }, 0);

      // Calculate duty hours
      const totalDutyHours = calculateDutyHours(employee.id, { start, end });

      // Get most recent meeting info
      const recentMeeting = employeeMeetings
        .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())[0];

      return {
        employeeId: employee.id,
        employeeName: employee.name,
        totalMeetings: employeeMeetings.length,
        todayMeetings,
        totalMeetingHours,
        totalDutyHours,
        recentCustomer: recentMeeting?.clientName,
        recentLeadId: recentMeeting?.leadId,
        status: employee.status,
      };
    });

    // Calculate summary statistics
    const summary = {
      totalEmployees: employees.length,
      activeMeetings: employees.filter(emp => emp.status === "meeting").length,
      totalMeetingsToday: analytics.reduce((sum, emp) => sum + emp.todayMeetings, 0),
      avgMeetingDuration: analytics.length > 0 
        ? analytics.reduce((sum, emp) => sum + emp.totalMeetingHours, 0) / 
          Math.max(analytics.reduce((sum, emp) => sum + emp.totalMeetings, 0), 1)
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
function generateMockMeetings(employees: any[], startDate: Date, endDate: Date) {
  const meetings: any[] = [];
  const customers = ["Tech Corp", "ABC Industries", "XYZ Solutions", "Global Systems", "Innovation Ltd"];
  const leadIds = ["LEAD-001", "LEAD-002", "LEAD-003", "LEAD-004", "LEAD-005"];
  
  employees.forEach((employee, empIndex) => {
    // Generate 1-5 meetings per employee in the date range
    const meetingCount = Math.floor(Math.random() * 5) + 1;
    
    for (let i = 0; i < meetingCount; i++) {
      // Random date within range
      const randomTime = new Date(
        startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime())
      );
      
      // Random meeting duration (30 minutes to 3 hours)
      const durationHours = (Math.random() * 2.5) + 0.5;
      const endTime = new Date(randomTime.getTime() + (durationHours * 60 * 60 * 1000));
      
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
        }
      ]
    };
    
    res.json(trends);
  } catch (error) {
    console.error("Error fetching meeting trends:", error);
    res.status(500).json({ error: "Failed to fetch trends" });
  }
};
