/**
 * The business behind Yieldd, exactly as it stands on the GST registration
 * certificate.
 *
 * Meta's business verification compares the website against that certificate
 * and against what was typed into Meta, so these values are copied from the
 * certificate rather than paraphrased. Change them here only when the
 * certificate changes.
 *
 * Growth Saga is a proprietorship, so it has no legal name of its own: the
 * legal name is the proprietor's, and "Growth Saga" is the trade name. Write
 * "Yash Jaykumar Agarwal, trading as Growth Saga", never "Growth Saga Pvt Ltd".
 *
 * Read by the website footer and the privacy and terms pages. The footer
 * deliberately shows no street address; the full address appears only on the
 * legal pages.
 */
export const COMPANY = {
  tradeName: 'Growth Saga',
  legalName: 'Yash Jaykumar Agarwal',
  constitution: 'proprietorship',
  gstin: '24AHHPA6524B1Z1',
  addressLines: [
    'Flat A-1002, Shyam Palace, VIP Road',
    'Nr. Shrungar Residency, Vesu',
    'Surat, Gujarat 395007, India',
  ],
  /** The number entered in Meta. Shown on the legal pages only, not the footer. */
  phone: '+91 98790 72217' as string | null,
  email: 'care@yieldd.co',
} as const;
