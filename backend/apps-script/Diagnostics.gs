/**
 * QPI contact form — mail delivery diagnostics
 * ============================================
 *
 * Paste this into the SAME Apps Script project as Code.gs (either append it to
 * Code.gs, or use the + next to "Files" to add a new script file and paste it
 * there). Then run the functions below in order.
 *
 * This exists because runSelfTest() reported success and wrote the sheet row,
 * but no email arrived. Apps Script accepted the send — so the question is
 * where the message went after that.
 */

/**
 * STEP 1 — Run this first.
 *
 * Answers, in one shot:
 *   - which account is actually executing (not always the one you think)
 *   - whether the daily mail quota is exhausted
 *   - whether the message is sitting in the sender's Sent folder, which
 *     proves Google sent it and the problem is on the receiving side
 *   - whether info@ looks like a real mailbox or something else
 */
function diagnose() {
  var out = [];

  out.push('=== IDENTITY ===');
  try {
    out.push('Effective user (who mail is sent AS): ' + Session.getEffectiveUser().getEmail());
  } catch (e) {
    out.push('Effective user: unavailable (' + e + ')');
  }
  try {
    out.push('Active user: ' + Session.getActiveUser().getEmail());
  } catch (e) {
    out.push('Active user: unavailable (' + e + ')');
  }

  out.push('');
  out.push('=== MAIL QUOTA ===');
  try {
    var remaining = MailApp.getRemainingDailyQuota();
    out.push('Remaining recipients today: ' + remaining);
    if (remaining === 0) {
      out.push('>>> QUOTA EXHAUSTED. This alone explains missing mail.');
    } else if (remaining < 50) {
      out.push('>>> Quota is low. Something is consuming it.');
    }
  } catch (e) {
    out.push('Quota check failed: ' + e);
  }

  out.push('');
  out.push('=== DID IT ACTUALLY SEND? ===');
  out.push('Searching the sender\'s mailbox for messages from the self-test...');
  try {
    var threads = GmailApp.search('subject:"New inspection request" newer_than:1d', 0, 10);
    out.push('Matching threads in this mailbox (any label): ' + threads.length);
    for (var i = 0; i < threads.length; i++) {
      var t = threads[i];
      var labels = t.getLabels().map(function (l) { return l.getName(); });
      out.push('  - "' + t.getFirstMessageSubject() + '"');
      out.push('    labels: ' + (labels.length ? labels.join(', ') : '(none)'));
      out.push('    in inbox: ' + t.isInInbox() + ' | in spam: ' + t.isInSpam() +
               ' | in trash: ' + t.isInTrash());
      var msgs = t.getMessages();
      out.push('    from: ' + msgs[0].getFrom() + ' -> to: ' + msgs[0].getTo());
    }
    if (threads.length === 0) {
      out.push('  >>> Not found in this mailbox at all.');
      out.push('  >>> Either info@ is a different mailbox than the one running');
      out.push('  >>> this script, or it is a group/alias that routed elsewhere.');
    }
  } catch (e) {
    out.push('Gmail search failed: ' + e);
    out.push('(If this says the Gmail scope is missing, re-run and re-authorize.)');
  }

  out.push('');
  out.push('=== SPAM CHECK ===');
  try {
    var spam = GmailApp.search('in:spam newer_than:1d', 0, 20);
    out.push('Messages in spam in the last day: ' + spam.length);
    for (var j = 0; j < spam.length; j++) {
      out.push('  - ' + spam[j].getFirstMessageSubject());
    }
  } catch (e) {
    out.push('Spam check failed: ' + e);
  }

  Logger.log(out.join('\n'));
}

/**
 * STEP 2 — Isolate the recipient.
 *
 * Sends three near-identical messages to three different places. Whichever
 * ones arrive tell you exactly where delivery is breaking.
 *
 * >>> PUT A NON-WORKSPACE ADDRESS HERE FIRST (personal Gmail, phone, etc.) <<<
 */
var ALTERNATE_ADDRESS = ''; // e.g. 'rsm1274@gmail.com'

function testDelivery() {
  var stamp = new Date().toISOString();
  var results = [];

  var targets = [
    ['CONTACT_EMAIL (info@)', CONTACT_EMAIL],
    ['effective user', safeEffectiveUser()],
    ['alternate address', ALTERNATE_ADDRESS]
  ];

  for (var i = 0; i < targets.length; i++) {
    var label = targets[i][0];
    var addr = targets[i][1];

    if (!addr) {
      results.push(label + ': SKIPPED (not set)');
      continue;
    }
    try {
      MailApp.sendEmail({
        to: addr,
        subject: 'QPI delivery test [' + label + '] ' + stamp,
        body: 'Delivery test to ' + addr + ' as "' + label + '".\n' +
              'Sent ' + stamp + '.\n\n' +
              'If you are reading this, mail reaches this address.'
      });
      results.push(label + ' (' + addr + '): SENT OK');
    } catch (e) {
      results.push(label + ' (' + addr + '): FAILED -> ' + e);
    }
  }

  Logger.log(results.join('\n') +
    '\n\nNow check all three destinations, including spam folders.' +
    '\nWhichever ones did NOT arrive is your answer.');
}

function safeEffectiveUser() {
  try {
    return Session.getEffectiveUser().getEmail();
  } catch (e) {
    return '';
  }
}

/**
 * STEP 3 — Only if diagnose() reports the Gmail scope is missing.
 *
 * Some Apps Script projects need to see a GmailApp call in the source before
 * they request the Gmail permission at authorization time. Running this once
 * forces the prompt.
 */
function forceGmailAuthorization() {
  var threads = GmailApp.getInboxThreads(0, 1);
  Logger.log('Gmail authorized. Inbox threads readable: ' + threads.length);
}
