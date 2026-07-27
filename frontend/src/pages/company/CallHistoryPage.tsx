import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Phone, Clock, ChevronLeft, ChevronRight, X,
  CheckCircle, XCircle, PhoneMissed, MessageSquare,
} from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { apiClient } from '@/lib/api'
import type { Call, CallDetail, TranscriptEntry, PaginatedResponse } from '@/lib/types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(seconds: number | null): string {
  if (seconds == null) return '—'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

const STATUS_STYLES: Record<string, string> = {
  COMPLETED: 'status-active',
  FAILED: 'status-error',
  MISSED: 'status-inactive',
  NO_ANSWER: 'status-inactive',
  IN_PROGRESS: 'text-blue-400 bg-blue-400/10 border border-blue-400/20',
}

const STATUS_ICONS: Record<string, React.ElementType> = {
  COMPLETED: CheckCircle,
  FAILED: XCircle,
  MISSED: PhoneMissed,
  NO_ANSWER: PhoneMissed,
  IN_PROGRESS: Phone,
}

// ─── Transcript Modal ─────────────────────────────────────────────────────────
function TranscriptModal({ call, onClose }: { call: Call; onClose: () => void }) {
  const { data: detail, isLoading } = useQuery<CallDetail>({
    queryKey: ['call-detail', call.id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/calls/${call.id}`)
      return data
    },
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl glass-card border border-border rounded-2xl shadow-2xl animate-fade-in flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="font-display font-semibold text-lg text-foreground flex items-center gap-2">
              <MessageSquare size={18} className="text-primary" />
              Call Transcript
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {call.callerNumber} · {formatDate(call.startedAt)}
              {call.duration != null && ` · ${formatDuration(call.duration)}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition p-2 rounded-lg hover:bg-secondary"
          >
            <X size={18} />
          </button>
        </div>

        {/* Transcript body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className={`h-12 ${i % 2 === 0 ? 'w-3/4' : 'w-2/3 ml-auto'}`} />
              ))}
            </div>
          ) : !detail?.transcript || detail.transcript.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="w-8 h-8 text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="text-muted-foreground text-sm">No transcript available for this call.</p>
              {call.status === 'FAILED' && (
                <p className="text-xs text-muted-foreground mt-1">The call failed before audio was captured.</p>
              )}
            </div>
          ) : (
            detail.transcript.map((entry: TranscriptEntry, i: number) => (
              <div
                key={i}
                className={`flex ${entry.role === 'assistant' ? 'justify-start' : 'justify-end'}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    entry.role === 'assistant'
                      ? 'bg-primary/10 border border-primary/20 text-foreground rounded-tl-sm'
                      : 'bg-secondary border border-border text-foreground rounded-tr-sm'
                  }`}
                >
                  <p className={`text-[10px] font-semibold mb-1 ${
                    entry.role === 'assistant' ? 'text-primary' : 'text-muted-foreground'
                  }`}>
                    {entry.role === 'assistant' ? '🤖 AI Agent' : '📞 Caller'}
                  </p>
                  <p>{entry.content}</p>
                  <p className="text-[10px] text-muted-foreground mt-1.5">
                    {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border shrink-0 flex items-center justify-between text-xs text-muted-foreground">
          <span>{detail?.transcript?.length ?? 0} messages</span>
          <Badge className={STATUS_STYLES[call.status] ?? 'status-inactive'}>
            {call.status}
          </Badge>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function CallHistoryPage() {
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedCall, setSelectedCall] = useState<Call | null>(null)
  const LIMIT = 15

  const { data, isLoading } = useQuery<PaginatedResponse<Call>>({
    queryKey: ['calls', page, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) })
      if (statusFilter) params.set('status', statusFilter)
      const { data } = await apiClient.get(`/calls?${params.toString()}`)
      return data
    },
  })

  const calls = data?.data ?? []
  const pagination = data?.pagination
  const totalPages = pagination?.totalPages ?? 1

  return (
    <div className="page-enter space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display font-bold text-2xl text-foreground flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10">
            <Phone className="w-5 h-5 text-primary" />
          </div>
          Call History
        </h1>
        <p className="text-muted-foreground mt-2">
          All calls received by your AI voice agent. Click a row to view the full transcript.
        </p>
      </div>

      {/* Filters + Stats */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-2">
          {['', 'COMPLETED', 'FAILED', 'MISSED', 'NO_ANSWER'].map((s) => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1) }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                statusFilter === s
                  ? 'bg-primary text-white border-primary'
                  : 'bg-secondary border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              {s || 'All'}
            </button>
          ))}
        </div>
        {pagination && (
          <span className="text-sm text-muted-foreground">
            {pagination.total} total call{pagination.total !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Table */}
      <Card className="glass-card border-border overflow-hidden">
        <CardHeader className="pb-0 px-0">
          {/* Column headers */}
          <div className="grid grid-cols-12 gap-3 px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border">
            <div className="col-span-3">Caller</div>
            <div className="col-span-3">Date</div>
            <div className="col-span-2">Duration</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2 text-right">Transcript</div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-0 divide-y divide-border">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="grid grid-cols-12 gap-3 px-5 py-4">
                  <Skeleton className="col-span-3 h-4" />
                  <Skeleton className="col-span-3 h-4" />
                  <Skeleton className="col-span-2 h-4" />
                  <Skeleton className="col-span-2 h-4" />
                  <Skeleton className="col-span-2 h-4 ml-auto w-20" />
                </div>
              ))}
            </div>
          ) : calls.length === 0 ? (
            <div className="text-center py-16">
              <Phone className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="text-muted-foreground text-sm">
                {statusFilter ? `No ${statusFilter.toLowerCase()} calls found.` : 'No calls yet.'}
              </p>
              <p className="text-muted-foreground text-xs mt-1">
                Calls will appear here once your Twilio number starts receiving calls.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {calls.map((call) => {
                const StatusIcon = STATUS_ICONS[call.status] ?? Phone
                return (
                  <div
                    key={call.id}
                    className="grid grid-cols-12 gap-3 px-5 py-4 items-center hover:bg-secondary/30 transition-colors"
                  >
                    {/* Caller */}
                    <div className="col-span-3 flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Phone size={12} className="text-primary" />
                      </div>
                      <span className="text-sm font-mono text-foreground truncate">{call.callerNumber}</span>
                    </div>

                    {/* Date */}
                    <div className="col-span-3 text-sm text-muted-foreground">
                      {formatDate(call.startedAt)}
                    </div>

                    {/* Duration */}
                    <div className="col-span-2 text-sm text-muted-foreground flex items-center gap-1">
                      <Clock size={12} />
                      {formatDuration(call.duration)}
                    </div>

                    {/* Status */}
                    <div className="col-span-2">
                      <Badge className={`text-xs gap-1 ${STATUS_STYLES[call.status] ?? 'status-inactive'}`}>
                        <StatusIcon size={10} />
                        {call.status.replace('_', ' ')}
                      </Badge>
                    </div>

                    {/* Transcript button */}
                    <div className="col-span-2 flex justify-end">
                      <button
                        onClick={() => setSelectedCall(call)}
                        className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition px-2.5 py-1.5 rounded-lg hover:bg-primary/10 border border-primary/20"
                      >
                        <MessageSquare size={12} />
                        View
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1 || isLoading}
            className="border-border text-muted-foreground"
          >
            <ChevronLeft size={14} />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages || isLoading}
            className="border-border text-muted-foreground"
          >
            Next
            <ChevronRight size={14} />
          </Button>
        </div>
      )}

      {/* Transcript Modal */}
      {selectedCall && (
        <TranscriptModal call={selectedCall} onClose={() => setSelectedCall(null)} />
      )}
    </div>
  )
}
