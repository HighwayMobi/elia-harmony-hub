/** Convert API HTML to inert text; never insert notification markup into the page. */
export function notificationText(value?: string): string {
  if (!value) return "";
  const document = new DOMParser().parseFromString(value, "text/html");
  document.querySelectorAll("script, style, template, iframe, object, embed").forEach((node) => node.remove());
  document.querySelectorAll("br").forEach((node) => node.replaceWith("\n"));
  document.querySelectorAll("p, div, li, h1, h2, h3, h4, h5, h6, blockquote").forEach((node) => node.append("\n"));
  return (document.body.textContent ?? "").replace(/\n[\t ]+/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}