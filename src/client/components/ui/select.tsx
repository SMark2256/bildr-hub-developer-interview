import * as Select from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";

export function SelectField({
  id,
  value,
  onValueChange,
  options,
  placeholder = "Válassz",
  disabled = false,
  ariaLabel,
}: {
  id?: string;
  value: string;
  onValueChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  disabled?: boolean;
  ariaLabel: string;
}) {
  return (
    <Select.Root
      value={value || undefined}
      onValueChange={onValueChange}
      disabled={disabled}
    >
      <Select.Trigger id={id} className="select-trigger" aria-label={ariaLabel}>
        <Select.Value placeholder={placeholder} />
        <Select.Icon className="select-icon">
          <ChevronDown size={16} aria-hidden="true" />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          className="select-content"
          position="popper"
          sideOffset={4}
        >
          <Select.Viewport>
            {options.map((option) => (
              <Select.Item
                key={option.value}
                className="select-item"
                value={option.value}
              >
                <Select.ItemText>{option.label}</Select.ItemText>
                <Select.ItemIndicator>
                  <Check size={14} aria-hidden="true" />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
