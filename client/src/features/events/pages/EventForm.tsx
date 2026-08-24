import { AlertCircle, ArrowLeft, ImagePlus, Loader2, Plus, Save, Trash2, UploadCloud } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { cn } from '../../../lib/utils';
import { fromDateTimeLocal, toDateTimeLocal } from '../../../lib/format';
import {
  EVENT_CATEGORIES,
  useCreateEventMutation,
  useCreateVenueMutation,
  useGetEventQuery,
  useGetMyVenuesQuery,
  useUpdateEventMutation,
  useUploadBannerMutation,
  type TierInput,
} from '../api';

const fieldClass =
  'w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-fuchsia-400/60 focus:ring-2 focus:ring-fuchsia-400/20';
const labelClass = 'mb-1.5 block text-xs font-semibold tracking-wider text-zinc-400 uppercase';

interface TierRow extends TierInput {
  key: string;
  afterPrice?: string;
}

interface SectionRow {
  key: string;
  name: string;
  tierId: string;
  rows: string;
  cols: string;
  startNumber: string;
}

function newTier(): TierRow {
  return { key: crypto.randomUUID(), name: '', price: 0, afterPrice: '', capacity: 50, currency: 'USD' };
}

export default function EventForm() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();

  const { data: existing, isLoading: loadingExisting } = useGetEventQuery(id ?? '', { skip: !id });
  const { data: venues } = useGetMyVenuesQuery();

  const [createEvent, { isLoading: creating }] = useCreateEventMutation();
  const [updateEvent, { isLoading: updating }] = useUpdateEventMutation();
  const [uploadBanner, { isLoading: uploading }] = useUploadBannerMutation();
  const [createVenue, { isLoading: creatingVenue }] = useCreateVenueMutation();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('music');
  const [description, setDescription] = useState('');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [tiers, setTiers] = useState<TierRow[]>([newTier()]);
  const [venueId, setVenueId] = useState('');
  const [createNewVenue, setCreateNewVenue] = useState(false);
  const [venueName, setVenueName] = useState('');
  const [venueType, setVenueType] = useState('concert');
  const [venueAddress, setVenueAddress] = useState('');
  const [venueCity, setVenueCity] = useState('');
  const [venueLat, setVenueLat] = useState('9.01');
  const [venueLng, setVenueLng] = useState('38.75');
  const [sections, setSections] = useState<SectionRow[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!existing) return;
    setTitle(existing.title);
    setCategory(existing.category);
    setDescription(existing.description);
    setStartAt(toDateTimeLocal(existing.startAt));
    setEndAt(toDateTimeLocal(existing.endAt));
    setAddress(existing.address);
    setCity(existing.city);
    setBannerUrl(existing.banner.url);
    setTiers(
      existing.tiers.length > 0
        ?       existing.tiers.map((t) => ({
            key: t.tierId,
            name: t.name,
            price: t.price,
            afterPrice: t.afterPrice !== undefined ? String(t.afterPrice) : '',
            capacity: t.capacity,
            currency: t.currency,
            activeUntil: t.activeUntil ? toDateTimeLocal(t.activeUntil) : undefined,
          }))
        : [newTier()],
    );
    const rawVenueId =
      typeof existing.venueId === 'string'
        ? existing.venueId
        : ((existing.venueId as { _id?: string } | undefined)?._id ?? '');
    setVenueId(rawVenueId);
    setVenueCity(existing.city ?? '');
  }, [existing]);

  const venueOptions = useMemo(() => (venues ?? []).map((v) => ({ _id: v._id, name: v.name })), [venues]);

  if (editing && loadingExisting) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="size-6 animate-spin text-fuchsia-400" />
      </div>
    );
  }

  async function handleUpload(file: File) {
    setUploadError(null);
    try {
      const result = await uploadBanner(file).unwrap();
      setBannerUrl(result.url);
    } catch {
      setUploadError('Upload failed — use a JPEG/PNG/WebP smaller than 5MB.');
    }
  }

  async function handleSubmit(status: 'draft' | 'published') {
    setSubmitError(null);
    try {
      let finalVenueId = venueId;
      if (createNewVenue) {
        if (venueName.trim().length < 2) {
          setSubmitError('Venue name is required (at least 2 characters).');
          return;
        }
        if (venueAddress.trim().length < 2 || venueCity.trim().length < 2) {
          setSubmitError('Venue address and city are required.');
          return;
        }
        for (let i = 0; i < sections.length; i += 1) {
          const section = sections[i];
          if (!section.name.trim()) {
            setSubmitError(`Seat section ${i + 1} needs a name.`);
            return;
          }
          if (!section.tierId) {
            setSubmitError(`Seat section "${section.name.trim()}" needs a ticket tier — pick one from the dropdown.`);
            return;
          }
          const rows = Math.trunc(Number(section.rows));
          const cols = Math.trunc(Number(section.cols));
          if (!Number.isFinite(rows) || rows < 1 || rows > 50 || !Number.isFinite(cols) || cols < 1 || cols > 50) {
            setSubmitError(`Seat section "${section.name.trim()}" needs 1–50 rows and 1–50 columns.`);
            return;
          }
        }
        const venue = await createVenue({
          name: venueName.trim(),
          type: venueType,
          address: venueAddress.trim(),
          city: venueCity.trim(),
          latitude: Number(venueLat) || 0,
          longitude: Number(venueLng) || 0,
          config: {
            sections: sections.map((s) => ({
              name: s.name.trim(),
              tierId: s.tierId,
              rows: Math.min(Math.trunc(Number(s.rows)) || 1, 50),
              cols: Math.min(Math.trunc(Number(s.cols)) || 1, 50),
              startNumber: Math.trunc(Number(s.startNumber)) || 1,
            })),
          },
        }).unwrap();
        finalVenueId = venue._id;
      }

      const payload = {
        title,
        category,
        description,
        bannerUrl,
        startAt: fromDateTimeLocal(startAt) ?? new Date().toISOString(),
        endAt: endAt ? fromDateTimeLocal(endAt) : undefined,
        status,
        address,
        city,
        latitude: Number(venueLat) || 0,
        longitude: Number(venueLng) || 0,
        tiers: tiers.map((t) => ({
          name: t.name.trim(),
          price: Math.max(Number(t.price) || 0, 0),
          afterPrice: t.afterPrice !== undefined && t.afterPrice !== '' ? Math.max(Number(t.afterPrice) || 0, 0) : undefined,
          capacity: Math.trunc(Number(t.capacity) || 1) || 1,
          currency: t.currency ?? 'USD',
          activeUntil: t.activeUntil ? fromDateTimeLocal(t.activeUntil) : undefined,
        })),
        venueId: finalVenueId,
      };

      if (editing) {
        await updateEvent({ id: id!, body: payload }).unwrap();
      } else {
        await createEvent(payload).unwrap();
      }
      navigate('/dashboard');
    } catch (err) {
      const data = (err as { data?: { message?: string; errors?: { path?: (string | number)[]; message?: string }[] } })?.data;
      const issue = data?.errors?.[0];
      const detail = issue
        ? `${issue.path?.[0] ?? 'field'} ${issue.message ?? 'is invalid'}`
        : null;
      setSubmitError(data?.message ?? 'Could not save the event.');
      if (detail && !data?.message?.includes(detail)) {
        setSubmitError(`${data?.message ?? 'Validation failed'} — ${detail}`);
      }
    }
  }

  function updateTier(key: string, patch: Partial<TierRow>) {
    setTiers((prev) => prev.map((t) => (t.key === key ? { ...t, ...patch } : t)));
  }

  function updateSection(key: string, patch: Partial<SectionRow>) {
    setSections((prev) => prev.map((s) => (s.key === key ? { ...s, ...patch } : s)));
  }

  const busy = creating || updating || creatingVenue;

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-400 transition hover:text-white"
      >
        <ArrowLeft className="size-4" /> Back to events
      </Link>

      <h1 className="mt-3 text-2xl font-bold text-white">{editing ? 'Edit event' : 'Create event'}</h1>
      <p className="text-sm text-zinc-500">Fill in the details, add ticket tiers and publish when ready.</p>

      {submitError && (
        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-red-400/30 bg-red-500/10 px-3.5 py-3 text-sm text-red-300">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{submitError}</span>
        </div>
      )}

      <div className="mt-6 space-y-6">
        <Section title="Basics">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Event title *" className="sm:col-span-2">
              <input value={title} onChange={(e) => setTitle(e.target.value)} className={fieldClass} placeholder="e.g. Ethio Jazz Grand Night" required />
            </Field>
            <Field label="Category *">
              <select value={category} onChange={(e) => setCategory(e.target.value)} className={fieldClass}>
                {EVENT_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value} className="bg-zinc-900">
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Venue *">
              <div className="flex gap-2">
                <select
                  value={createNewVenue ? '' : venueId}
                  onChange={(e) => {
                    if (e.target.value === '__new__') setCreateNewVenue(true);
                    else {
                      setCreateNewVenue(false);
                      setVenueId(e.target.value);
                    }
                  }}
                  className={fieldClass}
                >
                  <option value="">Select venue…</option>
                  {venueOptions.map((v) => (
                    <option key={v._id} value={v._id} className="bg-zinc-900">
                      {v.name}
                    </option>
                  ))}
                  <option value="__new__" className="bg-zinc-900">
                    + Create new venue
                  </option>
                </select>
              </div>
            </Field>
            {createNewVenue && (
              <>
                <Field label="New venue name *">
                  <input value={venueName} onChange={(e) => setVenueName(e.target.value)} className={fieldClass} placeholder="e.g. Millennium Hall" />
                </Field>
                <Field label="Venue type *">
                  <select value={venueType} onChange={(e) => setVenueType(e.target.value)} className={fieldClass}>
                    <option value="concert" className="bg-zinc-900">Concert hall</option>
                    <option value="theater" className="bg-zinc-900">Theater</option>
                    <option value="stadium" className="bg-zinc-900">Stadium</option>
                    <option value="conference" className="bg-zinc-900">Conference</option>
                    <option value="club" className="bg-zinc-900">Club</option>
                  </select>
                </Field>
                <Field label="Venue address *">
                  <input value={venueAddress} onChange={(e) => setVenueAddress(e.target.value)} className={fieldClass} placeholder="Street & number" />
                </Field>
                <Field label="Venue city *">
                  <input value={venueCity} onChange={(e) => setVenueCity(e.target.value)} className={fieldClass} placeholder="City" />
                </Field>
                <Field label="Latitude">
                  <input value={venueLat} onChange={(e) => setVenueLat(e.target.value)} className={fieldClass} inputMode="decimal" />
                </Field>
                <Field label="Longitude">
                  <input value={venueLng} onChange={(e) => setVenueLng(e.target.value)} className={fieldClass} inputMode="decimal" />
                </Field>
              </>
            )}
          </div>
          {createNewVenue && (
            <div className="mt-4 rounded-2xl border border-white/5 bg-white/[0.02] p-4">
              <p className="mb-3 text-xs font-semibold tracking-widest text-zinc-400 uppercase">
                Seat sections <span className="normal-case text-zinc-600">(defines the interactive seat map)</span>
              </p>
              <div className="space-y-2">
                {sections.map((sec, i) => (
                  <div key={sec.key} className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_110px_80px_80px_110px_36px] sm:items-center">
                    <input
                      value={sec.name}
                      onChange={(e) => updateSection(sec.key, { name: e.target.value })}
                      className={fieldClass}
                      placeholder="Section name"
                    />
                    <select
                      value={sec.tierId}
                      onChange={(e) => updateSection(sec.key, { tierId: e.target.value })}
                      className={fieldClass}
                    >
                      <option value="">Tier…</option>
                      {tiers.map((t, idx) => (
                        <option key={`tier-${idx + 1}`} value={`tier-${idx + 1}`} className="bg-zinc-900">
                          {t.name || `Tier ${idx + 1}`}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min={1}
                      value={sec.rows}
                      onChange={(e) => updateSection(sec.key, { rows: e.target.value })}
                      className={fieldClass}
                      placeholder="Rows"
                      title="Rows"
                    />
                    <input
                      type="number"
                      min={1}
                      value={sec.cols}
                      onChange={(e) => updateSection(sec.key, { cols: e.target.value })}
                      className={fieldClass}
                      placeholder="Cols"
                      title="Columns"
                    />
                    <input
                      type="number"
                      min={1}
                      value={sec.startNumber}
                      onChange={(e) => updateSection(sec.key, { startNumber: e.target.value })}
                      className={fieldClass}
                      placeholder="Start #"
                      title="Starting seat number"
                    />
                    <button
                      type="button"
                      onClick={() => setSections((prev) => prev.filter((s) => s.key !== sec.key))}
                      className="flex size-9 items-center justify-center self-center rounded-xl border border-white/10 text-zinc-500 transition hover:border-red-400/50 hover:text-red-300"
                      aria-label={`Remove section ${i + 1}`}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setSections((prev) => [...prev, { key: crypto.randomUUID(), name: '', tierId: '', rows: '8', cols: '10', startNumber: '1' }])}
                className="mt-3 inline-flex items-center gap-2 rounded-xl border border-dashed border-white/15 px-4 py-2 text-sm text-zinc-300 transition hover:border-fuchsia-400/50 hover:text-white"
              >
                <Plus className="size-4" /> Add section
              </button>
              <p className="mt-2 text-xs text-zinc-600">
                Each section becomes a block on the seat map (rows A–Z from top, seats numbered from Start #).
              </p>
            </div>
          )}
          <Field label="Description *" className="mt-4">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              className={cn(fieldClass, 'resize-y')}
              placeholder="What makes this event special?"
              required
            />
          </Field>
        </Section>

        <Section title="When & where">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Starts at *">
              <input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} className={fieldClass} required />
            </Field>
            <Field label="Ends at (optional)">
              <input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} className={fieldClass} />
            </Field>
            <Field label="Address shown to attendees">
              <input value={address} onChange={(e) => setAddress(e.target.value)} className={fieldClass} />
            </Field>
            <Field label="City">
              <input value={city} onChange={(e) => setCity(e.target.value)} className={fieldClass} />
            </Field>
          </div>
        </Section>

        <Section title="Banner image">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex h-32 w-full shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] sm:w-56">
              {bannerUrl ? (
                <img src={bannerUrl} alt="Banner preview" className="size-full object-cover" />
              ) : (
                <ImagePlus className="size-8 text-zinc-600" />
              )}
            </div>
            <div className="flex-1">
              <label className={cn(fieldClass, 'flex cursor-pointer items-center justify-center gap-2 border-dashed')}>
                <InputFile
                  onFile={handleUpload}
                  disabled={uploading}
                />
                {uploading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Uploading…
                  </>
                ) : (
                  <>
                    <UploadCloud className="size-4" /> {bannerUrl ? 'Replace banner' : 'Upload banner'}
                  </>
                )}
              </label>
              {uploadError && <p className="mt-2 text-xs text-red-300">{uploadError}</p>}
              {bannerUrl && <p className="mt-2 truncate text-xs text-zinc-500">{bannerUrl}</p>}
            </div>
          </div>
        </Section>

        <Section title="Ticket tiers">
          <div className="space-y-3">
            {tiers.map((tier, index) => (
              <div key={tier.key} className="grid gap-3 rounded-2xl border border-white/5 bg-white/[0.02] p-4 sm:grid-cols-[1fr_100px_90px_90px_150px_40px]">
                <Field label={index === 0 ? 'Name *' : undefined}>
                  <input
                    value={tier.name}
                    onChange={(e) => updateTier(tier.key, { name: e.target.value })}
                    className={fieldClass}
                    placeholder="e.g. Early Bird"
                  />
                </Field>
                <Field label={index === 0 ? 'Price *' : undefined}>
                  <input
                    type="number"
                    min={0}
                    value={tier.price}
                    onChange={(e) => updateTier(tier.key, { price: Number(e.target.value) })}
                    className={fieldClass}
                    placeholder="45"
                  />
                </Field>
                <Field label={index === 0 ? 'After' : undefined}>
                  <input
                    type="number"
                    min={0}
                    value={tier.afterPrice ?? ''}
                    onChange={(e) => updateTier(tier.key, { afterPrice: e.target.value })}
                    className={fieldClass}
                    title="Price after the offer ends"
                    placeholder="60"
                  />
                </Field>
                <Field label={index === 0 ? 'Seats *' : undefined}>
                  <input
                    type="number"
                    min={1}
                    value={tier.capacity}
                    onChange={(e) => updateTier(tier.key, { capacity: Number(e.target.value) })}
                    className={fieldClass}
                    placeholder="200"
                  />
                </Field>
                <Field label={index === 0 ? 'Offer until' : undefined}>
                  <input
                    type="datetime-local"
                    value={tier.activeUntil ?? ''}
                    onChange={(e) => updateTier(tier.key, { activeUntil: e.target.value })}
                    className={fieldClass}
                  />
                </Field>
                <button
                  type="button"
                  onClick={() => setTiers((prev) => (prev.length > 1 ? prev.filter((t) => t.key !== tier.key) : prev))}
                  disabled={tiers.length <= 1}
                  className="mt-0.5 flex size-9 items-center justify-center self-end rounded-xl border border-white/10 text-zinc-500 transition hover:border-red-400/50 hover:text-red-300 disabled:opacity-30 sm:mb-0.5"
                  aria-label="Remove tier"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setTiers((prev) => [...prev, newTier()])}
            className="mt-3 inline-flex items-center gap-2 rounded-xl border border-dashed border-white/15 px-4 py-2 text-sm text-zinc-300 transition hover:border-fuchsia-400/50 hover:text-white"
          >
            <Plus className="size-4" /> Add tier
          </button>
          <p className="mt-2 text-xs text-zinc-600">
            Leave &quot;Offer until&quot; empty for an unlimited tier. Set an &quot;After&quot; price to switch automatically once the offer ends or the tier sells out.
          </p>
        </Section>

        <div className="flex flex-wrap items-center gap-3 border-t border-white/5 pt-6">
          <button
            onClick={() => handleSubmit('published')}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-500 to-violet-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-fuchsia-500/25 transition hover:brightness-110 disabled:opacity-60"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            {editing ? 'Save & publish' : 'Create & publish'}
          </button>
          <button
            onClick={() => handleSubmit('draft')}
            disabled={busy}
            className="rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold text-zinc-300 transition hover:border-white/30 hover:text-white disabled:opacity-60"
          >
            {editing ? 'Save as draft' : 'Save draft'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-3xl border border-white/5 bg-white/[0.02] p-6">
      <h2 className="mb-4 text-sm font-bold tracking-widest text-zinc-300 uppercase">{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, className, children }: { label?: string; className?: string; children: ReactNode }) {
  return (
    <div className={className}>
      {label && <label className={labelClass}>{label}</label>}
      {children}
    </div>
  );
}

function InputFile({ onFile, disabled }: { onFile: (f: File) => void; disabled: boolean }) {
  return (
    <input
      type="file"
      accept="image/jpeg,image/png,image/webp,image/gif"
      disabled={disabled}
      onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) onFile(file);
        e.target.value = '';
      }}
      className="sr-only"
    />
  );
}
