/**
 * Servicio de correo electrónico con nodemailer.
 * Activo solo si SMTP_ENABLED=true y las variables SMTP_* están configuradas.
 * Si no está configurado, las llamadas simplemente se ignoran (no rompen la app).
 */

const ENABLED = process.env.SMTP_ENABLED === 'true';

interface MailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

async function getTransporter() {
  if (!ENABLED) return null;

  // require() dinámico para evitar error de compilación si nodemailer no está instalado
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let nodemailer: any;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    nodemailer = require('nodemailer');
  } catch {
    console.warn('[email] nodemailer no está instalado. Ejecuta: npm install nodemailer @types/nodemailer');
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export async function sendEmail(options: MailOptions): Promise<boolean> {
  const transporter = await getTransporter();
  if (!transporter) return false;

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'Royal Gantt Planner <no-reply@gmail.com>',
      to: Array.isArray(options.to) ? options.to.join(',') : options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });
    return true;
  } catch (err) {
    console.error('[email] Error al enviar correo:', err);
    return false;
  }
}

export function taskAssignedEmail(params: {
  toEmail: string;
  toName: string;
  taskTitle: string;
  projectName: string;
  dueDate: string;
  assignedBy: string;
}): MailOptions {
  return {
    to: params.toEmail,
    subject: `[Royal Gantt] Nueva tarea asignada: ${params.taskTitle}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#7c5cfc">Royal Gantt Planner</h2>
        <p>Hola <strong>${params.toName}</strong>,</p>
        <p>Se te ha asignado una nueva tarea:</p>
        <table style="border-collapse:collapse;width:100%">
          <tr><td style="padding:8px;background:#f5f3ff"><strong>Tarea</strong></td><td style="padding:8px">${params.taskTitle}</td></tr>
          <tr><td style="padding:8px;background:#f5f3ff"><strong>Proyecto</strong></td><td style="padding:8px">${params.projectName}</td></tr>
          <tr><td style="padding:8px;background:#f5f3ff"><strong>Fecha límite</strong></td><td style="padding:8px">${params.dueDate}</td></tr>
          <tr><td style="padding:8px;background:#f5f3ff"><strong>Asignado por</strong></td><td style="padding:8px">${params.assignedBy}</td></tr>
        </table>
        <p style="margin-top:24px;color:#666;font-size:12px">Este es un mensaje automático de Royal Gantt Planner.</p>
      </div>
    `,
    text: `Nueva tarea asignada: ${params.taskTitle} | Proyecto: ${params.projectName} | Fecha límite: ${params.dueDate} | Asignado por: ${params.assignedBy}`,
  };
}

export function commentAddedEmail(params: {
  toEmail: string;
  toName: string;
  taskTitle: string;
  commentAuthor: string;
  commentText: string;
}): MailOptions {
  return {
    to: params.toEmail,
    subject: `[Royal Gantt] Nuevo comentario en: ${params.taskTitle}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#7c5cfc">Royal Gantt Planner</h2>
        <p>Hola <strong>${params.toName}</strong>,</p>
        <p><strong>${params.commentAuthor}</strong> comentó en la tarea <strong>${params.taskTitle}</strong>:</p>
        <blockquote style="border-left:4px solid #7c5cfc;margin:12px 0;padding:8px 16px;background:#f5f3ff">
          ${params.commentText}
        </blockquote>
        <p style="margin-top:24px;color:#666;font-size:12px">Este es un mensaje automático de Royal Gantt Planner.</p>
      </div>
    `,
    text: `${params.commentAuthor} comentó en ${params.taskTitle}: ${params.commentText}`,
  };
}
