# AI Features - Frontend Integration Guide

This guide explains how to integrate the AI features of the Nexus API into your frontend application.

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [AI Chat Endpoints](#ai-chat-endpoints)
4. [Conversational AI (Multi-turn)](#conversational-ai-multi-turn)
5. [Smart Listing Suggestions](#smart-listing-suggestions)
6. [Listing Generator](#listing-generator)
7. [Natural Language Search](#natural-language-search)
8. [Content Moderation](#content-moderation)
9. [Sentiment Analysis](#sentiment-analysis)
10. [Smart Reply Suggestions](#smart-reply-suggestions)
11. [Profile Enhancement](#profile-enhancement)
12. [Bio Generator](#bio-generator)
13. [Personalized Challenges](#personalized-challenges)
14. [Skill Recommendations](#skill-recommendations)
15. [Conversation Summarizer](#conversation-summarizer)
16. [Community Insights](#community-insights)
17. [Translation](#translation)
18. [Error Handling](#error-handling)
19. [Rate Limiting](#rate-limiting)
20. [Best Practices](#best-practices)

---

## Overview

The AI API provides intelligent features powered by a local LLaMA 3.2 model. All AI endpoints require authentication and are rate-limited.

**Base URL:** `http://localhost:5080/api/ai`

**Response Times:** AI responses typically take 5-30 seconds depending on complexity.

---

## Authentication

All AI endpoints require a valid JWT token in the Authorization header:

```javascript
const headers = {
  'Authorization': `Bearer ${accessToken}`,
  'Content-Type': 'application/json'
};
```

---

## AI Chat Endpoints

### Basic Chat (Single Response)

**Endpoint:** `POST /api/ai/chat`

Quick question-and-answer without conversation history.

```javascript
async function askAi(prompt) {
  const response = await fetch('/api/ai/chat', {
    method: 'POST',
    headers,
    body: JSON.stringify({ prompt })
  });
  return response.json();
}

// Example
const result = await askAi('What is timebanking?');
console.log(result.response);
// { response: "Timebanking is...", tokensUsed: 45, model: "llama3.2:3b" }
```

### Check AI Status

**Endpoint:** `GET /api/ai/status`

```javascript
async function checkAiStatus() {
  const response = await fetch('/api/ai/status', { headers });
  return response.json();
}

// Example response
// { available: true, model: "llama3.2:3b", queueDepth: 0 }
```

---

## Conversational AI (Multi-turn)

For ongoing conversations with context/memory:

### Start a Conversation

**Endpoint:** `POST /api/ai/conversations`

```javascript
async function startConversation(title, context) {
  const response = await fetch('/api/ai/conversations', {
    method: 'POST',
    headers,
    body: JSON.stringify({ title, context })
  });
  return response.json();
}

// Example
const conversation = await startConversation(
  'Help with listings',
  'I am new to timebanking'
);
// { id: 1, title: "Help with listings", context: "...", messageCount: 0, ... }
```

### Send Message in Conversation

**Endpoint:** `POST /api/ai/conversations/{id}/messages`

```javascript
async function sendMessage(conversationId, message) {
  const response = await fetch(`/api/ai/conversations/${conversationId}/messages`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ message })
  });
  return response.json();
}

// Example
const reply = await sendMessage(1, 'How do I create my first listing?');
// { conversationId: 1, response: "To create your first listing...", tokensUsed: 89 }
```

### Get Conversation History

**Endpoint:** `GET /api/ai/conversations/{id}/messages`

```javascript
async function getHistory(conversationId, limit = 50) {
  const response = await fetch(
    `/api/ai/conversations/${conversationId}/messages?limit=${limit}`,
    { headers }
  );
  return response.json();
}

// Returns array of messages with role, content, createdAt
```

### List User's Conversations

**Endpoint:** `GET /api/ai/conversations`

```javascript
async function listConversations(limit = 20) {
  const response = await fetch(`/api/ai/conversations?limit=${limit}`, { headers });
  return response.json();
}
```

### Archive Conversation

**Endpoint:** `DELETE /api/ai/conversations/{id}`

```javascript
async function archiveConversation(conversationId) {
  await fetch(`/api/ai/conversations/${conversationId}`, {
    method: 'DELETE',
    headers
  });
}
```

---

## Smart Listing Suggestions

Get AI-powered suggestions to improve a listing.

**Endpoint:** `POST /api/ai/listings/suggest`

```javascript
async function getListingSuggestions(title, description, type = 0) {
  const response = await fetch('/api/ai/listings/suggest', {
    method: 'POST',
    headers,
    body: JSON.stringify({ title, description, type }) // type: 0=Offer, 1=Request
  });
  return response.json();
}

// Example
const suggestions = await getListingSuggestions(
  'fix computer',
  'i can help with computers'
);
// {
//   improvedTitle: "Computer Repair & Technical Support",
//   improvedDescription: "Expert help with...",
//   suggestedTags: ["tech support", "computer repair"],
//   estimatedHours: 1.5,
//   tips: ["Add specific services you offer", "Include your availability"]
// }
```

### React Component Example

```jsx
function ListingForm() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [suggestions, setSuggestions] = useState(null);
  const [loading, setLoading] = useState(false);

  const getSuggestions = async () => {
    setLoading(true);
    try {
      const result = await getListingSuggestions(title, description);
      setSuggestions(result);
    } catch (error) {
      console.error('Failed to get suggestions:', error);
    }
    setLoading(false);
  };

  return (
    <form>
      <input value={title} onChange={e => setTitle(e.target.value)} />
      <textarea value={description} onChange={e => setDescription(e.target.value)} />

      <button type="button" onClick={getSuggestions} disabled={loading}>
        {loading ? 'Getting suggestions...' : '✨ Get AI Suggestions'}
      </button>

      {suggestions && (
        <div className="suggestions">
          <h4>Suggested Improvements:</h4>
          <p><strong>Title:</strong> {suggestions.improvedTitle}</p>
          <p><strong>Description:</strong> {suggestions.improvedDescription}</p>
          <p><strong>Tags:</strong> {suggestions.suggestedTags.join(', ')}</p>
          <ul>
            {suggestions.tips.map((tip, i) => <li key={i}>{tip}</li>)}
          </ul>
          <button onClick={() => {
            setTitle(suggestions.improvedTitle);
            setDescription(suggestions.improvedDescription);
          }}>Apply Suggestions</button>
        </div>
      )}
    </form>
  );
}
```

---

## Listing Generator

Generate complete listing content from keywords.

**Endpoint:** `POST /api/ai/listings/generate`

```javascript
async function generateListing(keywords, type = 0) {
  const response = await fetch('/api/ai/listings/generate', {
    method: 'POST',
    headers,
    body: JSON.stringify({ keywords, type }) // type: 0=Offer, 1=Request
  });
  return response.json();
}

// Example
const listing = await generateListing('cooking, italian, pasta, dinner parties');
// {
//   title: "Italian Pasta Nights at Home",
//   description: "Join me for an authentic Italian dinner party experience...",
//   suggestedTags: ["cooking", "italian", "pasta"],
//   estimatedHours: 1.5,
//   category: "Private Dining"
// }
```

### Quick Listing Creation Component

```jsx
function QuickListingCreator() {
  const [keywords, setKeywords] = useState('');
  const [generated, setGenerated] = useState(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    const result = await generateListing(keywords);
    setGenerated(result);
    setLoading(false);
  };

  return (
    <div>
      <input
        value={keywords}
        onChange={e => setKeywords(e.target.value)}
        placeholder="Enter keywords (e.g., gardening, vegetables, organic)"
      />
      <button onClick={generate} disabled={loading}>
        {loading ? 'Generating...' : '✨ Generate Listing'}
      </button>

      {generated && (
        <div className="preview">
          <h3>{generated.title}</h3>
          <p>{generated.description}</p>
          <div className="tags">{generated.suggestedTags.join(', ')}</div>
          <button onClick={() => createListing(generated)}>
            Create This Listing
          </button>
        </div>
      )}
    </div>
  );
}
```

---

## Natural Language Search

Search listings using natural language instead of keywords.

**Endpoint:** `POST /api/ai/search`

```javascript
async function smartSearch(query, maxResults = 10) {
  const response = await fetch('/api/ai/search', {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, maxResults })
  });
  return response.json();
}

// Example - semantic search
const results = await smartSearch('I need someone to fix my bicycle');
// [
//   { listingId: 4, title: "Bike Repair", relevance: 0.95, matchReason: "Exact match" },
//   { listingId: 12, title: "Cycling Help", relevance: 0.70, matchReason: "Related service" }
// ]
```

### Search Component Example

```jsx
function SmartSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const search = async (e) => {
    e.preventDefault();
    setSearching(true);
    const data = await smartSearch(query);
    setResults(data);
    setSearching(false);
  };

  return (
    <div>
      <form onSubmit={search}>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Describe what you're looking for..."
        />
        <button disabled={searching}>
          {searching ? 'Searching...' : '🔍 Search'}
        </button>
      </form>

      <ul>
        {results.map(r => (
          <li key={r.listingId}>
            <a href={`/listings/${r.listingId}`}>{r.title}</a>
            <span className="relevance">{Math.round(r.relevance * 100)}% match</span>
            <small>{r.matchReason}</small>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

---

## Content Moderation

Check content for appropriateness before posting.

**Endpoint:** `POST /api/ai/moderate`

```javascript
async function moderateContent(content, contentType = 'listing') {
  const response = await fetch('/api/ai/moderate', {
    method: 'POST',
    headers,
    body: JSON.stringify({ content, contentType })
  });
  return response.json();
}

// Example
const moderation = await moderateContent('I can help with tutoring for kids!');
// { isApproved: true, flaggedIssues: [], severity: "none", suggestions: [] }

// Content types: "listing", "message", "post", "comment", "profile"
```

### Pre-submit Moderation

```javascript
async function submitListing(listingData) {
  // Check content before submission
  const moderation = await moderateContent(
    `${listingData.title} ${listingData.description}`,
    'listing'
  );

  if (!moderation.isApproved) {
    throw new Error(`Content not allowed: ${moderation.flaggedIssues.join(', ')}`);
  }

  if (moderation.severity === 'medium') {
    // Show warning but allow
    console.warn('Content flagged:', moderation.suggestions);
  }

  // Proceed with submission
  return fetch('/api/listings', {
    method: 'POST',
    headers,
    body: JSON.stringify(listingData)
  });
}
```

---

## Sentiment Analysis

Analyze the sentiment and emotions in messages.

**Endpoint:** `POST /api/ai/sentiment`

```javascript
async function analyzeSentiment(text) {
  const response = await fetch('/api/ai/sentiment', {
    method: 'POST',
    headers,
    body: JSON.stringify({ text })
  });
  return response.json();
}

// Example
const sentiment = await analyzeSentiment(
  'Thank you so much for helping me! You did an amazing job!'
);
// {
//   sentiment: "positive",
//   confidence: 0.9,
//   tone: "friendly",
//   emotions: ["gratitude", "appreciation"],
//   isUrgent: false,
//   summary: "Member expresses gratitude for help"
// }
```

### Use Cases

```jsx
// Flag negative messages for review
function MessageInbox({ messages }) {
  return messages.map(msg => (
    <Message
      key={msg.id}
      {...msg}
      onReceive={async () => {
        const sentiment = await analyzeSentiment(msg.content);
        if (sentiment.sentiment === 'negative' && sentiment.confidence > 0.8) {
          flagForReview(msg.id);
        }
        if (sentiment.isUrgent) {
          notifyUser('Urgent message received');
        }
      }}
    />
  ));
}
```

---

## Smart Reply Suggestions

Get AI-generated reply suggestions for messages.

**Endpoint:** `POST /api/ai/replies/suggest`

```javascript
async function getSmartReplies(lastMessage, conversationContext, count = 3) {
  const response = await fetch('/api/ai/replies/suggest', {
    method: 'POST',
    headers,
    body: JSON.stringify({ lastMessage, conversationContext, count })
  });
  return response.json();
}

// Example
const replies = await getSmartReplies(
  'Are you still available for gardening help this weekend?',
  'Previous discussion about garden services'
);
// {
//   suggestions: [
//     { text: "Yes, I'm available! When works best for you?", tone: "friendly", intent: "confirm" },
//     { text: "I'm booked this weekend, but free next week!", tone: "friendly", intent: "reschedule" },
//     { text: "Let me check my schedule and get back to you.", tone: "professional", intent: "defer" }
//   ]
// }
```

### Quick Reply Component

```jsx
function SmartReplyBar({ lastMessage, onReply }) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    getSmartReplies(lastMessage).then(data => {
      setSuggestions(data.suggestions);
      setLoading(false);
    });
  }, [lastMessage]);

  if (loading) return <div>Loading suggestions...</div>;

  return (
    <div className="smart-replies">
      {suggestions.map((reply, i) => (
        <button
          key={i}
          onClick={() => onReply(reply.text)}
          title={`${reply.tone} - ${reply.intent}`}
        >
          {reply.text}
        </button>
      ))}
    </div>
  );
}
```

---

## Profile Enhancement

Get AI suggestions to improve a user's profile.

**Endpoint:** `GET /api/ai/profile/suggestions`

```javascript
async function getProfileSuggestions() {
  const response = await fetch('/api/ai/profile/suggestions', { headers });
  return response.json();
}

// Example response
// {
//   suggestedSkills: ["gardening", "tutoring", "cooking"],
//   bioSuggestion: "Experienced community member passionate about...",
//   nextBadgeGoal: "Community Helper",
//   tips: ["Add a profile photo", "Complete your bio"]
// }
```

---

## Bio Generator

Generate professional bio options from user activity.

**Endpoint:** `POST /api/ai/bio/generate`

```javascript
async function generateBio(interests, tone = 'friendly') {
  const response = await fetch('/api/ai/bio/generate', {
    method: 'POST',
    headers,
    body: JSON.stringify({ interests, tone })
  });
  return response.json();
}

// Example
const bios = await generateBio('photography, cooking, hiking', 'friendly');
// {
//   short: "Hi, I'm Alice! I love helping my community.",
//   medium: "Hi, I'm Alice! I'm a Level 3 member who loves connecting...",
//   long: "Hi, I'm Alice! As a Level 3 community member, I believe in...",
//   tagline: "Neighbor helping neighbor!",
//   bio: "Hi, I'm Alice! I'm a Level 3 member who loves connecting..."
// }
```

### Bio Selection Component

```jsx
function BioGenerator({ onSelect }) {
  const [interests, setInterests] = useState('');
  const [tone, setTone] = useState('friendly');
  const [bios, setBios] = useState(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    const result = await generateBio(interests, tone);
    setBios(result);
    setLoading(false);
  };

  return (
    <div>
      <input
        value={interests}
        onChange={e => setInterests(e.target.value)}
        placeholder="Your interests (e.g., gardening, cooking)"
      />
      <select value={tone} onChange={e => setTone(e.target.value)}>
        <option value="friendly">Friendly</option>
        <option value="professional">Professional</option>
        <option value="casual">Casual</option>
      </select>
      <button onClick={generate} disabled={loading}>
        {loading ? 'Generating...' : '✨ Generate Bio Options'}
      </button>

      {bios && (
        <div className="bio-options">
          <div onClick={() => onSelect(bios.short)}>
            <h4>Short</h4>
            <p>{bios.short}</p>
          </div>
          <div onClick={() => onSelect(bios.medium)}>
            <h4>Medium</h4>
            <p>{bios.medium}</p>
          </div>
          <div onClick={() => onSelect(bios.long)}>
            <h4>Detailed</h4>
            <p>{bios.long}</p>
          </div>
          <div className="tagline">
            <strong>Tagline:</strong> {bios.tagline}
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## Personalized Challenges

Get AI-generated challenges tailored to user activity.

**Endpoint:** `GET /api/ai/challenges`

```javascript
async function getChallenges() {
  const response = await fetch('/api/ai/challenges', { headers });
  return response.json();
}

// Example response
// {
//   challenges: [
//     {
//       title: "Share Your Skills",
//       description: "Create a new listing showcasing your expertise",
//       xpReward: 25,
//       difficulty: "easy",
//       category: "listings",
//       target: 1,
//       unit: "listing"
//     },
//     {
//       title: "Connect with Someone New",
//       description: "Reach out to a connection and schedule an exchange",
//       xpReward: 75,
//       difficulty: "medium",
//       category: "connections",
//       target: 1,
//       unit: "exchange"
//     }
//   ],
//   motivationalMessage: "Keep growing and engaging with your community!"
// }
```

### Challenges Dashboard Component

```jsx
function ChallengesDashboard() {
  const [challenges, setChallenges] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getChallenges().then(data => {
      setChallenges(data);
      setLoading(false);
    });
  }, []);

  if (loading) return <Spinner />;

  return (
    <div className="challenges">
      <h2>Your Personalized Challenges</h2>
      <p className="motivation">{challenges.motivationalMessage}</p>

      <div className="challenge-grid">
        {challenges.challenges.map((challenge, i) => (
          <div key={i} className={`challenge ${challenge.difficulty}`}>
            <h3>{challenge.title}</h3>
            <p>{challenge.description}</p>
            <div className="reward">
              <span className="xp">+{challenge.xpReward} XP</span>
              <span className="difficulty">{challenge.difficulty}</span>
            </div>
            <div className="progress">
              Goal: {challenge.target} {challenge.unit}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Skill Recommendations

Get AI-powered skill suggestions based on community needs.

**Endpoint:** `GET /api/ai/skills/recommend`

```javascript
async function getSkillRecommendations() {
  const response = await fetch('/api/ai/skills/recommend', { headers });
  return response.json();
}

// Example response
// {
//   recommendations: [
//     {
//       skill: "Home Organization",
//       reason: "Builds on existing home repair skills",
//       demandLevel: "high",
//       relatedToExisting: true,
//       learningTip: "Start by decluttering a small area"
//     },
//     {
//       skill: "Basic First Aid",
//       reason: "High demand in community",
//       demandLevel: "high",
//       relatedToExisting: false,
//       learningTip: "Enroll in a local first aid course"
//     }
//   ],
//   communityNeeds: ["Gardening Services", "Bike Repair"]
// }
```

---

## Conversation Summarizer

Summarize message conversations.

**Endpoint:** `POST /api/ai/summarize`

```javascript
async function summarizeConversation(messages) {
  const response = await fetch('/api/ai/summarize', {
    method: 'POST',
    headers,
    body: JSON.stringify({ messages })
  });
  return response.json();
}

// Example
const summary = await summarizeConversation([
  "Hi, I saw your gardening help listing. Are you available?",
  "Yes, I can come Saturday morning. What do you need?",
  "I need help planting vegetables and pulling weeds.",
  "Sounds good! See you at 10am Saturday.",
  "Perfect, thank you!"
]);
// {
//   summary: "Gardening help arranged for Saturday morning",
//   topic: "Timebanking - Gardening Help",
//   status: "resolved",
//   keyPoints: ["Gardening help needed", "Saturday 10am confirmed"],
//   nextSteps: "None"
// }
```

---

## Community Insights

Get AI-generated analytics about the community.

**Endpoint:** `GET /api/ai/community/insights`

```javascript
async function getCommunityInsights() {
  const response = await fetch('/api/ai/community/insights', { headers });
  return response.json();
}

// Example response
// {
//   summary: "Active community with strong growth...",
//   trendingServices: ["gardening", "tech support"],
//   skillGaps: ["childcare", "language tutoring"],
//   recommendations: ["Recruit more members with childcare skills"],
//   healthScore: 85,
//   totalActiveUsers: 45,
//   totalActiveListings: 120
// }
```

---

## Translation

Translate text to other languages.

**Endpoint:** `POST /api/ai/translate`

```javascript
async function translate(text, targetLanguage) {
  const response = await fetch('/api/ai/translate', {
    method: 'POST',
    headers,
    body: JSON.stringify({ text, targetLanguage })
  });
  return response.json();
}

// Supported languages: english, spanish, french, german, italian,
// portuguese, dutch, russian, chinese, japanese, korean, arabic

// Example
const result = await translate('Hello, welcome to our community!', 'spanish');
// { originalText: "Hello...", translatedText: "¡Hola, bienvenido...", targetLanguage: "spanish" }
```

---

## Error Handling

### HTTP Status Codes

| Code | Meaning | Action |
|------|---------|--------|
| 200 | Success | Process response |
| 400 | Bad request | Show validation error |
| 401 | Unauthorized | Redirect to login |
| 429 | Rate limited | Wait and retry |
| 503 | AI service unavailable | Show fallback UI |
| 504 | AI timeout | Retry or show timeout message |

### Error Response Format

```json
{
  "error": "AI service temporarily unavailable",
  "retryAfter": 30
}
```

### Retry Logic

```javascript
async function aiRequestWithRetry(requestFn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await requestFn();
    } catch (error) {
      if (error.status === 503 || error.status === 504) {
        const waitTime = error.retryAfter || Math.pow(2, i) * 1000;
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      throw error;
    }
  }
  throw new Error('AI service unavailable after retries');
}
```

---

## Rate Limiting

AI endpoints are limited to **20 requests per minute** per user.

### Handling 429 Responses

```javascript
if (response.status === 429) {
  const retryAfter = response.headers.get('Retry-After') || 60;
  showToast(`Please wait ${retryAfter} seconds before trying again`);
}
```

---

## Best Practices

### 1. Show Loading States

AI requests can take 5-30 seconds. Always show loading indicators:

```jsx
{loading ? (
  <div className="ai-loading">
    <Spinner />
    <p>AI is thinking...</p>
  </div>
) : (
  <AIResponse data={response} />
)}
```

### 2. Cache Responses

Cache AI responses when appropriate:

```javascript
const cache = new Map();

async function getCachedSuggestions(title, description) {
  const key = `${title}|${description}`;
  if (cache.has(key)) return cache.get(key);

  const result = await getListingSuggestions(title, description);
  cache.set(key, result);
  return result;
}
```

### 3. Debounce Input

Don't call AI on every keystroke:

```javascript
const debouncedGetSuggestions = debounce(getListingSuggestions, 1000);
```

### 4. Progressive Enhancement

Always provide fallback UI when AI is unavailable:

```jsx
function ListingForm() {
  const [aiAvailable, setAiAvailable] = useState(false);

  useEffect(() => {
    checkAiStatus().then(status => setAiAvailable(status.available));
  }, []);

  return (
    <form>
      <input ... />
      {aiAvailable && (
        <button type="button" onClick={getSuggestions}>
          ✨ Get AI Suggestions
        </button>
      )}
    </form>
  );
}
```

### 5. Handle Long Responses

For conversation mode, implement streaming-like UX:

```jsx
function ConversationMessage({ message }) {
  const [displayedText, setDisplayedText] = useState('');

  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      setDisplayedText(message.slice(0, index));
      index++;
      if (index > message.length) clearInterval(interval);
    }, 20);
    return () => clearInterval(interval);
  }, [message]);

  return <p>{displayedText}</p>;
}
```

---

## TypeScript Types

```typescript
interface AiChatRequest {
  prompt: string;
  context?: string;
  maxTokens?: number;
}

interface AiChatResponse {
  response: string;
  tokensUsed: number;
  model: string;
}

interface ListingSuggestions {
  improvedTitle: string;
  improvedDescription: string;
  suggestedTags: string[];
  estimatedHours: number;
  tips: string[];
}

interface SearchResult {
  listingId: number;
  title: string;
  description: string | null;
  type: string;
  userName: string;
  relevance: number;
  matchReason: string;
}

interface ModerationResult {
  isApproved: boolean;
  flaggedIssues: string[];
  severity: 'none' | 'low' | 'medium' | 'high' | 'critical';
  suggestions: string[];
}

interface ConversationSummary {
  id: number;
  title: string;
  context: string | null;
  messageCount: number;
  totalTokensUsed: number;
  createdAt: string;
  lastMessageAt: string | null;
}

interface ConversationMessage {
  id: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
}

// New AI Feature Types

interface SmartReplySuggestions {
  suggestions: ReplySuggestion[];
}

interface ReplySuggestion {
  text: string;
  tone: string;
  intent: string;
}

interface GeneratedListing {
  title: string;
  description: string;
  suggestedTags: string[];
  estimatedHours: number;
  category: string;
}

interface SentimentAnalysis {
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
  confidence: number;
  tone: string;
  emotions: string[];
  isUrgent: boolean;
  summary: string;
}

interface GeneratedBio {
  short: string;
  medium: string;
  long: string;
  tagline: string;
  bio: string; // alias for medium
}

interface PersonalizedChallenges {
  challenges: Challenge[];
  motivationalMessage: string;
}

interface Challenge {
  title: string;
  description: string;
  xpReward: number;
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
  target: number;
  unit: string;
}

interface SkillRecommendations {
  recommendations: SkillRecommendation[];
  communityNeeds: string[];
}

interface SkillRecommendation {
  skill: string;
  reason: string;
  demandLevel: string;
  relatedToExisting: boolean;
  learningTip: string;
}

interface ConversationSummaryResult {
  summary: string;
  topic: string | null;
  status: string;
  keyPoints: string[];
  nextSteps: string | null;
}
```

---

## Questions?

See the main [FRONTEND_INTEGRATION.md](./FRONTEND_INTEGRATION.md) for general API usage, or check the Swagger documentation at `http://localhost:5080/swagger`.
