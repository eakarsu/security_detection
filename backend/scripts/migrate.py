#!/usr/bin/env python3
import os
import pathlib
import subprocess

root = pathlib.Path(__file__).resolve().parents[2]
database_url = os.environ.get('DATABASE_URL', '').strip()
if not database_url.startswith(('postgresql://', 'postgres://')):
    raise SystemExit('DATABASE_URL must be a PostgreSQL URL')

for migration in (root / 'scripts/setup/init.sql', pathlib.Path(__file__).with_name('auth-schema.sql')):
    subprocess.run(['psql', database_url, '-v', 'ON_ERROR_STOP=1', '-f', str(migration)], check=True)
