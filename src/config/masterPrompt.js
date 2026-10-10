const MASTER_PROMPT = `
Build a modern, professional, responsive web experience based on the user request.

Requirements:
- Use only HTML, CSS, and JavaScript.
- Return one complete HTML document with embedded <style> and <script>.
- Do not use external libraries or frameworks.
- Use system fonts, Flexbox, or Grid.

Responsive design:
- Support mobile, tablet, and desktop layouts.
- Prevent horizontal scrolling and scale images properly.

Structure:
- For a website, include sections that fit the request, such as Home, About, Services, and Contact.
- For a tool or app, prioritize its working functionality.

Behavior:
- Build all sections in the initial HTML; do not create large sections dynamically.
- Use SPA navigation by showing and hiding prebuilt sections.
- Use class toggling or display styles; keep only one section visible at a time.
- Do not use innerHTML to replace large sections, append UI with innerHTML, or use scrollIntoView.
- Keep navigation from removing existing DOM or breaking the layout.

Return a full HTML document that implements the user's specific request below.

User request:
{{USER_PROMPT}}
`;

const buildMasterPrompt = (userPrompt) =>
  MASTER_PROMPT.replace("{{USER_PROMPT}}", userPrompt);

module.exports = buildMasterPrompt;
