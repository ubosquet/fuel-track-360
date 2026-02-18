export default function SettingsPage() {
    return (
        <div className="space-y-6 max-w-[800px]">
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Settings</h1>
            <p className="text-sm text-[var(--text-muted)]">Organization and application settings</p>

            {/* Organization */}
            <section className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-6">
                <h2 className="font-semibold text-[var(--text-primary)] mb-4">Organization</h2>
                <div className="grid grid-cols-2 gap-4">
                    {[
                        { label: 'Name', value: 'Petrocaribe Haiti Demo' },
                        { label: 'Code', value: 'PCH-DEMO' },
                        { label: 'Country', value: '🇭🇹 Haiti' },
                        { label: 'Currency', value: 'HTG (Gourde)' },
                        { label: 'Timezone', value: 'America/Port-au-Prince' },
                        { label: 'Variance Threshold', value: '2%' },
                    ].map((item) => (
                        <div key={item.label}>
                            <label className="text-xs text-[var(--text-muted)]">{item.label}</label>
                            <p className="text-sm font-medium text-[var(--text-primary)] mt-0.5">{item.value}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Preferences */}
            <section className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-6">
                <h2 className="font-semibold text-[var(--text-primary)] mb-4">Preferences</h2>
                <div className="space-y-3">
                    {[
                        { label: 'Language', desc: 'Application language', value: 'Français' },
                        { label: 'Theme', desc: 'Color scheme', value: 'System' },
                        { label: 'Notifications', desc: 'Push notifications', value: 'Enabled' },
                    ].map((item) => (
                        <div key={item.label} className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0">
                            <div>
                                <p className="text-sm font-medium text-[var(--text-primary)]">{item.label}</p>
                                <p className="text-xs text-[var(--text-muted)]">{item.desc}</p>
                            </div>
                            <span className="text-sm text-[var(--text-secondary)] bg-[var(--background)] px-3 py-1 rounded-lg">{item.value}</span>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}
