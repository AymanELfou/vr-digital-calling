import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  BookOpen, Plus, Search, Pencil, Trash2, Loader2,
  ChevronDown, X, Tag, CheckCircle,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { apiClient, getErrorMessage } from '@/lib/api'
import { toast } from 'sonner'
import type { KnowledgeBaseEntry } from '@/lib/types'

// ─── Entry Modal ──────────────────────────────────────────────────────────────
function EntryModal({
  entry,
  onClose,
  onSave,
  saving,
}: {
  entry: Partial<KnowledgeBaseEntry> | null
  onClose: () => void
  onSave: (data: { question: string; answer: string; category: string }) => void
  saving: boolean
}) {
  const [question, setQuestion] = useState(entry?.question ?? '')
  const [answer, setAnswer] = useState(entry?.answer ?? '')
  const [category, setCategory] = useState(entry?.category ?? '')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg glass-card border border-border rounded-2xl p-6 space-y-5 shadow-2xl animate-fade-in">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-semibold text-lg text-foreground">
            {entry?.id ? 'Edit Entry' : 'New Knowledge Entry'}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition p-1 rounded-lg hover:bg-secondary">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Question / Topic <span className="text-primary">*</span></label>
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. What are your opening hours?"
              className="w-full rounded-lg bg-secondary border border-border px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Answer <span className="text-primary">*</span></label>
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              rows={5}
              placeholder="e.g. We are open Monday to Friday from 9am to 6pm, and Saturday from 10am to 4pm."
              className="w-full rounded-lg bg-secondary border border-border px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition resize-none"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Category</label>
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Hours, Pricing, Location, Services"
              className="w-full rounded-lg bg-secondary border border-border px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-1">
          <Button variant="outline" onClick={onClose} className="flex-1 border-border text-muted-foreground">
            Cancel
          </Button>
          <Button
            className="flex-1 bg-primary hover:bg-primary/90 btn-glow"
            onClick={() => onSave({ question, answer, category })}
            disabled={!question.trim() || !answer.trim() || saving}
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
            {entry?.id ? 'Update' : 'Add Entry'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function KnowledgeBasePage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [editingEntry, setEditingEntry] = useState<Partial<KnowledgeBaseEntry> | null | false>(false)

  // Load entries
  const { data: entries = [], isLoading } = useQuery<KnowledgeBaseEntry[]>({
    queryKey: ['knowledge-base'],
    queryFn: async () => {
      const { data } = await apiClient.get('/knowledge-base')
      return data
    },
  })

  // Create
  const createMutation = useMutation({
    mutationFn: async (payload: { question: string; answer: string; category: string }) => {
      const { data } = await apiClient.post('/knowledge-base', payload)
      return data
    },
    onSuccess: () => { toast.success('Entry added'); qc.invalidateQueries({ queryKey: ['knowledge-base'] }); setEditingEntry(false) },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  // Update
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...payload }: { id: string; question: string; answer: string; category: string }) => {
      const { data } = await apiClient.put(`/knowledge-base/${id}`, payload)
      return data
    },
    onSuccess: () => { toast.success('Entry updated'); qc.invalidateQueries({ queryKey: ['knowledge-base'] }); setEditingEntry(false) },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  // Delete
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiClient.delete(`/knowledge-base/${id}`),
    onSuccess: () => { toast.success('Entry deleted'); qc.invalidateQueries({ queryKey: ['knowledge-base'] }) },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  // Derived state
  const categories = [...new Set(entries.map((e) => e.category).filter(Boolean))] as string[]
  const filtered = entries.filter((e) => {
    const matchSearch =
      !search ||
      e.question.toLowerCase().includes(search.toLowerCase()) ||
      e.answer.toLowerCase().includes(search.toLowerCase())
    const matchCat = !categoryFilter || e.category === categoryFilter
    return matchSearch && matchCat
  })

  const handleSave = (data: { question: string; answer: string; category: string }) => {
    if (!editingEntry) return
    if ((editingEntry as KnowledgeBaseEntry).id) {
      updateMutation.mutate({ id: (editingEntry as KnowledgeBaseEntry).id, ...data })
    } else {
      createMutation.mutate(data)
    }
  }

  return (
    <div className="page-enter space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl text-foreground flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <BookOpen className="w-5 h-5 text-primary" />
            </div>
            Knowledge Base
          </h1>
          <p className="text-muted-foreground mt-2">
            FAQ and knowledge entries the AI uses to answer callers accurately.
          </p>
        </div>
        <Button
          className="bg-primary hover:bg-primary/90 btn-glow shrink-0"
          onClick={() => setEditingEntry({})}
        >
          <Plus size={15} />
          Add Entry
        </Button>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-primary" />
          {entries.length} total entries
        </span>
        {categories.length > 0 && (
          <span className="flex items-center gap-1.5">
            <Tag size={13} />
            {categories.length} categories
          </span>
        )}
        {entries.length >= 40 && (
          <Badge variant="outline" className="text-orange-400 border-orange-400/30 text-xs">
            Nearing limit (50 max)
          </Badge>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search questions or answers..."
            className="w-full rounded-lg bg-secondary border border-border pl-9 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X size={14} />
            </button>
          )}
        </div>
        {categories.length > 0 && (
          <div className="relative">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-lg bg-secondary border border-border px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition appearance-none pr-8 min-w-[140px]"
            >
              <option value="">All categories</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          </div>
        )}
      </div>

      {/* Entries list */}
      <Card className="glass-card border-border">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <BookOpen className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="text-muted-foreground text-sm">
                {search || categoryFilter ? 'No entries match your filters.' : 'No knowledge entries yet.'}
              </p>
              {!search && !categoryFilter && (
                <Button variant="ghost" className="mt-3 text-primary" onClick={() => setEditingEntry({})}>
                  <Plus size={14} /> Add your first entry
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((entry) => (
                <div key={entry.id} className="p-4 hover:bg-secondary/30 transition-colors group">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {entry.category && (
                          <Badge variant="outline" className="text-xs border-border text-muted-foreground px-1.5 py-0">
                            {entry.category}
                          </Badge>
                        )}
                        {!entry.isActive && (
                          <Badge variant="outline" className="text-xs status-inactive">Inactive</Badge>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-foreground">Q: {entry.question}</p>
                      <p className="text-sm text-muted-foreground mt-1 leading-relaxed line-clamp-3">
                        A: {entry.answer}
                      </p>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        onClick={() => setEditingEntry(entry)}
                        className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Delete this entry?')) deleteMutation.mutate(entry.id)
                        }}
                        className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal */}
      {editingEntry !== false && (
        <EntryModal
          entry={editingEntry}
          onClose={() => setEditingEntry(false)}
          onSave={handleSave}
          saving={createMutation.isPending || updateMutation.isPending}
        />
      )}
    </div>
  )
}
