interface ReminderEmailParams {
  customerName: string
  reservationCode: string
  packageName: string
  depositAmount: string
  expiresAt: string
  agencyName: string
  agencyPhone: string
  agencyEmail: string
  reminderType: '48h' | '24h'
  paymentUrl: string
}

export function getReminderEmailTemplate(params: ReminderEmailParams): {
  subject: string
  body: string
} {
  const {
    customerName,
    reservationCode,
    packageName,
    depositAmount,
    expiresAt,
    agencyName,
    agencyPhone,
    agencyEmail,
    reminderType,
    paymentUrl,
  } = params

  const firstName = customerName?.split(' ')[0] || 'Poštovani'
  const isUrgent = reminderType === '24h'

  const subject = isUrgent
    ? `⚠️ HITNO: Vaša rezervacija ${reservationCode} ističe sutra!`
    : `Podsetnik: Vaša rezervacija ${reservationCode} ističe za 48 sati`

  const headerColor = isUrgent ? '#dc2626' : '#f59e0b' // Red for urgent, amber for 48h
  const headerText = isUrgent ? '⚠️ Poslednji podsetnik!' : '⏰ Podsetnik'
  const headerBg = isUrgent
    ? 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)'
    : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'

  const body = `
<!DOCTYPE html>
<html lang="sr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">

          <!-- Header -->
          <tr>
            <td style="background: ${headerBg}; padding: 32px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                ${headerText}
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 24px; color: #374151; font-size: 16px; line-height: 1.6;">
                Poštovani ${firstName},
              </p>

              <p style="margin: 0 0 24px; color: #374151; font-size: 16px; line-height: 1.6;">
                ${isUrgent
                  ? 'Ovo je poslednji podsetnik da vaša rezervacija ističe <strong>sutra</strong>!'
                  : 'Želimo da vas podsetimo da vaša rezervacija ističe za <strong>48 sati</strong>.'}
              </p>

              <!-- Reservation Details Card -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: ${isUrgent ? '#fef2f2' : '#fffbeb'}; border-radius: 8px; margin-bottom: 24px; border-left: 4px solid ${headerColor};">
                <tr>
                  <td style="padding: 24px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding: 8px 0;">
                          <span style="color: #6b7280; font-size: 14px;">Kod rezervacije</span>
                        </td>
                        <td style="padding: 8px 0; text-align: right;">
                          <strong style="color: ${headerColor}; font-size: 16px; font-family: monospace;">${reservationCode}</strong>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <span style="color: #6b7280; font-size: 14px;">Paket</span>
                        </td>
                        <td style="padding: 8px 0; text-align: right;">
                          <strong style="color: #111827; font-size: 14px;">${packageName}</strong>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <span style="color: #6b7280; font-size: 14px;">Depozit za uplatu</span>
                        </td>
                        <td style="padding: 8px 0; text-align: right;">
                          <strong style="color: ${headerColor}; font-size: 18px;">${depositAmount}</strong>
                        </td>
                      </tr>
                      <tr>
                        <td colspan="2" style="padding-top: 16px; border-top: 1px solid ${isUrgent ? '#fecaca' : '#fde68a'};">
                          <span style="color: #6b7280; font-size: 14px;">Rok za uplatu:</span>
                          <strong style="color: ${headerColor}; font-size: 14px; display: block; margin-top: 4px;">${expiresAt}</strong>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <a href="${paymentUrl}" style="display: inline-block; background-color: ${headerColor}; color: #ffffff; font-size: 16px; font-weight: 600; padding: 16px 32px; text-decoration: none; border-radius: 8px;">
                      💳 Plati online sada
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 16px; color: #374151; font-size: 14px; line-height: 1.6; text-align: center;">
                ${isUrgent
                  ? 'Ako ne uplatite depozit do isteka roka, rezervacija će biti automatski poništena.'
                  : 'Molimo vas da uplatite depozit pre isteka roka kako biste sačuvali svoju rezervaciju.'}
              </p>

              <!-- Contact Info -->
              <p style="margin: 24px 0 16px; color: #374151; font-size: 14px; line-height: 1.6;">
                Za pomoć pri uplati ili dodatna pitanja, kontaktirajte nas:
              </p>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                ${agencyPhone ? `
                <tr>
                  <td style="padding: 4px 0;">
                    <span style="color: #6b7280; font-size: 14px;">📞 Telefon:</span>
                    <a href="tel:${agencyPhone}" style="color: ${headerColor}; font-size: 14px; text-decoration: none; margin-left: 8px;">${agencyPhone}</a>
                  </td>
                </tr>
                ` : ''}
                <tr>
                  <td style="padding: 4px 0;">
                    <span style="color: #6b7280; font-size: 14px;">✉️ Email:</span>
                    <a href="mailto:${agencyEmail}" style="color: ${headerColor}; font-size: 14px; text-decoration: none; margin-left: 8px;">${agencyEmail}</a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0; color: #374151; font-size: 14px; line-height: 1.6;">
                Srdačan pozdrav,<br>
                <strong>${agencyName}</strong>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 24px; border-radius: 0 0 12px 12px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                Ovaj email je automatski generisan. Molimo ne odgovarajte na ovu poruku.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()

  return { subject, body }
}
