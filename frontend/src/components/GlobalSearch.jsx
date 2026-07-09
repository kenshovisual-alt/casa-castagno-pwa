import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, BookOpen, FileText, StickyNote } from "lucide-react";
import { api } from "../lib/api";
import {
  CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem,
} from "./ui/command";

export default function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [tasks, setTasks] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) return;
    api.list("bookings").then(setBookings);
    api.list("documents").then(setDocuments);
    api.list("tasks").then(setTasks);
  }, [open]);

  const go = (path) => {
    setOpen(false);
    navigate(path);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 w-full px-3 py-2 rounded-md border text-sm transition-colors"
        style={{ borderColor: "var(--cc-border)", color: "var(--cc-muted)" }}
        data-testid="global-search-trigger"
      >
        <Search size={14} />
        <span className="flex-1 text-left">Search…</span>
        <span className="text-xs opacity-60">⌘K</span>
      </button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search guests, documents, tasks…" data-testid="global-search-input" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Bookings">
            {bookings.map((b) => (
              <CommandItem
                key={b.id}
                value={`${b.guest_name} ${b.country} ${b.guest_email}`}
                onSelect={() => go(`/bookings/${b.id}`)}
                data-testid={`search-result-booking-${b.id}`}
              >
                <BookOpen /> {b.guest_name || "Blocked"} <span className="text-xs opacity-60 ml-1">{b.checkin}</span>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Documents">
            {documents.map((d) => (
              <CommandItem
                key={d.id}
                value={d.title}
                onSelect={() => go("/documents")}
                data-testid={`search-result-document-${d.id}`}
              >
                <FileText /> {d.title}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Tasks">
            {tasks.map((t) => (
              <CommandItem
                key={t.id}
                value={t.title}
                onSelect={() => go("/tasks")}
                data-testid={`search-result-task-${t.id}`}
              >
                <StickyNote /> {t.title}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
