# Generated Laravel Accessible Route Matrix

Generated: 2026-07-06T07:38:32.634Z

| Metric | Count |
| --- | ---: |
| Laravel accessible routes | 608 |
| web-uk routes | 178 |
| Matched routes | 96 |
| Missing routes | 512 |
| Extra web-uk routes | 83 |

## Family Counts

| Family | Matched | Missing | Extra web-uk |
| --- | ---: | ---: | ---: |
| about | 1 | 0 | 0 |
| accessibility | 1 | 0 | 0 |
| account | 1 | 0 | 0 |
| achievements | 0 | 10 | 0 |
| activity | 0 | 2 | 0 |
| admin | 0 | 0 | 24 |
| appreciations | 0 | 1 | 0 |
| blog | 1 | 11 | 0 |
| chat | 1 | 1 | 0 |
| clubs | 1 | 0 | 0 |
| components | 0 | 0 | 1 |
| connections | 4 | 1 | 1 |
| contact | 1 | 1 | 0 |
| cookie-consent | 1 | 0 | 0 |
| cookies | 1 | 0 | 0 |
| coupons | 1 | 1 | 0 |
| courses | 1 | 25 | 0 |
| dashboard | 1 | 0 | 0 |
| events | 9 | 12 | 2 |
| exchanges | 1 | 3 | 0 |
| explore | 1 | 0 | 0 |
| faq | 0 | 1 | 0 |
| features | 1 | 0 | 0 |
| federation | 1 | 27 | 0 |
| feed | 1 | 21 | 10 |
| forgot-password | 0 | 0 | 2 |
| goals | 1 | 26 | 0 |
| group-exchanges | 0 | 9 | 0 |
| groups | 9 | 27 | 6 |
| guide | 1 | 0 | 0 |
| health | 0 | 0 | 1 |
| help | 1 | 0 | 0 |
| home | 2 | 0 | 0 |
| ideation | 1 | 33 | 0 |
| jobs | 1 | 37 | 0 |
| kb | 1 | 1 | 0 |
| leaderboard | 0 | 5 | 0 |
| legal | 6 | 0 | 0 |
| listings | 7 | 12 | 1 |
| login | 2 | 5 | 0 |
| logout | 1 | 0 | 1 |
| marketplace | 1 | 47 | 0 |
| matches | 0 | 4 | 0 |
| me | 0 | 6 | 0 |
| members | 2 | 9 | 1 |
| messages | 3 | 15 | 2 |
| newsletter | 0 | 1 | 0 |
| nexus-score | 0 | 2 | 0 |
| notifications | 4 | 2 | 0 |
| onboarding | 0 | 4 | 0 |
| organisations | 7 | 2 | 0 |
| password | 0 | 2 | 0 |
| podcasts | 1 | 13 | 0 |
| polls | 1 | 12 | 0 |
| premium | 1 | 5 | 0 |
| privacy | 0 | 0 | 1 |
| profile | 1 | 20 | 2 |
| progress | 0 | 0 | 4 |
| register | 2 | 0 | 0 |
| report-a-problem | 1 | 1 | 0 |
| reports | 0 | 0 | 3 |
| reset-password | 0 | 0 | 2 |
| resources | 1 | 11 | 0 |
| reviews | 1 | 6 | 4 |
| saved | 0 | 2 | 0 |
| search | 1 | 5 | 1 |
| service-unavailable | 0 | 0 | 1 |
| session | 0 | 0 | 1 |
| settings | 0 | 13 | 7 |
| skills | 1 | 0 | 0 |
| terms | 0 | 0 | 1 |
| trust-and-safety | 1 | 0 | 0 |
| users | 0 | 3 | 0 |
| verify-2fa | 0 | 0 | 1 |
| verify-email | 0 | 1 | 0 |
| volunteering | 2 | 50 | 0 |
| wallet | 2 | 4 | 3 |

## Missing Laravel Routes

| Method | Path | Family | Handler | Blade view | Auth | Gates |
| --- | --- | --- | --- | --- | --- | --- |
| GET | `/achievements` | achievements | achievements | achievements | auth-optional | feature:gamification |
| GET | `/achievements/badges/{param}` | achievements | gamificationBadgeDetail | gamification-badge | public-or-unknown |  |
| GET | `/achievements/collections` | achievements | gamificationCollections | gamification-collections | public-or-unknown |  |
| GET | `/achievements/engagement` | achievements | gamificationEngagement | gamification-engagement | public-or-unknown |  |
| GET | `/achievements/shop` | achievements | gamificationShop | gamification-shop | public-or-unknown |  |
| GET | `/achievements/showcase` | achievements | gamificationShowcase | gamification-showcase | public-or-unknown |  |
| POST | `/achievements/challenges/{param}/claim` | achievements | claimChallengeReward |  | auth-optional | feature:gamification |
| POST | `/achievements/daily-reward` | achievements | dailyReward |  | auth-optional | feature:gamification |
| POST | `/achievements/shop/purchase` | achievements | gamificationPurchase |  | public-or-unknown |  |
| POST | `/achievements/showcase` | achievements | gamificationUpdateShowcase |  | public-or-unknown |  |
| GET | `/activity` | activity | activity | activity | auth-optional |  |
| GET | `/activity/insights` | activity | activityInsights | activity-insights | auth-optional |  |
| POST | `/appreciations/{param}/react` | appreciations | savedReactAppreciation |  | auth-optional |  |
| GET | `/blog/{param}` | blog | blogPost | blog-post | auth-optional | feature:blog |
| GET | `/blog/{param}/comments` | blog | blogReviewsPostComments | blogreviews-post-comments | auth-optional | feature:blog |
| GET | `/blog/{param}/likers/{param}` | blog | blogReviewsPostLikers | blogreviews-likers | auth-optional | feature:blog |
| GET | `/blog/feed.xml` | blog | blogFeed |  | public-or-unknown | feature:blog |
| POST | `/blog/{param}/comments` | blog | storeBlogComment |  | auth-optional | feature:blog |
| POST | `/blog/{param}/comments/add` | blog | blogReviewsStorePostComment |  | auth-optional | feature:blog |
| POST | `/blog/{param}/like` | blog | blogTogglePostLike |  | auth-optional | feature:blog |
| POST | `/blog/{param}/react` | blog | blogReviewsPostReaction |  | auth-optional | feature:blog |
| POST | `/blog/comments/{param}/delete` | blog | blogReviewsDeleteComment |  | auth-optional | feature:blog |
| POST | `/blog/comments/{param}/react` | blog | blogReviewsCommentReaction |  | auth-optional | feature:blog |
| POST | `/blog/comments/{param}/update` | blog | blogReviewsUpdateComment |  | auth-optional | feature:blog |
| POST | `/chat` | chat | aiChatSend |  | auth-optional | feature:ai_chat |
| GET | `/connections/network` | connections | connectionsNetwork | connections-network | auth-optional | feature:connections |
| POST | `/contact` | contact | storeContact |  | public-or-unknown |  |
| GET | `/coupons/{param}` | coupons | couponShow | coupons-detail | auth-optional | feature:merchant_coupons |
| GET | `/courses/{param}` | courses | course | course-detail | auth-optional | feature:courses |
| GET | `/courses/{param}/certificate` | courses | courseCertificate |  | auth-optional | feature:courses |
| GET | `/courses/{param}/learn` | courses | commerceCourseLearn | commerce-course-learn | auth-optional | feature:courses |
| GET | `/courses/instructor` | courses | commerceInstructorCourses | commerce-instructor-courses | auth-optional | feature:courses |
| GET | `/courses/instructor/{param}/analytics` | courses | commerceCourseAnalytics | commerce-course-analytics | auth-optional | feature:courses |
| GET | `/courses/instructor/{param}/edit` | courses | commerceEditCourseForm | commerce-course-form | auth-optional | feature:courses |
| GET | `/courses/instructor/{param}/grading` | courses | commerceCourseGrading | commerce-course-grading | auth-optional | feature:courses |
| GET | `/courses/instructor/new` | courses | commerceCreateCourseForm | commerce-course-form | auth-optional | feature:courses |
| GET | `/courses/mine` | courses | commerceMyLearning | commerce-my-learning | auth-optional | feature:courses |
| POST | `/courses/{param}/enrol` | courses | enrolCourse |  | auth-optional | feature:courses |
| POST | `/courses/{param}/lessons/{param}/complete` | courses | commerceCompleteLesson |  | auth-optional | feature:courses |
| POST | `/courses/{param}/lessons/{param}/quiz` | courses | commerceCourseQuizSubmit |  | auth-optional | feature:courses |
| POST | `/courses/{param}/reviews` | courses | submitCourseReview |  | auth-optional | feature:courses |
| POST | `/courses/instructor/{param}/delete` | courses | commerceDeleteCourse |  | auth-optional | feature:courses |
| POST | `/courses/instructor/{param}/grading/{param}` | courses | commerceGradeAttempt |  | auth-optional | feature:courses |
| POST | `/courses/instructor/{param}/lessons` | courses | commerceStoreCourseLesson |  | auth-optional | feature:courses |
| POST | `/courses/instructor/{param}/lessons/{param}/delete` | courses | commerceDeleteCourseLesson |  | auth-optional | feature:courses |
| POST | `/courses/instructor/{param}/lessons/{param}/update` | courses | commerceUpdateCourseLesson |  | auth-optional | feature:courses |
| POST | `/courses/instructor/{param}/publish` | courses | commercePublishCourse |  | auth-optional | feature:courses |
| POST | `/courses/instructor/{param}/sections` | courses | commerceStoreCourseSection |  | auth-optional | feature:courses |
| POST | `/courses/instructor/{param}/sections/{param}/delete` | courses | commerceDeleteCourseSection |  | auth-optional | feature:courses |
| POST | `/courses/instructor/{param}/sections/{param}/update` | courses | commerceUpdateCourseSection |  | auth-optional | feature:courses |
| POST | `/courses/instructor/{param}/unpublish` | courses | commerceUnpublishCourse |  | auth-optional | feature:courses |
| POST | `/courses/instructor/{param}/update` | courses | commerceUpdateCourse |  | auth-optional | feature:courses |
| POST | `/courses/instructor/new` | courses | commerceStoreCourse |  | auth-optional | feature:courses |
| GET | `/events/{param}/map` | events | eventsMap | events-map | auth-optional | feature:events; feature:maps |
| GET | `/events/{param}/polls` | events | eventsPolls | events-polls | public-or-unknown |  |
| GET | `/events/{param}/recurring-edit` | events | eventsRecurringEdit | events-recurring-edit | public-or-unknown |  |
| GET | `/events/{param}/translate` | events | eventsTranslate | events-translate | auth-optional | feature:events |
| GET | `/events/browse` | events | eventsBrowse | events-browse | public-or-unknown | feature:events |
| POST | `/events/{param}/attendees/{param}/check-in` | events | storeEventCheckin |  | public-or-unknown |  |
| POST | `/events/{param}/polls` | events | eventsUpdatePolls |  | public-or-unknown |  |
| POST | `/events/{param}/polls/{param}/vote` | events | storeEventPollVote |  | auth-optional | feature:events |
| POST | `/events/{param}/recurring-edit` | events | eventsUpdateRecurring |  | public-or-unknown |  |
| POST | `/events/{param}/translate` | events | eventsRunTranslate | events-translate | auth-optional | feature:events |
| POST | `/events/{param}/waitlist` | events | joinEventWaitlist |  | auth-optional | feature:events |
| POST | `/events/{param}/waitlist/leave` | events | leaveEventWaitlist |  | auth-optional | feature:events |
| GET | `/exchanges/{param}` | exchanges | exchange | exchange-detail | auth-optional | module:listings |
| POST | `/exchanges/{param}` | exchanges | storeExchangeAction |  | auth-optional | module:listings |
| POST | `/exchanges/{param}/rate` | exchanges | storeExchangeRating |  | auth-optional | module:listings |
| GET | `/faq` | faq | faq | faq | public-or-unknown |  |
| GET | `/federation/connections` | federation | federationConnections | federation-connections | auth-optional | feature:federation |
| GET | `/federation/events` | federation | federationEvents | federation-events | auth-required | feature:federation |
| GET | `/federation/groups` | federation | federationGroups | federation-groups | auth-required | feature:federation |
| GET | `/federation/listings` | federation | federationListings | federation-listings | auth-required | feature:federation |
| GET | `/federation/listings/{param}/{param}` | federation | federationListingShow | federation-listing-show | auth-required | feature:federation |
| GET | `/federation/members` | federation | federationMembers | federation-members | auth-optional | feature:federation |
| GET | `/federation/members/{param}` | federation | federationMember | federation-member | auth-optional | feature:federation |
| GET | `/federation/members/{param}/transfer` | federation | federationTransfer | federation-transfer | auth-optional | feature:federation |
| GET | `/federation/messages` | federation | federationMessages | federation-messages | auth-optional | feature:federation |
| GET | `/federation/messages/conversation/{param}` | federation | federationConversation | federation-conversation | auth-optional | feature:federation; feature:message_translation |
| GET | `/federation/onboarding` | federation | federationOnboarding | federation-onboarding | auth-optional | feature:federation |
| GET | `/federation/opt-in` | federation | federationOptIn | federation-opt-in | auth-optional | feature:federation |
| GET | `/federation/opt-out` | federation | federationOptOut | federation-opt-out | auth-required | feature:federation |
| GET | `/federation/partners` | federation | federationPartners | federation-partners | auth-required | feature:federation |
| GET | `/federation/partners/{param}` | federation | federationPartner | federation-partner | auth-required | feature:federation |
| GET | `/federation/settings` | federation | federationSettings | federation-settings | auth-optional | feature:federation |
| POST | `/federation/connections` | federation | storeFederationConnection |  | auth-optional | feature:federation |
| POST | `/federation/connections/{param}/accept` | federation | acceptFederationConnection |  | public-or-unknown |  |
| POST | `/federation/connections/{param}/reject` | federation | rejectFederationConnection |  | public-or-unknown |  |
| POST | `/federation/connections/{param}/remove` | federation | removeFederationConnection |  | public-or-unknown |  |
| POST | `/federation/members/{param}/transfer` | federation | storeFederationTransfer |  | auth-optional | feature:federation |
| POST | `/federation/messages` | federation | storeFederationMessage |  | auth-optional | feature:federation |
| POST | `/federation/messages/translate/{param}` | federation | translateFederationMessage |  | auth-optional | feature:federation; feature:message_translation |
| POST | `/federation/onboarding` | federation | federationOnboardingStore |  | auth-optional | feature:federation |
| POST | `/federation/opt-in` | federation | storeFederationOptIn |  | auth-optional | feature:federation |
| POST | `/federation/opt-out` | federation | storeFederationOptOut |  | auth-optional | feature:federation |
| POST | `/federation/settings` | federation | updateFederationSettings |  | auth-optional | feature:federation |
| GET | `/feed/hashtag/{param}` | feed | feedHashtag | feed-hashtag | auth-optional | module:feed |
| GET | `/feed/hashtags` | feed | feedHashtagsDiscovery | feed-hashtags | public-or-unknown | module:feed |
| GET | `/feed/item/{param}/{param}` | feed | feedItemDetail | feed-item | auth-optional | module:feed |
| GET | `/feed/posts/{param}` | feed | feedPost | feed-post | auth-optional | module:feed |
| POST | `/feed/comments/{param}/delete` | feed | deleteFeedComment |  | auth-optional | module:feed |
| POST | `/feed/comments/{param}/react` | feed | storeFeedCommentReaction |  | public-or-unknown |  |
| POST | `/feed/comments/{param}/update` | feed | updateFeedComment |  | auth-optional | module:feed |
| POST | `/feed/items/{param}/{param}/comments` | feed | storeFeedComment |  | auth-optional | module:feed |
| POST | `/feed/items/{param}/{param}/like` | feed | storeFeedLike |  | auth-optional | module:feed |
| POST | `/feed/items/{param}/{param}/not-interested` | feed | feedItemNotInterested |  | auth-optional | module:feed |
| POST | `/feed/items/{param}/{param}/react` | feed | feedItemReaction |  | auth-optional | module:feed |
| POST | `/feed/polls/{param}/vote` | feed | storeFeedPollVote |  | auth-optional | module:feed |
| POST | `/feed/posts` | feed | storeFeedPost |  | auth-optional | module:feed |
| POST | `/feed/posts/{param}/delete` | feed | deleteFeedPost |  | auth-optional | module:feed |
| POST | `/feed/posts/{param}/hide` | feed | hideFeedItem |  | auth-optional | module:feed |
| POST | `/feed/posts/{param}/react` | feed | storeFeedPostReaction |  | public-or-unknown |  |
| POST | `/feed/posts/{param}/report` | feed | reportFeedItem |  | auth-optional | module:feed |
| POST | `/feed/posts/{param}/save` | feed | storeFeedPostSave |  | auth-optional | module:feed |
| POST | `/feed/posts/{param}/share` | feed | storeFeedPostShare |  | auth-optional | module:feed |
| POST | `/feed/posts/{param}/update` | feed | updateFeedPost |  | auth-optional | module:feed |
| POST | `/feed/users/{param}/mute` | feed | muteFeedUser |  | auth-optional | module:feed |
| GET | `/goals/{param}` | goals | goal | goal-detail | auth-optional | feature:goals |
| GET | `/goals/{param}/buddy-actions` | goals | goalsBuddyActions | goals-buddy-actions | auth-optional |  |
| GET | `/goals/{param}/checkin` | goals | goalsCheckin | goals-checkin | auth-optional |  |
| GET | `/goals/{param}/edit` | goals | editGoalForm | goal-edit | auth-optional | feature:goals |
| GET | `/goals/{param}/history` | goals | goalsHistory | goal-history | auth-optional |  |
| GET | `/goals/{param}/insights` | goals | goalsInsights | goals-insights | auth-optional |  |
| GET | `/goals/{param}/reminder` | goals | goalsReminder | goals-reminder | auth-optional |  |
| GET | `/goals/{param}/social` | goals | goalsSocial | goals-social | auth-optional |  |
| GET | `/goals/buddying` | goals | goalBuddying | goal-buddying | auth-optional | feature:goals |
| GET | `/goals/discover` | goals | goalDiscover | goals-discover | auth-optional | feature:goals |
| GET | `/goals/templates` | goals | goalTemplates | goal-templates | auth-optional | feature:goals |
| POST | `/goals` | goals | storeGoal |  | public-or-unknown | feature:goals |
| POST | `/goals/{param}/buddy` | goals | becomeGoalBuddy |  | auth-optional | feature:goals |
| POST | `/goals/{param}/buddy-actions` | goals | goalsStoreBuddyAction |  | auth-optional |  |
| POST | `/goals/{param}/buddy-nudge` | goals | buddyNudge |  | auth-optional | feature:goals |
| POST | `/goals/{param}/checkin` | goals | goalsStoreCheckin |  | auth-optional |  |
| POST | `/goals/{param}/comments` | goals | goalsStoreComment |  | auth-optional |  |
| POST | `/goals/{param}/comments/{param}/delete` | goals | goalsDeleteComment |  | auth-optional |  |
| POST | `/goals/{param}/complete` | goals | completeGoal |  | public-or-unknown | feature:goals |
| POST | `/goals/{param}/delete` | goals | deleteGoal |  | auth-optional | feature:goals |
| POST | `/goals/{param}/edit` | goals | updateGoal |  | auth-optional | feature:goals |
| POST | `/goals/{param}/like` | goals | goalsToggleLike |  | auth-optional |  |
| POST | `/goals/{param}/progress` | goals | incrementGoal |  | public-or-unknown | feature:goals |
| POST | `/goals/{param}/reminder` | goals | goalsSaveReminder |  | auth-optional |  |
| POST | `/goals/{param}/reminder/delete` | goals | goalsDeleteReminder |  | auth-optional |  |
| POST | `/goals/templates/{param}` | goals | storeGoalFromTemplate |  | auth-optional | feature:goals |
| GET | `/group-exchanges` | group-exchanges | groupExchanges | group-exchanges | auth-optional | feature:group_exchanges |
| GET | `/group-exchanges/{param}` | group-exchanges | groupExchange | group-exchange-detail | auth-optional | feature:group_exchanges |
| GET | `/group-exchanges/new` | group-exchanges | createGroupExchange | group-exchange-create | auth-required | feature:group_exchanges |
| POST | `/group-exchanges/{param}/cancel` | group-exchanges | cancelGroupExchange |  | public-or-unknown |  |
| POST | `/group-exchanges/{param}/complete` | group-exchanges | completeGroupExchange |  | public-or-unknown |  |
| POST | `/group-exchanges/{param}/confirm` | group-exchanges | confirmGroupExchange |  | public-or-unknown |  |
| POST | `/group-exchanges/{param}/participants` | group-exchanges | addGroupExchangeParticipant |  | public-or-unknown |  |
| POST | `/group-exchanges/{param}/participants/{param}/remove` | group-exchanges | removeGroupExchangeParticipant |  | public-or-unknown |  |
| POST | `/group-exchanges/new` | group-exchanges | storeGroupExchange |  | auth-optional | feature:group_exchanges |
| GET | `/groups/{param}/announcements` | groups | groupsAnnouncements | group-announcements | public-or-unknown |  |
| GET | `/groups/{param}/announcements/{param}/edit` | groups | groupsEditAnnouncement | group-announcements-edit | public-or-unknown |  |
| GET | `/groups/{param}/discussions` | groups | groupDiscussions | group-discussions | public-or-unknown |  |
| GET | `/groups/{param}/discussions/{param}` | groups | groupDiscussion | group-discussion-detail | public-or-unknown |  |
| GET | `/groups/{param}/discussions/new` | groups | createGroupDiscussion | group-discussion-create | public-or-unknown |  |
| GET | `/groups/{param}/files` | groups | groupsFiles | group-files | public-or-unknown |  |
| GET | `/groups/{param}/files/{param}/download` | groups | groupsDownloadFile |  | public-or-unknown |  |
| GET | `/groups/{param}/image` | groups | groupsImage | groups-image | public-or-unknown |  |
| GET | `/groups/{param}/invite` | groups | groupsInvite | groups-invite | public-or-unknown |  |
| GET | `/groups/{param}/manage` | groups | manageGroup | group-manage | public-or-unknown |  |
| GET | `/groups/{param}/notifications` | groups | groupsNotificationPrefs | groups-notifications | public-or-unknown |  |
| POST | `/groups/{param}/announcements` | groups | groupsCreateAnnouncement |  | public-or-unknown |  |
| POST | `/groups/{param}/announcements/{param}/delete` | groups | groupsDeleteAnnouncement |  | public-or-unknown |  |
| POST | `/groups/{param}/announcements/{param}/edit` | groups | groupsUpdateAnnouncement |  | public-or-unknown |  |
| POST | `/groups/{param}/announcements/{param}/pin` | groups | groupsPinAnnouncement |  | public-or-unknown |  |
| POST | `/groups/{param}/discussions/{param}/reply` | groups | replyGroupDiscussion |  | public-or-unknown |  |
| POST | `/groups/{param}/discussions/new` | groups | storeGroupDiscussion |  | public-or-unknown |  |
| POST | `/groups/{param}/feed` | groups | storeGroupFeedPost |  | public-or-unknown |  |
| POST | `/groups/{param}/files` | groups | groupsUploadFile |  | public-or-unknown |  |
| POST | `/groups/{param}/files/{param}/delete` | groups | groupsDeleteFile |  | public-or-unknown |  |
| POST | `/groups/{param}/image` | groups | groupsUpdateImage |  | public-or-unknown |  |
| POST | `/groups/{param}/invite/{param}/revoke` | groups | groupsRevokeInvite |  | public-or-unknown |  |
| POST | `/groups/{param}/invite/email` | groups | groupsSendInvites |  | public-or-unknown |  |
| POST | `/groups/{param}/invite/link` | groups | groupsCreateInviteLink |  | public-or-unknown |  |
| POST | `/groups/{param}/members/{param}` | groups | updateGroupMember |  | public-or-unknown |  |
| POST | `/groups/{param}/notifications` | groups | groupsUpdateNotificationPrefs |  | public-or-unknown |  |
| POST | `/groups/{param}/requests/{param}` | groups | handleGroupRequest |  | public-or-unknown |  |
| GET | `/ideation/{param}` | ideation | ideationChallenge | ideation-detail | auth-required | feature:ideation_challenges |
| GET | `/ideation/{param}/drafts` | ideation | ideationDrafts | ideation-drafts | public-or-unknown |  |
| GET | `/ideation/{param}/edit` | ideation | ideationEditChallenge | ideation-challenge-form | public-or-unknown |  |
| GET | `/ideation/{param}/ideas/{param}` | ideation | ideationIdeaDetail | ideation-idea | public-or-unknown |  |
| GET | `/ideation/{param}/manage` | ideation | ideationManageChallenge | ideation-manage | public-or-unknown |  |
| GET | `/ideation/{param}/outcome` | ideation | ideationOutcomeEdit | ideation-outcome-form | public-or-unknown |  |
| GET | `/ideation/campaigns` | ideation | ideationCampaigns | ideation-campaigns | public-or-unknown |  |
| GET | `/ideation/campaigns/{param}` | ideation | ideationCampaignDetail | ideation-campaign-detail | public-or-unknown |  |
| GET | `/ideation/new` | ideation | ideationCreateChallenge | ideation-challenge-form | public-or-unknown |  |
| GET | `/ideation/outcomes` | ideation | ideationOutcomes | ideation-outcomes | public-or-unknown |  |
| GET | `/ideation/tags` | ideation | ideationPopularTags | ideation-tags | public-or-unknown |  |
| POST | `/ideation/{param}/delete` | ideation | ideationDeleteChallenge |  | public-or-unknown |  |
| POST | `/ideation/{param}/drafts/{param}` | ideation | ideationUpdateDraftIdea |  | public-or-unknown |  |
| POST | `/ideation/{param}/duplicate` | ideation | ideationDuplicateChallenge |  | public-or-unknown |  |
| POST | `/ideation/{param}/edit` | ideation | ideationUpdateChallenge |  | public-or-unknown |  |
| POST | `/ideation/{param}/favorite` | ideation | ideationToggleFavorite |  | public-or-unknown |  |
| POST | `/ideation/{param}/ideas` | ideation | submitIdea |  | auth-optional | feature:ideation_challenges |
| POST | `/ideation/{param}/ideas/{param}/comments` | ideation | ideationStoreComment |  | public-or-unknown |  |
| POST | `/ideation/{param}/ideas/{param}/comments/{param}/delete` | ideation | ideationDeleteComment |  | public-or-unknown |  |
| POST | `/ideation/{param}/ideas/{param}/convert` | ideation | ideationConvertToGroup |  | public-or-unknown |  |
| POST | `/ideation/{param}/ideas/{param}/delete` | ideation | ideationDeleteIdea |  | public-or-unknown |  |
| POST | `/ideation/{param}/ideas/{param}/media` | ideation | ideationAddMedia |  | public-or-unknown |  |
| POST | `/ideation/{param}/ideas/{param}/status` | ideation | ideationIdeaStatus |  | public-or-unknown |  |
| POST | `/ideation/{param}/ideas/{param}/toggle-vote` | ideation | ideationIdeaVote |  | public-or-unknown |  |
| POST | `/ideation/{param}/ideas/{param}/vote` | ideation | voteIdea |  | auth-optional | feature:ideation_challenges |
| POST | `/ideation/{param}/link-campaign` | ideation | ideationLinkCampaign |  | public-or-unknown |  |
| POST | `/ideation/{param}/outcome` | ideation | ideationStoreOutcome |  | public-or-unknown |  |
| POST | `/ideation/{param}/status` | ideation | ideationChallengeStatus |  | public-or-unknown |  |
| POST | `/ideation/campaigns` | ideation | ideationStoreCampaign |  | public-or-unknown |  |
| POST | `/ideation/campaigns/{param}` | ideation | ideationUpdateCampaign |  | public-or-unknown |  |
| POST | `/ideation/campaigns/{param}/challenges/{param}/unlink` | ideation | ideationUnlinkCampaignChallenge |  | public-or-unknown |  |
| POST | `/ideation/campaigns/{param}/delete` | ideation | ideationDeleteCampaign |  | public-or-unknown |  |
| POST | `/ideation/new` | ideation | ideationStoreChallenge |  | public-or-unknown |  |
| GET | `/jobs/{param}` | jobs | job | job-detail | auth-optional | feature:job_vacancies |
| GET | `/jobs/{param}/analytics` | jobs | jobsAnalytics | jobs-analytics | auth-optional | feature:job_vacancies |
| GET | `/jobs/{param}/applications` | jobs | jobApplicants | jobs-applicants | auth-optional | feature:job_vacancies |
| GET | `/jobs/{param}/applications/export.csv` | jobs | exportJobApplications |  | auth-optional | feature:job_vacancies |
| GET | `/jobs/{param}/edit` | jobs | editJobForm | jobs-form | auth-optional | feature:job_vacancies |
| GET | `/jobs/{param}/pipeline` | jobs | jobsPipeline | jobs-pipeline | auth-optional | feature:job_vacancies |
| GET | `/jobs/{param}/qualified` | jobs | jobsQualification | jobs-qualification | auth-optional | feature:job_vacancies |
| GET | `/jobs/alerts` | jobs | jobAlerts | jobs-alerts | auth-optional | feature:job_vacancies |
| GET | `/jobs/applications` | jobs | myJobApplications | jobs-applications | auth-optional | feature:job_vacancies |
| GET | `/jobs/applications/{param}/cv` | jobs | jobsDownloadCv |  | auth-optional | feature:job_vacancies |
| GET | `/jobs/applications/{param}/history` | jobs | jobsApplicationHistory | jobs-application-history | auth-optional | feature:job_vacancies |
| GET | `/jobs/bias-audit` | jobs | jobsBiasAudit | jobs-bias-audit | auth-optional | feature:job_vacancies |
| GET | `/jobs/create` | jobs | createJobForm | jobs-form | auth-required | feature:job_vacancies |
| GET | `/jobs/employer-onboarding` | jobs | jobsEmployerOnboarding | jobs-onboarding | auth-optional | feature:job_vacancies |
| GET | `/jobs/employers/{param}` | jobs | jobsEmployerBrand | jobs-employer-brand | auth-optional | feature:job_vacancies |
| GET | `/jobs/mine` | jobs | myJobPostings | jobs-postings | auth-optional | feature:job_vacancies |
| GET | `/jobs/responses` | jobs | jobsResponses | jobs-responses | auth-optional | feature:job_vacancies |
| GET | `/jobs/saved` | jobs | savedJobs | jobs-saved | auth-optional | feature:job_vacancies |
| GET | `/jobs/talent-search` | jobs | jobsTalentSearch | jobs-talent-search | auth-optional | feature:job_vacancies |
| GET | `/jobs/talent-search/{param}` | jobs | jobsTalentProfile | jobs-talent-profile | auth-optional | feature:job_vacancies |
| POST | `/jobs` | jobs | storeJob |  | auth-optional | feature:job_vacancies |
| POST | `/jobs/{param}/applications/{param}/status` | jobs | setApplicationStatus |  | auth-optional | feature:job_vacancies |
| POST | `/jobs/{param}/apply` | jobs | applyJob |  | auth-optional | feature:job_vacancies |
| POST | `/jobs/{param}/delete` | jobs | deleteJob |  | auth-optional | feature:job_vacancies |
| POST | `/jobs/{param}/renew` | jobs | renewJobPosting |  | auth-optional | feature:job_vacancies |
| POST | `/jobs/{param}/save` | jobs | saveJobBookmark |  | auth-optional | feature:job_vacancies |
| POST | `/jobs/{param}/unsave` | jobs | unsaveJobBookmark |  | auth-optional | feature:job_vacancies |
| POST | `/jobs/{param}/update` | jobs | updateJob |  | auth-optional | feature:job_vacancies |
| POST | `/jobs/alerts` | jobs | subscribeJobAlert |  | auth-optional | feature:job_vacancies |
| POST | `/jobs/alerts/{param}/delete` | jobs | deleteJobAlert |  | public-or-unknown |  |
| POST | `/jobs/alerts/{param}/pause` | jobs | pauseJobAlert |  | public-or-unknown |  |
| POST | `/jobs/alerts/{param}/resume` | jobs | resumeJobAlert |  | public-or-unknown |  |
| POST | `/jobs/applications/{param}/withdraw` | jobs | withdrawJobApplication |  | auth-optional | feature:job_vacancies |
| POST | `/jobs/interviews/{param}/accept` | jobs | jobsAcceptInterview |  | public-or-unknown |  |
| POST | `/jobs/interviews/{param}/decline` | jobs | jobsDeclineInterview |  | public-or-unknown |  |
| POST | `/jobs/offers/{param}/accept` | jobs | jobsAcceptOffer |  | public-or-unknown |  |
| POST | `/jobs/offers/{param}/reject` | jobs | jobsRejectOffer |  | public-or-unknown |  |
| GET | `/kb/{param}` | kb | kbArticle | kb-article | public-or-unknown |  |
| GET | `/leaderboard` | leaderboard | leaderboard | leaderboard | auth-optional | feature:gamification |
| GET | `/leaderboard/competitive` | leaderboard | gamificationCompetitive | gamification-competitive | public-or-unknown |  |
| GET | `/leaderboard/journey` | leaderboard | gamificationPersonalJourney | gamification-journey | public-or-unknown |  |
| GET | `/leaderboard/seasons` | leaderboard | gamificationSeasons | gamification-seasons | public-or-unknown |  |
| GET | `/leaderboard/spotlight` | leaderboard | gamificationSpotlight | gamification-spotlight | public-or-unknown |  |
| GET | `/listings/{param}/analytics` | listings | listingsAnalytics | listings-analytics | auth-optional | module:listings |
| GET | `/listings/{param}/comments` | listings | listingsComments | listings-comments | auth-optional | module:listings |
| GET | `/listings/{param}/exchange-request` | listings | requestExchange | exchange-request | auth-optional | module:listings |
| GET | `/listings/{param}/report` | listings | listingReport | listing-report | auth-optional | module:listings |
| POST | `/listings/{param}/comments` | listings | listingsStoreComment |  | auth-optional | module:listings |
| POST | `/listings/{param}/exchange-request` | listings | storeExchangeRequest |  | auth-optional | module:listings |
| POST | `/listings/{param}/like` | listings | listingsToggleLike |  | auth-optional | module:listings |
| POST | `/listings/{param}/renew` | listings | renewListing |  | auth-optional | module:listings |
| POST | `/listings/{param}/report` | listings | storeListingReport |  | auth-optional | module:listings |
| POST | `/listings/{param}/save` | listings | saveListing |  | auth-optional | module:listings |
| POST | `/listings/{param}/unsave` | listings | unsaveListing |  | auth-optional | module:listings |
| POST | `/listings/generate-description` | listings | listingsGenerateDescription |  | auth-optional | module:listings |
| GET | `/login/forgot-password` | login | forgotPassword | forgot-password | public-or-unknown |  |
| GET | `/login/two-factor` | login | twoFactor | two-factor | public-or-unknown |  |
| POST | `/login/forgot-password` | login | sendPasswordReset |  | public-or-unknown |  |
| POST | `/login/resend-verification` | login | resendVerification |  | public-or-unknown |  |
| POST | `/login/two-factor` | login | storeTwoFactor |  | public-or-unknown |  |
| GET | `/marketplace/{param}` | marketplace | marketplaceItem | marketplace-detail | auth-optional | feature:marketplace |
| GET | `/marketplace/{param}/buy` | marketplace | commerceBuyForm | commerce-buy | auth-optional | feature:marketplace |
| GET | `/marketplace/{param}/edit` | marketplace | commerceEditListingForm | commerce-listing-form | auth-optional | feature:marketplace |
| GET | `/marketplace/{param}/offer` | marketplace | commerceOfferForm | commerce-offer | auth-optional | feature:marketplace |
| GET | `/marketplace/{param}/report` | marketplace | commerceReportForm | commerce-report | auth-optional | feature:marketplace |
| GET | `/marketplace/category/{param}` | marketplace | commerceCategoryListings | commerce-category | auth-optional | feature:marketplace |
| GET | `/marketplace/coupons` | marketplace | commerceSellerCoupons | commerce-seller-coupons | auth-optional |  |
| GET | `/marketplace/coupons/{param}/edit` | marketplace | commerceEditCouponForm | commerce-coupon-form | auth-optional |  |
| GET | `/marketplace/coupons/new` | marketplace | commerceCreateCouponForm | commerce-coupon-form | auth-optional |  |
| GET | `/marketplace/create` | marketplace | commerceCreateListingForm | commerce-listing-form | auth-optional | feature:marketplace |
| GET | `/marketplace/free` | marketplace | commerceFreeItems | commerce-free-items | auth-optional | feature:marketplace |
| GET | `/marketplace/mine` | marketplace | commerceMyListings | commerce-my-listings | auth-optional | feature:marketplace |
| GET | `/marketplace/offers` | marketplace | commerceMyOffers | commerce-offers | auth-optional | feature:marketplace |
| GET | `/marketplace/onboarding` | marketplace | commerceMerchantOnboarding | commerce-merchant-onboarding | auth-optional | feature:marketplace |
| GET | `/marketplace/orders` | marketplace | commerceBuyerOrders | commerce-orders | auth-optional | feature:marketplace |
| GET | `/marketplace/pickups` | marketplace | commerceMyPickups | commerce-my-pickups | auth-optional | feature:marketplace |
| GET | `/marketplace/sales` | marketplace | commerceSellerOrders | commerce-orders | auth-optional | feature:marketplace |
| GET | `/marketplace/saved` | marketplace | commerceSavedListings | commerce-saved | auth-optional | feature:marketplace |
| GET | `/marketplace/search` | marketplace | commerceMarketplaceAdvancedSearch | marketplace-advanced-search | auth-optional | feature:marketplace |
| GET | `/marketplace/seller/{param}` | marketplace | commerceSellerProfile | commerce-seller | auth-optional | feature:marketplace |
| GET | `/marketplace/slots` | marketplace | commerceSellerPickupSlots | commerce-pickup-slots | auth-optional | feature:marketplace |
| GET | `/marketplace/slots/{param}/edit` | marketplace | commerceEditPickupSlot | commerce-pickup-slot-form | auth-optional | feature:marketplace |
| POST | `/marketplace/{param}/buy` | marketplace | commerceStoreBuy |  | auth-optional | feature:marketplace |
| POST | `/marketplace/{param}/delete` | marketplace | commerceDeleteListing |  | auth-optional | feature:marketplace |
| POST | `/marketplace/{param}/offer` | marketplace | commerceStoreOffer |  | auth-optional | feature:marketplace |
| POST | `/marketplace/{param}/renew` | marketplace | commerceRenewListing |  | auth-optional | feature:marketplace |
| POST | `/marketplace/{param}/report` | marketplace | commerceStoreReport |  | auth-optional | feature:marketplace |
| POST | `/marketplace/{param}/save` | marketplace | commerceSaveListing |  | auth-optional | feature:marketplace |
| POST | `/marketplace/{param}/unsave` | marketplace | commerceUnsaveListing |  | auth-optional | feature:marketplace |
| POST | `/marketplace/{param}/update` | marketplace | commerceUpdateListing |  | auth-optional | feature:marketplace |
| POST | `/marketplace/coupons/{param}/delete` | marketplace | commerceDeleteCoupon |  | auth-optional |  |
| POST | `/marketplace/coupons/{param}/update` | marketplace | commerceUpdateCoupon |  | auth-optional |  |
| POST | `/marketplace/coupons/new` | marketplace | commerceStoreCoupon |  | auth-optional |  |
| POST | `/marketplace/create` | marketplace | commerceStoreListing |  | auth-optional | feature:marketplace |
| POST | `/marketplace/offers/{param}/accept` | marketplace | commerceAcceptOffer |  | public-or-unknown |  |
| POST | `/marketplace/offers/{param}/decline` | marketplace | commerceDeclineOffer |  | public-or-unknown |  |
| POST | `/marketplace/offers/{param}/withdraw` | marketplace | commerceWithdrawOffer |  | public-or-unknown |  |
| POST | `/marketplace/onboarding` | marketplace | commerceStoreMerchantOnboarding |  | auth-optional | feature:marketplace |
| POST | `/marketplace/orders/{param}/cancel` | marketplace | commerceCancelOrder |  | auth-optional | feature:marketplace |
| POST | `/marketplace/orders/{param}/confirm` | marketplace | commerceConfirmOrder |  | auth-optional | feature:marketplace |
| POST | `/marketplace/orders/{param}/pay` | marketplace | commerceCheckoutCardPay |  | auth-optional | feature:marketplace |
| POST | `/marketplace/orders/{param}/rate` | marketplace | commerceRateOrder |  | auth-optional | feature:marketplace |
| POST | `/marketplace/orders/{param}/ship` | marketplace | commerceShipOrder |  | auth-optional | feature:marketplace |
| POST | `/marketplace/slots` | marketplace | commerceStorePickupSlot |  | auth-optional | feature:marketplace |
| POST | `/marketplace/slots/{param}/delete` | marketplace | commerceDeletePickupSlot |  | auth-optional | feature:marketplace |
| POST | `/marketplace/slots/{param}/update` | marketplace | commerceUpdatePickupSlot |  | auth-optional | feature:marketplace |
| POST | `/marketplace/slots/scan` | marketplace | commerceScanPickup |  | auth-optional | feature:marketplace |
| GET | `/matches` | matches | matches | matches | auth-optional | module:listings |
| GET | `/matches/board` | matches | connectionsMatchesBoard | connections-matches-board | auth-optional | module:listings |
| POST | `/matches/{param}/dismiss` | matches | dismissMatch |  | auth-optional | module:listings |
| POST | `/matches/board/{param}/dismiss` | matches | connectionsDismissMatch |  | auth-optional | module:listings |
| GET | `/me/collections` | me | savedMyCollections | saved-collections | auth-optional |  |
| GET | `/me/collections/{param}` | me | savedCollectionDetail | saved-collection-detail | auth-optional |  |
| POST | `/me/collections` | me | savedCreateCollection |  | auth-optional |  |
| POST | `/me/collections/{param}/delete` | me | savedDeleteCollection |  | auth-optional |  |
| POST | `/me/collections/{param}/items/{param}/remove` | me | savedRemoveItem |  | auth-optional |  |
| POST | `/me/collections/{param}/update` | me | savedUpdateCollection |  | auth-optional |  |
| GET | `/members/{param}/insights` | members | membersInsights | members-insights | auth-optional | feature:connections |
| GET | `/members/discover` | members | membersDiscover | members-discover | auth-optional | feature:connections |
| GET | `/members/nearby` | members | membersNearby | members-nearby | auth-optional | feature:connections |
| POST | `/members/{param}/block` | members | blockMember |  | auth-optional | feature:connections |
| POST | `/members/{param}/connection` | members | updateMemberConnection |  | auth-optional | feature:connections |
| POST | `/members/{param}/endorse` | members | endorseMemberSkill |  | auth-optional | feature:connections |
| POST | `/members/{param}/review` | members | storeProfileReview |  | auth-optional | feature:reviews |
| POST | `/members/{param}/transfer` | members | profileTransferCredits |  | auth-optional | module:wallet |
| POST | `/members/{param}/unblock` | members | unblockMember |  | auth-optional | feature:connections |
| GET | `/messages/groups` | messages | messagesGroupsIndex | messages-groups | auth-optional | module:messages |
| GET | `/messages/groups/{param}` | messages | messagesGroupShow | messages-group-conversation | auth-optional | module:messages |
| GET | `/messages/groups/new` | messages | messagesCreateGroupForm | messages-group-create | auth-optional | feature:connections; module:messages |
| GET | `/messages/new/{param}` | messages | conversation | conversation | auth-optional | module:messages |
| POST | `/messages/{param}/archive` | messages | archiveConversation |  | auth-optional | module:messages |
| POST | `/messages/{param}/m/{param}/delete` | messages | deleteMessage |  | auth-optional | module:messages |
| POST | `/messages/{param}/m/{param}/edit` | messages | updateMessage |  | auth-optional | module:messages |
| POST | `/messages/{param}/m/{param}/translate` | messages | messagesTranslateMessage |  | auth-optional | feature:message_translation; module:messages |
| POST | `/messages/{param}/restore` | messages | restoreConversation |  | auth-optional | module:messages |
| POST | `/messages/{param}/voice` | messages | storeVoiceMessage |  | auth-optional | module:messages |
| POST | `/messages/groups` | messages | messagesStoreGroup |  | auth-optional | feature:connections; module:messages |
| POST | `/messages/groups/{param}` | messages | messagesStoreGroupMessage |  | auth-optional | module:messages |
| POST | `/messages/groups/{param}/m/{param}/react` | messages | messagesToggleReaction |  | auth-optional | module:messages |
| POST | `/messages/groups/{param}/members` | messages | messagesGroupAddMember |  | auth-optional | module:messages |
| POST | `/messages/groups/{param}/members/{param}/remove` | messages | messagesGroupRemoveMember |  | auth-optional | module:messages |
| GET | `/newsletter/unsubscribe` | newsletter | newsletterUnsubscribe | newsletter-unsubscribe | public-or-unknown |  |
| GET | `/nexus-score` | nexus-score | nexusScore | nexus-score | auth-optional | feature:gamification |
| GET | `/nexus-score/tiers` | nexus-score | gamificationTierLadder | gamification-tiers | public-or-unknown |  |
| POST | `/notifications/delete-all` | notifications | deleteAllNotifications |  | auth-optional | module:notifications |
| POST | `/notifications/group/read` | notifications | markGroupNotificationsRead |  | auth-optional | module:notifications |
| GET | `/onboarding` | onboarding | onboarding |  | auth-optional |  |
| GET | `/onboarding/{param}` | onboarding | onboardingStep | onboarding | auth-optional |  |
| POST | `/onboarding/{param}` | onboarding | onboardingStepPost |  | auth-optional |  |
| POST | `/onboarding/avatar` | onboarding | onboardingAvatar |  | auth-optional |  |
| POST | `/organisations` | organisations | storeOrganisation |  | public-or-unknown | feature:volunteering |
| POST | `/organisations/register` | organisations | organisationsRegister |  | auth-optional | feature:volunteering |
| GET | `/password/reset` | password | showResetPassword | reset-password | public-or-unknown |  |
| POST | `/password/reset` | password | storeResetPassword |  | public-or-unknown |  |
| GET | `/podcasts/{param}` | podcasts | podcast | podcast-detail | auth-required | feature:podcasts |
| GET | `/podcasts/{param}/episodes/{param}` | podcasts | podcastEpisode | podcast-episode | auth-required | feature:podcasts |
| GET | `/podcasts/studio` | podcasts | commercePodcastStudio | commerce-podcast-studio | auth-optional | feature:podcasts |
| GET | `/podcasts/studio/{param}` | podcasts | commercePodcastManage | commerce-podcast-manage | auth-optional | feature:podcasts |
| GET | `/podcasts/studio/new` | podcasts | commerceCreatePodcastForm | commerce-podcast-form | auth-optional | feature:podcasts |
| POST | `/podcasts/{param}/subscribe` | podcasts | podcastSubscribe |  | auth-optional | feature:podcasts |
| POST | `/podcasts/studio/{param}/delete` | podcasts | commerceDeletePodcast |  | auth-optional | feature:podcasts |
| POST | `/podcasts/studio/{param}/episodes` | podcasts | commerceStorePodcastEpisode |  | auth-optional | feature:podcasts |
| POST | `/podcasts/studio/{param}/episodes/{param}/delete` | podcasts | commerceDeletePodcastEpisode |  | auth-optional | feature:podcasts |
| POST | `/podcasts/studio/{param}/episodes/{param}/publish` | podcasts | commercePublishPodcastEpisode |  | auth-optional | feature:podcasts |
| POST | `/podcasts/studio/{param}/publish` | podcasts | commercePublishPodcast |  | auth-optional | feature:podcasts |
| POST | `/podcasts/studio/{param}/update` | podcasts | commerceUpdatePodcast |  | auth-optional | feature:podcasts |
| POST | `/podcasts/studio/new` | podcasts | commerceStorePodcast |  | auth-optional | feature:podcasts |
| GET | `/polls/{param}` | polls | gamificationPollDetail | gamification-poll-detail | public-or-unknown |  |
| GET | `/polls/{param}/export` | polls | gamificationExportPoll |  | public-or-unknown |  |
| GET | `/polls/{param}/rank` | polls | gamificationRankedVote | gamification-poll-rank | public-or-unknown |  |
| GET | `/polls/parity/create` | polls | gamificationCreatePoll | gamification-poll-create | public-or-unknown |  |
| GET | `/polls/parity/manage` | polls | gamificationManagePolls | gamification-poll-manage | public-or-unknown |  |
| POST | `/polls` | polls | storePoll |  | auth-optional | feature:polls |
| POST | `/polls/{param}/comment` | polls | gamificationPollComment |  | public-or-unknown |  |
| POST | `/polls/{param}/delete` | polls | gamificationDeletePoll |  | public-or-unknown |  |
| POST | `/polls/{param}/like` | polls | gamificationPollLike |  | public-or-unknown |  |
| POST | `/polls/{param}/rank` | polls | gamificationStoreRankedVote |  | public-or-unknown |  |
| POST | `/polls/{param}/vote` | polls | storePollVote |  | auth-optional | feature:polls |
| POST | `/polls/parity/create` | polls | gamificationStorePoll |  | public-or-unknown |  |
| GET | `/premium/manage` | premium | commercePremiumManage | commerce-premium-manage | auth-optional | feature:member_premium |
| GET | `/premium/return` | premium | premiumReturn | premium-return | auth-optional | feature:member_premium |
| POST | `/premium/cancel` | premium | commercePremiumCancel |  | auth-optional | feature:member_premium |
| POST | `/premium/portal` | premium | commercePremiumPortal |  | auth-optional | feature:member_premium |
| POST | `/premium/subscribe` | premium | subscribePremium |  | auth-optional | feature:member_premium |
| GET | `/profile/blocked` | profile | blockedUsers | blocked-users | auth-optional |  |
| GET | `/profile/delete-account` | profile | confirmDeleteAccount | profile-delete | auth-optional |  |
| GET | `/profile/settings` | profile | profileSettings | profile-settings | auth-optional |  |
| GET | `/profile/two-factor` | profile | twoFactorSetup | two-factor-setup | auth-optional |  |
| POST | `/profile/data-export` | profile | requestDataExport |  | auth-optional |  |
| POST | `/profile/delete-account` | profile | deleteAccount |  | auth-optional |  |
| POST | `/profile/email` | profile | updateProfileEmail |  | auth-optional |  |
| POST | `/profile/language` | profile | updateProfileLanguage |  | auth-optional |  |
| POST | `/profile/match-preferences` | profile | updateProfileMatchPreferences |  | auth-optional |  |
| POST | `/profile/notifications` | profile | updateProfileNotifications |  | auth-optional |  |
| POST | `/profile/passkeys/remove` | profile | removeProfilePasskey |  | auth-optional |  |
| POST | `/profile/passkeys/rename` | profile | renameProfilePasskey |  | auth-optional |  |
| POST | `/profile/password` | profile | updateProfilePassword |  | auth-optional |  |
| POST | `/profile/personalisation` | profile | updateProfilePersonalisation |  | auth-optional |  |
| POST | `/profile/safeguarding/revoke` | profile | revokeProfileSafeguarding |  | auth-optional |  |
| POST | `/profile/settings` | profile | updateProfileSettings |  | auth-optional |  |
| POST | `/profile/skills/add` | profile | addProfileSkill |  | auth-optional |  |
| POST | `/profile/skills/remove` | profile | removeProfileSkill |  | auth-optional |  |
| POST | `/profile/two-factor/disable` | profile | disableTwoFactor |  | auth-optional |  |
| POST | `/profile/two-factor/verify` | profile | verifyTwoFactorSetup | two-factor-setup | auth-optional |  |
| POST | `/report-a-problem` | report-a-problem | storeReportProblem |  | auth-optional |  |
| GET | `/resources/{param}/comments` | resources | resourcesComments | resources-comments | auth-optional | feature:resources |
| GET | `/resources/{param}/delete` | resources | resourcesDeleteConfirm | resources-delete | auth-optional | feature:resources |
| GET | `/resources/{param}/download` | resources | resourcesDownload |  | auth-required | feature:resources |
| GET | `/resources/library` | resources | resourcesLibrary | resources-library | auth-optional | feature:resources |
| GET | `/resources/upload` | resources | resourcesUploadForm | resources-upload | auth-required | feature:resources |
| POST | `/resources/{param}/comments/{param}/delete` | resources | resourcesDeleteComment |  | auth-optional | feature:resources |
| POST | `/resources/{param}/comments/add` | resources | resourcesStoreComment |  | auth-optional | feature:resources |
| POST | `/resources/{param}/delete` | resources | resourcesDelete |  | auth-optional | feature:resources |
| POST | `/resources/{param}/react` | resources | resourcesReact |  | auth-optional | feature:resources |
| POST | `/resources/reorder` | resources | resourcesReorder |  | auth-optional | feature:resources |
| POST | `/resources/upload` | resources | resourcesUpload |  | auth-optional | feature:resources |
| GET | `/reviews` | reviews | reviews | reviews | auth-optional | feature:reviews |
| GET | `/reviews/{param}/comments` | reviews | blogReviewsReviewComments | blogreviews-review-comments | auth-optional | feature:reviews |
| GET | `/reviews/list` | reviews | blogReviewsList | blogreviews-reviews-list | auth-optional | feature:reviews |
| POST | `/reviews` | reviews | storeReview |  | auth-optional | feature:reviews |
| POST | `/reviews/{param}/comments` | reviews | blogReviewsStoreReviewComment |  | auth-optional | feature:reviews |
| POST | `/reviews/{param}/react` | reviews | blogReviewsReviewReaction |  | auth-optional | feature:reviews |
| GET | `/saved` | saved | saved | saved | auth-optional |  |
| POST | `/saved/destroy` | saved | destroySaved |  | auth-optional |  |
| GET | `/search/advanced` | search | searchAdvanced | search-advanced | auth-optional | feature:search |
| GET | `/search/saved/{param}/delete` | search | searchDeleteSavedConfirm | search-saved-delete | auth-optional | feature:search |
| POST | `/search/saved` | search | searchSaveSearch |  | auth-optional | feature:search |
| POST | `/search/saved/{param}/delete` | search | searchDeleteSaved |  | auth-optional | feature:search |
| POST | `/search/saved/{param}/run` | search | searchRunSaved |  | auth-optional | feature:search |
| GET | `/settings/appearance` | settings | settingsAppearance | settings-appearance | auth-optional |  |
| GET | `/settings/availability` | settings | settingsAvailability | settings-availability | auth-optional |  |
| GET | `/settings/data-rights` | settings | settingsDataRights | settings-data-rights | auth-optional |  |
| GET | `/settings/insurance` | settings | settingsInsurance | settings-insurance | auth-optional |  |
| GET | `/settings/linked-accounts` | settings | settingsLinkedAccounts | settings-linked-accounts | auth-optional |  |
| POST | `/settings/appearance` | settings | settingsUpdateAppearance |  | auth-optional |  |
| POST | `/settings/availability` | settings | settingsUpdateAvailability |  | auth-optional |  |
| POST | `/settings/data-rights` | settings | settingsRequestDataRights |  | auth-optional |  |
| POST | `/settings/insurance` | settings | settingsUploadInsurance |  | auth-optional |  |
| POST | `/settings/linked-accounts/approve` | settings | settingsApproveLinkedAccount |  | auth-optional |  |
| POST | `/settings/linked-accounts/permissions` | settings | settingsUpdateLinkedPermissions |  | auth-optional |  |
| POST | `/settings/linked-accounts/request` | settings | settingsRequestLinkedAccount |  | auth-optional |  |
| POST | `/settings/linked-accounts/revoke` | settings | settingsRevokeLinkedAccount |  | auth-optional |  |
| GET | `/users/{param}/appreciations` | users | savedAppreciationWall | saved-appreciations | auth-optional |  |
| GET | `/users/{param}/collections` | users | savedPublicCollections | saved-public-collections | auth-required |  |
| POST | `/users/{param}/appreciations` | users | savedSendAppreciation |  | auth-optional |  |
| GET | `/verify-email` | verify-email | verifyEmail | email-verify | public-or-unknown |  |
| GET | `/volunteering/accessibility` | volunteering | volunteerAccessibility | volunteering-accessibility | auth-optional | feature:volunteering |
| GET | `/volunteering/certificates` | volunteering | volunteeringCertificates | volunteering-certificates | auth-optional | feature:volunteering |
| GET | `/volunteering/certificates/{param}/download` | volunteering | downloadVolunteerCertificate |  | auth-optional | feature:volunteering |
| GET | `/volunteering/credentials` | volunteering | volunteeringCredentials | volunteering-credentials | auth-optional | feature:volunteering |
| GET | `/volunteering/donations` | volunteering | volunteeringDonations | volunteering-donations | auth-optional | feature:volunteering |
| GET | `/volunteering/emergency-alerts` | volunteering | volunteeringEmergencyAlerts | volunteering-emergency-alerts | auth-optional | feature:volunteering |
| GET | `/volunteering/expenses` | volunteering | volunteeringExpenses | volunteering-expenses | auth-optional | feature:volunteering |
| GET | `/volunteering/group-signups` | volunteering | volunteeringGroupSignups | volunteering-group-signups | auth-optional | feature:volunteering |
| GET | `/volunteering/hours` | volunteering | volunteeringHours | volunteering-hours | auth-optional | feature:volunteering |
| GET | `/volunteering/incidents` | volunteering | volunteeringSafeguarding | volunteering-safeguarding | auth-optional | feature:volunteering |
| GET | `/volunteering/my-organisations` | volunteering | volunteeringMyOrganisations | volunteering-my-organisations | auth-optional | feature:volunteering |
| GET | `/volunteering/opportunities/create` | volunteering | volunteeringCreateOpportunity | volunteering-create-opportunity | auth-optional | feature:volunteering |
| GET | `/volunteering/organisations/{param}/dashboard` | volunteering | volunteeringOrgDashboard | volunteering-org-dashboard | public-or-unknown |  |
| GET | `/volunteering/organisations/{param}/manage` | volunteering | manageVolunteerOrg | volunteer-org-manage | public-or-unknown |  |
| GET | `/volunteering/organisations/{param}/settings` | volunteering | volunteeringOrgSettings | volunteering-org-settings | public-or-unknown |  |
| GET | `/volunteering/organisations/{param}/volunteers` | volunteering | volunteeringOrgVolunteers | volunteering-org-volunteers | public-or-unknown |  |
| GET | `/volunteering/organisations/{param}/wallet` | volunteering | volunteeringOrgWallet | volunteering-org-wallet | public-or-unknown |  |
| GET | `/volunteering/recommended-shifts` | volunteering | volunteeringRecommendedShifts | volunteering-recommended | auth-optional | feature:volunteering |
| GET | `/volunteering/swaps` | volunteering | volunteeringSwaps | volunteering-swaps | auth-optional | feature:volunteering |
| GET | `/volunteering/training` | volunteering | volunteeringSafeguarding | volunteering-safeguarding | auth-optional | feature:volunteering |
| GET | `/volunteering/waitlist` | volunteering | volunteeringWaitlist | volunteering-waitlist | auth-optional | feature:volunteering |
| GET | `/volunteering/wellbeing` | volunteering | volunteeringWellbeing | volunteering-wellbeing | auth-optional | feature:volunteering |
| POST | `/volunteering/accessibility` | volunteering | updateVolunteerAccessibility |  | auth-optional | feature:volunteering |
| POST | `/volunteering/applications/{param}/withdraw` | volunteering | withdrawVolunteerApplication |  | auth-optional | feature:volunteering |
| POST | `/volunteering/certificates/generate` | volunteering | generateVolunteerCertificate |  | auth-optional | feature:volunteering |
| POST | `/volunteering/credentials` | volunteering | volunteeringUploadCredential |  | auth-optional | feature:volunteering |
| POST | `/volunteering/credentials/{param}/delete` | volunteering | volunteeringDeleteCredential |  | auth-optional | feature:volunteering |
| POST | `/volunteering/donations` | volunteering | volunteeringStoreDonation |  | auth-optional | feature:volunteering |
| POST | `/volunteering/emergency-alerts/{param}/respond` | volunteering | volunteeringRespondEmergencyAlert |  | auth-optional | feature:volunteering |
| POST | `/volunteering/expenses` | volunteering | volunteeringSubmitExpense |  | auth-optional | feature:volunteering |
| POST | `/volunteering/group-signups/{param}/cancel` | volunteering | volunteeringCancelGroupReservation |  | auth-optional | feature:volunteering |
| POST | `/volunteering/group-signups/{param}/members` | volunteering | volunteeringAddGroupMember |  | auth-optional | feature:volunteering |
| POST | `/volunteering/group-signups/{param}/members/{param}/remove` | volunteering | volunteeringRemoveGroupMember |  | auth-optional | feature:volunteering |
| POST | `/volunteering/hours` | volunteering | storeVolunteeringHours |  | auth-optional | feature:volunteering |
| POST | `/volunteering/incidents` | volunteering | volunteeringSafeguardingReportIncident |  | auth-optional | feature:volunteering |
| POST | `/volunteering/opportunities/{param}/apply` | volunteering | applyVolunteerOpportunity |  | auth-optional | feature:volunteering |
| POST | `/volunteering/opportunities/{param}/shifts/{param}/cancel` | volunteering | cancelVolunteerShift |  | auth-optional | feature:volunteering |
| POST | `/volunteering/opportunities/{param}/shifts/{param}/signup` | volunteering | signUpForVolunteerShift |  | auth-optional | feature:volunteering |
| POST | `/volunteering/opportunities/create` | volunteering | volunteeringStoreOpportunity |  | auth-optional | feature:volunteering |
| POST | `/volunteering/organisations/{param}/applications/{param}` | volunteering | handleVolunteerOrgApplication |  | public-or-unknown |  |
| POST | `/volunteering/organisations/{param}/hours/{param}` | volunteering | verifyVolunteerOrgHours |  | public-or-unknown |  |
| POST | `/volunteering/organisations/{param}/settings` | volunteering | volunteeringUpdateOrgSettings |  | public-or-unknown |  |
| POST | `/volunteering/organisations/{param}/wallet/auto-pay` | volunteering | volunteeringOrgAutoPay |  | public-or-unknown |  |
| POST | `/volunteering/organisations/{param}/wallet/deposit` | volunteering | volunteeringOrgWalletDeposit |  | public-or-unknown |  |
| POST | `/volunteering/swaps` | volunteering | requestVolunteerSwap |  | auth-optional | feature:volunteering |
| POST | `/volunteering/swaps/{param}/cancel` | volunteering | cancelVolunteerSwap |  | auth-optional | feature:volunteering |
| POST | `/volunteering/swaps/{param}/respond` | volunteering | respondVolunteerSwap |  | auth-optional | feature:volunteering |
| POST | `/volunteering/training` | volunteering | volunteeringSafeguardingLogTraining |  | auth-optional | feature:volunteering |
| POST | `/volunteering/waitlist/{param}/leave` | volunteering | leaveVolunteerWaitlist |  | auth-optional | feature:volunteering |
| POST | `/volunteering/wellbeing/checkin` | volunteering | volunteeringWellbeingCheckin |  | auth-optional | feature:volunteering |
| GET | `/wallet/export.csv` | wallet | exportTransactions |  | auth-optional | module:wallet |
| GET | `/wallet/manage` | wallet | walletManage | wallet-manage | auth-optional | module:wallet |
| GET | `/wallet/recipients` | wallet | walletRecipients |  | auth-optional | module:wallet |
| POST | `/wallet/donate` | wallet | donateCredits |  | auth-optional | module:wallet |
