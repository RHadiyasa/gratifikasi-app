'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input, Textarea } from '@heroui/input'
import { Button } from '@heroui/button'
import { Select, SelectItem } from '@heroui/select'
import { CheckCircle2, AlertTriangle, Sheet, PencilLine } from 'lucide-react'
import { useZiStore } from '@/store/ziStore'
import { ESELON1_LIST } from '@/types/zi'

interface Props {
  onSuccess?: () => void
}

export default function AddSubmissionForm({ onSuccess }: Props) {
  const router      = useRouter()
  const addSubmission = useZiStore((s) => s.addSubmission)

  const [mode, setMode] = useState<'sheet' | 'app'>('sheet')
  const [form, setForm] = useState({
    link:     '',
    target:   'WBK' as 'WBK' | 'WBBM',
    eselon1:  '',
    eselon2:  '',
    pic_unit: '',
    catatan:  '',
  })
  const [loading, setLoading]   = useState(false)
  const [warn, setWarn]         = useState<string | null>(null)
  const [parseErr, setParseErr] = useState<string | null>(null)
  const [success, setSuccess]   = useState(false)

  function set(k: keyof typeof form, v: string) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  const isDisabled = !form.eselon1 || !form.eselon2 || (mode === 'sheet' && !form.link)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (isDisabled) return
    setLoading(true)
    setWarn(null)
    setParseErr(null)
    setSuccess(false)

    try {
      const payload = { ...form, source: mode, link: mode === 'app' ? null : form.link }
      const result  = await addSubmission(payload)
      if (result.abbrev_warning) setWarn('Nama unit terlihat disingkat — pastikan nama sudah lengkap.')
      if (result.parse_error) setParseErr(`Gagal parse nilai LKE: ${result.parse_error}`)
      setSuccess(true)

      if (mode === 'app' && result.submission?._id) {
        setTimeout(() => {
          router.push(`/zona-integritas/lke-checker/${result.submission._id}/input`)
        }, 800)
        return
      }

      setForm({ link: '', target: 'WBK', eselon1: '', eselon2: '', pic_unit: '', catatan: '' })
      setTimeout(() => {
        setSuccess(false)
        onSuccess?.()
      }, 1500)
    } catch (err: any) {
      setParseErr(err?.response?.data?.error ?? 'Terjadi kesalahan.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Mode toggle */}
      <div className="flex rounded-lg border border-default-200 overflow-hidden text-sm">
        <button
          type="button"
          onClick={() => setMode('sheet')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 transition-colors ${
            mode === 'sheet'
              ? 'bg-primary text-white font-medium'
              : 'text-default-500 hover:bg-default-100'
          }`}
        >
          <Sheet size={13} />
          Via Google Sheets
        </button>
        <button
          type="button"
          onClick={() => setMode('app')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 transition-colors ${
            mode === 'app'
              ? 'bg-primary text-white font-medium'
              : 'text-default-500 hover:bg-default-100'
          }`}
        >
          <PencilLine size={13} />
          Input di Aplikasi
        </button>
      </div>

      {mode === 'sheet' ? (
        <Input
          label="Link Google Sheet LKE"
          placeholder="https://docs.google.com/spreadsheets/d/…"
          value={form.link}
          onValueChange={(v) => set('link', v)}
          isRequired
          size="sm"
        />
      ) : (
        <div className="rounded-lg bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 px-3 py-2.5 text-xs text-primary-700 dark:text-primary-300">
          Jawaban akan diisi melalui form di dalam aplikasi. Setelah submit, Anda akan diarahkan ke halaman pengisian.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Select
          label="Target"
          selectedKeys={[form.target]}
          onSelectionChange={(k) => set('target', [...k][0] as 'WBK' | 'WBBM')}
          size="sm"
          isRequired
        >
          <SelectItem key="WBK">WBK</SelectItem>
          <SelectItem key="WBBM">WBBM</SelectItem>
        </Select>

        <Select
          label="Eselon I"
          selectedKeys={form.eselon1 ? [form.eselon1] : []}
          onSelectionChange={(k) => set('eselon1', [...k][0] as string ?? '')}
          size="sm"
          isRequired
          placeholder="Pilih satuan kerja"
        >
          {ESELON1_LIST.map((e) => (
            <SelectItem key={e}>{e}</SelectItem>
          ))}
        </Select>
      </div>

      <Input
        label="Nama Unit (Eselon II)"
        placeholder="mis. Biro Perencanaan"
        value={form.eselon2}
        onValueChange={(v) => set('eselon2', v)}
        isRequired
        size="sm"
      />

      <Input
        label="PIC Unit"
        placeholder="Nama penanggung jawab"
        value={form.pic_unit}
        onValueChange={(v) => set('pic_unit', v)}
        size="sm"
      />

      <Textarea
        label="Catatan"
        placeholder="Catatan tambahan (opsional)"
        value={form.catatan}
        onValueChange={(v) => set('catatan', v)}
        size="sm"
        minRows={2}
      />

      {success && (
        <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
          <CheckCircle2 size={15} />
          <span>{mode === 'app' ? 'Unit ditambahkan — mengalihkan ke halaman input...' : 'Unit berhasil ditambahkan!'}</span>
        </div>
      )}
      {warn && (
        <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
          <AlertTriangle size={15} />
          <span>{warn}</span>
        </div>
      )}
      {parseErr && (
        <div className="text-sm text-red-500">{parseErr}</div>
      )}

      <Button
        type="submit"
        color="primary"
        isLoading={loading}
        isDisabled={isDisabled}
        fullWidth
      >
        {mode === 'sheet' ? 'Tambah & Parse LKE' : 'Tambah Unit'}
      </Button>
    </form>
  )
}
