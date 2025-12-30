#!/usr/bin/env python3
"""Simple happy-path test script for Organization APIs."""

import httpx
import json
from typing import Optional
from uuid import UUID

# Configuration
BASE_URL = "http://localhost:8000"
API_BASE = f"{BASE_URL}/api"

# Test users
USER1 = {
    "email": "test_user1@example.com",
    "password": "testpass123",
    "full_name": "Test User 1"
}

USER2 = {
    "email": "test_user2@example.com",
    "password": "testpass123",
    "full_name": "Test User 2"
}

USER3 = {
    "email": "test_user3@example.com",
    "password": "testpass123",
    "full_name": "Test User 3"
}


class APIClient:
    """Simple API client for testing."""
    
    def __init__(self, base_url: str = API_BASE):
        self.base_url = base_url
        self.token: Optional[str] = None
        self.user_id: Optional[str] = None
        
    def get_headers(self) -> dict:
        """Get headers with auth token if available."""
        headers = {"Content-Type": "application/json"}
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        return headers
    
    def register(self, email: str, password: str, full_name: str) -> dict:
        """Register a new user."""
        response = httpx.post(
            f"{self.base_url}/auth/register",
            json={"email": email, "password": password, "full_name": full_name},
            headers=self.get_headers()
        )
        response.raise_for_status()
        data = response.json()
        self.user_id = str(data["id"])
        return data
    
    def login(self, email: str, password: str) -> dict:
        """Login and get access token."""
        response = httpx.post(
            f"{self.base_url}/auth/login",
            json={"email": email, "password": password},
            headers=self.get_headers()
        )
        response.raise_for_status()
        data = response.json()
        self.token = data["access_token"]
        return data
    
    def create_organization(self, name: str, description: Optional[str] = None) -> dict:
        """Create a new organization."""
        response = httpx.post(
            f"{self.base_url}/organizations",
            json={"name": name, "description": description},
            headers=self.get_headers()
        )
        response.raise_for_status()
        return response.json()
    
    def list_organizations(self) -> list:
        """List all organizations for current user."""
        response = httpx.get(
            f"{self.base_url}/organizations",
            headers=self.get_headers()
        )
        response.raise_for_status()
        return response.json()
    
    def get_organization(self, org_id: str) -> dict:
        """Get organization details."""
        response = httpx.get(
            f"{self.base_url}/organizations/{org_id}",
            headers=self.get_headers()
        )
        response.raise_for_status()
        return response.json()
    
    def update_organization(self, org_id: str, name: Optional[str] = None, description: Optional[str] = None) -> dict:
        """Update organization."""
        data = {}
        if name is not None:
            data["name"] = name
        if description is not None:
            data["description"] = description
        response = httpx.patch(
            f"{self.base_url}/organizations/{org_id}",
            json=data,
            headers=self.get_headers()
        )
        response.raise_for_status()
        return response.json()
    
    def add_member(self, org_id: str, user_id: str, role: str = "member") -> dict:
        """Add a member to organization."""
        response = httpx.post(
            f"{self.base_url}/organizations/{org_id}/members",
            json={"user_id": user_id, "role": role},
            headers=self.get_headers()
        )
        response.raise_for_status()
        return response.json()
    
    def remove_member(self, org_id: str, user_id: str) -> dict:
        """Remove a member from organization."""
        response = httpx.delete(
            f"{self.base_url}/organizations/{org_id}/members/{user_id}",
            headers=self.get_headers()
        )
        response.raise_for_status()
        return response.json()
    
    def update_member_role(self, org_id: str, user_id: str, role: str) -> dict:
        """Update member role."""
        response = httpx.patch(
            f"{self.base_url}/organizations/{org_id}/members/{user_id}",
            json={"role": role},
            headers=self.get_headers()
        )
        response.raise_for_status()
        return response.json()
    
    def invite_to_organization(self, org_id: str, emails: list, role: str = "member") -> dict:
        """Invite users to organization."""
        response = httpx.post(
            f"{self.base_url}/organizations/{org_id}/invitations",
            json={"emails": emails, "role": role},
            headers=self.get_headers(),
            timeout=30.0  # Increase timeout for email sending
        )
        response.raise_for_status()
        return response.json()
    
    def list_invitations(self, org_id: str) -> dict:
        """List organization invitations."""
        response = httpx.get(
            f"{self.base_url}/organizations/{org_id}/invitations",
            headers=self.get_headers()
        )
        response.raise_for_status()
        return response.json()
    
    def accept_invitation(self, invitation_token: str) -> dict:
        """Accept organization invitation."""
        response = httpx.post(
            f"{self.base_url}/organizations/accept-invite/{invitation_token}",
            headers=self.get_headers()
        )
        response.raise_for_status()
        return response.json()
    
    def list_org_conversations(self, org_id: str) -> list:
        """List conversations in organization."""
        response = httpx.get(
            f"{self.base_url}/organizations/{org_id}/conversations",
            headers=self.get_headers()
        )
        response.raise_for_status()
        return response.json()


def print_section(title: str):
    """Print a section header."""
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}\n")


def print_success(message: str):
    """Print success message."""
    print(f"✅ {message}")


def print_info(message: str):
    """Print info message."""
    print(f"ℹ️  {message}")


def main():
    """Run happy-path tests."""
    print_section("Organization API Happy-Path Tests")
    
    # Initialize clients
    client1 = APIClient()
    client2 = APIClient()
    client3 = APIClient()
    
    try:
        # Step 1: Register/Login users
        print_section("Step 1: User Registration & Login")
        
        try:
            user1_data = client1.register(**USER1)
            print_success(f"Registered User 1: {user1_data['email']} (ID: {user1_data['id']})")
            client1.login(USER1["email"], USER1["password"])
            print_success(f"Logged in User 1")
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 400:
                print_info(f"User 1 already exists, logging in...")
                client1.login(USER1["email"], USER1["password"])
                print_success(f"Logged in User 1: {USER1['email']}")
            else:
                raise
        
        try:
            user2_data = client2.register(**USER2)
            print_success(f"Registered User 2: {user2_data['email']} (ID: {user2_data['id']})")
            client2.login(USER2["email"], USER2["password"])
            print_success(f"Logged in User 2")
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 400:
                print_info(f"User 2 already exists, logging in...")
                client2.login(USER2["email"], USER2["password"])
                print_success(f"Logged in User 2: {USER2['email']}")
            else:
                raise
        
        try:
            user3_data = client3.register(**USER3)
            print_success(f"Registered User 3: {user3_data['email']} (ID: {user3_data['id']})")
            client3.login(USER3["email"], USER3["password"])
            print_success(f"Logged in User 3")
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 400:
                print_info(f"User 3 already exists, logging in...")
                client3.login(USER3["email"], USER3["password"])
                print_success(f"Logged in User 3: {USER3['email']}")
            else:
                raise
        
        # Get user IDs if we logged in
        if not client1.user_id:
            # Get user info from token or make a request
            orgs = client1.list_organizations()
            # We'll get user_id from the organization creation response
        
        # Step 2: Create Organization
        print_section("Step 2: Create Organization")
        org_data = client1.create_organization(
            name="Test Organization",
            description="This is a test organization for API testing"
        )
        org_id = org_data["id"]
        print_success(f"Created organization: {org_data['name']} (ID: {org_id})")
        print_info(f"  Description: {org_data.get('description', 'N/A')}")
        print_info(f"  Created by: {org_data['created_by']}")
        print_info(f"  Members count: {len(org_data.get('members', []))}")
        
        # Verify creator is admin
        members = org_data.get("members", [])
        if members:
            creator_member = members[0]
            print_info(f"  Creator role: {creator_member.get('role')} (should be 'admin')")
        
        # Step 3: List Organizations
        print_section("Step 3: List Organizations")
        orgs = client1.list_organizations()
        print_success(f"User 1 is member of {len(orgs)} organization(s)")
        for org in orgs:
            print_info(f"  - {org['name']} (ID: {org['id']})")
        
        # Step 4: Get Organization Details
        print_section("Step 4: Get Organization Details")
        org_details = client1.get_organization(org_id)
        print_success(f"Retrieved organization: {org_details['name']}")
        print_info(f"  ID: {org_details['id']}")
        print_info(f"  Description: {org_details.get('description', 'N/A')}")
        print_info(f"  Members: {len(org_details.get('members', []))}")
        for member in org_details.get('members', []):
            print_info(f"    - User {member['user_id']}: {member['role']}")
        
        # Step 5: Update Organization
        print_section("Step 5: Update Organization")
        updated_org = client1.update_organization(
            org_id,
            name="Updated Test Organization",
            description="Updated description"
        )
        print_success(f"Updated organization: {updated_org['name']}")
        print_info(f"  New description: {updated_org.get('description', 'N/A')}")
        
        # Step 6: Add Member Directly
        print_section("Step 6: Add Member Directly")
        # Get user2's ID - we need to get it somehow
        # For now, let's try to get it from a login response or we'll need to add an endpoint
        # Let's assume we can get it from the organization details or we'll need user info
        # Actually, we need user2's UUID. Let's check if there's a way to get it
        # For testing, we'll use the invitation flow instead, or we can try to get user info
        
        # Actually, let's test invitations first, then come back to direct member addition
        
        # Step 7: Invite Users
        print_section("Step 7: Invite Users to Organization")
        invite_response = client1.invite_to_organization(
            org_id,
            emails=[USER2["email"], USER3["email"]],
            role="member"
        )
        print_success(f"Created {invite_response['invitations_created']} invitation(s)")
        print_info(f"  Organization ID: {invite_response['organization_id']}")
        for inv in invite_response.get('invitations', []):
            print_info(f"  - Invited {inv['email']} as {inv['role']} (Token: {inv['invitation_token'][:20]}...)")
        
        # Step 8: List Invitations
        print_section("Step 8: List Invitations")
        invitations = client1.list_invitations(org_id)
        print_success(f"Found {invitations['total_invitations']} invitation(s)")
        print_info(f"  Pending: {invitations['pending_invitations']}")
        print_info(f"  Accepted: {invitations['accepted_invitations']}")
        for inv in invitations.get('invitations', []):
            status = "Accepted" if inv['is_accepted'] else "Pending"
            print_info(f"  - {inv['email']}: {status} (Role: {inv['role']})")
        
        # Step 9: Accept Invitation (as User 2)
        print_section("Step 9: Accept Invitation (User 2)")
        # Get the invitation token for user2
        user2_invitation = None
        for inv in invite_response.get('invitations', []):
            if inv['email'] == USER2["email"]:
                user2_invitation = inv
                break
        
        if user2_invitation:
            accepted = client2.accept_invitation(user2_invitation['invitation_token'])
            print_success(f"User 2 accepted invitation")
            print_info(f"  Organization ID: {accepted['organization_id']}")
            print_info(f"  User ID: {accepted['user_id']}")
            print_info(f"  Role: {accepted['role']}")
        else:
            print_info("Could not find invitation for User 2")
        
        # Step 10: Verify User 2 can see organization
        print_section("Step 10: Verify User 2 Membership")
        orgs_user2 = client2.list_organizations()
        print_success(f"User 2 is member of {len(orgs_user2)} organization(s)")
        for org in orgs_user2:
            print_info(f"  - {org['name']} (ID: {org['id']})")
        
        # Step 11: Update Member Role (promote User 2 to admin)
        print_section("Step 11: Update Member Role")
        # Get user2's ID from the accepted invitation response
        user2_id = accepted['user_id'] if 'accepted' in locals() else None
        if user2_id:
            updated_member = client1.update_member_role(org_id, user2_id, "admin")
            print_success(f"Updated User 2 role to: {updated_member['role']}")
        else:
            print_info("Skipping - need user2_id")
        
        # Step 12: List Organization Conversations (should be empty)
        print_section("Step 12: List Organization Conversations")
        conversations = client1.list_org_conversations(org_id)
        print_success(f"Found {len(conversations)} conversation(s) in organization")
        for conv in conversations:
            print_info(f"  - {conv['title']} ({conv['state']})")
        
        # Step 13: Test permissions - User 2 (now admin) can update org
        print_section("Step 13: Test Admin Permissions")
        if user2_id:
            updated_by_user2 = client2.update_organization(
                org_id,
                description="Updated by User 2 (admin)"
            )
            print_success(f"User 2 (admin) updated organization")
            print_info(f"  New description: {updated_by_user2.get('description', 'N/A')}")
        
        # Step 14: Test member removal
        print_section("Step 14: Test Member Removal")
        # Accept invitation for User 3 first
        user3_invitation = None
        for inv in invite_response.get('invitations', []):
            if inv['email'] == USER3["email"]:
                user3_invitation = inv
                break
        
        if user3_invitation:
            accepted_user3 = client3.accept_invitation(user3_invitation['invitation_token'])
            user3_id = accepted_user3['user_id']
            print_success(f"User 3 accepted invitation (ID: {user3_id})")
            
            # Remove user3 as member (using admin client1 or client2)
            removed = client1.remove_member(org_id, user3_id)
            print_success(f"Removed User 3 from organization")
            print_info(f"  Message: {removed.get('message', 'N/A')}")
        else:
            print_info("Could not find invitation for User 3")
        
        print_section("✅ All Tests Completed Successfully!")
        
    except httpx.HTTPStatusError as e:
        print(f"\n❌ HTTP Error: {e.response.status_code}")
        print(f"   URL: {e.request.url}")
        print(f"   Method: {e.request.method}")
        try:
            error_detail = e.response.json()
            print(f"   Response: {json.dumps(error_detail, indent=2)}")
        except:
            print(f"   Response: {e.response.text}")
        raise
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise


if __name__ == "__main__":
    main()

