# Entity Framework Core Mapping Guide

## Overview

This document maps PHP models to C# Entity Framework Core entities, including all relationships, enums, and configurations.

---

## Core Entities

### 1. Tenant

```csharp
// Nexus.Domain/Entities/Tenant.cs
public class Tenant
{
    public int Id { get; set; }
    public int? ParentId { get; set; }
    public string Path { get; set; } = "/";  // Hierarchical path e.g., "/1/2/5/"
    public string Slug { get; set; } = null!;
    public string Name { get; set; } = null!;
    public string? Domain { get; set; }
    public string? Logo { get; set; }
    public string? FaviconUrl { get; set; }
    public string? PrimaryColor { get; set; }
    public string? AccentColor { get; set; }
    public string Currency { get; set; } = "hours";
    public string DefaultLayout { get; set; } = "modern";
    public string? Features { get; set; }  // JSON
    public bool AllowsSubtenants { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    // Navigation properties
    public Tenant? Parent { get; set; }
    public ICollection<Tenant> Children { get; set; } = new List<Tenant>();
    public ICollection<User> Users { get; set; } = new List<User>();
    public ICollection<Listing> Listings { get; set; } = new List<Listing>();
    // ... other tenant-scoped collections
}

// Configuration
public class TenantConfiguration : IEntityTypeConfiguration<Tenant>
{
    public void Configure(EntityTypeBuilder<Tenant> builder)
    {
        builder.ToTable("tenants");

        builder.HasKey(t => t.Id);

        builder.Property(t => t.Slug)
            .HasMaxLength(100)
            .IsRequired();

        builder.Property(t => t.Name)
            .HasMaxLength(255)
            .IsRequired();

        builder.Property(t => t.Features)
            .HasColumnType("json");

        builder.HasIndex(t => t.Slug).IsUnique();
        builder.HasIndex(t => t.Domain).IsUnique();

        // Self-referencing hierarchy
        builder.HasOne(t => t.Parent)
            .WithMany(t => t.Children)
            .HasForeignKey(t => t.ParentId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
```

### 2. User

```csharp
// Nexus.Domain/Entities/User.cs
public class User : ITenantEntity, ISoftDelete
{
    public int Id { get; set; }
    public int TenantId { get; set; }
    public string Email { get; set; } = null!;
    public string? Username { get; set; }
    public string? PasswordHash { get; set; }
    public string FirstName { get; set; } = null!;
    public string LastName { get; set; } = null!;
    public string? Avatar { get; set; }
    public string? Bio { get; set; }
    public string? Phone { get; set; }
    public string? Location { get; set; }
    public decimal? Latitude { get; set; }
    public decimal? Longitude { get; set; }
    public string? Skills { get; set; }  // JSON array
    public string? Interests { get; set; }  // JSON array

    // Account status
    public UserStatus Status { get; set; } = UserStatus.Active;
    public UserRole Role { get; set; } = UserRole.Member;
    public bool IsGod { get; set; }
    public bool IsSuperAdmin { get; set; }
    public bool IsTenantSuperAdmin { get; set; }
    public DateTime? EmailVerifiedAt { get; set; }
    public DateTime? LastLoginAt { get; set; }
    public DateTime? DeletedAt { get; set; }
    public DateTime? AnonymizedAt { get; set; }

    // Gamification
    public int Xp { get; set; }
    public int Level { get; set; } = 1;
    public int? ShowcasedBadgeId { get; set; }

    // Wallet
    public decimal Balance { get; set; }

    // Preferences
    public string PreferredLayout { get; set; } = "modern";
    public string? NotificationPreferences { get; set; }  // JSON
    public string? EmailPreferences { get; set; }  // JSON
    public string? PrivacySettings { get; set; }  // JSON

    // 2FA
    public string? TotpSecret { get; set; }
    public bool TotpEnabled { get; set; }
    public string? BackupCodes { get; set; }  // JSON array

    // Timestamps
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    // Navigation properties
    public Tenant Tenant { get; set; } = null!;
    public ICollection<Listing> Listings { get; set; } = new List<Listing>();
    public ICollection<Transaction> SentTransactions { get; set; } = new List<Transaction>();
    public ICollection<Transaction> ReceivedTransactions { get; set; } = new List<Transaction>();
    public ICollection<FeedPost> Posts { get; set; } = new List<FeedPost>();
    public ICollection<UserBadge> Badges { get; set; } = new List<UserBadge>();
    public ICollection<GroupMember> GroupMemberships { get; set; } = new List<GroupMember>();
    public ICollection<Connection> ConnectionsInitiated { get; set; } = new List<Connection>();
    public ICollection<Connection> ConnectionsReceived { get; set; } = new List<Connection>();
    public ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();
    public ICollection<WebAuthnCredential> WebAuthnCredentials { get; set; } = new List<WebAuthnCredential>();
}

// Nexus.Domain/Enums/UserStatus.cs
public enum UserStatus
{
    Pending,
    Active,
    Suspended,
    Banned,
    Deleted
}

// Nexus.Domain/Enums/UserRole.cs
public enum UserRole
{
    Member,
    Moderator,
    TenantAdmin,
    Admin,
    NewsletterAdmin
}

// Configuration
public class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.ToTable("users");

        builder.HasKey(u => u.Id);

        builder.Property(u => u.Email)
            .HasMaxLength(255)
            .IsRequired();

        builder.Property(u => u.Status)
            .HasConversion<string>()
            .HasMaxLength(20);

        builder.Property(u => u.Role)
            .HasConversion<string>()
            .HasMaxLength(50);

        builder.Property(u => u.Skills).HasColumnType("json");
        builder.Property(u => u.Interests).HasColumnType("json");
        builder.Property(u => u.NotificationPreferences).HasColumnType("json");
        builder.Property(u => u.EmailPreferences).HasColumnType("json");
        builder.Property(u => u.PrivacySettings).HasColumnType("json");
        builder.Property(u => u.BackupCodes).HasColumnType("json");

        // Composite unique constraint (email unique per tenant)
        builder.HasIndex(u => new { u.Email, u.TenantId }).IsUnique();
        builder.HasIndex(u => new { u.Username, u.TenantId }).IsUnique();

        // Soft delete query filter
        builder.HasQueryFilter(u => u.DeletedAt == null);

        // Relationships
        builder.HasOne(u => u.Tenant)
            .WithMany(t => t.Users)
            .HasForeignKey(u => u.TenantId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
```

### 3. Listing

```csharp
// Nexus.Domain/Entities/Listing.cs
public class Listing : ITenantEntity, ISoftDelete
{
    public int Id { get; set; }
    public int TenantId { get; set; }
    public int UserId { get; set; }
    public string Title { get; set; } = null!;
    public string? Description { get; set; }
    public ListingType Type { get; set; }
    public ListingStatus Status { get; set; } = ListingStatus.Active;
    public int? CategoryId { get; set; }
    public string? Image { get; set; }
    public decimal? EstimatedHours { get; set; }
    public string? Location { get; set; }
    public decimal? Latitude { get; set; }
    public decimal? Longitude { get; set; }
    public string? Tags { get; set; }  // JSON array
    public bool IsFeatured { get; set; }
    public bool IsFederatedVisible { get; set; }
    public int ViewCount { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public DateTime? DeletedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    // Navigation
    public Tenant Tenant { get; set; } = null!;
    public User User { get; set; } = null!;
    public Category? Category { get; set; }
    public ICollection<Transaction> Transactions { get; set; } = new List<Transaction>();
}

// Nexus.Domain/Enums/ListingType.cs
public enum ListingType
{
    Offer,
    Request
}

// Nexus.Domain/Enums/ListingStatus.cs
public enum ListingStatus
{
    Draft,
    Active,
    Fulfilled,
    Expired,
    Cancelled
}

// Configuration
public class ListingConfiguration : IEntityTypeConfiguration<Listing>
{
    public void Configure(EntityTypeBuilder<Listing> builder)
    {
        builder.ToTable("listings");

        builder.HasKey(l => l.Id);

        builder.Property(l => l.Title)
            .HasMaxLength(255)
            .IsRequired();

        builder.Property(l => l.Type)
            .HasConversion<string>()
            .HasMaxLength(20);

        builder.Property(l => l.Status)
            .HasConversion<string>()
            .HasMaxLength(20);

        builder.Property(l => l.Tags).HasColumnType("json");

        builder.HasIndex(l => l.TenantId);
        builder.HasIndex(l => l.UserId);
        builder.HasIndex(l => l.Status);
        builder.HasIndex(l => new { l.Latitude, l.Longitude });

        builder.HasQueryFilter(l => l.DeletedAt == null);

        builder.HasOne(l => l.Tenant)
            .WithMany(t => t.Listings)
            .HasForeignKey(l => l.TenantId);

        builder.HasOne(l => l.User)
            .WithMany(u => u.Listings)
            .HasForeignKey(l => l.UserId);

        builder.HasOne(l => l.Category)
            .WithMany()
            .HasForeignKey(l => l.CategoryId);
    }
}
```

### 4. Transaction (Wallet)

```csharp
// Nexus.Domain/Entities/Transaction.cs
public class Transaction : ITenantEntity
{
    public int Id { get; set; }
    public int TenantId { get; set; }
    public int SenderId { get; set; }
    public int ReceiverId { get; set; }
    public decimal Amount { get; set; }
    public string? Description { get; set; }
    public int? ListingId { get; set; }
    public TransactionStatus Status { get; set; } = TransactionStatus.Completed;
    public bool IsFederated { get; set; }
    public int? SourceTenantId { get; set; }
    public int? TargetTenantId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    // Navigation
    public Tenant Tenant { get; set; } = null!;
    public User Sender { get; set; } = null!;
    public User Receiver { get; set; } = null!;
    public Listing? Listing { get; set; }
}

// Nexus.Domain/Enums/TransactionStatus.cs
public enum TransactionStatus
{
    Pending,
    Completed,
    Cancelled,
    Disputed,
    Refunded
}

// Configuration
public class TransactionConfiguration : IEntityTypeConfiguration<Transaction>
{
    public void Configure(EntityTypeBuilder<Transaction> builder)
    {
        builder.ToTable("transactions");

        builder.HasKey(t => t.Id);

        builder.Property(t => t.Amount)
            .HasPrecision(10, 2);

        builder.Property(t => t.Status)
            .HasConversion<string>()
            .HasMaxLength(20);

        builder.HasIndex(t => t.SenderId);
        builder.HasIndex(t => t.ReceiverId);
        builder.HasIndex(t => t.CreatedAt);

        builder.HasOne(t => t.Sender)
            .WithMany(u => u.SentTransactions)
            .HasForeignKey(t => t.SenderId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(t => t.Receiver)
            .WithMany(u => u.ReceivedTransactions)
            .HasForeignKey(t => t.ReceiverId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(t => t.Listing)
            .WithMany(l => l.Transactions)
            .HasForeignKey(t => t.ListingId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
```

### 5. FeedPost

```csharp
// Nexus.Domain/Entities/FeedPost.cs
public class FeedPost : ITenantEntity, ISoftDelete
{
    public int Id { get; set; }
    public int TenantId { get; set; }
    public int UserId { get; set; }
    public int? ParentId { get; set; }  // For replies
    public string? Content { get; set; }
    public string? Image { get; set; }
    public int? PollId { get; set; }
    public int? SharedPostId { get; set; }
    public int LikeCount { get; set; }
    public int CommentCount { get; set; }
    public int ShareCount { get; set; }
    public bool IsPinned { get; set; }
    public DateTime? DeletedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    // Navigation
    public Tenant Tenant { get; set; } = null!;
    public User User { get; set; } = null!;
    public FeedPost? Parent { get; set; }
    public FeedPost? SharedPost { get; set; }
    public Poll? Poll { get; set; }
    public ICollection<FeedPost> Replies { get; set; } = new List<FeedPost>();
    public ICollection<Like> Likes { get; set; } = new List<Like>();
    public ICollection<Comment> Comments { get; set; } = new List<Comment>();
}
```

### 6. Message

```csharp
// Nexus.Domain/Entities/Message.cs
public class Message : ITenantEntity
{
    public int Id { get; set; }
    public int TenantId { get; set; }
    public int SenderId { get; set; }
    public int ReceiverId { get; set; }
    public int? ConversationId { get; set; }
    public string Content { get; set; } = null!;
    public string? VoiceUrl { get; set; }
    public bool IsRead { get; set; }
    public DateTime? ReadAt { get; set; }
    public bool IsArchived { get; set; }
    public DateTime CreatedAt { get; set; }

    // Navigation
    public Tenant Tenant { get; set; } = null!;
    public User Sender { get; set; } = null!;
    public User Receiver { get; set; } = null!;
    public Conversation? Conversation { get; set; }
}
```

### 7. Group

```csharp
// Nexus.Domain/Entities/Group.cs
public class Group : ITenantEntity
{
    public int Id { get; set; }
    public int TenantId { get; set; }
    public int CreatorId { get; set; }
    public string Name { get; set; } = null!;
    public string Slug { get; set; } = null!;
    public string? Description { get; set; }
    public string? Image { get; set; }
    public string? CoverImage { get; set; }
    public GroupPrivacy Privacy { get; set; } = GroupPrivacy.Public;
    public bool RequiresApproval { get; set; }
    public int MemberCount { get; set; }
    public string? Features { get; set; }  // JSON
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    // Navigation
    public Tenant Tenant { get; set; } = null!;
    public User Creator { get; set; } = null!;
    public ICollection<GroupMember> Members { get; set; } = new List<GroupMember>();
    public ICollection<GroupDiscussion> Discussions { get; set; } = new List<GroupDiscussion>();
}

// Nexus.Domain/Enums/GroupPrivacy.cs
public enum GroupPrivacy
{
    Public,
    Private,
    Secret
}
```

### 8. Event

```csharp
// Nexus.Domain/Entities/Event.cs
public class Event : ITenantEntity
{
    public int Id { get; set; }
    public int TenantId { get; set; }
    public int CreatorId { get; set; }
    public int? GroupId { get; set; }
    public string Title { get; set; } = null!;
    public string? Description { get; set; }
    public string? Image { get; set; }
    public string? Location { get; set; }
    public decimal? Latitude { get; set; }
    public decimal? Longitude { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public int? MaxAttendees { get; set; }
    public bool IsOnline { get; set; }
    public string? OnlineUrl { get; set; }
    public EventStatus Status { get; set; } = EventStatus.Published;
    public int AttendeeCount { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    // Navigation
    public Tenant Tenant { get; set; } = null!;
    public User Creator { get; set; } = null!;
    public Group? Group { get; set; }
    public ICollection<EventRsvp> Rsvps { get; set; } = new List<EventRsvp>();
}

// Nexus.Domain/Enums/EventStatus.cs
public enum EventStatus
{
    Draft,
    Published,
    Cancelled,
    Completed
}
```

### 9. Gamification Entities

```csharp
// Nexus.Domain/Entities/Badge.cs
public class Badge
{
    public int Id { get; set; }
    public string Key { get; set; } = null!;
    public string Name { get; set; } = null!;
    public string? Description { get; set; }
    public string? Icon { get; set; }
    public BadgeRarity Rarity { get; set; }
    public string? Category { get; set; }
    public int XpReward { get; set; }
    public string? Criteria { get; set; }  // JSON
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }

    public ICollection<UserBadge> UserBadges { get; set; } = new List<UserBadge>();
}

// Nexus.Domain/Entities/UserBadge.cs
public class UserBadge : ITenantEntity
{
    public int Id { get; set; }
    public int TenantId { get; set; }
    public int UserId { get; set; }
    public int BadgeId { get; set; }
    public DateTime EarnedAt { get; set; }
    public bool IsShowcased { get; set; }

    public Tenant Tenant { get; set; } = null!;
    public User User { get; set; } = null!;
    public Badge Badge { get; set; } = null!;
}

// Nexus.Domain/Entities/UserXpLog.cs
public class UserXpLog : ITenantEntity
{
    public int Id { get; set; }
    public int TenantId { get; set; }
    public int UserId { get; set; }
    public int Amount { get; set; }
    public string Action { get; set; } = null!;
    public string? Description { get; set; }
    public DateTime CreatedAt { get; set; }

    public Tenant Tenant { get; set; } = null!;
    public User User { get; set; } = null!;
}

// Nexus.Domain/Enums/BadgeRarity.cs
public enum BadgeRarity
{
    Common,
    Uncommon,
    Rare,
    Epic,
    Legendary
}
```

### 10. Authentication Entities

```csharp
// Nexus.Domain/Entities/RefreshToken.cs
public class RefreshToken
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string Token { get; set; } = null!;
    public string Jti { get; set; } = null!;  // JWT ID
    public string? Platform { get; set; }
    public string? DeviceInfo { get; set; }
    public string? IpAddress { get; set; }
    public DateTime ExpiresAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? RevokedAt { get; set; }

    public User User { get; set; } = null!;

    public bool IsExpired => DateTime.UtcNow >= ExpiresAt;
    public bool IsRevoked => RevokedAt.HasValue;
    public bool IsActive => !IsExpired && !IsRevoked;
}

// Nexus.Domain/Entities/RevokedToken.cs
public class RevokedToken
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string Jti { get; set; } = null!;
    public DateTime ExpiresAt { get; set; }
    public DateTime RevokedAt { get; set; }

    public User User { get; set; } = null!;
}

// Nexus.Domain/Entities/WebAuthnCredential.cs
public class WebAuthnCredential
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public byte[] CredentialId { get; set; } = null!;
    public byte[] PublicKey { get; set; } = null!;
    public uint SignCount { get; set; }
    public string? DeviceName { get; set; }
    public string? AaGuid { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime? LastUsedAt { get; set; }

    public User User { get; set; } = null!;
}

// Nexus.Domain/Entities/LoginAttempt.cs
public class LoginAttempt
{
    public int Id { get; set; }
    public string Identifier { get; set; } = null!;  // Email or IP
    public string Type { get; set; } = null!;  // "email" or "ip"
    public string? IpAddress { get; set; }
    public bool Success { get; set; }
    public DateTime AttemptedAt { get; set; }
}
```

---

## Interface Definitions

```csharp
// Nexus.Domain/Common/ITenantEntity.cs
public interface ITenantEntity
{
    int TenantId { get; set; }
}

// Nexus.Domain/Common/ISoftDelete.cs
public interface ISoftDelete
{
    DateTime? DeletedAt { get; set; }
}

// Nexus.Domain/Common/IAuditableEntity.cs
public interface IAuditableEntity
{
    DateTime CreatedAt { get; set; }
    DateTime? UpdatedAt { get; set; }
    int? CreatedBy { get; set; }
    int? UpdatedBy { get; set; }
}

// Nexus.Domain/Common/BaseEntity.cs
public abstract class BaseEntity : IAuditableEntity
{
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public int? CreatedBy { get; set; }
    public int? UpdatedBy { get; set; }
}
```

---

## DbContext with Global Query Filters

```csharp
// Nexus.Infrastructure/Persistence/NexusDbContext.cs
public class NexusDbContext : DbContext
{
    private readonly ICurrentTenantService _currentTenant;

    public NexusDbContext(
        DbContextOptions<NexusDbContext> options,
        ICurrentTenantService currentTenant)
        : base(options)
    {
        _currentTenant = currentTenant;
    }

    public DbSet<Tenant> Tenants => Set<Tenant>();
    public DbSet<User> Users => Set<User>();
    public DbSet<Listing> Listings => Set<Listing>();
    public DbSet<Transaction> Transactions => Set<Transaction>();
    public DbSet<FeedPost> FeedPosts => Set<FeedPost>();
    public DbSet<Message> Messages => Set<Message>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<Group> Groups => Set<Group>();
    public DbSet<GroupMember> GroupMembers => Set<GroupMember>();
    public DbSet<Event> Events => Set<Event>();
    public DbSet<EventRsvp> EventRsvps => Set<EventRsvp>();
    public DbSet<Connection> Connections => Set<Connection>();
    public DbSet<Review> Reviews => Set<Review>();
    public DbSet<Poll> Polls => Set<Poll>();
    public DbSet<Goal> Goals => Set<Goal>();
    public DbSet<Badge> Badges => Set<Badge>();
    public DbSet<UserBadge> UserBadges => Set<UserBadge>();
    public DbSet<UserXpLog> UserXpLogs => Set<UserXpLog>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<RevokedToken> RevokedTokens => Set<RevokedToken>();
    public DbSet<WebAuthnCredential> WebAuthnCredentials => Set<WebAuthnCredential>();
    public DbSet<LoginAttempt> LoginAttempts => Set<LoginAttempt>();
    // ... add all other DbSets

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Apply all configurations from assembly
        modelBuilder.ApplyConfigurationsFromAssembly(
            typeof(NexusDbContext).Assembly);

        // Apply global tenant filter to all tenant entities
        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            if (typeof(ITenantEntity).IsAssignableFrom(entityType.ClrType))
            {
                var parameter = Expression.Parameter(entityType.ClrType, "e");
                var tenantProperty = Expression.Property(parameter, nameof(ITenantEntity.TenantId));
                var tenantValue = Expression.Constant(_currentTenant.TenantId);
                var filter = Expression.Equal(tenantProperty, tenantValue);
                var lambda = Expression.Lambda(filter, parameter);

                modelBuilder.Entity(entityType.ClrType).HasQueryFilter(lambda);
            }
        }
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        foreach (var entry in ChangeTracker.Entries<IAuditableEntity>())
        {
            switch (entry.State)
            {
                case EntityState.Added:
                    entry.Entity.CreatedAt = DateTime.UtcNow;
                    break;
                case EntityState.Modified:
                    entry.Entity.UpdatedAt = DateTime.UtcNow;
                    break;
            }
        }

        // Set tenant ID for new tenant entities
        foreach (var entry in ChangeTracker.Entries<ITenantEntity>())
        {
            if (entry.State == EntityState.Added && entry.Entity.TenantId == 0)
            {
                entry.Entity.TenantId = _currentTenant.TenantId;
            }
        }

        return base.SaveChangesAsync(cancellationToken);
    }
}
```

---

## Scaffolding Command

To scaffold entities from the existing MySQL database:

```bash
cd src/Nexus.Infrastructure

dotnet ef dbcontext scaffold \
  "Server=localhost;Port=3306;Database=nexus;User=root;Password=yourpassword" \
  Pomelo.EntityFrameworkCore.MySql \
  --context NexusDbContext \
  --context-dir Persistence \
  --output-dir ../Nexus.Domain/Entities \
  --data-annotations \
  --force \
  --no-onconfiguring
```

After scaffolding, you'll need to:
1. Move entities to appropriate files
2. Add navigation properties
3. Implement interfaces (ITenantEntity, ISoftDelete)
4. Create enum types for status columns
5. Add configurations for Fluent API
6. Set up global query filters
