// Copyright (c) 2024-2026 Jasper Ford
// SPDX-License-Identifier: AGPL-3.0-or-later
// Author: Jasper Ford
// See NOTICE file for attribution and acknowledgements.

namespace Nexus.Api.Services;

/// <summary>
/// Static catalog for Laravel-compatible Caring Community research agreement templates.
/// </summary>
public sealed class ResearchAgreementTemplateService
{
    private static readonly IReadOnlyList<ResearchAgreementTemplate> Templates =
    [
        new(
            "aggregate_dataset_v1",
            "Anonymised Aggregate Dataset Agreement (FADP/nDSG)",
            "Tenant-scoped aggregate metrics only - no row-level member data, suppression threshold N>=5. Suitable for descriptive studies, monitoring, and Pro Senectute / Age-Stiftung style evaluations.",
            [
                "descriptive cohort statistics",
                "before/after pilot evaluations",
                "cantonal social-policy reporting"
            ],
            [
                "partner_name",
                "partner_institution",
                "tenant_name",
                "dpo_name",
                "dpo_email",
                "period_start",
                "period_end",
                "jurisdiction"
            ]),
        new(
            "longitudinal_cohort_v1",
            "Longitudinal Cohort Study Agreement (FADP/nDSG)",
            "For multi-year cohort follow-up over the same Cooperative population. Aggregate-only, period-stratified, with explicit re-consent at each annual extension.",
            [
                "multi-year ETH / FHNW / Pro Senectute studies",
                "longitudinal Zeitvorsorge outcomes research",
                "reciprocity-balance trend analyses"
            ],
            [
                "partner_name",
                "partner_institution",
                "tenant_name",
                "dpo_name",
                "dpo_email",
                "cohort_window_years",
                "jurisdiction"
            ]),
        new(
            "pilot_evaluation_v1",
            "Pilot / Service Evaluation Agreement",
            "Short-form agreement for evaluating a single pilot region or programme over a fixed window. Designed for cantonal social departments, municipal sponsors, and foundation evaluators.",
            [
                "AG83 pilot scoreboard evaluations",
                "cantonal social-department reviews",
                "Age-Stiftung / KISS evaluation reports"
            ],
            [
                "partner_name",
                "partner_institution",
                "tenant_name",
                "dpo_name",
                "dpo_email",
                "pilot_region",
                "period_start",
                "period_end"
            ]),
        new(
            "cross_node_federation_v1",
            "Cross-Node Federation Aggregate Study Agreement",
            "For studies spanning multiple Cooperatives via federation aggregates (AG20). Each participating Cooperative must independently sign and configure its federation aggregate opt-in.",
            [
                "national Fondation KISS comparative studies",
                "multi-canton policy research",
                "cross-Verein federation impact analyses"
            ],
            [
                "partner_name",
                "partner_institution",
                "tenant_name",
                "dpo_name",
                "dpo_email",
                "study_title",
                "jurisdiction"
            ])
    ];

    public IReadOnlyList<object> ListTemplates()
    {
        return Templates
            .Select(template => new
            {
                key = template.Key,
                title = template.Title,
                summary = template.Summary,
                suitable_for = template.SuitableFor,
                placeholders = template.Placeholders
            })
            .Cast<object>()
            .ToArray();
    }

    private sealed record ResearchAgreementTemplate(
        string Key,
        string Title,
        string Summary,
        IReadOnlyList<string> SuitableFor,
        IReadOnlyList<string> Placeholders);
}
