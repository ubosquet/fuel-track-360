'use client';

import { useState } from 'react';
import { useManifestList } from '@/hooks/useManifest';
import type { Manifest, ManifestStatus } from '@/types/manifest';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Plus, Truck, Package, Clock, CheckCircle, AlertTriangle, AlertOctagon, ChevronRight, MapPin, User, Droplet, Box } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const statusSteps: ManifestStatus[] = ['CREATED', 'LOADING', 'IN_TRANSIT', 'ARRIVED', 'DISCHARGING', 'COMPLETED'];

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' | 'success' | 'warning' | 'info' }> = {
    CREATED: { label: 'Créé', variant: 'secondary' },
    LOADING: { label: 'Chargement', variant: 'warning' },
    IN_TRANSIT: { label: 'En Transit', variant: 'info' },
    ARRIVED: { label: 'Arrivé', variant: 'info' },
    DISCHARGING: { label: 'Déchargement', variant: 'warning' },
    COMPLETED: { label: 'Complété', variant: 'success' },
    FLAGGED: { label: 'Signalé', variant: 'destructive' },
    CANCELLED: { label: 'Annulé', variant: 'destructive' },
};

const productLabels: Record<string, string> = {
    DIESEL: 'Diesel',
    GASOLINE: 'Essence',
    KEROSENE: 'Kérosène',
    LPG: 'GPL',
};

const filters: Array<ManifestStatus | 'ALL'> = ['ALL', 'CREATED', 'LOADING', 'IN_TRANSIT', 'COMPLETED', 'FLAGGED', 'CANCELLED'];

export default function ManifestsPage() {
    const [activeFilter, setActiveFilter] = useState<ManifestStatus | 'ALL'>('ALL');
    const [selected, setSelected] = useState<Manifest | null>(null);

    const { data: manifests, isLoading, error } = useManifestList({
        status: activeFilter === 'ALL' ? undefined : activeFilter,
        limit: 50,
    });

    const displayData: Manifest[] = manifests ?? [];

    const getStatusVariant = (status: string) => statusConfig[status]?.variant || 'default';
    const getStatusLabel = (status: string) => statusConfig[status]?.label || status;

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto p-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Manifestes de Livraison</h1>
                    <p className="text-muted-foreground mt-1">
                        Suivi des livraisons de carburant du terminal à la station
                    </p>
                </div>
                <Button className="gap-2 shadow-lg">
                    <Plus className="w-4 h-4" />
                    Nouveau Manifeste
                </Button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <SummaryCard
                    label="Total"
                    count={displayData.length}
                    icon={<Package className="w-5 h-5 text-muted-foreground" />}
                />
                <SummaryCard
                    label="En Transit"
                    count={displayData.filter((m) => m.status === 'IN_TRANSIT').length}
                    icon={<Truck className="w-5 h-5 text-blue-500" />}
                    trend="+2" // Mock trend
                />
                <SummaryCard
                    label="Chargement"
                    count={displayData.filter((m) => m.status === 'LOADING').length}
                    icon={<Clock className="w-5 h-5 text-amber-500" />}
                />
                <SummaryCard
                    label="Complétés"
                    count={displayData.filter((m) => m.status === 'COMPLETED').length}
                    icon={<CheckCircle className="w-5 h-5 text-green-500" />}
                />
                <SummaryCard
                    label="Signalés"
                    count={displayData.filter((m) => m.status === 'FLAGGED').length}
                    icon={<AlertTriangle className="w-5 h-5 text-red-500" />}
                    error={true}
                />
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 flex-wrap pb-2 border-b">
                {filters.map((f) => {
                    const count = f === 'ALL'
                        ? displayData.length
                        : displayData.filter((m) => m.status === f).length;
                    const isActive = activeFilter === f;

                    return (
                        <Button
                            key={f}
                            variant={isActive ? 'primary' : 'ghost'}
                            size="sm"
                            onClick={() => setActiveFilter(f)}
                            className={cn(
                                "rounded-full transition-all",
                                isActive ? "shadow-md" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {f === 'ALL' ? 'Tous' : getStatusLabel(f)}
                            <span className={cn(
                                "ml-2 text-[10px] py-0.5 px-1.5 rounded-full",
                                isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
                            )}>
                                {count}
                            </span>
                        </Button>
                    );
                })}
            </div>

            {/* Error State */}
            {error && (
                <Card className="border-destructive/50 bg-destructive/10">
                    <CardContent className="flex items-center gap-4 py-4">
                        <AlertOctagon className="w-10 h-10 text-destructive" />
                        <div>
                            <h3 className="font-semibold text-destructive">Erreur de chargement</h3>
                            <p className="text-sm text-destructive/80">{error.message}</p>
                            <p className="text-xs text-muted-foreground mt-1">API: {process.env.NEXT_PUBLIC_API_URL}</p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Empty State */}
            {!isLoading && !error && displayData.length === 0 && (
                <Card className="bg-muted/30 border-dashed py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                            <Package className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <h3 className="font-semibold text-lg">Aucun manifeste trouvé</h3>
                        <p className="text-muted-foreground max-w-sm">
                            {activeFilter !== 'ALL'
                                ? `Aucun manifeste avec le statut "${getStatusLabel(activeFilter)}".`
                                : "Commencez par créer un nouveau manifeste."}
                        </p>
                    </div>
                </Card>
            )}

            {/* Content: Master-Detail Layout */}
            {displayData.length > 0 && (
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
                    {/* List */}
                    <div className="xl:col-span-2 space-y-4">
                        {isLoading && (
                            <div className="text-center py-10">
                                <span className="loading loading-spinner loading-lg"></span>
                            </div>
                        )}

                        {displayData.map((m, i) => {
                            const isSelected = selected?.id === m.id;
                            const stepIndex = statusSteps.indexOf(m.status);

                            return (
                                <Card
                                    key={m.id}
                                    className={cn(
                                        "cursor-pointer transition-all duration-200 hover:shadow-md border-l-4",
                                        isSelected ? "border-l-primary ring-1 ring-primary/20 shadow-md bg-accent/50" : "border-l-transparent hover:border-l-muted-foreground/30",
                                        "animate-in fade-in slide-in-from-bottom-2"
                                    )}
                                    style={{ animationDelay: `${i * 50}ms`, borderLeftColor: isSelected ? undefined : getStatusColor(m.status) }}
                                    onClick={() => setSelected(m)}
                                >
                                    <div className="p-4 sm:p-5">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shadow-sm">
                                                    {m.manifest_number.slice(-3)}
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-base">{m.manifest_number}</h4>
                                                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                                                        <span>{m.origin_station?.name || 'Origine inconnue'}</span>
                                                        <ChevronRight className="w-3 h-3" />
                                                        <span>{m.dest_station?.name || 'Destination inconnue'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <Badge variant={getStatusVariant(m.status)} className="shadow-sm">
                                                {getStatusLabel(m.status)}
                                            </Badge>
                                        </div>

                                        {/* Progress Bar */}
                                        <div className="flex items-center gap-1.5 mb-5 h-1.5 w-full bg-secondary/30 rounded-full overflow-hidden">
                                            {statusSteps.map((step, si) => {
                                                const isCompleted = si <= stepIndex;
                                                const isCurrent = si === stepIndex;
                                                const isFlagged = m.status === 'FLAGGED';

                                                return (
                                                    <div
                                                        key={step}
                                                        className={cn(
                                                            "h-full flex-1 transition-all duration-500",
                                                            isFlagged ? "bg-destructive/60" :
                                                                isCompleted ? "bg-primary" : "bg-transparent",
                                                            isCurrent && "animate-pulse"
                                                        )}
                                                    />
                                                );
                                            })}
                                        </div>

                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                <Truck className="w-4 h-4" />
                                                <span className="truncate">{m.truck?.plate_number || '—'}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                <User className="w-4 h-4" />
                                                <span className="truncate">{m.driver?.full_name || '—'}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                <Droplet className="w-4 h-4" />
                                                <span className="truncate">{productLabels[m.product_type] || m.product_type}</span>
                                            </div>
                                            <div className="flex items-center gap-2 font-medium">
                                                <Box className="w-4 h-4 text-muted-foreground" />
                                                {m.volume_loaded_liters ? `${m.volume_loaded_liters.toLocaleString()} L` : '—'}
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>

                    {/* Detail Panel */}
                    <div className="xl:col-span-1 sticky top-6">
                        {selected ? (
                            <Card className="shadow-lg border-primary/20 animate-in fade-in slide-in-from-right-4">
                                <CardHeader className="bg-muted/30 pb-4">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <CardTitle>{selected.manifest_number}</CardTitle>
                                            <CardDescription className="mt-1 flex items-center gap-1">
                                                <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>
                                                S2L: {selected.s2l_id?.slice(0, 8) || 'N/A'}
                                            </CardDescription>
                                        </div>
                                        <Badge variant={getStatusVariant(selected.status)} className="ml-2">
                                            {getStatusLabel(selected.status)}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-6 pt-6">
                                    {/* Variance Alert */}
                                    {typeof selected.volume_variance_pct === 'number' && (
                                        <div className={cn(
                                            "p-4 rounded-lg border flex items-start gap-3",
                                            selected.volume_variance_pct > 2
                                                ? "bg-destructive/10 border-destructive/20 text-destructive"
                                                : "bg-success/10 border-success/20 text-success"
                                        )}>
                                            {selected.volume_variance_pct > 2 ? <AlertTriangle className="w-5 h-5 shrink-0" /> : <CheckCircle className="w-5 h-5 shrink-0" />}
                                            <div>
                                                <p className="font-bold text-sm">
                                                    {selected.volume_variance_pct > 2 ? 'Variance Critique' : 'Variance Acceptable'}
                                                </p>
                                                <p className="text-xs opacity-90 mt-1">
                                                    Écart de {selected.volume_variance_pct.toFixed(2)}% détecté (Seuil: 2%).
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Key Details */}
                                    <div className="space-y-3">
                                        <DetailRow label="Produit" value={productLabels[selected.product_type] || selected.product_type} />
                                        <DetailRow label="Origine" value={selected.origin_station?.name} />
                                        <DetailRow label="Destination" value={selected.dest_station?.name} />
                                        <div className="my-2 h-px bg-border" />
                                        <DetailRow label="Volume Chargé" value={selected.volume_loaded_liters ? `${selected.volume_loaded_liters.toLocaleString()} L` : '—'} />
                                        <DetailRow label="Volume Déchargé" value={selected.volume_discharged_liters ? `${selected.volume_discharged_liters.toLocaleString()} L` : '—'} />
                                        <div className="my-2 h-px bg-border" />
                                        <DetailRow label="Camion" value={selected.truck?.plate_number} />
                                        <DetailRow label="Chauffeur" value={selected.driver?.full_name} />
                                    </div>

                                    {/* Timeline */}
                                    <div className="pt-2">
                                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Chronologie</h4>
                                        <div className="space-y-3 pl-2 border-l-2 border-muted ml-1.5">
                                            <TimelineItem date={selected.created_at} label="Création" />
                                            {selected.loaded_at && <TimelineItem date={selected.loaded_at} label="Chargement terminé" />}
                                            {selected.departed_at && <TimelineItem date={selected.departed_at} label="Départ station" />}
                                            {selected.arrived_at && <TimelineItem date={selected.arrived_at} label="Arrivée destination" />}
                                            {selected.discharged_at && <TimelineItem date={selected.discharged_at} label="Déchargement terminé" />}
                                        </div>
                                    </div>

                                    <div className="pt-4 flex gap-2">
                                        <Button className="w-full" variant="outline">
                                            Voir Documents
                                        </Button>
                                        <Button className="w-full">
                                            Actions
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ) : (
                            <Card className="border-dashed bg-muted/30 py-12 text-center sticky top-6">
                                <div className="text-muted-foreground flex flex-col items-center gap-2">
                                    <Box className="w-12 h-12 opacity-20" />
                                    <p>Sélectionnez un manifeste</p>
                                </div>
                            </Card>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function SummaryCard({ label, count, icon, trend, error }: { label: string; count: number; icon: React.ReactNode; trend?: string; error?: boolean }) {
    return (
        <Card className={cn("overflow-hidden transition-all hover:shadow-md", error && "border-destructive/30 bg-destructive/5")}>
            <CardContent className="p-4 sm:p-5">
                <div className="flex justify-between items-start mb-2">
                    <div className="p-2 rounded-lg bg-background shadow-sm border">{icon}</div>
                    {trend && <span className="text-[10px] font-bold text-green-600 bg-green-100 px-1.5 py-0.5 rounded-full">{trend}</span>}
                </div>
                <div>
                    <div className="text-2xl font-bold tracking-tight">{count}</div>
                    <div className="text-xs text-muted-foreground font-medium mt-1">{label}</div>
                </div>
            </CardContent>
        </Card>
    );
}

function DetailRow({ label, value }: { label: string; value?: string | number | null }) {
    return (
        <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-medium text-foreground text-right">{value || '—'}</span>
        </div>
    );
}

function TimelineItem({ date, label }: { date: string; label: string }) {
    return (
        <div className="relative pl-4 text-xs group">
            <div className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-background border-2 border-muted group-hover:border-primary transition-colors" />
            <div className="flex flex-col">
                <span className="text-muted-foreground font-medium">{label}</span>
                <span className="text-foreground">{format(new Date(date), "d MMM yyyy 'à' HH:mm", { locale: fr })}</span>
            </div>
        </div>
    );
}

// Helper for row left border color
function getStatusColor(status: string) {
    switch (status) {
        case 'CREATED': return '#64748b'; // slate-500
        case 'LOADING': return '#f59e0b'; // amber-500
        case 'IN_TRANSIT': return '#3b82f6'; // blue-500
        case 'ARRIVED': return '#6366f1'; // indigo-500
        case 'DISCHARGING': return '#d97706'; // amber-600 ?? using warning usually
        case 'COMPLETED': return '#22c55e'; // emerald-500
        case 'FLAGGED': return '#ef4444'; // red-500
        default: return '#e2e8f0';
    }
}
