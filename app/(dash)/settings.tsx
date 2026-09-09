import { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { DashShell } from '../../components/dash/DashShell';
import { GhostButton, GoldButton, Panel, StatusChip } from '../../components/dash/primitives';
import { Typography } from '../../components/ui/Typography';
import { TextInput } from '../../components/ui/TextInput';
import { useSessionStore } from '../../stores/useSessionStore';
import { useOrganization, useUpdateOrganization } from '../../hooks/useOrganization';
import { PREDEFINED_CATEGORIES, useCompanyStore } from '../../stores/useCompanyStore';
import { formatPhone, isValidPhone } from '../../lib/phone';

/**
 * Settings, editable.
 *
 * The screen used to be a read-only mirror with a note saying "editing lives in
 * the phone app". Both writes it needs already existed and are web-safe:
 * `updateProfile` on the session store and `useUpdateOrganization`.
 *
 * Two rules this screen has to keep:
 *
 *  1. **No `Alert.alert`.** react-native-web ships it as an empty function, so
 *     the phone's category screen — which reports both "admins only" and a save
 *     failure through it — would fail completely silently here. Every message
 *     below is inline state.
 *  2. **Only an admin may touch the organisation.** The `org_admin_update`
 *     policy matches zero rows for a rep rather than erroring, so a rep's save
 *     would report success and change nothing. The Edit button is admin-gated
 *     and reps are told why.
 *
 * Not editable, deliberately: **email** (the profile guard trigger blocks it;
 * the address of record is in `auth.users`), and **plan / seats** (billing, and
 * `authenticated` holds UPDATE on `name`, `category` and `onboarding_intent`
 * only).
 */

function Field({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return (
    <View className={`py-4 ${last ? '' : 'border-b border-hairline'}`}>
      <Cap>{label}</Cap>
      <Typography className="text-[14px] font-medium text-navy mt-1">{value}</Typography>
    </View>
  );
}

function Cap({ children }: { children: string }) {
  return (
    <Typography
      className="text-[9.5px] font-bold tracking-[0.08em] text-label"
      style={{ textTransform: 'uppercase' }}
    >
      {children}
    </Typography>
  );
}

/** A panel heading with its Edit affordance. */
function Head({
  title,
  editing,
  canEdit,
  onEdit,
}: {
  title: string;
  editing: boolean;
  canEdit: boolean;
  onEdit: () => void;
}) {
  return (
    <View className="flex-row items-center justify-between pt-4">
      <Typography className="text-[17px] font-bold text-navy">{title}</Typography>
      {canEdit && !editing ? (
        <Pressable
          onPress={onEdit}
          className="rounded-md border border-hairline bg-white px-[13px] py-[6px]"
        >
          <Typography className="text-[12.5px] font-bold text-gold">Edit</Typography>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Inline outcome. Never an Alert — see the note at the top of the file. */
function Notice({ tone, children }: { tone: 'error' | 'ok'; children: string }) {
  const bad = tone === 'error';
  return (
    <View
      className={`mt-3 rounded-md px-3 py-[9px] ${
        bad ? 'bg-gold/[0.10] border border-gold/[0.35]' : 'bg-[#EAF7F0] border border-[#BFE5D0]'
      }`}
    >
      <Typography className={`text-[12.5px] font-semibold ${bad ? 'text-[#8A6100]' : 'text-[#2E7D52]'}`}>
        {children}
      </Typography>
    </View>
  );
}

export default function DashSettings() {
  const user = useSessionStore((s) => s.user);
  const updateProfile = useSessionStore((s) => s.updateProfile);
  const { data: org } = useOrganization();
  const updateOrganization = useUpdateOrganization();

  const customCategories = useCompanyStore((s) => s.customCategories);
  const addCategory = useCompanyStore((s) => s.addCategory);

  const isAdmin = user?.role === 'admin';

  // ---------------------------------------------------------- organisation
  const [orgEditing, setOrgEditing] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [orgCategory, setOrgCategory] = useState<string | null>(null);
  const [orgDraft, setOrgDraft] = useState('');
  const [orgBusy, setOrgBusy] = useState(false);
  const [orgError, setOrgError] = useState<string | null>(null);
  const [orgSaved, setOrgSaved] = useState(false);

  // The saved category can be one typed on another device, and the custom list
  // is local to this browser — so fold it in rather than losing the selection.
  const categories = Array.from(
    new Set([...PREDEFINED_CATEGORIES, ...customCategories, ...(org?.category ? [org.category] : [])])
  );

  const startOrgEdit = () => {
    setOrgName(org?.name ?? user?.company ?? '');
    setOrgCategory(org?.category ?? null);
    setOrgDraft('');
    setOrgError(null);
    setOrgSaved(false);
    setOrgEditing(true);
  };

  const addAndPick = () => {
    const trimmed = orgDraft.trim();
    if (!trimmed) return;
    addCategory(trimmed);
    setOrgCategory(trimmed);
    setOrgDraft('');
  };

  const saveOrg = async () => {
    const name = orgName.trim();
    if (!name) {
      setOrgError('The company needs a name.');
      return;
    }
    setOrgBusy(true);
    setOrgError(null);
    try {
      await updateOrganization.mutateAsync({ name, category: orgCategory });
      setOrgEditing(false);
      setOrgSaved(true);
    } catch (err) {
      setOrgError(err instanceof Error ? err.message : "That didn't save. Try again.");
    } finally {
      setOrgBusy(false);
    }
  };

  // ------------------------------------------------------------------- you
  const [meEditing, setMeEditing] = useState(false);
  const [meName, setMeName] = useState('');
  const [meDesignation, setMeDesignation] = useState('');
  const [mePhone, setMePhone] = useState('');
  const [meBusy, setMeBusy] = useState(false);
  const [meError, setMeError] = useState<string | null>(null);
  const [meSaved, setMeSaved] = useState(false);

  const startMeEdit = () => {
    setMeName(user?.name ?? '');
    setMeDesignation(user?.designation ?? '');
    setMePhone(user?.phone ?? '');
    setMeError(null);
    setMeSaved(false);
    setMeEditing(true);
  };

  const saveMe = async () => {
    const name = meName.trim();
    if (!name) {
      setMeError('Enter your name.');
      return;
    }
    // A contact number is mandatory on every account, so this validates rather
    // than allowing a clear. `updateProfile` would silently drop an
    // unnormalisable one, which would look like a save that did nothing.
    if (!isValidPhone(mePhone)) {
      setMeError('Enter a valid contact number, including the country code for a number outside India.');
      return;
    }
    setMeBusy(true);
    setMeError(null);
    const { error } = await updateProfile({
      name,
      designation: meDesignation,
      phone: mePhone,
    });
    setMeBusy(false);
    if (error) {
      setMeError(error);
      return;
    }
    setMeEditing(false);
    setMeSaved(true);
  };

  return (
    <DashShell title="Settings" subtitle="Organisation and profile">
      <View className="flex-row gap-4 items-start">
        {/* ------------------------------------------------- organisation */}
        <Panel className="flex-1 px-[22px] pb-[22px]">
          <Head title="Organisation" editing={orgEditing} canEdit={isAdmin} onEdit={startOrgEdit} />

          {orgEditing ? (
            <View className="mt-[18px] gap-[18px]">
              <TextInput
                label="Company"
                placeholder="Growth Saga"
                value={orgName}
                onChangeText={setOrgName}
              />

              <View>
                <Typography className="text-[13px] text-ink-muted">Category</Typography>
                <Typography className="text-[11.5px] text-slate mt-[3px]">
                  It appears on your events and exports.
                </Typography>
                <View className="flex-row flex-wrap gap-[6px] mt-[10px]">
                  {categories.map((cat) => {
                    const selected = cat === orgCategory;
                    return (
                      <Pressable
                        key={cat}
                        onPress={() => setOrgCategory(cat)}
                        className={`rounded-full border px-[11px] py-[6px] ${
                          selected ? 'bg-gold border-gold' : 'bg-white border-hairline'
                        }`}
                      >
                        <Typography
                          className={`text-[11.5px] font-bold ${selected ? 'text-navy' : 'text-slate'}`}
                        >
                          {cat}
                        </Typography>
                      </Pressable>
                    );
                  })}
                </View>

                <View className="flex-row items-end gap-2 mt-3">
                  <View className="flex-1">
                    <TextInput
                      placeholder="Add your own category"
                      value={orgDraft}
                      onChangeText={setOrgDraft}
                      onSubmitEditing={addAndPick}
                      returnKeyType="done"
                    />
                  </View>
                  <GhostButton label="Add" onPress={addAndPick} />
                </View>
              </View>

              {orgError ? <Notice tone="error">{orgError}</Notice> : null}

              <View className="flex-row items-center gap-2">
                <GoldButton label={orgBusy ? 'Saving…' : 'Save'} onPress={() => void saveOrg()} disabled={orgBusy} />
                <GhostButton label="Cancel" onPress={() => setOrgEditing(false)} />
                {orgBusy ? <ActivityIndicator size="small" color="#F4B000" /> : null}
              </View>
            </View>
          ) : (
            <>
              <Field label="Company" value={org?.name ?? user?.company ?? '—'} />
              <Field label="Category" value={org?.category ?? 'Not set'} />
              <Field label="Seats" value={org ? String(org.seats) : '—'} />
              <View className="py-4">
                <Cap>Plan</Cap>
                <View className="mt-[6px] flex-row">
                  <View className="rounded-full px-[10px] py-[4px]" style={{ backgroundColor: '#FFF6E0' }}>
                    <Typography className="text-[11px] font-bold" style={{ color: '#8A6100' }}>
                      {(org?.planTier ?? user?.planTier) === 'pro' ? 'Pro' : 'Free'}
                    </Typography>
                  </View>
                </View>
              </View>
              {orgSaved ? <Notice tone="ok">Company details saved.</Notice> : null}
              {!isAdmin ? (
                <Typography className="text-[12px] text-slate leading-[1.5]">
                  Only an admin can change company details.
                </Typography>
              ) : null}
            </>
          )}
        </Panel>

        {/* ----------------------------------------------------------- you */}
        <Panel className="flex-1 px-[22px] pb-[22px]">
          <Head title="You" editing={meEditing} canEdit onEdit={startMeEdit} />

          {meEditing ? (
            <View className="mt-[18px] gap-[18px]">
              <TextInput label="Name" placeholder="Sarfaraz Shaikh" value={meName} onChangeText={setMeName} />
              <TextInput
                label="Designation"
                placeholder="Sales Head (optional)"
                value={meDesignation}
                onChangeText={setMeDesignation}
              />
              <TextInput
                label="Phone"
                placeholder="98204 41720"
                value={mePhone}
                onChangeText={setMePhone}
                inputMode="tel"
              />
              <View>
                <Cap>Email</Cap>
                <Typography className="text-[14px] font-medium text-navy mt-1">{user?.email ?? '—'}</Typography>
                <Typography className="text-[11.5px] text-slate mt-[3px]">
                  Your sign-in address cannot be changed here.
                </Typography>
              </View>

              {meError ? <Notice tone="error">{meError}</Notice> : null}

              <View className="flex-row items-center gap-2">
                <GoldButton label={meBusy ? 'Saving…' : 'Save'} onPress={() => void saveMe()} disabled={meBusy} />
                <GhostButton label="Cancel" onPress={() => setMeEditing(false)} />
                {meBusy ? <ActivityIndicator size="small" color="#F4B000" /> : null}
              </View>
            </View>
          ) : (
            <>
              <Field label="Name" value={user?.name ?? '—'} />
              <Field label="Designation" value={user?.designation ?? 'Not set'} />
              <Field label="Email" value={user?.email ?? '—'} />
              <Field label="Phone" value={user?.phone ? formatPhone(user.phone) : 'Not set'} />
              <View className="py-4">
                <Cap>Role</Cap>
                <View className="mt-[6px] flex-row">
                  <StatusChip value={user?.role} />
                </View>
              </View>
              {meSaved ? <Notice tone="ok">Your profile is saved.</Notice> : null}
            </>
          )}
        </Panel>
      </View>

      <Panel className="mt-4 p-[22px]">
        <Typography className="text-[15px] font-bold text-navy">What still lives in the phone app</Typography>
        <Typography className="text-[13px] text-slate leading-[1.6] mt-2">
          Notifications and the digital card are edited on the phone. Everything else — your profile, the company
          name and category, message templates and the team — can be changed here, and the phone picks it up on its
          next load. Your plan and seat count are set by billing, not by either screen.
        </Typography>
      </Panel>
    </DashShell>
  );
}
