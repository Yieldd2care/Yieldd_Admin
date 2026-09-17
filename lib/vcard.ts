function escapeVCard(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n');
}

export type VCardInput = {
  name: string;
  company?: string;
  designation?: string;
  phone?: string;
  secondaryPhone?: string;
  email?: string;
  secondaryEmail?: string;
  /**
   * Further numbers and addresses, each emitted as its own line. vCard 3.0
   * allows TEL and EMAIL to repeat, and contacts apps keep all of them.
   *
   * There is deliberately no extraDesignations here: TITLE may repeat too,
   * but most contacts apps keep only the FIRST and drop the rest silently.
   * A second title is joined into the one TITLE by the caller instead,
   * because a visibly joined title beats one that disappears.
   */
  extraPhones?: string[];
  extraEmails?: string[];
  website?: string;
  linkedin?: string;
  address?: string;
};

export function buildVCard(input: VCardInput) {
  const lines = ['BEGIN:VCARD', 'VERSION:3.0', `FN:${escapeVCard(input.name)}`];

  if (input.company || input.designation) {
    lines.push(`ORG:${escapeVCard(input.company ?? '')}`);
    if (input.designation) lines.push(`TITLE:${escapeVCard(input.designation)}`);
  }
  if (input.phone) lines.push(`TEL;TYPE=CELL:${escapeVCard(input.phone)}`);
  for (const number of input.extraPhones ?? []) {
    if (number) lines.push(`TEL;TYPE=CELL:${escapeVCard(number)}`);
  }
  if (input.secondaryPhone) lines.push(`TEL;TYPE=WORK:${escapeVCard(input.secondaryPhone)}`);
  if (input.email) lines.push(`EMAIL:${escapeVCard(input.email)}`);
  for (const address of input.extraEmails ?? []) {
    if (address) lines.push(`EMAIL:${escapeVCard(address)}`);
  }
  if (input.secondaryEmail) lines.push(`EMAIL:${escapeVCard(input.secondaryEmail)}`);
  if (input.website) lines.push(`URL:${escapeVCard(input.website)}`);
  if (input.linkedin) lines.push(`URL:${escapeVCard(input.linkedin)}`);
  if (input.address) lines.push(`ADR;TYPE=WORK:;;${escapeVCard(input.address)};;;;`);

  lines.push('END:VCARD');
  return lines.join('\n');
}
