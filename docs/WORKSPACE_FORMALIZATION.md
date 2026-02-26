# Workspace Formalization

Formalize "workspace" as a first-class entity, replacing the current implicit model where personal = `org_id` is null and org = the Organization model.

## Architecture

### Hierarchy

```
User
├── Personal Workspace (always 1, auto-created on signup)
└── Organizations (0..N, billing/admin containers)
    └── Workspaces (1..N per org, content isolation units)
        └── Conversations, Templates, etc.
```

### Entity Roles

- **Organization** — Admin/billing container. Owner pays for seats. Has admin + member roles.
- **Workspace** — Content isolation unit. Where conversations and templates live.
- **Personal Workspace** — User's own private content. Billing tied to user's plan tier.

### Extensibility: Future Layers

The hierarchy is designed so that **content only ever references workspace** (the leaf). Layers above workspace are structural — adding a new one never requires a content table migration.

**"Default container" pattern:** Every layer always has at least one default child. This keeps FK chains consistent and avoids nullable branching logic.

| Layer added | What changes | What doesn't change |
|---|---|---|
| Team (between Org → Workspace) | `workspaces.organization_id` → `workspaces.team_id`; new `teams` table with `organization_id`; auto-create default team per org | Content tables (still point to `workspace_id`) |
| Division (between Org → Team) | Same idea: `teams.organization_id` → `teams.division_id`; new `divisions` table; default division per org | Content tables, workspaces |

**Query pattern to preserve:** Always query content by walking down from the container, not by direct FK on content:
```sql
-- Good: survives new layers (just add joins in the subquery)
WHERE workspace_id IN (SELECT id FROM workspaces WHERE organization_id = ?)

-- Bad: breaks when organization_id is removed from content
WHERE conversations.organization_id = ?
```

**Permission resolution:** Walks upward from workspace → parent container → org. Adding a layer inserts a new step in the chain but doesn't change the pattern.

### Privacy Rules

- **Conversations & Templates** — Scoped to workspace. In org context, admins manage, members participate.
- **Journals** — Always private to creator, regardless of workspace. Sharing is opt-in.
- **Spaces** — Always private to creator, regardless of workspace. Sharing is opt-in via members/links.

### Schema

```sql
CREATE TABLE workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR NOT NULL CHECK (type IN ('personal', 'organization')),
    name VARCHAR NOT NULL,
    description VARCHAR,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE workspace_members (
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR NOT NULL CHECK (role IN ('admin', 'member')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    PRIMARY KEY (workspace_id, user_id)
);
```

Constraints:
- Personal workspaces: `organization_id` is null, `type = 'personal'`, one per user.
- Org workspaces: `organization_id` is set, `type = 'organization'`, 1..N per org.

## Migration Path

### Step 1: Create tables

Add `workspaces` and `workspace_members` tables via Alembic migration. No FK changes to existing tables yet.

### Step 2: Auto-create personal workspaces

For every existing user, create a personal workspace row:
- `type = 'personal'`, `name = 'Personal'`, `owner_id = user.id`, `organization_id = null`
- Add the user as an admin member in `workspace_members`

Update the signup flow to auto-create a personal workspace on registration.

### Step 3: Auto-create default org workspaces

For every existing organization, create one default workspace:
- `type = 'organization'`, `name = org.name`, `owner_id = org.owner_id`, `organization_id = org.id`

### Step 4: Migrate workspace members from org members

Copy `organization_members` into `workspace_members` for each org's default workspace, preserving roles.

### Step 5: Add `workspace_id` column to content tables

Add a nullable `workspace_id UUID REFERENCES workspaces(id)` column to:
- `conversations`
- Any other content tables scoped by `organization_id`

Do NOT drop `organization_id` yet — both columns coexist during migration.

### Step 6: Backfill `workspace_id`

For each content row:
- If `organization_id` is set → look up the org's default workspace, set `workspace_id`
- If `organization_id` is null → look up the creator's personal workspace, set `workspace_id`

After backfill, make `workspace_id` NOT NULL.

### Step 7: Update API endpoints

Switch all backend endpoints from `organization_id` filtering to `workspace_id`:
- List/create conversations, templates
- Permission checks (workspace membership replaces org membership for content access)
- Keep organization-level endpoints for admin/billing/settings

### Step 8: Update frontend context

- Rename `OrganizationContext` → `WorkspaceContext`
- `currentWorkspaceId` replaces `currentOrgId` for content queries
- Org-level context remains for settings/billing screens
- Update all pages that pass `organization_id` to pass `workspace_id`

### Step 9: Update workspace switcher

- Personal workspace remains a top-level option
- Orgs show nested: Org name → list of workspaces within that org
- Add ability to create/manage multiple workspaces per org (admin only)

### Step 10: Drop `organization_id` from content tables

Once all reads/writes use `workspace_id`:
- Drop `organization_id` column from `conversations` and other content tables
- Remove legacy org-based content filtering from backend
- Clean up any remaining references in frontend

## Status

- [x] Step 0: Copy clarity on the implicit model (shipped on `feature/workspace-clarity`)
- [x] Step 1: Create tables
- [x] Step 2: Auto-create personal workspaces
- [x] Step 3: Auto-create default org workspaces
- [x] Step 4: Migrate workspace members
- [x] Step 5: Add `workspace_id` to content tables
- [x] Step 6: Backfill `workspace_id`
- [ ] Step 7: Update API endpoints
- [ ] Step 8: Update frontend context
- [ ] Step 9: Update workspace switcher
- [ ] Step 10: Drop `organization_id` from content tables
