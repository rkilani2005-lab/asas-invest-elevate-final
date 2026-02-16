import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import type { PropertyData, PropertyType, PropertyCategory } from "../types";

interface GeneralInfoStepProps {
  data: PropertyData;
  onChange: (updates: Partial<PropertyData>) => void;
}

const unitTypeOptions = [
  "Studio", "1 Bedroom", "2 Bedrooms", "3 Bedrooms", "4 Bedrooms",
  "5+ Bedrooms", "Penthouse", "Townhouse", "Villa", "Duplex",
];

export default function GeneralInfoStep({ data, onChange }: GeneralInfoStepProps) {
  function generateSlug(title: string) {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  }

  function handleNameChange(value: string) {
    onChange({ name_en: value, slug: data.slug || generateSlug(value) });
  }

  function toggleUnitType(unitType: string) {
    const newTypes = data.unit_types.includes(unitType)
      ? data.unit_types.filter((t) => t !== unitType)
      : [...data.unit_types, unitType];
    onChange({ unit_types: newTypes });
  }

  const isCommercial = data.category === "commercial";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Property Identity</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name_en">Property Name (English) *</Label>
              <Input id="name_en" value={data.name_en} onChange={(e) => handleNameChange(e.target.value)} placeholder="e.g., Marina Heights Tower" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name_ar">Property Name (Arabic)</Label>
              <Input id="name_ar" value={data.name_ar} onChange={(e) => onChange({ name_ar: e.target.value })} placeholder="اسم العقار" dir="rtl" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">URL Slug *</Label>
            <Input id="slug" value={data.slug} onChange={(e) => onChange({ slug: e.target.value })} placeholder="marina-heights-tower" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tagline_en">Tagline (English)</Label>
              <Input id="tagline_en" value={data.tagline_en} onChange={(e) => onChange({ tagline_en: e.target.value })} placeholder="Luxury Living Redefined" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tagline_ar">Tagline (Arabic)</Label>
              <Input id="tagline_ar" value={data.tagline_ar} onChange={(e) => onChange({ tagline_ar: e.target.value })} placeholder="الشعار" dir="rtl" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Location & Developer</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="location_en">Location (English)</Label>
              <Input id="location_en" value={data.location_en} onChange={(e) => onChange({ location_en: e.target.value })} placeholder="Dubai Marina, Dubai" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location_ar">Location (Arabic)</Label>
              <Input id="location_ar" value={data.location_ar} onChange={(e) => onChange({ location_ar: e.target.value })} placeholder="الموقع" dir="rtl" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="developer_en">Developer (English)</Label>
              <Input id="developer_en" value={data.developer_en} onChange={(e) => onChange({ developer_en: e.target.value })} placeholder="Emaar Properties" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="developer_ar">Developer (Arabic)</Label>
              <Input id="developer_ar" value={data.developer_ar} onChange={(e) => onChange({ developer_ar: e.target.value })} placeholder="المطور" dir="rtl" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Property Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Property Type *</Label>
              <Select value={data.type} onValueChange={(value: PropertyType) => onChange({ type: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="off-plan">Off-Plan</SelectItem>
                  <SelectItem value="ready">Ready</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Category *</Label>
              <Select value={data.category} onValueChange={(value: PropertyCategory) => onChange({ category: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="residential">Residential</SelectItem>
                  <SelectItem value="commercial">Commercial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Ownership Type</Label>
              <Select value={data.ownership_type} onValueChange={(value) => onChange({ ownership_type: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="freehold">Freehold</SelectItem>
                  <SelectItem value="leasehold">Leasehold</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price_range">Price Range</Label>
              <Input id="price_range" value={data.price_range} onChange={(e) => onChange({ price_range: e.target.value })} placeholder="AED 1.2M - 3.5M" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="size_range">Size Range</Label>
              <Input id="size_range" value={data.size_range} onChange={(e) => onChange({ size_range: e.target.value })} placeholder="800 - 2,500 sqft" />
            </div>
          </div>

          {data.type === "off-plan" && (
            <div className="space-y-2">
              <Label htmlFor="handover_date">Expected Handover</Label>
              <Input id="handover_date" type="date" value={data.handover_date} onChange={(e) => onChange({ handover_date: e.target.value })} />
            </div>
          )}

          <div className="space-y-2">
            <Label>Unit Types Available</Label>
            <div className="grid grid-cols-3 gap-2 pt-2">
              {unitTypeOptions.map((unitType) => (
                <div key={unitType} className="flex items-center space-x-2">
                  <Checkbox id={`unit-${unitType}`} checked={data.unit_types.includes(unitType)} onCheckedChange={() => toggleUnitType(unitType)} />
                  <label htmlFor={`unit-${unitType}`} className="text-sm cursor-pointer">{unitType}</label>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Commercial Fields */}
      {isCommercial && (
        <Card>
          <CardHeader><CardTitle>Commercial Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Office Type</Label>
                <Select value={data.office_type || ""} onValueChange={(v) => onChange({ office_type: v })}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="office">Office</SelectItem>
                    <SelectItem value="retail">Retail</SelectItem>
                    <SelectItem value="warehouse">Warehouse</SelectItem>
                    <SelectItem value="full_floor">Full Floor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>License Type</Label>
                <Select value={data.license_type || ""} onValueChange={(v) => onChange({ license_type: v })}>
                  <SelectTrigger><SelectValue placeholder="Select license" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="freezone">Free Zone</SelectItem>
                    <SelectItem value="ded_mainland">DED Mainland</SelectItem>
                    <SelectItem value="difc">DIFC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fit-Out Status</Label>
                <Select value={data.fit_out_status || ""} onValueChange={(v) => onChange({ fit_out_status: v })}>
                  <SelectTrigger><SelectValue placeholder="Select condition" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="shell_core">Shell & Core</SelectItem>
                    <SelectItem value="fitted">Fitted</SelectItem>
                    <SelectItem value="furnished">Furnished</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tenancy Status</Label>
                <Select value={data.tenancy_status || ""} onValueChange={(v) => onChange({ tenancy_status: v })}>
                  <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vacant">Vacant</SelectItem>
                    <SelectItem value="tenanted">Tenanted</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Power Load (kW)</Label>
                <Input value={data.power_load_kw || ""} onChange={(e) => onChange({ power_load_kw: e.target.value })} placeholder="e.g., 50" />
              </div>
              <div className="space-y-2">
                <Label>Parking Spaces</Label>
                <Input type="number" value={data.parking_spaces || ""} onChange={(e) => onChange({ parking_spaces: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Parking Ratio</Label>
                <Input value={data.parking_ratio || ""} onChange={(e) => onChange({ parking_ratio: e.target.value })} placeholder="e.g., 1:500 sqft" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Projected ROI</Label>
                <Input value={data.projected_roi || ""} onChange={(e) => onChange({ projected_roi: e.target.value })} placeholder="e.g., 7.2%" />
              </div>
              <div className="space-y-2">
                <Label>Service Charges</Label>
                <Input value={data.service_charges || ""} onChange={(e) => onChange({ service_charges: e.target.value })} placeholder="e.g., AED 18/sqft" />
              </div>
              <div className="space-y-2">
                <Label>Washroom Type</Label>
                <Select value={data.washroom_type || ""} onValueChange={(v) => onChange({ washroom_type: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">Private</SelectItem>
                    <SelectItem value="shared">Shared</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Switch checked={data.pantry_available || false} onCheckedChange={(v) => onChange({ pantry_available: v })} />
              <Label>Pantry Available</Label>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
