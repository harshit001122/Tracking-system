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
import { MeetingDetails, CustomerEmployee, Customer } from "@shared/api";
import { AlertCircle, CheckCircle, Clock, User, Building2 } from "lucide-react";
import { CustomerEmployeeSelector, CustomerEmployeeSelectorRef } from "./CustomerEmployeeSelector";
import { AddCustomerEmployeeModal, NewCustomerEmployeeData } from "./AddCustomerEmployeeModal";

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
  const [isAddEmployeeOpen, setIsAddEmployeeOpen] = useState(false);

  // Ref for customer employee selector
  const customerSelectorRef = useRef<CustomerEmployeeSelectorRef>(null);

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

  // Handle adding new customer employee
  const handleAddNewEmployee = async (employeeData: NewCustomerEmployeeData) => {
    // For now, we'll simulate adding the employee locally
    // In a real implementation, you would call an API endpoint here
    console.log("Adding new customer employee:", employeeData);

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // After successful creation, refresh the customer list
    if (customerSelectorRef.current) {
      await customerSelectorRef.current.refreshCustomers();
    }

    // Show success message (you could add a toast here)
    console.log("Customer employee added successfully!");
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
    setIsAddEmployeeOpen(false);
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
          {/* Customer Employee Selection Header */}
          <div className="flex items-center space-x-2 py-2 border-b">
            <User className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Select Customer Employee</span>
          </div>

          {/* Customer Employee Selection */}
          <div className="space-y-4">
            <CustomerEmployeeSelector
              ref={customerSelectorRef}
              onEmployeeSelect={handleCustomerEmployeeSelect}
              selectedEmployeeId={selectedCustomerEmployee?._id}
              disabled={isFormDisabled}
              onAddNewEmployee={() => setIsAddEmployeeOpen(true)}
            />

            {selectedCustomerEmployee && (
              <div className="p-4 border rounded-lg bg-muted/20">
                <div className="flex items-center space-x-2 mb-3">
                  <Building2 className="h-4 w-4 text-primary" />
                  <span className="font-medium text-sm">Selected Customer Details</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Company:</span>
                    <div className="font-medium">{selectedCustomer?.CustomerCompanyName}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Employee:</span>
                    <div className="font-medium">{selectedCustomerEmployee.CustomerEmpName}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Position:</span>
                    <div>{selectedCustomerEmployee.Designation}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Department:</span>
                    <div>{selectedCustomerEmployee.Department}</div>
                  </div>
                  {selectedCustomerEmployee.Email && (
                    <div>
                      <span className="text-muted-foreground">Email:</span>
                      <div>{selectedCustomerEmployee.Email}</div>
                    </div>
                  )}
                  {selectedCustomerEmployee.Mobile && (
                    <div>
                      <span className="text-muted-foreground">Mobile:</span>
                      <div>{selectedCustomerEmployee.Mobile}</div>
                    </div>
                  )}
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

        {/* Add Customer Employee Modal */}
        <AddCustomerEmployeeModal
          isOpen={isAddEmployeeOpen}
          onClose={() => setIsAddEmployeeOpen(false)}
          onAddEmployee={handleAddNewEmployee}
          isLoading={isLoading}
        />
      </DialogContent>
    </Dialog>
  );
}
