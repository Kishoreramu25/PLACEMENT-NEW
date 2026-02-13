import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, FileSpreadsheet, Save, ShieldCheck, Users } from "lucide-react";

export default function AppGuide() {
    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">App Guide & Tutorials</h2>
            </div>

            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="tutorials">Tutorials</TabsTrigger>
                    <TabsTrigger value="features">Key Features</TabsTrigger>
                </TabsList>

                {/* OVERVIEW TAB */}
                <TabsContent value="overview" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Welcome to Placement Navigator</CardTitle>
                            <CardDescription>
                                A comprehensive system for managing student placements, campus drives, and recruitment statistics.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-muted-foreground">
                                This application connects Placement Officers (TPO), Heads of Department (HOD), and Management to streamline the campus recruitment process.
                            </p>

                            <div className="grid gap-4 md:grid-cols-3">
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Placement Officer (TPO)</CardTitle>
                                        <Users className="h-4 w-4 text-muted-foreground" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-xs text-muted-foreground">
                                            Manage all student data, track placement drives, and generate overall statistics.
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Department (HOD)</CardTitle>
                                        <Users className="h-4 w-4 text-muted-foreground" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-xs text-muted-foreground">
                                            View and manage students specific to your department.
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Management</CardTitle>
                                        <Users className="h-4 w-4 text-muted-foreground" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-xs text-muted-foreground">
                                            Access high-level analytics, trends, and placement performance reports.
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* TUTORIALS TAB */}
                <TabsContent value="tutorials" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>How-To Guides</CardTitle>
                            <CardDescription>Step-by-step instructions for common tasks.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Accordion type="single" collapsible className="w-full">

                                <AccordionItem value="item-1">
                                    <AccordionTrigger>
                                        <span className="flex items-center gap-2"><FileSpreadsheet className="h-4 w-4" /> How to Import Data (Excel/CSV)</span>
                                    </AccordionTrigger>
                                    <AccordionContent className="space-y-2">
                                        <p>You can bulk upload student records using Excel (.xlsx) or CSV files.</p>
                                        <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                                            <li>Navigate to <strong>Placement Records</strong>.</li>
                                            <li>Click the <strong>Import Excel/CSV</strong> button (top right).</li>
                                            <li>Select your file. The system automatically maps headers like "Student Name", "Company", "Salary" to the correct fields.</li>
                                            <li>Wait for the "Saved Successfully" confirmation.</li>
                                        </ol>
                                        <p className="text-xs text-blue-500 mt-2">
                                            <strong>Note:</strong> The system uses intelligent mapping, so you don't need to rename your columns if they are standard (e.g., "Mobile", "Phone", "Contact" all map to Student Mobile).
                                        </p>
                                    </AccordionContent>
                                </AccordionItem>

                                <AccordionItem value="item-2">
                                    <AccordionTrigger>
                                        <span className="flex items-center gap-2"><Save className="h-4 w-4" /> How to Edit & Save Data</span>
                                    </AccordionTrigger>
                                    <AccordionContent className="space-y-2">
                                        <p>The table works like a spreadsheet for quick editing.</p>
                                        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                                            <li><strong>Click any cell</strong> to edit it directly.</li>
                                            <li><strong>Yellow Highlight:</strong> Indicates unsaved changes.</li>
                                            <li><strong>Save Button:</strong> You MUST click the "Save Changes" button (top right) to commit your edits to the database.</li>
                                            <li><strong>Drag-to-Fill:</strong> Drag the bottom-right corner of a cell to copy its value to neighboring cells.</li>
                                            <li><strong>Copy/Paste:</strong> Use Ctrl+C and Ctrl+V to copy data between cells or from external sheets.</li>
                                        </ul>
                                    </AccordionContent>
                                </AccordionItem>

                                <AccordionItem value="item-3">
                                    <AccordionTrigger>
                                        <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Data Integrity & Safety</span>
                                    </AccordionTrigger>
                                    <AccordionContent className="space-y-2">
                                        <p>The system uses <strong>Transactional Logic</strong> to ensure data safety.</p>
                                        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                                            <li>When you click Save or Import, the system treats the entire batch as one transaction.</li>
                                            <li>If any single record fails (e.g., invalid data), the <strong>entire batch is rolled back</strong>.</li>
                                            <li>This ensures you never have partial or corrupted data updates.</li>
                                        </ul>
                                    </AccordionContent>
                                </AccordionItem>

                                <AccordionItem value="item-4">
                                    <AccordionTrigger>
                                        <span className="flex items-center gap-2"><BookOpen className="h-4 w-4" /> Video: Editing & Saving Data</span>
                                    </AccordionTrigger>
                                    <AccordionContent className="space-y-2">
                                        <div className="aspect-video w-full overflow-hidden rounded-lg border bg-muted">
                                            <video
                                                className="h-full w-full object-cover"
                                                controls
                                                src="/videos/edit_tutorial.webm"
                                            >
                                                Your browser does not support the video tag.
                                            </video>
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            Watch how to edit cells inline, use drag-to-fill, and save your changes securely.
                                        </p>
                                    </AccordionContent>
                                </AccordionItem>
                            </Accordion>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* FEATURES TAB */}
                <TabsContent value="features" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>Interactive Tables</CardTitle>
                            </CardHeader>
                            <CardContent>
                                Filter, sort, and search across all columns. Hide/Show columns as needed for custom views.
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>Secure Role Access</CardTitle>
                            </CardHeader>
                            <CardContent>
                                Features are restricted by role. HODs only see their department's data, while TPOs have global access.
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>Manual Commit System</CardTitle>
                            </CardHeader>
                            <CardContent>
                                Edits are local until you explicitly click "Save". This prevents accidental overwrites and allows you to review changes before committing.
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>Smart Import</CardTitle>
                            </CardHeader>
                            <CardContent>
                                Import messy CSVs without manual cleanup. The app recognizes common header names automatically.
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs >
        </div >
    );
}
