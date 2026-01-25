interface BookingConfirmationEmailParams {
  customerName: string
  reservationCode: string
  packageName: string
  totalPrice: string
  amountPaid: string
  agencyName: string
  agencyPhone: string
  agencyEmail: string
  bookingId?: string
}

export function getBookingConfirmationEmailTemplate(params: BookingConfirmationEmailParams): {
  subject: string
  body: string
} {
  const {
    customerName,
    reservationCode,
    packageName,
    totalPrice,
    amountPaid,
    agencyName,
    agencyPhone,
    agencyEmail,
    bookingId,
  } = params

  const firstName = customerName?.split(' ')[0] || 'Poštovani'

  const subject = `Potvrda plaćanja ${reservationCode} - ${packageName}`

  const body = `
<!DOCTYPE html>
<html lang="sr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Potvrda plaćanja</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 32px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                🎉 Plaćanje primljeno!
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
                Vaše plaćanje je uspešno primljeno! Vaša rezervacija je sada potvrđena.
              </p>

              <!-- Booking Details Card -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #ecfdf5; border-radius: 8px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 24px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding: 8px 0; border-bottom: 1px solid #d1fae5;">
                          <span style="color: #6b7280; font-size: 14px;">Broj rezervacije</span>
                        </td>
                        <td style="padding: 8px 0; border-bottom: 1px solid #d1fae5; text-align: right;">
                          <strong style="color: #059669; font-size: 16px; font-family: monospace;">${reservationCode}</strong>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; border-bottom: 1px solid #d1fae5;">
                          <span style="color: #6b7280; font-size: 14px;">Paket</span>
                        </td>
                        <td style="padding: 8px 0; border-bottom: 1px solid #d1fae5; text-align: right;">
                          <strong style="color: #111827; font-size: 14px;">${packageName}</strong>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; border-bottom: 1px solid #d1fae5;">
                          <span style="color: #6b7280; font-size: 14px;">Ukupna cena</span>
                        </td>
                        <td style="padding: 8px 0; border-bottom: 1px solid #d1fae5; text-align: right;">
                          <strong style="color: #111827; font-size: 14px;">${totalPrice}</strong>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <span style="color: #6b7280; font-size: 14px;">Uplaćeno</span>
                        </td>
                        <td style="padding: 8px 0; text-align: right;">
                          <strong style="color: #059669; font-size: 16px;">${amountPaid}</strong>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Success Box -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #ecfdf5; border-left: 4px solid #10b981; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 16px;">
                    <p style="margin: 0; color: #065f46; font-size: 14px; font-weight: 600;">
                      ✅ Vaša rezervacija je potvrđena
                    </p>
                    <p style="margin: 8px 0 0; color: #047857; font-size: 14px;">
                      Uskoro ćete dobiti dodatne informacije o vašem putovanju. Ako imate bilo kakvih pitanja, slobodno nas kontaktirajte.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Contact Info -->
              <p style="margin: 0 0 16px; color: #374151; font-size: 14px; line-height: 1.6;">
                Za dodatna pitanja kontaktirajte nas:
              </p>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                ${agencyPhone ? `
                <tr>
                  <td style="padding: 4px 0;">
                    <span style="color: #6b7280; font-size: 14px;">📞 Telefon:</span>
                    <a href="tel:${agencyPhone}" style="color: #059669; font-size: 14px; text-decoration: none; margin-left: 8px;">${agencyPhone}</a>
                  </td>
                </tr>
                ` : ''}
                <tr>
                  <td style="padding: 4px 0;">
                    <span style="color: #6b7280; font-size: 14px;">✉️ Email:</span>
                    <a href="mailto:${agencyEmail}" style="color: #059669; font-size: 14px; text-decoration: none; margin-left: 8px;">${agencyEmail}</a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0; color: #374151; font-size: 14px; line-height: 1.6;">
                Radujemo se vašem putovanju!<br>
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
