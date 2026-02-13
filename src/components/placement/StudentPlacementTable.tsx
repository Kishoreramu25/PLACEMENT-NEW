import { useState, useEffect, useRef, useCallback } from "react";
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
import { Pencil, Trash2, Plus, Search, FileDown, Columns, Upload, Clipboard, Eye, EyeOff, X, Loader2, CheckCircle2 } from "lucide-react";
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
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false);
    const [newColumnName, setNewColumnName] = useState("");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [filters, setFilters] = useState<Record<string, string>>({});
    const [globalSearch, setGlobalSearch] = useState("");

    // === Excel-like State ===
    type CellPos = { row: number; col: number };
    const [selectedCell, setSelectedCell] = useState<CellPos | null>(null);
    const [selectionEnd, setSelectionEnd] = useState<CellPos | null>(null);
    const [editingCell, setEditingCell] = useState<CellPos | null>(null);
    const [localEdits, setLocalEdits] = useState<Record<string, Record<string, any>>>({});
    const [isDragging, setIsDragging] = useState(false);
    const [dragEnd, setDragEnd] = useState<CellPos | null>(null);
    const tableRef = useRef<HTMLDivElement>(null);
    const editInputRef = useRef<HTMLInputElement>(null);

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

    // Delete All Mutation
    const deleteAllMutation = useMutation({
        mutationFn: async (ids: string[]) => {
            if (!ids.length) return;
            const { error } = await supabase.from("student_placements" as any).delete().in("id", ids);
            if (error) throw error;
        },
        onSuccess: (_, variables) => {
            toast.success(`Deleted ${variables.length} records successfully`);
            queryClient.invalidateQueries({ queryKey: ["student-placements"] });
            setIsDeleteDialogOpen(false);
            setSelectionEnd(null);
            setSelectedCell(null);
        },
        onError: (error) => {
            toast.error("Failed to delete records: " + error.message);
        }
    });



    // Cell Update Mutation
    const cellUpdateMutation = useMutation({
        mutationFn: async ({ id, field, value }: { id: string; field: string; value: any }) => {
            const { error } = await supabase.from("student_placements" as any).update({ [field]: value }).eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["student-placements"] });
        },
        onError: (error) => {
            toast.error("Save failed: " + error.message);
        }
    });

    // Batch cell update for paste/fill operations
    const batchUpdateMutation = useMutation({
        mutationFn: async (updates: { id: string; field: string; value: any }[]) => {
            // Use RPC for transactional update
            const { error } = await supabase.rpc('batch_update_student_placements', { updates });
            if (error) throw error;
        },
        onSuccess: (_, variables) => {
            toast.success(`Updated ${variables.length} cell(s)`);
            queryClient.invalidateQueries({ queryKey: ["student-placements"] });
            setLocalEdits({});
            setIsSuccessDialogOpen(true);
        },
        onError: (error) => {
            toast.error("Batch save failed: " + error.message);
        }
    });

    // Bulk Insert Mutation
    const bulkInsertMutation = useMutation({
        mutationFn: async (records: Partial<StudentPlacement>[]) => {
            // Use RPC for transactional bulk insert
            const { error } = await supabase.rpc('bulk_insert_student_placements_v2', { records });
            if (error) throw error;
        },

        onSuccess: (data, variables) => {
            toast.success(`Successfully imported ${variables.length} records`);
            queryClient.invalidateQueries({ queryKey: ["student-placements"] });
        },
        onError: (error) => {
            toast.error("Import failed: " + error.message);
        }
    });

    // Excel Helper — Dynamic Mapping based on Column Definitions
    const mapExcelRowToStudentPlacement = (row: any): Partial<StudentPlacement> => {
        // Normalize: lowercase, strip all non-alphanumeric
        const norm = (s: string) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');

        // 1. Build Field Map from available columns (Labels & Keys)
        const fieldMap: Record<string, keyof StudentPlacement> = {};

        columnDefs.forEach(col => {
            fieldMap[norm(col.label)] = col.key; // Match "Company Name" -> company_name
            fieldMap[norm(col.key)] = col.key;   // Match "company_name" -> company_name
        });

        // 2. Add common aliases for fuzzy matching
        const aliases: Record<string, keyof StudentPlacement> = {
            'company': 'company_name', 'organization': 'company_name',
            'email': 'student_mail', 'mail': 'student_mail', 'studentmailid': 'student_mail',
            'mobile': 'student_mobile', 'phone': 'student_mobile', 'contact': 'student_mobile', 'studentmobilenumber': 'student_mobile',
            'address': 'student_address',
            'dept': 'department', 'branch': 'department',
            'type': 'offer_type', 'offer': 'offer_type', 'internshipplaced': 'offer_type',
            'ctc': 'salary', 'annualsalary': 'salary', 'stipendsalary': 'salary', 'stipend': 'salary',
            'package': 'package_lpa', 'lpa': 'package_lpa',
            'year': 'current_year', 'batch': 'current_year', 'placedyear': 'current_year',
            'sem': 'semester', 'placedsem': 'semester',
            'doj': 'join_date', 'dateofjoining': 'join_date', 'date': 'join_date',
            'ref': 'ref_no', 'reference': 'ref_no', 'referenceno': 'ref_no',
            'hr': 'hr_name', 'hrcontact': 'hr_name',
            'hremail': 'hr_mail',
            'companyemail': 'company_mail',
            'companyaddress': 'company_address',
            'placedstudentname': 'student_name',
        };
        Object.assign(fieldMap, aliases);

        // 3. Map Row Data
        const fieldValues: Record<string, any> = {};
        for (const excelHeader of Object.keys(row)) {
            const normalizedHeader = norm(excelHeader);
            // Ignore serial numbers
            if (normalizedHeader === 'sno' || normalizedHeader === 'slno') continue;

            const fieldKey = fieldMap[normalizedHeader];
            if (fieldKey && fieldValues[fieldKey] === undefined) {
                // Determine value (trim strings)
                let val = row[excelHeader];
                if (typeof val === 'string') val = val.trim();
                fieldValues[fieldKey] = val;
            }
        }

        const str = (field: string) => String(fieldValues[field] ?? '').trim();
        const num = (field: string, fallback: number = 0) => {
            const val = fieldValues[field];
            return (val !== undefined && val !== null && val !== '') ? Number(val) : fallback;
        };

        return {
            company_name: str('company_name'),
            company_mail: str('company_mail'),
            company_address: str('company_address'),
            hr_name: str('hr_name'),
            hr_mail: str('hr_mail'),
            student_name: str('student_name'),
            student_id: str('student_id'),
            student_mail: str('student_mail'),
            student_mobile: str('student_mobile'),
            student_address: str('student_address'),
            department: str('department'),
            offer_type: str('offer_type'),
            salary: num('salary'),
            package_lpa: num('package_lpa'),
            current_year: num('current_year', new Date().getFullYear()),
            semester: num('semester'),
            join_date: str('join_date') || null,
            ref_no: str('ref_no'),
        };
    };

    const fileInputRef = useRef<HTMLInputElement>(null);
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files?.length) return;

        try {
            const file = files[0];
            const data = await file.arrayBuffer();
            const wb = XLSX.read(data, { type: 'array' });
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

    // === Excel-like Helpers ===
    const getSelectionRange = useCallback(() => {
        if (!selectedCell) return null;
        const end = selectionEnd || selectedCell;
        return {
            minRow: Math.min(selectedCell.row, end.row),
            maxRow: Math.max(selectedCell.row, end.row),
            minCol: Math.min(selectedCell.col, end.col),
            maxCol: Math.max(selectedCell.col, end.col),
        };
    }, [selectedCell, selectionEnd]);

    const isCellInSelection = useCallback((row: number, col: number) => {
        const range = getSelectionRange();
        if (!range) return false;
        return row >= range.minRow && row <= range.maxRow && col >= range.minCol && col <= range.maxCol;
    }, [getSelectionRange]);

    const isCellInDragFill = useCallback((row: number, col: number) => {
        if (!isDragging || !selectedCell || !dragEnd) return false;
        const startRow = selectedCell.row + 1;
        const endRow = dragEnd.row;
        if (endRow < startRow) return false;
        return row >= startRow && row <= endRow && col === selectedCell.col;
    }, [isDragging, selectedCell, dragEnd]);

    const getCellValue = useCallback((record: StudentPlacement, colKey: string) => {
        const edited = localEdits[record.id]?.[colKey];
        if (edited !== undefined) return edited;
        const col = columnDefs.find(c => c.key === colKey);
        if (col?.isCustom) return record.other_details?.[colKey] || "";
        return (record as any)[colKey] ?? "";
    }, [localEdits, columnDefs]);

    const setLocalCellValue = useCallback((recordId: string, colKey: string, value: any) => {
        setLocalEdits(prev => ({
            ...prev,
            [recordId]: { ...prev[recordId], [colKey]: value }
        }));
    }, []);

    const commitCellEdit = useCallback((recordId: string, colKey: string, value: any) => {
        cellUpdateMutation.mutate({ id: recordId, field: colKey, value });
        setLocalEdits(prev => {
            const next = { ...prev };
            if (next[recordId]) {
                delete next[recordId][colKey];
                if (Object.keys(next[recordId]).length === 0) delete next[recordId];
            }
            return next;
        });
    }, [cellUpdateMutation]);

    const handleCellClick = useCallback((row: number, col: number, e: React.MouseEvent) => {
        if (e.shiftKey && selectedCell) {
            setSelectionEnd({ row, col });
        } else {
            setSelectedCell({ row, col });
            setSelectionEnd(null);
        }
    }, [selectedCell]);

    const handleCellDoubleClick = useCallback((row: number, col: number) => {
        setEditingCell({ row, col });
        setSelectedCell({ row, col });
        setSelectionEnd(null);
    }, []);

    // Keyboard handler
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Skip if typing in search/dialog inputs
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' && !target.closest('.excel-cell')) return;
            if (target.closest('[role="dialog"]')) return;

            if (!filteredData || !selectedCell) return;

            // Ctrl+C: Copy
            if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
                e.preventDefault();
                const range = getSelectionRange();
                if (!range) return;
                const lines: string[] = [];
                for (let r = range.minRow; r <= range.maxRow; r++) {
                    const record = filteredData[r];
                    if (!record) continue;
                    const cells: string[] = [];
                    for (let c = range.minCol; c <= range.maxCol; c++) {
                        const colKey = visibleColumns[c]?.key;
                        if (colKey) cells.push(String(getCellValue(record, colKey)));
                    }
                    lines.push(cells.join('\t'));
                }
                navigator.clipboard.writeText(lines.join('\n'));
                toast.success('Copied to clipboard');
                return;
            }

            // Ctrl+V: Paste
            if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
                e.preventDefault();
                navigator.clipboard.readText().then(text => {
                    if (!text || !selectedCell || !filteredData) return;
                    const rows = text.split(/\r?\n/).filter(l => l.length > 0);
                    const updates: { id: string; field: string; value: any }[] = [];
                    rows.forEach((rowText, rOffset) => {
                        const cells = rowText.split('\t');
                        const targetRow = selectedCell.row + rOffset;
                        const record = filteredData[targetRow];
                        if (!record) return;
                        cells.forEach((cellVal, cOffset) => {
                            const targetCol = selectedCell.col + cOffset;
                            const colKey = visibleColumns[targetCol]?.key;
                            if (!colKey) return;
                            const trimmed = cellVal.trim();
                            setLocalCellValue(record.id, colKey, trimmed);
                            updates.push({ id: record.id, field: colKey, value: trimmed });
                        });
                    });
                    if (updates.length > 0) {
                        // batchUpdateMutation.mutate(updates); // Manual Save
                        toast.success(`Pasted ${updates.length} cells. Click Save to commit.`);
                    }
                }).catch(() => toast.error('Clipboard access denied'));
                return;
            }

            // Arrow keys navigation
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key) && !editingCell) {
                e.preventDefault();
                const { row, col } = selectedCell;
                let newRow = row, newCol = col;
                if (e.key === 'ArrowUp') newRow = Math.max(0, row - 1);
                if (e.key === 'ArrowDown') newRow = Math.min((filteredData?.length || 1) - 1, row + 1);
                if (e.key === 'ArrowLeft') newCol = Math.max(0, col - 1);
                if (e.key === 'ArrowRight' || e.key === 'Tab') newCol = Math.min(visibleColumns.length - 1, col + 1);
                if (e.shiftKey) {
                    setSelectionEnd({ row: newRow, col: newCol });
                } else {
                    setSelectedCell({ row: newRow, col: newCol });
                    setSelectionEnd(null);
                }
                return;
            }

            // Enter to start editing
            if (e.key === 'Enter' && !editingCell) {
                e.preventDefault();
                setEditingCell({ ...selectedCell });
                return;
            }

            // Escape to stop editing
            if (e.key === 'Escape') {
                setEditingCell(null);
                return;
            }

            // Delete/Backspace to clear selected cells
            if ((e.key === 'Delete' || e.key === 'Backspace') && !editingCell) {
                e.preventDefault();
                const range = getSelectionRange();
                if (!range) return;
                const updates: { id: string; field: string; value: any }[] = [];
                for (let r = range.minRow; r <= range.maxRow; r++) {
                    const record = filteredData[r];
                    if (!record) continue;
                    for (let c = range.minCol; c <= range.maxCol; c++) {
                        const colKey = visibleColumns[c]?.key;
                        if (!colKey) continue;
                        setLocalCellValue(record.id, colKey, '');
                        updates.push({ id: record.id, field: colKey, value: '' });
                    }
                }
                if (updates.length > 0) {
                    // batchUpdateMutation.mutate(updates); // Manual Save
                }
                return;
            }

            // Start typing to edit (single printable character)
            if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && !editingCell) {
                setEditingCell({ ...selectedCell });
                const record = filteredData[selectedCell.row];
                const colKey = visibleColumns[selectedCell.col]?.key;
                if (record && colKey) {
                    setLocalCellValue(record.id, colKey, e.key);
                }
                return;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedCell, selectionEnd, editingCell, filteredData, visibleColumns, getCellValue, setLocalCellValue, getSelectionRange, batchUpdateMutation]);

    // Focus input when editing starts
    useEffect(() => {
        if (editingCell && editInputRef.current) {
            editInputRef.current.focus();
        }
    }, [editingCell]);

    // Drag-to-fill mouse handlers
    const handleFillHandleMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    }, []);

    useEffect(() => {
        if (!isDragging) return;
        const handleMouseUp = () => {
            if (isDragging && selectedCell && dragEnd && filteredData) {
                const sourceRecord = filteredData[selectedCell.row];
                const colKey = visibleColumns[selectedCell.col]?.key;
                if (sourceRecord && colKey) {
                    const sourceVal = getCellValue(sourceRecord, colKey);
                    const startRow = selectedCell.row + 1;
                    const endRow = dragEnd.row;
                    if (endRow >= startRow) {
                        const updates: { id: string; field: string; value: any }[] = [];
                        for (let r = startRow; r <= endRow; r++) {
                            const record = filteredData[r];
                            if (!record) continue;
                            setLocalCellValue(record.id, colKey, sourceVal);
                            updates.push({ id: record.id, field: colKey, value: sourceVal });
                        }
                        if (updates.length > 0) {
                            // batchUpdateMutation.mutate(updates); // Manual Save
                        }
                    }
                }
            }
            setIsDragging(false);
            setDragEnd(null);
        };
        window.addEventListener('mouseup', handleMouseUp);
        return () => window.removeEventListener('mouseup', handleMouseUp);
    }, [isDragging, selectedCell, dragEnd, filteredData, visibleColumns, getCellValue, setLocalCellValue, batchUpdateMutation]);

    const handleCellMouseEnter = useCallback((row: number, col: number) => {
        if (isDragging) {
            setDragEnd({ row, col });
        }
    }, [isDragging]);

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
                            <Upload className="mr-2 h-4 w-4" /> Import Excel/CSV
                        </Button>
                        <Button variant="outline" onClick={() => setIsColumnDialogOpen(true)}>
                            <Columns className="mr-2 h-4 w-4" /> Add Col
                        </Button>
                        <Button
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => {
                                const updates: { id: string; field: string; value: any }[] = [];
                                Object.entries(localEdits).forEach(([id, fields]) => {
                                    Object.entries(fields).forEach(([field, value]) => {
                                        updates.push({ id, field, value });
                                    });
                                });
                                if (updates.length) batchUpdateMutation.mutate(updates);
                            }}
                            disabled={!Object.keys(localEdits).length || batchUpdateMutation.isPending}
                        >
                            {batchUpdateMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Clipboard className="mr-2 h-4 w-4" />} Save Changes
                        </Button>
                        <Button variant="destructive" onClick={() => setIsDeleteDialogOpen(true)} disabled={!filteredData?.length}>
                            <Trash2 className="mr-2 h-4 w-4" /> Delete All
                        </Button>
                        <Button onClick={() => { setEditingId(null); setIsDialogOpen(true); }}>
                            <Plus className="mr-2 h-4 w-4" /> Add Record
                        </Button>
                    </div>
                </div>

                <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will permanently delete <b>{filteredData?.length}</b> record(s) currently listed.
                                {globalSearch || Object.keys(filters).length > 0 ? " (Filtered results only)" : " (All records)"}
                                <br />This action cannot be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                                className="bg-red-600 hover:bg-red-700"
                                onClick={() => {
                                    if (filteredData?.length) {
                                        const ids = filteredData.map(r => r.id);
                                        deleteAllMutation.mutate(ids);
                                    }
                                }}
                            >
                                Confirm Delete
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                <AlertDialog open={isSuccessDialogOpen} onOpenChange={setIsSuccessDialogOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle className="text-green-600 flex items-center gap-2">
                                <CheckCircle2 className="h-5 w-5" /> Saved Successfully
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                                All changes have been committed to the database.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogAction onClick={() => setIsSuccessDialogOpen(false)}>OK</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                {/* Excel-like Tip */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950/30 px-3 py-1.5 rounded-md border border-blue-200 dark:border-blue-800 w-fit">
                    <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                    <span><b>Excel Mode:</b> Click cell to select · Double-click or Enter to edit · <b>Ctrl+C/V</b> to copy/paste · Drag fill handle · <b>Save Changes</b> to commit edits</span>
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

            <div ref={tableRef} className="rounded-md border overflow-x-auto shadow-sm select-none" tabIndex={0}>
                <Table className="min-w-[2000px] border-collapse">
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
                            filteredData?.map((record, rowIndex) => (
                                <TableRow key={record.id} className="hover:bg-muted/5">
                                    <TableCell className="font-medium text-muted-foreground">{rowIndex + 1}</TableCell>
                                    {visibleColumns.map((col, colIndex) => {
                                        const isSelected = selectedCell?.row === rowIndex && selectedCell?.col === colIndex;
                                        const isInRange = isCellInSelection(rowIndex, colIndex);
                                        const isEditing = editingCell?.row === rowIndex && editingCell?.col === colIndex;
                                        const isInFill = isCellInDragFill(rowIndex, colIndex);
                                        const cellValue = getCellValue(record, col.key);
                                        const isUnsaved = localEdits[record.id]?.[col.key] !== undefined;

                                        return (
                                            <TableCell
                                                key={col.key}
                                                className={`p-0 relative excel-cell cursor-cell transition-colors ${isSelected ? 'ring-2 ring-blue-500 ring-inset bg-blue-50/50 dark:bg-blue-950/30 z-10' :
                                                    isInRange ? 'bg-blue-50/80 dark:bg-blue-950/20' :
                                                        isInFill ? 'bg-green-50/80 dark:bg-green-950/20 ring-1 ring-green-400 ring-inset' :
                                                            ''
                                                    } ${isUnsaved ? 'bg-yellow-50/50 dark:bg-yellow-900/20' : ''}`}
                                                onClick={(e) => handleCellClick(rowIndex, colIndex, e)}
                                                onDoubleClick={() => handleCellDoubleClick(rowIndex, colIndex)}
                                                onMouseEnter={() => handleCellMouseEnter(rowIndex, colIndex)}
                                            >
                                                {isUnsaved && <div className="absolute top-0 right-0 w-2 h-2 bg-yellow-500 rounded-bl-sm z-20 pointer-events-none" />}
                                                {isEditing ? (
                                                    <Input
                                                        ref={editInputRef}
                                                        className="excel-cell border-none shadow-none ring-0 focus-visible:ring-0 h-8 px-2 bg-white dark:bg-gray-900 rounded-none"
                                                        value={String(cellValue)}
                                                        onChange={(e) => setLocalCellValue(record.id, col.key, e.target.value)}
                                                        onBlur={() => setEditingCell(null)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                e.preventDefault();
                                                                setEditingCell(null);
                                                                const editedVal = localEdits[record.id]?.[col.key];
                                                                // if (editedVal !== undefined) commitCellEdit(record.id, col.key, editedVal); // Manual Save
                                                                setSelectedCell({ row: Math.min((filteredData?.length || 1) - 1, rowIndex + 1), col: colIndex });
                                                            }
                                                            if (e.key === 'Escape') {
                                                                setEditingCell(null);
                                                                setLocalEdits(prev => {
                                                                    const next = { ...prev };
                                                                    if (next[record.id]) delete next[record.id][col.key];
                                                                    return next;
                                                                });
                                                            }
                                                            if (e.key === 'Tab') {
                                                                e.preventDefault();
                                                                setEditingCell(null);
                                                                const editedVal = localEdits[record.id]?.[col.key];
                                                                if (editedVal !== undefined) commitCellEdit(record.id, col.key, editedVal);
                                                                const nextCol = Math.min(visibleColumns.length - 1, colIndex + 1);
                                                                setSelectedCell({ row: rowIndex, col: nextCol });
                                                                setEditingCell({ row: rowIndex, col: nextCol });
                                                            }
                                                        }}
                                                    />
                                                ) : (
                                                    <div className="px-2 py-1.5 min-h-[32px] flex items-center text-sm truncate">
                                                        {String(cellValue) || <span className="text-muted-foreground">-</span>}
                                                    </div>
                                                )}

                                                {/* Fill Handle */}
                                                {isSelected && !isEditing && (
                                                    <div
                                                        className="absolute bottom-0 right-0 w-[7px] h-[7px] bg-blue-600 border border-white cursor-crosshair z-20"
                                                        onMouseDown={handleFillHandleMouseDown}
                                                        title="Drag to fill"
                                                    />
                                                )}
                                            </TableCell>
                                        );
                                    })}
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
