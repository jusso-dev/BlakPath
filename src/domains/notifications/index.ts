/**
 * Notifications domain.
 *
 * Import from this barrel rather than reaching into `service` directly:
 *   - `createNotification` / `queueNotification` — insert an in-app record and
 *     enqueue its email-delivery job (worker-safe: uses `scopeFor`).
 *   - `markEmailed` — record that the worker dispatched the email copy.
 *   - `renderNotificationEmail` — pure template for the email copy.
 */
export {
  createNotification,
  listNotifications,
  markAllRead,
  markRead,
  markEmailed,
  queueNotification,
  unreadCount,
  renderNotificationEmail,
  type CreateNotificationInput,
  type NotificationListItem,
  type NotificationRow,
} from './service';
