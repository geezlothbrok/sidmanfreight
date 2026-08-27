<?php
// Minimal, dependency-free SMTP client — sends one plain-text email over an
// implicit-SSL connection (port 465) or STARTTLS-less plain (587) using
// AUTH LOGIN. Built so the contact form can send through the site's own mailbox
// (Namecheap Private Email) with no third-party service and no monthly caps.
// Returns true on success, or a human-readable error string on failure.

function _smtp_read($fp) {
    $data = '';
    while (($line = fgets($fp, 515)) !== false) {
        $data .= $line;
        // Multi-line replies keep a '-' as the 4th char; the final line has ' '.
        if (strlen($line) < 4 || $line[3] === ' ') break;
    }
    return $data;
}

// Sends $cmd (if any), reads the reply, and checks its 3-digit code == $expect.
function _smtp_expect($fp, $cmd, $expect) {
    if ($cmd !== null) fwrite($fp, $cmd . "\r\n");
    $resp = _smtp_read($fp);
    if ((int)substr($resp, 0, 3) !== $expect) {
        return "SMTP step failed (wanted $expect): " . trim($resp);
    }
    return true;
}

function _smtp_encode_subject($s) {
    // RFC 2047 encode only if the subject has non-ASCII characters.
    return preg_match('/[^\x20-\x7E]/', $s) ? ('=?UTF-8?B?' . base64_encode($s) . '?=') : $s;
}

function send_smtp_mail($host, $port, $user, $pass, $fromEmail, $fromName, $toEmail, $replyTo, $subject, $body) {
    $port = (int)$port;
    $transport = ($port === 465) ? "ssl://$host:$port" : "$host:$port";
    $ctx = stream_context_create(['ssl' => ['verify_peer' => true, 'verify_peer_name' => true]]);
    $fp = @stream_socket_client($transport, $errno, $errstr, 15, STREAM_CLIENT_CONNECT, $ctx);
    if (!$fp) return "Could not connect to mail server ($errstr)";
    stream_set_timeout($fp, 15);

    $helo = substr(strrchr($fromEmail, '@'), 1) ?: 'localhost';
    $steps = [
        [null, 220],                    // server greeting
        ["EHLO $helo", 250],
        ["AUTH LOGIN", 334],
        [base64_encode($user), 334],    // username
        [base64_encode($pass), 235],    // password -> authenticated
        ["MAIL FROM:<$fromEmail>", 250],
        ["RCPT TO:<$toEmail>", 250],
        ["DATA", 354],
    ];
    foreach ($steps as [$cmd, $expect]) {
        $r = _smtp_expect($fp, $cmd, $expect);
        if ($r !== true) { fclose($fp); return $r; }
    }

    $headers = [
        "Date: " . date('r'),
        "From: " . ($fromName ? "$fromName <$fromEmail>" : $fromEmail),
        "To: <$toEmail>",
        "Reply-To: <$replyTo>",
        "Subject: " . _smtp_encode_subject($subject),
        "MIME-Version: 1.0",
        "Content-Type: text/plain; charset=UTF-8",
        "Content-Transfer-Encoding: 8bit",
    ];
    $msg = implode("\r\n", $headers) . "\r\n\r\n" . $body;
    $msg = preg_replace('/\r\n|\r|\n/', "\r\n", $msg); // normalize to CRLF
    $msg = preg_replace('/^\./m', '..', $msg);         // dot-stuff
    fwrite($fp, $msg . "\r\n.\r\n");

    $r = _smtp_expect($fp, null, 250);                 // message accepted
    if ($r !== true) { fclose($fp); return $r; }

    fwrite($fp, "QUIT\r\n");
    fclose($fp);
    return true;
}
