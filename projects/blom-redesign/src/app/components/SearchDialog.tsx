import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Search, X, CornerDownLeft } from "lucide-react";
import { search, type SearchResult } from "../lib/catalog";

const KIND_STYLE: Record<SearchResult["kind"], string> = {
  Product: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  Page: "bg-stone-100 text-stone-700 dark:bg-stone-700 dark:text-stone-300",
  Event: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  Location: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
};

// The study found people looking for these four things in four different
// places. Offering them up front is cheaper than making anyone guess the words.
const SUGGESTIONS = ["aperitivo", "where to buy", "hours", "book an event"];

export default function SearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const results = useMemo(() => search(query).slice(0, 8), [query]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActive(0);
    // A tick, because the input is not in the document until this paints.
    const id = setTimeout(() => inputRef.current?.focus(), 10);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      clearTimeout(id);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => setActive(0), [query]);

  if (!open) return null;

  const go = (result: SearchResult) => {
    navigate(result.path);
    onClose();
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") return onClose();
    if (results.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((i) => (i + 1) % results.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => (i - 1 + results.length) % results.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      go(results[active]);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center pt-[10vh] px-4" role="dialog" aria-modal="true" aria-label="Search">
      <button className="absolute inset-0 bg-black/50" onClick={onClose} tabIndex={-1} aria-label="Close search" />

      <div className="relative w-full max-w-xl bg-white dark:bg-gray-900 rounded-lg shadow-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-4 border-b border-gray-200 dark:border-gray-700">
          <Search className="w-5 h-5 text-gray-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search products, pages, events…"
            className="flex-1 py-4 bg-transparent text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none"
            aria-label="Search Bløm"
            aria-autocomplete="list"
            aria-controls="blom-search-results"
          />
          <button onClick={onClose} className="p-2 -mr-2 text-gray-400 hover:text-gray-900 dark:hover:text-white" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="max-h-[55vh] overflow-y-auto">
          {query.trim() === "" ? (
            <div className="p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
                Try
              </p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setQuery(suggestion)}
                    className="px-3 py-1.5 rounded-full text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : results.length === 0 ? (
            <p className="p-6 text-center text-gray-500 dark:text-gray-400">
              Nothing matches “{query}”. Try “aperitivo”, “hours” or “where to buy”.
            </p>
          ) : (
            <ul id="blom-search-results" role="listbox">
              {results.map((result, index) => (
                <li key={`${result.kind}-${result.title}`} role="option" aria-selected={index === active}>
                  <button
                    onMouseEnter={() => setActive(index)}
                    onClick={() => go(result)}
                    className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors ${
                      index === active ? "bg-orange-50 dark:bg-orange-900/20" : ""
                    }`}
                  >
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold flex-shrink-0 mt-0.5 ${KIND_STYLE[result.kind]}`}>
                      {result.kind}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-gray-900 dark:text-white">{result.title}</span>
                      <span className="block text-sm text-gray-600 dark:text-gray-400 truncate">{result.detail}</span>
                    </span>
                    {index === active && <CornerDownLeft className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" />}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="px-4 py-2.5 border-t border-gray-200 dark:border-gray-700 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
          <span>↑↓ to move</span>
          <span>↵ to open</span>
          <span>esc to close</span>
        </div>
      </div>
    </div>
  );
}
