# Architecture rules

- Convert notification titles and content from API HTML to inert text with the shared notification-text helper before rendering; this prevents visible tags without executing untrusted markup.