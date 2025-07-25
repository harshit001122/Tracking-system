import { RequestHandler } from "express";
import {
  MeetingLog,
  MeetingLogsResponse,
  CreateMeetingRequest,
} from "@shared/api";

// In-memory storage for demo purposes
export let meetings: MeetingLog[] = [];

let meetingIdCounter = 1;

export const getMeetings: RequestHandler = (req, res) => {
  try {
    const { employeeId, status, startDate, endDate } = req.query;
    let filteredMeetings = meetings;

    // Filter by employee ID
    if (employeeId) {
      filteredMeetings = filteredMeetings.filter(
        (meeting) => meeting.employeeId === employeeId,
      );
    }

    // Filter by status
    if (status) {
      filteredMeetings = filteredMeetings.filter(
        (meeting) => meeting.status === status,
      );
    }

    // Filter by date range
    if (startDate) {
      filteredMeetings = filteredMeetings.filter(
        (meeting) =>
          new Date(meeting.startTime) >= new Date(startDate as string),
      );
    }

    if (endDate) {
      filteredMeetings = filteredMeetings.filter(
        (meeting) => new Date(meeting.startTime) <= new Date(endDate as string),
      );
    }

    // Sort by start time (most recent first)
    filteredMeetings.sort(
      (a, b) =>
        new Date(b.startTime).getTime() - new Date(a.startTime).getTime(),
    );

    const response: MeetingLogsResponse = {
      meetings: filteredMeetings,
      total: filteredMeetings.length,
    };

    res.json(response);
  } catch (error) {
    console.error("Error fetching meetings:", error);
    res.status(500).json({ error: "Failed to fetch meetings" });
  }
};

export const createMeeting: RequestHandler = (req, res) => {
  try {
    const { employeeId, location, clientName, notes, leadId, leadInfo } = req.body;

    if (!employeeId || !location) {
      return res.status(400).json({
        error: "Employee ID and location are required",
      });
    }

    console.log("Creating meeting with lead info:", { leadId, leadInfo });

    const newMeeting: MeetingLog = {
      id: `meeting_${String(meetingIdCounter++).padStart(3, "0")}`,
      employeeId,
      location: {
        ...location,
        timestamp: new Date().toISOString(),
      },
      startTime: new Date().toISOString(),
      clientName,
      notes,
      status: "in-progress",
      leadId: leadId || undefined,
      leadInfo: leadInfo || undefined,
    };

    meetings.push(newMeeting);

    res.status(201).json(newMeeting);
  } catch (error) {
    console.error("Error creating meeting:", error);
    res.status(500).json({ error: "Failed to create meeting" });
  }
};

export const updateMeeting: RequestHandler = (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const meetingIndex = meetings.findIndex((meeting) => meeting.id === id);
    if (meetingIndex === -1) {
      return res.status(404).json({ error: "Meeting not found" });
    }

    // If ending the meeting, set end time
    if (updates.status === "completed" && !meetings[meetingIndex].endTime) {
      updates.endTime = new Date().toISOString();
    }

    // Validate meeting details if provided
    if (updates.meetingDetails) {
      if (!updates.meetingDetails.discussion || !updates.meetingDetails.discussion.trim()) {
        return res.status(400).json({ error: "Discussion details are required" });
      }
    }

    meetings[meetingIndex] = {
      ...meetings[meetingIndex],
      ...updates,
    };

    res.json(meetings[meetingIndex]);
  } catch (error) {
    console.error("Error updating meeting:", error);
    res.status(500).json({ error: "Failed to update meeting" });
  }
};

export const getMeeting: RequestHandler = (req, res) => {
  try {
    const { id } = req.params;
    const meeting = meetings.find((meeting) => meeting.id === id);

    if (!meeting) {
      return res.status(404).json({ error: "Meeting not found" });
    }

    res.json(meeting);
  } catch (error) {
    console.error("Error fetching meeting:", error);
    res.status(500).json({ error: "Failed to fetch meeting" });
  }
};

export const deleteMeeting: RequestHandler = (req, res) => {
  try {
    const { id } = req.params;
    const meetingIndex = meetings.findIndex((meeting) => meeting.id === id);

    if (meetingIndex === -1) {
      return res.status(404).json({ error: "Meeting not found" });
    }

    meetings.splice(meetingIndex, 1);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting meeting:", error);
    res.status(500).json({ error: "Failed to delete meeting" });
  }
};
