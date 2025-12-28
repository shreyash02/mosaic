#!/usr/bin/env python3
"""Script to setup admin username and password."""

import sys
import os
from pathlib import Path

# Add parent directory to path to import app modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.admin import Admin
from app.core.security import get_password_hash


def setup_admin(username: str, password: str):
    """
    Create or update admin user.

    Args:
        username: Admin username
        password: Admin password
    """
    db: Session = SessionLocal()
    try:
        # Check if admin already exists
        admin = db.query(Admin).filter(Admin.username == username).first()

        if admin:
            # Update existing admin
            admin.password_hash = get_password_hash(password)
            admin.is_active = True
            db.commit()
            print(f"✓ Updated admin user '{username}'")
        else:
            # Create new admin
            admin = Admin(
                username=username,
                password_hash=get_password_hash(password),
                is_active=True
            )
            db.add(admin)
            db.commit()
            db.refresh(admin)
            print(f"✓ Created admin user '{username}'")

    except Exception as e:
        db.rollback()
        print(f"✗ Error setting up admin: {e}")
        sys.exit(1)
    finally:
        db.close()


def main():
    """Main entry point."""
    if len(sys.argv) != 3:
        print("Usage: python setup_admin.py <username> <password>")
        print("\nExample:")
        print("  python setup_admin.py admin mypassword123")
        sys.exit(1)

    username = sys.argv[1]
    password = sys.argv[2]

    if not username or not password:
        print("✗ Username and password are required")
        sys.exit(1)

    if len(password) < 8:
        print("⚠ Warning: Password is less than 8 characters. Consider using a stronger password.")

    setup_admin(username, password)
    print("\n✓ Admin setup complete!")
    print(f"  Username: {username}")
    print(f"  You can now access the admin portal at /adminportal")


if __name__ == "__main__":
    main()

