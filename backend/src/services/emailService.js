import nodemailer from 'nodemailer';

const smtpConfigured = Boolean(
  process.env.EMAIL_HOST &&
  process.env.EMAIL_PORT &&
  process.env.EMAIL_USER &&
  process.env.EMAIL_PASS
);

const transporter = smtpConfigured ? nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT || 587),
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
}) : null;

const FROM_EMAIL = process.env.EMAIL_FROM || 'no-reply@usina.com.br';
const FROM_NAME = process.env.EMAIL_FROM_NAME || 'C.I Digital Usina';

export const sendPasswordResetCode = async (email, codigo) => {
  const subject = 'Redefinição de senha — C.I Digital';
  const text = `Olá,

Seu código de redefinição de senha é:

${codigo}

Esse código é válido por 4 minutos.

Se você não solicitou esta alteração, ignore essa mensagem.`;

  if (!transporter) {
    console.warn('[emailService] SMTP não configurado. Código de redefinição:', codigo);
    console.log(`Simulação de envio para ${email}:\n${text}`);
    return;
  }

  await transporter.sendMail({
    from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
    to: email,
    subject,
    text
  });
};
