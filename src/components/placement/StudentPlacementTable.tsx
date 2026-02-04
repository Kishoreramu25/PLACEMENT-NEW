import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Controller } from "react-hook-form";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Pencil, Trash2, Plus, Search, FileDown, Columns, X, Upload, Clipboard, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import * as XLSX from "xlsx";
import { useRef } from "react";

// Detailed Type Definition based on user request
type StudentPlacement = {
    id: string;
    company_name: string;
    company_mail: string;
    company_address: string;
    hr_name: string;
    hr_mail: string;
    student_name: string;
    student_id: string; // Register No
    student_mail: string;
    student_mobile: string; // New field
    student_address: string;
    department: string;
    offer_type: string;
    salary: number;
    package_lpa: number;
    current_year: number;
    semester: number;
    join_date: string;
    ref_no: string;
    // Dynamic fields storage
    other_details?: Record<string, string>;
};

export function StudentPlacementTable() {
    const queryClient = useQueryClient();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isColumnDialogOpen, setIsColumnDialogOpen] = useState(false); // New Dialog State
    const [newColumnName, setNewColumnName] = useState(""); // New Column Input
    const [editingId, setEditingId] = useState<string | null>(null);
    const [filters, setFilters] = useState<Record<string, string>>({});

    const FILTER_FIELDS: Record<string, string> = {
        company_name: "Company Name",
        company_mail: "Company Mail",
        company_address: "Company Address",
        hr_name: "HR Name",
        hr_mail: "HR Mail",
        student_name: "Student Name",
        department: "Dept",
        offer_type: "Type",
        salary: "Salary",
        package_lpa: "Package (LPA)",
        student_id: "Student ID",
        student_mail: "Student Mail",
        student_mobile: "Student Mobile",
        student_address: "Student Address",
        current_year: "Year",
        semester: "Sem",
        join_date: "Join Date"
    };

    const handleAddFilter = (key: string, value: string) => {
        if (key && value) {
            setFilters(prev => ({ ...prev, [key]: value }));
        }
    };

    const removeFilter = (key: string) => {
        const newFilters = { ...filters };
        delete newFilters[key];
        setFilters(newFilters);
    };

    // Load custom columns from local storage or empty
    const [customColumns, setCustomColumns] = useState<string[]>(() => {
        const saved = localStorage.getItem("placement_custom_columns");
        return saved ? JSON.parse(saved) : [];
    });

    useEffect(() => {
        localStorage.setItem("placement_custom_columns", JSON.stringify(customColumns));
    }, [customColumns]);

    const handleAddColumn = () => {
        if (newColumnName.trim()) {
            setCustomColumns([...customColumns, newColumnName.trim()]);
            setNewColumnName("");
            setIsColumnDialogOpen(false);
            toast.success(`Column "${newColumnName}" added`);
        }
    };

    // Fetch Data
    const { data: placements, isLoading } = useQuery({
        queryKey: ["student-placements"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("student_placements" as any)
                .select("*")
                .order("created_at", { ascending: false });

            if (error) throw error;
            return (data as any) as StudentPlacement[];
        },
    });

    // Delete Mutation
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from("student_placements" as any).delete().eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success("Record deleted successfully");
            queryClient.invalidateQueries({ queryKey: ["student-placements"] });
        },
        onError: (error) => {
            toast.error("Failed to delete record: " + error.message);
        }
    });

    // Bulk Insert Mutation
    // Bulk Insert Mutation (Batched)
    const bulkInsertMutation = useMutation({
        mutationFn: async (records: Partial<StudentPlacement>[]) => {
            const BATCH_SIZE = 50;
            for (let i = 0; i < records.length; i += BATCH_SIZE) {
                const batch = records.slice(i, i + BATCH_SIZE);
                const { error } = await supabase.from("student_placements" as any).insert(batch);
                if (error) throw error;
            }
        },
        onSuccess: (data, variables) => {
            toast.success(`Successfully imported ${variables.length} records`);
            queryClient.invalidateQueries({ queryKey: ["student-placements"] });
        },
        onError: (error) => {
            console.error(error);
            toast.error("Failed to import records: " + error.message);
        }
    });

    // Helper: Map Excel Rows
    const mapExcelRowToStudentPlacement = (row: any): Partial<StudentPlacement> => {
        const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
        const findKey = (keys: string[], exclude: string[] = []) => {
            const rowKeys = Object.keys(row);
            const normalizedSearch = keys.map(normalize);
            const normalizedExclude = exclude.map(normalize);

            // Exact match
            for (const key of keys) {
                if (row[key] !== undefined) return row[key];
            }
            // Fuzzy match
            for (const rKey of rowKeys) {
                const normRKey = normalize(rKey);
                // Skip excluded keys
                if (normalizedExclude.some(e => normRKey.includes(e))) continue;

                if (normalizedSearch.some(k => normRKey.includes(k) || k.includes(normRKey))) {
                    return row[rKey];
                }
            }
            return undefined;
        };

        const getVal = (keys: string[], exclude: string[] = []) => String(findKey(keys, exclude) || "").trim();

        // Date parser helper
        const parseDate = (val: string) => {
            if (!val) return new Date().toISOString().split('T')[0];
            // Handle Excel serial date (numeric)
            if (!isNaN(Number(val)) && Number(val) > 20000) {
                const date = new Date((Number(val) - (25567 + 2)) * 86400 * 1000);
                return date.toISOString().split('T')[0];
            }
            // Handle string dates
            const d = new Date(val);
            if (isNaN(d.getTime())) return new Date().toISOString().split('T')[0];
            return d.toISOString().split('T')[0];
        };

        const baseRecord = {
            company_name: getVal(["company_name", "Company", "Organization", "Name of Company", "Company Name"]),
            company_mail: getVal(["company_mail", "Company Mail", "Mail ID", "Company Email"]),
            company_address: getVal(["company_address", "Address", "Company Location"]),
            hr_name: getVal(["hr_name", "HR Name", "Contact Person"], ["company"]), // Exclude company to match "Name" safely? No, HR Name usually distinct.
            hr_mail: getVal(["hr_mail", "HR Mail", "HR Email"]),
            // Crucial Fix: Exclude "company", "hr", "project" from Student Name search
            student_name: getVal(["student_name", "Student Name", "Name", "Candidate", "Candidate Name", "Name of the Student", "Student"], ["company", "hr", "project", "college"]),
            student_id: getVal(["student_id", "Register No", "USN", "Roll No", "ID"], ["comp", "email"]),
            student_mail: getVal(["student_mail", "Student Mail", "Email", "Student Email"], ["company", "hr"]),
            student_mobile: getVal(["student_mobile", "Student Mobile", "Mobile", "Phone"], ["company", "hr"]),
            student_address: getVal(["student_address", "Student Address", "Residence"], ["company"]),
            department: getVal(["department", "Dept", "Branch", "Department"]),
            offer_type: getVal(["offer_type", "Offer Type", "Job Type", "Type"]),
            salary: Number(getVal(["salary", "Salary", "Stipend"])) || 0,
            package_lpa: Number(getVal(["package_lpa", "LPA", "Package", "CTC"])) || 0,
            current_year: Number(getVal(["current_year", "Year", "Batch"])) || new Date().getFullYear(),
            semester: Number(getVal(["semester", "Semester", "Sem"])) || 0,
            join_date: parseDate(getVal(["join_date", "Join Date", "Date of Joining"])),
            ref_no: getVal(["ref_no", "Ref No", "Reference", "Offer ID"]),
        };

        // Filter out obvious junk rows (headers, titles)
        if (!baseRecord.student_name || baseRecord.student_name.toLowerCase().includes("department of")) {
            return {};
        }

        return baseRecord;
    };

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const fileList = Array.from(files);
        const processedFiles: string[] = [];
        const loadingToast = toast.loading("Processing files...");

        try {
            const allRecords = await Promise.all(fileList.map(async (file) => {
                const data = await file.arrayBuffer();
                const workbook = XLSX.read(data);
                let records: any[] = [];
                workbook.SheetNames.forEach(name => {
                    const ws = workbook.Sheets[name];
                    const jsonData = XLSX.utils.sheet_to_json(ws);
                    if (jsonData.length) records.push(...jsonData);
                });
                processedFiles.push(file.name);
                return records.map(mapExcelRowToStudentPlacement);
            }));

            const flatRecords = allRecords.flat().filter(r => r.student_name && Object.keys(r).length > 2);
            toast.dismiss(loadingToast);

            if (flatRecords.length > 0) {
                if (window.confirm(`Found ${flatRecords.length} records in ${processedFiles.join(", ")}. Import them now?`)) {
                    bulkInsertMutation.mutate(flatRecords);
                }
            } else {
                toast.error("No valid data found in files");
            }
        } catch (err) {
            console.error(err);
            toast.dismiss(loadingToast);
            toast.error("Import failed");
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handlePasteFromClipboard = async () => {
        try {
            const text = await navigator.clipboard.readText();
            if (!text) return toast.error("Clipboard empty");
            processClipboardData(text);
        } catch (err) {
            toast.error("Failed to read clipboard");
        }
    };

    const processClipboardData = (text: string) => {
        try {
            const rows = text.split(/\r?\n/).filter(r => r.trim());
            if (!rows.length) return;

            const matrix = rows.map(r => r.split("\t"));
            const headers = matrix[0];
            const isHeader = headers.some(h => ["Name", "USN", "Company", "Salary"].some(k => h.toLowerCase().includes(k.toLowerCase())));

            let dataToImport: any[] = [];

            if (isHeader) {
                const keys = headers;
                dataToImport = matrix.slice(1).map(row => {
                    const obj: any = {};
                    row.forEach((val, i) => { if (keys[i]) obj[keys[i]] = val; });
                    return obj;
                });
            } else {
                if (!window.confirm("No headers detected in first row. Ensure typical column order or use an Excel file. Proceed with best-effort import?")) return;
                // If no headers, try to map positionally if we assume a standard template? 
                // That's risky. Let's just create raw objects and let mapper handle it if keys happen to match (unlikely).
                // Better approach: Require headers for paste.
                toast.info("Please explicitly include headers (Name, USN, Company...) for accurate paste.");
                return;
            }

            if (dataToImport.length > 0) {
                const records = dataToImport.map(mapExcelRowToStudentPlacement);
                bulkInsertMutation.mutate(records);
            }

        } catch (err) {
            console.error("Paste parse error", err);
            toast.error("Failed to parse clipboard data");
        }
    };

    // Global Paste Listener
    useEffect(() => {
        const pasteHandler = (e: ClipboardEvent) => {
            const target = e.target as HTMLElement;
            if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;

            const text = e.clipboardData?.getData("text");
            if (text && text.length > 5 && (text.includes("\t") || text.includes("\n"))) {
                // Heuristic to detect table data
                if (window.confirm("Clipboard data detected. Import as new student records?")) {
                    processClipboardData(text);
                }
            }
        };
        window.addEventListener("paste", pasteHandler);
        return () => window.removeEventListener("paste", pasteHandler);
    }, []);

    // Unified Filter Logic
    const filteredData = placements?.filter((p: any) => {
        // Specific Filters
        return Object.entries(filters).every(([key, value]) => {
            if (!value) return true;
            const valLower = value.toLowerCase();

            // Check standard fields
            if (p[key] !== undefined) {
                return String(p[key]).toLowerCase().includes(valLower);
            }
            // Check custom/other fields
            if (p.other_details && p.other_details[key] !== undefined) {
                return String(p.other_details[key]).toLowerCase().includes(valLower);
            }
            return false;
        });
    });

    // Export to Excel
    const handleExport = () => {
        if (!filteredData || !filteredData.length) return;

        // Flatten data for export
        const exportData = filteredData.map(record => {
            const { other_details, ...rest } = record;
            const flattened: Record<string, any> = { ...rest };

            // Add custom columns
            if (other_details) {
                const details = other_details as Record<string, any>;
                customColumns.forEach(col => {
                    flattened[col] = details[col] || "";
                });
            }
            return flattened;
        });

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Placements");
        XLSX.writeFile(wb, "Student_Placement_Records.xlsx");
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between gap-4 items-center">
                <h2 className="text-2xl font-bold">Individual Placement Records</h2>
                <div className="flex gap-2 w-full sm:w-auto flex-wrap justify-end">
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        multiple
                        accept=".xlsx, .xls, .csv"
                        onChange={handleFileUpload}
                    />


                    <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="whitespace-nowrap">
                        <Upload className="mr-2 h-4 w-4" />
                        Import
                    </Button>
                    <Button variant="outline" onClick={handlePasteFromClipboard} className="whitespace-nowrap" title="Ctrl+V to paste">
                        <Clipboard className="mr-2 h-4 w-4" />
                        Paste
                    </Button>
                    <Button variant="outline" onClick={handleExport} className="whitespace-nowrap">
                        <FileDown className="mr-2 h-4 w-4" />
                        Export
                    </Button>
                    <Button variant="outline" onClick={() => setIsColumnDialogOpen(true)} className="whitespace-nowrap">
                        <Columns className="mr-2 h-4 w-4" />
                        Add Col
                    </Button>
                    <Button onClick={() => { setEditingId(null); setIsDialogOpen(true); }} className="whitespace-nowrap">
                        <Plus className="mr-2 h-4 w-4" />
                        Add New
                    </Button>
                </div>
            </div>

            {/* Filter Section */}
            <div className="flex flex-col gap-4 p-4 border rounded-md bg-muted/20">
                <div className="flex flex-wrap gap-2 items-end">
                    <div className="space-y-2 min-w-[200px]">
                        <Label>Filter Column</Label>
                        <Select onValueChange={(val) => {
                            const input = document.getElementById("filter-value-input") as HTMLInputElement;
                            if (input) input.dataset.column = val;
                        }}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select Column" />
                            </SelectTrigger>
                            <SelectContent>
                                {Object.entries(FILTER_FIELDS).map(([key, label]) => (
                                    <SelectItem key={key} value={key}>{label}</SelectItem>
                                ))}
                                {customColumns.map(col => (
                                    <SelectItem key={col} value={col}>{col} (Custom)</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2 min-w-[200px]">
                        <Label>Value</Label>
                        <Input
                            id="filter-value-input"
                            placeholder="Type to filter..."
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    const target = e.target as HTMLInputElement;
                                    const col = target.dataset.column;
                                    if (col) {
                                        handleAddFilter(col, target.value);
                                        target.value = "";
                                    } else {
                                        toast.error("Please select a column first");
                                    }
                                }
                            }}
                        />
                    </div>
                    <Button onClick={() => {
                        const input = document.getElementById("filter-value-input") as HTMLInputElement;
                        const col = input?.dataset.column;
                        if (col && input.value) {
                            handleAddFilter(col, input.value);
                            input.value = "";
                        } else {
                            toast.error("Select a column and enter a value");
                        }
                    }}>
                        <Plus className="mr-2 h-4 w-4" /> Add Filter
                    </Button>
                </div>

                {/* Active Filters */}
                {Object.keys(filters).length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {Object.entries(filters).map(([key, value]) => (
                            <div key={key} className="flex items-center gap-1 bg-secondary text-secondary-foreground px-3 py-1 rounded-full text-sm">
                                <span className="font-medium">{FILTER_FIELDS[key] || key}:</span>
                                <span>{value}</span>
                                <button onClick={() => removeFilter(key)} className="ml-1 hover:text-destructive">
                                    <X className="h-3 w-3" />
                                </button>
                            </div>
                        ))}
                        <Button variant="ghost" size="sm" onClick={() => setFilters({})} className="text-xs h-7">
                            Clear All
                        </Button>
                    </div>
                )}
            </div>

            <div className="rounded-md border overflow-x-auto">
                <Table className="min-w-[2000px]">
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[50px] font-bold">S.No</TableHead>
                            <TableHead className="font-bold">Company Name</TableHead>
                            <TableHead className="font-bold">Company Mail</TableHead>
                            <TableHead className="font-bold">Company Address</TableHead>
                            <TableHead className="font-bold">HR Name</TableHead>
                            <TableHead className="font-bold">HR Mail</TableHead>
                            <TableHead className="font-bold">Student Name</TableHead>
                            <TableHead className="font-bold">Dept</TableHead>
                            <TableHead className="font-bold">Type</TableHead>
                            <TableHead className="font-bold">Salary</TableHead>
                            <TableHead className="font-bold">Package (LPA)</TableHead>
                            <TableHead className="font-bold">Student ID</TableHead>
                            <TableHead className="font-bold">Student Mail</TableHead>
                            <TableHead className="font-bold">Student Mobile</TableHead>
                            <TableHead className="font-bold">Student Address</TableHead>
                            <TableHead className="font-bold">Year</TableHead>
                            <TableHead className="font-bold">Sem</TableHead>
                            <TableHead className="font-bold">Join Date</TableHead>
                            <TableHead className="font-bold">Ref</TableHead>
                            {customColumns.map(col => (
                                <TableHead key={col} className="font-bold capitalize group min-w-[120px]">
                                    <div className="flex items-center justify-between gap-2">
                                        <span>{col}</span>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive"
                                            onClick={() => {
                                                if (window.confirm(`Remove column "${col}" from view? Data will be preserved.`)) {
                                                    const newColumns = customColumns.filter(c => c !== col);
                                                    setCustomColumns(newColumns);
                                                    localStorage.setItem("placement_custom_columns", JSON.stringify(newColumns));
                                                    toast.success("Column removed");
                                                }
                                            }}
                                        >
                                            <X className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </TableHead>
                            ))}
                            <TableHead className="text-right font-bold sticky right-0 bg-background shadow-sm">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={19} className="text-center h-24">Loading records...</TableCell></TableRow>
                        ) : filteredData?.length === 0 ? (
                            <TableRow><TableCell colSpan={19} className="text-center h-24">No records found.</TableCell></TableRow>
                        ) : (
                            filteredData?.map((record, index) => (
                                <TableRow key={record.id}>
                                    <TableCell>{index + 1}</TableCell>
                                    <TableCell>{record.company_name}</TableCell>
                                    <TableCell>{record.company_mail}</TableCell>
                                    <TableCell className="max-w-[200px] truncate" title={record.company_address}>{record.company_address}</TableCell>
                                    <TableCell>{record.hr_name}</TableCell>
                                    <TableCell>{record.hr_mail}</TableCell>
                                    <TableCell>{record.student_name}</TableCell>
                                    <TableCell>{record.department}</TableCell>
                                    <TableCell>{record.offer_type}</TableCell>
                                    <TableCell>{record.salary}</TableCell>
                                    <TableCell>{record.package_lpa}</TableCell>
                                    <TableCell>{record.student_id}</TableCell>
                                    <TableCell>{record.student_mail}</TableCell>
                                    <TableCell>{record.student_mobile}</TableCell>
                                    <TableCell className="max-w-[200px] truncate" title={record.student_address}>{record.student_address}</TableCell>
                                    <TableCell>{record.current_year}</TableCell>
                                    <TableCell>{record.semester}</TableCell>
                                    <TableCell className="whitespace-nowrap">{record.join_date}</TableCell>
                                    <TableCell>{record.ref_no}</TableCell>
                                    {customColumns.map(col => (
                                        <TableCell key={col}>{(record.other_details as any)?.[col] || "-"}</TableCell>
                                    ))}
                                    <TableCell className="text-right sticky right-0 bg-background shadow-[-5px_0_10px_-5px_rgba(0,0,0,0.1)]">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => { setEditingId(record.id); setIsDialogOpen(true); }}>
                                                <Pencil className="h-4 w-4 text-blue-500" />
                                            </Button>

                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon">
                                                        <Trash2 className="h-4 w-4 text-red-500" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Delete Record?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            Are you sure you want to delete the placement record for {record.student_name}? This cannot be undone.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => deleteMutation.mutate(record.id)} className="bg-red-600">
                                                            Delete
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Add Column Dialog */}
            <Dialog open={isColumnDialogOpen} onOpenChange={setIsColumnDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add New Column</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Column Name</Label>
                            <Input
                                value={newColumnName}
                                onChange={(e) => setNewColumnName(e.target.value)}
                                placeholder="e.g. Skills, Location, Bond Period"
                            />
                        </div>
                        <Button onClick={handleAddColumn} className="w-full">Add Column</Button>
                    </div>
                </DialogContent>
            </Dialog>

            <PlacementRecordDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                editingId={editingId}
                customColumns={customColumns}
            />
        </div >
    );
}

// Sub-component for the Form Dialog
function PlacementRecordDialog({
    open,
    onOpenChange,
    editingId,
    customColumns = []
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    editingId: string | null;
    customColumns: string[];
}) {
    const queryClient = useQueryClient();
    const { role, departmentId } = useAuth();
    const isEditing = !!editingId;

    const form = useForm<Partial<StudentPlacement>>({
        defaultValues: {}
    });

    // Fetch Departments
    const { data: departments } = useQuery({
        queryKey: ["departments"],
        queryFn: async () => {
            const { data } = await supabase.from("departments").select("id, code, name").order("code");
            return data;
        }
    });

    // Fetch single record if editing
    useQuery({
        queryKey: ["student-placement", editingId],
        queryFn: async () => {
            if (!editingId) return null;
            const { data } = await supabase.from("student_placements" as any).select("*").eq("id", editingId).single();
            if (data) form.reset(data as any);
            return data;
        },
        enabled: isEditing && open
    });

    // Auto-fill Department for HOD when adding
    useEffect(() => {
        if (!isEditing && open && role === "department_coordinator" && departments && departmentId) {
            const myDept = departments.find(d => d.id === departmentId);
            if (myDept) {
                form.setValue("department", myDept.code);
            }
        }
    }, [open, isEditing, role, departmentId, departments, form]);

    const mutation = useMutation({
        mutationFn: async (values: Partial<StudentPlacement>) => {
            if (isEditing) {
                const { error } = await supabase.from("student_placements" as any).update(values).eq("id", editingId);
                if (error) throw error;
            } else {
                const { error } = await supabase.from("student_placements" as any).insert([values]);
                if (error) throw error;
            }
        },
        onSuccess: () => {
            toast.success(isEditing ? "Record updated" : "Record added");
            onOpenChange(false);
            form.reset();
            queryClient.invalidateQueries({ queryKey: ["student-placements"] });
        },
        onError: (err) => {
            toast.error("Error: " + err.message);
        }
    });

    const onSubmit = (data: any) => {
        mutation.mutate(data);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{isEditing ? "Edit Placement Record" : "Add New Placement Record"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Company Info */}
                        <div className="space-y-4">
                            <h4 className="font-semibold text-sm border-b pb-2">Company Details</h4>
                            <div className="space-y-2">
                                <Label>Company Name</Label>
                                <Input {...form.register("company_name")} />
                            </div>
                            <div className="space-y-2">
                                <Label>Company Email</Label>
                                <Input {...form.register("company_mail")} />
                            </div>
                            <div className="space-y-2">
                                <Label>Company Address</Label>
                                <Input {...form.register("company_address")} />
                            </div>
                            <div className="space-y-2">
                                <Label>HR Name</Label>
                                <Input {...form.register("hr_name")} />
                            </div>
                            <div className="space-y-2">
                                <Label>HR Mail</Label>
                                <Input {...form.register("hr_mail")} />
                            </div>
                        </div>

                        {/* Student Info */}
                        <div className="space-y-4">
                            <h4 className="font-semibold text-sm border-b pb-2">Student Details</h4>
                            <div className="space-y-2">
                                <Label>Student Name</Label>
                                <Input {...form.register("student_name")} />
                            </div>
                            <div className="space-y-2">
                                <Label>Student ID (Reg No)</Label>
                                <Input {...form.register("student_id")} />
                            </div>
                            <div className="space-y-2">
                                <Label>Department</Label>
                                <Controller
                                    name="department"
                                    control={form.control}
                                    render={({ field }) => (
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select Dept" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="AIDS">AIDS</SelectItem>
                                                {departments?.map((dept: any) => (
                                                    <SelectItem key={dept.id} value={dept.code}>
                                                        {dept.code}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Email</Label>
                                <Input {...form.register("student_mail")} />
                            </div>
                            <div className="space-y-2">
                                <Label>Mobile Number</Label>
                                <Input {...form.register("student_mobile")} />
                            </div>
                            <div className="space-y-2">
                                <Label>Address</Label>
                                <Input {...form.register("student_address")} />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-2">
                                    <Label>Year</Label>
                                    <Input type="number" {...form.register("current_year")} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Sem</Label>
                                    <Input type="number" {...form.register("semester")} />
                                </div>
                            </div>
                        </div>

                        {/* Offer Info */}
                        <div className="space-y-4">
                            <h4 className="font-semibold text-sm border-b pb-2">Offer Details</h4>
                            <div className="space-y-2">
                                <Label>Offer Type</Label>
                                <Input {...form.register("offer_type")} placeholder="Placement / Internship" />
                            </div>
                            <div className="space-y-2">
                                <Label>Package (LPA)</Label>
                                <Input type="number" step="0.01" {...form.register("package_lpa")} />
                            </div>
                            <div className="space-y-2">
                                <Label>Salary (Monthly)</Label>
                                <Input type="number" {...form.register("salary")} />
                            </div>
                            <div className="space-y-2">
                                <Label>Join Date</Label>
                                <Input type="date" {...form.register("join_date")} />
                            </div>
                            <div className="space-y-2">
                                <Label>Reference No / Letter ID</Label>
                                <Input {...form.register("ref_no")} />
                            </div>
                        </div>

                        {/* Dynamic Columns */}
                        {customColumns.length > 0 && (
                            <div className="space-y-4">
                                <h4 className="font-semibold text-sm border-b pb-2">Other Details</h4>
                                {customColumns.map(col => (
                                    <div key={col} className="space-y-2">
                                        <Label className="capitalize">{col}</Label>
                                        <Input {...form.register(`other_details.${col}`)} />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit">{isEditing ? "Update" : "Save Record"}</Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
