const asyncHandler = require('../utils/asyncHandler');
const { loadLocale, formatToday } = require('../services/localeService');
const { renderFeedbackPage } = require('../views/feedbackPage');

exports.showPage = asyncHandler(async (req, res) => {
  const { lang, texts } = await loadLocale(req.query.lang);
  const html = renderFeedbackPage({ lang, texts, todayText: formatToday(lang) });
  res.type('html').send(html);
});
