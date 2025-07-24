import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import {
  getEmployees,
  getEmployee,
  updateEmployeeLocation,
  updateEmployeeStatus,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  refreshEmployeeLocations,
} from "./routes/employees";
import {
  getMeetings,
  createMeeting,
  updateMeeting,
  getMeeting,
  deleteMeeting,
} from "./routes/meetings";
import {
  getTrackingSessions,
  createTrackingSession,
  updateTrackingSession,
  addLocationToRoute,
  getTrackingSession,
  deleteTrackingSession,
  getMeetingHistory,
  addMeetingToHistory,
} from "./routes/tracking";
import {
  getEmployeeAnalytics,
  getMeetingTrends,
} from "./routes/analytics";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Request logging
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
    next();
  });

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    console.log("Health check ping received");
    res.json({
      message: "Hello from Express server v2!",
      timestamp: new Date().toISOString(),
      status: "ok",
    });
  });

  app.get("/api/demo", handleDemo);

  // Employee routes
  app.get("/api/employees", getEmployees);
  app.post("/api/employees", createEmployee);
  app.get("/api/employees/:id", getEmployee);
  app.put("/api/employees/:id", updateEmployee);
  app.delete("/api/employees/:id", deleteEmployee);
  app.put("/api/employees/:id/location", updateEmployeeLocation);
  app.put("/api/employees/:id/status", updateEmployeeStatus);
  app.post("/api/employees/refresh-locations", refreshEmployeeLocations);

  // Meeting routes
  app.get("/api/meetings", getMeetings);
  app.post("/api/meetings", createMeeting);
  app.get("/api/meetings/:id", getMeeting);
  app.put("/api/meetings/:id", updateMeeting);
  app.delete("/api/meetings/:id", deleteMeeting);

  // Tracking session routes
  app.get("/api/tracking-sessions", getTrackingSessions);
  app.post("/api/tracking-sessions", createTrackingSession);
  app.get("/api/tracking-sessions/:id", getTrackingSession);
  app.put("/api/tracking-sessions/:id", updateTrackingSession);
  app.delete("/api/tracking-sessions/:id", deleteTrackingSession);
  app.post("/api/tracking-sessions/:id/location", addLocationToRoute);

  // Meeting history routes
  app.get("/api/meeting-history", getMeetingHistory);
  app.post("/api/meeting-history", addMeetingToHistory);

  return app;
}
