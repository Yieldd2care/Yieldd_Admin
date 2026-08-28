// `Lost` is offered by the status-change sheet, so it has to exist in all three
// maps below. Without it a lost lead renders `className="... undefined"` and
// loses its pill entirely.
export type LeadStatus = 'New' | 'Contacted' | 'Qualified' | 'Won' | 'Lost';

export const STATUS_CLASSES: Record<LeadStatus, string> = {
  New: 'bg-surface',
  Contacted: 'bg-blue/[0.10]',
  Qualified: 'bg-gold/[0.14]',
  Won: 'bg-success/[0.14]',
  Lost: 'bg-[#C23B3B]/[0.10]',
};

export const STATUS_TEXT: Record<LeadStatus, string> = {
  New: 'text-slate',
  Contacted: 'text-blue',
  Qualified: 'text-[#8A6100]',
  Won: 'text-[#1F8A50]',
  Lost: 'text-[#A32E2E]',
};

export const STATUS_DOT: Record<LeadStatus, string> = {
  New: 'bg-slate',
  Contacted: 'bg-blue',
  Qualified: 'bg-gold',
  Won: 'bg-success',
  Lost: 'bg-[#C23B3B]',
};

export type CustomFieldValue = string | boolean;

export type Lead = {
  id: string;
  initial: string;
  name: string;
  company: string;
  time: string;
  status: LeadStatus;
  hasVoice: boolean;
  needsNote: boolean;
  phone?: string;
  email?: string;
  designation?: string;
  note?: string;
  companyLandline?: string;
  companyWebsite?: string;
  companyAddress?: string;
  companySummary?: string;
  customFieldValues?: Record<string, CustomFieldValue>;
  imageUri?: string;
  /**
   * The team member this lead belongs to, as a useTeamStore member id.
   * Undefined means the person who captured it — which for now is always the
   * signed-in user.
   */
  assignedToId?: string;
};

export const LEADS: Lead[] = [
  { id: '1', initial: 'R', name: 'Rajesh Menon', company: 'Northline Engineering', time: '4:12 PM', status: 'Qualified', hasVoice: true, needsNote: false },
  { id: '2', initial: 'S', name: 'Sneha Kulkarni', company: 'Vertex Industries', time: '3:40 PM', status: 'New', hasVoice: false, needsNote: true },
  { id: '3', initial: 'A', name: 'Amit Shah', company: 'Prime Fabtech', time: '3:05 PM', status: 'Contacted', hasVoice: true, needsNote: false },
  { id: '4', initial: 'K', name: 'Kavita Rao', company: 'Suntech Moulds', time: '2:48 PM', status: 'New', hasVoice: false, needsNote: true },
  { id: '5', initial: 'V', name: 'Vikram Nair', company: 'Delta Precision', time: '2:20 PM', status: 'Won', hasVoice: true, needsNote: false },
  { id: '6', initial: 'P', name: 'Priyanka Iyer', company: 'Orbit Castings', time: '1:55 PM', status: 'Qualified', hasVoice: false, needsNote: false },
  { id: '7', initial: 'D', name: 'Deepak Verma', company: 'Gharda Alloys', time: '1:10 PM', status: 'New', hasVoice: false, needsNote: true },
];
