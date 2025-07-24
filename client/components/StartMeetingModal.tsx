import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Clock, MapPin, User, Loader2, AlertCircle, FileText } from "lucide-react";
import { Customer, Lead } from "@shared/api";
import { SearchableSelect, SearchableSelectOption } from "@/components/ui/searchable-select";

interface StartMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartMeeting: (meetingData: {
    clientName: string;
    reason: string;
    notes: string;
    leadId?: string;
    leadInfo?: {
      id: string;
      companyName: string;
      contactName: string;
    };
  }) => void;
  employeeName: string;
  location: string;
  isLoading?: boolean;
}



// Meeting reasons/types
const MEETING_REASONS = [
  "Initial Client Meeting",
  "Project Discussion",
  "Equipment Installation",
  "System Maintenance",
  "Technical Support",
  "Training Session",
  "Progress Review",
  "Problem Resolution",
  "Contract Negotiation",
  "Follow-up Meeting",
  "Emergency Response",
  "Consultation",
  "Demo/Presentation",
  "Site Survey",
  "Other",
];

export function StartMeetingModal({
  isOpen,
  onClose,
  onStartMeeting,
  employeeName,
  location,
  isLoading = false,
}: StartMeetingModalProps) {
  const [clientName, setClientName] = useState("");
  const [customClient, setCustomClient] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [customerError, setCustomerError] = useState<string | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [leadError, setLeadError] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<string>("");

  // Fetch customers from external API
  const fetchCustomers = async () => {
    setLoadingCustomers(true);
    setCustomerError(null);
    try {
      console.log("Fetching companies from external API for start meeting...");
      const response = await fetch(
        "https://jbdspower.in/LeafNetServer/api/customer",
      );
      if (!response.ok) {
        throw new Error(`Failed to fetch customers: ${response.statusText}`);
      }
      const data = await response.json();

      // The API returns an array directly
      const customerArray = Array.isArray(data) ? data : [];
      console.log(`Fetched ${customerArray.length} companies for start meeting`);
      setCustomers(customerArray);
    } catch (err) {
      console.error("Error fetching customers for start meeting:", err);
      setCustomerError(
        err instanceof Error ? err.message : "Failed to fetch customers",
      );
    } finally {
      setLoadingCustomers(false);
    }
  };

  // Fetch leads from external API
  const fetchLeads = async () => {
    setLoadingLeads(true);
    setLeadError(null);
    try {
      console.log("Fetching leads from external API for start meeting...");
      const response = await fetch(
        "https://jbdspower.in/LeafNetServer/api/getAllLead",
      );
      if (!response.ok) {
        throw new Error(`Failed to fetch leads: ${response.statusText}`);
      }
      const data = await response.json();

      // The API returns an array directly
      const leadArray = Array.isArray(data) ? data : [];
      console.log(`Fetched ${leadArray.length} leads for start meeting`);
      setLeads(leadArray);
    } catch (err) {
      console.error("Error fetching leads for start meeting:", err);
      setLeadError(
        err instanceof Error ? err.message : "Failed to fetch leads",
      );
    } finally {
      setLoadingLeads(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchCustomers();
      fetchLeads();
    }
  }, [isOpen]);

  const handleSubmit = () => {
    // Validate form
    const newErrors: { [key: string]: string } = {};

    const finalClientName = clientName === "custom" ? customClient : clientName;

    if (!finalClientName.trim()) {
      newErrors.client = "Client name is required";
    }

    if (!reason) {
      newErrors.reason = "Meeting reason is required";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Get selected lead info
    const selectedLeadInfo = selectedLead ? leads.find(lead => lead.Id === selectedLead) : null;

    // Clear errors and submit
    setErrors({});
    onStartMeeting({
      clientName: finalClientName,
      reason,
      notes: notes.trim(),
      leadId: selectedLead || undefined,
      leadInfo: selectedLeadInfo ? {
        id: selectedLeadInfo.Id,
        companyName: selectedLeadInfo.CompanyName,
        contactName: selectedLeadInfo.Name,
      } : undefined,
    });
  };

  const handleClose = () => {
    // Reset form
    setClientName("");
    setCustomClient("");
    setReason("");
    setNotes("");
    setErrors({});
    setCustomerError(null);
    setLeadError(null);
    setSelectedLead("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5 text-primary" />
            <span>Start Meeting</span>
          </DialogTitle>
          <DialogDescription>
            Create a new meeting record for {employeeName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Meeting Location */}
          <div className="flex items-center space-x-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
            <MapPin className="h-4 w-4" />
            <span>Location: {location}</span>
          </div>

          {/* Client Selection */}
          <div className="space-y-2">
            <Label htmlFor="client">Client / Company</Label>
            {customerError ? (
              <div className="space-y-2">
                <div className="border border-destructive rounded-md p-3 text-sm text-destructive">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="h-4 w-4" />
                    <p className="font-medium">Failed to load companies</p>
                  </div>
                  <p className="text-xs mt-1">{customerError}</p>
                  <button
                    type="button"
                    onClick={fetchCustomers}
                    className="mt-2 px-3 py-1 bg-destructive/10 hover:bg-destructive/20 rounded text-xs"
                  >
                    Retry
                  </button>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customClientFallback">Enter Client Name Manually</Label>
                  <Input
                    id="customClientFallback"
                    value={customClient}
                    onChange={(e) => {
                      setCustomClient(e.target.value);
                      setClientName("custom");
                    }}
                    placeholder="Enter client name"
                    className={errors.client ? "border-destructive" : ""}
                  />
                </div>
              </div>
            ) : (
              <Select value={clientName} onValueChange={setClientName}>
                <SelectTrigger
                  className={errors.client ? "border-destructive" : ""}
                >
                  <SelectValue
                    placeholder={
                      loadingCustomers ? (
                        <div className="flex items-center space-x-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Loading companies...</span>
                        </div>
                      ) : (
                        "Select a company or choose custom"
                      )
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {customers.length === 0 && !loadingCustomers ? (
                    <SelectItem value="no-companies" disabled>
                      No companies found
                    </SelectItem>
                  ) : (
                    customers.map((customer) => (
                      <SelectItem key={customer._id} value={customer.CustomerCompanyName}>
                        {customer.CustomerCompanyName}
                      </SelectItem>
                    ))
                  )}
                  <SelectItem value="custom">Custom Client...</SelectItem>
                </SelectContent>
              </Select>
            )}
            {errors.client && (
              <p className="text-sm text-destructive">{errors.client}</p>
            )}
          </div>

          {/* Custom Client Input */}
          {clientName === "custom" && (
            <div className="space-y-2">
              <Label htmlFor="customClient">Custom Client Name</Label>
              <Input
                id="customClient"
                value={customClient}
                onChange={(e) => setCustomClient(e.target.value)}
                placeholder="Enter client name"
                className={errors.client ? "border-destructive" : ""}
              />
            </div>
          )}

          {/* Meeting Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Meeting Reason / Type</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger
                className={errors.reason ? "border-destructive" : ""}
              >
                <SelectValue placeholder="Select meeting reason" />
              </SelectTrigger>
              <SelectContent>
                {MEETING_REASONS.map((reasonOption) => (
                  <SelectItem key={reasonOption} value={reasonOption}>
                    {reasonOption}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.reason && (
              <p className="text-sm text-destructive">{errors.reason}</p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional notes about this meeting..."
              rows={3}
            />
          </div>

          {/* Meeting Info */}
          <div className="bg-primary/5 p-3 rounded-md text-sm">
            <div className="flex items-center space-x-2 mb-1">
              <User className="h-4 w-4 text-primary" />
              <span className="font-medium">Employee: {employeeName}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-primary" />
              <span>Start Time: {new Date().toLocaleString()}</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? "Starting..." : "Start Meeting"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
