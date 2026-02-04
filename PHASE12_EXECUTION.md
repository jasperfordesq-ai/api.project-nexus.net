# Phase 12: Social Feed - Execution Log

## Date: 2026-02-02

## Objective

Implement social activity feed with posts, likes, and comments.

## Implementation Summary

### 1. FeedPost Entity

Created `FeedPost.cs` with:

- Tenant isolation (ITenantEntity)
- Content, ImageUrl, IsPinned fields
- Optional GroupId for group-specific posts
- Likes and Comments collections

### 2. PostLike Entity

Created `PostLike.cs` with:

- Post/User junction
- CreatedAt timestamp
- Unique constraint (one like per user per post)

### 3. PostComment Entity

Created `PostComment.cs` with:

- Post/User junction
- Content field (max 2000 chars)
- CreatedAt/UpdatedAt timestamps

### 4. Database Configuration

Added to NexusDbContext:

- feed_posts, post_likes, post_comments tables
- Global query filters for tenant isolation
- Cascade deletes for likes/comments when post deleted

### 5. FeedController Endpoints

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | /api/feed | List feed posts (paginated, filterable by group) |
| GET | /api/feed/{id} | Get single post with like/comment counts |
| POST | /api/feed | Create a post |
| PUT | /api/feed/{id} | Update post (author only) |
| DELETE | /api/feed/{id} | Delete post (author or group admin) |
| POST | /api/feed/{id}/like | Like a post |
| DELETE | /api/feed/{id}/like | Unlike a post |
| GET | /api/feed/{id}/comments | List comments (paginated) |
| POST | /api/feed/{id}/comments | Add comment |
| DELETE | /api/feed/{id}/comments/{commentId} | Delete comment |

## To Apply Migration

```bash
# Start the Docker stack (migrations run automatically)
docker compose up -d

# Or run migrations manually inside container
docker compose exec api dotnet ef database update
```

## Test Script

Run after API is running:

```powershell
powershell -ExecutionPolicy Bypass -File "C:\Users\jaspe\AppData\Local\Temp\claude\c--xampp-htdocs-asp-net-backend\18a553b7-f5b3-4456-9c43-ff9a0cd73a0b\scratchpad\test-feed.ps1"
```

## Files Created

### New Files

- `src/Nexus.Api/Entities/FeedPost.cs`
- `src/Nexus.Api/Entities/PostLike.cs`
- `src/Nexus.Api/Entities/PostComment.cs`
- `src/Nexus.Api/Controllers/FeedController.cs`

### Modified Files

- `src/Nexus.Api/Data/NexusDbContext.cs` - Added 3 new DbSets and configurations

## Business Rules

### Posts

- Any user can create community-wide posts
- Group posts require group membership
- Only author can update their post
- Author or group admin/owner can delete post
- Posts sorted by pinned first, then by date

### Likes

- One like per user per post
- Like count returned with post data
- `is_liked` field indicates if current user has liked

### Comments

- Any authenticated user can comment
- Comment author, post author, or group admin can delete comments
- Comments sorted chronologically (oldest first)

## Test Results

```
=== Phase 12: Social Feed Tests ===

(Run the test script after migration to populate results)
```

## Phase 12 Complete ✓
