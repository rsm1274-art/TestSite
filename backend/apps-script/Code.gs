/**
 * QPI website contact form — Google Apps Script backend
 * =====================================================
 *
 * Receives submissions from the contact form on qpi-inspect.com and:
 *   1. appends a row to a Google Sheet (lead log)
 *   2. emails the lead to CONTACT_EMAIL, with Reply-To set to the submitter
 *   3. sends an auto-reply to the submitter
 *
 * Runs inside the QPI Google Workspace account. No third-party service is
 * involved. See SETUP.md in this folder for deployment steps.
 *
 * IMPORTANT: after ANY edit to this file you must redeploy
 * (Deploy > Manage deployments > edit > Version: New version > Deploy).
 * Simply saving does NOT update the live web app.
 */

/* ============================================================
   CONFIGURATION
   ============================================================ */

/** Where lead notifications go. */
var CONTACT_EMAIL = 'info@qpi-inspect.com';

/** Name shown as the sender on the auto-reply. */
var BUSINESS_NAME = 'Quality Pipeline Inspectors';

/** Phone shown in the auto-reply body. */
var BUSINESS_PHONE = '901.300.0626';

/**
 * Shared token. Must match FORM_TOKEN in assets/site.js.
 *
 * This is obfuscation, NOT security — the value is visible in the site's
 * JavaScript to anyone who looks. It stops drive-by bots that POST to random
 * Apps Script URLs; it does not stop a determined person. The honeypot below
 * does the rest. Change both values together if you ever start seeing spam.
 */
var FORM_TOKEN = 'qpi-web-2026';

/**
 * Spreadsheet ID for the lead log.
 *
 * Leave this empty and the script creates a spreadsheet called
 * "QPI Website Leads" the first time a form is submitted, then remembers it.
 * Visit the web app URL in a browser to see the link to it.
 *
 * To use a sheet you already made instead, paste its ID here — it's the long
 * string in the URL between /d/ and /edit.
 */
var SHEET_ID = '';

/** Fields written to the sheet, in column order. */
var SHEET_COLUMNS = [
  'Timestamp',
  'Name',
  'Company',
  'Email',
  'Phone',
  'Service',
  'Location',
  'Details',
  'Page'
];

/* ============================================================
   ENTRY POINTS
   ============================================================ */

/**
 * Health check. Visiting the web app URL in a browser hits this.
 * Useful for confirming a deployment is live and finding the lead sheet.
 */
function doGet() {
  var sheetUrl = '';
  try {
    sheetUrl = getLeadSheet().getParent().getUrl();
  } catch (err) {
    sheetUrl = 'not created yet — will be created on first submission';
  }

  return jsonResponse({
    success: true,
    message: 'QPI contact form endpoint is live.',
    leadSheet: sheetUrl,
    deployedFor: CONTACT_EMAIL
  });
}

/**
 * Form submissions land here.
 *
 * The site posts application/x-www-form-urlencoded, which means the browser
 * treats it as a "simple request" and skips the CORS preflight. Apps Script
 * cannot answer a preflight OPTIONS request, so this is not incidental — it is
 * the reason the integration works. Do not change the site to post JSON or
 * multipart/form-data.
 */
function doPost(e) {
  try {
    if (!e || !e.parameter) {
      return jsonResponse({ success: false, message: 'No form data received.' });
    }

    var p = e.parameter;

    // --- Honeypot. Real visitors never fill this in. Silently accept so the
    // --- bot sees success and does not retry with a different shape.
    if (p._gotcha) {
      return jsonResponse({ success: true, message: 'Thanks.' });
    }

    // --- Shared token check.
    if (FORM_TOKEN && p.token !== FORM_TOKEN) {
      return jsonResponse({ success: false, message: 'Invalid request token.' });
    }

    // --- Server-side validation. The browser checks too, but the browser can
    // --- be bypassed by anything posting directly to this URL.
    var name = trim(p.name);
    var email = trim(p.email);
    var phone = trim(p.phone);
    var service = trim(p.service);
    var location = trim(p.location);
    var company = trim(p.company);
    var details = trim(p.details);
    var page = trim(p.page);

    var missing = [];
    if (!name) missing.push('name');
    if (!email) missing.push('email');
    if (!phone) missing.push('phone');
    if (!service) missing.push('service');
    if (!location) missing.push('location');
    if (missing.length) {
      return jsonResponse({
        success: false,
        message: 'Missing required field(s): ' + missing.join(', ')
      });
    }

    if (!isValidEmail(email)) {
      return jsonResponse({ success: false, message: 'Invalid email address.' });
    }

    var timestamp = new Date();

    // --- 1. Log to the sheet. Wrapped so that a spreadsheet problem never
    // --- costs you the lead email.
    var sheetError = null;
    try {
      logToSheet([
        timestamp, name, company, email, phone, service, location, details, page
      ]);
    } catch (err) {
      sheetError = String(err);
    }

    // --- 2. Notify QPI.
    sendNotification({
      timestamp: timestamp,
      name: name,
      company: company,
      email: email,
      phone: phone,
      service: service,
      location: location,
      details: details,
      page: page,
      sheetError: sheetError
    });

    // --- 3. Auto-reply to the submitter. Failure here must not fail the
    // --- submission — the lead is already logged and emailed.
    try {
      sendAutoReply(name, email, service);
    } catch (err) {
      // Swallowed deliberately.
    }

    return jsonResponse({ success: true, message: 'Submission received.' });

  } catch (err) {
    // Last resort: try to get the raw payload to a human rather than lose it.
    try {
      MailApp.sendEmail({
        to: CONTACT_EMAIL,
        subject: 'QPI form ERROR — a submission may have been lost',
        body: 'The contact form script threw an error.\n\n' +
              'Error: ' + err + '\n\n' +
              'Raw payload:\n' + (e && e.postData ? e.postData.contents : '(none)')
      });
    } catch (mailErr) {
      // Nothing further we can do.
    }
    return jsonResponse({ success: false, message: 'Server error. Please call ' + BUSINESS_PHONE + '.' });
  }
}

/* ============================================================
   ACTIONS
   ============================================================ */

function logToSheet(row) {
  var sheet = getLeadSheet();
  sheet.appendRow(row);
}

function sendNotification(d) {
  var subject = 'New inspection request — ' + d.service + ' — ' + d.name;

  var lines = [
    'New request from the QPI website.',
    '',
    'Name:      ' + d.name,
    'Company:   ' + (d.company || '—'),
    'Email:     ' + d.email,
    'Phone:     ' + d.phone,
    'Service:   ' + d.service,
    'Location:  ' + d.location,
    '',
    'Details:',
    (d.details || '(none provided)'),
    '',
    '---',
    'Submitted: ' + formatTimestamp(d.timestamp),
    'From page: ' + (d.page || '—'),
    '',
    'Reply to this email to respond directly to ' + d.name + '.'
  ];

  if (d.sheetError) {
    lines.push('');
    lines.push('WARNING: this lead was NOT written to the spreadsheet.');
    lines.push('Reason: ' + d.sheetError);
  }

  MailApp.sendEmail({
    to: CONTACT_EMAIL,
    subject: subject,
    body: lines.join('\n'),
    replyTo: d.email,
    name: 'QPI Website'
  });
}

/**
 * Auto-reply copy.
 *
 * TODO (Robert): read this and make it sound like you. It is the first thing a
 * prospect hears from QPI, and right now it is written by someone who has never
 * met one of your customers. Keep it short — an auto-reply that pretends to be
 * a personal note reads worse than one that is plainly automatic.
 */
function sendAutoReply(name, email, service) {
  var firstName = name.split(' ')[0];

  var body = [
    'Hi ' + firstName + ',',
    '',
    'Thanks for reaching out to ' + BUSINESS_NAME + '. We have your request for ' + service.toLowerCase() + ' and will get back to you within one business day.',
    '',
    'If it is urgent, call us directly at ' + BUSINESS_PHONE + ' — that reaches us faster than email.',
    '',
    'A few things that help us quote accurately, if you have them handy:',
    '  • Pipe size and material, if known',
    '  • Approximate footage',
    '  • Where the access points are (cleanout, manhole, etc.)',
    '  • Your deadline',
    '',
    'Talk soon,',
    BUSINESS_NAME,
    BUSINESS_PHONE,
    'https://qpi-inspect.com'
  ].join('\n');

  MailApp.sendEmail({
    to: email,
    subject: 'We received your request — ' + BUSINESS_NAME,
    body: body,
    replyTo: CONTACT_EMAIL,
    name: BUSINESS_NAME
  });
}

/* ============================================================
   HELPERS
   ============================================================ */

/**
 * Returns the lead sheet, creating the spreadsheet on first use if no
 * SHEET_ID was configured. The generated ID is stashed in script properties
 * so subsequent runs reuse the same spreadsheet.
 */
function getLeadSheet() {
  var props = PropertiesService.getScriptProperties();
  var id = SHEET_ID || props.getProperty('LEAD_SHEET_ID');
  var ss;

  if (id) {
    ss = SpreadsheetApp.openById(id);
  } else {
    ss = SpreadsheetApp.create('QPI Website Leads');
    props.setProperty('LEAD_SHEET_ID', ss.getId());
  }

  var sheet = ss.getSheets()[0];

  // Write the header row once, and freeze it.
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(SHEET_COLUMNS);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, SHEET_COLUMNS.length).setFontWeight('bold');
  }

  return sheet;
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function trim(v) {
  return v == null ? '' : String(v).trim();
}

function isValidEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
}

function formatTimestamp(d) {
  return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss z');
}

/* ============================================================
   MANUAL TEST
   ============================================================
   Run this from the Apps Script editor (select runSelfTest, click Run) to
   verify the sheet and both emails work before you touch the website. It
   sends real email to CONTACT_EMAIL and to the test address below.
   ============================================================ */

function runSelfTest() {
  var result = doPost({
    parameter: {
      token: FORM_TOKEN,
      name: 'Self Test',
      company: 'QPI',
      email: CONTACT_EMAIL,   // auto-reply goes to you, not a stranger
      phone: '9013000626',
      service: 'CCTV pipeline & sewer inspection',
      location: 'Millington, Shelby County TN',
      details: 'This row was generated by runSelfTest(). Safe to delete.',
      page: 'self-test'
    }
  });

  Logger.log(result.getContent());
  Logger.log('Lead sheet: ' + getLeadSheet().getParent().getUrl());
}
