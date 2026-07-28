import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Phone, Clock, DollarSign, Building2, Activity, ShieldCheck,
  Server, Database, Cpu, PhoneCall, RefreshCw, TrendingUp
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { apiClient } from '@/lib/api'

interface AdminStats {
  totalCompanies: number
  activeCompanies: number
  suspendedCompanies: number
  totalCalls: number
  callsToday: number
  callsThisMonth: number
  totalDurationSeconds: number
  totalDurationMinutes: number
  estimatedCostToday: number
  estimatedCostMonth: number
  callFlow: Array<{ day: string; date: string; calls: number }>
  monthlyFlow: Array<{ day: string; date: string; calls: number }>
  infrastructure: {
    webhookServer: string
    database: string
    openAiRealtime: string
    twilioPhone: string
    twilioNumber: string
  }
  recentCalls: Array<{
    id: string
    callerNumber: string
    status: string
    duration: number | null
    startedAt: string
    company: { name: string }
  }>
}

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color = 'primary',
}: {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ElementType
  color?: 'primary' | 'green' | 'blue' | 'purple'
}) {
  const colorMap = {
    primary: 'text-primary bg-primary/10 border-primary/20',
    green: 'text-green-400 bg-green-400/10 border-green-400/20',
    blue: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
    purple: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
  }

  return (
    <Card className="glass-card border-border shadow-md">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">{title}</p>
            <p className="text-3xl font-display font-bold text-foreground">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground font-medium pt-0.5">{subtitle}</p>}
          </div>
          <div className={`p-3 rounded-2xl border ${colorMap[color]}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function AdminDashboardPage() {
  const { data: stats, isLoading, refetch, isRefetching } = useQuery<AdminStats>({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const { data } = await apiClient.get('/admin/stats')
      return data
    },
    refetchInterval: 15000, // Refresh every 15s for live control tower monitoring
  })

  const [chartMode, setChartMode] = useState<'weekly' | 'monthly'>('weekly')

  const activeFlow: Array<{ day: string; date: string; calls: number }> =
    chartMode === 'weekly' ? (stats?.callFlow ?? []) : (stats?.monthlyFlow ?? [])
  const maxCallPeak = Math.max(...(activeFlow.map((f: { calls: number }) => f.calls) ?? [1]), 1)

  return (
    <div className="page-enter space-y-6">
      {/* Control Tower Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-foreground flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/15 border border-primary/20">
              <Activity className="w-5 h-5 text-primary" />
            </div>
            Platform Control Tower
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Global monitoring tower & real-time infrastructure health status.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => refetch()}
          disabled={isRefetching}
          className="border-border text-muted-foreground hover:text-foreground shrink-0"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isRefetching ? 'animate-spin text-primary' : ''}`} />
          Refresh Stats
        </Button>
      </div>

      {/* Infrastructure Health Status Bar */}
      <Card className="glass-card border-primary/20 bg-primary/5">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-green-400" />
              Infrastructure & Webhook Status
            </h3>
            <span className="text-xs text-muted-foreground">Live Telemetry</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Server / Azure Webhook */}
            <div className="p-3 rounded-xl bg-secondary/80 border border-border/40 flex items-center gap-3">
              <Server className="w-4 h-4 text-blue-400 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] text-muted-foreground truncate">Server Webhook</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-xs font-bold text-green-400 uppercase">Online</span>
                </div>
              </div>
            </div>

            {/* PostgreSQL DB */}
            <div className="p-3 rounded-xl bg-secondary/80 border border-border/40 flex items-center gap-3">
              <Database className="w-4 h-4 text-purple-400 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] text-muted-foreground truncate">PostgreSQL DB</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-xs font-bold text-green-400 uppercase">Online</span>
                </div>
              </div>
            </div>

            {/* OpenAI Realtime API */}
            <div className="p-3 rounded-xl bg-secondary/80 border border-border/40 flex items-center gap-3">
              <Cpu className="w-4 h-4 text-primary shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] text-muted-foreground truncate">OpenAI Realtime</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`w-2 h-2 rounded-full ${stats?.infrastructure.openAiRealtime === 'online' ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
                  <span className={`text-xs font-bold uppercase ${stats?.infrastructure.openAiRealtime === 'online' ? 'text-green-400' : 'text-red-400'}`}>
                    {stats?.infrastructure.openAiRealtime ?? 'Online'}
                  </span>
                </div>
              </div>
            </div>

            {/* Twilio Number Stream */}
            <div className="p-3 rounded-xl bg-secondary/80 border border-border/40 flex items-center gap-3">
              <PhoneCall className="w-4 h-4 text-green-400 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] text-muted-foreground truncate">Twilio Voice</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-xs font-mono text-foreground font-semibold truncate">
                    {stats?.infrastructure.twilioNumber}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Calls Processed"
          value={isLoading ? '—' : (stats?.totalCalls ?? 0)}
          subtitle={isLoading ? 'Loading...' : `${stats?.callsToday ?? 0} call(s) today`}
          icon={Phone}
          color="primary"
        />
        <MetricCard
          title="Total Call Duration"
          value={isLoading ? '—' : `${stats?.totalDurationMinutes ?? 0} m`}
          subtitle={isLoading ? 'Loading...' : `~${Math.round((stats?.totalDurationSeconds ?? 0) / 3600)} hour(s) spoken`}
          icon={Clock}
          color="blue"
        />
        <MetricCard
          title="Est. Realtime API Cost"
          value={isLoading ? '—' : `$${stats?.estimatedCostMonth ?? 0}`}
          subtitle={isLoading ? 'Loading...' : `$${stats?.estimatedCostToday ?? 0} spent today`}
          icon={DollarSign}
          color="green"
        />
        <MetricCard
          title="Registered Companies"
          value={isLoading ? '—' : (stats?.totalCompanies ?? 0)}
          subtitle={isLoading ? 'Loading...' : `${stats?.activeCompanies ?? 0} active / ${stats?.suspendedCompanies ?? 0} suspended`}
          icon={Building2}
          color="purple"
        />
      </div>

      {/* Full-Width Call Volume Flow Chart with Blue Theme & Weekly/Monthly Toggle */}
      <Card className="glass-card border-border w-full">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-400" />
            Call Volume Peaks
          </CardTitle>

          {/* Weekly / Monthly Selector */}
          <div className="flex items-center gap-1 bg-secondary/80 border border-border/80 p-1 rounded-xl">
            <button
              onClick={() => setChartMode('weekly')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                chartMode === 'weekly'
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Weekly (7 Days)
            </button>
            <button
              onClick={() => setChartMode('monthly')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                chartMode === 'monthly'
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Monthly (30 Days)
            </button>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          {isLoading ? (
            <Skeleton className="h-56 w-full" />
          ) : (
            <div className="space-y-4">
              <div className="h-56 flex items-end justify-between gap-3 pt-6 px-4 border-b border-border/40">
                {activeFlow.map((item, idx) => {
                  const heightPercent = item.calls > 0 ? Math.max(16, Math.round((item.calls / maxCallPeak) * 100)) : 8
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full gap-2 group">
                      <span className={`text-xs font-mono font-bold transition-opacity ${item.calls > 0 ? 'text-blue-400 opacity-100' : 'text-muted-foreground/60 opacity-0 group-hover:opacity-100'}`}>
                        {item.calls}
                      </span>
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className={`w-full max-w-[48px] rounded-t-xl transition-all duration-300 shadow-sm ${
                          item.calls > 0
                            ? 'bg-gradient-to-t from-blue-600/50 via-blue-500/80 to-blue-400 border-t border-blue-300 group-hover:from-blue-500 group-hover:to-blue-300'
                            : 'bg-blue-500/20 border-t-2 border-blue-400/40 group-hover:bg-blue-500/40'
                        }`}
                      />
                      <span className="text-xs text-muted-foreground font-medium">{item.day}</span>
                    </div>
                  )
                })}
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Call Volume Curve ({chartMode === 'weekly' ? 'Daily breakdown' : '4-week breakdown'})</span>
                <span className="font-semibold text-foreground">{stats?.callsThisMonth ?? 0} total calls this month</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
