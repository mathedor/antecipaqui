"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  addProspectPontoManual,
  buscarGooglePlacesPorCoords,
  deleteProspectPonto,
  type GooglePlaceItem,
  promoverPontoParaLead,
  saveProspectPontoFromGoogle,
  updateProspectPontoStatus,
} from "@/lib/actions/comercial-prospects";
import type { ComercialProspectPonto } from "@/db/schema";

// Importa MapContainer dinamicamente pra evitar SSR (leaflet quebra no servidor)
const MapContainer = dynamic(
  () => import("react-leaflet").then((m) => m.MapContainer),
  { ssr: false },
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((m) => m.TileLayer),
  { ssr: false },
);
const Marker = dynamic(
  () => import("react-leaflet").then((m) => m.Marker),
  { ssr: false },
);
const Popup = dynamic(
  () => import("react-leaflet").then((m) => m.Popup),
  { ssr: false },
);
const Circle = dynamic(
  () => import("react-leaflet").then((m) => m.Circle),
  { ssr: false },
);

const SITE_URL =
  typeof window !== "undefined" ? window.location.origin : "";

const STATUS_LABEL: Record<string, string> = {
  novo: "Novo",
  contactado: "Contactado",
  reuniao_agendada: "Reunião agendada",
  descartado: "Descartado",
  virou_lead: "Virou lead",
};

const STATUS_COLOR: Record<string, string> = {
  novo: "#3b82f6",
  contactado: "#f59e0b",
  reuniao_agendada: "#8b5cf6",
  descartado: "#94a3b8",
  virou_lead: "#16a34a",
};

function makeIcon(color: string, label = "") {
  const html = `<div style="
    background:${color};
    width:28px;height:28px;border-radius:50% 50% 50% 0;
    transform: rotate(-45deg);
    border:2px solid white;
    box-shadow:0 2px 6px rgba(0,0,0,.3);
    display:flex;align-items:center;justify-content:center;
  "><span style="transform: rotate(45deg);color:white;font-size:12px;font-weight:bold;">${label}</span></div>`;
  return L.divIcon({
    className: "",
    html,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28],
  });
}

function pontoMarkerColor(p: ComercialProspectPonto): string {
  if (p.imobiliariaId || p.construtoraId) return "#dc2626"; // já cliente AQ
  return STATUS_COLOR[p.status] ?? "#3b82f6";
}

export function ProspectsMap({
  initialPontos,
  googlePlacesEnabled,
}: {
  initialPontos: ComercialProspectPonto[];
  googlePlacesEnabled: boolean;
}) {
  const router = useRouter();
  const [pontos] = useState(initialPontos);
  const [selectedPonto, setSelectedPonto] =
    useState<ComercialProspectPonto | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  // Default center: média dos pontos do comercial OU São Paulo
  const center: [number, number] = useMemo(() => {
    if (pontos.length > 0 && pontos[0].lat && pontos[0].lng) {
      const lat =
        pontos.reduce((s, p) => s + parseFloat(p.lat ?? "0"), 0) /
        pontos.length;
      const lng =
        pontos.reduce((s, p) => s + parseFloat(p.lng ?? "0"), 0) /
        pontos.length;
      return [lat, lng];
    }
    return [-23.5505, -46.6333];
  }, [pontos]);

  const counts = useMemo(() => {
    const c = { total: pontos.length, novos: 0, contactados: 0, leads: 0, clientes: 0 };
    for (const p of pontos) {
      if (p.imobiliariaId || p.construtoraId) c.clientes++;
      else if (p.status === "virou_lead") c.leads++;
      else if (p.status === "contactado" || p.status === "reuniao_agendada")
        c.contactados++;
      else c.novos++;
    }
    return c;
  }, [pontos]);

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <Kpi label="Total" value={counts.total} color="text-fg" />
        <Kpi label="Novos" value={counts.novos} color="text-accent" />
        <Kpi label="Contactados" value={counts.contactados} color="text-warn" />
        <Kpi label="Viraram lead" value={counts.leads} color="text-success" />
        <Kpi label="Já são cliente" value={counts.clientes} color="text-danger" />
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowAddForm((v) => !v)}
            className="btn-primary !h-10 !px-4 text-sm"
          >
            + Adicionar manual
          </button>
          <button
            type="button"
            onClick={() => setShowSearch((v) => !v)}
            disabled={!googlePlacesEnabled}
            className="inline-flex items-center gap-1 h-10 px-4 rounded-lg border border-accent bg-accent-soft text-accent text-sm font-semibold hover:bg-accent hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            title={
              !googlePlacesEnabled
                ? "Requer GOOGLE_PLACES_API_KEY no env"
                : ""
            }
          >
            🔍 Buscar via Google Places
          </button>
        </div>
        <div className="flex gap-3 text-[10px] font-mono text-fg-dim items-center">
          <LegendDot color="#3b82f6" label="novo" />
          <LegendDot color="#f59e0b" label="contactado" />
          <LegendDot color="#16a34a" label="virou lead" />
          <LegendDot color="#dc2626" label="já cliente" />
        </div>
      </div>

      {showAddForm && (
        <AddManualForm onClose={() => setShowAddForm(false)} />
      )}

      {showSearch && googlePlacesEnabled && (
        <GooglePlacesSearch
          defaultLat={center[0]}
          defaultLng={center[1]}
          onClose={() => setShowSearch(false)}
        />
      )}

      {/* Mapa */}
      <div className="rounded-2xl border border-border overflow-hidden h-[500px]">
        <MapContainer
          center={center}
          zoom={pontos.length > 0 ? 12 : 11}
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          {pontos.map((p) => {
            const lat = parseFloat(p.lat ?? "0");
            const lng = parseFloat(p.lng ?? "0");
            if (!lat || !lng) return null;
            return (
              <Marker
                key={p.id}
                position={[lat, lng]}
                icon={makeIcon(
                  pontoMarkerColor(p),
                  p.categoria === "construtora" ? "C" : "I",
                )}
                eventHandlers={{
                  click: () => setSelectedPonto(p),
                }}
              >
                <Popup>
                  <PopupContent
                    ponto={p}
                    onDone={() => {
                      router.refresh();
                      setSelectedPonto(null);
                    }}
                  />
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      {pontos.length === 0 && (
        <p className="text-center text-sm text-fg-muted">
          Sem pontos no mapa ainda. Use os botões acima pra adicionar.
        </p>
      )}
    </div>
  );
}

function Kpi({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-bg-elev px-3 py-2">
      <div className="font-mono text-[9px] uppercase tracking-wider text-fg-dim mb-0.5">
        {label}
      </div>
      <div className={`font-mono tabular text-xl font-bold ${color}`}>
        {value}
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span
        className="size-2.5 rounded-full inline-block"
        style={{ background: color }}
      />
      {label}
    </span>
  );
}

function PopupContent({
  ponto,
  onDone,
}: {
  ponto: ComercialProspectPonto;
  onDone: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const isCliente = !!(ponto.imobiliariaId || ponto.construtoraId);

  const msgImob = `Oi! Sou da Antecipaqui — plataforma de antecipação de comissão imobiliária. Estamos olhando o mercado da sua região e queria te convidar pra conhecer. Pode dar uma olhada em ${SITE_URL}/apresentacao/imobiliaria? Se fizer sentido, podemos marcar uma conversa de 15 min.`;
  const msgConstr = `Oi! Sou da Antecipaqui. Trabalhamos com antecipação de comissão de corretores que vendem imóveis da sua construtora — ajuda a girar o time comercial. Quer dar uma olhada em ${SITE_URL}/apresentacao/construtora? Posso explicar em 15 min como funciona.`;
  const msg = ponto.categoria === "construtora" ? msgConstr : msgImob;

  const waUrl = ponto.telefone
    ? `https://wa.me/${(ponto.telefone.startsWith("55") ? ponto.telefone : "55" + ponto.telefone).replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`
    : null;
  const mailtoUrl = ponto.email
    ? `mailto:${ponto.email}?subject=${encodeURIComponent("Antecipaqui — apresentação")}&body=${encodeURIComponent(msg)}`
    : null;

  return (
    <div style={{ minWidth: 240 }} className="space-y-2 text-sm">
      <div>
        <div className="font-bold text-fg">{ponto.nome}</div>
        <div className="text-[11px] text-fg-muted">
          {ponto.categoria === "imobiliaria" ? "Imobiliária" : "Construtora"}
        </div>
      </div>
      {ponto.endereco && (
        <div className="text-[11px] text-fg-muted">{ponto.endereco}</div>
      )}
      {isCliente && (
        <div className="rounded bg-red-50 border border-red-200 px-2 py-1 text-[11px] text-red-700">
          ⚠️ Já é cliente AQ — não prospectar
        </div>
      )}
      {ponto.telefone && (
        <div className="text-[11px] text-fg">
          📱 <span className="font-mono">{ponto.telefone}</span>
        </div>
      )}
      {ponto.email && (
        <div className="text-[11px] text-fg">
          ✉ <span className="font-mono">{ponto.email}</span>
        </div>
      )}
      {!isCliente && (
        <>
          <div className="flex flex-wrap gap-1.5 pt-2">
            {waUrl && (
              <a
                href={waUrl}
                target="_blank"
                rel="noopener"
                className="inline-flex items-center gap-1 h-7 px-2 rounded text-[11px] bg-green-600 text-white hover:bg-green-700 no-underline"
              >
                💬 WhatsApp
              </a>
            )}
            {mailtoUrl && (
              <a
                href={mailtoUrl}
                className="inline-flex items-center gap-1 h-7 px-2 rounded text-[11px] bg-blue-600 text-white hover:bg-blue-700 no-underline"
              >
                ✉ Email
              </a>
            )}
            <button
              type="button"
              onClick={() =>
                startTransition(async () => {
                  await updateProspectPontoStatus({
                    id: ponto.id,
                    status: "contactado",
                  });
                  onDone();
                })
              }
              disabled={pending}
              className="inline-flex items-center gap-1 h-7 px-2 rounded text-[11px] border border-gray-300 hover:bg-gray-100"
            >
              ✓ Marcar contactado
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() =>
                startTransition(async () => {
                  await promoverPontoParaLead({ pontoId: ponto.id });
                  onDone();
                })
              }
              disabled={pending || ponto.status === "virou_lead"}
              className="inline-flex items-center gap-1 h-7 px-2 rounded text-[11px] bg-accent text-white hover:bg-accent-dark disabled:opacity-50"
            >
              → Promover pra lead
            </button>
            <button
              type="button"
              onClick={() => {
                if (!confirm(`Remover "${ponto.nome}" do mapa?`)) return;
                startTransition(async () => {
                  await deleteProspectPonto(ponto.id);
                  onDone();
                });
              }}
              disabled={pending}
              className="inline-flex items-center gap-1 h-7 px-2 rounded text-[11px] border border-red-300 text-red-700 hover:bg-red-50"
            >
              ✕
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function AddManualForm({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [categoria, setCategoria] = useState<"imobiliaria" | "construtora">(
    "imobiliaria",
  );
  const [endereco, setEndereco] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");

  return (
    <section className="rounded-2xl border border-border bg-bg-elev p-4 md:p-5 space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="font-bold text-sm">Adicionar manualmente</h3>
        <button
          type="button"
          onClick={onClose}
          className="text-fg-muted text-xs hover:text-fg"
        >
          ✕
        </button>
      </div>
      <div className="grid sm:grid-cols-2 gap-2">
        <input
          type="text"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Nome da empresa *"
          className="h-9 px-3 rounded-lg border border-border bg-bg text-sm"
        />
        <select
          value={categoria}
          onChange={(e) =>
            setCategoria(e.target.value as "imobiliaria" | "construtora")
          }
          className="h-9 px-3 rounded-lg border border-border bg-bg text-sm"
        >
          <option value="imobiliaria">Imobiliária</option>
          <option value="construtora">Construtora</option>
        </select>
        <input
          type="text"
          value={endereco}
          onChange={(e) => setEndereco(e.target.value)}
          placeholder="Endereço (rua, número, cidade) *"
          className="h-9 px-3 rounded-lg border border-border bg-bg text-sm sm:col-span-2"
        />
        <input
          type="tel"
          value={telefone}
          onChange={(e) => setTelefone(e.target.value)}
          placeholder="Telefone com DDD"
          className="h-9 px-3 rounded-lg border border-border bg-bg text-sm"
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="h-9 px-3 rounded-lg border border-border bg-bg text-sm"
        />
      </div>
      {error && (
        <p className="text-xs text-danger font-semibold">{error}</p>
      )}
      <button
        type="button"
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const r = await addProspectPontoManual({
              nome,
              categoria,
              endereco,
              telefone,
              email,
            });
            if (!r.ok) setError(r.error ?? "Erro");
            else {
              setNome("");
              setEndereco("");
              setTelefone("");
              setEmail("");
              router.refresh();
              onClose();
            }
          });
        }}
        disabled={pending}
        className="btn-primary !h-9 !px-4 text-xs disabled:opacity-50"
      >
        {pending ? "salvando…" : "Adicionar ao mapa"}
      </button>
    </section>
  );
}

function GooglePlacesSearch({
  defaultLat,
  defaultLng,
  onClose,
}: {
  defaultLat: number;
  defaultLng: number;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<GooglePlaceItem[] | null>(null);
  const [lat, setLat] = useState(defaultLat);
  const [lng, setLng] = useState(defaultLng);
  const [radius, setRadius] = useState(2000);
  const [categoria, setCategoria] = useState<"imobiliaria" | "construtora">(
    "imobiliaria",
  );

  const search = () => {
    setError(null);
    startTransition(async () => {
      const r = await buscarGooglePlacesPorCoords({
        lat,
        lng,
        radius,
        categoria,
      });
      if (!r.ok) setError(r.error ?? "Erro");
      else setResults(r.items);
    });
  };

  return (
    <section className="rounded-2xl border border-accent/30 bg-accent-soft p-4 md:p-5 space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="font-bold text-sm text-accent">
          Buscar via Google Places
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="text-fg-muted text-xs hover:text-fg"
        >
          ✕
        </button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <select
          value={categoria}
          onChange={(e) =>
            setCategoria(e.target.value as "imobiliaria" | "construtora")
          }
          className="h-9 px-3 rounded-lg border border-border bg-bg text-sm"
        >
          <option value="imobiliaria">Imobiliárias</option>
          <option value="construtora">Construtoras</option>
        </select>
        <input
          type="number"
          value={lat}
          onChange={(e) => setLat(parseFloat(e.target.value))}
          step="0.0001"
          className="h-9 px-3 rounded-lg border border-border bg-bg text-sm font-mono"
          placeholder="lat"
        />
        <input
          type="number"
          value={lng}
          onChange={(e) => setLng(parseFloat(e.target.value))}
          step="0.0001"
          className="h-9 px-3 rounded-lg border border-border bg-bg text-sm font-mono"
          placeholder="lng"
        />
        <select
          value={radius}
          onChange={(e) => setRadius(parseInt(e.target.value, 10))}
          className="h-9 px-3 rounded-lg border border-border bg-bg text-sm"
        >
          <option value={1000}>1 km</option>
          <option value={2000}>2 km</option>
          <option value={5000}>5 km</option>
          <option value={10000}>10 km</option>
        </select>
      </div>
      <button
        type="button"
        onClick={search}
        disabled={pending}
        className="btn-primary !h-9 !px-4 text-xs disabled:opacity-50"
      >
        {pending ? "buscando…" : "Buscar nessa região"}
      </button>
      {error && (
        <p className="text-xs text-danger font-semibold">{error}</p>
      )}
      {results && results.length === 0 && (
        <p className="text-xs text-fg-muted">
          Nenhum resultado nessa região. Aumente o raio.
        </p>
      )}
      {results && results.length > 0 && (
        <ul className="space-y-1.5 max-h-[300px] overflow-y-auto">
          {results.map((it) => (
            <ResultRow
              key={it.placeId}
              item={it}
              categoria={categoria}
              onAdded={() => router.refresh()}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function ResultRow({
  item,
  categoria,
  onAdded,
}: {
  item: GooglePlaceItem;
  categoria: "imobiliaria" | "construtora";
  onAdded: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [added, setAdded] = useState(item.jaPontoMeu);

  return (
    <li
      className={`rounded-lg border p-2 ${
        item.jaExiste
          ? "border-red-300 bg-red-50"
          : added
            ? "border-success/40 bg-green-50"
            : "border-border bg-bg"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-sm text-fg truncate">
            {item.nome}
            {item.jaExiste && (
              <span className="ml-2 text-[10px] font-mono uppercase tracking-wider px-1 py-0.5 rounded bg-red-100 text-red-700">
                já cliente
              </span>
            )}
          </div>
          <div className="text-[11px] text-fg-muted truncate">
            {item.endereco}
            {item.rating && ` · ★ ${item.rating}`}
          </div>
        </div>
        {!item.jaExiste && (
          <button
            type="button"
            disabled={pending || added}
            onClick={() => {
              startTransition(async () => {
                const r = await saveProspectPontoFromGoogle({
                  ...item,
                  categoria,
                });
                if (r.ok) {
                  setAdded(true);
                  onAdded();
                }
              });
            }}
            className="shrink-0 text-xs px-2 py-1 rounded bg-accent text-white hover:bg-accent-dark disabled:opacity-50"
          >
            {added ? "✓ no mapa" : pending ? "..." : "+ mapa"}
          </button>
        )}
      </div>
    </li>
  );
}
