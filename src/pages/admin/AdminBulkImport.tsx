import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Download,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import {
  downloadCSVTemplate,
  parseCSV,
  type ParsedProperty,
  type ParseResult,
} from "@/lib/csv-template";

type ImportStep = "upload" | "preview" | "importing" | "done";

export default function AdminBulkImport() {
  const [step, setStep] = useState<ImportStep>("upload");
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState<{
    success: number;
    failed: { slug: string; error: string }[];
  } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".csv")) {
      toast.error("Please upload a CSV file");
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const result = parseCSV(text);
      setParseResult(result);
      setStep("preview");
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!parseResult?.valid.length) return;

    setStep("importing");
    setImportProgress(0);

    const total = parseResult.valid.length;
    let success = 0;
    const failed: { slug: string; error: string }[] = [];

    for (let i = 0; i < total; i++) {
      const prop = parseResult.valid[i];

      const { error } = await supabase.from("properties").insert({
        name_en: prop.name_en,
        name_ar: prop.name_ar || null,
        slug: prop.slug,
        tagline_en: prop.tagline_en || null,
        tagline_ar: prop.tagline_ar || null,
        developer_en: prop.developer_en || null,
        developer_ar: prop.developer_ar || null,
        location_en: prop.location_en || null,
        location_ar: prop.location_ar || null,
        price_range: prop.price_range || null,
        size_range: prop.size_range || null,
        unit_types: prop.unit_types.length ? prop.unit_types : [],
        ownership_type: prop.ownership_type || null,
        type: prop.type,
        handover_date: prop.handover_date || null,
        overview_en: prop.overview_en || null,
        overview_ar: prop.overview_ar || null,
        highlights_en: prop.highlights_en.length ? prop.highlights_en : [],
        highlights_ar: prop.highlights_ar.length ? prop.highlights_ar : [],
        video_url: prop.video_url || null,
        status: prop.status,
        is_featured: prop.is_featured,
        investment_en: prop.investment_en || null,
        investment_ar: prop.investment_ar || null,
        enduser_text_en: prop.enduser_text_en || null,
        enduser_text_ar: prop.enduser_text_ar || null,
      });

      if (error) {
        failed.push({
          slug: prop.slug,
          error: error.message.includes("duplicate")
            ? "Duplicate slug"
            : error.message,
        });
      } else {
        success++;
      }

      setImportProgress(Math.round(((i + 1) / total) * 100));
    }

    setImportResults({ success, failed });
    setStep("done");

    if (success > 0) {
      toast.success(`${success} properties imported successfully`);
    }
    if (failed.length > 0) {
      toast.error(`${failed.length} properties failed to import`);
    }
  };

  const reset = () => {
    setStep("upload");
    setParseResult(null);
    setImportProgress(0);
    setImportResults(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/admin/properties">
                <ArrowLeft className="w-4 h-4" />
              </Link>
            </Button>
            <h1 className="text-3xl font-semibold">Bulk Import</h1>
          </div>
          <p className="text-muted-foreground ml-12">
            Import multiple properties from a CSV file
          </p>
        </div>
      </div>

      {/* Step 1: Upload */}
      {step === "upload" && (
        <div className="space-y-6">
          {/* Template download */}
          <Card className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <FileSpreadsheet className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg">Download Template</h3>
                <p className="text-muted-foreground text-sm mt-1 mb-4">
                  Start with our pre-formatted CSV template. It includes all
                  supported fields, instructions, and a sample row.
                </p>
                <Button variant="outline" onClick={downloadCSVTemplate}>
                  <Download className="w-4 h-4 mr-2" />
                  Download CSV Template
                </Button>
              </div>
            </div>
          </Card>

          {/* Upload area */}
          <Card className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Upload className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg">Upload CSV</h3>
                <p className="text-muted-foreground text-sm mt-1 mb-4">
                  Upload your completed CSV file to preview and import
                  properties.
                </p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button onClick={() => fileRef.current?.click()}>
                  <Upload className="w-4 h-4 mr-2" />
                  Select CSV File
                </Button>
              </div>
            </div>
          </Card>

          {/* Field reference */}
          <Card className="p-6">
            <h3 className="font-semibold text-lg mb-3">Field Reference</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-sm">
              <div>
                <span className="font-medium">name_en</span>{" "}
                <Badge variant="destructive" className="text-[10px] px-1 py-0">
                  required
                </Badge>
                <span className="text-muted-foreground ml-2">
                  Property name (English)
                </span>
              </div>
              <div>
                <span className="font-medium">slug</span>{" "}
                <Badge variant="destructive" className="text-[10px] px-1 py-0">
                  required
                </Badge>
                <span className="text-muted-foreground ml-2">
                  URL-safe unique identifier
                </span>
              </div>
              <div>
                <span className="font-medium">type</span>{" "}
                <Badge variant="destructive" className="text-[10px] px-1 py-0">
                  required
                </Badge>
                <span className="text-muted-foreground ml-2">
                  off-plan | ready
                </span>
              </div>
              <div>
                <span className="font-medium">status</span>
                <span className="text-muted-foreground ml-2">
                  available | reserved | sold
                </span>
              </div>
              <div>
                <span className="font-medium">unit_types</span>
                <span className="text-muted-foreground ml-2">
                  Pipe-separated (Studio|1BR|2BR)
                </span>
              </div>
              <div>
                <span className="font-medium">highlights_en/ar</span>
                <span className="text-muted-foreground ml-2">
                  Pipe-separated bullet points
                </span>
              </div>
              <div>
                <span className="font-medium">handover_date</span>
                <span className="text-muted-foreground ml-2">
                  YYYY-MM-DD format
                </span>
              </div>
              <div>
                <span className="font-medium">is_featured</span>
                <span className="text-muted-foreground ml-2">true | false</span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Step 2: Preview */}
      {step === "preview" && parseResult && (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Badge
              variant="secondary"
              className="bg-green-500/10 text-green-600"
            >
              <CheckCircle2 className="w-3 h-3 mr-1" />
              {parseResult.valid.length} valid
            </Badge>
            {parseResult.errors.length > 0 && (
              <Badge
                variant="secondary"
                className="bg-red-500/10 text-red-600"
              >
                <XCircle className="w-3 h-3 mr-1" />
                {parseResult.errors.length} errors
              </Badge>
            )}
          </div>

          {parseResult.errors.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Validation Errors</AlertTitle>
              <AlertDescription>
                <ul className="list-disc pl-4 mt-2 space-y-1">
                  {parseResult.errors.map((err, i) => (
                    <li key={i}>
                      Row {err.row}: {err.message}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {parseResult.valid.length > 0 && (
            <Card>
              <div className="border rounded-lg overflow-auto max-h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky top-0 bg-card">
                        Name
                      </TableHead>
                      <TableHead className="sticky top-0 bg-card">
                        Slug
                      </TableHead>
                      <TableHead className="sticky top-0 bg-card">
                        Type
                      </TableHead>
                      <TableHead className="sticky top-0 bg-card">
                        Location
                      </TableHead>
                      <TableHead className="sticky top-0 bg-card">
                        Developer
                      </TableHead>
                      <TableHead className="sticky top-0 bg-card">
                        Status
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parseResult.valid.map((prop, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">
                          {prop.name_en}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {prop.slug}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              prop.type === "off-plan" ? "default" : "secondary"
                            }
                          >
                            {prop.type === "off-plan" ? "Off-Plan" : "Ready"}
                          </Badge>
                        </TableCell>
                        <TableCell>{prop.location_en || "—"}</TableCell>
                        <TableCell>{prop.developer_en || "—"}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{prop.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}

          <div className="flex gap-3">
            <Button variant="outline" onClick={reset}>
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={parseResult.valid.length === 0}
            >
              <Upload className="w-4 h-4 mr-2" />
              Import {parseResult.valid.length} Properties
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Importing */}
      {step === "importing" && (
        <Card className="p-8">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <h3 className="text-lg font-semibold">Importing Properties...</h3>
            <div className="w-full max-w-md">
              <Progress value={importProgress} className="h-2" />
              <p className="text-center text-sm text-muted-foreground mt-2">
                {importProgress}% complete
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Step 4: Done */}
      {step === "done" && importResults && (
        <div className="space-y-4">
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
              <div>
                <h3 className="text-lg font-semibold">Import Complete</h3>
                <p className="text-muted-foreground">
                  {importResults.success} of{" "}
                  {importResults.success + importResults.failed.length}{" "}
                  properties imported successfully.
                </p>
              </div>
            </div>
          </Card>

          {importResults.failed.length > 0 && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertTitle>Failed Imports</AlertTitle>
              <AlertDescription>
                <ul className="list-disc pl-4 mt-2 space-y-1">
                  {importResults.failed.map((f, i) => (
                    <li key={i}>
                      <strong>{f.slug}</strong>: {f.error}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-3">
            <Button variant="outline" onClick={reset}>
              Import More
            </Button>
            <Button asChild>
              <Link to="/admin/properties">View Properties</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
