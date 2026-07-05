// Copyright (c) 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

using System.Reflection;
using System.Security.Claims;
using System.Text.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Routing;
using Microsoft.EntityFrameworkCore;
using Nexus.Api.Controllers;
using Nexus.Api.Data;
using Nexus.Api.Services;

namespace Nexus.Api.Tests;

public sealed class CoursesCompatibilityControllerUnitTests
{
    [Fact]
    public void Actions_ExposeLaravelReactCoursesRoutes()
    {
        var routes = typeof(CoursesCompatibilityController)
            .GetMethods(BindingFlags.Instance | BindingFlags.Public | BindingFlags.DeclaredOnly)
            .SelectMany(method => method.GetCustomAttributes<HttpMethodAttribute>()
                .SelectMany(attribute => attribute.HttpMethods.Select(http => $"{http} {attribute.Template}")))
            .ToArray();

        routes.Should().Contain([
            "GET api/v2/courses",
            "GET api/v2/courses/categories",
            "GET api/v2/courses/{idOrSlug}",
            "GET api/v2/courses/{id:int}/reviews",
            "POST api/v2/courses",
            "PUT api/v2/courses/{id:int}",
            "DELETE api/v2/courses/{id:int}",
            "POST api/v2/courses/{id:int}/enroll",
            "DELETE api/v2/courses/{id:int}/enroll",
            "GET api/v2/me/courses",
            "GET api/v2/courses/{id:int}/progress",
            "GET api/v2/courses/{id:int}/prerequisites",
            "POST api/v2/courses/{id:int}/lessons/{lessonId:int}/complete",
            "GET api/v2/courses/{id:int}/certificate",
            "GET api/v2/courses/{courseId:int}/lessons/{lessonId:int}/discussions",
            "POST api/v2/courses/{courseId:int}/lessons/{lessonId:int}/discussions",
            "DELETE api/v2/courses/discussions/{id:int}",
            "GET api/v2/courses/quizzes/{quizId:int}",
            "POST api/v2/courses/quizzes/{quizId:int}/attempt",
            "GET api/v2/courses/mine",
            "GET api/v2/courses/{id:int}/analytics",
            "GET api/v2/courses/{courseId:int}/grading",
            "POST api/v2/courses/attempts/{attemptId:int}/grade",
            "POST api/v2/courses/{courseId:int}/quizzes",
            "POST api/v2/courses/{courseId:int}/quizzes/{quizId:int}/questions",
            "DELETE api/v2/courses/{courseId:int}/quizzes/{quizId:int}/questions/{questionId:int}",
            "GET api/v2/courses/{courseId:int}/cohorts",
            "POST api/v2/courses/{courseId:int}/cohorts",
            "DELETE api/v2/courses/{courseId:int}/cohorts/{cohortId:int}",
            "GET api/v2/groups/{groupId:int}/courses",
            "GET api/v2/courses/{courseId:int}/groups",
            "POST api/v2/courses/{courseId:int}/groups/{groupId:int}",
            "DELETE api/v2/courses/{courseId:int}/groups/{groupId:int}",
            "POST api/v2/courses/{courseId:int}/sections",
            "PUT api/v2/courses/{courseId:int}/sections/{sectionId:int}",
            "DELETE api/v2/courses/{courseId:int}/sections/{sectionId:int}",
            "POST api/v2/courses/{courseId:int}/lessons",
            "PUT api/v2/courses/{courseId:int}/lessons/{lessonId:int}",
            "DELETE api/v2/courses/{courseId:int}/lessons/{lessonId:int}",
            "POST api/v2/admin/courses/discussions/{id:int}/hide"
        ]);
    }

    [Fact]
    public async Task ReactCoursesWorkflow_ReturnsLaravelCompatibleEnvelopes()
    {
        var tenant = CreateTenantContext(42);
        await using var db = CreateDbContext(tenant);
        var controller = CreateController(db, tenant, userId: 9001);

        var invalid = await controller.Store(new CourseCompatCourseRequest(), CancellationToken.None);
        var invalidResult = invalid.Should().BeOfType<ObjectResult>().Subject;
        invalidResult.StatusCode.Should().Be(StatusCodes.Status422UnprocessableEntity);

        var created = await controller.Store(new CourseCompatCourseRequest
        {
            Title = "Intro to care",
            Summary = "Basics",
            Level = "beginner",
            Visibility = "public"
        }, CancellationToken.None);

        var createdResult = created.Should().BeOfType<ObjectResult>().Subject;
        createdResult.StatusCode.Should().Be(StatusCodes.Status201Created);
        int courseId;
        using (var createdDocument = JsonDocument.Parse(JsonSerializer.Serialize(createdResult.Value)))
        {
            var course = createdDocument.RootElement.GetProperty("data");
            courseId = course.GetProperty("id").GetInt32();
            course.GetProperty("slug").GetString().Should().Be("intro-to-care");
            course.GetProperty("sections").EnumerateArray().Should().BeEmpty();
        }

        var published = await controller.Publish(courseId, CancellationToken.None);
        published.Should().BeOfType<OkObjectResult>();

        var browse = await controller.Index(page: 1, perPage: 12, q: null, categoryId: null, level: null, CancellationToken.None);
        using (var browseDocument = JsonDocument.Parse(JsonSerializer.Serialize(browse.Should().BeOfType<OkObjectResult>().Subject.Value)))
        {
            browseDocument.RootElement.GetProperty("data").EnumerateArray().Should().ContainSingle();
            browseDocument.RootElement.GetProperty("meta").GetProperty("total").GetInt32().Should().Be(1);
        }

        var section = await controller.StoreSection(courseId, new CourseCompatSectionRequest { Title = "Start" }, CancellationToken.None);
        int sectionId;
        using (var sectionDocument = JsonDocument.Parse(JsonSerializer.Serialize(section.Should().BeOfType<ObjectResult>().Subject.Value)))
        {
            sectionId = sectionDocument.RootElement.GetProperty("data").GetProperty("id").GetInt32();
        }

        var lesson = await controller.StoreLesson(courseId, new CourseCompatLessonRequest
        {
            SectionId = sectionId,
            Title = "Welcome lesson",
            ContentType = "text"
        }, CancellationToken.None);
        int lessonId;
        using (var lessonDocument = JsonDocument.Parse(JsonSerializer.Serialize(lesson.Should().BeOfType<ObjectResult>().Subject.Value)))
        {
            lessonId = lessonDocument.RootElement.GetProperty("data").GetProperty("id").GetInt32();
        }

        var enrollment = await controller.Enroll(courseId, CancellationToken.None);
        int enrollmentId;
        using (var enrollmentDocument = JsonDocument.Parse(JsonSerializer.Serialize(enrollment.Should().BeOfType<ObjectResult>().Subject.Value)))
        {
            enrollmentId = enrollmentDocument.RootElement.GetProperty("data").GetProperty("id").GetInt32();
            enrollmentDocument.RootElement.GetProperty("data").GetProperty("status").GetString().Should().Be("active");
        }

        var progress = await controller.Progress(courseId, CancellationToken.None);
        using (var progressDocument = JsonDocument.Parse(JsonSerializer.Serialize(progress.Should().BeOfType<OkObjectResult>().Subject.Value)))
        {
            progressDocument.RootElement.GetProperty("data").GetProperty("enrollment").GetProperty("id").GetInt32()
                .Should().Be(enrollmentId);
            progressDocument.RootElement.GetProperty("data").GetProperty("availability").EnumerateArray().Should().ContainSingle();
        }

        var prerequisites = await controller.Prerequisites(courseId, CancellationToken.None);
        using (var prerequisitesDocument = JsonDocument.Parse(JsonSerializer.Serialize(prerequisites.Should().BeOfType<OkObjectResult>().Subject.Value)))
        {
            prerequisitesDocument.RootElement.GetProperty("data").EnumerateArray().Should().BeEmpty();
        }

        var completed = await controller.CompleteLesson(courseId, lessonId, new CourseCompatLessonCompleteRequest { WatchPercent = 100 }, CancellationToken.None);
        using (var completedDocument = JsonDocument.Parse(JsonSerializer.Serialize(completed.Should().BeOfType<OkObjectResult>().Subject.Value)))
        {
            completedDocument.RootElement.GetProperty("data").GetProperty("progress_percent").GetInt32().Should().Be(100);
        }

        var review = await controller.Review(courseId, new CourseCompatReviewRequest { Rating = 5, Body = "Useful" }, CancellationToken.None);
        review.Should().BeOfType<ObjectResult>().Which.StatusCode.Should().Be(StatusCodes.Status201Created);

        var discussion = await controller.StoreDiscussion(courseId, lessonId, new CourseCompatDiscussionRequest { Body = "Question" }, CancellationToken.None);
        int discussionId;
        using (var discussionDocument = JsonDocument.Parse(JsonSerializer.Serialize(discussion.Should().BeOfType<ObjectResult>().Subject.Value)))
        {
            discussionId = discussionDocument.RootElement.GetProperty("data").GetProperty("id").GetInt32();
        }

        var quiz = await controller.StoreQuiz(courseId, new CourseCompatQuizRequest
        {
            LessonId = lessonId,
            Title = "Check",
            PassMarkPercent = 70
        }, CancellationToken.None);
        int quizId;
        using (var quizDocument = JsonDocument.Parse(JsonSerializer.Serialize(quiz.Should().BeOfType<ObjectResult>().Subject.Value)))
        {
            quizId = quizDocument.RootElement.GetProperty("data").GetProperty("id").GetInt32();
        }

        var question = await controller.StoreQuestion(courseId, quizId, new CourseCompatQuestionRequest
        {
            Prompt = "Ready?",
            Type = "truefalse",
            Points = 1
        }, CancellationToken.None);
        question.Should().BeOfType<ObjectResult>().Which.StatusCode.Should().Be(StatusCodes.Status201Created);

        var attempt = await controller.AttemptQuiz(quizId, new CourseCompatQuizAttemptRequest
        {
            Answers = new Dictionary<string, object?> { ["1"] = true }
        }, CancellationToken.None);
        int attemptId;
        using (var attemptDocument = JsonDocument.Parse(JsonSerializer.Serialize(attempt.Should().BeOfType<ObjectResult>().Subject.Value)))
        {
            attemptId = attemptDocument.RootElement.GetProperty("data").GetProperty("attempt_id").GetInt32();
        }

        var graded = await controller.GradeAttempt(attemptId, new CourseCompatGradeAttemptRequest
        {
            ScorePercent = 88,
            Passed = true,
            Feedback = "Good"
        }, CancellationToken.None);
        graded.Should().BeOfType<OkObjectResult>();

        var cohort = await controller.StoreCohort(courseId, new CourseCompatCohortRequest { Name = "Spring" }, CancellationToken.None);
        int cohortId;
        using (var cohortDocument = JsonDocument.Parse(JsonSerializer.Serialize(cohort.Should().BeOfType<ObjectResult>().Subject.Value)))
        {
            cohortId = cohortDocument.RootElement.GetProperty("data").GetProperty("id").GetInt32();
        }

        (await controller.AttachGroup(courseId, 123, CancellationToken.None)).Should().BeOfType<ObjectResult>()
            .Which.StatusCode.Should().Be(StatusCodes.Status201Created);
        (await controller.ForGroup(123, CancellationToken.None)).Should().BeOfType<OkObjectResult>();
        (await controller.HideDiscussion(discussionId, CancellationToken.None)).Should().BeOfType<OkObjectResult>();
        (await controller.DeleteCohort(courseId, cohortId, CancellationToken.None)).Should().BeOfType<OkObjectResult>();
        (await controller.Drop(courseId, CancellationToken.None)).Should().BeOfType<OkObjectResult>();
        (await controller.Destroy(courseId, CancellationToken.None)).Should().BeOfType<OkObjectResult>();
    }

    private static CoursesCompatibilityController CreateController(
        NexusDbContext db,
        TenantContext tenant,
        int userId)
    {
        var service = new CoursesCompatibilityService(db);
        return new CoursesCompatibilityController(service, tenant)
        {
            ControllerContext = ControllerContextFor(userId, tenant.GetTenantIdOrThrow(), "admin")
        };
    }

    private static TenantContext CreateTenantContext(int tenantId)
    {
        var tenant = new TenantContext();
        tenant.SetTenant(tenantId);
        return tenant;
    }

    private static NexusDbContext CreateDbContext(TenantContext tenant)
    {
        var options = new DbContextOptionsBuilder<NexusDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString("N"))
            .Options;

        return new NexusDbContext(options, tenant);
    }

    private static ControllerContext ControllerContextFor(int userId, int tenantId, string role)
    {
        return new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(new ClaimsIdentity(
                [
                    new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
                    new Claim("tenant_id", tenantId.ToString()),
                    new Claim(ClaimTypes.Role, role),
                    new Claim("role", role)
                ], "Test"))
            }
        };
    }
}
