import { useState } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Filter, FileSpreadsheet, X } from "lucide-react";

interface ExcelImportProps {
    onDataImported: (data: any[]) => void;
}

export function ExcelImport({ onDataImported }: ExcelImportProps) {
    const [data, setData] = useState<any[]>([]);
    const [columns, setColumns] = useState<string[]>([]);
    const [filters, setFilters] = useState<Record<string, string>>({});
    const [fileName, setFileName] = useState<string | null>(null);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setFileName(file.name);
        const reader = new FileReader();
        reader.onload = (evt) => {
            const bstr = evt.target?.result;
            const wb = XLSX.read(bstr, { type: "binary" });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const data = XLSX.utils.sheet_to_json(ws);

            if (data.length > 0) {
                const cols = Object.keys(data[0] as object);
                setColumns(cols);
                setData(data);
                onDataImported(data);
            }
        };
        reader.readAsBinaryString(file);
    };

    const handleFilterChange = (column: string, value: string) => {
        setFilters((prev) => ({
            ...prev,
            [column]: value === "all" ? "" : value,
        }));
    };

    const getUniqueValues = (column: string) => {
        return Array.from(new Set(data.map((item) => String(item[column]))));
    };

    const filteredData = data.filter((row) => {
        return Object.entries(filters).every(([key, value]) => {
            if (!value) return true;
            return String(row[key]) === value;
        });
    });

    const clearFile = () => {
        setData([]);
        setColumns([]);
        setFileName(null);
        setFilters({});
        onDataImported([]);
    };

    return (
        <Card className="w-full">
            <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                    <FileSpreadsheet className="h-5 w-5 text-green-600" />
                    Import Student List (Excel/CSV)
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* File Upload Area */}
                {!data.length ? (
                    <div className="flex items-center gap-4">
                        <Input
                            type="file"
                            accept=".xlsx,.xls,.csv"
                            onChange={handleFileUpload}
                            className="cursor-pointer"
                        />
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between bg-muted p-2 rounded-md">
                            <span className="text-sm font-medium flex items-center gap-2">
                                <FileSpreadsheet className="h-4 w-4" />
                                {fileName} ({data.length} rows)
                            </span>
                            <Button variant="ghost" size="sm" onClick={clearFile}>
                                <X className="h-4 w-4 mr-2" />
                                Remove
                            </Button>
                        </div>

                        {/* Dynamic Filters */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 border rounded-lg bg-slate-50">
                            <div className="col-span-full text-sm font-semibold text-muted-foreground flex items-center gap-2">
                                <Filter className="h-4 w-4" />
                                Filter Data
                            </div>
                            {columns.slice(0, 4).map((col) => (
                                <div key={col} className="space-y-1">
                                    <Label className="text-xs truncate block" title={col}>{col}</Label>
                                    <Select onValueChange={(val) => handleFilterChange(col, val)}>
                                        <SelectTrigger className="h-8">
                                            <SelectValue placeholder="All" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All</SelectItem>
                                            {getUniqueValues(col).slice(0, 50).map((val) => (
                                                <SelectItem key={val} value={val}>
                                                    {val}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            ))}
                        </div>

                        {/* Data Preview Table */}
                        <div className="rounded-md border max-h-[300px] overflow-auto">
                            <Table>
                                <TableHeader className="sticky top-0 bg-background z-10">
                                    <TableRow>
                                        {columns.map((col) => (
                                            <TableHead key={col} className="whitespace-nowrap">
                                                {col}
                                            </TableHead>
                                        ))}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredData.slice(0, 50).map((row, i) => (
                                        <TableRow key={i}>
                                            {columns.map((col) => (
                                                <TableCell key={`${i}-${col}`} className="whitespace-nowrap">
                                                    {row[col]}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))}
                                    {filteredData.length > 50 && (
                                        <TableRow>
                                            <TableCell colSpan={columns.length} className="text-center text-muted-foreground">
                                                ... and {filteredData.length - 50} more rows
                                            </TableCell>
                                        </TableRow>
                                    )}
                                    {filteredData.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={columns.length} className="text-center h-24">
                                                No matching records found
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        <div className="text-xs text-muted-foreground text-right">
                            Showing {Math.min(filteredData.length, 50)} of {filteredData.length} filtered rows
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
