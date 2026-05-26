import { Manuscript } from './types';
import emailjs from '@emailjs/browser';

const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;
const templateIds = {
  generic: import.meta.env.VITE_EMAILJS_TEMPLATE_GENERIC,
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

function buildParams(toEmail: string, toName: string, subject: string, body: string, manuscript?: Manuscript) {
  return {
    to_email: toEmail,
    to_name: toName,
    from_name: 'GBMN Editorial Office',
    from_email: 'gbmn@tsmu.edu',
    company: 'Georgian Biomedical and Medical Nexus',
    phone: '',
    reply_to: 'gbmn@tsmu.edu',
    subject,
    message: body,
    manuscript_title: manuscript?.title || '',
    manuscript_id: manuscript?.id || '',
    journal_email: 'gbmn@tsmu.edu',
  };
}

export async function sendEmail(kind: keyof typeof templateIds, manuscript: Manuscript, subject: string, body: string) {
  const to = authorEmail(manuscript);
  if (!to) throw new Error('Author email is missing.');
  const corrAuthor = manuscript.authors.find(a => a.isCorresponding) || manuscript.authors[0];
  const toName = `${corrAuthor?.firstName || 'Author'} ${corrAuthor?.lastName || ''}`.trim();
  if (!emailJsEnabled) {
    openEmail(to, subject, body);
    return { fallback: true };
  }
  await emailjs.send(
    serviceId,
    templateIds[kind] || templateIds.generic,
    buildParams(to, toName, subject, body, manuscript),
    { publicKey }
  );
  return { fallback: false };
}

export async function sendEmailToAddress(toEmail: string, toName: string, subject: string, body: string) {
  if (!toEmail) throw new Error('Recipient email is missing.');
  if (!emailJsEnabled) {
    openEmail(toEmail, subject, body);
    return { fallback: true };
  }
  await emailjs.send(
    serviceId,
    templateIds.generic,
    buildParams(toEmail, toName, subject, body),
    { publicKey }
  );
  return { fallback: false };
}

export function submissionConfirmation(manuscript: Manuscript) {
  const draftUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://gbmnsubmit.github.io'}`;
  return {
    subject: 'Manuscript Submission Confirmation — GBMN',
    body: `Dear Author,\n\nThank you for submitting your manuscript to Georgian Biomedical and Medical Nexus (GBMN).\n\nWe are pleased to confirm that your submission has been successfully received and is currently undergoing an initial editorial assessment. The manuscript will be reviewed in accordance with the journal's editorial policies and peer-review procedures.\n\nYou can view and track your submission status at any time by signing in to the author portal:\n${draftUrl}\n\nManuscript ID: ${manuscript.id}\nTitle: ${manuscript.title}\n\nYou will be notified once the evaluation process has progressed to the next stage. Should additional information or revisions be required, the editorial office will contact you accordingly.\n\nWe appreciate your interest in publishing with GBMN.\n\nSincerely,\nEditorial Office\nGeorgian Biomedical and Medical Nexus\ngbmn@tsmu.edu`,
  };
}

export function acceptanceNotice(manuscript: Manuscript) {
  return {
    subject: 'GBMN Manuscript Accepted',
    body: `Dear Author,\n\nWe are happy to let you know that your manuscript has been accepted for the current Issue.\n\nRegards,\nGBMN Team,\n\nManuscript: ${manuscript.title}\nID: ${manuscript.id}`,
  };
}

export function paymentRequest(manuscript: Manuscript) {
  return {
    subject: 'GBMN Publication Charge Payment Request',
    body: `Dear Author,\n\nPlease send the bank receipt for publication charges of 300 GEL.\n\nBank of Georgia\n\nBAGAGE22\n\nGE96BG0000000538156925\n\nThe scanned copy of the payment receipt must be sent to the mail: gbmn@tsmu.edu.\n\nWe will initiate the publication process after receiving the payment receipt.\nIf you need any clarification, please feel free to reply to this email.\n\nRegards,\nGBMN Team,\n\nManuscript: ${manuscript.title}\nID: ${manuscript.id}`,
  };
}

export function reviewerInvitation(manuscript: Manuscript, reviewerName: string) {
  const portal = typeof window !== 'undefined' ? window.location.origin : 'https://gbmnsubmit.github.io';
  return {
    subject: `GBMN — Peer Review Invitation: ${manuscript.id}`,
    body: `Dear ${reviewerName},\n\nYou have been invited to serve as a peer reviewer for the following manuscript submitted to the Georgian Biomedical and Medical Nexus (GBMN).\n\nManuscript ID: ${manuscript.id}\nTitle: ${manuscript.title}\nSpecialty: ${manuscript.specialty}\nArticle Type: ${manuscript.articleType}\n\nPlease sign in to the reviewer portal to access the full manuscript and complete your review:\n${portal}\n\nWe kindly request that you complete your review within 14 days of receiving this invitation. If you are unable to accept this assignment, please decline through the portal at your earliest convenience.\n\nYour expert contribution is essential to maintaining the scholarly standards of GBMN.\n\nSincerely,\nEditorial Office\nGeorgian Biomedical and Medical Nexus\ngbmn@tsmu.edu`,
  };
}

export function publishedNotice(manuscript: Manuscript) {
  const doi = manuscript.publicationInfo?.doi?.trim();
  const articleLink = doi
    ? `https://doi.org/${doi.replace(/^doi:/i, '')}`
    : `https://gbmn.org`;
  return {
    subject: 'Your GBMN Article Is Published',
    body: `Dear Author,\n\nWe are pleased to inform you that your article is officially published and available online.\n\nYou can view and share your published work using the following link:\n${articleLink}\n\nThanks and regards\nEditorial Office\nGeorgian Biomedical and Medical Nexus\n\nArticle: ${manuscript.title}\nDOI: ${doi || 'Pending assignment'}`,
  };
}
