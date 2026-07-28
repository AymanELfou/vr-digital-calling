import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Phone, PhoneCall, CheckCircle, TrendingUp, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { apiClient } from '@/lib/api'
import { useCompany, useAuthStore } from '@/lib/auth.store'
import type { PaginatedResponse, Call } from '@/lib/types'

function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  color = 'primary',
}: {
  title: string
  value: string | number
  icon: React.ElementType
  trend?: string
  color?: 'primary' | 'blue' | 'green' | 'orange'
}) {
  const colorMap = {
    primary: 'text-primary bg-primary/10',
    blue: 'text-blue-400 bg-blue-400/10',
    green: 'text-green-400 bg-green-400/10',
    orange: 'text-orange-400 bg-orange-400/10',
  }

  return (
    <Card className="glass-card border-border">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-muted-foreground text-sm font-medium">{title}</p>
            <p className="text-3xl font-display font-bold text-foreground mt-1">{value}</p>
            {trend && <p className="text-xs text-muted-foreground mt-1">{trend}</p>}
          </div>
          <div className={`p-3 rounded-xl ${colorMap[color]}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  const company = useCompany()
  const { user } = useAuthStore()

  const { data: callsData, isLoading } = useQuery({
    queryKey: ['calls', { page: 1, limit: 4 }],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<Call>>('/calls?page=1&limit=4')
      return data
    },
  })

  const { data: profileData } = useQuery({
    queryKey: ['company-profile'],
    queryFn: async () => {
      const { data } = await apiClient.get('/company/profile')
      return data
    },
  })

  const calls = (callsData?.data ?? []).slice(0, 4)
  const totalCalls = callsData?.pagination.total ?? 0
  const completedCalls = calls.filter((c) => c.status === 'COMPLETED').length
  const hasAiConfig = !!profileData?.aiConfig

  return (
    <div className="space-y-8 page-enter">
      {/* Header */}
      <div>
        <h1 className="font-display font-bold text-2xl text-foreground">
          Welcome back, {company?.name ?? user?.email}
        </h1>
        <p className="text-muted-foreground mt-1">
          Here's what's happening with your AI voice agent.
        </p>
      </div>

      {/* Setup checklist — shown when AI is not yet configured */}
      {!hasAiConfig && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Complete your setup
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-3 text-sm">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span className="text-foreground line-through opacity-60">
                Register your company
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <CheckCircle className={`w-4 h-4 ${hasAiConfig ? 'text-green-400' : 'text-muted-foreground'}`} />
              <span className={hasAiConfig ? 'text-foreground line-through opacity-60' : 'text-foreground'}>
                Configure AI instructions
              </span>
              {!hasAiConfig && (
                <Badge variant="outline" className="text-xs text-primary border-primary/30">
                  Required
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Total Calls"
          value={isLoading ? '—' : totalCalls}
          icon={Phone}
          trend="All time"
          color="primary"
        />
        <StatCard
          title="Completed Calls"
          value={isLoading ? '—' : completedCalls}
          icon={CheckCircle}
          trend="From last calls"
          color="green"
        />
        <StatCard
          title="AI Status"
          value={hasAiConfig ? 'Active' : 'Setup needed'}
          icon={PhoneCall}
          color={hasAiConfig ? 'green' : 'orange'}
        />
      </div>

      {/* Recent calls */}
      <Card className="glass-card border-border">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-base font-semibold">Recent Calls</CardTitle>
          <Link
            to="/calls"
            className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1 transition"
          >
            View All
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : calls.length === 0 ? (
            <div className="text-center py-10">
              <Phone className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="text-muted-foreground text-sm">No calls yet.</p>
              <p className="text-muted-foreground text-xs mt-1">
                Configure your Twilio number to start receiving calls.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {calls.map((call) => (
                <div
                  key={call.id}
                  className="flex items-center justify-between py-3 px-4 rounded-lg bg-secondary/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Phone className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{call.callerNumber}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(call.startedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      call.status === 'COMPLETED'
                        ? 'status-active'
                        : call.status === 'FAILED'
                        ? 'status-error'
                        : 'status-inactive'
                    }
                  >
                    {call.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
