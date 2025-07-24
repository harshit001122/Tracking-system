import { useState, useRef } from "react";
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
import { MeetingDetails, Customer } from "@shared/api";
import { AlertCircle, CheckCircle, Clock, User, Building2 } from "lucide-react";
import {
  CompanySelector,
  CompanySelectorRef,
} from "./CompanySelector";

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

  // Company selection state
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );
  const [customerEmployeeName, setCustomerEmployeeName] = useState("");
  const [customerEmployeeDesignation, setCustomerEmployeeDesignation] = useState("");
  const [customerEmployeeDepartment, setCustomerEmployeeDepartment] = useState("");
  const [customerEmployeeEmail, setCustomerEmployeeEmail] = useState("");
  const [customerEmployeeMobile, setCustomerEmployeeMobile] = useState("");

  // Ref for company selector
  const companySelectorRef = useRef<CompanySelectorRef>(null);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Company selection is mandatory
    if (!selectedCustomer) {
      newErrors.company = "Please select a company";
    }

    // Customer employee name is mandatory
    if (!customerEmployeeName.trim()) {
      newErrors.customerEmployeeName = "Customer employee name is required";
    }

    // Discussion is mandatory
    if (!formData.discussion.trim()) {
      newErrors.discussion = "Discussion details are required";
    }

    // Email validation if provided
    if (
      formData.customerEmail &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.customerEmail)
    ) {
      newErrors.customerEmail = "Please enter a valid email address";
    }

    // Mobile validation if provided
    if (
      formData.customerMobile &&
      !/^[\+]?[1-9][\d]{0,15}$/.test(
        formData.customerMobile.replace(/[\s\-\(\)]/g, ""),
      )
    ) {
      newErrors.customerMobile = "Please enter a valid mobile number";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof MeetingDetails, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Handle company selection
  const handleCompanySelect = (customer: Customer) => {
    setSelectedCustomer(customer);

    // Auto-fill company name in form data
    setFormData((prev) => ({
      ...prev,
      customerName: customer.CustomerCompanyName,
    }));
  };

  // Handle employee field changes
  const handleEmployeeFieldChange = (field: string, value: string) => {
    switch (field) {
      case "name":
        setCustomerEmployeeName(value);
        setFormData(prev => ({ ...prev, customerEmployeeName: value }));
        break;
      case "designation":
        setCustomerEmployeeDesignation(value);
        setFormData(prev => ({ ...prev, customerDesignation: value }));
        break;
      case "department":
        setCustomerEmployeeDepartment(value);
        setFormData(prev => ({ ...prev, customerDepartment: value }));
        break;
      case "email":
        setCustomerEmployeeEmail(value);
        setFormData(prev => ({ ...prev, customerEmail: value }));
        break;
      case "mobile":
        setCustomerEmployeeMobile(value);
        setFormData(prev => ({ ...prev, customerMobile: value }));
        break;
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
      console.log("Meeting ended successfully");
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

    console.log("EndMeetingModal: Closing and resetting all state");

    // Reset all form state
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
    setSelectedCustomer(null);
    setCustomerEmployeeName("");
    setCustomerEmployeeDesignation("");
    setCustomerEmployeeDepartment("");
    setCustomerEmployeeEmail("");
    setCustomerEmployeeMobile("");

    // Reset the company selector
    if (companySelectorRef.current) {
      companySelectorRef.current.resetSelection();
    }

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
            Complete the meeting for{" "}
            <span className="font-medium">{employeeName}</span> by providing
            customer details and discussion summary.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Company Selection Header */}
          <div className="flex items-center space-x-2 py-2 border-b">
            <Building2 className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">
              Select Company & Customer Details
            </span>
          </div>

          {/* Company Selection */}
          <div className="space-y-4">
            <CompanySelector
              ref={companySelectorRef}
              onCompanySelect={handleCompanySelect}
              selectedCustomerId={selectedCustomer?._id}
              disabled={isFormDisabled}
            />
            {errors.company && (
              <div className="flex items-center space-x-1 text-sm text-destructive">
                <AlertCircle className="h-3 w-3" />
                <span>{errors.company}</span>
              </div>
            )}

            {selectedCustomer && (
              <div className="p-4 border rounded-lg bg-muted/20">
                <div className="flex items-center space-x-2 mb-3">
                  <Building2 className="h-4 w-4 text-primary" />
                  <span className="font-medium text-sm">
                    Selected Company: {selectedCustomer.CustomerCompanyName}
                  </span>
                </div>

                {/* Customer Employee Details Form */}
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    {/* Employee Name */}
                    <div className="space-y-1">
                      <Label htmlFor="empName" className="text-xs">
                        Contact Person Name
                        <span className="text-destructive ml-1">*</span>
                      </Label>
                      <Input
                        id="empName"
                        placeholder="Contact person name"
                        value={customerEmployeeName}
                        onChange={(e) => handleEmployeeFieldChange("name", e.target.value)}
                        disabled={isFormDisabled}
                        className={errors.customerEmployeeName ? "border-destructive" : ""}
                      />
                      {errors.customerEmployeeName && (
                        <p className="text-xs text-destructive">{errors.customerEmployeeName}</p>
                      )}
                    </div>

                    {/* Designation */}
                    <div className="space-y-1">
                      <Label htmlFor="designation" className="text-xs">Designation</Label>
                      <Input
                        id="designation"
                        placeholder="Position/Title"
                        value={customerEmployeeDesignation}
                        onChange={(e) => handleEmployeeFieldChange("designation", e.target.value)}
                        disabled={isFormDisabled}
                      />
                    </div>

                    {/* Department */}
                    <div className="space-y-1">
                      <Label htmlFor="department" className="text-xs">Department</Label>
                      <Input
                        id="department"
                        placeholder="Department"
                        value={customerEmployeeDepartment}
                        onChange={(e) => handleEmployeeFieldChange("department", e.target.value)}
                        disabled={isFormDisabled}
                      />
                    </div>

                    {/* Email */}
                    <div className="space-y-1">
                      <Label htmlFor="empEmail" className="text-xs">Email</Label>
                      <Input
                        id="empEmail"
                        type="email"
                        placeholder="Email address"
                        value={customerEmployeeEmail}
                        onChange={(e) => handleEmployeeFieldChange("email", e.target.value)}
                        disabled={isFormDisabled}
                      />
                    </div>

                    {/* Mobile */}
                    <div className="space-y-1 col-span-2">
                      <Label htmlFor="empMobile" className="text-xs">Mobile</Label>
                      <Input
                        id="empMobile"
                        type="tel"
                        placeholder="Mobile number"
                        value={customerEmployeeMobile}
                        onChange={(e) => handleEmployeeFieldChange("mobile", e.target.value)}
                        disabled={isFormDisabled}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
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
