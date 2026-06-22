import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ChevronRight } from "lucide-react";
import clsx from "clsx";
import { useContextMenu, type MenuItem } from "../store/contextMenuStore";

const ITEM_CLASS =
  "flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors";

function itemClass(item: MenuItem) {
  return clsx(
    ITEM_CLASS,
    item.disabled
      ? "cursor-default text-muted/40"
      : item.danger
        ? "text-red-400 hover:bg-red-500/10"
        : "text-text hover:bg-surface"
  );
}

function Row({ item, onClose }: { item: MenuItem; onClose: () => void }) {
  const [subOpen, setSubOpen] = useState(false);
  const hasSub = !!item.submenu && item.submenu.length > 0;

  return (
    <div
      className="relative"
      onMouseEnter={() => setSubOpen(true)}
      onMouseLeave={() => setSubOpen(false)}
    >
      <button
        disabled={item.disabled}
        onClick={() => {
          if (hasSub) return;
          item.onClick?.();
          onClose();
        }}
        className={itemClass(item)}
      >
        {item.icon && <item.icon size={16} className="shrink-0" />}
        <span className="flex-1 truncate">{item.label}</span>
        {hasSub && <ChevronRight size={14} className="shrink-0 text-muted" />}
      </button>

      {hasSub && subOpen && (
        <div className="absolute left-full top-0 z-50 ml-1 max-h-72 min-w-44 overflow-y-auto rounded-lg border border-border bg-surface-2 p-1 shadow-xl">
          {item.submenu!.map((sub, i) =>
            sub.separator ? (
              <div key={i} className="my-1 h-px bg-border" />
            ) : (
              <button
                key={i}
                disabled={sub.disabled}
                onClick={() => {
                  sub.onClick?.();
                  onClose();
                }}
                className={itemClass(sub)}
              >
                {sub.icon && <sub.icon size={16} className="shrink-0" />}
                <span className="flex-1 truncate">{sub.label}</span>
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}

export default function ContextMenu() {
  const { open, x, y, items, close } = useContextMenu();
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x, y });

  // Clamp the menu inside the viewport once its size is known.
  useLayoutEffect(() => {
    if (!open) return;
    const el = ref.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    setPos({
      x: Math.max(8, Math.min(x, window.innerWidth - width - 8)),
      y: Math.max(8, Math.min(y, window.innerHeight - height - 8)),
    });
  }, [open, x, y, items]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        onClick={close}
        onContextMenu={(e) => {
          e.preventDefault();
          close();
        }}
      />
      <div
        ref={ref}
        className="fixed z-50 min-w-52 rounded-lg border border-border bg-surface-2 p-1 shadow-xl"
        style={{ left: pos.x, top: pos.y }}
      >
        {items.map((item, i) =>
          item.separator ? (
            <div key={i} className="my-1 h-px bg-border" />
          ) : (
            <Row key={i} item={item} onClose={close} />
          )
        )}
      </div>
    </>
  );
}
