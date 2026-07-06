# Generated Laravel Accessible Route Matrix

Generated: 2026-07-06T11:22:54.247Z

| Metric | Count |
| --- | ---: |
| Laravel accessible routes | 608 |
| web-uk routes | 564 |
| Matched routes | 482 |
| Missing routes | 126 |
| Extra web-uk routes | 83 |

## Family Counts

| Family | Matched | Missing | Extra web-uk |
| --- | ---: | ---: | ---: |
| about | 1 | 0 | 0 |
| accessibility | 1 | 0 | 0 |
| account | 1 | 0 | 0 |
| achievements | 10 | 0 | 0 |
| activity | 2 | 0 | 0 |
| admin | 0 | 0 | 24 |
| appreciations | 1 | 0 | 0 |
| blog | 12 | 0 | 0 |
| chat | 2 | 0 | 0 |
| clubs | 1 | 0 | 0 |
| components | 0 | 0 | 1 |
| connections | 5 | 0 | 1 |
| contact | 2 | 0 | 0 |
| cookie-consent | 1 | 0 | 0 |
| cookies | 1 | 0 | 0 |
| coupons | 2 | 0 | 0 |
| courses | 10 | 16 | 0 |
| dashboard | 1 | 0 | 0 |
| events | 21 | 0 | 2 |
| exchanges | 4 | 0 | 0 |
| explore | 1 | 0 | 0 |
| faq | 1 | 0 | 0 |
| features | 1 | 0 | 0 |
| federation | 17 | 11 | 0 |
| feed | 22 | 0 | 10 |
| forgot-password | 0 | 0 | 2 |
| goals | 12 | 15 | 0 |
| group-exchanges | 9 | 0 | 0 |
| groups | 20 | 16 | 6 |
| guide | 1 | 0 | 0 |
| health | 0 | 0 | 1 |
| help | 1 | 0 | 0 |
| home | 2 | 0 | 0 |
| ideation | 34 | 0 | 0 |
| jobs | 21 | 17 | 0 |
| kb | 2 | 0 | 0 |
| leaderboard | 5 | 0 | 0 |
| legal | 6 | 0 | 0 |
| listings | 11 | 8 | 1 |
| login | 7 | 0 | 0 |
| logout | 1 | 0 | 1 |
| marketplace | 48 | 0 | 0 |
| matches | 4 | 0 | 0 |
| me | 6 | 0 | 0 |
| members | 11 | 0 | 1 |
| messages | 7 | 11 | 2 |
| newsletter | 1 | 0 | 0 |
| nexus-score | 2 | 0 | 0 |
| notifications | 6 | 0 | 0 |
| onboarding | 4 | 0 | 0 |
| organisations | 9 | 0 | 0 |
| password | 2 | 0 | 0 |
| podcasts | 6 | 8 | 0 |
| polls | 13 | 0 | 0 |
| premium | 6 | 0 | 0 |
| privacy | 0 | 0 | 1 |
| profile | 5 | 16 | 2 |
| progress | 0 | 0 | 4 |
| register | 2 | 0 | 0 |
| report-a-problem | 2 | 0 | 0 |
| reports | 0 | 0 | 3 |
| reset-password | 0 | 0 | 2 |
| resources | 12 | 0 | 0 |
| reviews | 7 | 0 | 4 |
| saved | 2 | 0 | 0 |
| search | 6 | 0 | 1 |
| service-unavailable | 0 | 0 | 1 |
| session | 0 | 0 | 1 |
| settings | 5 | 8 | 7 |
| skills | 1 | 0 | 0 |
| terms | 0 | 0 | 1 |
| trust-and-safety | 1 | 0 | 0 |
| users | 3 | 0 | 0 |
| verify-2fa | 0 | 0 | 1 |
| verify-email | 1 | 0 | 0 |
| volunteering | 52 | 0 | 0 |
| wallet | 6 | 0 | 3 |

## Missing Laravel Routes

| Method | Path | Family | Handler | Blade view | Auth | Gates |
| --- | --- | --- | --- | --- | --- | --- |
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
| POST | `/listings/{param}/comments` | listings | listingsStoreComment |  | auth-optional | module:listings |
| POST | `/listings/{param}/exchange-request` | listings | storeExchangeRequest |  | auth-optional | module:listings |
| POST | `/listings/{param}/like` | listings | listingsToggleLike |  | auth-optional | module:listings |
| POST | `/listings/{param}/renew` | listings | renewListing |  | auth-optional | module:listings |
| POST | `/listings/{param}/report` | listings | storeListingReport |  | auth-optional | module:listings |
| POST | `/listings/{param}/save` | listings | saveListing |  | auth-optional | module:listings |
| POST | `/listings/{param}/unsave` | listings | unsaveListing |  | auth-optional | module:listings |
| POST | `/listings/generate-description` | listings | listingsGenerateDescription |  | auth-optional | module:listings |
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
| POST | `/podcasts/{param}/subscribe` | podcasts | podcastSubscribe |  | auth-optional | feature:podcasts |
| POST | `/podcasts/studio/{param}/delete` | podcasts | commerceDeletePodcast |  | auth-optional | feature:podcasts |
| POST | `/podcasts/studio/{param}/episodes` | podcasts | commerceStorePodcastEpisode |  | auth-optional | feature:podcasts |
| POST | `/podcasts/studio/{param}/episodes/{param}/delete` | podcasts | commerceDeletePodcastEpisode |  | auth-optional | feature:podcasts |
| POST | `/podcasts/studio/{param}/episodes/{param}/publish` | podcasts | commercePublishPodcastEpisode |  | auth-optional | feature:podcasts |
| POST | `/podcasts/studio/{param}/publish` | podcasts | commercePublishPodcast |  | auth-optional | feature:podcasts |
| POST | `/podcasts/studio/{param}/update` | podcasts | commerceUpdatePodcast |  | auth-optional | feature:podcasts |
| POST | `/podcasts/studio/new` | podcasts | commerceStorePodcast |  | auth-optional | feature:podcasts |
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
| POST | `/settings/appearance` | settings | settingsUpdateAppearance |  | auth-optional |  |
| POST | `/settings/availability` | settings | settingsUpdateAvailability |  | auth-optional |  |
| POST | `/settings/data-rights` | settings | settingsRequestDataRights |  | auth-optional |  |
| POST | `/settings/insurance` | settings | settingsUploadInsurance |  | auth-optional |  |
| POST | `/settings/linked-accounts/approve` | settings | settingsApproveLinkedAccount |  | auth-optional |  |
| POST | `/settings/linked-accounts/permissions` | settings | settingsUpdateLinkedPermissions |  | auth-optional |  |
| POST | `/settings/linked-accounts/request` | settings | settingsRequestLinkedAccount |  | auth-optional |  |
| POST | `/settings/linked-accounts/revoke` | settings | settingsRevokeLinkedAccount |  | auth-optional |  |
