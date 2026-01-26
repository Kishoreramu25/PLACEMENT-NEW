import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { Loader2, Plus, Save } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

import { ExcelImport } from "@/components/placement/ExcelImport";

export default function AddPlacement() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [isLoading, setIsLoading] = useState(false);
    const [importedData, setImportedData] = useState<any[]>([]);

    // Fetch Companies
    const { data: companies } = useQuery({
        queryKey: ["companies-list"],
        queryFn: async () => {
            const { data } = await supabase.from("companies").select("*").order("name");
            return data || [];
        },
    });

    // Fetch Academic Years
    const { data: academicYears } = useQuery({
        queryKey: ["academic-years"],
        queryFn: async () => {
            const { data } = await supabase.from("academic_years").select("*").order("start_date", { ascending: false });
            return data || [];
        },
    });

    // Fetch Departments
    const { data: departments } = useQuery({
        queryKey: ["departments-list"],
        queryFn: async () => {
            const { data } = await supabase.from("departments").select("*").order("name");
            return data || [];
        }
    });

    const form = useForm({
        defaultValues: {
            companyId: "",
            academicYearId: "",
            visitDate: format(new Date(), "yyyy-MM-dd"),
            driveType: "placement",
            visitMode: "on_campus",
            roleOffered: "",
            ctcAmount: "",
            stipendAmount: "",
            remarks: "",
        },
    });

    const [deptStats, setDeptStats] = useState<Record<string, { appeared: number; selected: number; ppo: number }>>({});

    const handleDeptStatChange = (deptId: string, field: string, value: string) => {
        setDeptStats((prev) => ({
            ...prev,
            [deptId]: {
                ...prev[deptId],
                [field]: parseInt(value) || 0,
            },
        }));
    };

    // Auto-calculate stats if columns match standard names (optional convenience)
    const handleDataImported = (data: any[]) => {
        setImportedData(data);
        // Potential future enhancement: Auto-map "Department" column to stats
    };

    const onSubmit = async (data: any) => {
        try {
            setIsLoading(true);

            // 1. Create Placement Drive
            const { data: driveData, error: driveError } = await supabase
                .from("placement_drives")
                .insert({
                    company_id: data.companyId,
                    academic_year_id: data.academicYearId || academicYears?.[0]?.id, // Default to most recent if not selected
                    visit_date: data.visitDate,
                    drive_type: data.driveType,
                    visit_mode: data.visitMode,
                    role_offered: data.roleOffered,
                    ctc_amount: data.ctcAmount ? parseFloat(data.ctcAmount) : null,
                    stipend_amount: data.stipendAmount ? parseFloat(data.stipendAmount) : null,
                    remarks: data.remarks + (importedData.length ? `\n\nIncluded ${importedData.length} records from imported file.` : ""),
                })
                .select()
                .single();

            if (driveError) throw driveError;

            // 2. Insert Statistics
            const statsToInsert = Object.entries(deptStats)
                .filter(([_, stats]) => stats.appeared > 0 || stats.selected > 0)
                .map(([deptId, stats]) => ({
                    drive_id: driveData.id,
                    department_id: deptId,
                    students_appeared: stats.appeared,
                    students_selected: stats.selected,
                    ppo_count: stats.ppo,
                }));

            if (statsToInsert.length > 0) {
                const { error: statsError } = await supabase
                    .from("selection_statistics")
                    .insert(statsToInsert);

                if (statsError) throw statsError;
            }

            toast.success("Placement drive record created successfully!");
            queryClient.invalidateQueries({ queryKey: ["all-placements-public"] });
            navigate("/placements"); // Redirect to the list
        } catch (error: any) {
            toast.error(error.message || "Failed to save placement record");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <DashboardLayout>
            <div className="max-w-4xl mx-auto space-y-8 pb-10">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Add Placement Record</h1>
                    <p className="text-muted-foreground">
                        Enter details about a placement drive, including student selection stats and reports.
                    </p>
                </div>

                {/* Excel Import Utility */}
                <ExcelImport onDataImported={handleDataImported} />

                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    {/* Company & Drive Details */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Drive Information</CardTitle>
                            <CardDescription>Basic details about the company visit</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-6 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label>Company</Label>
                                <Select
                                    onValueChange={(val) => form.setValue("companyId", val)}
                                    required
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Company" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {companies?.map((c) => (
                                            <SelectItem key={c.id} value={c.id}>
                                                {c.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Visit Date</Label>
                                <Input type="date" {...form.register("visitDate")} required />
                            </div>

                            <div className="space-y-2">
                                <Label>Academic Year</Label>
                                <Select
                                    onValueChange={(val) => form.setValue("academicYearId", val)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Year" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {academicYears?.map((y) => (
                                            <SelectItem key={y.id} value={y.id}>
                                                {y.year_label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Drive Type</Label>
                                <Select
                                    defaultValue="placement"
                                    onValueChange={(val) => form.setValue("driveType", val as any)}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="placement">Placement</SelectItem>
                                        <SelectItem value="internship">Internship</SelectItem>
                                        <SelectItem value="both">Both</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Visit Mode</Label>
                                <Select
                                    defaultValue="on_campus"
                                    onValueChange={(val) => form.setValue("visitMode", val as any)}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="on_campus">On Campus</SelectItem>
                                        <SelectItem value="off_campus">Off Campus</SelectItem>
                                        <SelectItem value="virtual">Virtual</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Role Offered</Label>
                                <Input placeholder="e.g. Software Engineer" {...form.register("roleOffered")} required />
                            </div>

                            <div className="space-y-2">
                                <Label>CTC (in INR)</Label>
                                <Input type="number" placeholder="500000" {...form.register("ctcAmount")} />
                            </div>

                            <div className="space-y-2">
                                <Label>Stipend (Monthly)</Label>
                                <Input type="number" placeholder="25000" {...form.register("stipendAmount")} />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Detailed Report / Student Names */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Detailed Report & Student List</CardTitle>
                            <CardDescription>
                                Enter the list of placed students (Name, Department, Package) and any detailed questions/answers about the drive.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Textarea
                                className="min-h-[200px]"
                                placeholder="E.g.\n1. John Doe - CSE - 12 LPA\n2. Jane Smith - ECE - 10 LPA\n\nInternship Candidates:\n..."
                                {...form.register("remarks")}
                            />
                        </CardContent>
                    </Card>

                    {/* Department Statistics */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Department Statistics</CardTitle>
                            <CardDescription>Enter the counts for each department.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {departments?.map(dept => (
                                    <div key={dept.id} className="grid grid-cols-2 sm:grid-cols-4 gap-4 items-center border-b pb-4 last:border-0">
                                        <div className="font-medium col-span-2 sm:col-span-1">{dept.name} ({dept.code})</div>
                                        <div className="col-span-1">
                                            <Label className="text-xs">Appeared</Label>
                                            <Input
                                                type="number"
                                                className="h-8 mt-1"
                                                onChange={(e) => handleDeptStatChange(dept.id, "appeared", e.target.value)}
                                            />
                                        </div>
                                        <div className="col-span-1">
                                            <Label className="text-xs">Selected</Label>
                                            <Input
                                                type="number"
                                                className="h-8 mt-1"
                                                onChange={(e) => handleDeptStatChange(dept.id, "selected", e.target.value)}
                                            />
                                        </div>
                                        <div className="col-span-2 sm:col-span-1">
                                            <Label className="text-xs">PPO</Label>
                                            <Input
                                                type="number"
                                                className="h-8 mt-1"
                                                onChange={(e) => handleDeptStatChange(dept.id, "ppo", e.target.value)}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <Button type="submit" size="lg" className="w-full" disabled={isLoading}>
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Submit Placement Record
                    </Button>
                </form>
            </div>
        </DashboardLayout>
    );
}
