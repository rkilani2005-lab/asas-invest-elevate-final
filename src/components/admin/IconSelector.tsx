import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { icons, LucideIcon } from "lucide-react";

interface IconSelectorProps {
  value: string;
  onChange: (icon: string) => void;
}

const popularIcons = [
  "star",
  "heart",
  "shield-check",
  "award",
  "trophy",
  "gem",
  "crown",
  "sparkles",
  "zap",
  "target",
  "compass",
  "map-pin",
  "home",
  "building-2",
  "landmark",
  "key",
  "lock",
  "eye",
  "search",
  "check-circle",
  "users",
  "user-check",
  "briefcase",
  "trending-up",
  "bar-chart",
  "pie-chart",
  "wallet",
  "credit-card",
  "banknote",
  "calculator",
  "clock",
  "calendar",
  "globe",
  "phone",
  "mail",
  "message-circle",
  "headphones",
  "settings",
  "sliders",
  "layers",
  "grid",
  "layout",
  "maximize",
  "sun",
  "moon",
  "cloud",
  "umbrella",
  "waves",
  "mountain",
  "tree",
];

export default function IconSelector({ value, onChange }: IconSelectorProps) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const filteredIcons = search
    ? popularIcons.filter((name) => name.includes(search.toLowerCase()))
    : popularIcons;

  const getIconComponent = (name: string): LucideIcon | null => {
    const pascalName = name
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join("");
    return (icons as Record<string, LucideIcon>)[pascalName] || null;
  };

  const SelectedIcon = getIconComponent(value);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-start gap-2">
          {SelectedIcon && <SelectedIcon className="h-4 w-4" />}
          <span className="text-xs truncate">{value || "Select"}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <Input
          placeholder="Search icons..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-2"
        />
        <ScrollArea className="h-48">
          <div className="grid grid-cols-6 gap-1">
            {filteredIcons.map((iconName) => {
              const IconComponent = getIconComponent(iconName);
              if (!IconComponent) return null;
              return (
                <Button
                  key={iconName}
                  variant={value === iconName ? "secondary" : "ghost"}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    onChange(iconName);
                    setIsOpen(false);
                  }}
                  title={iconName}
                >
                  <IconComponent className="h-4 w-4" />
                </Button>
              );
            })}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
