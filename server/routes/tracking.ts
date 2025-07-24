import { RequestHandler } from "express";
import {
  TrackingSession,
  TrackingSessionResponse,
  LocationData,
  MeetingDetails,
} from "@shared/api";

// In-memory storage for demo purposes
let trackingSessions: TrackingSession[] = [];
let sessionIdCounter = 1;

// In-memory storage for meeting history with customer details
let meetingHistory: Array<{
  id: string;
  sessionId: string;
  employeeId: string;
  meetingDetails: MeetingDetails;
  timestamp: string;
}> = [];
let historyIdCounter = 1;

export const getTrackingSessions: RequestHandler = (req, res) => {
  try {
    const { employeeId, status, startDate, endDate, limit } = req.query;
    let filteredSessions = trackingSessions;

    // Filter by employee ID
    if (employeeId) {
      filteredSessions = filteredSessions.filter(
        (session) => session.employeeId === employeeId,
      );
    }

    // Filter by status
    if (status) {
      filteredSessions = filteredSessions.filter(
        (session) => session.status === status,
      );
    }

    // Filter by date range
    if (startDate) {
      filteredSessions = filteredSessions.filter(
        (session) =>
          new Date(session.startTime) >= new Date(startDate as string),
      );
    }

    if (endDate) {
      filteredSessions = filteredSessions.filter(
        (session) => new Date(session.startTime) <= new Date(endDate as string),
      );
    }

    // Sort by start time (most recent first)
    filteredSessions.sort(
      (a, b) =>
        new Date(b.startTime).getTime() - new Date(a.startTime).getTime(),
    );

    // Apply limit if specified
    if (limit) {
      filteredSessions = filteredSessions.slice(0, parseInt(limit as string));
    }

    const response: TrackingSessionResponse = {
      sessions: filteredSessions,
      total: filteredSessions.length,
    };

    res.json(response);
  } catch (error) {
    console.error("Error fetching tracking sessions:", error);
    res.status(500).json({ error: "Failed to fetch tracking sessions" });
  }
};

export const createTrackingSession: RequestHandler = (req, res) => {
  try {
    const { employeeId, startLocation } = req.body;

    if (!employeeId || !startLocation) {
      return res.status(400).json({
        error: "Employee ID and start location are required",
      });
    }

    const newSession: TrackingSession = {
      id: `session_${String(sessionIdCounter++).padStart(3, "0")}`,
      employeeId,
      startTime: new Date().toISOString(),
      startLocation: {
        ...startLocation,
        timestamp: new Date().toISOString(),
      },
      route: [startLocation],
      totalDistance: 0,
      status: "active",
    };

    trackingSessions.push(newSession);

    res.status(201).json(newSession);
  } catch (error) {
    console.error("Error creating tracking session:", error);
    res.status(500).json({ error: "Failed to create tracking session" });
  }
};

export const updateTrackingSession: RequestHandler = (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const sessionIndex = trackingSessions.findIndex(
      (session) => session.id === id,
    );
    if (sessionIndex === -1) {
      return res.status(404).json({ error: "Tracking session not found" });
    }

    // If ending the session, set end time and calculate duration
    if (
      updates.status === "completed" &&
      !trackingSessions[sessionIndex].endTime
    ) {
      updates.endTime = new Date().toISOString();
      const startTime = new Date(
        trackingSessions[sessionIndex].startTime,
      ).getTime();
      const endTime = new Date(updates.endTime).getTime();
      updates.duration = Math.floor((endTime - startTime) / 1000); // Duration in seconds
    }

    trackingSessions[sessionIndex] = {
      ...trackingSessions[sessionIndex],
      ...updates,
    };

    res.json(trackingSessions[sessionIndex]);
  } catch (error) {
    console.error("Error updating tracking session:", error);
    res.status(500).json({ error: "Failed to update tracking session" });
  }
};

export const addLocationToRoute: RequestHandler = (req, res) => {
  try {
    const { id } = req.params;
    const { location } = req.body;

    if (!location) {
      return res.status(400).json({ error: "Location is required" });
    }

    const sessionIndex = trackingSessions.findIndex(
      (session) => session.id === id,
    );
    if (sessionIndex === -1) {
      return res.status(404).json({ error: "Tracking session not found" });
    }

    const session = trackingSessions[sessionIndex];

    // Add timestamp to location if not provided
    const locationWithTimestamp: LocationData = {
      ...location,
      timestamp: location.timestamp || new Date().toISOString(),
    };

    // Add to route
    session.route.push(locationWithTimestamp);

    // Calculate distance if this isn't the first location
    if (session.route.length > 1) {
      const prevLocation = session.route[session.route.length - 2];
      const distance = calculateDistance(
        prevLocation.lat,
        prevLocation.lng,
        location.lat,
        location.lng,
      );
      session.totalDistance += distance;
    }

    res.json(session);
  } catch (error) {
    console.error("Error adding location to route:", error);
    res.status(500).json({ error: "Failed to add location to route" });
  }
};

export const getTrackingSession: RequestHandler = (req, res) => {
  try {
    const { id } = req.params;
    const session = trackingSessions.find((session) => session.id === id);

    if (!session) {
      return res.status(404).json({ error: "Tracking session not found" });
    }

    res.json(session);
  } catch (error) {
    console.error("Error fetching tracking session:", error);
    res.status(500).json({ error: "Failed to fetch tracking session" });
  }
};

export const deleteTrackingSession: RequestHandler = (req, res) => {
  try {
    const { id } = req.params;
    const sessionIndex = trackingSessions.findIndex(
      (session) => session.id === id,
    );

    if (sessionIndex === -1) {
      return res.status(404).json({ error: "Tracking session not found" });
    }

    trackingSessions.splice(sessionIndex, 1);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting tracking session:", error);
    res.status(500).json({ error: "Failed to delete tracking session" });
  }
};

// Meeting History endpoints
export const getMeetingHistory: RequestHandler = (req, res) => {
  try {
    const { employeeId, page = 1, limit = 10 } = req.query;
    let filteredHistory = meetingHistory;

    // Filter by employee ID
    if (employeeId) {
      filteredHistory = filteredHistory.filter(
        (history) => history.employeeId === employeeId,
      );
    }

    // Sort by timestamp (most recent first)
    filteredHistory.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    // Pagination
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedHistory = filteredHistory.slice(startIndex, endIndex);

    const response = {
      meetings: paginatedHistory,
      total: filteredHistory.length,
      page: pageNum,
      totalPages: Math.ceil(filteredHistory.length / limitNum),
    };

    res.json(response);
  } catch (error) {
    console.error("Error fetching meeting history:", error);
    res.status(500).json({ error: "Failed to fetch meeting history" });
  }
};

export const addMeetingToHistory: RequestHandler = (req, res) => {
  try {
    const { sessionId, employeeId, meetingDetails } = req.body;

    console.log("Adding meeting to history:", {
      sessionId,
      employeeId,
      meetingDetails,
    });

    if (!sessionId || !employeeId || !meetingDetails) {
      return res.status(400).json({
        error: "Session ID, employee ID, and meeting details are required",
      });
    }

    // Validate that discussion is provided (mandatory field)
    if (!meetingDetails.discussion || !meetingDetails.discussion.trim()) {
      return res.status(400).json({
        error: "Discussion details are required",
      });
    }

    // Validate customers array or legacy customer fields
    if (!meetingDetails.customers || meetingDetails.customers.length === 0) {
      // Check if legacy fields are provided for backward compatibility
      if (!meetingDetails.customerName || !meetingDetails.customerEmployeeName) {
        return res.status(400).json({
          error: "At least one customer contact is required",
        });
      }

      // Convert legacy fields to new format
      meetingDetails.customers = [{
        customerName: meetingDetails.customerName,
        customerEmployeeName: meetingDetails.customerEmployeeName,
        customerEmail: meetingDetails.customerEmail || "",
        customerMobile: meetingDetails.customerMobile || "",
        customerDesignation: meetingDetails.customerDesignation || "",
        customerDepartment: meetingDetails.customerDepartment || "",
      }];
    }

    const newHistoryEntry = {
      id: `history_${String(historyIdCounter++).padStart(3, "0")}`,
      sessionId,
      employeeId,
      meetingDetails,
      timestamp: new Date().toISOString(),
    };

    meetingHistory.push(newHistoryEntry);

    console.log("Meeting history entry added:", newHistoryEntry);
    console.log("Total meeting history entries:", meetingHistory.length);

    res.status(201).json(newHistoryEntry);
  } catch (error) {
    console.error("Error adding meeting to history:", error);
    res.status(500).json({ error: "Failed to add meeting to history" });
  }
};

// Helper function to calculate distance between two points using Haversine formula
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng1 - lng2) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}
