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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Customer, CustomerEmployee } from "@shared/api";
import { Check, ChevronDown, Loader2, User, Building2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface CustomerEmployeeSelectorProps {
  onEmployeeSelect: (employee: CustomerEmployee, customer: Customer) => void;
  selectedEmployeeId?: string;
  disabled?: boolean;
  onAddNewEmployee?: () => void;
}

export interface CustomerEmployeeSelectorRef {
  refreshCustomers: () => Promise<void>;
}

export const CustomerEmployeeSelector = forwardRef<CustomerEmployeeSelectorRef, CustomerEmployeeSelectorProps>((
  {
    onEmployeeSelect,
    selectedEmployeeId,
    disabled = false,
    onAddNewEmployee,
  },
  ref
) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<
    Array<CustomerEmployee & { customerName: string; customerId: string }>
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const selectedEmployee = filteredEmployees.find(
    (emp) => emp._id === selectedEmployeeId
  );

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
      setFilteredEmployees(allEmployees);
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

  // Expose refresh function via ref
  useImperativeHandle(ref, () => ({
    refreshCustomers: fetchCustomers,
  }));

  // Filter employees based on search
  const searchFilteredEmployees = filteredEmployees.filter((employee) =>
    employee.CustomerEmpName.toLowerCase().includes(searchValue.toLowerCase()) ||
    employee.customerName.toLowerCase().includes(searchValue.toLowerCase()) ||
    employee.Designation.toLowerCase().includes(searchValue.toLowerCase()) ||
    employee.Department.toLowerCase().includes(searchValue.toLowerCase())
  );

  const handleEmployeeSelect = (employeeId: string) => {
    const employee = filteredEmployees.find((emp) => emp._id === employeeId);
    if (employee) {
      const customer = customers.find((c) => c._id === employee.customerId);
      if (customer) {
        onEmployeeSelect(employee, customer);
        setOpen(false);
      }
    }
  };

  if (error) {
    return (
      <div className="space-y-2">
        <Label className="text-sm text-destructive">Customer Employee</Label>
        <div className="border border-destructive rounded-md p-3 text-sm text-destructive">
          <p className="font-medium">Failed to load customer employees</p>
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
          <span className="text-muted-foreground ml-1">(Optional)</span>
        </Label>
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
      
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={disabled || loading}
          >
            {loading ? (
              <div className="flex items-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading employees...</span>
              </div>
            ) : selectedEmployee ? (
              <div className="flex items-center space-x-2 text-left">
                <User className="h-4 w-4" />
                <div className="flex flex-col">
                  <span className="font-medium">{selectedEmployee.CustomerEmpName}</span>
                  <span className="text-xs text-muted-foreground">
                    {selectedEmployee.customerName} • {selectedEmployee.Designation}
                  </span>
                </div>
              </div>
            ) : (
              "Select customer employee..."
            )}
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Search employees or companies..."
              value={searchValue}
              onValueChange={setSearchValue}
            />
            <CommandList>
              <CommandEmpty>No employees found.</CommandEmpty>
              <CommandGroup>
                {searchFilteredEmployees.map((employee) => (
                  <CommandItem
                    key={employee._id}
                    value={employee._id}
                    onSelect={handleEmployeeSelect}
                    className="flex items-center space-x-3 p-3"
                  >
                    <Check
                      className={cn(
                        "h-4 w-4",
                        selectedEmployeeId === employee._id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex items-center space-x-3 flex-1">
                      <User className="h-8 w-8 p-1 bg-primary/10 text-primary rounded-full" />
                      <div className="flex flex-col">
                        <div className="font-medium">{employee.CustomerEmpName}</div>
                        <div className="text-sm text-muted-foreground">
                          {employee.Designation} • {employee.Department}
                        </div>
                        <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                          <Building2 className="h-3 w-3" />
                          <span>{employee.customerName}</span>
                        </div>
                        {employee.Email && (
                          <div className="text-xs text-muted-foreground">{employee.Email}</div>
                        )}
                        {employee.Mobile && (
                          <div className="text-xs text-muted-foreground">{employee.Mobile}</div>
                        )}
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      
      {selectedEmployee && (
        <div className="text-xs text-muted-foreground p-2 bg-muted/50 rounded border">
          Selected: <span className="font-medium">{selectedEmployee.CustomerEmpName}</span> from{" "}
          <span className="font-medium">{selectedEmployee.customerName}</span>
        </div>
      )}
    </div>
  );
});
