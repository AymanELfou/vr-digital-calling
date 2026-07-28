import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  PhoneCall, Clock, Calendar, Building2,
  FileText, Trash2, ChevronLeft, ChevronRight, X, Phone
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { apiClient, getErrorMessage } from '@/lib/api'
import { toast } from 'sonner'

interface CallRecord {
  id: string
  callerNumber: string
  status: string
  duration: number | null
  transcript: string | Array<{ role: string; content: string; timestamp?: string }> | null
  startedAt: string
  company: {
    id: string
    name: string
  }
}

interface CallsResponse {
  data: CallRecord[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export default function AdminCallsPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedCall, setSelectedCall] = useState<CallRecord | null>(null)

  // Fetch paginated calls (10 per page)
  const { data, isLoading } = useQuery<CallsResponse>({
    queryKey: ['admin-calls', page, statusFilter],
    queryFn: async () => {
      const statusParam = statusFilter !== 'all' ? `&status=${statusFilter}` : ''
      const { data } = await apiClient.get(`/admin/calls?page=${page}&limit=10${statusParam}`)
      return data
    },
  })

  // Delete call record
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiClient.delete(`/admin/calls/${id}`),
    onSuccess: () => {
      toast.success('Call log deleted')
      qc.invalidateQueries({ queryKey: ['admin-calls'] })
      qc.invalidateQueries({ queryKey: ['admin-stats'] })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const calls = data?.data ?? []
  const pagination = data?.pagination ?? { page: 1, limit: 10, total: 0, totalPages: 1 }

  // Helper to format transcript
  const parseTranscript = (raw: CallRecord['transcript']) => {
    if (!raw) return []
    if (Array.isArray(raw)) return raw
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) return parsed
      } catch {
        return [{ role: 'system', content: raw }]
      }
    }
    return []
  }

  return (
    <div className="page-enter space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-foreground flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/15 border border-primary/20">
              <PhoneCall className="w-5 h-5 text-primary" />
            </div>
            Platform Calls Log
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Monitor and inspect all incoming AI voice calls across all companies.
          </p>
        </div>
        <Badge variant="outline" className="text-xs text-primary border-primary/30 py-1 px-3">
          {pagination.total} Total Calls
        </Badge>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-secondary/40 border border-border p-2 rounded-xl">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {(['all', 'COMPLETED', 'FAILED', 'MISSED'] as const).map((st) => (
            <button
              key={st}
              onClick={() => {
                setStatusFilter(st)
                setPage(1)
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all shrink-0 ${
                statusFilter === st
                  ? 'bg-primary text-white shadow-sm font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}
            >
              {st === 'all' ? 'All Statuses' : st}
            </button>
          ))}
        </div>
        <span className="text-xs text-muted-foreground px-2 font-medium hidden sm:inline">
          Showing 10 calls per page
        </span>
      </div>

      {/* Calls Table */}
      <Card className="glass-card border-border overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : calls.length === 0 ? (
            <div className="text-center py-16">
              <PhoneCall className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="text-muted-foreground text-sm">No call logs found.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {calls.map((call) => (
                <div key={call.id} className="p-4 sm:p-5 hover:bg-secondary/30 transition-colors">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Left: Company & Caller Info */}
                    <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                        <Phone size={18} />
                      </div>
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <Badge variant="outline" className="text-xs text-foreground border-border bg-secondary font-medium">
                            <Building2 size={11} className="mr-1 text-primary" />
                            {call.company?.name ?? 'Unknown Company'}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={
                              call.status === 'COMPLETED'
                                ? 'text-green-400 border-green-400/30 bg-green-400/10 text-xs'
                                : 'text-red-400 border-red-400/30 bg-red-400/10 text-xs'
                            }
                          >
                            {call.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-3 flex-wrap">
                          <span>Caller: <strong className="text-foreground font-mono">{call.callerNumber}</strong></span>
                          <span className="flex items-center gap-1">
                            <Clock size={11} />
                            Duration: <strong className="text-foreground font-mono">{call.duration ? `${call.duration}s` : '0s'}</strong>
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar size={11} />
                            {new Date(call.startedAt).toLocaleString()}
                          </span>
                        </p>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedCall(call)}
                        className="text-xs border-border hover:bg-primary/10 hover:text-primary hover:border-primary/40"
                      >
                        <FileText className="w-3.5 h-3.5 mr-1.5 text-primary" />
                        View Transcript
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (confirm('Delete this call log record?')) {
                            deleteMutation.mutate(call.id)
                          }
                        }}
                        disabled={deleteMutation.isPending}
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
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

      {/* Pagination Bar (10 calls per page) */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">
            Page <strong className="text-foreground">{pagination.page}</strong> of <strong className="text-foreground">{pagination.totalPages}</strong> ({pagination.total} calls)
          </p>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="text-xs border-border"
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page >= pagination.totalPages}
              className="text-xs border-border"
            >
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Transcript Modal */}
      {selectedCall && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-2xl glass-card border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-border flex items-center justify-between bg-secondary/50">
              <div>
                <h3 className="font-bold text-foreground text-base flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  Call Transcript
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Company: <strong className="text-foreground">{selectedCall.company?.name}</strong> • Caller: <strong className="text-foreground font-mono">{selectedCall.callerNumber}</strong>
                </p>
              </div>
              <Button size="icon" variant="ghost" onClick={() => setSelectedCall(null)} className="h-8 w-8 text-muted-foreground hover:text-foreground">
                <X size={16} />
              </Button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto space-y-3 flex-1 font-sans text-xs">
              {parseTranscript(selectedCall.transcript).length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  No detailed turn-by-turn audio transcript captured for this call session.
                </div>
              ) : (
                parseTranscript(selectedCall.transcript).map((turn, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl max-w-[85%] ${
                      turn.role === 'user'
                        ? 'bg-secondary text-foreground ml-auto border border-border/50'
                        : 'bg-primary/10 border border-primary/20 text-foreground mr-auto'
                    }`}
                  >
                    <p className="text-[10px] font-bold uppercase tracking-wider mb-1 opacity-70">
                      {turn.role === 'user' ? '👤 Caller' : '🤖 AI Receptionist'}
                    </p>
                    <p className="text-xs leading-relaxed">{turn.content}</p>
                  </div>
                ))
              )}
            </div>

            <div className="p-3 border-t border-border bg-secondary/30 text-right">
              <Button size="sm" variant="outline" onClick={() => setSelectedCall(null)} className="text-xs border-border">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
