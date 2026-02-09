export const ADMIN_EMAILS = [
  "jitender.singh@twbpinternational.com",
  "nikita.samuel@twbpinternational.com",
  "jivitesh@twbpinternational.com",
];

export const VIEWER_EMAILS = [
  "abhishek@twbpinternational.com",
  "warehouse2@twbpinternational.com",
  "kapil@twbpinternational.com",
  "operations1@twbpinternational.com",
  "support@twbpinternational.com",
];

export function getUserRole(email) {
  if (ADMIN_EMAILS.includes(email)) return "admin";
  if (VIEWER_EMAILS.includes(email)) return "viewer";
  return null;
}
