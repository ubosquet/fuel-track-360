'use client';

import { useState } from 'react';
import { useUserList, useUpdateUser } from '@/hooks/useOrganization';
import type { User, UserRole } from '@/types/organization';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog';
import { Card } from '@/components/ui/Card';
import { Search, Loader2 } from 'lucide-react';

const roleConfig: Record<UserRole, { label: string; color: string; bg: string; icon: string }> = {
    OWNER: { label: 'Propriétaire', color: 'text-purple-700 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/30', icon: '👑' },
    ADMIN: { label: 'Administrateur', color: 'text-indigo-700 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-900/30', icon: '🛡️' },
    SUPERVISOR: { label: 'Superviseur', color: 'text-blue-700 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/30', icon: '📋' },
    DISPATCHER: { label: 'Dispatcher', color: 'text-teal-700 dark:text-teal-400', bg: 'bg-teal-50 dark:bg-teal-900/30', icon: '📡' },
    FINANCE: { label: 'Finance', color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/30', icon: '💰' },
    DRIVER: { label: 'Chauffeur', color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/30', icon: '🚛' },
};

const allRoles: UserRole[] = ['OWNER', 'ADMIN', 'SUPERVISOR', 'DISPATCHER', 'FINANCE', 'DRIVER'];

export default function UsersPage() {
    const [roleFilter, setRoleFilter] = useState<string>('');
    const [activeFilter, setActiveFilter] = useState<string>('');
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const { data: users, isLoading, error } = useUserList({
        role: roleFilter || undefined,
        active: activeFilter || undefined,
    });
    const updateMutation = useUpdateUser();

    const displayUsers = (users ?? []).filter((u) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
            u.full_name.toLowerCase().includes(q) ||
            u.email?.toLowerCase().includes(q) ||
            u.phone?.includes(q)
        );
    });

    const roleStats = allRoles.map((r) => ({
        role: r,
        count: (users ?? []).filter((u) => u.role === r).length,
        ...roleConfig[r],
    }));

    const handleToggleActive = (user: User) => {
        const action = user.is_active ? 'désactiver' : 'réactiver';
        if (confirm(`Voulez-vous ${action} ${user.full_name} ?`)) {
            updateMutation.mutate({ id: user.id, is_active: !user.is_active });
        }
    };

    const handleSaveEdit = () => {
        if (!editingUser) return;
        updateMutation.mutate(
            { id: editingUser.id, full_name: editingUser.full_name, role: editingUser.role, phone: editingUser.phone ?? undefined, email: editingUser.email ?? undefined },
            { onSuccess: () => setEditingUser(null) },
        );
    };

    return (
        <div className="space-y-6 max-w-[1200px]">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)]">Gestion des Utilisateurs</h1>
                    <p className="text-sm text-[var(--text-muted)] mt-1">
                        Gérez les comptes et rôles de votre équipe
                        {displayUsers.length > 0 && (
                            <span className="ml-2 text-[var(--text-secondary)]">
                                • {displayUsers.length} utilisateur{displayUsers.length !== 1 ? 's' : ''}
                            </span>
                        )}
                    </p>
                </div>
            </div>

            {/* Role Summary Cards */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                {roleStats.map((s) => (
                    <button
                        key={s.role}
                        onClick={() => setRoleFilter(roleFilter === s.role ? '' : s.role)}
                        className={`rounded-xl border p-3 text-center transition-all duration-200 hover:border-[var(--primary)]/40 hover:shadow-sm ${roleFilter === s.role
                            ? 'border-[var(--primary)] bg-[var(--primary)]/5 shadow-md ring-1 ring-[var(--primary)]/20'
                            : 'border-[var(--border)] bg-[var(--surface)]'
                            }`}
                    >
                        <span className="text-lg">{s.icon}</span>
                        <p className="text-xl font-bold text-[var(--text-primary)] mt-1">{s.count}</p>
                        <p className="text-[10px] text-[var(--text-muted)] font-medium">{s.label}</p>
                    </button>
                ))}
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3 flex-wrap">
                <div className="flex-1 min-w-[200px] max-w-[400px]">
                    <Input
                        startIcon={Search}
                        placeholder="Rechercher par nom, email, téléphone..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="w-[200px]">
                    <Select
                        value={activeFilter}
                        onChange={(e) => setActiveFilter(e.target.value)}
                        options={[
                            { label: 'Tous les statuts', value: '' },
                            { label: 'Actifs uniquement', value: 'true' },
                            { label: 'Désactivés', value: 'false' },
                        ]}
                    />
                </div>
            </div>

            {/* Loading */}
            {isLoading && (
                <Card padding="lg" className="text-center bg-[var(--surface)]">
                    <div className="inline-flex items-center gap-3">
                        <Loader2 className="w-5 h-5 animate-spin text-[var(--primary)]" />
                        <span className="text-sm text-[var(--text-muted)]">Chargement des utilisateurs...</span>
                    </div>
                </Card>
            )}

            {/* Error */}
            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 animate-fade-in">
                    <span className="text-sm text-red-700 dark:text-red-400 font-medium">⚠️ {error.message}</span>
                </div>
            )}

            {/* User Table */}
            {!isLoading && displayUsers.length > 0 && (
                <Card padding="none" className="overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Utilisateur</TableHead>
                                <TableHead>Rôle</TableHead>
                                <TableHead>Contact</TableHead>
                                <TableHead>Statut</TableHead>
                                <TableHead>Dernière connexion</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {displayUsers.map((user, i) => {
                                const rc = roleConfig[user.role] ?? roleConfig.DRIVER;
                                return (
                                    <TableRow
                                        key={user.id}
                                        className={`animate-fade-in ${!user.is_active ? 'opacity-50 grayscale' : ''}`}
                                        style={{ animationDelay: `${i * 30}ms` }}
                                    >
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shadow-sm ${rc.bg} ${rc.color}`}>
                                                    {user.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-[var(--text-primary)]">{user.full_name}</p>
                                                    <p className="text-[10px] font-mono text-[var(--text-muted)]">{user.id.slice(0, 8)}</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${rc.bg} ${rc.color}`}>
                                                <span>{rc.icon}</span>
                                                {rc.label}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="space-y-0.5">
                                                {user.email && <p className="text-xs text-[var(--text-secondary)]">{user.email}</p>}
                                                {user.phone && <p className="text-xs text-[var(--text-muted)]">{user.phone}</p>}
                                                {!user.email && !user.phone && <p className="text-xs text-[var(--text-muted)]">—</p>}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={user.is_active ? 'success' : 'destructive'} size="sm">
                                                {user.is_active ? 'Actif' : 'Désactivé'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <p className="text-xs text-[var(--text-muted)]">
                                                {user.last_login_at
                                                    ? new Date(user.last_login_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
                                                    : 'Jamais'
                                                }
                                            </p>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => setEditingUser({ ...user })}
                                                    title="Modifier"
                                                >
                                                    <svg className="w-4 h-4 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                                                    </svg>
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleToggleActive(user)}
                                                    disabled={updateMutation.isPending}
                                                    className={user.is_active ? 'hover:bg-red-50 hover:text-red-500' : 'hover:bg-emerald-50 hover:text-emerald-500'}
                                                    title={user.is_active ? 'Désactiver' : 'Réactiver'}
                                                >
                                                    {user.is_active ? (
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                                        </svg>
                                                    ) : (
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                    )}
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </Card>
            )}

            {/* Empty */}
            {!isLoading && !error && displayUsers.length === 0 && (
                <Card padding="lg" className="text-center">
                    <div className="text-4xl mb-3">👥</div>
                    <p className="text-[var(--text-primary)] font-medium">Aucun utilisateur trouvé</p>
                    <p className="text-sm text-[var(--text-muted)] mt-1">
                        {searchQuery ? `Aucun résultat pour "${searchQuery}"` : 'Ajoutez des membres à votre organisation.'}
                    </p>
                </Card>
            )}

            {/* ── Edit Modal ── */}
            <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Modifier l&apos;utilisateur</DialogTitle>
                        <DialogDescription>
                            Mettez à jour les informations et le rôle de {editingUser?.full_name}.
                        </DialogDescription>
                    </DialogHeader>

                    {editingUser && (
                        <div className="space-y-4 py-2">
                            <div>
                                <Input
                                    label="Nom complet"
                                    value={editingUser.full_name}
                                    onChange={(e) => setEditingUser({ ...editingUser, full_name: e.target.value })}
                                />
                            </div>

                            <div>
                                <Select
                                    label="Rôle"
                                    value={editingUser.role}
                                    onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as UserRole })}
                                    options={allRoles.map((r) => ({
                                        label: `${roleConfig[r].icon} ${roleConfig[r].label}`,
                                        value: r,
                                    }))}
                                />
                            </div>

                            <div>
                                <Input
                                    label="Email"
                                    type="email"
                                    value={editingUser.email ?? ''}
                                    onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value || null })}
                                />
                            </div>

                            <div>
                                <Input
                                    label="Téléphone"
                                    type="tel"
                                    value={editingUser.phone ?? ''}
                                    onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value || null })}
                                />
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setEditingUser(null)}>
                            Annuler
                        </Button>
                        <Button
                            onClick={handleSaveEdit}
                            isLoading={updateMutation.isPending}
                        >
                            Enregistrer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
