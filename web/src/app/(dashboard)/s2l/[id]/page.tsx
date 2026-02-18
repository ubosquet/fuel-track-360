'use client';

import { useParams, useRouter } from 'next/navigation';
import { useS2LDetail, useS2LPhotos, useApproveS2L, useRejectS2L } from '@/hooks/useS2L';
import { useBatchSignedUrls, useSignedUrl, resolvePhotoUrl } from '@/hooks/useSignedUrl';
import type { S2LPhoto } from '@/types/s2l';
import { useState, useMemo } from 'react';

const statusConfig: Record<string, { bg: string; text: string; dot: string; label: string }> = {
    DRAFT: { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-400', dot: 'bg-slate-400', label: 'Brouillon' },
    SUBMITTED: { bg: 'bg-blue-50 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', dot: 'bg-blue-500', label: 'Soumis' },
    APPROVED: { bg: 'bg-emerald-50 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500', label: 'Approuvé' },
    REJECTED: { bg: 'bg-red-50 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', dot: 'bg-red-500', label: 'Rejeté' },
    EXPIRED: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-500', dot: 'bg-gray-400', label: 'Expiré' },
};

const photoTypeLabels: Record<string, string> = {
    FRONT: 'Avant du camion',
    REAR: 'Arrière du camion',
    COMPARTMENT: 'Compartiment',
    SAFETY_EQUIPMENT: 'Équipement de sécurité',
    OTHER: 'Autre',
};

export default function S2LDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params?.id as string;

    const { data: s2l, isLoading, error } = useS2LDetail(id);
    const { data: photos } = useS2LPhotos(id);
    const approveMutation = useApproveS2L();
    const rejectMutation = useRejectS2L();

    const [lightboxPhoto, setLightboxPhoto] = useState<S2LPhoto | null>(null);

    const handleApprove = () => {
        if (confirm('Approuver cette inspection S2L ?')) {
            approveMutation.mutate(id, {
                onSuccess: () => router.push('/s2l'),
            });
        }
    };

    const handleReject = () => {
        const notes = prompt('Motif du rejet :');
        if (notes !== null) {
            rejectMutation.mutate({ id, notes }, {
                onSuccess: () => router.push('/s2l'),
            });
        }
    };

    // ── Loading state ──
    if (isLoading) {
        return (
            <div className="space-y-6 max-w-[1200px]">
                <div className="animate-pulse">
                    <div className="h-8 w-64 bg-[var(--surface)] rounded-lg mb-4" />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-2 space-y-4">
                            <div className="h-48 bg-[var(--surface)] rounded-xl" />
                            <div className="h-64 bg-[var(--surface)] rounded-xl" />
                        </div>
                        <div className="space-y-4">
                            <div className="h-48 bg-[var(--surface)] rounded-xl" />
                            <div className="h-32 bg-[var(--surface)] rounded-xl" />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ── Error state ──
    if (error || !s2l) {
        return (
            <div className="space-y-6 max-w-[1200px]">
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6">
                    <h2 className="text-lg font-semibold text-red-700 dark:text-red-400 mb-2">
                        ⚠️ S2L introuvable
                    </h2>
                    <p className="text-sm text-red-600 dark:text-red-300">
                        {error?.message || `Impossible de charger le S2L ${id}`}
                    </p>
                    <button
                        onClick={() => router.push('/s2l')}
                        className="mt-4 px-4 py-2 bg-red-100 dark:bg-red-800/50 text-red-700 dark:text-red-300 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors"
                    >
                        ← Retour à la liste
                    </button>
                </div>
            </div>
        );
    }

    const sc = statusConfig[s2l.status] ?? statusConfig.DRAFT;
    const truckPlate = s2l.truck?.plate_number ?? s2l.truck_id?.slice(0, 8) ?? '—';
    const driverName = s2l.driver?.full_name ?? s2l.driver_id?.slice(0, 8) ?? '—';
    const stationName = s2l.station?.name ?? s2l.station_id?.slice(0, 8) ?? '—';
    const reviewerName = s2l.reviewer?.full_name ?? s2l.reviewed_by?.slice(0, 8);
    const photoList: S2LPhoto[] = photos ?? s2l.photos ?? [];
    const checklistItems = parseChecklist(s2l.checklist_data);

    // ── Signed URLs for photos and signature ──
    const photoPaths = useMemo(
        () => photoList.map((p) => p.storage_path).filter(Boolean),
        [photoList],
    );
    const { data: signedUrlMap } = useBatchSignedUrls(photoPaths);
    const { data: signedSignatureUrl } = useSignedUrl(s2l.signature_url, 'signatures');

    return (
        <div className="space-y-6 max-w-[1200px]">
            {/* ── Header ── */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <button
                        onClick={() => router.push('/s2l')}
                        className="text-sm text-[var(--text-muted)] hover:text-[var(--primary)] mb-2 flex items-center gap-1 transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                        </svg>
                        Retour aux inspections
                    </button>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                            S2L #{s2l.id.slice(0, 8).toUpperCase()}
                        </h1>
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${sc.bg} ${sc.text}`}>
                            <span className={`w-2 h-2 rounded-full ${sc.dot}`} />
                            {sc.label}
                        </span>
                    </div>
                    <p className="text-sm text-[var(--text-muted)] mt-1">
                        Créé le {new Date(s2l.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                </div>

                {/* Action buttons */}
                {s2l.status === 'SUBMITTED' && (
                    <div className="flex gap-2">
                        <button
                            onClick={handleApprove}
                            disabled={approveMutation.isPending}
                            className="px-5 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold
                                hover:bg-emerald-700 transition-all shadow-md hover:shadow-lg
                                disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {approveMutation.isPending ? (
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                            )}
                            Approuver
                        </button>
                        <button
                            onClick={handleReject}
                            disabled={rejectMutation.isPending}
                            className="px-5 py-2.5 rounded-lg bg-red-600 text-white text-sm font-semibold
                                hover:bg-red-700 transition-all shadow-md hover:shadow-lg
                                disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {rejectMutation.isPending ? (
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            )}
                            Rejeter
                        </button>
                    </div>
                )}
            </div>

            {/* ── Main Layout: 2/3 + 1/3 ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Details + Checklist */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Info Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <InfoCard icon="🚛" label="Camion" value={truckPlate} />
                        <InfoCard icon="👤" label="Chauffeur" value={driverName} />
                        <InfoCard icon="📍" label="Station" value={stationName} />
                        <InfoCard
                            icon="📸"
                            label="Photos"
                            value={`${photoList.length}/3`}
                            accent={photoList.length >= 3 ? 'green' : 'red'}
                        />
                    </div>

                    {/* Checklist */}
                    <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] overflow-hidden">
                        <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
                            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                                📋 Liste de Vérification
                            </h2>
                            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${s2l.all_items_pass
                                ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                                : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                }`}>
                                {s2l.all_items_pass ? '✓ Tout validé' : '✗ Éléments non validés'}
                            </span>
                        </div>
                        <div className="divide-y divide-[var(--border)]">
                            {checklistItems.length === 0 ? (
                                <p className="px-5 py-6 text-sm text-[var(--text-muted)] text-center">
                                    Aucun élément de vérification trouvé
                                </p>
                            ) : (
                                checklistItems.map((item, i) => (
                                    <div key={item.item_id || i} className="px-5 py-3 flex items-center gap-3 hover:bg-[var(--surface-hover)] transition-colors">
                                        <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-sm ${item.pass
                                            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600'
                                            : 'bg-red-100 dark:bg-red-900/30 text-red-600'
                                            }`}>
                                            {item.pass ? '✓' : '✗'}
                                        </span>
                                        <span className="text-sm text-[var(--text-primary)] flex-1">
                                            {item.label || `Item ${i + 1}`}
                                        </span>
                                        <span className="text-[10px] text-[var(--text-muted)] font-mono">
                                            {item.item_id}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Photos Grid */}
                    <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] overflow-hidden">
                        <div className="px-5 py-4 border-b border-[var(--border)]">
                            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                                📸 Photos ({photoList.length})
                            </h2>
                        </div>
                        {photoList.length === 0 ? (
                            <p className="px-5 py-8 text-sm text-[var(--text-muted)] text-center">
                                Aucune photo associée
                            </p>
                        ) : (
                            <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
                                {photoList.map((photo) => (
                                    <button
                                        key={photo.id}
                                        onClick={() => setLightboxPhoto(photo)}
                                        className="group relative aspect-[4/3] bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden
                                            border-2 border-transparent hover:border-[var(--primary)] transition-all duration-200"
                                    >
                                        {/* Photo image — uses signed URL from batch hook */}
                                        <img
                                            src={resolvePhotoUrl(photo.storage_path, signedUrlMap)}
                                            alt={photo.photo_type}
                                            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).style.display = 'none';
                                            }}
                                        />
                                        {/* Fallback placeholder */}
                                        <div className="absolute inset-0 flex items-center justify-center text-[var(--text-muted)]">
                                            <svg className="w-8 h-8 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                                    d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                                            </svg>
                                        </div>
                                        {/* Photo type badge */}
                                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                                            <p className="text-white text-xs font-semibold">
                                                {photoTypeLabels[photo.photo_type] ?? photo.photo_type}
                                            </p>
                                            {photo.file_size_bytes && (
                                                <p className="text-white/70 text-[10px]">
                                                    {Math.round(photo.file_size_bytes / 1024)} KB
                                                </p>
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Metadata + Signature + Review */}
                <div className="space-y-6">
                    {/* GPS & Location */}
                    <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] overflow-hidden">
                        <div className="px-5 py-4 border-b border-[var(--border)]">
                            <h2 className="text-sm font-semibold text-[var(--text-primary)]">📍 Localisation</h2>
                        </div>
                        <div className="px-5 py-4 space-y-3">
                            <MetadataRow label="Latitude" value={s2l.gps_lat?.toFixed(4) ?? '—'} />
                            <MetadataRow label="Longitude" value={s2l.gps_lng?.toFixed(4) ?? '—'} />
                            <MetadataRow label="Station" value={stationName} />
                            {s2l.gps_lat && s2l.gps_lng && (
                                <a
                                    href={`https://maps.google.com/?q=${s2l.gps_lat},${s2l.gps_lng}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block text-center text-xs text-[var(--primary)] font-medium mt-2 hover:underline"
                                >
                                    📍 Voir sur Google Maps →
                                </a>
                            )}
                        </div>
                    </div>

                    {/* Signature */}
                    <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] overflow-hidden">
                        <div className="px-5 py-4 border-b border-[var(--border)]">
                            <h2 className="text-sm font-semibold text-[var(--text-primary)]">✍️ Signature</h2>
                        </div>
                        <div className="p-4">
                            {s2l.signature_url ? (
                                <div className="bg-white dark:bg-slate-800 rounded-lg border border-[var(--border)] p-2 aspect-[16/9] flex items-center justify-center">
                                    <img
                                        src={signedSignatureUrl || resolvePhotoUrl(s2l.signature_url, signedUrlMap)}
                                        alt="Signature du chauffeur"
                                        className="max-w-full max-h-full object-contain"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).style.display = 'none';
                                            (e.target as HTMLImageElement).parentElement!.innerHTML =
                                                '<p class="text-sm text-gray-400">Signature enregistrée (non disponible)</p>';
                                        }}
                                    />
                                </div>
                            ) : (
                                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg border border-dashed border-[var(--border)] p-6 text-center">
                                    <p className="text-sm text-[var(--text-muted)]">Aucune signature</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Timeline / Audit */}
                    <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] overflow-hidden">
                        <div className="px-5 py-4 border-b border-[var(--border)]">
                            <h2 className="text-sm font-semibold text-[var(--text-primary)]">🕐 Historique</h2>
                        </div>
                        <div className="px-5 py-4">
                            <div className="relative border-l-2 border-[var(--border)] pl-5 space-y-4">
                                <TimelineItem
                                    date={s2l.created_at}
                                    label="S2L créé"
                                    description={`Par ${driverName}`}
                                    color="blue"
                                />
                                {s2l.submitted_at && (
                                    <TimelineItem
                                        date={s2l.submitted_at}
                                        label="Soumis pour revue"
                                        description={`${checklistItems.length} items vérifiés, ${photoList.length} photos`}
                                        color="blue"
                                    />
                                )}
                                {s2l.reviewed_at && (
                                    <TimelineItem
                                        date={s2l.reviewed_at}
                                        label={s2l.status === 'APPROVED' ? 'Approuvé' : 'Rejeté'}
                                        description={
                                            (reviewerName ? `Par ${reviewerName}` : '') +
                                            (s2l.review_notes ? ` — "${s2l.review_notes}"` : '')
                                        }
                                        color={s2l.status === 'APPROVED' ? 'green' : 'red'}
                                    />
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Review Notes (if rejected) */}
                    {s2l.review_notes && (
                        <div className={`rounded-xl border overflow-hidden ${s2l.status === 'REJECTED'
                            ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                            : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
                            }`}>
                            <div className="px-5 py-4">
                                <h3 className="text-sm font-semibold mb-1">
                                    {s2l.status === 'REJECTED' ? '❌ Motif du rejet' : '✅ Notes du superviseur'}
                                </h3>
                                <p className="text-sm opacity-80">{s2l.review_notes}</p>
                            </div>
                        </div>
                    )}

                    {/* Sync metadata */}
                    <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-4 space-y-2">
                        <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Métadonnées</h3>
                        <MetadataRow label="ID" value={s2l.id} mono />
                        {s2l.sync_id && <MetadataRow label="Sync ID" value={s2l.sync_id} mono />}
                        <MetadataRow label="Mis à jour" value={new Date(s2l.updated_at).toLocaleString('fr-FR')} />
                    </div>
                </div>
            </div>

            {/* ── Photo Lightbox ── */}
            {lightboxPhoto && (
                <div
                    className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
                    onClick={() => setLightboxPhoto(null)}
                >
                    <div
                        className="relative max-w-4xl max-h-[90vh] bg-[var(--surface)] rounded-2xl overflow-hidden shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)]">
                            <div>
                                <p className="text-sm font-semibold text-[var(--text-primary)]">
                                    {photoTypeLabels[lightboxPhoto.photo_type] ?? lightboxPhoto.photo_type}
                                </p>
                                <p className="text-xs text-[var(--text-muted)]">
                                    {new Date(lightboxPhoto.captured_at).toLocaleString('fr-FR')}
                                    {lightboxPhoto.file_size_bytes && ` • ${Math.round(lightboxPhoto.file_size_bytes / 1024)} KB`}
                                </p>
                            </div>
                            <button
                                onClick={() => setLightboxPhoto(null)}
                                className="p-2 rounded-lg hover:bg-[var(--surface-hover)] transition-colors"
                            >
                                <svg className="w-5 h-5 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="flex items-center justify-center bg-slate-100 dark:bg-slate-900 min-h-[400px]">
                            <img
                                src={resolvePhotoUrl(lightboxPhoto.storage_path, signedUrlMap)}
                                alt={lightboxPhoto.photo_type}
                                className="max-w-full max-h-[80vh] object-contain"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                }}
                            />
                        </div>
                        {lightboxPhoto.gps_lat && lightboxPhoto.gps_lng && (
                            <div className="px-5 py-2 border-t border-[var(--border)] text-xs text-[var(--text-muted)]">
                                📍 {lightboxPhoto.gps_lat.toFixed(4)}, {lightboxPhoto.gps_lng.toFixed(4)}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// ══════════════════════════════════════════════════════════
// Sub-components
// ══════════════════════════════════════════════════════════

function InfoCard({ icon, label, value, accent }: {
    icon: string;
    label: string;
    value: string;
    accent?: 'green' | 'red';
}) {
    return (
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-4">
            <p className="text-lg mb-1">{icon}</p>
            <p className="text-xs text-[var(--text-muted)] font-medium">{label}</p>
            <p className={`text-sm font-semibold mt-0.5 ${accent === 'green' ? 'text-emerald-600 dark:text-emerald-400'
                : accent === 'red' ? 'text-red-600 dark:text-red-400'
                    : 'text-[var(--text-primary)]'
                }`}>
                {value}
            </p>
        </div>
    );
}

function MetadataRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
    return (
        <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--text-muted)] text-xs">{label}</span>
            <span className={`text-[var(--text-secondary)] text-xs ${mono ? 'font-mono' : ''}`}>
                {mono ? value.slice(0, 12) + '…' : value}
            </span>
        </div>
    );
}

function TimelineItem({ date, label, description, color }: {
    date: string;
    label: string;
    description: string;
    color: 'blue' | 'green' | 'red';
}) {
    const colors = {
        blue: 'bg-blue-500',
        green: 'bg-emerald-500',
        red: 'bg-red-500',
    };
    return (
        <div className="relative">
            <div className={`absolute -left-[1.65rem] top-1 w-3 h-3 rounded-full ${colors[color]} ring-4 ring-[var(--surface)]`} />
            <p className="text-sm font-medium text-[var(--text-primary)]">{label}</p>
            <p className="text-xs text-[var(--text-muted)]">{description}</p>
            <p className="text-[10px] text-[var(--text-muted)] mt-0.5 font-mono">
                {new Date(date).toLocaleString('fr-FR')}
            </p>
        </div>
    );
}

// ══════════════════════════════════════════════════════════
// Helpers
// ══════════════════════════════════════════════════════════

/** Parse checklist_data which may be a JSON string or an array */
function parseChecklist(data: unknown): Array<{ item_id: string; label: string; pass: boolean }> {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (typeof data === 'string') {
        try {
            const parsed = JSON.parse(data);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }
    // Object format: { "item_1": true, ... }
    if (typeof data === 'object') {
        return Object.entries(data as Record<string, boolean>).map(([key, value]) => ({
            item_id: key,
            label: key.replace(/_/g, ' '),
            pass: !!value,
        }));
    }
    return [];
}

