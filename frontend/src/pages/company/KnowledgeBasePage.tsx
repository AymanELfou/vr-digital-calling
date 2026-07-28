import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  BookOpen, Plus, Search, Pencil, Trash2, Loader2,
  ChevronDown, ChevronLeft, ChevronRight, X, Tag, CheckCircle,
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
  customCategories,
}: {
  entry: Partial<KnowledgeBaseEntry> | null
  onClose: () => void
  onSave: (data: { question: string; answer: string; category: string }) => void
  saving: boolean
  customCategories: string[]
}) {
  const [question, setQuestion] = useState(entry?.question ?? '')
  const [answer, setAnswer] = useState(entry?.answer ?? '')
  const [category, setCategory] = useState(entry?.category ?? '')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg glass-card border border-border rounded-2xl p-6 space-y-5 shadow-2xl animate-fade-in">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-semibold text-lg text-foreground">
            {entry?.id ? 'Edit Entry' : 'Add Knowledge Entry'}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition p-1 rounded-lg hover:bg-secondary">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Question / Trigger <span className="text-primary">*</span></label>
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. What are your business hours?"
              className="w-full rounded-lg bg-secondary border border-border px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Answer / Information <span className="text-primary">*</span></label>
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              rows={4}
              placeholder="e.g. We are open Monday to Friday from 9 AM to 6 PM."
              className="w-full rounded-lg bg-secondary border border-border px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition resize-none"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg bg-secondary border border-border px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition appearance-none"
            >
              <option value="">Select a category</option>
              {customCategories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-3 justify-end pt-2">
          <Button variant="outline" onClick={onClose} disabled={saving} className="border-border text-muted-foreground">
            Cancel
          </Button>
          <Button
            className="bg-primary hover:bg-primary/90 btn-glow"
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
  const [page, setPage] = useState(1)

  // Custom categories list (filtering out 'hours' case-insensitively)
  const [customCategories, setCustomCategories] = useState<string[]>(() => {
    const saved = localStorage.getItem('kb_categories')
    const parsed: string[] = saved ? JSON.parse(saved) : ['Pricing', 'Location', 'Services']
    return parsed.filter((c) => c.trim().toLowerCase() !== 'hours')
  })

  const [isAddCatOpen, setIsAddCatOpen] = useState(false)
  const [newCatName, setNewCatName] = useState('')

  // Load entries
  const { data: entries = [], isLoading } = useQuery<KnowledgeBaseEntry[]>({
    queryKey: ['knowledge-base'],
    queryFn: async () => {
      const { data } = await apiClient.get('/knowledge-base')
      return data
    },
  })

  // Synchronize categories & filter out 'hours'
  useEffect(() => {
    if (entries.length > 0) {
      const dbCategories = [...new Set(entries.map((e) => e.category).filter(Boolean))] as string[]
      setCustomCategories((prev) => {
        const merged = [...new Set([...prev, ...dbCategories])].filter(
          (c) => c.trim().toLowerCase() !== 'hours',
        )
        localStorage.setItem('kb_categories', JSON.stringify(merged))
        return merged
      })
    }
  }, [entries])

  // Reset page to 1 on filter changes
  useEffect(() => {
    setPage(1)
  }, [search, categoryFilter])

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
      const { data } = await apiClient.patch(`/knowledge-base/${id}`, payload)
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
  const categories = customCategories
  const filtered = entries.filter((e) => {
    const matchSearch =
      !search ||
      e.question.toLowerCase().includes(search.toLowerCase()) ||
      e.answer.toLowerCase().includes(search.toLowerCase())
    const matchCat = !categoryFilter || e.category === categoryFilter
    return matchSearch && matchCat
  })

  // Pagination (5 entries per page)
  const ITEMS_PER_PAGE = 5
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
  const paginatedEntries = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-foreground flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <BookOpen className="w-5 h-5 text-primary" />
            </div>
            Knowledge Base
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            FAQ and knowledge entries the AI uses to answer callers accurately.
          </p>
        </div>
        <div className="flex gap-2 shrink-0 w-full sm:w-auto">
          <Button
            variant="outline"
            className="border-border text-muted-foreground hover:text-foreground flex-1 sm:flex-none"
            onClick={() => setIsAddCatOpen(true)}
          >
            <Tag size={15} />
            Add Category
          </Button>
          <Button
            className="bg-primary hover:bg-primary/90 btn-glow flex-1 sm:flex-none"
            onClick={() => setEditingEntry({})}
          >
            <Plus size={15} />
            Add Entry
          </Button>
        </div>
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
      <div className="flex flex-col sm:flex-row gap-3">
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
              className="w-full sm:w-auto rounded-lg bg-secondary border border-border px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition appearance-none pr-8 min-w-[140px]"
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
          ) : paginatedEntries.length === 0 ? (
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
              {paginatedEntries.map((entry) => (
                <div key={entry.id} className="p-4 sm:p-5 hover:bg-secondary/30 transition-colors group">
                  <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        {entry.category && (
                          <Badge variant="outline" className="text-xs border-border text-muted-foreground px-2 py-0.5">
                            {entry.category}
                          </Badge>
                        )}
                        {!entry.isActive && (
                          <Badge variant="outline" className="text-xs status-inactive">Inactive</Badge>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-foreground break-words">Q: {entry.question}</p>
                      <p className="text-sm text-muted-foreground leading-relaxed break-words">
                        A: {entry.answer}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0 self-end sm:self-start opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setEditingEntry(entry)}
                        className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition"
                        title="Edit"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Delete this entry?')) deleteMutation.mutate(entry.id)
                        }}
                        className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition"
                        title="Delete"
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

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground px-1">
          <span>
            Page <strong className="text-foreground">{page}</strong> of{' '}
            <strong className="text-foreground">{totalPages}</strong> ({filtered.length} items)
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="border-border text-muted-foreground"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="border-border text-muted-foreground"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Entry Modal */}
      {editingEntry !== false && (
        <EntryModal
          entry={editingEntry}
          onClose={() => setEditingEntry(false)}
          onSave={handleSave}
          saving={createMutation.isPending || updateMutation.isPending}
          customCategories={customCategories}
        />
      )}

      {/* Category Creation Modal */}
      {isAddCatOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm glass-card border border-border rounded-2xl p-6 space-y-4 shadow-2xl animate-fade-in flex flex-col">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-semibold text-lg text-foreground">Create Category</h2>
              <button onClick={() => { setIsAddCatOpen(false); setNewCatName('') }} className="text-muted-foreground hover:text-foreground transition p-1 rounded-lg hover:bg-secondary">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Category Name</label>
              <input
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="e.g. Policies, Refund..."
                className="w-full rounded-lg bg-secondary border border-border px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setIsAddCatOpen(false); setNewCatName('') }} className="flex-1 border-border text-muted-foreground">
                Cancel
              </Button>
              <Button
                className="flex-1 bg-primary hover:bg-primary/90 btn-glow"
                onClick={() => {
                  const trimmed = newCatName.trim()
                  if (!trimmed) return
                  if (trimmed.toLowerCase() === 'hours') {
                    toast.error("'Hours' category is restricted")
                    return
                  }
                  if (customCategories.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
                    toast.error('Category already exists (case-insensitive)')
                    return
                  }
                  const updated = [...customCategories, trimmed]
                  setCustomCategories(updated)
                  localStorage.setItem('kb_categories', JSON.stringify(updated))
                  setIsAddCatOpen(false)
                  setNewCatName('')
                  toast.success('Category created')
                }}
                disabled={!newCatName.trim()}
              >
                Create
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
