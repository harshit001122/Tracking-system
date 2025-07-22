import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Customer, CustomerEmployee } from "@shared/api";
import { Loader2, Plus, AlertCircle } from "lucide-react";

interface CustomerEmployeeSelectorProps {
  onEmployeeSelect: (employee: CustomerEmployee, customer: Customer) => void;
  selectedEmployeeId?: string;
  disabled?: boolean;
  onAddNewEmployee?: () => void;
}

export interface CustomerEmployeeSelectorRef {
  refreshCustomers: () => Promise<void>;
  addTempEmployee: (employee: CustomerEmployee, customerName: string, customerId: string) => void;
}

export const CustomerEmployeeSelector = forwardRef<CustomerEmployeeSelectorRef, CustomerEmployeeSelectorProps>(
  (
    {
      onEmployeeSelect,
      selectedEmployeeId,
      disabled = false,
      onAddNewEmployee,
    },
    ref
  ) => {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [employees, setEmployees] = useState<
      Array<CustomerEmployee & { customerName: string; customerId: string }>
    >([]);
    const [tempEmployees, setTempEmployees] = useState<
      Array<CustomerEmployee & { customerName: string; customerId: string }>
    >([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch customers from external API
    const fetchCustomers = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          "https://jbdspower.in/LeafNetServer/api/customer"
        );
        if (!response.ok) {
          throw new Error(`Failed to fetch customers: ${response.statusText}`);
        }
        const data = await response.json();
        
        // The API returns an array directly
        const customerArray = Array.isArray(data) ? data : [];
        setCustomers(customerArray);

        // Flatten all employees with customer info
        const allEmployees = customerArray.flatMap((customer: Customer) =>
          (customer.Employees || []).map((employee) => ({
            ...employee,
            customerName: customer.CustomerCompanyName,
            customerId: customer._id,
          }))
        );
        setEmployees(allEmployees);
      } catch (err) {
        console.error("Error fetching customers:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch customers");
      } finally {
        setLoading(false);
      }
    };

    useEffect(() => {
      fetchCustomers();
    }, []);

    // Add temporary employee
    const addTempEmployee = (employee: CustomerEmployee, customerName: string, customerId: string) => {
      const tempEmployee = {
        ...employee,
        customerName,
        customerId,
      };
      setTempEmployees(prev => [...prev, tempEmployee]);
    };

    // Expose refresh function and addTempEmployee via ref
    useImperativeHandle(ref, () => ({
      refreshCustomers: fetchCustomers,
      addTempEmployee,
    }));

    const handleEmployeeSelect = (employeeId: string) => {
      const employee = employees.find((emp) => emp._id === employeeId);
      if (employee) {
        const customer = customers.find((c) => c._id === employee.customerId);
        if (customer) {
          onEmployeeSelect(employee, customer);
        }
      }
    };

    if (error) {
      return (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm text-destructive">Customer Employee</Label>
            {onAddNewEmployee && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onAddNewEmployee}
                disabled={disabled}
                className="flex items-center space-x-1"
              >
                <Plus className="h-3 w-3" />
                <span className="text-xs">Add New</span>
              </Button>
            )}
          </div>
          <div className="border border-destructive rounded-md p-3 text-sm text-destructive">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4" />
              <p className="font-medium">Failed to load customer employees</p>
            </div>
            <p className="text-xs mt-1">{error}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={fetchCustomers}
              className="mt-2"
            >
              Try Again
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="customerEmployee" className="text-sm">
            Select Customer Employee
            <span className="text-destructive ml-1">*</span>
          </Label>
          {onAddNewEmployee && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onAddNewEmployee}
              disabled={disabled || loading}
              className="flex items-center space-x-1"
            >
              <Plus className="h-3 w-3" />
              <span className="text-xs">Add New</span>
            </Button>
          )}
        </div>
        
        <Select
          onValueChange={handleEmployeeSelect}
          value={selectedEmployeeId || ""}
          disabled={disabled || loading}
        >
          <SelectTrigger className="w-full">
            <SelectValue 
              placeholder={
                loading ? (
                  <div className="flex items-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Loading employees...</span>
                  </div>
                ) : (
                  "Select a customer employee"
                )
              }
            />
          </SelectTrigger>
          <SelectContent>
            {employees.length === 0 ? (
              <SelectItem value="no-employees" disabled>
                No employees found
              </SelectItem>
            ) : (
              employees.map((employee) => (
                <SelectItem key={employee._id} value={employee._id}>
                  {employee.CustomerEmpName} ({employee.customerName})
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>
    );
  }
);

CustomerEmployeeSelector.displayName = "CustomerEmployeeSelector";
