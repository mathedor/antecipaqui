"use client";

import { useEffect, useRef, useState } from "react";
import {
  type GeocodeResult,
  searchAddressSuggestions,
} from "@/lib/actions/comercial-prospects";

type Props = {
  /** Valor inicial pra mostrar (ex: endereço já escolhido). */
  initialLabel?: string;
  placeholder?: string;
  /** Callback quando user escolhe um endereço da lista OU usa geolocalização. */
  onSelect: (result: GeocodeResult) => void;
  /** Mostra botão "📍 Minha localização" (default true). */
  enableGeolocation?: boolean;
};

/** Autocomplete de endereço via Nominatim (OSM gratuito) + opção de
 *  pegar geolocalização atual do navegador. */
export function AddressAutocomplete({
  initialLabel = "",
  placeholder = "Endereço, cidade ou ponto de referência",
  onSelect,
  enableGeolocation = true,
}: Props) {
  const [query, setQuery] = useState(initialLabel);
  const [suggestions, setSuggestions] = useState<GeocodeResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Debounced search
  useEffect(() => {
    if (query.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const list = await searchAddressSuggestions(query);
        setSuggestions(list);
        setOpen(true);
      } finally {
        setLoading(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [query]);

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const pick = (r: GeocodeResult) => {
    setQuery(r.endereco);
    setOpen(false);
    onSelect(r);
  };

  const useMyLocation = () => {
    setGeoError(null);
    if (!("geolocation" in navigator)) {
      setGeoError("Navegador não suporta geolocalização");
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        // Reverse geocode pra mostrar endereço amigável
        try {
          const params = new URLSearchParams({
            lat: String(pos.coords.latitude),
            lon: String(pos.coords.longitude),
            format: "json",
            addressdetails: "1",
          });
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?${params.toString()}`,
            {
              headers: {
                "User-Agent": "Antecipaqui (mathe@diretoriow.com.br)",
              },
            },
          );
          const data = (await res.json()) as {
            display_name?: string;
            address?: {
              city?: string;
              town?: string;
              village?: string;
              state_code?: string;
              state?: string;
            };
          };
          const cidade =
            data.address?.city ??
            data.address?.town ??
            data.address?.village;
          const uf =
            data.address?.state_code ??
            data.address?.state?.slice(0, 2).toUpperCase();
          const result: GeocodeResult = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            endereco: data.display_name ?? "Minha localização atual",
            cidade,
            uf,
          };
          setQuery(result.endereco);
          onSelect(result);
        } catch {
          // Mesmo sem reverse, ainda manda lat/lng
          const result: GeocodeResult = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            endereco: `${pos.coords.latitude}, ${pos.coords.longitude}`,
          };
          setQuery("Minha localização atual");
          onSelect(result);
        } finally {
          setGeoLoading(false);
        }
      },
      (err) => {
        setGeoError(
          err.code === err.PERMISSION_DENIED
            ? "Permissão de localização negada. Habilite no navegador."
            : "Falha ao obter localização: " + err.message,
        );
        setGeoLoading(false);
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 },
    );
  };

  return (
    <div ref={wrapRef} className="relative">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => suggestions.length > 0 && setOpen(true)}
            placeholder={placeholder}
            className="w-full h-9 px-3 pr-8 rounded-lg border border-border bg-bg text-sm"
            autoComplete="off"
          />
          {loading && (
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-fg-dim">
              …
            </span>
          )}
        </div>
        {enableGeolocation && (
          <button
            type="button"
            onClick={useMyLocation}
            disabled={geoLoading}
            className="shrink-0 inline-flex items-center gap-1 h-9 px-3 rounded-lg border border-accent bg-accent-soft text-accent text-xs font-semibold hover:bg-accent hover:text-white disabled:opacity-50"
            title="Usar minha localização atual"
          >
            {geoLoading ? "…" : "📍 minha localização"}
          </button>
        )}
      </div>

      {geoError && (
        <p className="text-[10px] text-danger font-mono mt-1">{geoError}</p>
      )}

      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 mt-1 left-0 right-0 max-h-72 overflow-y-auto rounded-lg border border-border bg-bg-elev shadow-xl">
          {suggestions.map((s, i) => (
            <li key={`${s.lat}-${s.lng}-${i}`}>
              <button
                type="button"
                onClick={() => pick(s)}
                className="w-full text-left px-3 py-2 hover:bg-bg-card border-b border-border last:border-0"
              >
                <div className="text-sm text-fg leading-snug line-clamp-2">
                  {s.endereco}
                </div>
                {(s.cidade || s.uf) && (
                  <div className="text-[10px] font-mono text-fg-dim mt-0.5">
                    {s.cidade}
                    {s.uf ? ` / ${s.uf}` : ""}
                  </div>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {open &&
        !loading &&
        suggestions.length === 0 &&
        query.trim().length >= 3 && (
          <div className="absolute z-50 mt-1 left-0 right-0 rounded-lg border border-border bg-bg-elev shadow-xl px-3 py-2 text-xs text-fg-muted">
            Nenhum endereço encontrado. Tente algo mais específico.
          </div>
        )}
    </div>
  );
}
