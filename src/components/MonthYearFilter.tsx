import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface MonthYearFilterProps {
  selectedMonth: string; // "All" or "01"-"12"
  selectedYear: string; // "All" or "YYYY"
  availableYears: string[];
  onMonthChange: (month: string) => void;
  onYearChange: (year: string) => void;
}

const MONTHS = [
  { value: "All", label: "All Months" },
  { value: "01", label: "January" },
  { value: "02", label: "February" },
  { value: "03", label: "March" },
  { value: "04", label: "April" },
  { value: "05", label: "May" },
  { value: "06", label: "June" },
  { value: "07", label: "July" },
  { value: "08", label: "August" },
  { value: "09", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

export function MonthYearFilter({
  selectedMonth,
  selectedYear,
  availableYears,
  onMonthChange,
  onYearChange,
}: MonthYearFilterProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
      <div className="flex-1 space-y-1.5">
        <Label
          htmlFor="month-select"
          className="text-[10px] uppercase tracking-wider text-muted-foreground"
        >
          Select Month
        </Label>
        <Select value={selectedMonth} onValueChange={onMonthChange}>
          <SelectTrigger id="month-select" className="h-9">
            <SelectValue placeholder="All Months" />
          </SelectTrigger>
          <SelectContent>
            {MONTHS.map((month) => (
              <SelectItem key={month.value} value={month.value}>
                {month.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 space-y-1.5">
        <Label
          htmlFor="year-select"
          className="text-[10px] uppercase tracking-wider text-muted-foreground"
        >
          Select Year
        </Label>
        <Select value={selectedYear} onValueChange={onYearChange}>
          <SelectTrigger id="year-select" className="h-9">
            <SelectValue placeholder="All Years" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Years</SelectItem>
            {availableYears.map((year) => (
              <SelectItem key={year} value={year}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
