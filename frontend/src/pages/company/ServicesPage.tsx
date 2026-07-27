import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Briefcase, Plus, Pencil, Trash2, Loader2, X, CheckCircle, DollarSign, Clock,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { apiClient, getErrorMessage } from '@/lib/api'
import { toast } from 'sonner'
import type { Service } from '@/lib/types'

// ─── Service Modal ─────────────────────────────────────────────────────────────
function ServiceModal({
  service, onClose, onSave, saving,
}: {
  service: Partial<Service> | null
  onClose: () => void
  onSave: (data: { name: string; description: string; price: string; duration: string }) => void
  saving: boolean
}) {
  const [name, setName] = useState(service?.name ?? '')
  const [description, setDescription] = useState(service?.description ?? '')
  const [price, setPrice] = useState(service?.price != null ? String(service.price) : '')
  const [duration, setDuration] = useState(service?.duration ?? '')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md glass-card border border-border rounded-2xl p-6 space-y-5 shadow-2xl animate-fade-in">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-semibold text-lg text-foreground">
            {service?.id ? 'Edit Service' : 'Add Service'}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition p-1 rounded-lg hover:bg-secondary">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Service Name <span className="text-primary">*</span></label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Initial Consultation"
              className="w-full rounded-lg bg-secondary border border-border px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Brief description of what this service includes..."
              className="w-full rounded-lg bg-secondary border border-border px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground flex items-center gap-1">
                <DollarSign size={13} /> Price
              </label>
              <input
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                className="w-full rounded-lg bg-secondary border border-border px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground flex items-center gap-1">
                <Clock size={13} /> Duration
              </label>
              <input
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="e.g. 30 min, 1 hour"
                className="w-full rounded-lg bg-secondary border border-border px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-1">
          <Button variant="outline" onClick={onClose} className="flex-1 border-border text-muted-foreground">
            Cancel
          </Button>
          <Button
            className="flex-1 bg-primary hover:bg-primary/90 btn-glow"
            onClick={() => onSave({ name, description, price, duration })}
            disabled={!name.trim() || saving}
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
            {service?.id ? 'Update' : 'Add Service'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function ServicesPage() {
  const qc = useQueryClient()
  const [editingService, setEditingService] = useState<Partial<Service> | null | false>(false)

  const { data: services = [], isLoading } = useQuery<Service[]>({
    queryKey: ['services'],
    queryFn: async () => {
      const { data } = await apiClient.get('/services')
      return data
    },
  })

  const createMutation = useMutation({
    mutationFn: async (payload: { name: string; description: string; price: string; duration: string }) => {
      const { data } = await apiClient.post('/services', {
        ...payload,
        price: payload.price ? parseFloat(payload.price) : null,
        duration: payload.duration || null,
        description: payload.description || null,
      })
      return data
    },
    onSuccess: () => { toast.success('Service added'); qc.invalidateQueries({ queryKey: ['services'] }); setEditingService(false) },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...payload }: { id: string; name: string; description: string; price: string; duration: string }) => {
      const { data } = await apiClient.put(`/services/${id}`, {
        ...payload,
        price: payload.price ? parseFloat(payload.price) : null,
        duration: payload.duration || null,
        description: payload.description || null,
      })
      return data
    },
    onSuccess: () => { toast.success('Service updated'); qc.invalidateQueries({ queryKey: ['services'] }); setEditingService(false) },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { data } = await apiClient.put(`/services/${id}`, { isActive })
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['services'] }),
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiClient.delete(`/services/${id}`),
    onSuccess: () => { toast.success('Service deleted'); qc.invalidateQueries({ queryKey: ['services'] }) },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  const handleSave = (data: { name: string; description: string; price: string; duration: string }) => {
    if (!editingService) return
    if ((editingService as Service).id) {
      updateMutation.mutate({ id: (editingService as Service).id, ...data })
    } else {
      createMutation.mutate(data)
    }
  }

  const activeCount = services.filter((s) => s.isActive).length

  return (
    <div className="page-enter space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl text-foreground flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <Briefcase className="w-5 h-5 text-primary" />
            </div>
            Services
          </h1>
          <p className="text-muted-foreground mt-2">
            Your service catalog. Active services are shared with the AI to inform callers.
          </p>
        </div>
        <Button
          className="bg-primary hover:bg-primary/90 btn-glow shrink-0"
          onClick={() => setEditingService({})}
        >
          <Plus size={15} />
          Add Service
        </Button>
      </div>

      {/* Summary */}
      {services.length > 0 && (
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-primary" />
            {services.length} total
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-400" />
            {activeCount} active (visible to AI)
          </span>
        </div>
      )}

      {/* Services grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : services.length === 0 ? (
        <Card className="glass-card border-border">
          <CardContent className="text-center py-16">
            <Briefcase className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-muted-foreground text-sm">No services yet.</p>
            <p className="text-muted-foreground text-xs mt-1">
              Add your services so the AI can inform callers about what you offer.
            </p>
            <Button variant="ghost" className="mt-4 text-primary" onClick={() => setEditingService({})}>
              <Plus size={14} /> Add your first service
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {services.map((service) => (
            <Card
              key={service.id}
              className={`glass-card border transition-all ${
                service.isActive ? 'border-border' : 'border-border/40 opacity-60'
              }`}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <h3 className="font-semibold text-foreground text-sm truncate">{service.name}</h3>
                      {!service.isActive && (
                        <Badge variant="outline" className="status-inactive text-xs">Inactive</Badge>
                      )}
                    </div>
                    {service.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{service.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs text-muted-foreground mb-4">
                  {service.price != null && (
                    <span className="flex items-center gap-1 text-primary font-semibold">
                      <DollarSign size={12} />
                      {service.price.toFixed(2)}
                    </span>
                  )}
                  {service.duration && (
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {service.duration}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {/* Active toggle */}
                  <button
                    onClick={() => toggleActiveMutation.mutate({ id: service.id, isActive: !service.isActive })}
                    className={`flex-1 text-xs py-1.5 rounded-lg border transition-all font-medium ${
                      service.isActive
                        ? 'border-green-400/30 bg-green-400/10 text-green-400 hover:bg-green-400/20'
                        : 'border-border bg-secondary text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {service.isActive ? '✓ Active' : 'Inactive'}
                  </button>
                  <button
                    onClick={() => setEditingService(service)}
                    className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Delete this service?')) deleteMutation.mutate(service.id)
                    }}
                    className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {editingService !== false && (
        <ServiceModal
          service={editingService}
          onClose={() => setEditingService(false)}
          onSave={handleSave}
          saving={createMutation.isPending || updateMutation.isPending}
        />
      )}
    </div>
  )
}
