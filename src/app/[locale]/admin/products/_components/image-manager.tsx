"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Loader2, Trash2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useDictionary } from "@/i18n/provider";

const MAX_IMAGES = 8;
const MAX_BYTES = 4 * 1024 * 1024;
const ACCEPTED = new Set(["image/jpeg", "image/png", "image/webp"]);

export type ImageManagerItem = {
  id: string;
  url: string;
  altEn: string | null;
  altSw: string | null;
};

export function ImageManager({
  productId,
  initialImages,
}: {
  productId: string;
  initialImages: ImageManagerItem[];
}) {
  const dict = useDictionary();
  const t = dict.admin.products.images;

  const [items, setItems] = useState<ImageManagerItem[]>(initialImages);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  function flash(kind: "ok" | "err", text: string) {
    setMessage({ kind, text });
    window.setTimeout(() => setMessage(null), 3000);
  }

  async function onUpload(file: File) {
    if (file.size > MAX_BYTES) return flash("err", t.toast.tooBig);
    if (!ACCEPTED.has(file.type)) return flash("err", t.toast.badType);
    if (items.length >= MAX_IMAGES) {
      return flash("err", t.toast.limit.replace("{max}", String(MAX_IMAGES)));
    }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/admin/products/${productId}/images`, {
        method: "POST",
        body: fd,
      });
      const body = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        image?: { id: string; url: string };
        error?: string;
      };
      if (!res.ok || !body.ok || !body.image) {
        return flash(
          "err",
          body.error === "image_limit"
            ? t.toast.limit.replace("{max}", String(MAX_IMAGES))
            : t.toast.error,
        );
      }
      setItems((prev) => [
        ...prev,
        { id: body.image!.id, url: body.image!.url, altEn: null, altSw: null },
      ]);
      flash("ok", t.toast.uploaded);
    } finally {
      setUploading(false);
    }
  }

  async function onDelete(id: string) {
    if (!window.confirm(t.confirmDelete)) return;
    const snapshot = items;
    setItems((prev) => prev.filter((i) => i.id !== id));
    const res = await fetch(`/api/admin/products/${productId}/images/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      setItems(snapshot);
      return flash("err", t.toast.error);
    }
    flash("ok", t.toast.removed);
  }

  async function saveAlt(id: string, altEn: string | null, altSw: string | null) {
    const res = await fetch(`/api/admin/products/${productId}/images/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alt_en: altEn, alt_sw: altSw }),
    });
    if (res.ok) flash("ok", t.toast.altSaved);
    else flash("err", t.toast.error);
  }

  async function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = items.findIndex((i) => i.id === active.id);
    const newIdx = items.findIndex((i) => i.id === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    const next = arrayMove(items, oldIdx, newIdx);
    const snapshot = items;
    setItems(next);
    startTransition(() => {
      void (async () => {
        const res = await fetch(`/api/admin/products/${productId}/images`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order: next.map((i) => i.id) }),
        });
        if (!res.ok) {
          setItems(snapshot);
          flash("err", t.toast.error);
        } else {
          flash("ok", t.toast.reordered);
        }
      })();
    });
  }

  return (
    <section className="rounded-3xl border border-border/60 bg-card p-6 sm:p-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            {t.heading}
          </h2>
          <p className="mt-1 text-[12px] text-muted-foreground">
            {t.hint.replace("{max}", String(MAX_IMAGES))}
          </p>
        </div>
        <div>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onUpload(f);
              e.target.value = "";
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={() => fileRef.current?.click()}
            disabled={uploading || items.length >= MAX_IMAGES}
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t.uploading}
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                {t.upload}
              </>
            )}
          </Button>
        </div>
      </div>

      {message ? (
        <p
          className={`mt-3 text-[12px] ${
            message.kind === "ok" ? "text-emerald-400" : "text-destructive"
          }`}
        >
          {message.text}
        </p>
      ) : null}

      {items.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-border/60 p-10 text-center text-[13px] text-muted-foreground">
          {t.empty}
        </p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={items.map((i) => i.id)} strategy={rectSortingStrategy}>
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => (
                <ImageTile
                  key={item.id}
                  item={item}
                  onDelete={() => onDelete(item.id)}
                  onSaveAlt={(en, sw) => saveAlt(item.id, en, sw)}
                  labels={{
                    altEn: t.altEn,
                    altSw: t.altSw,
                    save: t.save,
                    delete: t.delete,
                  }}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </section>
  );
}

function ImageTile({
  item,
  onDelete,
  onSaveAlt,
  labels,
}: {
  item: ImageManagerItem;
  onDelete: () => void;
  onSaveAlt: (altEn: string | null, altSw: string | null) => void;
  labels: { altEn: string; altSw: string; save: string; delete: string };
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });
  const [altEn, setAltEn] = useState(item.altEn ?? "");
  const [altSw, setAltSw] = useState(item.altSw ?? "");
  const dirty = altEn !== (item.altEn ?? "") || altSw !== (item.altSw ?? "");

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex flex-col gap-3 overflow-hidden rounded-2xl border border-border/60 bg-background/40 p-3"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-black/20">
        <Image src={item.url} alt={altEn || ""} fill sizes="300px" className="object-cover" />
        <button
          type="button"
          className="absolute left-2 top-2 inline-flex h-8 w-8 cursor-grab items-center justify-center rounded-full bg-background/80 text-muted-foreground hover:text-foreground"
          aria-label="Drag to reorder"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-background/80 text-rose-300 hover:bg-rose-500/20"
          aria-label={labels.delete}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      <div className="flex flex-col gap-2">
        <input
          value={altEn}
          onChange={(e) => setAltEn(e.target.value)}
          onBlur={() => {
            if (dirty) onSaveAlt(altEn || null, altSw || null);
          }}
          maxLength={160}
          placeholder={labels.altEn}
          className="rounded-full border border-border/60 bg-background/40 px-3 py-1.5 text-[12px] outline-none transition-colors focus:border-foreground/40"
        />
        <input
          value={altSw}
          onChange={(e) => setAltSw(e.target.value)}
          onBlur={() => {
            if (dirty) onSaveAlt(altEn || null, altSw || null);
          }}
          maxLength={160}
          placeholder={labels.altSw}
          className="rounded-full border border-border/60 bg-background/40 px-3 py-1.5 text-[12px] outline-none transition-colors focus:border-foreground/40"
        />
      </div>
    </div>
  );
}
