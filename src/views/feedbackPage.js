const escapeHtml = (value) => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const STYLES = `
  :root { --ink:#1c2b2d; --muted:#5b6b6d; --paper:#f6f8f7; --card:#ffffff; --line:#d5ddda; --accent:#0d6b5c; --accent-dark:#09493f; }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--paper); color:var(--ink); font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; line-height:1.6; }
  main { max-width: 42rem; margin: 0 auto; padding: 2.5rem 1.25rem 4rem; }
  header { display:flex; justify-content:space-between; align-items:flex-start; gap:1rem; flex-wrap:wrap; border-bottom:2px solid var(--accent); padding-bottom:1.25rem; margin-bottom:1.75rem; }
  h1 { font-family: Georgia, "Times New Roman", serif; font-weight:700; font-size:2rem; line-height:1.2; margin:0 0 .5rem; }
  .intro { margin:0; color:var(--muted); max-width:34rem; }
  .meta { text-align:right; font-size:.9rem; color:var(--muted); }
  .meta time { display:block; color:var(--ink); font-weight:600; }
  nav[aria-label] { margin-top:.5rem; }
  nav a { color:var(--accent); text-decoration:none; padding:.15rem .5rem; border:1px solid var(--line); border-radius:4px; margin-left:.25rem; background:var(--card); }
  nav a[aria-current="true"] { background:var(--accent); color:#fff; border-color:var(--accent); }
  nav a:focus-visible, textarea:focus-visible, button:focus-visible { outline:3px solid #7fb9ae; outline-offset:2px; }
  ol { list-style:none; margin:0; padding:0; counter-reset:q; }
  li { counter-increment:q; background:var(--card); border:1px solid var(--line); border-radius:6px; padding:1.1rem 1.25rem 1.25rem; margin-bottom:1rem; }
  label { display:block; font-weight:600; margin-bottom:.6rem; }
  label::before { content: counter(q) ". "; color:var(--accent); }
  textarea { width:100%; min-height:6.5rem; padding:.7rem .8rem; border:1px solid var(--line); border-radius:4px; font:inherit; resize:vertical; background:#fbfcfb; }
  button { background:var(--accent); color:#fff; border:0; border-radius:4px; padding:.75rem 1.5rem; font:inherit; font-weight:600; cursor:pointer; }
  button:hover { background:var(--accent-dark); }
  #thanks { margin-top:1rem; color:var(--accent-dark); font-weight:600; }
`;

function renderFeedbackPage({ lang, texts, todayText }) {
  const questions = texts.questions.map((question, index) => `
        <li>
          <label for="q${index + 1}">${escapeHtml(question)}</label>
          <textarea id="q${index + 1}" name="q${index + 1}" required placeholder="${escapeHtml(texts.answerPlaceholder)}"></textarea>
        </li>`).join('');

  const languageLinks = Object.entries(texts.languages).map(([code, name]) => `
          <a href="/feedback?lang=${code}" hreflang="${code}"${code === lang ? ' aria-current="true"' : ''}>${escapeHtml(name)}</a>`).join('');

  return `<!DOCTYPE html>
<html lang="${escapeHtml(texts.htmlLang)}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(texts.pageTitle)}</title>
  <style>${STYLES}</style>
</head>
<body>
  <main>
    <header>
      <div>
        <h1>${escapeHtml(texts.heading)}</h1>
        <p class="intro">${escapeHtml(texts.instructions)}</p>
      </div>
      <div class="meta">
        ${escapeHtml(texts.dateLabel)}
        <time>${escapeHtml(todayText)}</time>
        <nav aria-label="${escapeHtml(texts.languageLabel)}">${languageLinks}
        </nav>
      </div>
    </header>
    <form id="feedback-form">
      <ol>${questions}
      </ol>
      <button type="submit">${escapeHtml(texts.submit)}</button>
      <p id="thanks" role="status" hidden>${escapeHtml(texts.thanks)}</p>
    </form>
  </main>
  <script>
    document.getElementById('feedback-form').addEventListener('submit', function (event) {
      event.preventDefault();
      document.getElementById('thanks').hidden = false;
    });
  </script>
</body>
</html>`;
}

module.exports = { renderFeedbackPage, escapeHtml };
