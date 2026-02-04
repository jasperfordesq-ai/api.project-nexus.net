# Phase 11: Groups & Events - Execution Log

## Date: 2026-02-02

## Objective
Implement community groups and events with RSVP functionality.

## Implementation Summary

### 1. Group Entity
Created `Group.cs` with:
- Tenant isolation (ITenantEntity)
- Name, Description, IsPrivate, ImageUrl
- CreatedById (owner reference)
- Member collection navigation

### 2. GroupMember Entity
Created `GroupMember.cs` with:
- Group/User junction
- Role: member, admin, owner
- JoinedAt timestamp

### 3. Event Entity
Created `Event.cs` with:
- Tenant isolation
- Title, Description, Location
- StartsAt, EndsAt, MaxAttendees
- Optional GroupId for group events
- IsCancelled flag
- RSVP status constants

### 4. EventRsvp Entity
Created `EventRsvp.cs` with:
- Event/User junction
- Status: going, maybe, not_going
- RespondedAt timestamp

### 5. Database Configuration
Added to NexusDbContext:
- groups, group_members, events, event_rsvps tables
- Global query filters for tenant isolation
- Unique constraints (one membership per user/group, one RSVP per user/event)
- Cascade deletes for related data

### 6. GroupsController Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/groups | List all groups (paginated, searchable) |
| GET | /api/groups/my | List groups I'm a member of |
| GET | /api/groups/{id} | Get single group with my membership |
| POST | /api/groups | Create a group (auto become owner) |
| PUT | /api/groups/{id} | Update group (admin/owner only) |
| DELETE | /api/groups/{id} | Delete group (owner only) |
| GET | /api/groups/{id}/members | List group members |
| POST | /api/groups/{id}/join | Join a public group |
| DELETE | /api/groups/{id}/leave | Leave a group |
| POST | /api/groups/{id}/members | Add member (admin/owner only) |
| DELETE | /api/groups/{id}/members/{memberId} | Remove member |
| PUT | /api/groups/{id}/members/{memberId}/role | Update member role |
| PUT | /api/groups/{id}/transfer-ownership | Transfer ownership |

### 7. EventsController Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/events | List events (paginated, filterable) |
| GET | /api/events/my | List events I've RSVP'd to |
| GET | /api/events/{id} | Get single event with my RSVP |
| POST | /api/events | Create an event (auto RSVP as going) |
| PUT | /api/events/{id} | Update event (creator/admin only) |
| PUT | /api/events/{id}/cancel | Cancel event |
| DELETE | /api/events/{id} | Delete event |
| GET | /api/events/{id}/rsvps | List event RSVPs |
| POST | /api/events/{id}/rsvp | RSVP to event |
| DELETE | /api/events/{id}/rsvp | Remove RSVP |

## To Apply Migration

```bash
# Start the Docker stack (migrations run automatically)
docker compose up -d

# Or run migrations manually inside container
docker compose exec api dotnet ef database update
```

## Test Script

Save and run as PowerShell script after API is running:

```powershell
# See test-groups-events.ps1 in scratchpad
```

## Files Created

### New Files
- `src/Nexus.Api/Entities/Group.cs`
- `src/Nexus.Api/Entities/GroupMember.cs`
- `src/Nexus.Api/Entities/Event.cs`
- `src/Nexus.Api/Entities/EventRsvp.cs`
- `src/Nexus.Api/Controllers/GroupsController.cs`
- `src/Nexus.Api/Controllers/EventsController.cs`

### Modified Files
- `src/Nexus.Api/Data/NexusDbContext.cs` - Added 4 new DbSets and configurations

## Business Rules

### Groups
- Creator automatically becomes owner
- Private groups require admin to add members
- Owner cannot leave (must transfer or delete)
- Only owner can change roles and transfer ownership
- Admins can add/remove members but not other admins

### Events
- Creator automatically RSVPs as going
- Group events require group membership to create
- Can filter by group, upcoming only, or search
- MaxAttendees enforced on "going" RSVPs
- Cancelled events cannot receive new RSVPs

## Test Results

```
=== Phase 11: Groups & Events Tests ===

1. Register User A...
  User A registered (ID: 67)

2. Register User B...
  User B registered (ID: 68)

=== Groups Tests ===

3. User A creates a public group...
  Group created (ID: 3)
    Name: Test Community Group
    My Role: owner

4. List all groups...
  Found 1 group(s)

5. Get group details...
  Group: Test Community Group
  Members: 1
  My Role: owner

6. User B joins the group...
  Joined group successfully
  Role: member

7. List group members...
  Found 2 member(s)
    - GroupA Test (owner)
    - GroupB Test (member)

8. Owner promotes User B to admin...
  Member role updated

9. Verify role change...
  User B's role: admin

10. Admin updates group description...
  Group updated

11. User A creates a private group...
  Private group created (ID: 4)

12. User B tries to join private group (should fail)...
  Correctly rejected: Private group requires admin

=== Events Tests ===

13. User A creates a community event...
  Event created (ID: 2)
    Title: Community Meetup
    My RSVP: going

14. List all events...
  Found 2 event(s)

15. Get event details...
  Event: Community Meetup
  Location: Town Hall
  Going: 1

16. User B RSVPs as going...
  RSVP recorded

17. Check RSVP counts...
  Going: 2

18. User B changes RSVP to maybe...
  RSVP recorded

19. User B lists their events...
  Found 1 event(s) I've RSVP'd to

20. Get RSVPs for event...
  Found 2 RSVP(s)
    - GroupA Test: going
    - GroupB Test: maybe

21. User A creates a group event...
  Group event created (ID: 3)

22. Filter events by group...
  Found 1 event(s) for this group

23. Cancel community event...
  Event cancelled

24. User B removes RSVP...
  RSVP removed

25. User B leaves the group...
  Left group successfully

26. Test tenant isolation...
  Globex sees 0 group(s) - Tenant isolation working!
  Globex sees 0 event(s) - Tenant isolation working!

27. Cleanup - delete groups...
  Groups deleted

=== All Phase 11 Tests PASSED ===
```

## Phase 11 Complete ✓
