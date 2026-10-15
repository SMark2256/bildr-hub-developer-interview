import * as Tabs from "@radix-ui/react-tabs";
import {
  selectionControlClassName,
  selectionGroupClassName,
} from "./selection-control-styles";

export function ViewTabs({
  value,
  onValueChange,
}: {
  value: "list" | "board";
  onValueChange: (value: "list" | "board") => void;
}) {
  return (
    <Tabs.Root
      value={value}
      onValueChange={(next) =>
        onValueChange(next === "board" ? "board" : "list")
      }
    >
      <Tabs.List className={selectionGroupClassName} aria-label="Feladatok nézete">
        <Tabs.Trigger
          className={`${selectionControlClassName} data-[state=active]:border-b-primary`}
          value="list"
        >
          Lista
        </Tabs.Trigger>
        <Tabs.Trigger
          className={`${selectionControlClassName} data-[state=active]:border-b-primary`}
          value="board"
        >
          Tábla
        </Tabs.Trigger>
      </Tabs.List>
    </Tabs.Root>
  );
}
