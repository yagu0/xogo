const sanitize = function(str, maxLength = 100, relax = false)
{
  if (typeof str !== 'string') return "";
  // 1. Cut string to avoid memory overload
  let cleaned = str.substring(0, maxLength);
  // 2. Replace special characters by HTML entities
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  const regexp = relax ? /[<>]/g : /[&<>"']/g
  return cleaned.replace(regexp, m => map[m]);
}

// Next line for usage on server (Node.js)
if (typeof window === 'undefined') module.exports = sanitize;
