'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Settings, Building2, Globe, Bell, Palette, Flag } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

export default function SettingsPage() {
    return (
        <div className="space-y-6 max-w-[1000px] mx-auto p-6">
            <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-xl text-primary">
                    <Settings className="w-8 h-8" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Paramètres</h1>
                    <p className="text-muted-foreground">Paramètres de l'organisation et de l'application</p>
                </div>
            </div>

            {/* Organization */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-primary" />
                        <CardTitle>Organisation</CardTitle>
                    </div>
                    <CardDescription>Informations sur votre entreprise et configuration régionale</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <SettingItem label="Nom" value="Petrocaribe Haiti Demo" />
                        <SettingItem label="Code" value="PCH-DEMO" isCode />
                        <SettingItem label="Pays" value="🇭🇹 Haïti" />
                        <SettingItem label="Devise" value="HTG (Gourde)" />
                        <SettingItem label="Fuseau Horaire" value="America/Port-au-Prince" />
                        <SettingItem label="Seuil de Variance" value="2%" highlight />
                    </div>
                </CardContent>
            </Card>

            {/* Preferences */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Palette className="w-5 h-5 text-primary" />
                        <CardTitle>Préférences</CardTitle>
                    </div>
                    <CardDescription>Personnalisation de l'interface et des notifications</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <PreferenceItem
                        icon={<Globe className="w-4 h-4" />}
                        label="Langue"
                        desc="Langue de l'application"
                        value="Français"
                    />
                    <PreferenceItem
                        icon={<Palette className="w-4 h-4" />}
                        label="Thème"
                        desc="Schéma de couleurs"
                        value="Système"
                    />
                    <PreferenceItem
                        icon={<Bell className="w-4 h-4" />}
                        label="Notifications"
                        desc="Notifications push"
                        value="Activé"
                        isActive
                    />
                </CardContent>
            </Card>
        </div>
    );
}

function SettingItem({ label, value, isCode, highlight }: { label: string; value: string; isCode?: boolean; highlight?: boolean }) {
    return (
        <div className="space-y-1.5 p-3 rounded-lg hover:bg-muted/50 transition-colors">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</label>
            <p className={`font-medium ${isCode ? 'font-mono text-sm bg-muted px-2 py-0.5 rounded w-fit' : 'text-base'} ${highlight ? 'text-primary' : 'text-foreground'}`}>
                {value}
            </p>
        </div>
    );
}

function PreferenceItem({ icon, label, desc, value, isActive }: { icon: React.ReactNode; label: string; desc: string; value: string; isActive?: boolean }) {
    return (
        <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-all">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-muted rounded-full text-muted-foreground">
                    {icon}
                </div>
                <div>
                    <p className="text-sm font-medium text-foreground">{label}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
            </div>
            <Badge variant={isActive ? 'success' : 'secondary'} className="px-3">
                {value}
            </Badge>
        </div>
    );
}
