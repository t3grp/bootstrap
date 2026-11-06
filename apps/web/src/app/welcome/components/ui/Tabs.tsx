"use client";

import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";

/**
 * Tabs primitive — original Bootstrap implementation.
 *
 * Interaction contract follows the WAI-ARIA tabs pattern, as implemented by
 * the BeUI tabs reference (t3UI, components/collections/libraries/beui/vendor/
 * components/motion/tabs.tsx, pinned commit
 * 66ff17008ebf30e73e7662234e3f14660f8a5c14). No BeUI source code is copied:
 * the reference uses motion/react springs and lucide-react icons; this
 * implementation uses plain CSS transitions (160–220 ms, per the landing
 * brief's motion contract) and no icon dependency, so the public build does
 * not require private t3UI access. Keyboard behaviour mirrors the reference:
 * Left/Right (and Up/Down) move between tabs, Home/End jump to the ends,
 * and the tab strip is scrollable on narrow screens.
 */
export type TabItem = {
  id: string;
  label: string;
  panel: ReactNode;
};

export function Tabs({ items, label }: { items: TabItem[]; label: string }) {
  const [selected, setSelected] = useState(items[0]?.id ?? "");
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const select = (id: string) => setSelected(id);

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = items.length - 1;
    let next: number | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") next = index === last ? 0 : index + 1;
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = index === 0 ? last : index - 1;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = last;
    if (next === null) return;
    event.preventDefault();
    setSelected(items[next].id);
    tabRefs.current[next]?.focus();
  };

  const active = items.find((item) => item.id === selected) ?? items[0];

  return (
    <div className="tabs">
      <div className="tabs__list" role="tablist" aria-label={label}>
        {items.map((item, index) => (
          <button
            key={item.id}
            ref={(el) => {
              tabRefs.current[index] = el;
            }}
            role="tab"
            id={`tab-${item.id}`}
            aria-selected={item.id === selected}
            aria-controls={`panel-${item.id}`}
            tabIndex={item.id === selected ? 0 : -1}
            className="tabs__trigger"
            onClick={() => select(item.id)}
            onKeyDown={(event) => onKeyDown(event, index)}
          >
            {item.label}
          </button>
        ))}
      </div>
      {active ? (
        <div
          key={active.id}
          role="tabpanel"
          id={`panel-${active.id}`}
          aria-labelledby={`tab-${active.id}`}
          className="tabs__panel"
          tabIndex={0}
        >
          {active.panel}
        </div>
      ) : null}
    </div>
  );
}
