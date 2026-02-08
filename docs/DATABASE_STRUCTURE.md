# Database Structure Documentation

This document describes the complete database schema for the Punzilo exam preparation platform.

## Overview

The database is built on PostgreSQL (via Lovable Cloud) and uses Row-Level Security (RLS) for access control. The schema supports:
- User authentication and profiles
- Subject and topic management
- Past papers and questions
- Exam sessions and user attempts
- Role-based access control

---

## Enums

### `app_role`
Defines user roles in the system.
```sql
'admin' | 'moderator' | 'user'
```

### `grade_level`
Academic grade levels supported.
```sql
'Seven' | 'Eight' | 'Nine' | 'Ten' | 'Eleven' | 'Twelve'
```

### `difficulty_level`
Question difficulty classifications.
```sql
'Easy' | 'Medium' | 'Hard'
```

### `question_type`
Types of questions supported.
```sql
'multiple_choice' | 'true_false' | 'short_answer' | 'essay'
```

### `paper_type`
Classification of past papers.
```sql
'Paper 1' | 'Paper 2' | 'Paper 3'
```

---

## Tables

### `profiles`
Stores user profile information linked to authenticated users.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | No | - | Primary key, matches `auth.users.id` |
| `name` | text | Yes | - | User's display name |
| `school_name` | text | Yes | - | User's school |
| `grade_level` | grade_level | No | - | Current academic grade |
| `created_at` | timestamptz | No | `now()` | Record creation time |
| `updated_at` | timestamptz | No | `now()` | Last update time |

**RLS Policies:**
- Users can view their own profile
- Users can insert their own profile
- Users can update their own profile
- Users cannot delete profiles

---

### `user_roles`
Manages role assignments for users. **Critical for security.**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | No | `gen_random_uuid()` | Primary key |
| `user_id` | uuid | No | - | Reference to user |
| `role` | app_role | No | - | Assigned role |
| `created_at` | timestamptz | Yes | `now()` | Assignment time |

**Unique Constraint:** `(user_id, role)`

**RLS Policies:**
- Users can view their own roles
- Admins can view all roles
- Admins can insert roles
- Admins can delete roles
- No one can update roles (delete and re-create instead)

---

### `subjects`
Academic subjects available in the system.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | No | `gen_random_uuid()` | Primary key |
| `name` | text | No | - | Subject name |
| `grade_level` | grade_level | No | - | Associated grade |
| `is_compulsory` | boolean | Yes | `false` | Whether subject is mandatory |
| `created_at` | timestamptz | No | `now()` | Record creation time |

**RLS Policies:**
- Anyone can view subjects
- Admins can insert subjects
- Admins can update subjects
- Admins can delete subjects

---

### `topics`
Topics within each subject for organizing questions.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | No | `gen_random_uuid()` | Primary key |
| `name` | text | No | - | Topic name |
| `subject_id` | uuid | No | - | Parent subject reference |
| `created_at` | timestamptz | No | `now()` | Record creation time |

**RLS Policies:**
- Anyone can view topics
- Admins can insert topics
- Admins can update topics
- Admins can delete topics

---

### `past_papers`
Historical examination papers.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | No | `gen_random_uuid()` | Primary key |
| `name` | text | No | - | Paper name/title |
| `year` | text | No | - | Examination year |
| `subject_id` | uuid | No | - | Associated subject |
| `grade_level` | grade_level | No | `'Seven'` | Target grade |
| `paper_type` | paper_type | Yes | - | Paper classification |
| `duration` | text | No | - | Exam duration |
| `total_score` | float | No | - | Maximum possible score |
| `is_writable` | boolean | No | `true` | Whether paper accepts submissions |
| `created_at` | timestamptz | No | `now()` | Record creation time |

**RLS Policies:**
- Anyone can view past papers
- Admins can insert past papers
- Admins can update past papers
- Admins can delete past papers

---

### `questions`
Individual questions within past papers.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | No | `gen_random_uuid()` | Primary key |
| `question_text` | text | No | - | The question content |
| `question_number` | integer | No | - | Order within paper |
| `question_type` | question_type | No | - | Type of question |
| `marks` | float | No | - | Points for this question |
| `difficulty` | difficulty_level | Yes | `'Medium'` | Difficulty rating |
| `options` | text[] | Yes | - | MCQ options (if applicable) |
| `correct_answer` | text[] | No | - | Correct answer(s) |
| `sample_answer` | text | Yes | - | Example answer for essays |
| `image_url` | text | Yes | - | Associated image |
| `past_paper_id` | uuid | No | - | Parent paper |
| `subject_id` | uuid | No | - | Associated subject |
| `topic_id` | uuid | Yes | - | Associated topic |
| `created_at` | timestamptz | No | `now()` | Record creation time |

**RLS Policies:**
- Anyone can view questions
- Admins can insert questions
- Admins can update questions
- Admins can delete questions

---

### `exam_sessions`
Tracks user exam attempts/sessions.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | No | `gen_random_uuid()` | Primary key |
| `user_id` | uuid | No | - | User taking exam |
| `past_paper_id` | uuid | No | - | Paper being attempted |
| `started_at` | timestamptz | No | `now()` | Session start time |
| `completed_at` | timestamptz | Yes | - | Completion time |
| `duration_seconds` | integer | Yes | - | Time taken |
| `total_score` | float | No | `0` | Score achieved |
| `total_possible_score` | float | No | `0` | Maximum possible |
| `created_at` | timestamptz | No | `now()` | Record creation time |
| `updated_at` | timestamptz | No | `now()` | Last update time |

**RLS Policies:**
- Users can view their own exam sessions
- Users can insert their own exam sessions
- Users can update their own exam sessions
- Users cannot delete exam sessions

---

### `user_attempts`
Individual question attempts within an exam session.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | No | `gen_random_uuid()` | Primary key |
| `user_id` | uuid | No | - | User who attempted |
| `question_id` | uuid | No | - | Question attempted |
| `exam_session_id` | uuid | Yes | - | Parent session |
| `user_answer` | text | No | - | User's response |
| `is_correct` | boolean | No | - | Whether correct |
| `marks_awarded` | float | No | - | Points earned |
| `attempted_at` | timestamptz | No | `now()` | Attempt time |

**RLS Policies:**
- Users can view their own attempts
- Users can insert their own attempts
- Users cannot update or delete attempts

---

### `profile_subjects`
Junction table linking users to their selected subjects.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | No | `gen_random_uuid()` | Primary key |
| `profile_id` | uuid | No | - | User profile |
| `subject_id` | uuid | No | - | Selected subject |
| `created_at` | timestamptz | No | `now()` | Selection time |

**RLS Policies:**
- Users can view their own subject selections
- Users can insert their own subject selections
- Users can delete their own subject selections
- Users cannot update selections (delete and re-create)

---

### `exam_dates`
Tracks upcoming examination dates by grade level.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | No | `gen_random_uuid()` | Primary key |
| `grade_level` | grade_level | No | - | Target grade |
| `exam_start_date` | date | No | - | Exam start date |
| `created_at` | timestamptz | No | `now()` | Record creation time |
| `updated_at` | timestamptz | No | `now()` | Last update time |

**RLS Policies:**
- Anyone can view exam dates
- Admins can insert exam dates
- Admins can update exam dates
- No one can delete exam dates

---

## Database Functions

### `has_role(user_id, role)`
Checks if a user has a specific role. Used in RLS policies.

```sql
has_role(_user_id uuid, _role app_role) → boolean
```

**Security:** `SECURITY DEFINER` - Bypasses RLS to prevent recursive policy checks.

---

### `get_admin_stats()`
Returns aggregate statistics for the admin dashboard.

```sql
get_admin_stats() → TABLE(total_users, total_papers, total_questions)
```

**Returns:**
- `total_users`: Count of all profiles
- `total_papers`: Count of all past papers
- `total_questions`: Count of all questions

**Security:** Requires admin role.

---

### `get_questions_for_exam(paper_id)`
Retrieves questions for a specific paper during exams.

```sql
get_questions_for_exam(paper_id uuid) → TABLE(...)
```

**Returns:** Question details ordered by question number.

---

### `update_updated_at_column()`
Trigger function to auto-update `updated_at` timestamps.

---

## Storage Buckets

### `question-images`
- **Public:** Yes
- **Purpose:** Stores images associated with questions

---

## Entity Relationship Diagram

```
┌─────────────────┐       ┌─────────────────┐
│   auth.users    │       │    subjects     │
│   (Supabase)    │       ├─────────────────┤
└────────┬────────┘       │ id              │
         │                │ name            │
         │                │ grade_level     │
         │                │ is_compulsory   │
         │                └────────┬────────┘
         │                         │
         ▼                         │
┌─────────────────┐                │
│    profiles     │                │
├─────────────────┤                │
│ id (= user.id)  │                │
│ name            │                ▼
│ school_name     │       ┌─────────────────┐
│ grade_level     │       │     topics      │
└────────┬────────┘       ├─────────────────┤
         │                │ id              │
         │                │ name            │
         ▼                │ subject_id ─────┼──► subjects.id
┌─────────────────┐       └─────────────────┘
│  user_roles     │                
├─────────────────┤                
│ id              │       ┌─────────────────┐
│ user_id ────────┼──►    │  past_papers    │
│ role            │       ├─────────────────┤
└─────────────────┘       │ id              │
                          │ name            │
┌─────────────────┐       │ year            │
│ profile_subjects│       │ subject_id ─────┼──► subjects.id
├─────────────────┤       │ grade_level     │
│ id              │       │ paper_type      │
│ profile_id ─────┼──►    │ duration        │
│ subject_id ─────┼──►    │ total_score     │
└─────────────────┘       └────────┬────────┘
                                   │
                                   ▼
                          ┌─────────────────┐
                          │   questions     │
                          ├─────────────────┤
                          │ id              │
                          │ question_text   │
                          │ question_type   │
                          │ marks           │
                          │ past_paper_id ──┼──► past_papers.id
                          │ subject_id ─────┼──► subjects.id
                          │ topic_id ───────┼──► topics.id
                          └────────┬────────┘
                                   │
         ┌─────────────────────────┴─────────────────────────┐
         │                                                   │
         ▼                                                   ▼
┌─────────────────┐                                 ┌─────────────────┐
│  exam_sessions  │                                 │  user_attempts  │
├─────────────────┤                                 ├─────────────────┤
│ id              │                                 │ id              │
│ user_id ────────┼──► profiles.id                  │ user_id ────────┼──► profiles.id
│ past_paper_id ──┼──► past_papers.id               │ question_id ────┼──► questions.id
│ started_at      │                                 │ exam_session_id ┼──► exam_sessions.id
│ completed_at    │                                 │ user_answer     │
│ total_score     │                                 │ is_correct      │
└─────────────────┘                                 │ marks_awarded   │
                                                    └─────────────────┘
```

---

## Security Model

### Role-Based Access Control (RBAC)
- Roles are stored in `user_roles` table, separate from `profiles`
- The `has_role()` function provides secure role checking
- Admin operations are gated by RLS policies using `has_role()`

### Row-Level Security (RLS)
All tables have RLS enabled with policies that:
1. Allow public read access for educational content (subjects, topics, papers, questions)
2. Restrict user data to the owning user (profiles, attempts, sessions)
3. Restrict administrative operations to admin role holders

### Best Practices Implemented
- No roles stored on profile/user tables (prevents privilege escalation)
- `SECURITY DEFINER` functions for role checks (prevents RLS recursion)
- Separate read/write policies for fine-grained control
- Non-deletable records for audit trails (attempts, sessions)

---

## API Connection Details

- **API URL:** `https://msilvyvsqkfxtmttevjd.supabase.co`
- **Anon Key:** Available in `.env` as `VITE_SUPABASE_PUBLISHABLE_KEY`

---

*Last Updated: December 2024*
