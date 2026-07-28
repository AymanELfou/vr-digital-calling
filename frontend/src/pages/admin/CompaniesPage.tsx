import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Building2, Search, X, CheckCircle, XCircle, Trash2,
  Phone, Briefcase, BookOpen, Calendar
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { apiClient, getErrorMessage } from '@/lib/api'
import { toast } from 'sonner'

interface AdminCompany {
  id: string
  name: string
  description?: string | null
  address?: string | null
  website?: string | null
  email?: string | null
  phone?: string | null
  isActive: boolean
  createdAt: string
  user: {
    email: string
    createdAt: string
    isActive: boolean
  }
  _count: {
    calls: number
    services: number
    knowledgeBase: number
  }
}

export default function CompaniesPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all')

  // Fetch companies list
  const { data: companies = [], isLoading } = useQuery<AdminCompany[]>({
    queryKey: ['admin-companies'],
    queryFn: async () => {
      const { data } = await apiClient.get('/admin/companies')
      return data
    },
  })

  // Toggle company active / suspended status
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { data } = await apiClient.patch(`/admin/companies/${id}/status`, { isActive })
      return data
    },
    onSuccess: (res) => {
      toast.success(res.message || 'Status updated')
      qc.invalidateQueries({ queryKey: ['admin-companies'] })
      qc.invalidateQueries({ queryKey: ['admin-stats'] })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  // Delete company
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiClient.delete(`/admin/companies/${id}`),
    onSuccess: () => {
      toast.success('Company deleted successfully')
      qc.invalidateQueries({ queryKey: ['admin-companies'] })
      qc.invalidateQueries({ queryKey: ['admin-stats'] })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  // Filtered companies
  const filtered = companies.filter((c) => {
    const matchSearch =
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.user.email.toLowerCase().includes(search.toLowerCase()) ||
      (c.phone && c.phone.includes(search))
    const matchStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && c.isActive) ||
      (statusFilter === 'suspended' && !c.isActive)
    return matchSearch && matchStatus
  })

  return (
    <div className="page-enter space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-foreground flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/15 border border-primary/20">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            Company Management
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage registered companies, monitor usage stats, and suspend or activate accounts.
          </p>
        </div>
        <Badge variant="outline" className="text-xs text-primary border-primary/30 py-1 px-3">
          {companies.length} Total Registered
        </Badge>
      </div>

      {/* Search & Status Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by company name, email, or phone..."
            className="w-full rounded-lg bg-secondary border border-border pl-9 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex gap-1.5 bg-secondary border border-border rounded-lg p-1 shrink-0">
          {(['all', 'active', 'suspended'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-all ${
                statusFilter === st
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Companies List */}
      <Card className="glass-card border-border overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <Building2 className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="text-muted-foreground text-sm">
                {search || statusFilter !== 'all' ? 'No companies match your filters.' : 'No companies registered yet.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((comp) => (
                <div key={comp.id} className="p-4 sm:p-5 hover:bg-secondary/30 transition-colors group">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Left: Avatar + Company Info */}
                    <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-brand flex items-center justify-center text-white font-bold text-lg shrink-0 shadow-md">
                        {comp.name[0]?.toUpperCase() ?? 'C'}
                      </div>
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <h3 className="font-bold text-foreground text-base truncate">{comp.name}</h3>
                          <Badge
                            variant="outline"
                            className={
                              comp.isActive
                                ? 'text-green-400 border-green-400/30 bg-green-400/10 text-xs'
                                : 'text-red-400 border-red-400/30 bg-red-400/10 text-xs'
                            }
                          >
                            {comp.isActive ? 'Active' : 'Suspended'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-3 flex-wrap">
                          <span>Email: <strong className="text-foreground font-mono">{comp.user.email}</strong></span>
                          {comp.phone && <span>Phone: <strong className="text-foreground font-mono">{comp.phone}</strong></span>}
                          <span className="flex items-center gap-1">
                            <Calendar size={11} />
                            Joined {new Date(comp.createdAt).toLocaleDateString()}
                          </span>
                        </p>
                      </div>
                    </div>

                    {/* Middle: Usage Metrics */}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground bg-secondary/50 p-2.5 rounded-xl border border-border/40 shrink-0">
                      <span className="flex items-center gap-1.5">
                        <Phone size={13} className="text-primary" />
                        <strong className="text-foreground font-mono">{comp._count.calls}</strong> calls
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Briefcase size={13} className="text-blue-400" />
                        <strong className="text-foreground font-mono">{comp._count.services}</strong> services
                      </span>
                      <span className="flex items-center gap-1.5">
                        <BookOpen size={13} className="text-purple-400" />
                        <strong className="text-foreground font-mono">{comp._count.knowledgeBase}</strong> FAQs
                      </span>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleStatusMutation.mutate({ id: comp.id, isActive: !comp.isActive })}
                        disabled={toggleStatusMutation.isPending}
                        className={`text-xs border ${
                          comp.isActive
                            ? 'border-red-400/30 text-red-400 hover:bg-red-400/10'
                            : 'border-green-400/30 text-green-400 hover:bg-green-400/10'
                        }`}
                      >
                        {comp.isActive ? (
                          <>
                            <XCircle className="w-3.5 h-3.5 mr-1" />
                            Suspend
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-3.5 h-3.5 mr-1" />
                            Activate
                          </>
                        )}
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (confirm(`Delete "${comp.name}" and all its data? This action cannot be undone.`)) {
                            deleteMutation.mutate(comp.id)
                          }
                        }}
                        disabled={deleteMutation.isPending}
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        title="Delete Company"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
