export const SIMPLE_TEMPLATE = 'Hello {{name}}, welcome to {{place}}!';

export const SECTION_TEMPLATE = `Hello {{name}},
{{#details}}
Here are your details:
- Role: {{role}}
- Level: {{level}}
{{/details}}
{{#extras}}
Extra info: {{info}}
{{/extras}}
`;

export const LIST_TEMPLATE = `Items:
{{#list items}}
- {{item}}
{{/list}}`;

export const FULL_TEMPLATE = `You are a {{role}} assistant.
{{#personality}}
Your personality: {{traits}}
{{/personality}}

Context: {{context}}

{{#examples}}
Example:
{{#list examples}}
  - {{item}}
{{/list}}
{{/examples}}

Please respond to: {{query}}`;

export const MALFORMED_TEMPLATE = 'Hello {{name}, welcome!';

export const UNCLOSED_SECTION_TEMPLATE = '{{#section}}Content without end';

export const EMPTY_TEMPLATE = '   ';

export function sampleContext(): Record<string, unknown> {
  return {
    name: 'Alice',
    place: 'Wonderland',
    role: 'senior developer',
    level: '3',
    details: true,
    extras: false,
    traits: 'helpful and concise',
    context: 'user asking about TypeScript',
    items: ['A', 'B', 'C'],
    examples: true,
    query: 'What is a generic?',
  };
}
