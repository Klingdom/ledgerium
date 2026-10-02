#!/bin/sh
# Single source of truth for NEXTAUTH_SECRET validation (backlog row #284).
#
# Called from TWO places so the rules cannot drift:
#   1. scripts/docker-start.sh   -- at container start (last line of defence)
#   2. .github/workflows/deploy.yml -- BEFORE the deploy step, so a bad secret
#      fails the job while the running container is still untouched.
#
# Reads NEXTAUTH_SECRET from the environment. Never prints the value or its
# length -- only which rule failed. Exit 0 = accepted, exit 1 = rejected.
# POSIX sh only (runs under Alpine busybox ash and ubuntu dash/bash).

# BEGIN NEXTAUTH_SECRET validation (extracted verbatim by deploy-env-delivery.test.ts
# and exercised by it -- keep the markers and the PLACEHOLDER_SECRETS line intact).
# Known placeholder strings, space-separated, matched case-insensitively as an
# exact value OR a substring (so "change-me-please" and "Change-Me" are caught).
# Sources: Dockerfile build-time ENV, historical dev default, the former
# compose.hostinger.yaml fallback, and common "fill me in" spellings.
PLACEHOLDER_SECRETS="build-time-placeholder ledgerium-dev-secret-change-in-production change-me changeme change_me placeholder replace-me your-secret"
# 32 chars = 256 bits of HMAC key material for NextAuth's HS256 session signing
# (`openssl rand -base64 32` yields 44 chars).
MIN_NEXTAUTH_SECRET_LENGTH=32

# NextAuth (next-auth 5.0.0-beta.30, lib/env.js) resolves its secret as
# `config.secret ?? AUTH_SECRET ?? NEXTAUTH_SECRET`; auth.ts sets no config.secret,
# so ANY AUTH_SECRET -- even an empty string, `??` only skips null/undefined --
# silently replaces the NEXTAUTH_SECRET validated below. Nothing in this repo
# (compose, Dockerfile, workflows, env examples) sets it, so rather than maintain
# a second validated secret we refuse to run when it is present at all.
# `${VAR+x}` is non-empty iff VAR is set (including set-but-empty).
if [ -n "${AUTH_SECRET+x}" ]; then
  echo "[ledgerium] FATAL: AUTH_SECRET is set. NextAuth reads it before NEXTAUTH_SECRET, so it would override the validated secret. Unset it and use NEXTAUTH_SECRET only."
  exit 1
fi

if [ -z "$NEXTAUTH_SECRET" ]; then
  echo "[ledgerium] FATAL: NEXTAUTH_SECRET is not set. Generate one with: openssl rand -base64 32"
  exit 1
fi

# Safe character set. The hostinger/deploy-on-vps action interpolates the
# environment-variables block into a shell script (see deploy.yml WARNING), so a
# value containing a dollar sign, backtick, quote, backslash, semicolon,
# parenthesis or space could reach the container altered after validation.
# Allow only base64 / base64url / hex characters: A-Z a-z 0-9 + / = _ -
# (`openssl rand -base64 32` and `-hex 32` both fit).
# LC_ALL=C so the ranges are ASCII, not locale collation.
LC_ALL=C
export LC_ALL
case "$NEXTAUTH_SECRET" in
  *[!A-Za-z0-9+/=_-]*)
    echo "[ledgerium] FATAL: NEXTAUTH_SECRET contains characters outside [A-Za-z0-9+/=_-] (shell-special characters can be altered by the deploy action). Generate one with: openssl rand -base64 32"
    exit 1
    ;;
esac

NEXTAUTH_SECRET_LC=$(printf '%s' "$NEXTAUTH_SECRET" | tr '[:upper:]' '[:lower:]')
for PLACEHOLDER in $PLACEHOLDER_SECRETS; do
  case "$NEXTAUTH_SECRET_LC" in
    *"$PLACEHOLDER"*)
      echo "[ledgerium] FATAL: NEXTAUTH_SECRET is still set to a placeholder value. Generate a real secret."
      exit 1
      ;;
  esac
done

if [ "${#NEXTAUTH_SECRET}" -lt "$MIN_NEXTAUTH_SECRET_LENGTH" ]; then
  echo "[ledgerium] FATAL: NEXTAUTH_SECRET is shorter than $MIN_NEXTAUTH_SECRET_LENGTH characters. Generate one with: openssl rand -base64 32"
  exit 1
fi
# END NEXTAUTH_SECRET validation
