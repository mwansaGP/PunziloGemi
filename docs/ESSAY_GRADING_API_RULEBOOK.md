# Essay Grading API Rulebook

## Overview

This document defines the rules and specifications for the Essay Grading API used in the Punzilo exam practice platform. The API evaluates student essay responses against reference answers and returns appropriate scores.

---

## API Endpoint

```
POST /functions/v1/grade-essay
```

---

## Request Format

### Headers

```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer <SUPABASE_ANON_KEY>"
}
```

### Request Body Schema

```typescript
interface GradeEssayRequest {
  question_type: "short_essay" | "long_essay";
  question: {
    text: string;
    max_marks: number;
    subject?: string;
    topic?: string;
  };
  student_answer: string;
  reference_answer: {
    type: "key_points" | "model_essay";
    content: string[] | string;
  };
  grading_criteria?: GradingCriteria;
}
```

---

## Question Types

### 1. Short Essay Questions (2-10 marks)

Short essays typically require:
- 50-200 words
- Direct, concise responses
- Coverage of specific key points

**Example Request:**

```json
{
  "question_type": "short_essay",
  "question": {
    "text": "Explain two advantages of crop rotation in agriculture.",
    "max_marks": 4,
    "subject": "Agricultural Science",
    "topic": "Crop Management"
  },
  "student_answer": "Crop rotation helps maintain soil fertility by alternating nitrogen-fixing crops with others. It also helps break pest and disease cycles since different crops attract different pests.",
  "reference_answer": {
    "type": "key_points",
    "content": [
      "Maintains/improves soil fertility",
      "Nitrogen fixation by legumes",
      "Breaks pest and disease cycles",
      "Reduces soil erosion",
      "Improves soil structure",
      "Reduces need for chemical fertilizers"
    ]
  }
}
```

### 2. Long Essay Questions (10-25 marks)

Long essays typically require:
- 300-800 words
- Comprehensive analysis
- Introduction, body, and conclusion
- Multiple perspectives or arguments

**Example Request:**

```json
{
  "question_type": "long_essay",
  "question": {
    "text": "Discuss the impact of urbanization on the environment in Zambia. Include both positive and negative effects, and suggest possible solutions.",
    "max_marks": 20,
    "subject": "Civic Education",
    "topic": "Environmental Issues"
  },
  "student_answer": "Urbanization in Zambia has led to significant environmental changes...[full essay]...",
  "reference_answer": {
    "type": "model_essay",
    "content": "Urbanization refers to the increasing population shift from rural to urban areas...[full model essay that scored 100%]..."
  },
  "grading_criteria": {
    "content_weight": 50,
    "structure_weight": 20,
    "language_weight": 15,
    "relevance_weight": 15
  }
}
```

---

## Reference Answer Formats

### Key Points Format

Used primarily for short essays. Provide an array of acceptable points:

```json
{
  "type": "key_points",
  "content": [
    "Key point 1 - main concept",
    "Key point 2 - supporting idea",
    "Key point 3 - example or application",
    "Key point 4 - additional relevant information"
  ]
}
```

**Grading Rule:** Each key point correctly addressed = `max_marks / minimum_required_points`

### Model Essay Format

Used for long essays. Provide a complete essay that scored 100%:

```json
{
  "type": "model_essay",
  "content": "Full text of the model essay that demonstrates all expected elements, proper structure, comprehensive coverage of the topic, and excellent language use..."
}
```

---

## Grading Criteria

### Default Weights

| Criterion | Short Essay | Long Essay | Description |
|-----------|-------------|------------|-------------|
| Content | 70% | 50% | Accuracy and completeness of information |
| Structure | 10% | 20% | Organization, paragraphing, logical flow |
| Language | 10% | 15% | Grammar, spelling, vocabulary |
| Relevance | 10% | 15% | Staying on topic, addressing the question |

### Custom Criteria (Optional)

```json
{
  "grading_criteria": {
    "content_weight": 50,
    "structure_weight": 20,
    "language_weight": 15,
    "relevance_weight": 15
  }
}
```

**Note:** Weights must sum to 100.

---

## Response Format

### Success Response

```json
{
  "success": true,
  "score": {
    "total_marks": 16,
    "max_marks": 20,
    "percentage": 80,
    "breakdown": {
      "content": {
        "marks": 8,
        "max": 10,
        "feedback": "Good coverage of main points. Missing discussion of air pollution."
      },
      "structure": {
        "marks": 3.5,
        "max": 4,
        "feedback": "Well-organized with clear introduction and conclusion."
      },
      "language": {
        "marks": 2.5,
        "max": 3,
        "feedback": "Good vocabulary. Minor grammatical errors noted."
      },
      "relevance": {
        "marks": 2,
        "max": 3,
        "feedback": "Mostly on topic. Some tangential discussion in paragraph 3."
      }
    }
  },
  "feedback": {
    "summary": "Strong essay with good understanding of urbanization impacts.",
    "strengths": [
      "Clear explanation of negative environmental effects",
      "Good use of local examples",
      "Well-structured argument"
    ],
    "improvements": [
      "Include more positive effects of urbanization",
      "Expand on proposed solutions",
      "Address air quality issues"
    ]
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Student answer is empty or too short",
    "details": "Minimum word count for short_essay is 20 words"
  }
}
```

---

## Grading Rules

### Rule 1: Content Accuracy (Primary)

| Match Level | Score Percentage |
|-------------|------------------|
| Exact match with key point | 100% of point value |
| Partial match (similar meaning) | 50-80% of point value |
| Related but incomplete | 25-50% of point value |
| Incorrect or missing | 0% |

### Rule 2: Minimum Requirements

| Question Type | Minimum Words | Maximum Words |
|---------------|---------------|---------------|
| Short Essay | 20 | 300 |
| Long Essay | 150 | 1500 |

**Penalty:** Essays below minimum receive maximum 50% of available marks.

### Rule 3: Structure Assessment

**Short Essay:**
- Has clear topic sentence: +10% structure marks
- Logical flow of ideas: +40% structure marks
- Concluding statement: +50% structure marks

**Long Essay:**
- Introduction present: +20% structure marks
- Body paragraphs with topic sentences: +40% structure marks
- Logical transitions: +20% structure marks
- Conclusion present: +20% structure marks

### Rule 4: Language Assessment

| Aspect | Weight | Criteria |
|--------|--------|----------|
| Grammar | 40% | Sentence structure, tense consistency |
| Spelling | 20% | Correct spelling of key terms |
| Vocabulary | 25% | Appropriate academic language |
| Punctuation | 15% | Proper use of punctuation marks |

**Penalty Scale:**
- 0-2 errors per 100 words: 100% language marks
- 3-5 errors per 100 words: 80% language marks
- 6-10 errors per 100 words: 60% language marks
- 10+ errors per 100 words: 40% language marks

### Rule 5: Relevance Assessment

| Level | Score | Description |
|-------|-------|-------------|
| Highly Relevant | 100% | Directly addresses all aspects of the question |
| Mostly Relevant | 75% | Addresses main aspects with minor tangents |
| Partially Relevant | 50% | Addresses some aspects, significant off-topic content |
| Marginally Relevant | 25% | Touches on topic but mostly off-topic |
| Irrelevant | 0% | Does not address the question |

---

## Special Cases

### Case 1: Empty or Near-Empty Answers

```json
{
  "success": true,
  "score": {
    "total_marks": 0,
    "max_marks": 10,
    "percentage": 0
  },
  "feedback": {
    "summary": "No answer provided or answer too short to evaluate."
  }
}
```

### Case 2: Plagiarism Detection

If student answer is >90% similar to model essay:

```json
{
  "success": true,
  "score": {
    "total_marks": 0,
    "max_marks": 20,
    "percentage": 0
  },
  "feedback": {
    "summary": "Answer flagged for potential plagiarism.",
    "flag": "PLAGIARISM_DETECTED",
    "similarity_score": 95
  }
}
```

### Case 3: Off-Topic Response

If relevance score < 25%:

```json
{
  "success": true,
  "score": {
    "total_marks": 2,
    "max_marks": 20,
    "percentage": 10
  },
  "feedback": {
    "summary": "Response does not address the question asked.",
    "flag": "OFF_TOPIC"
  }
}
```

---

## Subject-Specific Guidelines

### Sciences (Biology, Chemistry, Physics, Agricultural Science)

- Prioritize technical accuracy
- Award marks for correct use of scientific terminology
- Diagrams mentioned in text: award partial marks even without visual
- Formulas/equations: must be accurate for full marks

### Languages (English, Bemba, Nyanja, Tonga)

- Higher weight on language quality (25% instead of 15%)
- Assess creative expression
- Evaluate use of literary devices where appropriate

### Social Sciences (Civic Education, History, Geography)

- Evaluate multiple perspectives
- Award marks for contemporary examples
- Assess critical thinking and analysis

### Mathematics/Business Studies

- For word problems: assess both method and final answer
- Partial marks for correct approach with calculation errors
- Award marks for showing working

---

## Rate Limits

| Plan | Requests/Minute | Requests/Day |
|------|-----------------|--------------|
| Free | 10 | 100 |
| Standard | 60 | 5,000 |
| Premium | 200 | 50,000 |

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| INVALID_REQUEST | 400 | Malformed request body |
| MISSING_FIELD | 400 | Required field missing |
| INVALID_QUESTION_TYPE | 400 | question_type not recognized |
| ANSWER_TOO_SHORT | 400 | Below minimum word count |
| ANSWER_TOO_LONG | 400 | Exceeds maximum word count |
| INVALID_WEIGHTS | 400 | Grading weights don't sum to 100 |
| RATE_LIMITED | 429 | Too many requests |
| PAYMENT_REQUIRED | 402 | Insufficient credits |
| INTERNAL_ERROR | 500 | Server error |

---

## Best Practices

### For Short Essays

1. Provide 4-8 key points for a 4-mark question
2. Include variations of acceptable answers
3. Be specific about required terminology
4. Consider partial credit scenarios

### For Long Essays

1. Use model essays that exemplify A+ quality
2. Include essays that demonstrate proper structure
3. Ensure model covers all expected aspects
4. Consider cultural and regional context

### General

1. Keep questions clear and unambiguous
2. Align max_marks with question complexity
3. Test with sample student answers before deployment
4. Review and calibrate grading regularly

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-12-02 | Initial release |

---

## Contact

For API support or questions about grading rules:
- Email: support@punzilo.com
- Documentation: https://docs.punzilo.com/api/grading
