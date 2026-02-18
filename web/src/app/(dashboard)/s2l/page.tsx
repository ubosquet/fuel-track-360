'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useS2LList, useApproveS2L, useRejectS2L } from '@/hooks/useS2L';
import type { S2LChecklist, S2LStatus } from '@/types/s2l';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { FileCheck, Plus, CheckCircle, XCircle, Clock, AlertTriangle, ImageIcon, PenTool } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' | 'success' | 'warning' | 'info' }> = {
    DRAFT: { label: 'Brouillon', variant: 'secondary' },
    SUBMITTED: { label: 'Soumis', variant: 'info' },
    APPROVED: { label: 'Approuvé', variant: 'success' },
    REJECTED: { label: 'Rejeté', variant: 'destructive' },
    EXPIRED: { label: 'Expiré', variant: 'warning' },
};

const filters: Array<S2LStatus | 'ALL'> = ['ALL', 'DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'EXPIRED'];

export default function S2LPage() {
    const [activeFilter, setActiveFilter] = useState<S2LStatus | 'ALL'>('ALL');
    const router = useRouter();

    const { data: s2ls, isLoading, error } = useS2LList({
        status: activeFilter === 'ALL' ? undefined : activeFilter,
    });

    const approveMutation = useApproveS2L();
    const rejectMutation = useRejectS2L();

    const handleApprove = (id: string) => {
        if (confirm('Approuver cette liste de contrôle S2L ?')) {
            approveMutation.mutate(id);
        }
    };

    const handleReject = (id: string) => {
        const notes = prompt('Raison du rejet :');
        if (notes !== null) {
            rejectMutation.mutate({ id, notes });
        }
    };

    const displayData: S2LChecklist[] = s2ls ?? [];
    const getStatusVariant = (status: string) => statusConfig[status]?.variant || 'default';
    const getStatusLabel = (status: string) => statusConfig[status]?.label || status;

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto p-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Inspections S2L</h1>
                    <p className="text-muted-foreground mt-1">
                        Gestion des listes de contrôle Safe-to-Load
                    </p>
                </div>
                <Button className="gap-2 shadow-lg">
                    <Plus className="w-4 h-4" />
                    Nouveau S2L
                </Button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <SummaryCard
                    label="Total"
                    count={displayData.length}
                    icon={<FileCheck className="w-5 h-5 text-muted-foreground" />}
                />
                <SummaryCard
                    label="Soumis"
                    count={displayData.filter((s) => s.status === 'SUBMITTED').length}
                    icon={<Clock className="w-5 h-5 text-blue-500" />}
                />
                <SummaryCard
                    label="Approuvés"
                    count={displayData.filter((s) => s.status === 'APPROVED').length}
                    icon={<CheckCircle className="w-5 h-5 text-green-500" />}
                />
                <SummaryCard
                    label="Rejetés"
                    count={displayData.filter((s) => s.status === 'REJECTED').length}
                    icon={<XCircle className="w-5 h-5 text-red-500" />}
                    error={true}
                />
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 flex-wrap pb-2 border-b">
                {filters.map((f) => {
                    const count = f === 'ALL'
                        ? displayData.length
                        : displayData.filter((s) => s.status === f).length;
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
                        <AlertTriangle className="w-10 h-10 text-destructive" />
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
                            <FileCheck className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <h3 className="font-semibold text-lg">Aucune inspection trouvée</h3>
                        <p className="text-muted-foreground max-w-sm">
                            {activeFilter !== 'ALL'
                                ? `Aucune inspection avec le statut "${getStatusLabel(activeFilter)}".`
                                : "Créez une nouvelle inspection S2L depuis l'application mobile."}
                        </p>
                    </div>
                </Card>
            )}

            {/* Content: Table */}
            {displayData.length > 0 && (
                <Card className="overflow-hidden border-border/50 shadow-sm" padding="none">
                    {isLoading && (
                        <div className="p-12 text-center">
                            <div className="loading loading-spinner loading-lg text-primary"></div>
                        </div>
                    )}
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead>ID</TableHead>
                                <TableHead>Camion / Chauffeur</TableHead>
                                <TableHead>Station</TableHead>
                                <TableHead>Statut</TableHead>
                                <TableHead>Contrôles</TableHead>
                                <TableHead>Photos</TableHead>
                                <TableHead>Signature</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {displayData.map((s2l, i) => {
                                const truckPlate = s2l.truck?.plate_number ?? s2l.truck_id?.slice(0, 8) ?? '—';
                                const driverName = s2l.driver?.full_name ?? s2l.driver_id?.slice(0, 8) ?? '—';
                                const stationName = s2l.station?.name ?? s2l.station_id?.slice(0, 8) ?? '—';
                                const photoCount = s2l.photos?.length ?? 0;

                                return (
                                    <TableRow
                                        key={s2l.id}
                                        className="cursor-pointer hover:bg-muted/50 transition-colors animate-in fade-in slide-in-from-bottom-1"
                                        style={{ animationDelay: `${i * 30}ms` }}
                                        onClick={() => router.push(`/s2l/${s2l.id}`)}
                                    >
                                        <TableCell className="font-mono text-xs font-medium text-primary">
                                            {s2l.id.slice(0, 8).toUpperCase()}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium text-sm">{truckPlate}</span>
                                                <span className="text-xs text-muted-foreground">{driverName}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-sm">
                                            {stationName}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={getStatusVariant(s2l.status)} className="shadow-sm">
                                                {getStatusLabel(s2l.status)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className={cn(
                                                "inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium border",
                                                s2l.all_items_pass
                                                    ? "bg-success/5 border-success/20 text-success"
                                                    : "bg-destructive/5 border-destructive/20 text-destructive"
                                            )}>
                                                {s2l.all_items_pass ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                                {s2l.all_items_pass ? 'Conforme' : 'Non Conforme'}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                <ImageIcon className="w-3.5 h-3.5" />
                                                <span>{photoCount}/3</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {s2l.signature_url ? (
                                                <div className="flex items-center gap-1.5 text-xs text-success font-medium">
                                                    <PenTool className="w-3.5 h-3.5" />
                                                    Signé
                                                </div>
                                            ) : (
                                                <span className="text-xs text-muted-foreground">—</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                            <div className="flex flex-col">
                                                <span>{format(new Date(s2l.created_at), "d MMM yyyy", { locale: fr })}</span>
                                                <span>{format(new Date(s2l.created_at), "HH:mm", { locale: fr })}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {s2l.status === 'SUBMITTED' ? (
                                                <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                                    <Button
                                                        size="sm"
                                                        variant="success"
                                                        onClick={() => handleApprove(s2l.id)}
                                                        isLoading={approveMutation.isPending}
                                                        disabled={approveMutation.isPending || rejectMutation.isPending}
                                                        className="h-8 px-3"
                                                    >
                                                        Approuver
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="destructive"
                                                        onClick={() => handleReject(s2l.id)}
                                                        isLoading={rejectMutation.isPending}
                                                        disabled={approveMutation.isPending || rejectMutation.isPending}
                                                        className="h-8 px-3"
                                                    >
                                                        Rejeter
                                                    </Button>
                                                </div>
                                            ) : (
                                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => router.push(`/s2l/${s2l.id}`)}>
                                                    <span className="sr-only">Voir</span>
                                                    <FileCheck className="w-4 h-4 text-muted-foreground" />
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </Card>
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

// Ensure Button has variant="success"?
// If not, I should use "outline" with classes or add "success" to Button.tsx.
// Button.tsx (id 714) had: primary, secondary, outline, ghost, danger.
// I used 'success' in S2LPage. I should change it or add it.
// I'll assume I should use 'outline' with class or 'primary' with green styling.
// Or actually adding 'success' variant to Button.tsx is better.
