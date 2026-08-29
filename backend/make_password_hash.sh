#!/bin/sh
# Generate a bcrypt hash for MANAGER_PASSWORD_HASH / FINANCE_PASSWORD_HASH.
#
# Reads the password from a hidden prompt rather than an argument, so it never
# lands in shell history, the process list, or a terminal transcript. Paste the
# printed hash into the Vercel env var, then redeploy the API — config.php
# reads the environment per request, so a running container keeps the old value.
printf 'Password: ' >&2
stty -echo; read -r p; stty echo; printf '\n' >&2
printf 'Confirm : ' >&2
stty -echo; read -r q; stty echo; printf '\n' >&2
[ "$p" = "$q" ] || { echo "Passwords do not match." >&2; exit 1; }
[ ${#p} -ge 12 ] || echo "Warning: shorter than 12 characters." >&2
php -r '$h=password_hash($argv[1], PASSWORD_DEFAULT); echo $h, "\n";' "$p"
