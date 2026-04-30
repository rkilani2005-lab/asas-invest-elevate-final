import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

export interface PropertyFiltersState {
  search: string;
  location: string;
  developer: string;
  bedrooms: string;
  priceRange: string;
  category: string;
}

interface PropertyFiltersProps {
  filters: PropertyFiltersState;
  onFiltersChange: (filters: PropertyFiltersState) => void;
  locations: string[];
  developers: string[];
}

const PropertyFilters = ({
  filters,
  onFiltersChange,
  locations,
  developers,
}: PropertyFiltersProps) => {
  const { t, isRTL } = useLanguage();

  const updateFilter = (key: keyof PropertyFiltersState, value: string) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFiltersChange({
      search: "",
      location: "",
      developer: "",
      bedrooms: "",
      priceRange: "",
      category: "",
    });
  };

  const hasActiveFilters = Object.values(filters).some(v => v !== "");

  const bedroomOptions = ["Studio", "1", "2", "3", "4", "5+"];
  const priceRanges = [
    { value: "0-1000000", label: "Under AED 1M" },
    { value: "1000000-2000000", label: "AED 1M - 2M" },
    { value: "2000000-5000000", label: "AED 2M - 5M" },
    { value: "5000000-10000000", label: "AED 5M - 10M" },
    { value: "10000000+", label: "Above AED 10M" },
  ];

  return (
    <div className={cn(
      "bg-white/80 backdrop-blur-sm border border-accent/30 p-6 mb-8 shadow-card",
      isRTL && "font-arabic"
    )}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        {/* Search */}
        <div className="relative lg:col-span-2">
          <Search className={cn(
            "absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground",
            isRTL ? "end-3-3" : "start-3
          )} strokeWidth={1} />
          <Input
            placeholder={t("filters.search")}
            value={filters.search}
            onChange={(e) => updateFilter("search", e.target.value)}
            className={cn(
              "h-11 bg-white border-accent/30 rounded-none focus:border-accent text-foreground",
              isRTL ? "pe-10 text-endht" : "ps-10"
            )}
          />
        </div>

        {/* Location */}
        <Select
          value={filters.location}
          onValueChange={(value) => updateFilter("location", value === "all" ? "" : value)}
        >
          <SelectTrigger className={cn(
            "h-11 bg-white border-accent/30 rounded-none focus:border-accent text-foreground",
            isRTL && "text-endht"
          )}>
            <SelectValue placeholder={t("filters.allLocations")} />
          </SelectTrigger>
          <SelectContent className="bg-white border-accent/30">
            <SelectItem value="all">{t("filters.allLocations")}</SelectItem>
            {locations.map((location) => (
              <SelectItem key={location} value={location}>
                {location}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Developer */}
        <Select
          value={filters.developer}
          onValueChange={(value) => updateFilter("developer", value === "all" ? "" : value)}
        >
          <SelectTrigger className={cn(
            "h-11 bg-white border-accent/30 rounded-none focus:border-accent text-foreground",
            isRTL && "text-endht"
          )}>
            <SelectValue placeholder={t("filters.allDevelopers")} />
          </SelectTrigger>
          <SelectContent className="bg-white border-accent/30">
            <SelectItem value="all">{t("filters.allDevelopers")}</SelectItem>
            {developers.map((developer) => (
              <SelectItem key={developer} value={developer}>
                {developer}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Category */}
        <Select
          value={filters.category}
          onValueChange={(value) => updateFilter("category", value === "all" ? "" : value)}
        >
          <SelectTrigger className={cn(
            "h-11 bg-white border-accent/30 rounded-none focus:border-accent text-foreground",
            isRTL && "text-endht"
          )}>
            <SelectValue placeholder={t("filters.allCategories")} />
          </SelectTrigger>
          <SelectContent className="bg-white border-accent/30">
            <SelectItem value="all">{t("filters.allCategories")}</SelectItem>
            <SelectItem value="residential">{t("filters.residential")}</SelectItem>
            <SelectItem value="commercial">{t("filters.commercial")}</SelectItem>
          </SelectContent>
        </Select>

        {/* Bedrooms */}
        <Select
          value={filters.bedrooms}
          onValueChange={(value) => updateFilter("bedrooms", value === "all" ? "" : value)}
        >
          <SelectTrigger className={cn(
            "h-11 bg-white border-accent/30 rounded-none focus:border-accent text-foreground",
            isRTL && "text-endht"
          )}>
            <SelectValue placeholder={t("filters.allBedrooms")} />
          </SelectTrigger>
          <SelectContent className="bg-white border-accent/30">
            <SelectItem value="all">{t("filters.allBedrooms")}</SelectItem>
            {bedroomOptions.map((bed) => (
              <SelectItem key={bed} value={bed}>
                {bed} {bed !== "Studio" && t("property.beds")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Active Filters & Clear */}
      {hasActiveFilters && (
        <div className={cn(
          "mt-4 pt-4 border-t border-border flex items-center gap-2",
          isRTL && "flex-row-reverse"
        )}>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-muted-foreground hover:text-accent"
          >
            <X className={cn("h-4 w-4", isRTL ? "ms-1.5" : "me-1.5")} strokeWidth={1} />
            {t("buttons.clearFilters")}
          </Button>
        </div>
      )}
    </div>
  );
};

export default PropertyFilters;
