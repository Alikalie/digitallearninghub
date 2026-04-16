import * as React from "react";
import { Check, ChevronsUpDown, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { COUNTRIES, getFlagEmoji } from "@/lib/countries";

interface CountrySelectProps {
  value?: string; // country name
  onChange: (countryName: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export function CountrySelect({
  value,
  onChange,
  placeholder = "Select your country",
  disabled,
  className,
  id,
}: CountrySelectProps) {
  const [open, setOpen] = React.useState(false);
  const selected = COUNTRIES.find((c) => c.name === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal h-10",
            !selected && "text-muted-foreground",
            className,
          )}
        >
          <span className="flex items-center gap-2 truncate">
            {selected ? (
              <>
                <span className="text-base leading-none">
                  {getFlagEmoji(selected.code)}
                </span>
                <span className="truncate">{selected.name}</span>
              </>
            ) : (
              <>
                <Globe className="h-4 w-4 opacity-50" />
                <span>{placeholder}</span>
              </>
            )}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0 z-50 bg-popover"
        align="start"
      >
        <Command>
          <CommandInput placeholder="Search country..." />
          <CommandList>
            <CommandEmpty>No country found.</CommandEmpty>
            <CommandGroup>
              {COUNTRIES.map((country) => (
                <CommandItem
                  key={country.code}
                  value={country.name}
                  onSelect={() => {
                    onChange(country.name);
                    setOpen(false);
                  }}
                  className="cursor-pointer"
                >
                  <span className="mr-2 text-base leading-none">
                    {getFlagEmoji(country.code)}
                  </span>
                  <span className="flex-1">{country.name}</span>
                  <Check
                    className={cn(
                      "ml-2 h-4 w-4",
                      value === country.name ? "opacity-100" : "opacity-0",
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
