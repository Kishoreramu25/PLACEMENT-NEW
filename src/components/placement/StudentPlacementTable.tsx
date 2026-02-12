import { useState, useEffect, useRef } from "react";
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
import { Pencil, Trash2, Plus, Search, FileDown, Columns, Upload, Clipboard, Eye, EyeOff, X } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import * as XLSX from "xlsx";

type StudentPlacement = {
    id: string;
    company_name: string;
    company_mail: string;
    company_address: string;
    hr_name: string;
    hr_mail: string;
    student_name: string;
    student_id: string;
    student_mail: string;
    student_mobile: string;
    student_address: string;
    department: string;
    offer_type: string;
    salary: number;
    package_lpa: number;
    current_year: number;
    semester: number;
    join_date: string;
    ref_no: string;
    other_details?: Record<string, string>;
};

export function StudentPlacementTable() {
    const queryClient = useQueryClient();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isColumnDialogOpen, setIsColumnDialogOpen] = useState(false);
    const [newColumnName, setNewColumnName] = useState("");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [filters, setFilters] = useState<Record<string, string>>({});
    const [globalSearch, setGlobalSearch] = useState("");

    // Column Definitions State with LocalStorage Persistence
    const [columnDefs, setColumnDefs] = useState<any[]>(() => {
        const saved = localStorage.getItem("placement_column_defs");
        const defaultCols = [
            { key: "company_name", label: "Company Name", visible: true, isCustom: false },
            { key: "company_mail", label: "Company Mail", visible: true, isCustom: false },
            { key: "company_address", label: "Company Address", visible: true, isCustom: false },
            { key: "hr_name", label: "HR Name", visible: true, isCustom: false },
            { key: "hr_mail", label: "HR Mail", visible: true, isCustom: false },
            { key: "student_name", label: "Student Name", visible: true, isCustom: false },
            { key: "department", label: "Dept", visible: true, isCustom: false },
            { key: "offer_type", label: "Type", visible: true, isCustom: false },
            { key: "salary", label: "Salary", visible: true, isCustom: false },
            { key: "package_lpa", label: "Package (LPA)", visible: true, isCustom: false },
            { key: "student_id", label: "Student ID", visible: true, isCustom: false },
            { key: "student_mail", label: "Student Mail", visible: true, isCustom: false },
            { key: "student_mobile", label: "Student Mobile", visible: true, isCustom: false },
            { key: "student_address", label: "Student Address", visible: true, isCustom: false },
            { key: "current_year", label: "Year", visible: true, isCustom: false },
            { key: "semester", label: "Sem", visible: true, isCustom: false },
            { key: "join_date", label: "Join Date", visible: true, isCustom: false },
            { key: "ref_no", label: "Ref", visible: true, isCustom: false },
        ];
        if (saved) {
            const parsed = JSON.parse(saved);
            // Merge defaults in case new columns were added to code but not in local storage
            const merged = defaultCols.map(def => {
                const found = parsed.find((p: any) => p.key === def.key);
                return found ? { ...def, ...found } : def;
            });
            // Add any custom columns from storage
            const custom = parsed.filter((p: any) => p.isCustom);
            return [...merged, ...custom];
        }
        return defaultCols;
    });

    useEffect(() => {
        localStorage.setItem("placement_column_defs", JSON.stringify(columnDefs));
    }, [columnDefs]);

    // Header Editing State
    const [editingHeaderKey, setEditingHeaderKey] = useState<string | null>(null);
    const [tempHeaderName, setTempHeaderName] = useState("");

    const handleHeaderRename = (key: string, newLabel: string) => {
        setColumnDefs(prev => prev.map(col => col.key === key ? { ...col, label: newLabel } : col));
        setEditingHeaderKey(null);
    };

    const handleHideColumn = (key: string) => {
        if (window.confirm("Are you sure you want to hide this column?")) {
            setColumnDefs(prev => prev.map(col => col.key === key ? { ...col, visible: false } : col));
        }
    };

    const handleUnhideColumn = (key: string) => {
        setColumnDefs(prev => prev.map(col => col.key === key ? { ...col, visible: true } : col));
    };

    const handleAddCustomColumn = () => {
        if (newColumnName.trim()) {
            const key = newColumnName.toLowerCase().replace(/[^a-z0-9]/g, '_');
            setColumnDefs(prev => [...prev, { key, label: newColumnName.trim(), visible: true, isCustom: true }]);
            setNewColumnName("");
            setIsColumnDialogOpen(false);
            toast.success(`Column "${newColumnName}" added`);
        }
    };

    // Data Fetching
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
            toast.error("Failed to delete: " + error.message);
        }
    });

    // Bulk Insert Mutation
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
            toast.error("Import failed: " + error.message);
        }
    });

    // Excel Helper
    const mapExcelRowToStudentPlacement = (row: any): Partial<StudentPlacement> => {
        const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
        const findKey = (keys: string[]) => {
            const rowKeys = Object.keys(row);
            for (const key of keys) {
                if (row[key] !== undefined) return row[key];
            }
            for (const rKey of rowKeys) {
                if (keys.some(k => normalize(rKey).includes(normalize(k)))) return row[rKey];
            }
            return undefined;
        };
        const getVal = (keys: string[]) => String(findKey(keys) || "").trim();

        return {
            company_name: getVal(["company_name", "Company"]),
            company_mail: getVal(["company_mail", "Company Mail"]),
            company_address: getVal(["company_address", "Address"]),
            hr_name: getVal(["hr_name", "HR Name"]),
            hr_mail: getVal(["hr_mail", "HR Mail"]),
            student_name: getVal(["student_name", "Student Name", "Name"]),
            student_id: getVal(["student_id", "Register No", "USN"]),
            student_mail: getVal(["student_mail", "Student Mail", "Email"]),
            student_mobile: getVal(["student_mobile", "Student Mobile", "Mobile"]),
            student_address: getVal(["student_address", "Student Address"]),
            department: getVal(["department", "Dept"]),
            offer_type: getVal(["offer_type", "Type"]),
            salary: Number(getVal(["salary", "Salary"])) || 0,
            package_lpa: Number(getVal(["package_lpa", "LPA"])) || 0,
            current_year: Number(getVal(["current_year", "Year"])) || new Date().getFullYear(),
            semester: Number(getVal(["semester", "Sem"])) || 0,
            join_date: getVal(["join_date", "Join Date"]),
            ref_no: getVal(["ref_no", "Ref"]),
        };
    };

    const fileInputRef = useRef<HTMLInputElement>(null);
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files?.length) return;

        try {
            const file = files[0];
            const data = await file.arrayBuffer();
            const wb = XLSX.read(data);
            const ws = wb.Sheets[wb.SheetNames[0]];
            const json = XLSX.utils.sheet_to_json(ws);
            let mapped = json.map(mapExcelRowToStudentPlacement);

            if (mapped.length) {
                // 1. Extract IDs and Names
                const studentIds = mapped.map(r => r.student_id).filter(Boolean);
                const companyNames = mapped.map(r => r.company_name).filter(Boolean);

                // 2. Fetch Master Data
                const { data: students } = await supabase
                    .from("master_students" as any)
                    .select("*")
                    .in("student_id", studentIds);

                const { data: companies } = await supabase
                    .from("master_companies" as any)
                    .select("*")
                    .in("company_name", companyNames);

                const studentMap = new Map(students?.map((s: any) => [s.student_id, s]));
                const companyMap = new Map(companies?.map((c: any) => [c.company_name, c]));

                // 3. Merge Data
                mapped = mapped.map(record => {
                    const masterStudent = record.student_id ? studentMap.get(record.student_id) : null;
                    const masterCompany = record.company_name ? companyMap.get(record.company_name) : null;

                    return {
                        ...record,
                        student_name: record.student_name || masterStudent?.student_name || "",
                        student_mail: record.student_mail || masterStudent?.student_mail || "",
                        student_mobile: record.student_mobile || masterStudent?.student_mobile || "",
                        student_address: record.student_address || masterStudent?.student_address || "",
                        department: record.department || masterStudent?.department || "",
                        current_year: record.current_year || masterStudent?.current_year || record.current_year,
                        semester: record.semester || masterStudent?.semester || record.semester,

                        company_mail: record.company_mail || masterCompany?.company_mail || "",
                        company_address: record.company_address || masterCompany?.company_address || "",
                        hr_name: record.hr_name || masterCompany?.hr_name || "",
                        hr_mail: record.hr_mail || masterCompany?.hr_mail || "",
                    };
                });

                bulkInsertMutation.mutate(mapped);
            }
        } catch (e) {
            console.error(e);
            toast.error("File upload failed");
        }
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    // Filter & Search Logic
    const filteredData = placements?.filter((p: any) => {
        // Global Search
        if (globalSearch) {
            const searchLower = globalSearch.toLowerCase();
            const matchesGlobal = columnDefs.some(col => {
                if (!col.visible) return false;
                const val = col.isCustom ? (p.other_details?.[col.key]) : p[col.key];
                return String(val || "").toLowerCase().includes(searchLower);
            });
            if (!matchesGlobal) return false;
        }

        // Specific Filters
        return Object.entries(filters).every(([key, value]) => {
            if (!value) return true;
            const valLower = value.toLowerCase();
            const col = columnDefs.find(c => c.key === key);
            if (!col) return true;
            const recordVal = col.isCustom ? (p.other_details?.[key]) : p[key];
            return String(recordVal || "").toLowerCase().includes(valLower);
        });
    });

    const visibleColumns = columnDefs.filter(c => c.visible);

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center gap-4 flex-wrap">
                    <h2 className="text-2xl font-bold">Student Placement Records</h2>
                    <div className="flex gap-2">
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept=".xlsx,.csv"
                            onChange={handleFileUpload}
                        />
                        <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                            <Upload className="mr-2 h-4 w-4" /> Import
                        </Button>
                        <Button variant="outline" onClick={() => setIsColumnDialogOpen(true)}>
                            <Columns className="mr-2 h-4 w-4" /> Add Col
                        </Button>
                        <Button onClick={() => { setEditingId(null); setIsDialogOpen(true); }}>
                            <Plus className="mr-2 h-4 w-4" /> Add Record
                        </Button>
                    </div>
                </div>

                {/* Global Search & Column Toggle */}
                <div className="flex items-center gap-4 bg-muted/20 p-4 rounded-md">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Global Search..."
                            className="pl-9 bg-background"
                            value={globalSearch}
                            onChange={(e) => setGlobalSearch(e.target.value)}
                        />
                    </div>

                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="outline">Hidden Columns ({columnDefs.filter(c => !c.visible).length})</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader><DialogTitle>Manage Columns</DialogTitle></DialogHeader>
                            <div className="grid grid-cols-2 gap-2">
                                {columnDefs.map(col => (
                                    <div key={col.key} className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            checked={col.visible}
                                            onChange={() => col.visible ? handleHideColumn(col.key) : handleUnhideColumn(col.key)}
                                            id={`col-${col.key}`}
                                        />
                                        <label htmlFor={`col-${col.key}`}>{col.label}</label>
                                    </div>
                                ))}
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <div className="rounded-md border overflow-x-auto shadow-sm">
                <Table className="min-w-[2000px]">
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[60px] font-bold bg-muted/50">S.No</TableHead>
                            {visibleColumns.map((col) => (
                                <TableHead key={col.key} className="font-bold bg-muted/50 min-w-[150px] group">
                                    {editingHeaderKey === col.key ? (
                                        <div className="flex items-center gap-1">
                                            <Input
                                                value={tempHeaderName}
                                                onChange={(e) => setTempHeaderName(e.target.value)}
                                                className="h-7 text-xs"
                                                autoFocus
                                                onBlur={() => handleHeaderRename(col.key, tempHeaderName)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleHeaderRename(col.key, tempHeaderName)}
                                            />
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between gap-2">
                                            <span>{col.label}</span>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button
                                                    variant="ghost" size="icon" className="h-6 w-6"
                                                    onClick={() => { setEditingHeaderKey(col.key); setTempHeaderName(col.label); }}
                                                >
                                                    <Pencil className="h-3 w-3 text-blue-500" />
                                                </Button>
                                                <Button
                                                    variant="ghost" size="icon" className="h-6 w-6"
                                                    onClick={() => handleHideColumn(col.key)}
                                                >
                                                    <Trash2 className="h-3 w-3 text-red-500" />
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </TableHead>
                            ))}
                            <TableHead className="text-right font-bold bg-muted/50 sticky right-0 z-10 shadow-[-5px_0_10px_-5px_rgba(0,0,0,0.1)]">
                                Actions
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={visibleColumns.length + 2} className="text-center h-24">Loading...</TableCell></TableRow>
                        ) : filteredData?.length === 0 ? (
                            <TableRow><TableCell colSpan={visibleColumns.length + 2} className="text-center h-24">No records found</TableCell></TableRow>
                        ) : (
                            filteredData?.map((record, index) => (
                                <TableRow key={record.id} className="hover:bg-muted/5">
                                    <TableCell>{index + 1}</TableCell>
                                    {visibleColumns.map(col => (
                                        <TableCell key={col.key}>
                                            {col.isCustom ? (record.other_details?.[col.key] || "-") : (record[col.key as keyof StudentPlacement] || "-")}
                                        </TableCell>
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
                                                        <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => deleteMutation.mutate(record.id)} className="bg-red-600">Delete</AlertDialogAction>
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
                    <DialogHeader><DialogTitle>Add Custom Column</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Column Name</Label>
                            <Input value={newColumnName} onChange={(e) => setNewColumnName(e.target.value)} placeholder="e.g. Bond Period" />
                        </div>
                        <Button onClick={handleAddCustomColumn} className="w-full">Add</Button>
                    </div>
                </DialogContent>
            </Dialog>

            <PlacementRecordDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                editingId={editingId}
                customColumns={columnDefs.filter(c => c.isCustom).map(c => c.key)}
            />
        </div>
    );
}

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

    const { data: departments } = useQuery({
        queryKey: ["departments"],
        queryFn: async () => {
            const { data } = await supabase.from("departments").select("id, code, name").order("code");
            return data;
        }
    });

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

    useEffect(() => {
        if (!isEditing && open && role === "department_coordinator" && departments && departmentId) {
            const myDept = departments.find(d => d.id === departmentId);
            if (myDept) form.setValue("department", myDept.code);
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
            queryClient.invalidateQueries({ queryKey: ["student-placements"] });
            onOpenChange(false);
            form.reset({});
        },
        onError: (error) => toast.error("Error: " + error.message)
    });

    const onSubmit = (data: Partial<StudentPlacement>) => mutation.mutate(data);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{isEditing ? "Edit Record" : "Add Placement Record"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label>Company Name</Label>
                            <Input
                                {...form.register("company_name")}
                                onBlur={async (e) => {
                                    form.register("company_name").onBlur(e);
                                    const val = e.target.value;
                                    if (val) {
                                        const { data } = await supabase.from("master_companies" as any).select("*").eq("company_name", val).single();
                                        if (data) {
                                            if (!form.getValues("company_mail")) form.setValue("company_mail", data.company_mail || "");
                                            if (!form.getValues("company_address")) form.setValue("company_address", data.company_address || "");
                                            if (!form.getValues("hr_name")) form.setValue("hr_name", data.hr_name || "");
                                            if (!form.getValues("hr_mail")) form.setValue("hr_mail", data.hr_mail || "");
                                        }
                                    }
                                }}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Company Mail</Label>
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
                        <div className="space-y-2">
                            <Label>Student Name</Label>
                            <Input {...form.register("student_name")} required />
                        </div>
                        <div className="space-y-2">
                            <Label>Student ID</Label>
                            <Input
                                {...form.register("student_id")}
                                onBlur={async (e) => {
                                    form.register("student_id").onBlur(e);
                                    const val = e.target.value;
                                    if (val) {
                                        const { data } = await supabase.from("master_students" as any).select("*").eq("student_id", val).single();
                                        if (data) {
                                            if (!form.getValues("student_name")) form.setValue("student_name", data.student_name || "");
                                            if (!form.getValues("student_mail")) form.setValue("student_mail", data.student_mail || "");
                                            if (!form.getValues("student_mobile")) form.setValue("student_mobile", data.student_mobile || "");
                                            // Ensure department code matches select options
                                            if (!form.getValues("department") && data.department) {
                                                // Try to find matching dept code roughly
                                                // Ideally master data has same codes, but we warn if mismatch
                                                form.setValue("department", data.department);
                                            }
                                        }
                                    }
                                }}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Student Email</Label>
                            <Input {...form.register("student_mail")} />
                        </div>
                        <div className="space-y-2">
                            <Label>Student Mobile</Label>
                            <Input {...form.register("student_mobile")} />
                        </div>
                        <div className="space-y-2">
                            <Label>Department</Label>
                            <Select onValueChange={(v) => form.setValue("department", v)} defaultValue={form.getValues("department")}>
                                <SelectTrigger><SelectValue placeholder="Select Dept" /></SelectTrigger>
                                <SelectContent>
                                    {departments?.map(d => <SelectItem key={d.id} value={d.code}>{d.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Offer Type</Label>
                            <Input {...form.register("offer_type")} />
                        </div>
                        <div className="space-y-2">
                            <Label>Salary</Label>
                            <Input type="number" {...form.register("salary")} />
                        </div>
                        <div className="space-y-2">
                            <Label>Package (LPA)</Label>
                            <Input type="number" step="0.1" {...form.register("package_lpa")} />
                        </div>
                        <div className="space-y-2">
                            <Label>Year (Batch)</Label>
                            <Input type="number" {...form.register("current_year")} />
                        </div>
                        <div className="space-y-2">
                            <Label>Semester</Label>
                            <Input type="number" {...form.register("semester")} />
                        </div>
                        <div className="space-y-2">
                            <Label>Join Date</Label>
                            <Input type="date" {...form.register("join_date")} />
                        </div>
                        <div className="space-y-2">
                            <Label>Reference No</Label>
                            <Input {...form.register("ref_no")} />
                        </div>
                    </div>
                    <Button type="submit" disabled={mutation.isPending}>
                        {mutation.isPending && <Clipboard className="mr-2 h-4 w-4 animate-spin" />}
                        {isEditing ? "Update" : "Create"}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
