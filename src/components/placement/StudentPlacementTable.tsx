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
import { Pencil, Trash2, Plus, Search, FileDown, Columns } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import * as XLSX from "xlsx";

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
    const [searchTerm, setSearchTerm] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isColumnDialogOpen, setIsColumnDialogOpen] = useState(false); // New Dialog State
    const [newColumnName, setNewColumnName] = useState(""); // New Column Input
    const [editingId, setEditingId] = useState<string | null>(null);

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

    // Filter
    const filteredData = placements?.filter(p =>
        p.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.student_id?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Export to Excel
    const handleExport = () => {
        if (!filteredData || !filteredData.length) return;
        const ws = XLSX.utils.json_to_sheet(filteredData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Placements");
        XLSX.writeFile(wb, "Student_Placement_Records.xlsx");
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between gap-4 items-center">
                <h2 className="text-2xl font-bold">Individual Placement Records</h2>
                <div className="flex gap-2 w-full sm:w-auto">
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search..."
                            className="pl-8"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Button variant="outline" onClick={handleExport}>
                        <FileDown className="mr-2 h-4 w-4" />
                        Export
                    </Button>
                    <Button variant="outline" onClick={() => setIsColumnDialogOpen(true)}>
                        <Columns className="mr-2 h-4 w-4" />
                        Add Column
                    </Button>
                    <Button onClick={() => { setEditingId(null); setIsDialogOpen(true); }}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add New Row
                    </Button>
                </div>
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
                                <TableHead key={col} className="font-bold capitalize">{col}</TableHead>
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
                                <Input {...form.register("company_name", { required: true })} />
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
                                <Input {...form.register("student_name", { required: true })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Student ID (Reg No)</Label>
                                <Input {...form.register("student_id", { required: true })} />
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
