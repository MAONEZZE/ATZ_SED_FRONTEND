import {
  EMAIL_FONT_STACKS,
  type EmailLayoutConfig,
} from "@/lib/email/email-layout-config";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function nl2br(value: string): string {
  return escapeHtml(value).replace(/\r?\n/g, "<br>");
}

function htmlNl2br(value: string): string {
  return value.replace(/\r?\n/g, "<br>");
}

function fontStack(key: string): string {
  return EMAIL_FONT_STACKS[key] ?? EMAIL_FONT_STACKS["Helvetica/Arial"];
}

function socialIcon(name: string, color: string, alt: string): string {
  const hex = color.replace(/^#/, "") || "cccccc";
  return `<img src="https://img.icons8.com/ios-filled/100/${hex}/${name}.png" width="20" height="20" alt="${escapeHtml(
    alt,
  )}" style="display:block;border:0;outline:none;text-decoration:none;" />`;
}

export function buildEmail(config: EmailLayoutConfig): string {
  const c = config;
  const font = fontStack(c.fontFamily);
  const docTitle = escapeHtml(c.title.split(/\r?\n/)[0] ?? "");

  const containerShadow = c.containerShadow
    ? "box-shadow:0 4px 20px rgba(0,0,0,0.12);"
    : "";

  const headerBg = c.headerGradient
    ? `background:${c.headerColor1};background:linear-gradient(${c.gradientAngle}deg, ${c.headerColor1} 0%, ${c.headerColor2} 60%, ${c.headerColor3} 100%);`
    : `background-color:${c.headerColor1};`;
  const headerBorder =
    c.headerBorderWidth > 0
      ? `border-bottom:${c.headerBorderWidth}px solid ${c.headerBorderColor};`
      : "";

  const titleStyle = `margin:0;font-size:${c.titleSize}px;font-weight:${c.titleWeight};${
    c.titleItalic ? "font-style:italic;" : ""
  }color:${c.titleColor};line-height:1.3;`;

  const subtitle = c.subtitle.trim()
    ? `<p style="margin:8px 0 0 0;font-size:13px;font-weight:700;color:${c.subtitleColor};letter-spacing:3px;text-transform:uppercase;">${escapeHtml(
        c.subtitle,
      )}</p>`
    : "";
  const headerDecor = c.headerDecor.trim()
    ? `<p style="margin:10px 0 0 0;font-size:22px;line-height:1;">${escapeHtml(
        c.headerDecor,
      )}</p>`
    : "";

  const greetingStyle = `margin:0 0 14px 0;font-size:${c.greetingSize}px;font-weight:600;color:${c.greetingColor};${
    c.greetingUppercase ? "text-transform:uppercase;" : ""
  }${c.greetingSpacing > 0 ? `letter-spacing:${c.greetingSpacing}px;` : ""}`;

  let cardBorder = "";
  if (c.cardBorderWidth > 0 && c.cardBorderSide !== "none") {
    if (c.cardBorderSide === "all") {
      cardBorder = `border:${c.cardBorderWidth}px solid ${c.cardBorderColor};`;
    } else {
      cardBorder = `border-${c.cardBorderSide}:${c.cardBorderWidth}px solid ${c.cardBorderColor};`;
    }
  }

  const socialCells: string[] = [];
  if (c.showInstagram) {
    socialCells.push(
      `<td style="vertical-align:middle;text-align:right;padding-left:14px;width:1%;white-space:nowrap;"><a href="${escapeHtml(
        c.instagramUrl,
      )}" target="_blank" style="text-decoration:none;display:inline-block;">${socialIcon(
        "instagram-new",
        c.footerTextColor,
        "Instagram",
      )}</a></td>`,
    );
  }
  if (c.showYoutube) {
    socialCells.push(
      `<td style="vertical-align:middle;text-align:right;padding-left:14px;width:1%;white-space:nowrap;"><a href="${escapeHtml(
        c.youtubeUrl,
      )}" target="_blank" style="text-decoration:none;display:inline-block;">${socialIcon(
        "youtube-play",
        c.footerTextColor,
        "YouTube",
      )}</a></td>`,
    );
  }

  const footerBg = c.footerGradient
    ? `background:${c.footerBg};background:linear-gradient(135deg, ${c.footerBg} 0%, ${c.footerColor2} 100%);`
    : `background-color:${c.footerBg};`;

  const labelStyle = `margin:0;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:${c.accentColor};font-weight:700;`;
  const valueStyle = `margin:4px 0 0 0;font-size:13px;color:${c.strongTextColor};font-weight:600;`;

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
<td style="height:${c.headerHeight}px;vertical-align:middle;padding:0 ${c.sidePadding}px;text-align:${c.headerAlign};${headerBg}${headerBorder}">
<p style="margin:0 0 8px 0;font-size:${c.eyebrowSize}px;letter-spacing:${c.eyebrowSpacing}px;text-transform:uppercase;color:${c.accentColor};">${escapeHtml(c.eyebrow)}</p>
<h1 style="${titleStyle}">${nl2br(c.title)}</h1>
${subtitle}
${headerDecor}
</td>
</tr>

<!-- Body -->
<tr>
<td style="padding:34px ${c.sidePadding}px 26px ${c.sidePadding}px;background-color:${c.emailBg};">
<p style="${greetingStyle}">${escapeHtml(c.greeting)}</p>
<p style="margin:0 0 14px 0;font-size:${c.bodySize}px;color:${c.normalTextColor};line-height:1.7;">${htmlNl2br(c.paragraph1)}</p>
<p style="margin:0;font-size:${c.bodySize}px;color:${c.normalTextColor};line-height:1.7;">${htmlNl2br(c.paragraph2)}</p>
</td>
</tr>

<!-- Info Card -->
<tr>
<td style="padding:0 ${c.sidePadding}px 36px ${c.sidePadding}px;background-color:${c.emailBg};">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${c.cardBg};border-radius:${c.cardRadius}px;${cardBorder}">
<tr>
<td style="padding:20px 20px 20px 16px;">

<table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:14px;">
<tr>
<td style="vertical-align:top;padding-right:10px;padding-top:2px;"><span style="font-size:16px;">${escapeHtml(c.locationIcon)}</span></td>
<td>
<p style="${labelStyle}">${escapeHtml(c.infoLabel1)}</p>
<p style="${valueStyle}">${escapeHtml(c.infoValue1)}</p>
</td>
</tr>
</table>

<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:14px;">
<tr><td style="border-top:1px solid ${c.cardDividerColor};height:1px;line-height:1px;font-size:1px;">&nbsp;</td></tr>
</table>

<table cellpadding="0" cellspacing="0" border="0" width="100%">
<tr>
<td width="50%" style="vertical-align:top;">
<p style="${labelStyle}">${escapeHtml(c.infoLabel2)}</p>
<p style="${valueStyle}">${escapeHtml(c.infoValue2)}</p>
</td>
<td width="50%" style="vertical-align:top;">
<p style="${labelStyle}">${escapeHtml(c.infoLabel3)}</p>
<p style="${valueStyle}">${escapeHtml(c.infoValue3)}</p>
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
<td style="padding:22px ${c.sidePadding}px 18px ${c.sidePadding}px;${footerBg}">
<p style="margin:0 0 3px 0;font-size:13px;color:${c.footerTextColor};">${escapeHtml(c.farewell)}</p>
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:14px;">
<tr>
<td style="vertical-align:middle;">
<p style="margin:0;font-size:13px;color:${c.footerTextColor};font-weight:600;">${escapeHtml(c.signature)}</p>
</td>
${socialCells.join("\n")}
</tr>
</table>
<p style="margin:0;font-size:11px;color:${c.footerNoticeColor};line-height:1.6;">${escapeHtml(c.autoNotice)}</p>
</td>
</tr>

</table>
</td>
</tr>
</table>
</body>
</html>`;
}
