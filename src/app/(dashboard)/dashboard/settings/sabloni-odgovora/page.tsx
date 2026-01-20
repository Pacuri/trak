'use client'

import { useState, useEffect } from 'react'
import { useOrganization } from '@/hooks/use-organization'
import { createClient } from '@/lib/supabase/client'
import {
  MessageSquare, Plus, Edit2, Trash2, Save, X, Check,
  ChevronDown, ChevronUp, Info, RefreshCw
} from 'lucide-react'
import Link from 'next/link'

interface ResponseTemplate {
  id: string
  template_type: 'can_organize' | 'cannot_organize' | 'need_more_info' | 'custom'
  name: string
  subject: string
  body: string
  is_default: boolean
  is_active: boolean
  position: number
}

const TEMPLATE_TYPES = {
  can_organize: { label: 'Možemo da organizujemo', color: 'bg-[#ECFDF5] text-[#10B981]', icon: '✓' },
  cannot_organize: { label: 'Ne možemo', color: 'bg-[#FEF2F2] text-[#EF4444]', icon: '✗' },
  need_more_info: { label: 'Potrebno više informacija', color: 'bg-[#FEF3C7] text-[#F59E0B]', icon: '?' },
  custom: { label: 'Prilagođeni', color: 'bg-[#F1F5F9] text-[#64748B]', icon: '✎' },
}

const AVAILABLE_VARIABLES = [
  { key: '{{ime}}', description: 'Ime klijenta' },
  { key: '{{prezime}}', description: 'Prezime klijenta' },
  { key: '{{destinacija}}', description: 'Destinacija' },
  { key: '{{datum_polaska}}', description: 'Datum polaska' },
  { key: '{{paket}}', description: 'Naziv paketa' },
  { key: '{{broj_putnika}}', description: 'Broj putnika' },
  { key: '{{agencija}}', description: 'Naziv agencije' },
  { key: '{{agent}}', description: 'Ime agenta' },
  { key: '{{telefon_agencije}}', description: 'Telefon agencije' },
  { key: '{{email_agencije}}', description: 'Email agencije' },
]

export default function ResponseTemplatesPage() {
  const { organization } = useOrganization()
  const [templates, setTemplates] = useState<ResponseTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [editingTemplate, setEditingTemplate] = useState<ResponseTemplate | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showVariables, setShowVariables] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (organization?.id) {
      loadTemplates()
    }
  }, [organization?.id])

  const loadTemplates = async () => {
    if (!organization?.id) return

    const { data, error } = await supabase
      .from('response_templates')
      .select('*')
      .eq('organization_id', organization.id)
      .order('position', { ascending: true })

    if (data && !error) {
      setTemplates(data)
    }
    setLoading(false)
  }

  const handleCreate = () => {
    setEditingTemplate({
      id: '',
      template_type: 'custom',
      name: '',
      subject: '',
      body: '',
      is_default: false,
      is_active: true,
      position: templates.length,
    })
    setIsCreating(true)
  }

  const handleEdit = (template: ResponseTemplate) => {
    setEditingTemplate({ ...template })
    setIsCreating(false)
  }

  const handleCancel = () => {
    setEditingTemplate(null)
    setIsCreating(false)
  }

  const handleSave = async () => {
    if (!editingTemplate || !organization?.id) return

    setSaving(true)

    if (isCreating) {
      const { error } = await supabase
        .from('response_templates')
        .insert({
          organization_id: organization.id,
          template_type: editingTemplate.template_type,
          name: editingTemplate.name,
          subject: editingTemplate.subject,
          body: editingTemplate.body,
          is_default: editingTemplate.is_default,
          is_active: editingTemplate.is_active,
          position: editingTemplate.position,
        })

      if (!error) {
        await loadTemplates()
        handleCancel()
      }
    } else {
      const { error } = await supabase
        .from('response_templates')
        .update({
          name: editingTemplate.name,
          subject: editingTemplate.subject,
          body: editingTemplate.body,
          is_default: editingTemplate.is_default,
          is_active: editingTemplate.is_active,
        })
        .eq('id', editingTemplate.id)

      if (!error) {
        await loadTemplates()
        handleCancel()
      }
    }

    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Da li ste sigurni da želite da obrišete ovaj šablon?')) return

    const { error } = await supabase
      .from('response_templates')
      .delete()
      .eq('id', id)

    if (!error) {
      await loadTemplates()
    }
  }

  const handleSetDefault = async (template: ResponseTemplate) => {
    // First, unset default for this type
    await supabase
      .from('response_templates')
      .update({ is_default: false })
      .eq('organization_id', organization?.id)
      .eq('template_type', template.template_type)

    // Then set this one as default
    const { error } = await supabase
      .from('response_templates')
      .update({ is_default: true })
      .eq('id', template.id)

    if (!error) {
      await loadTemplates()
    }
  }

  const insertVariable = (variable: string) => {
    if (!editingTemplate) return

    const textarea = document.getElementById('template-body') as HTMLTextAreaElement
    if (textarea) {
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const newBody =
        editingTemplate.body.substring(0, start) +
        variable +
        editingTemplate.body.substring(end)
      setEditingTemplate({ ...editingTemplate, body: newBody })

      // Set cursor position after inserted variable
      setTimeout(() => {
        textarea.focus()
        textarea.setSelectionRange(start + variable.length, start + variable.length)
      }, 0)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1E293B]">Šabloni odgovora</h1>
          <p className="mt-1 text-sm text-[#64748B]">Prilagodite email šablone za odgovore na upite</p>
        </div>
        <button
          onClick={handleCreate}
          className="inline-flex items-center gap-2 rounded-[10px] bg-[#3B82F6] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#2563EB] transition-all"
        >
          <Plus className="h-4 w-4" />
          Novi šablon
        </button>
      </div>

      {/* Variables Help */}
      <div className="rounded-[14px] bg-[#F0F9FF] border border-[#3B82F6]/20 p-4">
        <button
          onClick={() => setShowVariables(!showVariables)}
          className="flex items-center justify-between w-full text-left"
        >
          <div className="flex items-center gap-2">
            <Info className="h-5 w-5 text-[#3B82F6]" />
            <span className="text-sm font-medium text-[#1E293B]">Dostupne promenljive</span>
          </div>
          {showVariables ? (
            <ChevronUp className="h-4 w-4 text-[#64748B]" />
          ) : (
            <ChevronDown className="h-4 w-4 text-[#64748B]" />
          )}
        </button>
        {showVariables && (
          <div className="mt-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
            {AVAILABLE_VARIABLES.map((v) => (
              <div
                key={v.key}
                className="rounded-[8px] bg-white px-3 py-2 text-xs border border-[#E2E8F0]"
              >
                <code className="text-[#3B82F6] font-mono">{v.key}</code>
                <p className="text-[#64748B] mt-0.5">{v.description}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-[#64748B]" />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Edit/Create Modal */}
          {editingTemplate && (
            <div className="rounded-[14px] bg-white border-2 border-[#3B82F6] shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-[#1E293B]">
                  {isCreating ? 'Novi šablon' : 'Uredi šablon'}
                </h3>
                <button
                  onClick={handleCancel}
                  className="p-2 hover:bg-[#F1F5F9] rounded-[8px] transition-colors"
                >
                  <X className="h-5 w-5 text-[#64748B]" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#1E293B] mb-1.5">
                      Naziv šablona
                    </label>
                    <input
                      type="text"
                      value={editingTemplate.name}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                      placeholder="npr. Potvrda rezervacije"
                      className="block w-full rounded-[10px] border border-[#E2E8F0] px-4 py-2.5 text-sm text-[#1E293B] focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#1E293B] mb-1.5">
                      Tip šablona
                    </label>
                    <select
                      value={editingTemplate.template_type}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, template_type: e.target.value as any })}
                      className="block w-full rounded-[10px] border border-[#E2E8F0] px-4 py-2.5 text-sm text-[#1E293B] focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20"
                    >
                      {Object.entries(TEMPLATE_TYPES).map(([key, val]) => (
                        <option key={key} value={key}>{val.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#1E293B] mb-1.5">
                    Predmet email-a
                  </label>
                  <input
                    type="text"
                    value={editingTemplate.subject}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, subject: e.target.value })}
                    placeholder="npr. Ponuda za {{destinacija}} - {{agencija}}"
                    className="block w-full rounded-[10px] border border-[#E2E8F0] px-4 py-2.5 text-sm text-[#1E293B] focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-sm font-medium text-[#1E293B]">
                      Tekst email-a
                    </label>
                    <div className="flex gap-1">
                      {AVAILABLE_VARIABLES.slice(0, 4).map((v) => (
                        <button
                          key={v.key}
                          onClick={() => insertVariable(v.key)}
                          className="px-2 py-1 text-xs bg-[#F1F5F9] hover:bg-[#E2E8F0] rounded text-[#64748B] font-mono transition-colors"
                          title={v.description}
                        >
                          {v.key.replace('{{', '').replace('}}', '')}
                        </button>
                      ))}
                    </div>
                  </div>
                  <textarea
                    id="template-body"
                    value={editingTemplate.body}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, body: e.target.value })}
                    rows={12}
                    placeholder="Unesite tekst email-a. Koristite promenljive poput {{ime}} za personalizaciju."
                    className="block w-full rounded-[10px] border border-[#E2E8F0] px-4 py-3 text-sm text-[#1E293B] focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20 font-mono"
                  />
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingTemplate.is_default}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, is_default: e.target.checked })}
                      className="h-4 w-4 rounded border-[#E2E8F0] text-[#3B82F6] focus:ring-[#3B82F6]"
                    />
                    <span className="text-sm text-[#1E293B]">Podrazumevani šablon za ovaj tip</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingTemplate.is_active}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, is_active: e.target.checked })}
                      className="h-4 w-4 rounded border-[#E2E8F0] text-[#3B82F6] focus:ring-[#3B82F6]"
                    />
                    <span className="text-sm text-[#1E293B]">Aktivan</span>
                  </label>
                </div>

                <div className="flex items-center gap-3 pt-4 border-t border-[#E2E8F0]">
                  <button
                    onClick={handleSave}
                    disabled={saving || !editingTemplate.name || !editingTemplate.subject || !editingTemplate.body}
                    className="inline-flex items-center gap-2 rounded-[10px] bg-[#3B82F6] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#2563EB] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Sačuvaj
                  </button>
                  <button
                    onClick={handleCancel}
                    className="inline-flex items-center gap-2 rounded-[10px] border border-[#E2E8F0] bg-white px-5 py-2.5 text-sm font-medium text-[#1E293B] hover:bg-[#F8FAFC] transition-all"
                  >
                    Otkaži
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Template List */}
          {templates.length === 0 ? (
            <div className="rounded-[14px] bg-white border border-[#E2E8F0] p-12 text-center">
              <MessageSquare className="h-12 w-12 text-[#94A3B8] mx-auto mb-4" />
              <h3 className="text-lg font-medium text-[#1E293B] mb-2">Nema šablona</h3>
              <p className="text-sm text-[#64748B] mb-4">Kreirajte prvi šablon za odgovore na upite</p>
              <button
                onClick={handleCreate}
                className="inline-flex items-center gap-2 rounded-[10px] bg-[#3B82F6] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#2563EB] transition-all"
              >
                <Plus className="h-4 w-4" />
                Kreiraj šablon
              </button>
            </div>
          ) : (
            templates.map((template) => (
              <div
                key={template.id}
                className={`rounded-[14px] bg-white border shadow-sm transition-all ${
                  !template.is_active ? 'opacity-60 border-dashed' : 'border-[#E2E8F0]'
                }`}
              >
                <div
                  className="flex items-center justify-between p-4 cursor-pointer"
                  onClick={() => setExpandedId(expandedId === template.id ? null : template.id)}
                >
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-lg ${TEMPLATE_TYPES[template.template_type].color}`}>
                      {TEMPLATE_TYPES[template.template_type].icon}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-[#1E293B]">{template.name}</h3>
                        {template.is_default && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#3B82F6]/10 px-2 py-0.5 text-xs font-medium text-[#3B82F6]">
                            <Check className="h-3 w-3" />
                            Podrazumevani
                          </span>
                        )}
                        {!template.is_active && (
                          <span className="inline-flex items-center rounded-full bg-[#F1F5F9] px-2 py-0.5 text-xs font-medium text-[#64748B]">
                            Neaktivan
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-[#64748B]">
                        {TEMPLATE_TYPES[template.template_type].label}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleEdit(template)
                      }}
                      className="p-2 hover:bg-[#F1F5F9] rounded-[8px] transition-colors"
                    >
                      <Edit2 className="h-4 w-4 text-[#64748B]" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(template.id)
                      }}
                      className="p-2 hover:bg-[#FEF2F2] rounded-[8px] transition-colors"
                    >
                      <Trash2 className="h-4 w-4 text-[#EF4444]" />
                    </button>
                    {expandedId === template.id ? (
                      <ChevronUp className="h-5 w-5 text-[#64748B]" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-[#64748B]" />
                    )}
                  </div>
                </div>

                {expandedId === template.id && (
                  <div className="px-4 pb-4 border-t border-[#E2E8F0] pt-4">
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-medium text-[#64748B] mb-1">Predmet:</p>
                        <p className="text-sm text-[#1E293B] bg-[#F8FAFC] rounded-[8px] px-3 py-2">
                          {template.subject}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-[#64748B] mb-1">Tekst:</p>
                        <pre className="text-sm text-[#1E293B] bg-[#F8FAFC] rounded-[8px] px-3 py-2 whitespace-pre-wrap font-sans max-h-48 overflow-y-auto">
                          {template.body}
                        </pre>
                      </div>
                      {!template.is_default && (
                        <button
                          onClick={() => handleSetDefault(template)}
                          className="text-sm text-[#3B82F6] hover:text-[#2563EB] font-medium"
                        >
                          Postavi kao podrazumevani
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Back link */}
      <div className="pt-4">
        <Link
          href="/dashboard/settings"
          className="text-sm text-[#64748B] hover:text-[#1E293B] transition-colors"
        >
          ← Nazad na podešavanja
        </Link>
      </div>
    </div>
  )
}
