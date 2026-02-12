import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, Trash2, Search, Loader2, Download } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

export default function MasterData() {
    const [activeTab, setActiveTab] = useState("students");

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Master Data Management</h1>
                    <p className="text-muted-foreground">Manage centralized database for Students and Companies.</p>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                    <TabsList>
                        <TabsTrigger value="students">Master Students</TabsTrigger>
                        <TabsTrigger value="companies">Master Companies</TabsTrigger>
                    </TabsList>
                    <TabsContent value="students" className="space-y-4">
                        <MasterStudentTable />
                    </TabsContent>
                    <TabsContent value="companies" className="space-y-4">
                        <MasterCompanyTable />
                    </TabsContent>
                </Tabs>
            </div>
        </DashboardLayout>
    );
}

function MasterStudentTable() {
    const queryClient = useQueryClient();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [search, setSearch] = useState("");

    const { data: students, isLoading } = useQuery({
        queryKey: ["master-students"],
        queryFn: async () => {
            const { data, error } = await supabase.from("master_students" as any).select("*").order("student_id");
            if (error) throw error;
            return data;
        }
    });

    const importMutation = useMutation({
        mutationFn: async (records: any[]) => {
            const { error } = await supabase.from("master_students" as any).upsert(records, { onConflict: "student_id" });
            if (error) throw error;
        },
        onSuccess: (data, variables) => {
            toast.success(`Imported/Updated ${variables.length} students`);
            queryClient.invalidateQueries({ queryKey: ["master-students"] });
        },
        onError: (err) => toast.error("Import failed: " + err.message)
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from("master_students" as any).delete().eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success("Student deleted");
            queryClient.invalidateQueries({ queryKey: ["master-students"] });
        }
    });

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const data = await file.arrayBuffer();
            const wb = XLSX.read(data);
            const ws = wb.Sheets[wb.SheetNames[0]];
            const json = XLSX.utils.sheet_to_json(ws);

            const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
            const findKey = (row: any, keys: string[]) => {
                const rowKeys = Object.keys(row);
                for (const key of keys) {
                    if (row[key] !== undefined) return row[key];
                }
                for (const rKey of rowKeys) {
                    if (keys.some(k => normalize(rKey).includes(normalize(k)))) return row[rKey];
                }
                return undefined;
            };
            const getVal = (row: any, keys: string[]) => String(findKey(row, keys) || "").trim();

            const records = json.map((row: any) => ({
                student_id: getVal(row, ["student_id", "Register No", "USN", "Roll No"]),
                student_name: getVal(row, ["student_name", "Name", "Student Name"]),
                student_mail: getVal(row, ["student_mail", "Email", "Mail"]),
                student_mobile: getVal(row, ["student_mobile", "Mobile", "Phone"]),
                student_address: getVal(row, ["student_address", "Address", "Residence"]),
                department: getVal(row, ["department", "Dept", "Branch"]),
                current_year: Number(getVal(row, ["current_year", "Year"])) || 0,
                semester: Number(getVal(row, ["semester", "Sem"])) || 0
            })).filter((r: any) => r.student_id && r.student_name); // Valid records only

            if (records.length === 0) {
                toast.error("No valid student records found (Check headers: Register No, Name)");
                return;
            }

            if (confirm(`Found ${records.length} students. Import?`)) {
                importMutation.mutate(records);
            }
        } catch (err) {
            toast.error("File processing failed");
            console.error(err);
        }
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const filtered = students?.filter((s: any) =>
        s.student_name.toLowerCase().includes(search.toLowerCase()) ||
        s.student_id.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex justify-between items-center">
                    <span>Student Master List ({students?.length || 0})</span>
                    <div className="flex gap-2">
                        <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx,.csv" onChange={handleFileUpload} />
                        <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={importMutation.isPending}>
                            {importMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                            Import Excel
                        </Button>
                    </div>
                </CardTitle>
                <CardDescription>
                    This data is used to auto-fill placement records. Ensure "Register No" matches.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search students..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <div className="border rounded-md overflow-hidden h-[500px] overflow-y-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Reg No</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Mobile</TableHead>
                                <TableHead>Dept</TableHead>
                                <TableHead>Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={6} className="text-center p-4">Loading...</TableCell></TableRow>
                            ) : filtered?.length === 0 ? (
                                <TableRow><TableCell colSpan={6} className="text-center p-4">No records found</TableCell></TableRow>
                            ) : (
                                filtered?.slice(0, 100).map((s: any) => (
                                    <TableRow key={s.id}>
                                        <TableCell>{s.student_id}</TableCell>
                                        <TableCell>{s.student_name}</TableCell>
                                        <TableCell>{s.student_mail}</TableCell>
                                        <TableCell>{s.student_mobile}</TableCell>
                                        <TableCell>{s.department}</TableCell>
                                        <TableCell>
                                            <Button variant="ghost" size="icon" onClick={() => {
                                                if (confirm("Delete this student from master?")) deleteMutation.mutate(s.id);
                                            }}>
                                                <Trash2 className="h-4 w-4 text-red-500" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}

function MasterCompanyTable() {
    const queryClient = useQueryClient();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [search, setSearch] = useState("");

    const { data: companies, isLoading } = useQuery({
        queryKey: ["master-companies"],
        queryFn: async () => {
            const { data, error } = await supabase.from("master_companies" as any).select("*").order("company_name");
            if (error) throw error;
            return data;
        }
    });

    const importMutation = useMutation({
        mutationFn: async (records: any[]) => {
            const { error } = await supabase.from("master_companies" as any).upsert(records, { onConflict: "company_name" });
            if (error) throw error;
        },
        onSuccess: (data, variables) => {
            toast.success(`Imported/Updated ${variables.length} companies`);
            queryClient.invalidateQueries({ queryKey: ["master-companies"] });
        },
        onError: (err) => toast.error("Import failed: " + err.message)
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from("master_companies" as any).delete().eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success("Company deleted");
            queryClient.invalidateQueries({ queryKey: ["master-companies"] });
        }
    });

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const data = await file.arrayBuffer();
            const wb = XLSX.read(data);
            const ws = wb.Sheets[wb.SheetNames[0]];
            const json = XLSX.utils.sheet_to_json(ws);

            const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
            const findKey = (row: any, keys: string[]) => {
                const rowKeys = Object.keys(row);
                for (const key of keys) {
                    if (row[key] !== undefined) return row[key];
                }
                for (const rKey of rowKeys) {
                    if (keys.some(k => normalize(rKey).includes(normalize(k)))) return row[rKey];
                }
                return undefined;
            };
            const getVal = (row: any, keys: string[]) => String(findKey(row, keys) || "").trim();

            const records = json.map((row: any) => ({
                company_name: getVal(row, ["company_name", "Company", "Name"]),
                company_mail: getVal(row, ["company_mail", "Company Mail", "Email"]),
                company_address: getVal(row, ["company_address", "Company Address", "Address"]),
                hr_name: getVal(row, ["hr_name", "HR Name", "Contact Person"]),
                hr_mail: getVal(row, ["hr_mail", "HR Mail", "HR Email"])
            })).filter((r: any) => r.company_name);

            if (records.length === 0) {
                toast.error("No valid company records found (Check headers: Company Name)");
                return;
            }

            if (confirm(`Found ${records.length} companies. Import?`)) {
                importMutation.mutate(records);
            }
        } catch (err) {
            toast.error("File processing failed");
            console.error(err);
        }
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const filtered = companies?.filter((c: any) =>
        c.company_name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex justify-between items-center">
                    <span>Company Master List ({companies?.length || 0})</span>
                    <div className="flex gap-2">
                        <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx,.csv" onChange={handleFileUpload} />
                        <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={importMutation.isPending}>
                            {importMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                            Import Excel
                        </Button>
                    </div>
                </CardTitle>
                <CardDescription>
                    This data is used to auto-fill Company/HR details. Ensure "Company Name" matches.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search companies..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <div className="border rounded-md overflow-hidden h-[500px] overflow-y-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Company Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>HR Name</TableHead>
                                <TableHead>HR Email</TableHead>
                                <TableHead>Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={5} className="text-center p-4">Loading...</TableCell></TableRow>
                            ) : filtered?.length === 0 ? (
                                <TableRow><TableCell colSpan={5} className="text-center p-4">No records found</TableCell></TableRow>
                            ) : (
                                filtered?.slice(0, 100).map((c: any) => (
                                    <TableRow key={c.id}>
                                        <TableCell>{c.company_name}</TableCell>
                                        <TableCell>{c.company_mail}</TableCell>
                                        <TableCell>{c.hr_name}</TableCell>
                                        <TableCell>{c.hr_mail}</TableCell>
                                        <TableCell>
                                            <Button variant="ghost" size="icon" onClick={() => {
                                                if (confirm("Delete this company from master?")) deleteMutation.mutate(c.id);
                                            }}>
                                                <Trash2 className="h-4 w-4 text-red-500" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
