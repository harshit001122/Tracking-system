import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Calendar,
  Clock,
  Filter,
  Download,
  BarChart3,
  Users,
  TrendingUp,
  Search,
  CalendarDays,
} from "lucide-react";
import { HttpClient } from "@/lib/httpClient";
import { format, startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";

interface EmployeeAnalytics {
  employeeId: string;
  employeeName: string;
  totalMeetings: number;
  todayMeetings: number;
  totalMeetingHours: number;
  totalDutyHours: number;
  status: "active" | "inactive" | "meeting";
}

interface EmployeeDayRecord {
  date: string;
  totalMeetings: number;
  startLocationTime: string;
  startLocationAddress: string;
  outLocationTime: string;
  outLocationAddress: string;
  totalDutyHours: number;
  meetingTime: number;
  travelAndLunchTime: number;
}

interface EmployeeMeetingRecord {
  employeeName: string;
  companyName: string;
  date: string;
  leadId?: string;
  meetingInTime: string;
  meetingInLocation: string;
  meetingOutTime: string;
  meetingOutLocation: string;
  totalStayTime: number;
  discussion: string;
  meetingPerson: string;
}

interface DashboardFilters {
  employeeId: string;
  dateRange: "today" | "yesterday" | "week" | "month" | "custom";
  startDate?: string;
  endDate?: string;
  searchTerm: string;
}

export default function Dashboard() {
  const [analytics, setAnalytics] = useState<EmployeeAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<DashboardFilters>({
    employeeId: "all",
    dateRange: "today",
    searchTerm: "",
  });

  // Detailed employee view state
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [employeeDayRecords, setEmployeeDayRecords] = useState<EmployeeDayRecord[]>([]);
  const [employeeMeetingRecords, setEmployeeMeetingRecords] = useState<EmployeeMeetingRecord[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Summary statistics
  const [summaryStats, setSummaryStats] = useState({
    totalEmployees: 0,
    activeMeetings: 0,
    totalMeetingsToday: 0,
    avgMeetingDuration: 0,
  });

  useEffect(() => {
    fetchAnalytics();
  }, [filters]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      
      // Build query parameters
      const queryParams = new URLSearchParams();
      if (filters.employeeId !== "all") {
        queryParams.append("employeeId", filters.employeeId);
      }
      queryParams.append("dateRange", filters.dateRange);
      if (filters.startDate) queryParams.append("startDate", filters.startDate);
      if (filters.endDate) queryParams.append("endDate", filters.endDate);
      if (filters.searchTerm) queryParams.append("search", filters.searchTerm);

      const response = await HttpClient.get(`/api/analytics/employees?${queryParams}`);
      
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data.analytics || []);
        setSummaryStats(data.summary || {
          totalEmployees: 0,
          activeMeetings: 0,
          totalMeetingsToday: 0,
          avgMeetingDuration: 0,
        });
      } else {
        console.error("Failed to fetch analytics");
        setAnalytics([]);
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
      setAnalytics([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: keyof DashboardFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const getDateRangeText = () => {
    switch (filters.dateRange) {
      case "today":
        return "Today";
      case "yesterday":
        return "Yesterday";
      case "week":
        return "This Week";
      case "month":
        return "This Month";
      case "custom":
        return filters.startDate && filters.endDate 
          ? `${format(new Date(filters.startDate), "MMM dd")} - ${format(new Date(filters.endDate), "MMM dd")}`
          : "Custom Range";
      default:
        return "Today";
    }
  };

  const exportData = () => {
    const csvContent = [
      ["Employee Name", "Customer", "Lead ID", "Total Meetings", "Today's Meetings", "Meeting Hours", "Duty Hours"],
      ...analytics.map(emp => [
        emp.employeeName,
        emp.recentCustomer || "-",
        emp.recentLeadId || "-",
        emp.totalMeetings.toString(),
        emp.todayMeetings.toString(),
        `${emp.totalMeetingHours.toFixed(1)}h`,
        `${emp.totalDutyHours.toFixed(1)}h`,
      ])
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `employee-analytics-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const formatHours = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-success text-success-foreground">Active</Badge>;
      case "meeting":
        return <Badge className="bg-warning text-warning-foreground">In Meeting</Badge>;
      case "inactive":
        return <Badge variant="secondary">Offline</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Analytics Dashboard</h1>
              <p className="text-sm text-muted-foreground">
                Employee performance and meeting analytics for {getDateRangeText()}
              </p>
            </div>
            <Button onClick={exportData} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export Data
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="container mx-auto px-4 py-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summaryStats.totalEmployees}</div>
              <p className="text-xs text-muted-foreground">Active in system</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Meetings</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">{summaryStats.activeMeetings}</div>
              <p className="text-xs text-muted-foreground">Currently ongoing</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Meetings {getDateRangeText()}</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{summaryStats.totalMeetingsToday}</div>
              <p className="text-xs text-muted-foreground">Completed meetings</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Meeting Duration</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-info">{summaryStats.avgMeetingDuration.toFixed(1)}h</div>
              <p className="text-xs text-muted-foreground">Per meeting</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div className="space-y-2">
                <Label htmlFor="search">Search Employee</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Search by name..."
                    value={filters.searchTerm}
                    onChange={(e) => handleFilterChange("searchTerm", e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>

              {/* Employee Filter */}
              <div className="space-y-2">
                <Label>Employee</Label>
                <Select
                  value={filters.employeeId}
                  onValueChange={(value) => handleFilterChange("employeeId", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Employees" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Employees</SelectItem>
                    {analytics.map(emp => (
                      <SelectItem key={emp.employeeId} value={emp.employeeId}>
                        {emp.employeeName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date Range Filter */}
              <div className="space-y-2">
                <Label>Date Range</Label>
                <Select
                  value={filters.dateRange}
                  onValueChange={(value) => handleFilterChange("dateRange", value as any)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="yesterday">Yesterday</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Refresh Button */}
              <div className="space-y-2">
                <Label>&nbsp;</Label>
                <Button 
                  onClick={fetchAnalytics} 
                  className="w-full"
                  disabled={loading}
                >
                  <CalendarDays className="h-4 w-4 mr-2" />
                  {loading ? "Loading..." : "Refresh"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Analytics Table */}
        <Card>
          <CardHeader>
            <CardTitle>Employee Analytics</CardTitle>
            <p className="text-sm text-muted-foreground">
              Detailed breakdown of employee performance and meeting statistics
            </p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading analytics...</p>
              </div>
            ) : analytics.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No data available for the selected filters</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-center">Total Meetings</TableHead>
                      <TableHead className="text-center">Today's Meetings</TableHead>
                      <TableHead className="text-center">Meeting Hours</TableHead>
                      <TableHead className="text-center">Duty Hours</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analytics.map((employee) => (
                      <TableRow key={employee.employeeId}>
                        <TableCell className="font-medium">
                          {employee.employeeName}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(employee.status)}
                        </TableCell>
                        <TableCell>
                          {employee.recentCustomer || (
                            <span className="text-muted-foreground">No recent customer</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {employee.recentLeadId || (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline">{employee.totalMeetings}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge 
                            variant="outline"
                            className={employee.todayMeetings > 0 ? "bg-success/10 text-success border-success" : ""}
                          >
                            {employee.todayMeetings}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center space-x-1">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span>{formatHours(employee.totalMeetingHours)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center space-x-1">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span>{formatHours(employee.totalDutyHours)}</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
