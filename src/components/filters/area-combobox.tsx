"use client";
import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandItem,
  CommandEmpty,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import type { DictOption } from "@/lib/hh/dictionaries";

const MAX_RESULTS = 50;

export function AreaCombobox({
  areas,
  value,
  onChange,
}: {
  areas: DictOption[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = areas.find((a) => a.id === value);

  // 14k+ areas — filter in JS and render only the top matches for performance.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? areas.filter((a) => a.name.toLowerCase().includes(q))
      : areas;
    return list.slice(0, MAX_RESULTS);
  }, [areas, query]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            className="w-full justify-between font-normal"
          />
        }
      >
        <span className="flex items-center gap-2 truncate">
          <MapPin className="size-4 shrink-0 text-muted-foreground" />
          {selected ? selected.name : "Выберите регион"}
        </span>
        <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Поиск города или региона…"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandEmpty>Ничего не найдено</CommandEmpty>
            {filtered.map((a) => (
              <CommandItem
                key={a.id}
                value={a.id}
                onSelect={() => {
                  onChange(a.id);
                  setQuery("");
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    "size-4",
                    a.id === value ? "opacity-100" : "opacity-0",
                  )}
                />
                {a.name}
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
