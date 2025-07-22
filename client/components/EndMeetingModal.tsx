import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MeetingDetails, CustomerEmployee, Customer } from "@shared/api";
import { AlertCircle, CheckCircle, Clock, User, Building2 } from "lucide-react";
import { CustomerEmployeeSelector } from "./CustomerEmployeeSelector";

interface EndMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEndMeeting: (meetingDetails: MeetingDetails) => Promise<void>;
  employeeName: string;
  isLoading?: boolean;
}

export function EndMeetingModal({
  isOpen,
  onClose,
  onEndMeeting,
  employeeName,
  isLoading = false,
}: EndMeetingModalProps) {
  const [formData, setFormData] = useState<MeetingDetails>({
    customerName: "",
    customerEmployeeName: "",
    customerEmail: "",
    customerMobile: "",
    customerDesignation: "",
    customerDepartment: "",
    discussion: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Customer employee selection state
  const [selectedCustomerEmployee, setSelectedCustomerEmployee] = useState<CustomerEmployee | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [useManualEntry, setUseManualEntry] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Discussion is mandatory
    if (!formData.discussion.trim()) {
      newErrors.discussion = "Discussion details are required";
    }

    // Email validation if provided
    if (formData.customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.customerEmail)) {
      newErrors.customerEmail = "Please enter a valid email address";
    }

    // Mobile validation if provided
    if (formData.customerMobile && !/^[\+]?[1-9][\d]{0,15}$/.test(formData.customerMobile.replace(/[\s\-\(\)]/g, ""))) {
      newErrors.customerMobile = "Please enter a valid mobile number";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof MeetingDetails, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Handle customer employee selection
  const handleCustomerEmployeeSelect = (employee: CustomerEmployee, customer: Customer) => {
    setSelectedCustomerEmployee(employee);
    setSelectedCustomer(customer);

    // Auto-fill form data from selected employee
    setFormData(prev => ({
      ...prev,
      customerName: customer.CustomerCompanyName,
      customerEmployeeName: employee.CustomerEmpName,
      customerEmail: employee.Email,
      customerMobile: employee.Mobile,
      customerDesignation: employee.Designation,
      customerDepartment: employee.Department,
    }));
  };

  // Toggle between manual entry and employee selection
  const handleToggleManualEntry = () => {
    setUseManualEntry(!useManualEntry);
    if (!useManualEntry) {
      // Clear selection when switching to manual
      setSelectedCustomerEmployee(null);
      setSelectedCustomer(null);
    } else {
      // Clear manual data when switching to selection
      setFormData(prev => ({
        ...prev,
        customerName: "",
        customerEmployeeName: "",
        customerEmail: "",
        customerMobile: "",
        customerDesignation: "",
        customerDepartment: "",
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onEndMeeting(formData);
      handleClose();
    } catch (error) {
      console.error("Error ending meeting:", error);
      // Error is handled by parent component
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting || isLoading) return;

    setFormData({
      customerName: "",
      customerEmployeeName: "",
      customerEmail: "",
      customerMobile: "",
      customerDesignation: "",
      customerDepartment: "",
      discussion: "",
    });
    setErrors({});
    setSelectedCustomerEmployee(null);
    setSelectedCustomer(null);
    setUseManualEntry(false);
    onClose();
  };

  const isFormDisabled = isSubmitting || isLoading;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md  max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5 text-destructive" />
            <span>End Meeting</span>
          </DialogTitle>
          <DialogDescription>
            Complete the meeting for <span className="font-medium">{employeeName}</span> by providing customer details and discussion summary.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Customer Name */}
          <div className="space-y-2">
            <Label htmlFor="customerName" className="text-sm">
              Customer Name
              <span className="text-muted-foreground ml-1">(Optional)</span>
            </Label>
            <Input
              id="customerName"
              type="text"
              placeholder="Enter customer name"
              value={formData.customerName || ""}
              onChange={(e) => handleInputChange("customerName", e.target.value)}
              disabled={isFormDisabled}
            />
          </div>

          {/* Customer Employee Name */}
          <div className="space-y-2">
            <Label htmlFor="customerEmployeeName" className="text-sm">
              Customer Employee Name
              <span className="text-muted-foreground ml-1">(Optional)</span>
            </Label>
            <Input
              id="customerEmployeeName"
              type="text"
              placeholder="Enter employee name you met"
              value={formData.customerEmployeeName || ""}
              onChange={(e) => handleInputChange("customerEmployeeName", e.target.value)}
              disabled={isFormDisabled}
            />
          </div>

          {/* Customer Email */}
          <div className="space-y-2">
            <Label htmlFor="customerEmail" className="text-sm">
              Customer Email
              <span className="text-muted-foreground ml-1">(Optional)</span>
            </Label>
            <Input
              id="customerEmail"
              type="email"
              placeholder="customer@example.com"
              value={formData.customerEmail || ""}
              onChange={(e) => handleInputChange("customerEmail", e.target.value)}
              disabled={isFormDisabled}
            />
            {errors.customerEmail && (
              <div className="flex items-center space-x-1 text-sm text-destructive">
                <AlertCircle className="h-3 w-3" />
                <span>{errors.customerEmail}</span>
              </div>
            )}
          </div>

          {/* Customer Mobile */}
          <div className="space-y-2">
            <Label htmlFor="customerMobile" className="text-sm">
              Customer Mobile
              <span className="text-muted-foreground ml-1">(Optional)</span>
            </Label>
            <Input
              id="customerMobile"
              type="tel"
              placeholder="+1 (555) 123-4567"
              value={formData.customerMobile || ""}
              onChange={(e) => handleInputChange("customerMobile", e.target.value)}
              disabled={isFormDisabled}
            />
            {errors.customerMobile && (
              <div className="flex items-center space-x-1 text-sm text-destructive">
                <AlertCircle className="h-3 w-3" />
                <span>{errors.customerMobile}</span>
              </div>
            )}
          </div>

          {/* Customer Designation */}
          <div className="space-y-2">
            <Label htmlFor="customerDesignation" className="text-sm">
              Customer Designation
              <span className="text-muted-foreground ml-1">(Optional)</span>
            </Label>
            <Input
              id="customerDesignation"
              type="text"
              placeholder="e.g., Manager, Director, CEO"
              value={formData.customerDesignation || ""}
              onChange={(e) => handleInputChange("customerDesignation", e.target.value)}
              disabled={isFormDisabled}
            />
          </div>

          {/* Customer Department */}
          <div className="space-y-2">
            <Label htmlFor="customerDepartment" className="text-sm">
              Customer Department
              <span className="text-muted-foreground ml-1">(Optional)</span>
            </Label>
            <Input
              id="customerDepartment"
              type="text"
              placeholder="e.g., Sales, IT, HR, Operations"
              value={formData.customerDepartment || ""}
              onChange={(e) => handleInputChange("customerDepartment", e.target.value)}
              disabled={isFormDisabled}
            />
          </div>

          {/* Discussion - Mandatory */}
          <div className="space-y-2">
            <Label htmlFor="discussion" className="text-sm">
              Discussion Details
              <span className="text-destructive ml-1">*</span>
            </Label>
            <Textarea
              id="discussion"
              placeholder="Describe what was discussed in the meeting, key points, outcomes, and next steps..."
              value={formData.discussion}
              onChange={(e) => handleInputChange("discussion", e.target.value)}
              disabled={isFormDisabled}
              rows={4}
              className={errors.discussion ? "border-destructive" : ""}
            />
            {errors.discussion && (
              <div className="flex items-center space-x-1 text-sm text-destructive">
                <AlertCircle className="h-3 w-3" />
                <span>{errors.discussion}</span>
              </div>
            )}
            <div className="text-xs text-muted-foreground">
              This field is required and will be included in the meeting record.
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isFormDisabled}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={isFormDisabled}
              className="min-w-[120px]"
            >
              {isSubmitting || isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  <span>Ending...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4" />
                  <span>End Meeting</span>
                </div>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
