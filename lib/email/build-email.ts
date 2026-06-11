/**
 * Gerador puro do HTML do e-mail de convite.
 *
 * Retorna o documento completo (<!DOCTYPE html> … </html>), 100% baseado em
 * <table> com todos os estilos inline (sem classes CSS), compatível com clientes
 * de e-mail e pronto para envio via Resend. Função isolada e sem dependências de
 * React, reutilizável por backend/worker no futuro.
 */

import {
  EMAIL_FONT_STACKS,
  type EmailLayoutConfig,
} from "@/lib/email/email-layout-config";

/** Escapa &, <, >, " para uso em texto simples. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Converte quebras de linha em <br> (após escape). */
function nl2br(value: string): string {
  return escapeHtml(value).replace(/\r?\n/g, "<br>");
}

function fontStack(key: string): string {
  return EMAIL_FONT_STACKS[key] ?? EMAIL_FONT_STACKS["Helvetica/Arial"];
}

/** SVG inline do Instagram (rect arredondado + 2 círculos). */
function instagramSvg(color: string): string {
  return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="20" height="20" rx="5" stroke="${color}" stroke-width="2"/><circle cx="12" cy="12" r="4" stroke="${color}" stroke-width="2"/><circle cx="17.5" cy="6.5" r="1.5" fill="${color}"/></svg>`;
}

/** SVG inline do YouTube (corpo + play). */
function youtubeSvg(color: string): string {
  return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.97C18.88 4 12 4 12 4s-6.88 0-8.59.45A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.97C5.12 20 12 20 12 20s6.88 0 8.59-.45a2.78 2.78 0 0 0 1.95-1.97A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z" stroke="${color}" stroke-width="2" stroke-linejoin="round"/><polygon points="9.75,15.02 15.5,12 9.75,8.98" fill="${color}"/></svg>`;
}

export function buildEmail(config: EmailLayoutConfig): string {
  const c = config;
  const font = fontStack(c.fontFamily);
  const docTitle = escapeHtml(c.title.split(/\r?\n/)[0] ?? "");
  const greetingSize = c.bodySize + 1;

  const containerShadow = c.containerShadow
    ? "box-shadow:0 4px 20px rgba(0,0,0,0.10);"
    : "";

  const cardBorderLeft =
    c.cardBorderWidth > 0
      ? `border-left:${c.cardBorderWidth}px solid ${c.accentColor};`
      : "";

  // ── Ícones sociais (renderizados condicionalmente como <td>) ──
  const socialCells: string[] = [];
  if (c.showInstagram) {
    socialCells.push(
      `<td style="padding-left:14px;vertical-align:middle;line-height:0;"><a href="${escapeHtml(
        c.instagramUrl,
      )}" target="_blank" style="text-decoration:none;">${instagramSvg(
        c.footerTextColor,
      )}</a></td>`,
    );
  }
  if (c.showYoutube) {
    socialCells.push(
      `<td style="padding-left:14px;vertical-align:middle;line-height:0;"><a href="${escapeHtml(
        c.youtubeUrl,
      )}" target="_blank" style="text-decoration:none;">${youtubeSvg(
        c.footerTextColor,
      )}</a></td>`,
    );
  }
  const socialTable = socialCells.length
    ? `<table cellpadding="0" cellspacing="0" border="0" align="right"><tr>${socialCells.join(
        "",
      )}</tr></table>`
    : "";

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
<title>${docTitle}</title>
</head>
<body style="margin:0;padding:0;background-color:${c.pageBg};font-family:${font};">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${c.pageBg};padding:40px 0;">
<tr>
<td align="center">
<table width="${c.emailWidth}" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:${c.emailWidth}px;background-color:${c.emailBg};border-radius:${c.emailRadius}px;overflow:hidden;${containerShadow}">

<!-- Header -->
<tr>
<td style="height:${c.headerHeight}px;vertical-align:middle;padding:0 ${c.sidePadding}px;text-align:${c.headerAlign};background:${c.headerColor1};background:linear-gradient(${c.gradientAngle}deg, ${c.headerColor1} 0%, ${c.headerColor2} 60%, ${c.headerColor3} 100%);">
<p style="margin:0 0 12px 0;font-size:${c.eyebrowSize}px;letter-spacing:${c.eyebrowSpacing}px;text-transform:uppercase;color:${c.accentColor};font-weight:700;">${escapeHtml(c.eyebrow)}</p>
<h1 style="margin:0;font-size:${c.titleSize}px;font-weight:700;color:${c.titleColor};line-height:1.25;">${nl2br(c.title)}</h1>
</td>
</tr>

<!-- Body -->
<tr>
<td style="padding:34px ${c.sidePadding}px 26px ${c.sidePadding}px;">
<p style="margin:0 0 14px 0;font-size:${greetingSize}px;font-weight:700;color:${c.strongTextColor};letter-spacing:1px;text-transform:uppercase;">${escapeHtml(c.greeting)}</p>
<p style="margin:0 0 14px 0;font-size:${c.bodySize}px;color:${c.normalTextColor};line-height:1.8;">${c.paragraph1}</p>
<p style="margin:0;font-size:${c.bodySize}px;color:${c.normalTextColor};line-height:1.8;">${c.paragraph2}</p>
</td>
</tr>

<!-- Info Card -->
<tr>
<td style="padding:0 ${c.sidePadding}px 36px ${c.sidePadding}px;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${c.cardBg};border-radius:${c.cardRadius}px;${cardBorderLeft}">
<tr>
<td style="padding:20px 22px;">
<p style="margin:0 0 4px 0;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:${c.accentColor};font-weight:700;">${escapeHtml(c.infoLabel1)}</p>
<p style="margin:0;font-size:${c.bodySize}px;color:${c.strongTextColor};line-height:1.5;">${escapeHtml(c.locationIcon)} ${escapeHtml(c.infoValue1)}</p>
</td>
</tr>
<tr>
<td style="border-top:1px solid ${c.cardDividerColor};padding:0;">
<table width="100%" cellpadding="0" cellspacing="0" border="0">
<tr>
<td width="50%" style="padding:16px 22px;vertical-align:top;">
<p style="margin:0 0 4px 0;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:${c.accentColor};font-weight:700;">${escapeHtml(c.infoLabel2)}</p>
<p style="margin:0;font-size:${c.bodySize}px;color:${c.strongTextColor};">${escapeHtml(c.infoValue2)}</p>
</td>
<td width="50%" style="padding:16px 22px;vertical-align:top;border-left:1px solid ${c.cardDividerColor};">
<p style="margin:0 0 4px 0;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:${c.accentColor};font-weight:700;">${escapeHtml(c.infoLabel3)}</p>
<p style="margin:0;font-size:${c.bodySize}px;color:${c.strongTextColor};">${escapeHtml(c.infoValue3)}</p>
</td>
</tr>
</table>
</td>
</tr>
</table>
</td>
</tr>

<!-- Footer -->
<tr>
<td style="background-color:${c.footerBg};padding:28px ${c.sidePadding}px;">
<table width="100%" cellpadding="0" cellspacing="0" border="0">
<tr>
<td style="text-align:left;vertical-align:middle;">
<p style="margin:0;font-size:${c.bodySize}px;color:${c.footerTextColor};line-height:1.5;">${escapeHtml(c.farewell)}</p>
<p style="margin:2px 0 0 0;font-size:${c.bodySize}px;color:${c.footerTextColor};font-weight:700;line-height:1.5;">${escapeHtml(c.signature)}</p>
</td>
<td style="text-align:right;vertical-align:middle;">${socialTable}</td>
</tr>
</table>
<p style="margin:18px 0 0 0;font-size:11px;color:${c.footerNoticeColor};line-height:1.6;text-align:left;">${escapeHtml(c.autoNotice)}</p>
</td>
</tr>

</table>
</td>
</tr>
</table>
</body>
</html>`;
}
