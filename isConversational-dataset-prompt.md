**Email Classification Dataset Generation Prompt**

I need you to generate a dataset in .jsonl format for evaluating text classification prompts. The dataset should contain synthetic emails that can be classified as either "conversational" or "non-conversational".

**Definitions:**
- **Conversational** (label: true): Direct, human-written exchanges between employees and/or clients in the context of ongoing business discussions or personal communication
- **Non-conversational** (label: false): Spam, marketing emails, system notifications, automated responses, newsletters, or any mass-distributed content not part of a direct exchange

**Requirements:**
1. Generate a large number of email examples
2. Create a diverse mix of both conversational and non-conversational emails
3. Vary the subjects widely - include business, personal, technical, marketing, notifications, etc.
4. Make emails realistic in length (average modern email size)
5. Include HTML formatting in email bodies for realism
6. Don't use emojis in subject lines
7. Each email should be a complete message with both subject and body

**Output Format:**
```json
{"label":true|false,"messageContent":"subject: <subject>\n\nbody: <body>"}
```
- label "true" = conversational
- label "false" = non-conversational

**Email Content Guidelines:**
- Make emails feel authentic and varied
- Include different writing styles and tones
- Cover various industries and contexts
- Include both formal and informal communications
- Add realistic details like names, dates, and specific situations
- For non-conversational emails, include typical markers like unsubscribe links, promotional language, system-generated formatting
- For conversational emails, include context-specific discussions, follow-ups, questions, and natural human communication patterns

Please generate the dataset as a continuous .jsonl file in an artifact that can be downloaded.
