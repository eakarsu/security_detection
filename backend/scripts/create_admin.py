#!/usr/bin/env python3
import json
import os
import pathlib
import subprocess

backend = pathlib.Path(__file__).resolve().parents[1]
database_url = os.environ.get('DATABASE_URL', '').strip()
email = (os.environ.get('PROVISION_ADMIN_EMAIL') or os.environ.get('ADMIN_EMAIL') or '').strip().lower()
password = os.environ.get('PROVISION_ADMIN_PASSWORD') or os.environ.get('ADMIN_PASSWORD') or ''
name = (os.environ.get('PROVISION_ADMIN_NAME') or 'Runtime Administrator').strip().split()
if os.environ.get('BOOTSTRAP_ACKNOWLEDGEMENT') != 'create-initial-admin':
    raise SystemExit('BOOTSTRAP_ACKNOWLEDGEMENT=create-initial-admin is required')
if not database_url.startswith(('postgresql://', 'postgres://')) or '@' not in email or len(password) < 12:
    raise SystemExit('A PostgreSQL URL, valid administrator email, and 12+ character password are required')

hash_script = "const b=require('bcryptjs');b.hash(process.env.PASSWORD,12).then(v=>process.stdout.write(v))"
password_hash = subprocess.check_output(
    ['node', '-e', hash_script], cwd=backend / 'nodejs', env={**os.environ, 'PASSWORD': password}, text=True
)
sql = """
INSERT INTO users (email, password_hash, first_name, last_name, role, status, is_active, email_verified_at)
VALUES (:'email', :'password_hash', :'first_name', :'last_name', 'super_admin', 'active', TRUE, CURRENT_TIMESTAMP)
ON CONFLICT (email) DO NOTHING;
"""
subprocess.run([
    'psql', database_url, '-v', 'ON_ERROR_STOP=1',
    '-v', f'email={email}', '-v', f'password_hash={password_hash}',
    '-v', f'first_name={name[0] if name else "Runtime"}',
    '-v', f'last_name={" ".join(name[1:]) if len(name) > 1 else "Administrator"}',
], input=sql, text=True, check=True)
print(json.dumps({'provisioned': True}))
