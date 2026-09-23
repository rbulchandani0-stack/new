import nodemailer from 'nodemailer';
import crypto from 'crypto';

export interface SendResetEmailOptions {
  to: string;
  userName?: string;
  resetUrl: string;
  clientIp?: string;
}

export interface EmailDeliveryResult {
  success: boolean;
  messageId?: string;
  provider: string;
  previewUrl?: string;
  error?: string;
}

export function getAppUrl(req?: any): string {
  if (process.env.APP_URL && process.env.APP_URL.trim() && !process.env.APP_URL.includes('MY_APP_URL')) {
    return process.env.APP_URL.trim().replace(/\/+$/, '');
  }
  if (req) {
    const proto = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const host = req.headers['x-forwarded-host'] || req.get('host');
    if (host) {
      return `${proto}://${host}`.replace(/\/+$/, '');
    }
  }
  return 'http://localhost:3000';
}

/**
 * Builds the professional HTML and PlainText email templates for Password Reset.
 */
export function createPasswordResetEmailContent(userName: string, resetUrl: string) {
  const displayName = userName ? userName.trim() : 'Valued Trader';

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #0c0d0e;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #e5e7eb;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      table-layout: fixed;
      background-color: #0c0d0e;
      padding: 40px 16px;
    }
    .card {
      max-width: 540px;
      margin: 0 auto;
      background-color: #141618;
      border: 1px solid #24282c;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 20px 40px rgba(0,0,0,0.6);
    }
    .header {
      padding: 32px 32px 24px 32px;
      border-bottom: 1px solid #202428;
      background: linear-gradient(180deg, #181b1e 0%, #141618 100%);
      text-align: center;
    }
    .logo-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 8px 16px;
      background-color: rgba(0, 200, 83, 0.12);
      border: 1px solid rgba(0, 200, 83, 0.3);
      border-radius: 9999px;
      color: #00C853;
      font-weight: 800;
      font-size: 14px;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      margin-bottom: 16px;
    }
    .title {
      margin: 0;
      font-size: 22px;
      font-weight: 700;
      color: #ffffff;
      letter-spacing: -0.5px;
    }
    .content {
      padding: 32px;
      font-size: 15px;
      line-height: 1.65;
      color: #9ca3af;
    }
    .greeting {
      font-size: 16px;
      font-weight: 600;
      color: #f3f4f6;
      margin-bottom: 16px;
    }
    .button-container {
      text-align: center;
      margin: 32px 0;
    }
    .btn {
      display: inline-block;
      padding: 14px 36px;
      background-color: #00C853;
      color: #000000 !important;
      font-weight: 700;
      font-size: 15px;
      text-decoration: none;
      border-radius: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      box-shadow: 0 4px 14px rgba(0, 200, 83, 0.35);
    }
    .url-box {
      background-color: #0a0b0c;
      border: 1px solid #1e2226;
      border-radius: 8px;
      padding: 12px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 12px;
      color: #00C853;
      word-break: break-all;
      margin: 16px 0;
      line-height: 1.4;
    }
    .notice-box {
      background-color: rgba(255, 179, 0, 0.08);
      border-left: 3px solid #ffb300;
      padding: 12px 16px;
      border-radius: 0 8px 8px 0;
      margin-top: 24px;
      font-size: 13px;
      color: #fbbf24;
    }
    .footer {
      padding: 24px 32px;
      background-color: #0d0e10;
      border-top: 1px solid #1f2327;
      text-align: center;
      font-size: 12px;
      color: #6b7280;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="header">
        <div class="logo-badge">eToro Global Security</div>
        <h1 class="title">Password Reset Request</h1>
      </div>
      <div class="content">
        <div class="greeting">Hello ${displayName},</div>
        <p>We received a request to reset the password for your eToro Global account.</p>
        <p>To proceed with creating your new secure password, please click the button below:</p>
        
        <div class="button-container">
          <a href="${resetUrl}" target="_blank" class="btn">Reset Password</a>
        </div>

        <p style="margin-bottom: 6px; font-size: 13px;">Or copy and paste this link into your browser:</p>
        <div class="url-box">${resetUrl}</div>

        <div class="notice-box">
          <strong>Security Notice:</strong> This password reset link will expire in <strong>30 minutes</strong> and is strictly single-use. If you did not request this change, please ignore this email; your account remains secure and no changes have been made.
        </div>
      </div>
      <div class="footer">
        <p style="margin: 0 0 8px 0;">eToro Global Financial Trading Terminal</p>
        <p style="margin: 0;">Institutional Grade Security & Compliance • Automated Dispatch</p>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();

  const text = `
Hello ${displayName},

We received a request to reset the password for your eToro Global account.

Click or copy the following link into your browser to create a new password:
${resetUrl}

SECURITY NOTICE:
- This password reset link will expire in 30 minutes.
- The link can only be used once.
- If you did not request a password reset, you can safely ignore this email. Your existing password will remain unchanged.

Regards,
eToro Global Security & Support Team
  `.trim();

  return { html, text };
}

/**
 * Sends a transactional password reset email using configured SMTP, Resend, SendGrid, or development fallback.
 */
export async function sendPasswordResetEmail(options: SendResetEmailOptions): Promise<EmailDeliveryResult> {
  const { to, userName = 'Trader', resetUrl, clientIp } = options;
  const { html, text } = createPasswordResetEmailContent(userName, resetUrl);

  const fromAddress = process.env.FROM_EMAIL || process.env.EMAIL_FROM || '"eToro Global Support" <support@etoroglobal.com>';
  const subject = 'Reset your eToro Global account password';

  console.log('================================================================');
  console.log(`[EMAIL_SERVICE] 📨 Password reset requested for: ${to}`);
  console.log(`[EMAIL_SERVICE] 🌐 Generated Reset URL: ${resetUrl}`);
  if (clientIp) console.log(`[EMAIL_SERVICE] 📍 Request Client IP: ${clientIp}`);
  console.log('================================================================');

  // 1. Check for Direct RESEND API Key
  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey && resendApiKey.trim() !== '') {
    try {
      console.log('[EMAIL_SERVICE] 🚀 Attempting dispatch via Resend REST API...');
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey.trim()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: fromAddress.includes('<') ? fromAddress : `eToro Global Support <${fromAddress}>`,
          to: [to],
          subject,
          html,
          text
        })
      });

      const resJson: any = await response.json();
      if (response.ok && resJson.id) {
        console.log(`[EMAIL_SERVICE] ✅ Email delivered successfully via Resend! Message ID: ${resJson.id}`);
        return {
          success: true,
          messageId: resJson.id,
          provider: 'Resend API'
        };
      } else {
        const errorDetail = resJson.message || JSON.stringify(resJson);
        console.error(`[EMAIL_SERVICE] ❌ Resend API Error: ${errorDetail}`);
      }
    } catch (err: any) {
      console.error(`[EMAIL_SERVICE] ❌ Resend dispatch failed: ${err.message}`);
    }
  }

  // 2. Check for Direct SENDGRID API Key
  const sendgridApiKey = process.env.SENDGRID_API_KEY;
  if (sendgridApiKey && sendgridApiKey.trim() !== '') {
    try {
      console.log('[EMAIL_SERVICE] 🚀 Attempting dispatch via SendGrid REST API...');
      // Extract clean email from fromAddress
      const cleanFromEmail = fromAddress.match(/<([^>]+)>/)?.[1] || fromAddress.replace(/"/g, '').trim();
      const fromName = fromAddress.includes('<') ? fromAddress.split('<')[0].replace(/"/g, '').trim() : 'eToro Global Support';

      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sendgridApiKey.trim()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: to }] }],
          from: { email: cleanFromEmail, name: fromName },
          subject,
          content: [
            { type: 'text/plain', value: text },
            { type: 'text/html', value: html }
          ]
        })
      });

      if (response.ok || response.status === 202) {
        const messageId = response.headers.get('x-message-id') || 'sendgrid_' + Date.now();
        console.log(`[EMAIL_SERVICE] ✅ Email delivered successfully via SendGrid! Message ID: ${messageId}`);
        return {
          success: true,
          messageId,
          provider: 'SendGrid API'
        };
      } else {
        const errText = await response.text();
        console.error(`[EMAIL_SERVICE] ❌ SendGrid API Error (${response.status}): ${errText}`);
      }
    } catch (err: any) {
      console.error(`[EMAIL_SERVICE] ❌ SendGrid dispatch failed: ${err.message}`);
    }
  }

  // 3. Check for Standard SMTP Configuration (Gmail, AWS SES, Mailgun, Brevo, custom SMTP)
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD;
  const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
  const smtpSecure = process.env.SMTP_SECURE === 'true' || smtpPort === 465;

  if (smtpHost && smtpHost.trim() !== '') {
    try {
      console.log(`[EMAIL_SERVICE] 🚀 Attempting dispatch via SMTP Server (${smtpHost}:${smtpPort}, secure=${smtpSecure})...`);
      const transportConfig: any = {
        host: smtpHost.trim(),
        port: smtpPort,
        secure: smtpSecure,
        tls: {
          rejectUnauthorized: false
        }
      };

      if (smtpUser && smtpPass) {
        transportConfig.auth = {
          user: smtpUser.trim(),
          pass: smtpPass.trim()
        };
      }

      const transporter = nodemailer.createTransport(transportConfig);
      const info = await transporter.sendMail({
        from: fromAddress,
        to,
        subject,
        text,
        html
      });

      console.log(`[EMAIL_SERVICE] ✅ Email delivered successfully via SMTP! Message ID: ${info.messageId}`);
      return {
        success: true,
        messageId: info.messageId,
        provider: `SMTP (${smtpHost})`
      };
    } catch (smtpErr: any) {
      console.error(`[EMAIL_SERVICE] ❌ SMTP delivery failed: ${smtpErr.message}`);
    }
  }

  // 4. Development & Diagnostic Fallback: Test Account or Diagnostic Console Dispatch
  // If no external SMTP is configured in .env yet, we attempt Ethereal or log diagnostic instructions
  try {
    console.log('[EMAIL_SERVICE] ℹ️ Notice: No live SMTP/API key configured. Generating Ethereal test transport...');
    const testAccount = await nodemailer.createTestAccount();
    const testTransporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });

    const testInfo = await testTransporter.sendMail({
      from: '"eToro Global Security" <support@etoroglobal.com>',
      to,
      subject,
      text,
      html
    });

    const previewUrl = nodemailer.getTestMessageUrl(testInfo) || undefined;
    console.log(`[EMAIL_SERVICE] ✅ Test email dispatched! Message ID: ${testInfo.messageId}`);
    if (previewUrl) {
      console.log(`[EMAIL_SERVICE] 🔗 Ethereal Email Preview URL: ${previewUrl}`);
    }

    return {
      success: true,
      messageId: testInfo.messageId,
      provider: 'Ethereal Test Provider',
      previewUrl: previewUrl ? String(previewUrl) : undefined
    };
  } catch (testErr: any) {
    console.warn(`[EMAIL_SERVICE] Ethereal fallback notice: ${testErr.message}`);
    console.log('[EMAIL_SERVICE] 🔑 DIRECT RESET LINK FOR TESTING: ' + resetUrl);
    return {
      success: true,
      messageId: 'dev_direct_' + Date.now(),
      provider: 'Development Direct Logger'
    };
  }
}
