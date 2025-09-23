#!/usr/bin/env python3
"""
Create or update an fm_admin (or other admin role) user in the MySQL database.

Usage (PowerShell):
    # With your defaults (host=localhost, db=cash_flow, user=root, pass=Transport@2025)
    # Create (or update with --force) and set password explicitly
    python scripts/create_fm_admin.py --email admin@example.com --password "StrongP@ssw0rd!" --role fm_admin

    # Create and auto-generate a strong password (printed at the end)
    python scripts/create_fm_admin.py --email admin@example.com --generate-password --role fm_admin

    # Update existing user to fm_admin without changing password
    python scripts/create_fm_admin.py --email admin@example.com --role fm_admin --force

Notes:
- Uses bcrypt with 12 rounds to match the app's hashing.
- If the email exists:
    - Without --force: exits with a message and non-zero code
    - With --force: updates role, sets active, adjusts verification, and updates password only if provided
"""

import argparse
import os
import re
import sys
from typing import Optional
import secrets
import string
import getpass

try:
    import bcrypt  # pip install bcrypt
except ImportError:
    print("Missing dependency: bcrypt. Install with: pip install bcrypt", file=sys.stderr)
    sys.exit(2)

try:
    import mysql.connector  # pip install mysql-connector-python
    from mysql.connector import Error as MySQLError
except ImportError:
    print("Missing dependency: mysql-connector-python. Install with: pip install mysql-connector-python", file=sys.stderr)
    sys.exit(2)


EMAIL_REGEX = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


def validate_email(email: str) -> bool:
    return bool(EMAIL_REGEX.match(email))


def validate_password(pw: str) -> Optional[str]:
    errors = []
    if len(pw) < 8:
        errors.append("at least 8 characters")
    if not re.search(r"[a-z]", pw):
        errors.append("one lowercase letter")
    if not re.search(r"[A-Z]", pw):
        errors.append("one uppercase letter")
    if not re.search(r"\d", pw):
        errors.append("one number")
    if not re.search(r"[@$!%*?&]", pw):
        errors.append("one special character (@$!%*?&)")
    if errors:
        return "Password must contain " + ", ".join(errors)
    return None


def hash_password(password: str, rounds: int = 12) -> str:
    salt = bcrypt.gensalt(rounds)
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")


def upsert_fm_admin(
    conn,
    email: str,
    role: str,
    password_hash: Optional[str],
    force: bool,
    verified: bool,
) -> str:
    cur = conn.cursor(dictionary=True)
    cur.execute("SELECT id, role FROM users WHERE email = %s LIMIT 1", (email,))
    row = cur.fetchone()

    if row:
        if not force:
            raise RuntimeError(
                f"User with email {email} already exists with role '{row['role']}'. Re-run with --force to update."
            )
        # Build dynamic UPDATE to only set password_hash when provided
        set_fields = [
            "role = %s",
            "account_status = 'active'",
            "email_verified = %s",
            "updated_at = NOW()",
        ]
        params = [role, verified]
        if password_hash:
            set_fields.insert(0, "password_hash = %s")
            params.insert(0, password_hash)
        sql = f"UPDATE users SET {', '.join(set_fields)} WHERE email = %s"
        params.append(email)
        cur.execute(sql, tuple(params))
        conn.commit()
        user_id = row["id"]
        cur.close()
        return user_id

    if not password_hash:
        raise RuntimeError("Password is required when creating a new user. Provide --password, --prompt-password, or --generate-password.")

    cur.execute(
        """
        INSERT INTO users (email, password_hash, role, account_status, email_verified)
        VALUES (%s, %s, %s, 'active', %s)
        """,
        (email, password_hash, role, verified),
    )
    conn.commit()

    # Fetch the auto-generated UUID
    cur.execute("SELECT id FROM users WHERE email = %s LIMIT 1", (email,))
    new_row = cur.fetchone()
    cur.close()
    return new_row["id"] if new_row else ""


def main():
    parser = argparse.ArgumentParser(description="Create or update an admin user (default: fm_admin)")
    parser.add_argument("--db-host", default=os.getenv("DB_HOST", "localhost"))
    parser.add_argument("--db-port", type=int, default=int(os.getenv("DB_PORT", "3306")))
    parser.add_argument("--db-name", default=os.getenv("DB_NAME", "cash_flow"))
    parser.add_argument("--db-user", default=os.getenv("DB_USER", "root"))
    parser.add_argument("--db-pass", default=os.getenv("DB_PASS", "Transport@2025"))
    parser.add_argument("--email")
    # Password input options
    pw_group = parser.add_mutually_exclusive_group()
    pw_group.add_argument("--password", help="Password value (avoid passing plaintext; prefer --prompt-password)")
    pw_group.add_argument("--prompt-password", action="store_true", help="Securely prompt for the password")
    pw_group.add_argument("--generate-password", action="store_true", help="Auto-generate a strong password")
    parser.add_argument("--role", choices=["fm_admin", "fa_admin", "admin"], default="fm_admin")
    parser.add_argument("--verified", dest="verified", action="store_true", help="Mark email as verified (default)")
    parser.add_argument("--no-verified", dest="verified", action="store_false", help="Do not mark email as verified")
    parser.set_defaults(verified=True)
    parser.add_argument("--force", action="store_true", help="Update if user already exists")
    parser.add_argument("--interactive", action="store_true", help="Run in interactive mode (prompts for input)")

    # If no arguments provided at all, switch to interactive by default
    if len(sys.argv) == 1:
        args = parser.parse_args(["--interactive"])  # parse with interactive flag set
    else:
        args = parser.parse_args()

    # Interactive mode: prompt for missing values
    if args.interactive:
        print("Interactive mode: press Enter to accept defaults shown in []")
        if not args.email:
            while True:
                email_in = input("Email: ").strip()
                if validate_email(email_in):
                    args.email = email_in
                    break
                print("Invalid email. Try again.")
        if not args.role:
            role_in = input(f"Role [fm_admin|fa_admin|admin] (default: {args.role}): ").strip()
            if role_in in {"fm_admin", "fa_admin", "admin"}:
                args.role = role_in
        # Password choice
        if not (args.password or args.prompt_password or args.generate_password):
            print("Password options: 1) Prompt  2) Generate  3) Keep existing (only with --force update)")
            choice = input("Choose [1/2/3] (default: 1): ").strip() or "1"
            if choice == "1":
                args.prompt_password = True
            elif choice == "2":
                args.generate_password = True
            elif choice == "3":
                args.force = True

    if not validate_email(args.email):
        print("Invalid email address.", file=sys.stderr)
        return 1

    # Determine password source
    plain_pw: Optional[str] = None
    generated = False
    if args.password:
        plain_pw = args.password
    elif args.prompt_password:
        p1 = getpass.getpass("Password: ")
        p2 = getpass.getpass("Confirm Password: ")
        if p1 != p2:
            print("Passwords do not match.", file=sys.stderr)
            return 1
        plain_pw = p1
    elif args.generate_password:
        alphabet = string.ascii_letters + string.digits + "@$!%*?&"
        # Ensure at least one of each category
        base = [
            secrets.choice(string.ascii_lowercase),
            secrets.choice(string.ascii_uppercase),
            secrets.choice(string.digits),
            secrets.choice("@$!%*?&"),
        ]
        base += [secrets.choice(alphabet) for _ in range(16 - len(base))]
        secrets.SystemRandom().shuffle(base)
        plain_pw = "".join(base)
        generated = True
    # else: no password provided. Allowed only when --force updating existing user.

    pw_hash: Optional[str] = None
    if plain_pw:
        pw_err = validate_password(plain_pw)
        if pw_err:
            print(pw_err, file=sys.stderr)
            return 1
        pw_hash = hash_password(plain_pw, rounds=12)

    try:
        conn = mysql.connector.connect(
            host=args.db_host,
            port=args.db_port,
            database=args.db_name,
            user=args.db_user,
            password=args.db_pass,
            autocommit=False,
        )
    except MySQLError as e:
        print(f"Failed to connect to MySQL: {e}", file=sys.stderr)
        return 2

    try:
        user_id = upsert_fm_admin(conn, args.email, args.role, pw_hash, args.force, args.verified)
        print("SUCCESS:")
        print(f"  id: {user_id}")
        print(f"  email: {args.email}")
        print(f"  role: {args.role}")
        print("  account_status: active")
        print(f"  email_verified: {str(args.verified).lower()}")
        if generated and plain_pw:
            print("  generated_password:")
            print(f"    {plain_pw}")
        return 0
    except Exception as e:
        conn.rollback()
        print(f"Error: {e}", file=sys.stderr)
        return 3
    finally:
        try:
            conn.close()
        except Exception:
            pass


if __name__ == "__main__":
    sys.exit(main())
