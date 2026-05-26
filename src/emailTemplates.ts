import { Manuscript } from './types';
import emailjs from '@emailjs/browser';

const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID || '';
const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || '';
const templateIds = {
  generic: import.meta.env.VITE_EMAILJS_TEMPLATE_GENERIC || '',
  submission: import.meta.env.VITE_EMAILJS_TEMPLATE_SUBMISSION || import.meta.env.VITE_EMAILJS_TEMPLATE_GENERIC || '',
  accepted: import.meta.env.VITE_EMAILJS_TEMPLATE_ACCEPTED || import.meta.env.VITE_EMAILJS_TEMPLATE_GENERIC || '',
  published: import.meta.env.VITE_EMAILJS_TEMPLATE_PUBLISHED || import.meta.env.VITE_EMAILJS_TEMPLATE_GENERIC || '',
};

export const emailJsEnabled = Boolean(serviceId && publicKey && templateIds.generic);

export function authorEmail(manuscript: Manuscript) {
  return manuscript.authors.find(author => author.isCorresponding)?.email || manuscript.authors[0]?.email || '';
}

export function openEmail(to: string, subject: string, body: string) {
  window.location.href = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export async function sendEmail(kind: keyof typeof templateIds, manuscript: Manuscript, subject: string, body: string) {
  const to = authorEmail(manuscript);
  if (!to) throw new Error('Author email is missing.');
  if (!emailJsEnabled) {
    openEmail(to, subject, body);
    return { fallback: true };
  }
  await emailjs.send(
    serviceId,
    templateIds[kind] || templateIds.generic,
    {
      to_email: to,
      to_name: `${manuscript.authors[0]?.firstName || 'Author'} ${manuscript.authors[0]?.lastName || ''}`.trim(),
      subject,
      message: body,
      manuscript_title: manuscript.title,
      manuscript_id: manuscript.id,
      journal_email: 'gbmn@tsmu.edu',
    },
    { publicKey }
  );
  return { fallback: false };
}

export function submissionConfirmation(manuscript: Manuscript) {
  return {
    subject: 'Manuscript Submission Confirmation',
    body: `Dear Author,\n\nThank you for submitting your manuscript to Georgian Biomedical and Medical Nexus.\n\nWe are pleased to confirm that your submission has been successfully received and is currently undergoing an initial editorial assessment. The manuscript will be reviewed in accordance with the journal's editorial policies and peer-review procedures.\n\nYou will be notified once the evaluation process has progressed to the next stage. Should additional information or revisions be required, the editorial office will contact you accordingly.\n\nWe appreciate your interest in publishing with GBMN.\n\nSincerely,\nEditorial Office\nGBMN\n\nManuscript: ${manuscript.title}\nID: ${manuscript.id}`,
  };
}

export function acceptedPaymentRequest(manuscript: Manuscript) {
  return {
    subject: 'GBMN Manuscript Accepted - Publication Charges',
    body: `Dear Author,\nWe are happy to let you know that your manuscript has been accepted for the current Issue.\nPlease send the bank receipt for publication charges of 300 GEL.\n\nBank of Georgia \n\nBAGAGE22\n\nGE96BG0000000538156925\n\nThe scanned copy of the payment receipt must be sent to the mail: gbmn@tsmu.edu. \n\nWe will initiate the publication process after receiving the payment receipt.\nIf you need any clarification, please feel free to reply to this email.\nRegards,\nGBMN Team,\n\nManuscript: ${manuscript.title}\nID: ${manuscript.id}`,
  };
}

export function publishedNotice(manuscript: Manuscript) {
  return {
    subject: 'Your GBMN Article Is Published',
    body: `Dear Author,\n\nWe are pleased to inform you that your article is officially published and available online.\n\nYou can view and share your published work using the following link: gbmn.org\n\nThanks and regards\nGBMN\n\nArticle: ${manuscript.title}`,
  };
}
