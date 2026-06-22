import { useState } from "react";
import { Music2 } from "lucide-react";
import clsx from "clsx";
import { usePlayer } from "../store/playerStore";
import { useUi } from "../store/uiStore";
import { openContextMenu } from "../store/contextMenuStore";
import { buildSongMenu } from "../lib/menus";

/**
 * The current play queue: the playing track is highlighted, rows can be
 * clicked to jump and dragged to reorder. Used both in the Now Playing view
 * and the queue popover in the player bar.
 */
export default function QueueList() {
  const queue = usePlayer((s) => s.queue);
  const index = usePlayer((s) => s.index);
  const jumpTo = usePlayer((s) => s.jumpTo);
  const moveInQueue = usePlayer((s) => s.moveInQueue);
  const setDraggingSong = useUi((s) => s.setDraggingSong);

  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);

  if (queue.length === 0) {
    return <p className="px-3 py-6 text-center text-sm text-muted">La cola está vacía.</p>;
  }

  return (
    <ul className="p-2">
      {queue.map((s, i) => (
        <li
          key={`${s.id}-${i}`}
          draggable
          onDragStart={(e) => {
            setDragIdx(i);
            setDraggingSong(s);
            // copyMove so it can both reorder (move) and drop onto a playlist (copy).
            e.dataTransfer.effectAllowed = "copyMove";
          }}
          onDragOver={(e) => {
            e.preventDefault();
            if (overIdx !== i) setOverIdx(i);
          }}
          onDrop={(e) => {
            e.preventDefault();
            if (dragIdx !== null && dragIdx !== i) moveInQueue(dragIdx, i);
            setDragIdx(null);
            setOverIdx(null);
          }}
          onDragEnd={() => {
            setDragIdx(null);
            setOverIdx(null);
            setDraggingSong(null);
          }}
          onClick={() => jumpTo(i)}
          onContextMenu={(e) => openContextMenu(e, buildSongMenu(s, { queueIndex: i }))}
          className={clsx(
            "flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-surface-2",
            i === index && "bg-surface-2",
            dragIdx === i && "opacity-40",
            overIdx === i && dragIdx !== i && "ring-1 ring-accent"
          )}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded bg-surface-2">
            {s.thumbnail ? (
              <img
                src={s.thumbnail}
                alt=""
                draggable={false}
                className="h-full w-full object-cover"
              />
            ) : (
              <Music2 size={16} className="text-muted" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className={clsx("truncate text-sm", i === index && "text-accent")}>
              {s.title}
            </div>
            <div className="truncate text-xs text-muted">{s.artist}</div>
          </div>
        </li>
      ))}
    </ul>
  );
}
